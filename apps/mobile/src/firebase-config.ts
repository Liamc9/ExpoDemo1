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
  storageBucket: "expodemo-61d67.firebasestorage.app",
  messagingSenderId: "239133658843",
  appId: "1:239133658843:web:2cd39456dd137998e7c6fe",
  measurementId: "G-BRK0Z3WFHL",
};

// Initialize Firebase and export services
const app = initializeApp(firebaseConfig);
export const analytics = getAnalytics(app);
export const db = getFirestore(app);
export const auth = getAuth(app);
export const storage = getStorage(app);
export const functions = getFunctions(app);

export async function ensureAnonSignIn(): Promise<string> {
  if (auth.currentUser?.uid) return auth.currentUser.uid;
  await signInAnonymously(auth);
  return new Promise((resolve) => {
    const unsub = onAuthStateChanged(auth, (u) => {
      if (u?.uid) {
        unsub();
        resolve(u.uid);
      }
    });
  });
}
