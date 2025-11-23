import { Ionicons } from "@expo/vector-icons";
import { CameraView, useCameraPermissions } from "expo-camera";
import { doc, getDoc, updateDoc } from "firebase/firestore";
import { useEffect, useRef, useState } from "react";
import { Alert, Animated, Dimensions, ScrollView, Text, TouchableOpacity, View } from "react-native";
import { auth, db } from "../utils/firebaseConfig"; // adjust path
import { loadDarkMode } from "../utils/storage";

const { width: SCREEN_WIDTH, height: SCREEN_HEIGHT } = Dimensions.get('window');
const fetchProductInfo = async (barcode: string) => {
  try {
    const res = await fetch(
      `https://world.openbeautyfacts.org/api/v0/product/${barcode}.json`
    );
    const data = await res.json();
    return data.status === 1 ? data.product : null;
  } catch (err) {
    console.error("API error:", err);
    return null;
  }
};



const fetchUserData = async () => {
  const user = auth.currentUser;
  if (!user) return null;
  const userRef = doc(db, "users", user.uid);
  const snap = await getDoc(userRef);
  return snap.exists() ? snap.data() : null;
};

const saveAnalysisDate = async () => {
  const user = auth.currentUser;
  if (!user) return;
  const userRef = doc(db, "users", user.uid);
  await updateDoc(userRef, { lastAnalysis: new Date().toISOString() });
};

const checkAnalysisStatus = async (setAlreadyAnalyzed: (v: boolean) => void) => {
  const user = auth.currentUser;
  if (!user) return;

  const userRef = doc(db, "users", user.uid);
  const snap = await getDoc(userRef);
  if (snap.exists()) {
    const last = snap.data().lastAnalysis;
    if (last) {
      const lastDate = new Date(last);
      const today = new Date();
      if (
        lastDate.getDate() === today.getDate() &&
        lastDate.getMonth() === today.getMonth() &&
        lastDate.getFullYear() === today.getFullYear()
      ) {
        setAlreadyAnalyzed(false);
      }
    }
  }
};

const ScanBar = () => {
  const [permission, requestPermission] = useCameraPermissions();
  const [scanned, setScanned] = useState(false);
  const [product, setProduct] = useState<any>(null);
  const [alreadyAnalyzed, setAlreadyAnalyzed] = useState(false);
  const [isScanning, setIsScanning] = useState(false);
  const [compatibilityScore, setCompatibilityScore] = useState<number | null>(null);
  const [compatibilityExplanation, setCompatibilityExplanation] = useState<string>("");
  const [showIngredients, setShowIngredients] = useState(false);
  const cameraRef = useRef<any>(null);
  const scannedRef = useRef(false);
  const [darkMode, setDarkMode] = useState(false);
  
  // Animation values
  const scanLineAnim = useRef(new Animated.Value(0)).current;
  const pulseAnim = useRef(new Animated.Value(1)).current;

  useEffect(() => {
    if (!permission) {
      requestPermission();
    }
    checkAnalysisStatus(setAlreadyAnalyzed);
       loadDarkMode().then(setDarkMode);
  }, []);

  // Refresh dark mode periodically to sync with profile changes
  useEffect(() => {
    const interval = setInterval(() => {
      loadDarkMode().then(setDarkMode);
    }, 2000);
    return () => clearInterval(interval);
  }, []);

  // Scanning animation
  useEffect(() => {
    if (isScanning && !scanned) {
      // Scanning line animation - back and forth
      Animated.loop(
        Animated.sequence([
          Animated.timing(scanLineAnim, {
            toValue: 1,
            duration: 3000,
            useNativeDriver: true,
          }),
          Animated.timing(scanLineAnim, {
            toValue: 0,
            duration: 3000,
            useNativeDriver: true,
          }),
        ])
      ).start();

      // Pulse animation for corners - less dynamic
      Animated.loop(
        Animated.sequence([
          Animated.timing(pulseAnim, {
            toValue: 1.05,
            duration: 1500,
            useNativeDriver: true,
          }),
          Animated.timing(pulseAnim, {
            toValue: 1,
            duration: 1500,
            useNativeDriver: true,
          }),
        ])
      ).start();
    } else {
      scanLineAnim.setValue(0);
      pulseAnim.setValue(1);
    }
  }, [isScanning, scanned]);

  const handleBarCodeScanned = async ({ type, data }: any) => {
    if (scannedRef.current || !isScanning) return;

    scannedRef.current = true;
    setScanned(true);
    setIsScanning(false);
    console.log(`Scanned barcode type ${type} with data ${data}`);

    const result = await fetchProductInfo(data);
    if (result) {
      setProduct(result);
      // Don't automatically analyze - wait for button press
    } else {
      Alert.alert("Not Found", "Product not found.");
      setProduct(null);
      setScanned(false);
      scannedRef.current = false;
    }
  };

  const startScanning = () => {
    setScanned(false);
    scannedRef.current = false;
    setProduct(null);
    setCompatibilityScore(null);
    setCompatibilityExplanation("");
    setIsScanning(true);
  };

  const stopScanning = () => {
    setIsScanning(false);
  };


  const handleAnalysis = async (productData?: any) => {
  const productToAnalyze = productData || product;
  if (!productToAnalyze?.ingredients_text) {
    Alert.alert("Error", "No product components found.");
    return;
  }

  const userData = await fetchUserData();
  console.log("Fetched user data:", userData);

  try {
    // Use your local/dev backend URL here
    const backendUrl = 'https://marti-phytological-fidela.ngrok-free.dev/analyze_compatibility';

    const response = await fetch(backendUrl, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        user: userData,
        product_name: productToAnalyze.product_name ?? "",
        product_ingredients: productToAnalyze.ingredients_text ?? ""
      })
    });

    console.log("Response status:", response.status);

    if (!response.ok) {
      const text = await response.text();
      console.error("Server returned non-OK status:", text);
      throw new Error(`Server error: ${response.status}`);
    }

    const data = await response.json();
    console.log("Response JSON:", data);

    // Extract score and explanation safely
    const score = data.compatibility_score ?? 50;
    const explanationObj = data.explanation ?? {};
    const reasons: string[] = explanationObj.reasons ?? [];
    const simpleExplanation = reasons.join("\n") || "No explanation available";

    console.log("Parsed score:", score);
    console.log("Parsed explanation:", simpleExplanation);

    setCompatibilityScore(score);
    setCompatibilityExplanation(simpleExplanation);

    await saveAnalysisDate();
    setAlreadyAnalyzed(true);

  } catch (err) {
    console.error("Error fetching compatibility:", err);
    Alert.alert("Error", "Could not fetch compatibility score.");
  }
};




  const DashedBorder = ({ size, color }: { size: number; color: string }) => {
    const cornerSize = 20;
    return (
      <View style={{ position: 'absolute', width: size, height: size }}>
        {/* Top-left corner */}
        <View style={{ position: 'absolute', top: 0, left: 0, width: cornerSize, height: cornerSize }}>
          <View style={{ position: 'absolute', top: 0, left: 0, width: cornerSize, height: 2, backgroundColor: color }} />
          <View style={{ position: 'absolute', top: 0, left: 0, width: 2, height: cornerSize, backgroundColor: color }} />
        </View>
        {/* Top-right corner */}
        <View style={{ position: 'absolute', top: 0, right: 0, width: cornerSize, height: cornerSize }}>
          <View style={{ position: 'absolute', top: 0, right: 0, width: cornerSize, height: 2, backgroundColor: color }} />
          <View style={{ position: 'absolute', top: 0, right: 0, width: 2, height: cornerSize, backgroundColor: color }} />
        </View>
        {/* Bottom-left corner */}
        <View style={{ position: 'absolute', bottom: 0, left: 0, width: cornerSize, height: cornerSize }}>
          <View style={{ position: 'absolute', bottom: 0, left: 0, width: cornerSize, height: 2, backgroundColor: color }} />
          <View style={{ position: 'absolute', bottom: 0, left: 0, width: 2, height: cornerSize, backgroundColor: color }} />
        </View>
        {/* Bottom-right corner */}
        <View style={{ position: 'absolute', bottom: 0, right: 0, width: cornerSize, height: cornerSize }}>
          <View style={{ position: 'absolute', bottom: 0, right: 0, width: cornerSize, height: 2, backgroundColor: color }} />
          <View style={{ position: 'absolute', bottom: 0, right: 0, width: 2, height: cornerSize, backgroundColor: color }} />
        </View>
      </View>
    );
  };

  // Dark mode colors
  const bgColor = darkMode ? '#1a1f3a' : 'white';
  const textColor = darkMode ? '#ffffff' : '#374151';
  const secondaryTextColor = darkMode ? '#cbd5e0' : '#6B7280';
  const cardBg = darkMode ? '#2d3748' : '#f3f4f6';
  const borderColor = darkMode ? '#4a5568' : '#e5e7eb';
  const primaryColor = '#5C6BC0';

  if (!permission) {
    return (
      <View style={{ flex: 1, justifyContent: 'center', alignItems: 'center', backgroundColor: bgColor }}>
        <Text style={{ fontSize: 16, color: textColor }}>Requesting camera permission...</Text>
      </View>
    );
  }

  if (!permission.granted) {
    return (
      <View style={{ flex: 1, justifyContent: 'center', alignItems: 'center', backgroundColor: bgColor, paddingHorizontal: 16 }}>
        <Text style={{ fontSize: 16, color: textColor, marginBottom: 16 }}>No camera access</Text>
        <TouchableOpacity
          onPress={requestPermission}
          style={{
            backgroundColor: primaryColor,
            paddingVertical: 12,
            paddingHorizontal: 24,
            borderRadius: 12,
            shadowColor: primaryColor,
            shadowOffset: { width: 0, height: 4 },
            shadowOpacity: 0.3,
            shadowRadius: 8,
            elevation: 5,
          }}
        >
          <Text style={{ color: 'white', fontSize: 16, fontWeight: '600' }}>Allow Camera</Text>
        </TouchableOpacity>
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
        <View style={{ alignItems: 'center', justifyContent: 'center', paddingTop: 60, paddingBottom: 40 }}>
          <View style={{ position: 'relative', width: frameSize, height: frameSize, alignItems: 'center', justifyContent: 'center' }}>
            {/* Camera View */}
            <CameraView
              ref={cameraRef}
              style={{
                width: frameSize,
                height: frameSize,
                borderRadius: 16,
                overflow: "hidden",
              }}
              barcodeScannerSettings={{
                barcodeTypes: ["ean13", "code128"],
              }}
              onBarcodeScanned={isScanning && !scanned ? handleBarCodeScanned : undefined}
            />
            
            {/* Overlay with dashed border */}
            <View style={{ position: 'absolute', width: frameSize, height: frameSize, pointerEvents: 'none' }}>
              <Animated.View style={{ transform: [{ scale: pulseAnim }] }}>
                <DashedBorder size={frameSize} color={primaryColor} />
              </Animated.View>
              
              {/* Scanning line */}
              {isScanning && !scanned && (
                <Animated.View
                  style={{
                    position: 'absolute',
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
          
          {/* Instruction text */}
          <Text style={{ 
            color: textColor, 
            fontSize: 16, 
            marginTop: 24,
            textAlign: 'center',
            fontWeight: '500'
          }}>
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
              <View style={{ flexDirection: 'row', alignItems: 'center' }}>
                <Ionicons name="scan" size={24} color="#ffffff" style={{ marginRight: 8 }} />
                <Text style={{ color: '#ffffff', fontSize: 18, fontWeight: '600' }}>
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
                backgroundColor: '#ef4444',
                paddingVertical: 16,
                paddingHorizontal: 32,
                borderRadius: 16,
                marginTop: 32,
                shadowColor: '#ef4444',
                shadowOffset: { width: 0, height: 4 },
                shadowOpacity: 0.3,
                shadowRadius: 8,
                elevation: 5,
              }}
            >
              <Text style={{ color: '#ffffff', fontSize: 18, fontWeight: '600' }}>
                Stop Scanning
              </Text>
            </TouchableOpacity>
          )}
        </View>

        {/* Product Information Section */}
        {product && (
          <View style={{ paddingHorizontal: 20, paddingBottom: 20 }}>
            {/* Product Name */}
            <Text style={{ 
              fontSize: 24, 
              fontWeight: 'bold', 
              color: textColor, 
              marginBottom: 24,
              textAlign: 'center'
            }}>
              {product.product_name || 'Unknown Product'}
            </Text>

            {/* AI Compatibility Score */}
            {compatibilityScore !== null && (
              <View style={{
                marginBottom: 24,
                backgroundColor: cardBg,
                borderRadius: 12,
                padding: 16,
                shadowColor: primaryColor,
                shadowOffset: { width: 0, height: 2 },
                shadowOpacity: 0.2,
                shadowRadius: 8,
                elevation: 3,
              }}>
                <View style={{ flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginBottom: 12 }}>
                  <Text style={{ fontSize: 18, fontWeight: '600', color: textColor }}>
                    AI Compatibility Score
                  </Text>
                  <Text style={{ fontSize: 18, fontWeight: 'bold', color: textColor }}>
                    {compatibilityScore}/100
                  </Text>
                </View>
                
                {/* Progress Bar */}
                <View style={{ 
                  height: 8, 
                  backgroundColor: darkMode ? '#374151' : '#e5e7eb', 
                  borderRadius: 4, 
                  overflow: 'hidden',
                  marginBottom: 12
                }}>
                  <View style={{ 
                    height: '100%', 
                    width: `${compatibilityScore}%`, 
                    backgroundColor: compatibilityScore >= 70 ? '#22c55e' : compatibilityScore >= 50 ? '#f59e0b' : '#ef4444',
                    borderRadius: 4,
                    shadowColor: compatibilityScore >= 70 ? '#22c55e' : compatibilityScore >= 50 ? '#f59e0b' : '#ef4444',
                    shadowOffset: { width: 0, height: 2 },
                    shadowOpacity: 0.5,
                    shadowRadius: 4,
                    elevation: 2,
                  }} />
                </View>

                {/* Explanation */}
                <Text style={{ 
                  fontSize: 14, 
                  color: secondaryTextColor, 
                  lineHeight: 20,
                  marginTop: 8
                }}>
                  {compatibilityExplanation || 'No explanation available.'}
                </Text>
              </View>
            )}

            {/* Ingredients Section */}
            {product.ingredients_text && (
              <TouchableOpacity
                onPress={() => setShowIngredients(!showIngredients)}
                style={{
                  flexDirection: 'row',
                  justifyContent: 'space-between',
                  alignItems: 'center',
                  paddingVertical: 16,
                  borderTopWidth: 1,
                  borderBottomWidth: 1,
                  borderColor: borderColor,
                }}
              >
                <Text style={{ fontSize: 16, fontWeight: '600', color: textColor }}>
                  Ingredients Found
                </Text>
                <Ionicons 
                  name={showIngredients ? "chevron-up" : "chevron-down"} 
                  size={20} 
                  color={textColor} 
                />
              </TouchableOpacity>
            )}

            {/* Expanded Ingredients */}
            {showIngredients && product.ingredients_text && (
              <View style={{ 
                backgroundColor: cardBg, 
                borderRadius: 12, 
                padding: 16, 
                marginTop: 12,
                shadowColor: primaryColor,
                shadowOffset: { width: 0, height: 2 },
                shadowOpacity: 0.2,
                shadowRadius: 8,
                elevation: 3,
              }}>
                <Text style={{ 
                  fontSize: 14, 
                  color: secondaryTextColor, 
                  lineHeight: 22 
                }}>
                  {product.ingredients_text}
                </Text>
              </View>
            )}

            {/* Analyze Button (if not auto-analyzed) */}
            {!compatibilityScore && product.ingredients_text && (
              <TouchableOpacity
                onPress={() => handleAnalysis()}
                style={{
                  backgroundColor: primaryColor,
                  paddingVertical: 16,
                  paddingHorizontal: 24,
                  borderRadius: 12,
                  marginTop: 24,
                  alignItems: 'center',
                  shadowColor: primaryColor,
                  shadowOffset: { width: 0, height: 4 },
                  shadowOpacity: 0.3,
                  shadowRadius: 8,
                  elevation: 5,
                }}
              >
                <Text style={{ color: '#ffffff', fontSize: 16, fontWeight: '600' }}>
                  Get Compatibility Score
                </Text>
              </TouchableOpacity>
            )}

            {/* Scan Again Button */}
            <TouchableOpacity
              onPress={() => {
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
                alignItems: 'center',
              }}
            >
              <Text style={{ color: '#ffffff', fontSize: 16, fontWeight: '600' }}>
                Scan Again
              </Text>
            </TouchableOpacity>
          </View>
        )}
      </ScrollView>
    </View>
  );
};

export default ScanBar;
