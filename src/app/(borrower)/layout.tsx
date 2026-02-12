'use client';
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar';
import { Button } from '@/components/ui/button';
import { DropdownMenu, DropdownMenuContent, DropdownMenuItem, DropdownMenuLabel, DropdownMenuSeparator, DropdownMenuTrigger } from '@/components/ui/dropdown-menu';
import { ThemeToggle } from '@/components/theme-toggle';
import { useAuth, useUserProfile } from '@/firebase';
import { LogOut, Loader2, LifeBuoy } from 'lucide-react';
import Link from 'next/link';
import { useRouter, usePathname } from 'next/navigation';
import { useEffect, useMemo } from 'react';
import { cn, transformImageUrl } from '@/lib/utils';
import Image from 'next/image';

const borrowerNavItems = [
    { href: '/my-dashboard', label: 'My Dashboard' },
    { href: '/my-loans', label: 'My Loans' },
    { href: '/help', label: 'Help Center' },
];

export default function BorrowerLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  const { user, userProfile, organization, isLoading } = useUserProfile();
  const auth = useAuth();
  const router = useRouter();
  const pathname = usePathname();

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

  const displayLogoUrl = useMemo(() => {
    return transformImageUrl(organization?.logoUrl);
  }, [organization]);

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
        <div className="container flex flex-col items-center gap-4 py-6">
            <Link href="/my-dashboard" className="flex flex-col items-center gap-1 text-center">
              {displayLogoUrl && <Image src={displayLogoUrl} alt={organization?.name || ''} width={196} height={196} className="rounded-md" />}
              <span className="text-2xl font-bold sm:inline-block font-headline">{organization?.name || ''}</span>
              {organization?.slogan && <p className="text-sm text-muted-foreground font-normal -mt-1">{organization.slogan}</p>}
            </Link>
            <div className='flex w-full items-center'>
                <nav className="flex items-center space-x-6 text-sm font-medium">
                {borrowerNavItems.map((item) => (
                    <Link
                        key={item.href}
                        href={item.href}
                        className={cn(
                            'transition-colors hover:text-primary',
                            pathname === item.href ? 'text-foreground' : 'text-muted-foreground'
                        )}
                    >
                        {item.label}
                    </Link>
                ))}
                </nav>
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
                        <DropdownMenuItem asChild><Link href="/my-profile">Profile</Link></DropdownMenuItem>
                        <DropdownMenuItem asChild><Link href="/help">
                            <LifeBuoy className="mr-2 h-4 w-4" />
                            <span>Help Center</span>
                        </Link></DropdownMenuItem>
                        <DropdownMenuSeparator />
                        <DropdownMenuItem onClick={() => auth.signOut()}>
                            <LogOut className="mr-2 h-4 w-4" />
                            <span>Log out</span>
                        </DropdownMenuItem>
                        </DropdownMenuContent>
                    </DropdownMenu>
                </div>
            </div>
        </div>
      </header>
      <main className="flex-1 bg-muted/20">{children}</main>
    </div>
  );
}
