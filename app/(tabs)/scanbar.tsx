import { CameraView, useCameraPermissions } from "expo-camera";
import { doc, getDoc, updateDoc } from "firebase/firestore";
import React, { useEffect, useRef, useState } from "react";
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

const BACKEND_URL = "https://skncr.vercel.app/api/aiAgent";

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
        setAlreadyAnalyzed(true);
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
        const payload = {
          userData,
          productComponents: product.ingredients_text,
        };
        console.log("Sending payload to backend:", payload);

        const response = await fetch("https://skncr.vercel.app/api/gemini", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify(payload),
        });


        // Use text first to debug JSON parsing issues
        const text = await response.text();
        console.log("Raw backend response:", text);

        let data;
        try {
          data = JSON.parse(text);
        } catch (err) {
          console.error("JSON parse error:", err);
          Alert.alert("Error", "Invalid JSON response from backend");
          return;
        }

        console.log("Parsed backend data:", data);
        setAiResult(data.response);
        await saveAnalysisDate();
        setAlreadyAnalyzed(true);
      } catch (err) {
        console.error("Fetch error:", err);
        Alert.alert("Error", "Failed to get AI analysis.");
      }
    };

  if (!permission) {
    return (
      <View className="flex-1 justify-center items-center bg-white">
        <Text>Requesting camera permission...</Text>
      </View>
    );
  }

  if (!permission.granted) {
    return (
      <View className="flex-1 justify-center items-center bg-white">
        <Text>No camera access</Text>
        <Button title="Allow Camera" onPress={requestPermission} />
      </View>
    );
  }

  return (
    <ScrollView style={{flex:1, backgroundColor: 'white' }} showsVerticalScrollIndicator={false}>
    <View className="flex-1 items-center justify-start bg-white">
      <CameraView
        ref={cameraRef}
        style={{
          width: "90%",
          height: 200,
          marginTop: "20%",
          borderRadius: 16,
          overflow: "hidden",
        }}
        barcodeScannerSettings={{
          barcodeTypes: ["ean13", "code128"],
        }}
        onBarcodeScanned={scanned ? undefined : handleBarCodeScanned}
      />

      {product && (
        <View className="p-4 items-center">
          <Text className="text-lg font-bold">{product.product_name}</Text>
          {product.image_url && (
            <Image
              source={{ uri: product.image_url }}
              style={{ width: 150, height: 150, borderRadius: 8, marginVertical: 8 }}
            />
          )}
          <Text>Brand: {product.brands}</Text>
          <Text className="mt-2 font-semibold">Ingredients:</Text>
          <Text>{product.ingredients_text || "No info"}</Text>

          <TouchableOpacity
            onPress={handleAnalysis}
            disabled={alreadyAnalyzed || !product?.ingredients_text}
            style={{
              backgroundColor:
                alreadyAnalyzed || !product?.ingredients_text ? "#9ca3af" : "#3b82f6",
              padding: 12,
              borderRadius: 10,
              marginTop: 16,
              width: 250,
            }}
          >
            <Text className="text-white text-center font-semibold">
              {alreadyAnalyzed
                ? "You already analyzed today"
                : !product?.ingredients_text
                ? "No components found"
                : "Get Compatibility Score"}
            </Text>
          </TouchableOpacity>

          {aiResult ? (
            <View className="mt-4">
              <Text className="font-bold mb-1">AI Compatibility Analysis:</Text>
              <Text>{aiResult}</Text>
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
            backgroundColor: "#22c55e",
            padding: 12,
            borderRadius: 10,
            marginTop: 24,
            width: 200,
          }}
        >
          <Text className="text-white text-center font-semibold">Scan Again</Text>
        </TouchableOpacity>
      )}
    </View>
  </ScrollView>
  );
};

export default ScanBar;
