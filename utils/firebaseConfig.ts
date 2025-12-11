// utils/firebaseConfig.ts

import auth from "@react-native-firebase/auth";
import firestore from "@react-native-firebase/firestore";

export const authRN = auth();
export const db = firestore();
