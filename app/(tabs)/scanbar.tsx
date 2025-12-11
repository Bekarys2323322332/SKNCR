import MessagePanel, { PanelAction } from "@/components/MessagePanel";
import { Ionicons } from "@expo/vector-icons";
import auth from "@react-native-firebase/auth";
import firestore from "@react-native-firebase/firestore";
import { CameraView, useCameraPermissions } from "expo-camera";
import Constants from "expo-constants";
import { useFocusEffect } from "expo-router";
import { useCallback, useEffect, useRef, useState } from "react";
import {
  Animated,
  Dimensions,
  Linking,
  Platform,
  ScrollView,
  Text,
  TouchableOpacity,
  View,
} from "react-native";
import ErrorModal from "../../components/ErrorModal";
import { loadDarkMode } from "../../utils/storage";

const { INCI_API_KEY, BACKEND_URL, API_SECRET } =
  Constants.expoConfig?.extra ?? {};
const { width: SCREEN_WIDTH } = Dimensions.get("window");

const getToday = () => new Date().toISOString().split("T")[0];

// -------------------- API HELPERS --------------------

const fetchProductInfo = async (barcode: string) => {
  try {
    const res = await fetch(
      `https://world.openbeautyfacts.org/api/v0/product/${barcode}.json`
    );
    const data = (await res.json()) as Record<string, any>;
    if (data.status === 1) {
      return {
        ...data.product,
        rating: data.product?.rating || null,
      };
    }

    return null;
  } catch (err) {
    console.error("API error:", err);
    return null;
  }
};

const fetchUPCItemDB = async (barcode: string) => {
  try {
    const res = await fetch(
      `https://api.upcitemdb.com/prod/trial/lookup?upc=${barcode}`
    );
    const data = (await res.json()) as Record<string, any>;

    if (data.items && data.items.length > 0) {
      const item = data.items[0];

      return {
        title: item.title || null,
        brand: item.brand || null,
      };
    }

    return null;
  } catch (err) {
    console.error("UPCItemDB error:", err);
    return null;
  }
};

const fetchInciBeauty = async (name: string) => {
  try {
    const query = encodeURIComponent(name.toLowerCase().trim());

    const res = await fetch(
      `https://api.incibeauty.com/1/products/search?q=${query}`,
      {
        headers: {
          "X-API-KEY": INCI_API_KEY,
        },
      }
    );

    const data = (await res.json()) as Record<string, any>;


    if (!data.products || data.products.length === 0) return null;

    const product = data.products[0];

    return {
      product_name: product.name,
      ingredients_text: product.ingredients?.join(", ") || "",
    };
  } catch (err) {
    console.error("INCI error:", err);
    return null;
  }
};

const fetchUserData = async () => {
  const user = auth().currentUser;
  if (!user) return null;

  const snap = await firestore().collection("users").doc(user.uid).get();
  if (!snap.exists) return null;

  return snap.data() || {};
};

// -------------------- MAIN COMPONENT --------------------

const ScanBar = () => {
  const [permission, requestPermission] = useCameraPermissions();
  const [scanned, setScanned] = useState(false);
  const [product, setProduct] = useState<any>(null);

  const [alreadyAnalyzed, setAlreadyAnalyzed] = useState(false);
  const [remainingAnalyses, setRemainingAnalyses] = useState(3);

  const [isScanning, setIsScanning] = useState(false);
  const [compatibilityScore, setCompatibilityScore] = useState<number | null>(
    null
  );
  const [compatibilityExplanation, setCompatibilityExplanation] =
    useState<string>("");
  const [showIngredients, setShowIngredients] = useState(false);
  const cameraRef = useRef<any>(null);
  const scannedRef = useRef(false);
  const [darkMode, setDarkMode] = useState(false);
  const [isAnalyzing, setIsAnalyzing] = useState(false);
  const scanTimeoutRef = useRef<ReturnType<typeof setTimeout> | null>(null);

  // Animations
  const scanLineAnim = useRef(new Animated.Value(0)).current;
  const pulseAnim = useRef(new Animated.Value(1)).current;
  const scoreCardAnim = useRef(new Animated.Value(0)).current;
  const progressBarAnim = useRef(new Animated.Value(0)).current;
  const ratingBarAnim = useRef(new Animated.Value(0)).current;

  const [errorMessage, setErrorMessage] = useState("");
  const [errorVisible, setErrorVisible] = useState(false);
  const [errorTitle, setErrorTitle] = useState("");

  const [panelVisible, setPanelVisible] = useState(false);
  const [panelTitle, setPanelTitle] = useState<string>("");
  const [panelMessage, setPanelMessage] = useState<string>("");
  const [panelActions, setPanelActions] = useState<PanelAction[]>([]);

  const showPanel = (
    title: string,
    message: string,
    actions: PanelAction[] = [{ text: "OK", style: "default" }]
  ) => {
    setPanelTitle(title);
    setPanelMessage(message);
    setPanelActions(actions);
    setPanelVisible(true);
  };

  const hidePanel = () => setPanelVisible(false);

  const showError = (title: string, message: string) => {
    setErrorTitle(title);
    setErrorMessage(message);
    setErrorVisible(true);
  };

  // -------------------- EFFECTS: Animations --------------------

  useEffect(() => {
    if (compatibilityScore !== null) {
      Animated.parallel([
        Animated.timing(scoreCardAnim, {
          toValue: 1,
          duration: 500,
          useNativeDriver: true,
        }),
        Animated.timing(progressBarAnim, {
          toValue: compatibilityScore,
          duration: 800,
          useNativeDriver: false,
        }),
      ]).start();
    }
  }, [compatibilityScore, progressBarAnim, scoreCardAnim]);

  useEffect(() => {
    if (product?.rating) {
      Animated.timing(ratingBarAnim, {
        toValue: product.rating,
        duration: 800,
        useNativeDriver: false,
      }).start();
    }
  }, [product?.rating, ratingBarAnim]);

  // -------------------- EFFECT: Firestore Snapshot for Limits --------------------

  useEffect(() => {
    const user = auth().currentUser;
    if (!user) return;

    const userRef = firestore().collection("users").doc(user.uid);

    const unsub = userRef.onSnapshot((snap) => {
      if (!snap.exists) return;

      const data = snap.data() || {};
      const today = getToday();

      let remaining = data.remainingAnalyses;
      let lastDate = data.lastAnalysisDate;

      // Initialize missing fields
      if (remaining === undefined || lastDate === undefined) {
        userRef.set(
          {
            remainingAnalyses: 3,
            lastAnalysisDate: today,
          },
          { merge: true }
        );
        remaining = 3;
        lastDate = today;
      }

      // Reset if day changed
      if (lastDate !== today) {
        userRef.set(
          {
            lastAnalysisDate: today,
            remainingAnalyses: 3,
          },
          { merge: true }
        );
        remaining = 3;
      }

      setRemainingAnalyses(remaining);
      setAlreadyAnalyzed(remaining <= 0);
    });

    return () => unsub();
  }, []);

  // -------------------- EFFECT: Camera permission + Dark mode --------------------

  useEffect(() => {
    if (!permission) return;

    if (!permission.granted) {
      if (permission.canAskAgain) {
        requestPermission();
      } else {
        showPanel(
          "Camera Permission Blocked",
          "You disabled camera access. Enable it in Settings to scan products.",
          [
            {
              text: "Open Settings",
              style: "destructive",
              onPress: () => {
                if (Platform.OS === "ios") Linking.openURL("app-settings:");
                else Linking.openSettings();
              },
            },
            { text: "Cancel", style: "cancel" },
          ]
        );
      }
    }

    loadDarkMode().then(setDarkMode);
  }, [permission, requestPermission]);

  useEffect(() => {
    const interval = setInterval(() => {
      loadDarkMode().then(setDarkMode);
    }, 2000);
    return () => clearInterval(interval);
  }, []);

  // -------------------- EFFECT: Reset scanning state on blur --------------------

  useFocusEffect(
    useCallback(() => {
      return () => {
        setIsScanning(false);
        setScanned(false);
        scannedRef.current = false;
        if (scanTimeoutRef.current) clearTimeout(scanTimeoutRef.current);
      };
    }, [])
  );

  // -------------------- SCAN HANDLERS --------------------

  const handleBarCodeScanned = async ({ data }: any) => {
    if (scanTimeoutRef.current) clearTimeout(scanTimeoutRef.current);
    if (scannedRef.current || !isScanning) return;

    scannedRef.current = true;
    setScanned(true);
    setIsScanning(false);

    const upcInfo = await fetchUPCItemDB(data);
    let finalProduct: any = null;

    if (upcInfo?.title) {
      const inciProduct = await fetchInciBeauty(upcInfo.title);
      if (inciProduct?.ingredients_text) finalProduct = inciProduct;
    }

    if (!finalProduct) {
      const obf = await fetchProductInfo(data);
      if (obf) {
        finalProduct = {
          product_name: obf.product_name || upcInfo?.title || "Unknown Product",
          ingredients_text: obf.ingredients_text || "",
          rating: obf.rating || null,
        };
      }
    }

    if (!finalProduct) {
      showError("Not Found", "Product not found in any database.");
      setProduct(null);
      setScanned(false);
      scannedRef.current = false;
      return;
    }

    setProduct(finalProduct);
  };

  const startScanning = () => {
    setScanned(false);
    scannedRef.current = false;
    setProduct(null);
    setCompatibilityScore(null);
    setCompatibilityExplanation("");
    setShowIngredients(false);
    setIsScanning(true);

    if (scanTimeoutRef.current) clearTimeout(scanTimeoutRef.current);
    scanTimeoutRef.current = setTimeout(() => {
      if (!scannedRef.current) {
        setIsScanning(false);
        showError(
          "No Barcode Detected",
          "No product scanned for 15 seconds. Please try again."
        );
        scannedRef.current = false;
        setScanned(false);
      }
    }, 15000);
  };

  const stopScanning = () => {
    if (scanTimeoutRef.current) clearTimeout(scanTimeoutRef.current);
    setIsScanning(false);
  };

  // -------------------- ANALYSIS HANDLER --------------------

  const handleAnalysis = async (productData?: any) => {
    setIsAnalyzing(true);

    const productToAnalyze = productData || product;
    if (!productToAnalyze?.ingredients_text) {
      showError("Error", "No product components found.");
      setIsAnalyzing(false);
      return;
    }

    const user = auth().currentUser;
    if (!user) {
      showError("Error", "You must be logged in to analyze products.");
      setIsAnalyzing(false);
      return;
    }

    const userRef = firestore().collection("users").doc(user.uid);

    // Daily Limit Check (uses state kept in sync via snapshot)
    if (remainingAnalyses <= 0) {
      showPanel(
        "Daily Limit Reached",
        "You can analyze only 3 products per day. Come back tomorrow!",
        [{ text: "OK", style: "default" }]
      );
      setIsAnalyzing(false);
      return;
    }

    const userData = await fetchUserData();

    try {
      const response = await fetch(`${BACKEND_URL}/analyze_compatibility`, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          "x-api-key": API_SECRET,
        },
        body: JSON.stringify({
          user: userData,
          product_name: productToAnalyze.product_name ?? "",
          product_ingredients: productToAnalyze.ingredients_text ?? "",
        }),
      });

      if (!response.ok) throw new Error("Server error");

      const data = (await response.json()) as Record<string, any>;

      const score = data.compatibility_score ?? 50;
      const reasons: string[] = data.explanation?.reasons ?? [];
      const explanationText = reasons.join("\n");

      setCompatibilityScore(score);
      setCompatibilityExplanation(explanationText);

      // Deduct 1 and persist (merge)
      await userRef.set(
        {
          remainingAnalyses: Math.max(remainingAnalyses - 1, 0),
          lastAnalysisDate: getToday(),
        },
        { merge: true }
      );
    } catch (err) {
      console.error("Error fetching compatibility:", err);
      showError("Error", "Could not fetch compatibility score.");
    }

    setIsAnalyzing(false);
  };

  // -------------------- UI HELPERS --------------------

  const DashedBorder = ({ size, color }: { size: number; color: string }) => {
    const cornerSize = 20;
    return (
      <View style={{ position: "absolute", width: size, height: size }}>
        {/* Top-left */}
        <View
          style={{
            position: "absolute",
            top: 0,
            left: 0,
            width: cornerSize,
            height: cornerSize,
          }}
        >
          <View
            style={{
              position: "absolute",
              top: 0,
              left: 0,
              width: cornerSize,
              height: 2,
              backgroundColor: color,
            }}
          />
          <View
            style={{
              position: "absolute",
              top: 0,
              left: 0,
              width: 2,
              height: cornerSize,
              backgroundColor: color,
            }}
          />
        </View>
        {/* Top-right */}
        <View
          style={{
            position: "absolute",
            top: 0,
            right: 0,
            width: cornerSize,
            height: cornerSize,
          }}
        >
          <View
            style={{
              position: "absolute",
              top: 0,
              right: 0,
              width: cornerSize,
              height: 2,
              backgroundColor: color,
            }}
          />
          <View
            style={{
              position: "absolute",
              top: 0,
              right: 0,
              width: 2,
              height: cornerSize,
              backgroundColor: color,
            }}
          />
        </View>
        {/* Bottom-left */}
        <View
          style={{
            position: "absolute",
            bottom: 0,
            left: 0,
            width: cornerSize,
            height: cornerSize,
          }}
        >
          <View
            style={{
              position: "absolute",
              bottom: 0,
              left: 0,
              width: cornerSize,
              height: 2,
              backgroundColor: color,
            }}
          />
          <View
            style={{
              position: "absolute",
              bottom: 0,
              left: 0,
              width: 2,
              height: cornerSize,
              backgroundColor: color,
            }}
          />
        </View>
        {/* Bottom-right */}
        <View
          style={{
            position: "absolute",
            bottom: 0,
            right: 0,
            width: cornerSize,
            height: cornerSize,
          }}
        >
          <View
            style={{
              position: "absolute",
              bottom: 0,
              right: 0,
              width: cornerSize,
              height: 2,
              backgroundColor: color,
            }}
          />
          <View
            style={{
              position: "absolute",
              bottom: 0,
              right: 0,
              width: 2,
              height: cornerSize,
              backgroundColor: color,
            }}
          />
        </View>
      </View>
    );
  };

  // Dark mode colors
  const bgColor = darkMode ? "#1a1f3a" : "white";
  const textColor = darkMode ? "#ffffff" : "#374151";
  const secondaryTextColor = darkMode ? "#cbd5e0" : "#6B7280";
  const cardBg = darkMode ? "#2d3748" : "#f3f4f6";
  const borderColor = darkMode ? "#4a5568" : "#e5e7eb";
  const primaryColor = "#5C6BC0";

  if (!permission) {
    return (
      <View
        style={{
          flex: 1,
          justifyContent: "center",
          alignItems: "center",
          backgroundColor: bgColor,
        }}
      >
        <Text style={{ fontSize: 16, color: textColor }}>
          Requesting camera permission...
        </Text>
      </View>
    );
  }

  if (!permission.granted) {
    return (
      <View
        style={{
          flex: 1,
          justifyContent: "center",
          alignItems: "center",
          backgroundColor: bgColor,
          paddingHorizontal: 20,
        }}
      >
        <Text
          style={{ fontSize: 16, color: textColor, marginBottom: 16 }}
        >
          Camera access is required to scan products.
        </Text>

        <TouchableOpacity
          onPress={async () => {
            const result = await requestPermission();

            if (!result.granted) {
              showPanel(
                "Camera Permission Needed",
                "Please grant camera access to use the scanner.",
                [
                  {
                    text: "Try Again",
                    style: "default",
                    onPress: () => requestPermission(),
                  },
                  {
                    text: "Open Settings",
                    style: "destructive",
                    onPress: () => {
                      if (Platform.OS === "ios") {
                        Linking.openURL("app-settings:");
                      } else {
                        Linking.openSettings();
                      }
                    },
                  },
                  { text: "Cancel", style: "cancel" },
                ]
              );
            }
          }}
          style={{
            backgroundColor: primaryColor,
            paddingVertical: 14,
            paddingHorizontal: 28,
            borderRadius: 12,
            shadowColor: primaryColor,
            shadowOffset: { width: 0, height: 4 },
            shadowOpacity: 0.3,
            shadowRadius: 8,
            elevation: 6,
          }}
        >
          <Text
            style={{ color: "white", fontSize: 16, fontWeight: "600" }}
          >
            Enable Camera
          </Text>
        </TouchableOpacity>

        <MessagePanel
          visible={panelVisible}
          title={panelTitle}
          message={panelMessage}
          actions={panelActions}
          onClose={hidePanel}
          darkMode={darkMode}
        />
      </View>
    );
  }

  const frameSize = SCREEN_WIDTH * 0.75;
  const scanLineTranslateY = scanLineAnim.interpolate({
    inputRange: [0, 1],
    outputRange: [0, frameSize - 2],
  });

  return (
    <View style={{ flex: 1, backgroundColor: bgColor }}>
      <ScrollView
        style={{ flex: 1 }}
        showsVerticalScrollIndicator={false}
        contentContainerStyle={{ paddingBottom: 40 }}
      >
        {/* Scanner Section */}
        <View
          style={{
            alignItems: "center",
            justifyContent: "center",
            paddingTop: 60,
            paddingBottom: 40,
          }}
        >
          <View
            style={{
              position: "relative",
              width: frameSize,
              height: frameSize,
              alignItems: "center",
              justifyContent: "center",
            }}
          >
            <CameraView
              ref={cameraRef}
              zoom={0}
              style={{
                width: frameSize,
                height: frameSize,
                borderRadius: 16,
                overflow: "hidden",
              }}
              barcodeScannerSettings={{
                barcodeTypes: ["ean13", "code128"],
              }}
              onBarcodeScanned={
                isScanning && !scanned ? handleBarCodeScanned : undefined
              }
            />

            {/* Overlay with dashed border */}
            <View
              style={{
                position: "absolute",
                width: frameSize,
                height: frameSize,
                pointerEvents: "none",
              }}
            >
              <Animated.View
                style={{
                  transform: [{ scale: pulseAnim }],
                }}
              >
                <DashedBorder size={frameSize} color={primaryColor} />
              </Animated.View>

              {/* Scanning line */}
              {isScanning && !scanned && (
                <Animated.View
                  style={{
                    position: "absolute",
                    left: 0,
                    right: 0,
                    top: 0,
                    height: 2,
                    backgroundColor: primaryColor,
                    shadowColor: primaryColor,
                    shadowOffset: { width: 0, height: 0 },
                    shadowOpacity: 0.8,
                    shadowRadius: 6,
                    elevation: 6,
                    transform: [{ translateY: scanLineTranslateY }],
                  }}
                />
              )}
            </View>
          </View>

          {/* Instruction */}
          <Text
            style={{
              color: textColor,
              fontSize: 16,
              marginTop: 24,
              textAlign: "center",
              fontWeight: "500",
            }}
          >
            Position the barcode inside the frame
          </Text>

          {/* Start Scanning Button */}
          {!isScanning && !product && (
            <TouchableOpacity
              onPress={startScanning}
              style={{
                backgroundColor: primaryColor,
                paddingVertical: 16,
                paddingHorizontal: 32,
                borderRadius: 16,
                marginTop: 32,
                shadowColor: primaryColor,
                shadowOffset: { width: 0, height: 4 },
                shadowOpacity: 0.4,
                shadowRadius: 12,
                elevation: 6,
              }}
            >
              <View style={{ flexDirection: "row", alignItems: "center" }}>
                <Ionicons
                  name="scan"
                  size={24}
                  color="#ffffff"
                  style={{ marginRight: 8 }}
                />
                <Text
                  style={{
                    color: "#ffffff",
                    fontSize: 18,
                    fontWeight: "600",
                  }}
                >
                  Start Scanning
                </Text>
              </View>
            </TouchableOpacity>
          )}

          {/* Stop Scanning Button */}
          {isScanning && !scanned && (
            <TouchableOpacity
              onPress={stopScanning}
              style={{
                backgroundColor: "#ef4444",
                paddingVertical: 16,
                paddingHorizontal: 32,
                borderRadius: 16,
                marginTop: 32,
                shadowColor: "#ef4444",
                shadowOffset: { width: 0, height: 4 },
                shadowOpacity: 0.3,
                shadowRadius: 8,
                elevation: 5,
              }}
            >
              <Text
                style={{
                  color: "#ffffff",
                  fontSize: 18,
                  fontWeight: "600",
                }}
              >
                Stop Scanning
              </Text>
            </TouchableOpacity>
          )}
        </View>

        {/* Product Information */}
        {product && (
          <View style={{ paddingHorizontal: 20, paddingBottom: 20 }}>
            <Text
              style={{
                fontSize: 24,
                fontWeight: "bold",
                color: textColor,
                marginBottom: 16,
                textAlign: "center",
              }}
            >
              {product.product_name || "Unknown Product"}
            </Text>

            {/* Rating */}
            {product.rating && (
              <View
                style={{
                  backgroundColor: cardBg,
                  borderRadius: 12,
                  padding: 16,
                  marginBottom: 24,
                  shadowColor: "#f59e0b",
                  shadowOffset: { width: 0, height: 2 },
                  shadowOpacity: 0.2,
                  shadowRadius: 8,
                  elevation: 3,
                }}
              >
                <View
                  style={{
                    flexDirection: "row",
                    justifyContent: "space-between",
                    alignItems: "center",
                    marginBottom: 12,
                  }}
                >
                  <Text
                    style={{
                      fontSize: 16,
                      fontWeight: "600",
                      color: textColor,
                    }}
                  >
                    OpenBeautyFacts Rating
                  </Text>
                  <View
                    style={{ flexDirection: "row", alignItems: "center" }}
                  >
                    <Ionicons
                      name="star"
                      size={20}
                      color="#f59e0b"
                      style={{ marginRight: 4 }}
                    />
                    <Text
                      style={{
                        fontSize: 16,
                        fontWeight: "bold",
                        color: textColor,
                      }}
                    >
                      {product.rating.toFixed(1)}/5
                    </Text>
                  </View>
                </View>

                <View
                  style={{
                    height: 8,
                    backgroundColor: darkMode ? "#374151" : "#e5e7eb",
                    borderRadius: 4,
                    overflow: "hidden",
                  }}
                >
                  <Animated.View
                    style={{
                      height: "100%",
                      width: ratingBarAnim.interpolate({
                        inputRange: [0, 5],
                        outputRange: ["0%", "100%"],
                      }),
                      backgroundColor: "#f59e0b",
                      borderRadius: 4,
                      shadowColor: "#f59e0b",
                      shadowOffset: { width: 0, height: 2 },
                      shadowOpacity: 0.5,
                      shadowRadius: 4,
                      elevation: 2,
                    }}
                  />
                </View>
              </View>
            )}

            {/* AI Compatibility Score */}
            {compatibilityScore !== null && (
              <Animated.View
                style={{
                  marginBottom: 24,
                  backgroundColor: cardBg,
                  borderRadius: 12,
                  padding: 16,
                  shadowColor: primaryColor,
                  shadowOffset: { width: 0, height: 2 },
                  shadowOpacity: 0.2,
                  shadowRadius: 8,
                  elevation: 3,
                  opacity: scoreCardAnim,
                  transform: [
                    {
                      translateY: scoreCardAnim.interpolate({
                        inputRange: [0, 1],
                        outputRange: [50, 0],
                      }),
                    },
                    {
                      scale: scoreCardAnim.interpolate({
                        inputRange: [0, 1],
                        outputRange: [0.9, 1],
                      }),
                    },
                  ],
                }}
              >
                <View
                  style={{
                    flexDirection: "row",
                    justifyContent: "space-between",
                    alignItems: "center",
                    marginBottom: 12,
                  }}
                >
                  <Text
                    style={{
                      fontSize: 18,
                      fontWeight: "600",
                      color: textColor,
                    }}
                  >
                    AI Compatibility Score
                  </Text>
                  <Text
                    style={{
                      fontSize: 18,
                      fontWeight: "bold",
                      color: textColor,
                    }}
                  >
                    {compatibilityScore}/100
                  </Text>
                </View>

                {/* Progress Bar */}
                <View
                  style={{
                    height: 8,
                    backgroundColor: darkMode ? "#374151" : "#e5e7eb",
                    borderRadius: 4,
                    overflow: "hidden",
                    marginBottom: 12,
                  }}
                >
                  <Animated.View
                    style={{
                      height: "100%",
                      width: progressBarAnim.interpolate({
                        inputRange: [0, 100],
                        outputRange: ["0%", "100%"],
                      }),
                      backgroundColor:
                        compatibilityScore >= 70
                          ? "#22c55e"
                          : compatibilityScore >= 50
                          ? "#f59e0b"
                          : "#ef4444",
                      borderRadius: 4,
                      shadowColor:
                        compatibilityScore >= 70
                          ? "#22c55e"
                          : compatibilityScore >= 50
                          ? "#f59e0b"
                          : "#ef4444",
                      shadowOffset: { width: 0, height: 2 },
                      shadowOpacity: 0.5,
                      shadowRadius: 4,
                      elevation: 2,
                    }}
                  />
                </View>

                <Text
                  style={{
                    fontSize: 14,
                    color: secondaryTextColor,
                    lineHeight: 20,
                    marginTop: 8,
                  }}
                >
                  {compatibilityExplanation || "No explanation available."}
                </Text>
              </Animated.View>
            )}

            {/* Ingredients Section */}
            {product.ingredients_text && (
              <TouchableOpacity
                onPress={() => setShowIngredients(!showIngredients)}
                style={{
                  flexDirection: "row",
                  justifyContent: "space-between",
                  alignItems: "center",
                  paddingVertical: 16,
                  borderTopWidth: 1,
                  borderBottomWidth: 1,
                  borderColor: borderColor,
                }}
              >
                <Text
                  style={{
                    fontSize: 16,
                    fontWeight: "600",
                    color: textColor,
                  }}
                >
                  Ingredients Found
                </Text>
                <Ionicons
                  name={showIngredients ? "chevron-up" : "chevron-down"}
                  size={20}
                  color={textColor}
                />
              </TouchableOpacity>
            )}

            {showIngredients && product.ingredients_text && (
              <View
                style={{
                  backgroundColor: cardBg,
                  borderRadius: 12,
                  padding: 16,
                  marginTop: 12,
                  shadowColor: primaryColor,
                  shadowOffset: { width: 0, height: 2 },
                  shadowOpacity: 0.2,
                  shadowRadius: 8,
                  elevation: 3,
                }}
              >
                <Text
                  style={{
                    fontSize: 14,
                    color: secondaryTextColor,
                    lineHeight: 22,
                  }}
                >
                  {product.ingredients_text}
                </Text>
              </View>
            )}

            {/* Analyze Button */}
            {!compatibilityScore && product.ingredients_text && (
              <TouchableOpacity
                disabled={isAnalyzing || alreadyAnalyzed}
                onPress={() => handleAnalysis()}
                style={{
                  backgroundColor:
                    isAnalyzing || alreadyAnalyzed ? "#9ca3af" : primaryColor,
                  paddingVertical: 16,
                  paddingHorizontal: 24,
                  borderRadius: 12,
                  marginTop: 24,
                  alignItems: "center",
                  opacity: isAnalyzing || alreadyAnalyzed ? 0.7 : 1,
                  shadowColor: primaryColor,
                  shadowOffset: { width: 0, height: 4 },
                  shadowOpacity: 0.3,
                  shadowRadius: 8,
                  elevation: 5,
                }}
              >
                {isAnalyzing ? (
                  <Text
                    style={{
                      color: "#ffffff",
                      fontSize: 16,
                      fontWeight: "600",
                    }}
                  >
                    Analyzing...
                  </Text>
                ) : (
                  <Text
                    style={{
                      color: "#ffffff",
                      fontSize: 16,
                      fontWeight: "600",
                    }}
                  >
                    Get Compatibility Score
                  </Text>
                )}
              </TouchableOpacity>
            )}

            <Text
              style={{
                color: secondaryTextColor,
                marginTop: 10,
                textAlign: "center",
              }}
            >
              Daily analyses left: {alreadyAnalyzed ? 0 : remainingAnalyses}
            </Text>

            {/* Scan Again */}
            <TouchableOpacity
              onPress={() => {
                if (scanTimeoutRef.current)
                  clearTimeout(scanTimeoutRef.current);
                setScanned(false);
                scannedRef.current = false;
                setProduct(null);
                setCompatibilityScore(null);
                setCompatibilityExplanation("");
                setShowIngredients(false);
              }}
              style={{
                backgroundColor: primaryColor,
                paddingVertical: 16,
                paddingHorizontal: 24,
                borderRadius: 12,
                marginTop: 24,
                shadowColor: primaryColor,
                shadowOffset: { width: 0, height: 4 },
                shadowOpacity: 0.3,
                shadowRadius: 8,
                elevation: 5,
                alignItems: "center",
              }}
            >
              <Text
                style={{
                  color: "#ffffff",
                  fontSize: 16,
                  fontWeight: "600",
                }}
              >
                Scan Again
              </Text>
            </TouchableOpacity>
          </View>
        )}
      </ScrollView>

      <ErrorModal
        visible={errorVisible}
        message={errorMessage}
        title={errorTitle}
        onClose={() => setErrorVisible(false)}
        darkMode={darkMode}
      />
      <MessagePanel
        visible={panelVisible}
        title={panelTitle}
        message={panelMessage}
        actions={panelActions}
        onClose={hidePanel}
        darkMode={darkMode}
      />
    </View>
  );
};

export default ScanBar;
