// Import the functions you need from the SDKs you need
import { getApps, initializeApp } from "firebase/app";
import { getAuth } from 'firebase/auth';
import { getFirestore } from "firebase/firestore";

// TODO: Add SDKs for Firebase products that you want to use
// https://firebase.google.com/docs/web/setup#available-libraries

// Your web app's Firebase configuration
// For Firebase JS SDK v7.20.0 and later, measurementId is optional
const firebaseConfig = {
  apiKey: "AIzaSyDIvXeBxWeujRUXox23bsd4D6WxW1dBmXM",
  authDomain: "skncr-d6201.firebaseapp.com",
  projectId: "skncr-d6201",
  storageBucket: "skncr-d6201.firebasestorage.app",
  messagingSenderId: "614028536844",
  appId: "1:614028536844:web:32df5767fba03a0d291229",
  measurementId: "G-PWETXXTC8W"
};


// Initialize Firebase
const app = !getApps().length ? initializeApp(firebaseConfig) : getApps()[0];

export const db = getFirestore(app);
export const auth = getAuth(app);