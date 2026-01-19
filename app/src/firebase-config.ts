// firebase-config.ts
import { initializeApp } from "firebase/app";
import { getFirestore } from "firebase/firestore";
import { getAuth } from "firebase/auth";
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

export const app = initializeApp(firebaseConfig);
export const db = getFirestore(app);
export const auth = getAuth(app);
export const storage = getStorage(app);
export const functions = getFunctions(app);

// Optional: Analytics (web only)
export const analyticsPromise = typeof window !== "undefined" ? import("firebase/analytics").then(({ getAnalytics }) => getAnalytics(app)) : Promise.resolve(undefined);
