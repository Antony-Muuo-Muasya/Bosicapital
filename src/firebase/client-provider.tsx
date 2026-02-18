'use client';

import React, { useState, useEffect, type ReactNode } from 'react';
import { FirebaseProvider } from '@/firebase/provider';
import { initializeFirebase, firebaseConfig } from '@/firebase';
import type { FirebaseApp } from 'firebase/app';
import type { Auth } from 'firebase/auth';
import type { Firestore } from 'firebase/firestore';
import { Loader2, AlertTriangle } from 'lucide-react';


const ConfigNotSetError = () => (
  <div className="flex h-screen w-full items-center justify-center bg-background p-8">
    <div className="max-w-4xl rounded-lg border border-destructive/50 bg-destructive/10 p-8 text-destructive">
      <div className="flex items-center gap-6">
        <AlertTriangle className="h-12 w-12 flex-shrink-0" />
        <div>
          <h1 className="text-xl font-bold">Action Required: Set Firebase Configuration</h1>
          <p className="mt-2 text-sm">
            Your application needs its Firebase configuration keys to connect to the backend.
            I have set up the file `src/firebase/config.ts` with placeholders for you.
          </p>
          <div className="mt-6 text-xs space-y-4">
            <div>
              <p className="font-semibold text-base">Step 1: Find Your Firebase Web App Keys</p>
              <ol className="list-decimal list-inside space-y-1 pl-2 mt-2">
                <li>Go to the Firebase Console and select your project.</li>
                <li>Click the **gear icon** ⚙️ next to "Project Overview", then select **Project settings**.</li>
                <li>In the "General" tab, scroll down to the **"Your apps"** card.</li>
                <li>Find your web app and select the **"Config"** option. A code snippet will appear with your keys.</li>
              </ol>
            </div>
             <div>
              <p className="font-semibold text-base">Step 2: Provide the Keys</p>
              <p className="mt-2">Since you are in a read-only editor, I will set these keys for you. Please provide the values from the config object you found in Step 1. For example, you can say:</p>
              <code className="mt-2 block rounded bg-black/10 p-2 text-sm text-destructive/80">"My apiKey is Axxxxxxxxxxxxxxxxx"</code>
              <p className="mt-2">I will update the `src/firebase/config.ts` file with the correct values.</p>
            </div>
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
    // A robust check to ensure keys are not placeholders.
    const isConfigCompleteAndValid =
      firebaseConfig.apiKey &&
      !firebaseConfig.apiKey.includes('YOUR_') &&
      firebaseConfig.authDomain &&
      !firebaseConfig.authDomain.includes('YOUR_') &&
      firebaseConfig.projectId &&
      !firebaseConfig.projectId.includes('YOUR_');

    if (isConfigCompleteAndValid) {
      const firebaseServices = initializeFirebase(firebaseConfig);
      setServices(firebaseServices);
      setIsConfigValid(true);
    } else {
      console.error("Firebase config is missing or invalid. Please provide the values in src/firebase/config.ts.");
      setIsConfigValid(false);
    }
  }, []);

  if (isConfigValid === false) {
    // If the config is invalid, render a helpful error message.
    return <ConfigNotSetError />;
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
