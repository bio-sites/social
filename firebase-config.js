// Import the functions you need from the SDKs you need
import { initializeApp } from "https://www.gstatic.com/firebasejs/10.8.0/firebase-app.js";
import { getAuth } from "https://www.gstatic.com/firebasejs/10.8.0/firebase-auth.js";
import { getFirestore } from "https://www.gstatic.com/firebasejs/10.8.0/firebase-firestore.js";
// TODO: Add SDKs for Firebase products that you want to use
// https://firebase.google.com/docs/web/setup#available-libraries

// Your web app's Firebase configuration
// For Firebase JS SDK v7.20.0 and later, measurementId is optional
const firebaseConfig = {
  apiKey: "AIzaSyA4sIfT6u6n8XWRPn2dLktlKfEP16VPw40",
  authDomain: "my-social-links-ede8c.firebaseapp.com",
  projectId: "my-social-links-ede8c",
  storageBucket: "my-social-links-ede8c.firebasestorage.app",
  messagingSenderId: "515940881963",
  appId: "1:515940881963:web:5093dc75b133024d52bc6e",
  measurementId: "G-MLN6Y10GRE"
};

// Initialize Firebase
const app = initializeApp(firebaseConfig);
export const auth = getAuth(app);
export const db = getFirestore(app);