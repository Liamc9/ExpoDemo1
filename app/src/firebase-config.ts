// firebase-config.js
import { initializeApp } from "firebase/app";
import { getAnalytics } from "firebase/analytics";
import { getFirestore } from "@firebase/firestore";
import { getAuth, signInAnonymously, onAuthStateChanged } from "firebase/auth";
import { getStorage } from "firebase/storage";
import { getFunctions } from "firebase/functions";

const firebaseConfig = {
  apiKey: "AIzaSyBFrHL5ktAM_DkqA5Xs9lSo6CQgtArHurs",
  authDomain: "expodemo-61d67.firebaseapp.com",
  projectId: "expodemo-61d67",
  storageBucket: "expodemo-61d67.appspot.com",
  messagingSenderId: "239133658843",
  appId: "1:239133658843:web:2cd39456dd137998e7c6fe",
  measurementId: "G-BRK0Z3WFHL",
};

// Initialize Firebase and export services
const app = initializeApp(firebaseConfig);
export const analytics = typeof window !== "undefined" && typeof (window as any).document !== "undefined" ? getAnalytics(app) : undefined;
export const db = getFirestore(app);
export const auth = getAuth(app);
export const storage = getStorage(app);
export const functions = getFunctions(app);
