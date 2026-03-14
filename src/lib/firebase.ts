import { initializeApp } from "firebase/app";
import { getAuth } from "firebase/auth";

// Your web app's Firebase configuration
const firebaseConfig = {
  apiKey: "AIzaSyD7MkSEa799p5tsWf63_QVEXcfXOsNbRms",
  authDomain: "syncmusic-8bd51.firebaseapp.com",
  projectId: "syncmusic-8bd51",
  storageBucket: "syncmusic-8bd51.firebasestorage.app",
  messagingSenderId: "647467292178",
  appId: "1:647467292178:web:65afa42eda79d10551aacb",
  measurementId: "G-4Z7V3W6C3B"
};

// Initialize Firebase
const app = initializeApp(firebaseConfig);

// Initialize Firebase Auth
export const auth = getAuth(app);
