'use client';
import * as React from 'react';
import Link from 'next/link';
import { usePathname } from 'next/navigation';

import { AdooLogo } from '@/components/icons';
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar';
import { Button } from '@/components/ui/button';
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu';
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
} from 'lucide-react';
import { useAuth, useUser } from '@/firebase';
import { ThemeToggle } from './theme-toggle';

const navItems = [
  { href: '/', label: 'Dashboard', icon: Home },
  { href: '/loans', label: 'Loans', icon: CircleDollarSign },
  { href: '/borrowers', label: 'Borrowers', icon: Users },
  { href: '/repayments', label: 'Repayments', icon: FileText },
  { href: '/settings', label: 'Settings', icon: Settings },
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
  let isActive = pathname === href;
  // Special case for dashboard
  if (href === '/') {
    isActive = pathname === '/' || pathname === '/dashboard';
  }


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
  return (
    <nav className="grid items-start px-2 text-sm font-medium lg:px-4">
      {navItems.map((item) => (
        <NavLink key={item.href} {...item} />
      ))}
    </nav>
  );
}

function Header() {
  const auth = useAuth();
  const { user } = useUser();

  const displayName = user?.displayName || user?.email;
  const nameParts = user?.displayName?.split(' ') || [];
  const fallback =
    nameParts.length > 1 && nameParts[0] && nameParts[1]
      ? `${nameParts[0].charAt(0)}${nameParts[1].charAt(0)}`
      : user?.email?.charAt(0).toUpperCase() || 'U';


  return (
    <header className="flex h-14 items-center gap-4 border-b bg-muted/40 px-4 lg:h-[60px] lg:px-6">
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
              href="/"
              className="flex items-center gap-2 text-lg font-semibold mb-4"
            >
              <AdooLogo className="h-6 w-6 text-primary" />
              <span className="font-headline text-xl">Adoo</span>
            </Link>
            {navItems.map((item) => (
              <NavLink key={item.href} {...item} />
            ))}
          </nav>
        </SheetContent>
      </Sheet>
      <div className="w-full flex-1">
        <h1 className="font-headline text-xl text-foreground">
          <span className="font-normal">Smart Microfinancing</span>
        </h1>
      </div>
      <ThemeToggle />
      <DropdownMenu>
        <DropdownMenuTrigger asChild>
          <Button variant="secondary" size="icon" className="rounded-full">
            <Avatar className="h-8 w-8">
              <AvatarImage src={user?.photoURL || undefined} alt={user?.displayName || ''} />
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
  );
}

export function AppShell({ children }: { children: React.ReactNode }) {
  const pathname = usePathname();
  // Redirect /dashboard to /
  if (pathname === '/dashboard') {
    if (typeof window !== 'undefined') {
      window.history.replaceState(null, '', '/');
    }
  }
  return (
    <div className="grid min-h-screen w-full md:grid-cols-[220px_1fr] lg:grid-cols-[280px_1fr]">
      <div className="hidden border-r bg-muted/40 md:block">
        <div className="flex h-full max-h-screen flex-col gap-2">
          <div className="flex h-14 items-center border-b px-4 lg:h-[60px] lg:px-6">
            <Link href="/" className="flex items-center gap-2 font-semibold">
              <AdooLogo className="h-6 w-6 text-primary" />
              <span className="font-headline text-xl">Adoo</span>
            </Link>
          </div>
          <div className="flex-1">
            <SidebarNav />
          </div>
        </div>
      </div>
      <div className="flex flex-col">
        <Header />
        <main className="flex flex-1 flex-col gap-4 bg-background">
          {children}
        </main>
      </div>
    </div>
  );
}
