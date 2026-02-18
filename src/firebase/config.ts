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
// 1. In the Firebase Console, go to the "App Hosting" section from the Build menu.
// 2. In the list of backends, find the backend you are deploying to.
// 3. Click the three-dot menu (⋮) next to its name and select "Backend details",
//    or simply click on the backend's name to open its details page.
// 4. On the details page, find the "Configuration" tab or section.
// 5. Scroll down to "Secret Manager" and click "Add secret".
// 6. For each variable below, create a secret with the exact same name.
//    - SECRET NAME: NEXT_PUBLIC_FIREBASE_API_KEY
//    - SECRET VALUE: Paste the `apiKey` value you found in Step 1.
// 7. Repeat this for all other NEXT_PUBLIC_ variables from your .env file.
// 8. Click "Save" and redeploy your backend.
//
// ======================================================================================

import type { FirebaseOptions } from 'firebase/app';

export const firebaseConfig: FirebaseOptions = {
  apiKey: process.env.NEXT_PUBLIC_FIREBASE_API_KEY,
  authDomain: process.env.NEXT_PUBLIC_FIREBASE_AUTH_DOMAIN,
  projectId: process.env.NEXT_PUBLIC_FIREBASE_PROJECT_ID,
  storageBucket: process.env.NEXT_PUBLIC_FIREBASE_STORAGE_BUCKET,
  messagingSenderId: process.env.NEXT_PUBLIC_FIREBASE_MESSAGING_SENDER_ID,
  appId: process.env.NEXT_PUBLIC_FIREBASE_APP_ID,
};
