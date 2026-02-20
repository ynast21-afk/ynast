import { initializeApp, getApps } from 'firebase/app'
import { getFirestore } from 'firebase/firestore'

const firebaseConfig = {
    apiKey: process.env.NEXT_PUBLIC_FIREBASE_API_KEY || "AIzaSyBI4jxHJ8qlLmNNpa_27ROKmGrDwMg-mhk",
    authDomain: process.env.NEXT_PUBLIC_FIREBASE_AUTH_DOMAIN || "kstreamer-queue.firebaseapp.com",
    projectId: process.env.NEXT_PUBLIC_FIREBASE_PROJECT_ID || "kstreamer-queue",
    storageBucket: process.env.NEXT_PUBLIC_FIREBASE_STORAGE_BUCKET || "kstreamer-queue.firebasestorage.app",
    messagingSenderId: process.env.NEXT_PUBLIC_FIREBASE_MESSAGING_SENDER_ID || "864369693271",
    appId: process.env.NEXT_PUBLIC_FIREBASE_APP_ID || "1:864369693271:web:68a8f4f225188be83a4912",
}

// Initialize Firebase (singleton)
const app = getApps().length === 0 ? initializeApp(firebaseConfig) : getApps()[0]
const db = getFirestore(app)

export { app, db }
