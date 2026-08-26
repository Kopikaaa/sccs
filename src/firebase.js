import { initializeApp } from "firebase/app";
import { getAuth } from "firebase/auth";
import { getFirestore } from "firebase/firestore";
import { getAnalytics } from "firebase/analytics";

const firebaseConfig = {
  apiKey: "AIzaSyANeKOU7fkNM62GP_tWkOnyy7XMWAtle50",
  authDomain: "drivex-seemta-v2.firebaseapp.com",
  projectId: "drivex-seemta-v2",
  storageBucket: "drivex-seemta-v2.firebasestorage.app",
  messagingSenderId: "1093103658868",
  appId: "1:1093103658868:web:32d67acc14c759288e2e21",
  measurementId: "G-LXQVVWS0P5"
};

const app = initializeApp(firebaseConfig);
export const auth = getAuth(app);
export const db = getFirestore(app);
export const analytics = getAnalytics(app);
