import { getApp, getApps, initializeApp } from "firebase/app";
import { getAuth } from "firebase/auth";
import { getFirestore } from "firebase/firestore";
import { getAnalytics, isSupported } from "firebase/analytics";

const firebaseConfig = {
  apiKey:
    process.env.NEXT_PUBLIC_FIREBASE_API_KEY ||
    "AIzaSyBoA2SvTt9V6iom5T5aGKknD7KnWyPgmvw",
  authDomain:
    process.env.NEXT_PUBLIC_FIREBASE_AUTH_DOMAIN ||
    "monitordistribution.firebaseapp.com",
  projectId:
    process.env.NEXT_PUBLIC_FIREBASE_PROJECT_ID || "monitordistribution",
  storageBucket:
    process.env.NEXT_PUBLIC_FIREBASE_STORAGE_BUCKET ||
    "monitordistribution.firebasestorage.app",
  messagingSenderId:
    process.env.NEXT_PUBLIC_FIREBASE_MESSAGING_SENDER_ID || "290531904654",
  appId:
    process.env.NEXT_PUBLIC_FIREBASE_APP_ID ||
    "1:290531904654:web:4264afc8e923bd063c4ddf",
  measurementId:
    process.env.NEXT_PUBLIC_FIREBASE_MEASUREMENT_ID || "G-0DCRFNFHZ5",
};

const app = getApps().length > 0 ? getApp() : initializeApp(firebaseConfig);
const auth = getAuth(app);
const db = getFirestore(app);

let analyticsInitialized = false;

export async function initializeAnalytics() {
  if (typeof window === "undefined" || analyticsInitialized) {
    return;
  }

  const supported = await isSupported();
  if (!supported) {
    return;
  }

  getAnalytics(app);
  analyticsInitialized = true;
}

export { app, auth, db };
