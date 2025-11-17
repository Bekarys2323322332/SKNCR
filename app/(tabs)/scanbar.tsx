import { CameraView, useCameraPermissions } from "expo-camera";
import { doc, getDoc, updateDoc } from "firebase/firestore";
import { useEffect, useRef, useState } from "react";
import { Alert, Button, Image, ScrollView, Text, TouchableOpacity, View } from "react-native";
import { auth, db } from "../utils/firebaseConfig"; // adjust path
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
  const [aiResult, setAiResult] = useState("");
  const cameraRef = useRef<any>(null);
  const scannedRef = useRef(false);

  useEffect(() => {
    if (!permission) {
      requestPermission();
    }
    checkAnalysisStatus(setAlreadyAnalyzed);
  }, []);

  const handleBarCodeScanned = async ({ type, data }: any) => {
    if (scannedRef.current) return;

    scannedRef.current = true;
    setScanned(true);
    console.log(`Scanned barcode type ${type} with data ${data}`);

    const result = await fetchProductInfo(data);
    if (result) {
      setProduct(result);
    } else {
      Alert.alert("Not Found", "Product not found.");
      setProduct(null);
    }
  };

  const handleAnalysis = async () => {
  if (!product?.ingredients_text) {
    Alert.alert("Error", "No product components found.");
    return;
  }

  const userData = await fetchUserData();
  console.log("Fetched user data from Firebase:", userData);

  if (!userData) {
    Alert.alert("Error", "User data not found.");
    return;
  }
  try {
      const response = await fetch(
      "https://marti-phytological-fidela.ngrok-free.dev/compatibility",
      {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
      concerns: userData || [], // array is fine now
      product_name: product.product_name || "",
      product_ingredients: product.ingredients_text || ""
    })

    });
    if (!response.ok) {
      throw new Error(`Server error: ${response.status}`);
    }

    const data = await response.json();

    // Expecting: { compatibility_score: 85, explanation: "..." }
    const score = data.compatibility_score;
    const explanation = data.explanation || "No explanation provided.";

    setAiResult(`Score: ${score}/100\n\nExpert explanation:\n${explanation}`);

    await saveAnalysisDate(); // mark analyzed today
    setAlreadyAnalyzed(false);
  } catch (err) {
    console.error("Error fetching compatibility:", err);
    Alert.alert("Error", "Could not fetch compatibility score.");
  }
};


  if (!permission) {
    return (
      <View style={{ flex: 1, justifyContent: 'center', alignItems: 'center', backgroundColor: 'white' }}>
        <Text style={{ fontSize: 16, color: '#374151' }}>Requesting camera permission...</Text>
      </View>
    );
  }

  if (!permission.granted) {
    return (
      <View style={{ flex: 1, justifyContent: 'center', alignItems: 'center', backgroundColor: 'white', paddingHorizontal: 16 }}>
        <Text style={{ fontSize: 16, color: '#374151', marginBottom: 16 }}>No camera access</Text>
        <Button title="Allow Camera" onPress={requestPermission} />
      </View>
    );
  }

  return (
    <View style={{ flex: 1 }}>
      <ScrollView style={{ flex: 1, backgroundColor: 'white' }} showsVerticalScrollIndicator={false}>
        <View style={{ flex: 1, alignItems: 'center', justifyContent: 'flex-start', backgroundColor: 'white', paddingHorizontal: 16 }}>
          <View style={{ marginTop: 80, width: '100%', alignItems: 'center' }}>
            <CameraView
              ref={cameraRef}
              style={{
                width: "90%",
                height: 200,
                borderRadius: 12,
                overflow: "hidden",
              }}
              barcodeScannerSettings={{
                barcodeTypes: ["ean13", "code128"],
              }}
              onBarcodeScanned={scanned ? undefined : handleBarCodeScanned}
            />
          </View>

          {product && (
            <View style={{ padding: 16, alignItems: 'center', width: '100%', marginTop: 24 }}>
              <Text style={{ fontSize: 18, fontWeight: '600', color: '#374151', marginBottom: 8, textAlign: 'center' }}>
                {product.product_name}
              </Text>
              {product.image_url && (
                <Image
                  source={{ uri: product.image_url }}
                  style={{ width: 150, height: 150, borderRadius: 8, marginVertical: 8 }}
                  resizeMode="cover"
                />
              )}
              <Text style={{ fontSize: 14, color: '#6B7280', marginBottom: 8 }}>Brand: {product.brands}</Text>
              <Text style={{ fontSize: 16, fontWeight: '600', color: '#374151', marginTop: 8, marginBottom: 4 }}>
                Ingredients:
              </Text>
              <Text style={{ fontSize: 14, color: '#6B7280', textAlign: 'center', marginBottom: 16 }}>
                {product.ingredients_text || "No info"}
              </Text>

              <TouchableOpacity
                onPress={handleAnalysis}
                disabled={!product?.ingredients_text}
                style={{
                  backgroundColor: !product?.ingredients_text ? '#9ca3af' : '#5C6BC0',
                  padding: 16,
                  borderRadius: 12,
                  marginTop: 8,
                  width: '80%',
                  alignItems: 'center',
                  justifyContent: 'center',
                  opacity: !product?.ingredients_text ? 0.5 : 1,
                }}
              >
                <Text style={{ color: 'white', fontSize: 16, fontWeight: '600', textAlign: 'center' }}>
                  {alreadyAnalyzed
                    ? "You already analyzed today"
                    : !product?.ingredients_text
                    ? "No components found"
                    : "Get Compatibility Score"}
                </Text>
              </TouchableOpacity>

              {aiResult ? (
                <View style={{ marginTop: 24, width: '100%', backgroundColor: '#f3f4f6', borderRadius: 12, padding: 16 }}>
                  <Text style={{ fontSize: 18, fontWeight: '600', color: '#374151', marginBottom: 8 }}>
                    AI Compatibility Analysis:
                  </Text>
                  <Text style={{ fontSize: 14, color: '#6B7280', lineHeight: 20 }}>{aiResult}</Text>
                </View>
              ) : null}
            </View>
          )}

          {scanned && (
            <TouchableOpacity
              onPress={() => {
                setScanned(false);
                scannedRef.current = false;
                setProduct(null);
                setAiResult("");
              }}
              style={{
                backgroundColor: "#5C6BC0",
                padding: 16,
                borderRadius: 12,
                marginTop: 24,
                marginBottom: 40,
                width: '80%',
                alignItems: 'center',
                justifyContent: 'center',
              }}
            >
              <Text style={{ color: 'white', fontSize: 16, fontWeight: '600', textAlign: 'center' }}>
                Scan Again
              </Text>
            </TouchableOpacity>
          )}
        </View>
      </ScrollView>
    </View>
  );
};

export default ScanBar;
