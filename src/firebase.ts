import { initializeApp } from "firebase/app";
import { getAuth, GoogleAuthProvider } from "firebase/auth";
import { getFirestore } from "firebase/firestore";

const firebaseConfig = {
  apiKey: "AIzaSyBtJOF2JSkYzpXOIev00Y1qtVLC2z2o4v8",
  authDomain: "viewvibe1.firebaseapp.com",
  projectId: "viewvibe1",
  storageBucket: "viewvibe1.firebasestorage.app",
  messagingSenderId: "862373526194",
  appId: "1:862373526194:web:73f064bf656848cd0627ab"
};

const app = initializeApp(firebaseConfig);
export const auth = getAuth(app);
export const db = getFirestore(app);
export const googleProvider = new GoogleAuthProvider();
