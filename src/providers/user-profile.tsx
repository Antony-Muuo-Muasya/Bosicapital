'use client';

import React, { createContext, useContext, ReactNode, useMemo, useState, useEffect } from 'react';
import type { User as AppUser, Role, Organization } from '@/lib/types';
import { getUserProfile } from '@/actions/users';
import { useSession } from 'next-auth/react';

export interface UserProfileHookResult {
  user: { uid: string, email: string, displayName: string } | null;
  userProfile: WithId<AppUser> | null;
  userRole: WithId<Role> | null;
  organization: WithId<Organization> | null;
  isLoading: boolean;
}

type WithId<T> = T & { id: string };

// Dummy Context to prevent breaking imports of FirebaseClientProvider and FirebaseProvider
// Many files use <FirebaseClientProvider> but it's really just a UserProfileProvider now.
export const FirebaseClientProvider: React.FC<{ children: ReactNode }> = ({ children }) => {
  return <>{children}</>;
};

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
