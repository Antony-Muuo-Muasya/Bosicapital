'use client';

import React, { createContext, useContext, ReactNode, useMemo, useState, useEffect } from 'react';
import type { User as AppUser, Role, Organization } from '@/lib/types';
import { getUserProfile } from '@/actions/users';
import { useSession } from 'next-auth/react';

export interface UserProfileHookResult {
  user: { id: string, email: string, displayName: string } | null;
  userProfile: WithId<AppUser> | null;
  userRole: WithId<Role> | null;
  organization: WithId<Organization> | null;
  isLoading: boolean;
}

type WithId<T> = T & { id: string };

const UserProfileContext = createContext<UserProfileHookResult | undefined>(undefined);

export const UserProfileProvider: React.FC<{ children: ReactNode }> = ({ children }) => {
  const { data: session, status } = useSession();
  const isAuthLoading = status === 'loading';
  const sessionUser = session?.user as any;
  
  const user = useMemo(() => {
    if (!sessionUser) return null;
    return {
      id: sessionUser.id,
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
    
    console.log(`[UserProfile] Fetching profile for ID: ${sessionUser.id}`);
    setIsProfileLoading(true);
    
    getUserProfile(sessionUser.id)
      .then(res => {
        if (res.success && res.user) {
          const profile = {
            id: res.user.id,
            organizationId: res.user.organizationId,
            fullName: res.user.fullName,
            email: res.user.email,
            roleId: res.user.roleId,
            branchIds: res.user.branchIds,
            status: res.user.status,
            createdAt: res.user.createdAt.toString(),
            avatarUrl: res.user.avatarUrl || undefined,
            marketingOptIn: res.user.marketingOptIn,
          } as WithId<AppUser>;
          
          setUserProfile(profile);
          setUserRole(res.user.role as any);
          setOrganization(res.user.organization as any);
        } else {
          console.error("[UserProfile] Profile fetch failed (Stale Session):", res.error);
          import('next-auth/react').then(({ signOut }) => {
            signOut({ redirect: true, callbackUrl: '/login' });
          });
        }
      })
      .catch((err) => {
        console.error("[UserProfile] Failed to load user profile", err);
      })
      .finally(() => {
        setIsProfileLoading(false);
      });
  }, [sessionUser?.id, isAuthLoading]);

  const value = useMemo(() => ({
    user,
    userProfile,
    userRole,
    organization: organization ? { ...organization, name: 'Bosi Capital Limited' } as any : null,
    isLoading: isAuthLoading || isProfileLoading,
  }), [user, userProfile, userRole, organization, isAuthLoading, isProfileLoading]);

  return (
    <UserProfileContext.Provider value={value}>
      {children}
    </UserProfileContext.Provider>
  );
};

export const useUserProfile = (): UserProfileHookResult => {
  const context = useContext(UserProfileContext);
  if (context === undefined) {
    throw new Error('useUserProfile must be used within a UserProfileProvider');
  }
  return context;
};
