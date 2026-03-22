'use client';

import React, { DependencyList, createContext, useContext, ReactNode, useMemo, useState, useEffect } from 'react';
import { FirebaseApp } from 'firebase/app';
import { Firestore } from 'firebase/firestore';
import type { User as AppUser, Role, Organization } from '@/lib/types';
import { getUserProfile } from '@/actions/users';
import { useSession } from 'next-auth/react';

// Combined state for the Firebase context
export interface FirebaseContextState {
  areServicesAvailable: boolean; 
  firebaseApp: FirebaseApp | null;
  firestore: Firestore | null;
}

export interface UserProfileHookResult {
  user: { uid: string, email: string, displayName: string } | null;
  userProfile: WithId<AppUser> | null;
  userRole: WithId<Role> | null;
  organization: WithId<Organization> | null;
  isLoading: boolean;
}

type WithId<T> = T & { id: string };

// React Context
export const FirebaseContext = createContext<FirebaseContextState | undefined>(undefined);

export const FirebaseProvider: React.FC<{
  children: ReactNode;
  firebaseApp: FirebaseApp | null;
  firestore: Firestore | null;
}> = ({ children, firebaseApp, firestore }) => {
  const contextValue = useMemo((): FirebaseContextState => ({
    areServicesAvailable: !!(firebaseApp && firestore),
    firebaseApp,
    firestore,
  }), [firebaseApp, firestore]);

  return (
    <FirebaseContext.Provider value={contextValue}>
      {children}
    </FirebaseContext.Provider>
  );
};

export const useFirebase = () => {
  const context = useContext(FirebaseContext);
  if (context === undefined) {
    throw new Error('useFirebase must be used within a FirebaseProvider.');
  }
  return context;
};

/** Hook to access Firestore instance. */
export const useFirestore = (): Firestore => {
  const { firestore } = useFirebase();
  if (!firestore) throw new Error('Firestore not available');
  return firestore;
};

/** Hook to access Firebase App instance. */
export const useFirebaseApp = (): FirebaseApp => {
  const { firebaseApp } = useFirebase();
  if (!firebaseApp) throw new Error('FirebaseApp not available');
  return firebaseApp;
};

export function useMemoFirebase<T>(factory: () => T, deps: DependencyList): T {
  return useMemo(factory, deps);
}

/**
 * Hook to get the current user, their profile from Prisma, and their role.
 */
export const useUserProfile = (): UserProfileHookResult => {
  const { data: session, status } = useSession();
  const isAuthLoading = status === 'loading';
  const sessionUser = session?.user as any;
  
  const user = useMemo(() => {
    if (!sessionUser) return null;
    return {
      uid: sessionUser.id,
      email: sessionUser.email,
      displayName: sessionUser.name,
    };
  }, [sessionUser]);

  const [userProfile, setUserProfile] = useState<WithId<AppUser> | null>(null);
  const [userRole, setUserRole] = useState<WithId<Role> | null>(null);
  const [organization, setOrganization] = useState<WithId<Organization> | null>(null);
  const [isProfileLoading, setIsProfileLoading] = useState(true);

  useEffect(() => {
    if (isAuthLoading) return;
    
    if (!sessionUser?.id) {
      setUserProfile(null);
      setUserRole(null);
      setOrganization(null);
      setIsProfileLoading(false);
      return;
    }
    
    let isMounted = true;
    setIsProfileLoading(true);
    
    getUserProfile(sessionUser.id)
      .then(res => {
        if (!isMounted) return;
        if (res.success && res.user) {
          const profile = {
            id: res.user.id,
            organizationId: res.user.organizationId,
            fullName: res.user.fullName,
            email: res.user.email,
            roleId: res.user.roleId,
            branchIds: res.user.branchIds,
            status: res.user.status,
            createdAt: res.user.createdAt.toISOString(),
            avatarUrl: res.user.avatarUrl || undefined,
            marketingOptIn: res.user.marketingOptIn,
          } as WithId<AppUser>;
          
          setUserProfile(profile);
          setUserRole(res.user.role as any);
          setOrganization(res.user.organization as any);
        } else {
          setUserProfile(null);
          setUserRole(null);
          setOrganization(null);
        }
      })
      .catch((err) => {
        console.error("Failed to load user profile", err);
        if (isMounted) {
            setUserProfile(null);
            setUserRole(null);
            setOrganization(null);
        }
      })
      .finally(() => {
        if (isMounted) setIsProfileLoading(false);
      });
      
    return () => { isMounted = false; };
  }, [sessionUser?.id, isAuthLoading]);

  return {
    user,
    userProfile,
    userRole,
    organization: organization ? { ...organization, name: 'Bosi Capital Limited' } as any : null,
    isLoading: isAuthLoading || isProfileLoading,
  };
};
