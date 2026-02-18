// ======================================================================================
//
//  HOW TO CONFIGURE YOUR FIREBASE ENVIRONMENT VARIABLES
//
// ======================================================================================
//
// The error "Firebase: Error (auth/invalid-api-key)" means your hosting environment
// cannot find your secret keys. You must provide them to your hosting provider.
//
//
// ### STEP 1: FIND YOUR FIREBASE KEYS ###
//
// 1. Go to the Firebase Console: https://console.firebase.google.com/
// 2. Select your project.
// 3. Click the gear icon (⚙️) > Project settings.
// 4. In the "General" tab, scroll down to the "Your apps" card.
// 5. In the "SDK setup and configuration" section, select "Config".
// 6. You will see an object with your keys (apiKey, authDomain, etc.).
//
//
// ### STEP 2: ADD KEYS TO FIREBASE APP HOSTING ###
//
// 1. In the Firebase Console, go to the "App Hosting" section.
// 2. Find your backend, click the three-dot menu (⋮), and select "Edit backend".
// 3. Scroll down to "Secret Manager" and click "Add secret".
// 4. For each variable below, create a secret with the exact same name.
//    - SECRET NAME: NEXT_PUBLIC_FIREBASE_API_KEY
//    - SECRET VALUE: Paste the `apiKey` value you found in Step 1.
// 5. Repeat this for all other NEXT_PUBLIC_ variables.
// 6. Click "Save" and redeploy your backend.
//
// ======================================================================================

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

export { firebaseConfig };
