import ErrorModal from "@/components/ErrorModal";
import MessagePanel, { PanelAction } from "@/components/MessagePanel";
import { authRN, db } from "@/utils/firebaseConfig";
import { Ionicons } from "@expo/vector-icons";
import { useLocalSearchParams, useRouter } from "expo-router";
import React, { useState } from "react";
import {
  ActivityIndicator,
  Keyboard,
  KeyboardAvoidingView,
  Platform,
  ScrollView,
  Text,
  TextInput,
  TouchableOpacity,
  TouchableWithoutFeedback,
  View,
} from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";
import { parseFirebaseError } from "../../utils/parseFirebaseError";

const signup = () => {
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [confirmPassword, setConfirmPassword] = useState("");
  const [name, setName] = useState("");
  const [loading, setLoading] = useState(false);
  const router = useRouter();
  const [passwordStrength, setPasswordStrength] = useState({ label: "", color: "" });
  const [errorMessage, setErrorMessage] = useState("");
  const [errorTitle, setErrorTitle] = useState("");
  const [errorVisible, setErrorVisible] = useState(false);

  const [showPassword, setShowPassword] = useState(false);
  const [showConfirmPassword, setShowConfirmPassword] = useState(false);

  // MessagePanel
  const [panelVisible, setPanelVisible] = useState(false);
  const [panelTitle, setPanelTitle] = useState("");
  const [panelMessage, setPanelMessage] = useState("");
  const [panelActions, setPanelActions] = useState<PanelAction[]>([]);

  const params = useLocalSearchParams();
    React.useEffect(() => {
      if (params.email) setEmail(String(params.email));
    }, [params]);


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



  const passwordRules = [
    { id: "len", label: "At least 8 characters", test: (p: string) => p.length >= 8 },
    { id: "upper", label: "One uppercase letter (A–Z)", test: (p: string) => /[A-Z]/.test(p) },
    { id: "num", label: "One number (0–9)", test: (p: string) => /[0-9]/.test(p) },
  ];
  
  const passwordValid = passwordRules.every((r) => r.test(password));



  const signUp = async () => {
    if (password !== confirmPassword) {
      showError("Input Error", "Passwords do not match");
      return;
    }

    setLoading(true);
      try {
        const userCred = await authRN.createUserWithEmailAndPassword(email, password);

        // Firestore write
        await db.collection("users").doc(userCred.user.uid).set({
          name,
          email,
          createdAt: Date.now(),
        });

        // Send email verification
        await userCred.user.sendEmailVerification();

        // Force logout
        await authRN.signOut();


        // Show verification panel — DO NOT navigate away yet
        showPanel(
          "Verify Your Email",
          "A verification link has been sent to your email. Please verify it before logging in.",
          [
            {
              text: "Go to Login",
              style: "default",
              onPress: () => {
                router.replace("/(auth)/login");
              },
            },
          ]
        );

      } catch (error: any) {
        const clean = parseFirebaseError(error);
        showError("Signup Error", clean);
      } finally {
        setLoading(false);
      }
    };

  return (
    <TouchableWithoutFeedback onPress={Keyboard.dismiss}>
      <SafeAreaView className="flex-1 bg-[#F3F4F6] px-6">
        <KeyboardAvoidingView
          behavior={Platform.OS === "ios" ? "padding" : undefined}
          className="flex-1"
        >
          <ScrollView
            className="flex-1"
            showsVerticalScrollIndicator={false}
            keyboardShouldPersistTaps="handled"
          >
            <View className="w-full max-w-md bg-white rounded-2xl shadow-lg p-6 self-center mt-10">

              {/* Header Icon */}
              <View className="items-center mb-6">
                <View className="p-4 bg-[#5C6BC0] rounded-full shadow-md">
                  <Ionicons name="person-add" size={28} color="#fff" />
                </View>
                <Text className="text-2xl font-bold mt-4 text-[#1A237E]">
                  Start Your Journey
                </Text>
                <Text className="text-gray-500">
                  Create your account for personalized skincare
                </Text>
              </View>

              {/* Name */}
              <Text className="text-sm font-medium text-gray-700 mb-1">
                Name
              </Text>
              <TextInput
                className="h-12 w-full border-2 border-gray-200 rounded-xl px-4 mb-4"
                placeholder="Your Name"
                placeholderTextColor="#4B5563"
                value={name}
                onChangeText={setName}
                autoCapitalize="words"
              />

              {/* Email */}
              <Text className="text-sm font-medium text-gray-700 mb-1">
                Email
              </Text>
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
              <Text className="text-sm font-medium text-gray-700 mb-1">
                Password
              </Text>
              <View className="w-full mb-4">
                <TextInput
                  className="h-12 w-full border-2 border-gray-200 rounded-xl px-4 pr-12"
                  placeholder="••••••••••"
                  placeholderTextColor="#4B5563"
                  secureTextEntry={!showPassword}
                  value={password}
                  onChangeText={(t) => {
                  setPassword(t);
                }}
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
                </TouchableOpacity>
              </View>
              
              {/* Confirm Password */}
              <Text className="text-sm font-medium text-gray-700 mb-1">
                Confirm Password
              </Text>
              <View className="w-full mb-4">
                <TextInput
                  className="h-12 w-full border-2 border-gray-200 rounded-xl px-4 pr-12"
                  placeholder="••••••••••"
                  placeholderTextColor="#4B5563"
                  secureTextEntry={!showConfirmPassword}
                  value={confirmPassword}
                  onChangeText={setConfirmPassword}
                />
                <TouchableOpacity
                  onPress={() =>
                    setShowConfirmPassword(!showConfirmPassword)
                  }
                  className="absolute right-4 top-3"
                >
                  <Ionicons
                    name={showConfirmPassword ? "eye" : "eye-off"}
                    size={22}
                    color="#777"
                  />
                </TouchableOpacity>
              </View>
        {/* Password Requirements Checklist */}
                    <View className="mb-3 mt-1">
                      {passwordRules.map((rule) => {
                        const ok = rule.test(password);
                        return (
                          <View key={rule.id} className="flex-row items-center mb-1">
                            <Ionicons
                              name={ok ? "checkmark-circle" : "ellipse-outline"}
                              size={18}
                              color={ok ? "#10B981" : "#9CA3AF"} // green or grey
                            />
                            <Text
                              className="ml-2"
                              style={{ color: ok ? "#10B981" : "#6B7280" }} // green or grey text
                            >
                              {rule.label}
                            </Text>
                          </View>
                        );
                      })}
                      <Text className="text-xs text-gray-500 mt-4">
                        By continuing, you agree to our Terms of Service and Privacy Policy.
                      </Text>
                    </View>
              {/* Button */}
              <TouchableOpacity
                onPress={signUp}
                disabled={
                  loading ||
                  !email ||
                  !name ||
                  password !== confirmPassword ||
                  !passwordValid
                }
                style={{
                  opacity:
                    loading ||
                    !email ||
                    !name ||
                    password !== confirmPassword ||
                    !passwordValid
                      ? 0.5
                      : 1,
                }}
                className="bg-[#5C6BC0] h-12 rounded-xl items-center justify-center"
              >
                {loading ? (
                  <ActivityIndicator color="#fff" />
                ) : (
                  <Text className="text-white font-semibold text-lg">Create Account</Text>
                )}
              </TouchableOpacity>


           


              {/* Link */}
              <View className="mt-6 flex-row justify-center">
                <Text className="text-sm text-gray-600">
                  Already have an account?{" "}
                </Text>
                <TouchableOpacity
                  onPress={() => router.push("/(auth)/login")}
                >
                  <Text className="text-sm font-semibold text-[#1A237E]">
                    Sign In
                  </Text>
                </TouchableOpacity>
              </View>
            </View>

            {/* Errors */}
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
          </ScrollView>
        </KeyboardAvoidingView>
      </SafeAreaView>
    </TouchableWithoutFeedback>
  );
};

export default signup;
