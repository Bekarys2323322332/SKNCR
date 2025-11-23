import { auth, db } from "@/app/utils/firebaseConfig";
import AsyncStorage from "@react-native-async-storage/async-storage";
import { deleteField, doc, getDoc, setDoc, updateDoc } from "firebase/firestore";
const STORAGE_KEY = "skincarePlan";

export const savePlan = async (plan: any) => {
  // Save locally
  await AsyncStorage.setItem(STORAGE_KEY, JSON.stringify(plan));

  // Save to Firestore if user is logged in
  const user = auth.currentUser;
  if (user) {
    const userRef = doc(db, "users", user.uid);
    await setDoc(userRef, { skincarePlan: plan }, { merge: true });
  }
};


export const loadPlan = async () => {
  const user = auth.currentUser;

  if (user) {
    const userRef = doc(db, "users", user.uid);
    const docSnap = await getDoc(userRef);
    if (docSnap.exists()) {
      return docSnap.data().skincarePlan || null;
    }
  }

  // Fallback to local storage
  const saved = await AsyncStorage.getItem(STORAGE_KEY);
  return saved ? JSON.parse(saved) : null;
};

export const resetPlan = async () => {
  await AsyncStorage.removeItem(STORAGE_KEY);

  const user = auth.currentUser;
  if (user) {
    const userRef = doc(db, "users", user.uid);
    await updateDoc(userRef, { skincarePlan: deleteField() });
  }
};

// Dark mode utilities
const DARK_MODE_KEY = "darkMode";

export const saveDarkMode = async (enabled: boolean) => {
  await AsyncStorage.setItem(DARK_MODE_KEY, JSON.stringify(enabled));
  
  // Save to Firestore if user is logged in
  const user = auth.currentUser;
  if (user) {
    const userRef = doc(db, "users", user.uid);
    await setDoc(userRef, { darkMode: enabled }, { merge: true });
  }
};

export const loadDarkMode = async (): Promise<boolean> => {
  const user = auth.currentUser;

  if (user) {
    const userRef = doc(db, "users", user.uid);
    const docSnap = await getDoc(userRef);
    if (docSnap.exists() && docSnap.data().darkMode !== undefined) {
      return docSnap.data().darkMode as boolean;
    }
  }

  // Fallback to local storage
  const saved = await AsyncStorage.getItem(DARK_MODE_KEY);
  return saved ? JSON.parse(saved) : false;
};