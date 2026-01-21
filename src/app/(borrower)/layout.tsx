'use client';
import { AdooLogo } from '@/components/icons';
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar';
import { Button } from '@/components/ui/button';
import { DropdownMenu, DropdownMenuContent, DropdownMenuItem, DropdownMenuLabel, DropdownMenuSeparator, DropdownMenuTrigger } from '@/components/ui/dropdown-menu';
import { ThemeToggle } from '@/components/theme-toggle';
import { useAuth, useUserProfile } from '@/firebase';
import { LogOut, Loader2 } from 'lucide-react';
import Link from 'next/link';
import { useRouter, usePathname } from 'next/navigation';
import { useEffect } from 'react';

const borrowerNavItems = [
    { href: '/my-dashboard', label: 'My Dashboard' },
    { href: '/my-loans', label: 'My Loans' },
];

export default function BorrowerLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  const { user, userProfile, isLoading } = useUserProfile();
  const auth = useAuth();
  const router = useRouter();

  useEffect(() => {
    if (isLoading) return;

    if (!user) {
        router.replace('/login');
        return;
    }
    // If a staff member lands here, send them back to the main app
    if (userProfile && userProfile.roleId !== 'user') {
        router.replace('/dashboard');
    }
  }, [user, userProfile, isLoading, router]);

  if (isLoading || !userProfile) {
    return (
      <div className="flex h-screen items-center justify-center gap-4">
        <Loader2 className="h-8 w-8 animate-spin text-primary" />
        <p className="text-muted-foreground">Loading Your Portal...</p>
      </div>
    );
  }

  // Double check role before rendering
  if (userProfile.roleId !== 'user') {
    return (
        <div className="flex h-screen items-center justify-center gap-4">
          <Loader2 className="h-8 w-8 animate-spin text-primary" />
          <p className="text-muted-foreground">Redirecting...</p>
        </div>
      );
  }

  const displayName = userProfile?.fullName || user?.email;
  const fallback = userProfile?.fullName?.charAt(0).toUpperCase() || 'U';

  return (
    <div className="flex min-h-screen flex-col">
      <header className="sticky top-0 z-50 w-full border-b bg-background/95 backdrop-blur supports-[backdrop-filter]:bg-background/60">
        <div className="container flex h-14 items-center">
            <Link href="/my-dashboard" className="mr-6 flex items-center space-x-2">
              <AdooLogo className="h-6 w-6 text-primary" />
              <span className="font-bold sm:inline-block font-headline">Adoo</span>
            </Link>
            {/* Add nav items here if needed */}
          <div className="flex flex-1 items-center justify-end space-x-4">
          <ThemeToggle />
          <DropdownMenu>
            <DropdownMenuTrigger asChild>
            <Button variant="secondary" size="icon" className="rounded-full">
                <Avatar className="h-8 w-8">
                <AvatarImage src={userProfile?.avatarUrl || user?.photoURL || undefined} alt={displayName || ''} />
                <AvatarFallback>{fallback}</AvatarFallback>
                </Avatar>
                <span className="sr-only">Toggle user menu</span>
            </Button>
            </DropdownMenuTrigger>
            <DropdownMenuContent align="end">
            <DropdownMenuLabel>{displayName}</DropdownMenuLabel>
            <DropdownMenuSeparator />
            <DropdownMenuItem asChild><Link href="/profile">Profile</Link></DropdownMenuItem>
            <DropdownMenuSeparator />
            <DropdownMenuItem onClick={() => auth.signOut()}>
                <LogOut className="mr-2 h-4 w-4" />
                <span>Log out</span>
            </DropdownMenuItem>
            </DropdownMenuContent>
        </DropdownMenu>
          </div>
        </div>
      </header>
      <main className="flex-1">{children}</main>
    </div>
  );
}
