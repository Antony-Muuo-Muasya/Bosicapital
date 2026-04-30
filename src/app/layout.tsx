import type { Metadata } from 'next';
import { Toaster } from '@/components/ui/toaster';
import './globals.css';
import { UserProfileProvider } from '@/providers/user-profile';
import { ThemeProvider } from '@/components/theme-provider';
import AuthProvider from '@/components/providers/session-provider';


export const metadata: Metadata = {
  title: 'Bosi Capital Limited',
  description: 'Your trusted lending partner',
};

export default function RootLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <html lang="en" suppressHydrationWarning>
      <head>
        <link rel="preconnect" href="https://fonts.googleapis.com" />
        <link rel="preconnect" href="https://fonts.gstatic.com" crossOrigin="anonymous" />
        <link
          href="https://fonts.googleapis.com/css2?family=Poppins:wght@400;500;600;700&family=PT+Sans:wght@400;700&display=swap"
          rel="stylesheet"
        />
        <script
          type="text/javascript"
          dangerouslySetInnerHTML={{
            __html: `
    (function (l) {
      if (l.search[1] === "/") {
        var decoded = l.search
          .slice(1)
          .split("&")
          .map(function (s) {
            return s.replace(/~and~/g, "&");
          })
          .join("?");
        window.history.replaceState(
          null,
          null,
          l.pathname.slice(0, -1) + decoded + l.hash
        );
      }
    })(window.location);
  `,
          }}
        />
      </head>
      <body className="font-body antialiased" suppressHydrationWarning>
        <ThemeProvider
          attribute="class"
          defaultTheme="system"
          enableSystem
          disableTransitionOnChange
        >
          <AuthProvider>
            <UserProfileProvider>
                {children}
                <Toaster />
            </UserProfileProvider>
          </AuthProvider>
        </ThemeProvider>
      </body>
    </html>
  );
}
