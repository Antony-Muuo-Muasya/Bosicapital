'use client';

import React, { useState, useEffect, type ReactNode } from 'react';
import { FirebaseProvider } from '@/firebase/provider';
import { initializeFirebase } from '@/firebase';
import type { FirebaseApp } from 'firebase/app';
import type { Auth } from 'firebase/auth';
import type { Firestore } from 'firebase/firestore';

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

  useEffect(() => {
    // This effect ensures Firebase is initialized only on the client-side,
    // after the initial server render.
    const firebaseServices = initializeFirebase();
    setServices(firebaseServices);
  }, []);

  // On initial render (server-side and client-side before useEffect),
  // services will be null. We should not render children that depend on Firebase.
  if (!services.firebaseApp) {
    // Returning null prevents child components from rendering and throwing errors.
    // The app may show a blank screen for a moment, which is acceptable during initialization.
    return null;
  }

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
