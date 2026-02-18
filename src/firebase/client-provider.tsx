'use client';

import React, { useState, useEffect, type ReactNode } from 'react';
import { FirebaseProvider } from '@/firebase/provider';
import { initializeFirebase } from '@/firebase';
import type { FirebaseApp } from 'firebase/app';
import type { Auth } from 'firebase/auth';
import type { Firestore } from 'firebase/firestore';
import { Loader2, AlertTriangle } from 'lucide-react';


const MissingEnvVarError = () => (
  <div className="flex h-screen w-full items-center justify-center bg-background p-8">
    <div className="max-w-3xl rounded-lg border border-destructive/50 bg-destructive/10 p-8 text-destructive">
      <div className="flex items-center gap-6">
        <AlertTriangle className="h-12 w-12 flex-shrink-0" />
        <div>
          <h1 className="text-xl font-bold">Configuration Error: Firebase API Key Missing or Invalid</h1>
          <p className="mt-2 text-sm">
            Your Firebase environment variables are not set correctly. The application cannot connect to Firebase without them.
          </p>
          <div className="mt-4 text-xs">
            <p className="font-semibold">To fix this, you must add your Firebase project's secret keys to your Firebase App Hosting environment:</p>
            <ol className="list-decimal list-inside space-y-1 pl-2 mt-2">
              <li>Go to the Firebase Console and select your project.</li>
              <li>Navigate to **Project settings** (gear icon ⚙️) &gt; **General** tab.</li>
              <li>Under "Your apps," find your web app and select **Config** to view your keys.</li>
              <li>Navigate to the **App Hosting** section in the left menu.</li>
              <li>Click on your backend's name to open its details page.</li>
              <li>Go to the **Configuration** tab and find the **Secret Manager** section.</li>
              <li>Click **Add secret** and create a secret for each `NEXT_PUBLIC_...` variable, pasting the corresponding value.</li>
              <li>Redeploy your backend for the changes to take effect.</li>
            </ol>
          </div>
        </div>
      </div>
    </div>
  </div>
);


interface FirebaseClientProviderProps {
  children: ReactNode;
}

interface FirebaseServices {
  firebaseApp: FirebaseApp | null;
  auth: Auth | null;
  firestore: Firestore | null;
}

export function FirebaseClientProvider({ children }: FirebaseClientProviderProps) {
  const [services, setServices] = useState<FirebaseServices>({
    firebaseApp: null,
    auth: null,
    firestore: null
  });
  const [isConfigValid, setIsConfigValid] = useState<boolean | null>(null);

  useEffect(() => {
    // This function will now correctly read the environment variables on the client side.
    const firebaseConfig = {
        apiKey: process.env.NEXT_PUBLIC_FIREBASE_API_KEY,
        authDomain: process.env.NEXT_PUBLIC_FIREBASE_AUTH_DOMAIN,
        projectId: process.env.NEXT_PUBLIC_FIREBASE_PROJECT_ID,
        storageBucket: process.env.NEXT_PUBLIC_FIREBASE_STORAGE_BUCKET,
        messagingSenderId: process.env.NEXT_PUBLIC_FIREBASE_MESSAGING_SENDER_ID,
        appId: process.env.NEXT_PUBLIC_FIREBASE_APP_ID,
    };
    
    // A more robust check to ensure keys are present and not just placeholders.
    const isConfigCompleteAndValid = 
      firebaseConfig.apiKey &&
      firebaseConfig.authDomain &&
      firebaseConfig.projectId &&
      !firebaseConfig.apiKey.includes('AIza') === false; // A valid key must start with 'AIza'

    if (isConfigCompleteAndValid) {
      const firebaseServices = initializeFirebase(firebaseConfig);
      setServices(firebaseServices);
      setIsConfigValid(true);
    } else {
      console.error("Firebase config is missing or invalid. Please set NEXT_PUBLIC_... variables in your hosting environment's secrets/variables.");
      setIsConfigValid(false);
    }
  }, []);

  if (isConfigValid === false) {
    // If the config is invalid, render a helpful error message.
    return <MissingEnvVarError />;
  }

  if (isConfigValid === null || !services.firebaseApp) {
    // While checking the config and initializing, show a loading state.
    return (
      <div className="flex h-screen items-center justify-center gap-4">
        <Loader2 className="h-8 w-8 animate-spin text-primary" />
        <p className="text-muted-foreground">Initializing...</p>
      </div>
    );
  }

  // Once config is valid and services are initialized, render the app.
  return (
    <FirebaseProvider
      firebaseApp={services.firebaseApp}
      auth={services.auth}
      firestore={services.firestore}
    >
      {children}
    </FirebaseProvider>
  );
}
