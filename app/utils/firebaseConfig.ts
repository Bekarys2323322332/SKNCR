import AsyncStorage from '@react-native-async-storage/async-storage';
import { getApps, initializeApp } from 'firebase/app';
import { getReactNativePersistence, initializeAuth } from 'firebase/auth';
import { getFirestore } from 'firebase/firestore';
import { getStorage } from 'firebase/storage';


const firebaseConfig = {   
  apiKey: "AIzaSyDIvXeBxWeujRUXox23bsd4D6WxW1dBmXM",
  authDomain: "skncr-d6201.firebaseapp.com",
  projectId: "skncr-d6201",
  storageBucket: "skncr-d6201.firebasestorage.app",
  messagingSenderId: "614028536844",
  appId: "1:614028536844:web:32df5767fba03a0d291229",
  measurementId: "G-PWETXXTC8W" };
const app = !getApps().length ? initializeApp(firebaseConfig) : getApps()[0];

// Initialize Auth for React Native with AsyncStorage
export const auth = initializeAuth(app, {
  persistence: getReactNativePersistence(AsyncStorage)
});

export const db = getFirestore(app);

export const storage = getStorage(app);
