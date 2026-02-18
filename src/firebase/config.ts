import type { FirebaseOptions } from 'firebase/app';

const firebaseConfig: FirebaseOptions = {
  projectId: process.env.NEXT_PUBLIC_FIREBASE_PROJECT_ID,
  appId: process.env.NEXT_PUBLIC_FIREBASE_APP_ID,
  apiKey: process.env.NEXT_PUBLIC_FIREBASE_API_KEY,
  authDomain: process.env.NEXT_PUBLIC_FIREBASE_AUTH_DOMAIN,
  measurementId: "",
  messagingSenderId: process.env.NEXT_PUBLIC_FIREBASE_MESSAGING_SENDER_ID,
};

// This validation check ensures that the app doesn't try to initialize Firebase
// without the necessary credentials, which causes the 'auth/invalid-api-key' error.
// It will now fail with a much clearer error message if the environment variables are not set.
if (!firebaseConfig.apiKey) {
  throw new Error(
    'Firebase API Key is missing. Please make sure NEXT_PUBLIC_FIREBASE_API_KEY is set in your environment variables (e.g., in your .env file or Vercel project settings).'
  );
}

export { firebaseConfig };
