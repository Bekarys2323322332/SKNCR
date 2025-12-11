import AsyncStorage from "@react-native-async-storage/async-storage";
import Constants from "expo-constants";
import { getApp, getApps, initializeApp } from "firebase/app";
import { getFirestore } from "firebase/firestore";
import { getStorage } from "firebase/storage";
// We’ll use getAuth as a safe fallback
// @ts-ignore: TS defs for RN helpers are behind
import { getAuth, getReactNativePersistence, initializeAuth } from "firebase/auth";

const {
  FIREBASE_API_KEY,
  FIREBASE_AUTH_DOMAIN,
  FIREBASE_PROJECT_ID,
  FIREBASE_STORAGE_BUCKET,
  FIREBASE_MESSAGING_SENDER_ID,
  FIREBASE_APP_ID,
} = Constants.expoConfig?.extra ?? {};

if (!FIREBASE_API_KEY) {
  console.error("FIREBASE_API_KEY is missing from Expo extra!");
}

const firebaseConfig = {
  apiKey: FIREBASE_API_KEY,
  authDomain: FIREBASE_AUTH_DOMAIN,
  projectId: FIREBASE_PROJECT_ID,
  storageBucket: FIREBASE_STORAGE_BUCKET,
  messagingSenderId: FIREBASE_MESSAGING_SENDER_ID,
  appId: FIREBASE_APP_ID,
};

const app = getApps().length ? getApp() : initializeApp(firebaseConfig);

// ---- SAFE AUTH INITIALIZATION ---------------------------------------

let _auth: ReturnType<typeof getAuth> | null = null;

function createAuth() {
  if (_auth) return _auth;

  // If RN helper exists, use proper persistence (device / RN bundle)
  // On Expo’s server build, this will be undefined → we fall back.
  // @ts-ignore
  if (typeof getReactNativePersistence === "function") {
    // @ts-ignore
    _auth = initializeAuth(app, {
      // @ts-ignore
      persistence: getReactNativePersistence(AsyncStorage),
    });
  } else {
    // Fallback (web / server manifest): no RN persistence,
    // but at least we don’t crash EAS build.
    _auth = getAuth(app);
  }

  return _auth;
}

const auth = createAuth();

// ---------------------------------------------------------------------

const db = getFirestore(app);
const storage = getStorage(app);

export { app, auth, db, storage };

