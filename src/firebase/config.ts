import type { FirebaseOptions } from 'firebase/app';

// ======================================================================================
//
//  IMPORTANT: ENVIRONMENT VARIABLE CONFIGURATION FOR FIREBASE HOSTING
//
//  The "auth/invalid-api-key" error you are seeing is because your hosting environment
//  does not have access to these secret keys. To fix this, you must set them in your
//  Firebase App Hosting backend.
//
//  This file correctly reads the environment variables, but they must be provided
//  by the hosting environment to work.
//
//  Firebase Documentation:
//  https://firebase.google.com/docs/app-hosting/configure-backend#set-secrets
//
// ======================================================================================

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
