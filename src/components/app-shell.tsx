'use client';
import * as React from 'react';
import Link from 'next/link';
import { usePathname } from 'next/navigation';

import Image from 'next/image';
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar';
import { Button } from '@/components/ui/button';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog';
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu';
import { Input } from '@/components/ui/input';
import { Sheet, SheetContent, SheetTrigger } from '@/components/ui/sheet';
import { cn } from '@/lib/utils';
import {
  CircleDollarSign,
  FileText,
  Home,
  LogOut,
  Menu,
  Settings,
  Users,
  ShieldCheck,
  Building,
  FileKey,
  BarChart,
  UserCog,
  Search,
  RefreshCw,
  Bell,
} from 'lucide-react';
import { useAuth, useUserProfile } from '@/firebase';
import { ThemeToggle } from './theme-toggle';


const allNavItems = [
  { href: '/dashboard', label: 'Dashboard', icon: Home, roles: ['admin', 'manager', 'loan_officer'] },
  { href: '/loans', label: 'Loans', icon: CircleDollarSign, roles: ['admin', 'manager', 'loan_officer'] },
  { href: '/approvals', label: 'Approvals', icon: ShieldCheck, roles: ['manager', 'superadmin'] },
  { href: '/disbursements', label: 'Disbursements', icon: FileKey, roles: ['admin', 'superadmin'] },
  { href: '/borrowers', label: 'Borrowers', icon: Users, roles: ['admin', 'manager', 'loan_officer'] },
  { href: '/repayments', label: 'Repayments', icon: FileText, roles: ['admin', 'manager', 'loan_officer'] },
  { href: '/reports', label: 'Reports', icon: BarChart, roles: ['admin', 'manager'] },
  { href: '/users', label: 'Users', icon: UserCog, roles: ['admin', 'superadmin'] },
  { href: '/branches', label: 'Branches', icon: Building, roles: ['admin', 'manager', 'superadmin'] },
  { href: '/settings', label: 'Settings', icon: Settings, roles: ['admin', 'superadmin'] },
];

const NavLink = ({
  href,
  label,
  icon: Icon,
}: {
  href: string;
  label: string;
  icon: React.ElementType;
}) => {
  const pathname = usePathname();
  const isActive = pathname.startsWith(href);

  return (
    <Link
      href={href}
      className={cn(
        'flex items-center gap-3 rounded-lg px-3 py-2 text-muted-foreground transition-all hover:text-primary',
        isActive && 'bg-muted text-primary'
      )}
    >
      <Icon className="h-4 w-4" />
      {label}
    </Link>
  );
};

function SidebarNav() {
  const { userRole } = useUserProfile();

  const visibleNavItems = React.useMemo(() => {
    if (!userRole) return [];
    if (userRole.id === 'superadmin') return allNavItems;
    return allNavItems.filter(item => item.roles.includes(userRole.id));
  }, [userRole]);


  return (
    <nav className="grid items-start px-2 text-sm font-medium lg:px-4">
      {visibleNavItems.map((item) => (
        <NavLink key={item.href} {...item} />
      ))}
    </nav>
  );
}

function Header() {
  const auth = useAuth();
  const { user, userProfile, organization } = useUserProfile();
  const [isSearchOpen, setIsSearchOpen] = React.useState(false);
  
  const displayName = userProfile?.fullName || user?.email;
  const nameParts = userProfile?.fullName?.split(' ') || [];
  const fallback =
    nameParts.length > 1 && nameParts[0] && nameParts[1]
      ? `${nameParts[0].charAt(0)}${nameParts[1].charAt(0)}`
      : user?.email?.charAt(0).toUpperCase() || 'U';

  const displayLogoUrl = React.useMemo(() => {
    if (organization?.logoUrl && organization.logoUrl.includes('drive.google.com/file/d/')) {
        const parts = organization.logoUrl.split('/d/');
        if (parts.length > 1) {
            const fileId = parts[1].split('/')[0];
            return `https://drive.google.com/uc?export=view&id=${fileId}`;
        }
    }
    return organization?.logoUrl || '/logo.jpg';
  }, [organization]);


  return (
    <>
      <header className="flex h-14 items-center gap-4 border-b bg-background px-4 lg:h-[60px] lg:px-6">
        <Sheet>
          <SheetTrigger asChild>
            <Button variant="outline" size="icon" className="shrink-0 md:hidden">
              <Menu className="h-5 w-5" />
              <span className="sr-only">Toggle navigation menu</span>
            </Button>
          </SheetTrigger>
          <SheetContent side="left" className="flex flex-col">
            <nav className="grid gap-2 text-lg font-medium">
              <Link
                href="/dashboard"
                className="flex items-center gap-2 text-lg font-semibold mb-4"
              >
                <Image src={displayLogoUrl} alt={organization?.name || 'BOSI CAPITAL'} width={28} height={28} className="rounded-md" />
                <span className="font-headline text-xl">{organization?.name || 'BOSI CAPITAL'}</span>
              </Link>
               <SidebarNav />
            </nav>
          </SheetContent>
        </Sheet>
        <div className="w-full flex-1">
          {/* Empty div for spacing. Logo is in the sidebar for desktop. */}
        </div>
        <Button variant="ghost" size="icon" onClick={() => setIsSearchOpen(true)}>
          <Search className="h-5 w-5" />
          <span className="sr-only">Search</span>
        </Button>
        <Button variant="ghost" size="icon" onClick={() => window.location.reload()}>
          <RefreshCw className="h-5 w-5" />
          <span className="sr-only">Refresh</span>
        </Button>
        <DropdownMenu>
            <DropdownMenuTrigger asChild>
                <Button variant="ghost" size="icon">
                    <Bell className="h-5 w-5" />
                    <span className="sr-only">Notifications</span>
                </Button>
            </DropdownMenuTrigger>
            <DropdownMenuContent align="end">
                <DropdownMenuLabel>Notifications</DropdownMenuLabel>
                <DropdownMenuSeparator />
                <div className="p-4 text-sm text-center text-muted-foreground">
                    <p>No new notifications</p>
                </div>
            </DropdownMenuContent>
        </DropdownMenu>
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
            <DropdownMenuItem asChild>
              <Link href="/profile">Profile</Link>
            </DropdownMenuItem>
            <DropdownMenuItem>Support</DropdownMenuItem>
            <DropdownMenuSeparator />
            <DropdownMenuItem onClick={() => auth.signOut()}>
              <LogOut className="mr-2 h-4 w-4" />
              <span>Log out</span>
            </DropdownMenuItem>
          </DropdownMenuContent>
        </DropdownMenu>
      </header>
      <Dialog open={isSearchOpen} onOpenChange={setIsSearchOpen}>
        <DialogContent className="sm:max-w-md">
            <DialogHeader>
                <DialogTitle>Global Search</DialogTitle>
                <DialogDescription>
                    Search for borrowers, loans, and more across the entire application.
                </DialogDescription>
            </DialogHeader>
            <div className="relative">
                <Search className="absolute left-2.5 top-3 h-4 w-4 text-muted-foreground" />
                <Input placeholder="Search..." className="pl-8" />
            </div>
              <div className="text-center text-xs text-muted-foreground pt-2">
                <p>Global search is not yet implemented.</p>
            </div>
        </DialogContent>
      </Dialog>
    </>
  );
}

export function AppShell({ children }: { children: React.ReactNode }) {
  const { organization } = useUserProfile();

  const displayLogoUrl = React.useMemo(() => {
    if (organization?.logoUrl && organization.logoUrl.includes('drive.google.com/file/d/')) {
        const parts = organization.logoUrl.split('/d/');
        if (parts.length > 1) {
            const fileId = parts[1].split('/')[0];
            return `https://drive.google.com/uc?export=view&id=${fileId}`;
        }
    }
    return organization?.logoUrl || '/logo.jpg';
  }, [organization]);

  return (
    <div className="grid min-h-screen w-full md:grid-cols-[220px_1fr] lg:grid-cols-[280px_1fr]">
      <div className="hidden border-r bg-muted/40 md:block">
        <div className="flex h-full max-h-screen flex-col gap-2">
          <div className="flex h-14 items-center border-b px-4 lg:h-[60px] lg:px-6">
            <Link href="/dashboard" className="flex items-center gap-2 font-semibold">
              <Image src={displayLogoUrl} alt={organization?.name || 'BOSI CAPITAL'} width={28} height={28} className="rounded-md" />
              <span className="font-headline text-xl">{organization?.name || 'BOSI CAPITAL'}</span>
            </Link>
          </div>
          <div className="flex-1">
            <SidebarNav />
          </div>
        </div>
      </div>
      <div className="flex flex-col">
        <Header />
        <main className="flex flex-1 flex-col gap-4 bg-background overflow-y-auto">
          {children}
        </main>
      </div>
    </div>
  );
}
