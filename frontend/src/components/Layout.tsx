import { type ReactNode } from 'react';
import { Link, Outlet } from '@tanstack/react-router';
import { useInternetIdentity } from '../hooks/useInternetIdentity';
import { Button } from '@/components/ui/button';
import { BookOpen, LogOut, Home, PenSquare, ShieldCheck } from 'lucide-react';
import { ADMIN_PRINCIPAL_ID } from '../config/constants';

interface LayoutProps {
  children?: ReactNode;
}

export default function Layout({ children }: LayoutProps) {
  const { clear, identity } = useInternetIdentity();
  const isAuthenticated = !!identity && !identity.getPrincipal().isAnonymous();
  const isAdmin =
    isAuthenticated &&
    ADMIN_PRINCIPAL_ID !== '' &&
    identity.getPrincipal().toString() === ADMIN_PRINCIPAL_ID;

  const handleLogout = () => {
    clear();
  };

  return (
    <div className="min-h-screen flex flex-col bg-background">
      {/* Header */}
      <header className="border-b border-border bg-card/50 backdrop-blur-sm sticky top-0 z-50">
        <div className="container mx-auto px-4 py-4">
          <div className="flex items-center justify-between">
            {/* Logo */}
            <Link to="/" className="flex items-center gap-3 hover:opacity-80 transition-opacity">
              <BookOpen className="h-8 w-8 text-primary" />
              <h1 className="text-3xl font-serif font-bold text-foreground tracking-tight">
                HKLO
              </h1>
            </Link>

            {/* Navigation */}
            <nav className="flex items-center gap-2">
              <Button variant="ghost" asChild>
                <Link to="/" className="gap-2">
                  <Home className="h-4 w-4" />
                  Hem
                </Link>
              </Button>
              <Button variant="ghost" asChild>
                <Link to="/create" className="gap-2">
                  <PenSquare className="h-4 w-4" />
                  Skapa inlägg
                </Link>
              </Button>
              {isAdmin && (
                <Button variant="ghost" asChild>
                  <Link to="/admin" className="gap-2">
                    <ShieldCheck className="h-4 w-4" />
                    Admin
                  </Link>
                </Button>
              )}
              <Button variant="outline" onClick={handleLogout} className="gap-2">
                <LogOut className="h-4 w-4" />
                Logga ut
              </Button>
            </nav>
          </div>
        </div>
      </header>

      {/* Main Content */}
      <main className="flex-1">
        {children || <Outlet />}
      </main>

      {/* Footer */}
      <footer className="border-t border-border bg-card/30 py-8 mt-12">
        <div className="container mx-auto px-4">
          <div className="text-center text-sm text-muted-foreground">
            <p>
              © {new Date().getFullYear()} HKLO. Byggd med ❤️ med hjälp av{' '}
              <a
                href={`https://caffeine.ai/?utm_source=Caffeine-footer&utm_medium=referral&utm_content=${encodeURIComponent(
                  typeof window !== 'undefined' ? window.location.hostname : 'hklo'
                )}`}
                target="_blank"
                rel="noopener noreferrer"
                className="text-foreground hover:text-primary transition-colors underline underline-offset-4"
              >
                caffeine.ai
              </a>
            </p>
          </div>
        </div>
      </footer>
    </div>
  );
}
