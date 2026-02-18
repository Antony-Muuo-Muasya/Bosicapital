import type { FirebaseOptions } from 'firebase/app';

// IMPORTANT: Environment Variable Configuration
// This configuration relies on environment variables that MUST be prefixed with NEXT_PUBLIC_.
// These variables must be set in your Firebase App Hosting backend settings for deployment.
// They will be loaded automatically from your local .env file during development.
//
// Firebase Documentation:
// https://firebase.google.com/docs/hosting/frameworks/nextjs

const firebaseConfig: FirebaseOptions = {
  projectId: process.env.NEXT_PUBLIC_FIREBASE_PROJECT_ID,
  appId: process.env.NEXT_PUBLIC_FIREBASE_APP_ID,
  apiKey: process.env.NEXT_PUBLIC_FIREBASE_API_KEY,
  authDomain: process.env.NEXT_PUBLIC_FIREBASE_AUTH_DOMAIN,
  storageBucket: process.env.NEXT_PUBLIC_FIREBASE_STORAGE_BUCKET,
  messagingSenderId: process.env.NEXT_PUBLIC_FIREBASE_MESSAGING_SENDER_ID,
  measurementId: process.env.NEXT_PUBLIC_FIREBASE_MEASUREMENT_ID,
};

export { firebaseConfig };
