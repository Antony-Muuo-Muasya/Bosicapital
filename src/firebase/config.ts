import type { FirebaseOptions } from 'firebase/app';

const firebaseConfig: FirebaseOptions = {
  projectId: process.env.NEXT_PUBLIC_FIREBASE_PROJECT_ID,
  appId: process.env.NEXT_PUBLIC_FIREBASE_APP_ID,
  apiKey: process.env.NEXT_PUBLIC_FIREBASE_API_KEY,
  authDomain: process.env.NEXT_PUBLIC_FIREBASE_AUTH_DOMAIN,
  storageBucket: process.env.NEXT_PUBLIC_FIREBASE_STORAGE_BUCKET,
  messagingSenderId: process.env.NEXT_PUBLIC_FIREBASE_MESSAGING_SENDER_ID,
  measurementId: process.env.NEXT_PUBLIC_FIREBASE_MEASUREMENT_ID,
};

// NOTE: The validation check for API keys has been removed to allow Firebase's native error handling.
// If you see errors like "auth/invalid-api-key", it still means that your 
// environment variables are not configured correctly in your deployment environment (e.g., Vercel).
// You MUST add your NEXT_PUBLIC_... variables to your Vercel project settings.

export { firebaseConfig };
