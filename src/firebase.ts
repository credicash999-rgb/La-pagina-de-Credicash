import { initializeApp } from "firebase/app";
import { getFirestore } from "firebase/firestore";

// Credenciales de tu proyecto Credi-Cash
const firebaseConfig = {
  apiKey: "AIzaSyAYBGMqsakuRlP_AbNaWXvnMRKTeOtcGEE",
  authDomain: "credicash-sistema.firebaseapp.com",
  projectId: "credicash-sistema",
  storageBucket: "credicash-sistema.firebasestorage.app",
  messagingSenderId: "108714823194",
  appId: "1:108714823194:web:edf1fdae4b6eeeeab54ba3",
  measurementId: "G-GT9MX0LBCF"
};

// Inicializamos Firebase y exportamos la base de datos Firestore
const app = initializeApp(firebaseConfig);
export const db = getFirestore(app);
