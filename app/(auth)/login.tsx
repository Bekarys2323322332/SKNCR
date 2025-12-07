import MessagePanel, { PanelAction } from "@/components/MessagePanel";
import { auth, db } from "@/utils/firebaseConfig";
import { Ionicons } from "@expo/vector-icons";
import { useRouter } from "expo-router";
import { reload, sendPasswordResetEmail, signInWithEmailAndPassword } from "firebase/auth";
import { doc, getDoc } from "firebase/firestore";
import React, { useState } from "react";
import { ActivityIndicator, Animated, Keyboard, KeyboardAvoidingView, Platform, Text, TextInput, TouchableOpacity, TouchableWithoutFeedback, View } from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";
import ErrorModal from "../../components/ErrorModal";
import { parseFirebaseError } from "../../utils/parseFirebaseError";









const login = () => {
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [loading, setLoading] = useState(false);
  const router = useRouter();
  const [errorMessage, setErrorMessage] = useState("");
  const [errorVisible, setErrorVisible] = useState(false);
  const [showPassword, setShowPassword] = useState(false);;
  const [errorTitle, setErrorTitle] = useState("");

  // MessagePanel state
  const [panelVisible, setPanelVisible] = useState(false);
  const [panelTitle, setPanelTitle] = useState<string>('');
  const [panelMessage, setPanelMessage] = useState<string>('');
  const [panelActions, setPanelActions] = useState<PanelAction[]>([]);
   
  const shakeAnim = useState(new Animated.Value(0))[0];

  const triggerShake = () => {
    shakeAnim.setValue(0);
    Animated.sequence([
      Animated.timing(shakeAnim, { toValue: 10, duration: 60, useNativeDriver: true }),
      Animated.timing(shakeAnim, { toValue: -10, duration: 60, useNativeDriver: true }),
      Animated.timing(shakeAnim, { toValue: 6, duration: 60, useNativeDriver: true }),
      Animated.timing(shakeAnim, { toValue: 0, duration: 60, useNativeDriver: true }),
    ]).start();
  };


  const showPanel = (title: string, message: string, actions: PanelAction[] = [{ text: 'OK', style: 'default' }]) => {
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


  const signIn = async () => {
  setLoading(true);

  try {
    const userCred = await signInWithEmailAndPassword(auth, email, password);

    await reload(userCred.user);

    if (!userCred.user.emailVerified) {
      await auth.signOut();
      showError("Email Not Verified", "Please verify your email before logging in.");
      return;
    }

    const userDoc = await getDoc(doc(db, "users", userCred.user.uid));

    // safety
    if (!userDoc.exists()) {
      showError("Error", "User profile not found.");
      return;
    }

    const data = userDoc.data();


    if (!data.skincarePlanCompleted) {
      router.replace("/(auth)/skincare");
    } else {
      router.replace("../(tabs)");
    }


    } catch (error: any) {
      triggerShake(); // <-- shake!
      const clean = parseFirebaseError(error);
      showError("Login Error", clean);
      }
      finally {
        setLoading(false);
      }
    };



  const resetPassword = async () => {
    if (!email) {
      showError("Input Error", "Enter your email first.");
      return;
    }

    try {
      await sendPasswordResetEmail(auth, email);
      showPanel("Password Reset", "Password reset link sent to your email.");
    } catch (err: any) {
      const clean = parseFirebaseError(err);
      showError("Error", clean);
    }
  };



  return (
    <KeyboardAvoidingView behavior={Platform.OS === "ios" ? "padding" : undefined} className="flex-1">
    <TouchableWithoutFeedback onPress={Keyboard.dismiss} accessible={false}>
    <SafeAreaView className="flex-1 bg-[#F3F4F6] items-center justify-center px-6">
      <Animated.View
        style={{
          transform: [{ translateX: shakeAnim }],
        }}
        className="w-full max-w-md bg-white rounded-2xl shadow-lg p-6"
      >
        {/* Header Icon */}
        <View className="items-center mb-6 overflow-visible">
          <View className="p-4 bg-[#5C6BC0] rounded-full shadow-md">
            <Ionicons name="heart" size={28} color="#fff" />
          </View>
          <Text className="text-2xl font-bold mt-4 text-[#1A237E]">Welcome Back!</Text>
          <Text className="text-gray-500">Continue your skincare journey</Text>
        </View>

        {/* Email */}
        <Text className="text-sm font-medium text-gray-700 mb-1">Email</Text>
        <TextInput
          className="h-12 w-full border-2 border-gray-200 rounded-xl px-4 mb-4"
          placeholder="youremail@example.com"
          placeholderTextColor="#4B5563"
          value={email}
          onChangeText={setEmail}
          keyboardType="email-address"
          autoCapitalize="none"
        />

        {/* Password */}
        <Text className="text-sm font-medium text-gray-700 mb-1">Password</Text>
        <View className="w-full mb-4">
          <TextInput
            className="h-12 w-full border-2 border-gray-200 rounded-xl px-4 pr-12"
            placeholder="••••••••••"
            placeholderTextColor="#4B5563"
            secureTextEntry={!showPassword}
            value={password}
            onChangeText={setPassword}
          />

          <TouchableOpacity
            onPress={() => setShowPassword(!showPassword)}
            className="absolute right-4 top-3"
          >
            <Ionicons
              name={showPassword ? "eye" : "eye-off"}
              size={22}
              color="#777"
            />
          </TouchableOpacity><TouchableOpacity onPress={resetPassword} className="mt-2 ml-2">
            <Text className="text-sm font-semibold text-[#1A237E]">Forgot Password?</Text>
          </TouchableOpacity>
        </View>


        {/* Button */}
        <TouchableOpacity
          onPress={signIn}
          disabled={loading}
          className="bg-[#5C6BC0] h-12 rounded-xl items-center justify-center"
        >
          {loading ? (
            <ActivityIndicator color="#fff" />
          ) : (
            <Text className="text-white font-semibold text-lg">Sign In</Text>
          )}
        </TouchableOpacity>

        {/* Link */}
        <View className="mt-6 flex-row justify-center">
          <Text className="text-sm text-gray-600">Don’t have an account? </Text>
          <TouchableOpacity onPress={() => router.push("/(auth)/signup")}>
            <Text className="text-sm font-semibold text-[#1A237E]">Sign Up</Text>
          </TouchableOpacity>
          
        </View>
      </Animated.View>


       <ErrorModal
        visible={errorVisible}
        message={errorMessage}
        title={errorTitle}
        onClose={() => setErrorVisible(false)}
      />
      <MessagePanel
        visible={panelVisible}
        title={panelTitle}
        message={panelMessage}
        actions={panelActions}
        onClose={hidePanel}
  
      />
    </SafeAreaView>
    </TouchableWithoutFeedback>
    </KeyboardAvoidingView>
  );
};
export default login;