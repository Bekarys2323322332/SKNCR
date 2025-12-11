import AsyncStorage from "@react-native-async-storage/async-storage";
import Constants from "expo-constants";
import { getApp, getApps, initializeApp } from "firebase/app";
import { getFirestore } from "firebase/firestore";
import { getStorage } from "firebase/storage";

// Firebase v12 removed RN TS types, but the runtime API still exists.
// Expo SDK 53+ requires Firebase v12, so this is the correct setup.
// @ts-ignore
import {
    getReactNativePersistence,
    initializeAuth,
} from "firebase/auth";

const {
  FIREBASE_API_KEY,
  FIREBASE_AUTH_DOMAIN,
  FIREBASE_PROJECT_ID,
  FIREBASE_STORAGE_BUCKET,
  FIREBASE_MESSAGING_SENDER_ID,
  FIREBASE_APP_ID,
} = Constants.expoConfig?.extra ?? {};

const firebaseConfig = {
  apiKey: FIREBASE_API_KEY,
  authDomain: FIREBASE_AUTH_DOMAIN,
  projectId: FIREBASE_PROJECT_ID,
  storageBucket: FIREBASE_STORAGE_BUCKET,
  messagingSenderId: FIREBASE_MESSAGING_SENDER_ID,
  appId: FIREBASE_APP_ID,
};

// -------------------------------
// Initialize Firebase
// -------------------------------
let app = getApps().length ? getApp() : initializeApp(firebaseConfig);

// -------------------------------
// Initialize Auth with Persistence
// -------------------------------
// @ts-ignore - Firebase v12 removed types but function exists in JS runtime
const auth = initializeAuth(app, {
  persistence: getReactNativePersistence(AsyncStorage),
});

// -------------------------------
// Initialize Firestore
// -------------------------------
const db = getFirestore(app);

// -------------------------------
// Initialize Storage
// -------------------------------
const storage = getStorage(app);

export { app, auth, db, storage };

