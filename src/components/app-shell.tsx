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
import { cn, transformImageUrl } from '@/lib/utils';
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
  ChevronDown,
} from 'lucide-react';
import {
  Collapsible,
  CollapsibleContent,
  CollapsibleTrigger,
} from "@/components/ui/collapsible";
import { useAuth, useUserProfile } from '@/firebase';
import { ThemeToggle } from './theme-toggle';
import { AppFooter } from './app-footer';


const allNavItems = [
  { href: '/dashboard', label: 'Dashboard', icon: Home, roles: ['admin', 'manager', 'loan_officer'] },
  {
    label: 'Loans',
    icon: CircleDollarSign,
    roles: ['admin', 'manager', 'loan_officer'],
    children: [
      { href: '/loans', label: 'All Loans' },
      { href: '/loans/defaulters', label: 'Defaulters' },
      { href: '/loans/active-customers', label: 'Active Customers' },
      { href: '/loans/leads', label: 'Leads' },
      { href: '/loans/due-today', label: 'Due Today' },
    ]
  },
  { href: '/approvals', label: 'Approvals', icon: ShieldCheck, roles: ['manager', 'superadmin'] },
  { href: '/disbursements', label: 'Disbursements', icon: FileKey, roles: ['admin', 'superadmin'] },
  { href: '/borrowers', label: 'Borrowers', icon: Users, roles: ['admin', 'manager', 'loan_officer'] },
  { href: '/repayments', label: 'Repayments', icon: FileText, roles: ['admin', 'manager', 'loan_officer'] },
  { href: '/reports', label: 'Reports', icon: BarChart, roles: ['admin', 'manager'] },
  { href: '/users', label: 'Users', icon: UserCog, roles: ['admin', 'manager', 'superadmin'] },
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

const CollapsibleNavLink = ({ item }: { item: typeof allNavItems[1] }) => {
    const pathname = usePathname();
    const isLoansRoute = pathname.startsWith('/loans');
    const [isOpen, setIsOpen] = React.useState(isLoansRoute);

    React.useEffect(() => {
        if (isLoansRoute) {
            setIsOpen(true);
        }
    }, [pathname, isLoansRoute]);

    return (
        <Collapsible open={isOpen} onOpenChange={setIsOpen}>
            <CollapsibleTrigger asChild>
                <div className={cn(
                    'flex items-center justify-between w-full gap-3 rounded-lg px-3 py-2 text-muted-foreground transition-all hover:text-primary cursor-pointer',
                    isLoansRoute && 'text-primary'
                )}>
                    <div className="flex items-center gap-3">
                        <item.icon className="h-4 w-4" />
                        {item.label}
                    </div>
                    <ChevronDown className={cn("h-4 w-4 shrink-0 transition-transform duration-200", isOpen && "rotate-180")} />
                </div>
            </CollapsibleTrigger>
            <CollapsibleContent className="pt-1">
                <div className="pl-9 space-y-1">
                    {item.children.map(child => {
                        const otherChildren = item.children.filter(c => c.href !== '/loans');
                        const isOtherChildActive = otherChildren.some(c => pathname === c.href);
                        
                        let isActive = false;
                        if (child.href === '/loans') {
                            isActive = isLoansRoute && !isOtherChildActive;
                        } else {
                            isActive = pathname === child.href;
                        }

                        return (
                            <Link
                                key={child.href}
                                href={child.href}
                                className={cn(
                                    'block rounded-md px-3 py-2 text-muted-foreground transition-all hover:text-primary',
                                    isActive && 'bg-muted text-primary'
                                )}
                            >
                                {child.label}
                            </Link>
                        )
                    })}
                </div>
            </CollapsibleContent>
        </Collapsible>
    )
}

function SidebarNav() {
  const { userRole } = useUserProfile();

  const visibleNavItems = React.useMemo(() => {
    if (!userRole) return [];
    if (userRole.id === 'superadmin') return allNavItems;
    return allNavItems.filter(item => item.roles.includes(userRole.id));
  }, [userRole]);


  return (
    <nav className="grid items-start px-2 text-sm font-medium lg:px-4">
      {visibleNavItems.map((item) => {
          if ('children' in item && item.children) {
              return <CollapsibleNavLink key={item.label} item={item as typeof allNavItems[1]} />
          }
          return <NavLink key={(item as any).href} {...(item as any)} />
      })}
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
    return transformImageUrl(organization?.logoUrl);
  }, [organization]);


  return (
    <>
      <header className="flex h-24 items-center gap-4 border-b bg-background px-4 lg:px-6">
        <Sheet>
          <SheetTrigger asChild>
            <Button variant="outline" size="icon" className="shrink-0 md:hidden">
              <Menu className="h-5 w-5" />
              <span className="sr-only">Toggle navigation menu</span>
            </Button>
          </SheetTrigger>
          <SheetContent side="left" className="flex flex-col">
            <nav className="grid gap-2 text-lg font-medium">
              <div
                className="flex flex-col items-center gap-2 text-lg font-semibold mb-4 text-center"
              >
                <Link href="/dashboard" className="flex flex-col items-center gap-1">
                  {displayLogoUrl && <Image src={displayLogoUrl} alt={organization?.name || ''} width={196} height={196} className="rounded-md" style={{ height: 'auto' }} />}
                  <span className="font-headline text-xl">{organization?.name || ''}</span>
                  {organization?.slogan && <p className="text-xs text-muted-foreground -mt-1 font-normal">{organization.slogan}</p>}
                </Link>
                {user?.email && <p className="text-xs text-muted-foreground">{user.email}</p>}
              </div>
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
  const { organization, user } = useUserProfile();

  const displayLogoUrl = React.useMemo(() => {
    return transformImageUrl(organization?.logoUrl);
  }, [organization]);

  return (
    <div className="grid min-h-screen w-full md:grid-cols-[220px_1fr] lg:grid-cols-[280px_1fr]">
      <div className="hidden border-r bg-muted/40 md:block">
        <div className="flex h-full max-h-screen flex-col gap-2">
          <div className="flex flex-col items-center justify-center gap-2 border-b p-6">
            <Link href="/dashboard" className="flex flex-col items-center gap-1 font-semibold text-center">
              {displayLogoUrl && <Image src={displayLogoUrl} alt={organization?.name || ''} width={196} height={196} className="rounded-md" style={{ height: 'auto' }} />}
              <span className="font-headline text-xl">{organization?.name || ''}</span>
              {organization?.slogan && <p className="text-xs text-muted-foreground -mt-1 font-normal">{organization.slogan}</p>}
            </Link>
            {user?.email && <p className="text-xs text-muted-foreground">{user.email}</p>}
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
        <AppFooter />
      </div>
    </div>
  );
}
