import AsyncStorage from "@react-native-async-storage/async-storage";
import auth from "@react-native-firebase/auth";
import firestore from "@react-native-firebase/firestore";

const STORAGE_KEY = "skincarePlan";

// -----------------------------------------------------------------------------
// SAVE PLAN
// -----------------------------------------------------------------------------

export const savePlan = async (plan: any) => {
  await AsyncStorage.setItem(STORAGE_KEY, JSON.stringify(plan));

  const user = auth().currentUser;
  if (user) {
    const userRef = firestore().collection("users").doc(user.uid);
    await userRef.set(
      { skincarePlan: plan },
      { merge: true }
    );
  }
};

// -----------------------------------------------------------------------------
// LOAD PLAN
// -----------------------------------------------------------------------------

export const loadPlan = async () => {
  const user = auth().currentUser;

  if (user) {
    const userRef = firestore().collection("users").doc(user.uid);
    const snap = await userRef.get();
    const data = (snap.data() as Record<string, any>) || {};

    if (snap.exists && data.skincarePlan !== undefined) {
      return data.skincarePlan;
    }
  }

  // fallback to AsyncStorage
  const saved = await AsyncStorage.getItem(STORAGE_KEY);
  return saved ? JSON.parse(saved) : null;
};

// -----------------------------------------------------------------------------
// RESET PLAN
// -----------------------------------------------------------------------------

export const resetPlan = async () => {
  await AsyncStorage.removeItem(STORAGE_KEY);

  const user = auth().currentUser;
  if (user) {
    const userRef = firestore().collection("users").doc(user.uid);

    await userRef.set(
      { skincarePlan: firestore.FieldValue.delete() },
      { merge: true }
    );
  }
};

// -----------------------------------------------------------------------------
// DARK MODE TOGGLE
// -----------------------------------------------------------------------------

const DARK_MODE_KEY = "darkMode";

export const saveDarkMode = async (enabled: boolean) => {
  await AsyncStorage.setItem(DARK_MODE_KEY, JSON.stringify(enabled));

  const user = auth().currentUser;
  if (user) {
    const userRef = firestore().collection("users").doc(user.uid);
    await userRef.set(
      { darkMode: enabled },
      { merge: true }
    );
  }
};

export const loadDarkMode = async (): Promise<boolean> => {
  const user = auth().currentUser;

  if (user) {
    const userRef = firestore().collection("users").doc(user.uid);
    const snap = await userRef.get();
    const data = (snap.data() as Record<string, any>) || {};

    if (snap.exists && data.darkMode !== undefined) {
      return data.darkMode as boolean;
    }
  }

  // Fallback to AsyncStorage
  const saved = await AsyncStorage.getItem(DARK_MODE_KEY);
  return saved ? JSON.parse(saved) : false;
};

// -----------------------------------------------------------------------------
// WIPE LOCAL USER DATA
// -----------------------------------------------------------------------------

export const wipeAllUserLocalData = async (uid: string) => {
  try {
    const keys = await AsyncStorage.getAllKeys();

    const userPatterns = [
      `streakPhotos_${uid}`,
      `hardModeLocal_${uid}`,
      `hardModeLastDisabledLocal_${uid}`,
      `lastNameChangeLocal_${uid}`,
      `${uid}_morning_`,
      `${uid}_evening_`,
      `checkedInDates_${uid}`,
    ];

    const keysToDelete = keys.filter(key =>
      userPatterns.some(pattern => key.startsWith(pattern) || key.includes(pattern))
    );

    if (keysToDelete.length > 0) {
      await AsyncStorage.multiRemove(keysToDelete);
    }

    console.log("🔄 wipeAllUserLocalData:", keysToDelete);
  } catch (err) {
    console.error("Error wiping user local data:", err);
  }
};
