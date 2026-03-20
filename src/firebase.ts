import { initializeApp } from "firebase/app";
import { getAuth, GoogleAuthProvider } from "firebase/auth";
import { getFirestore } from "firebase/firestore";

const firebaseConfig = {
  apiKey: import.meta.env.VITE_FIREBASE_API_KEY || "AIzaSyBtJOF2JSkYzpXOIev00Y1qtVLC2z2o4v8",
  authDomain: import.meta.env.VITE_FIREBASE_AUTH_DOMAIN || "viewvibe1.firebaseapp.com",
  projectId: import.meta.env.VITE_FIREBASE_PROJECT_ID || "viewvibe1",
  storageBucket: import.meta.env.VITE_FIREBASE_STORAGE_BUCKET || "viewvibe1.firebasestorage.app",
  messagingSenderId: import.meta.env.VITE_FIREBASE_MESSAGING_SENDER_ID || "862373526194",
  appId: import.meta.env.VITE_FIREBASE_APP_ID || "1:862373526194:web:73f064bf656848cd0627ab"
};

const app = initializeApp(firebaseConfig);
export const auth = getAuth(app);
export const db = getFirestore(app);
export const googleProvider = new GoogleAuthProvider();
