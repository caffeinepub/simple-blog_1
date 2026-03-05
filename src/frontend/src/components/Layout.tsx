import { Button } from "@/components/ui/button";
import { Link, Outlet } from "@tanstack/react-router";
import {
  FileText,
  Home,
  LogIn,
  LogOut,
  PenSquare,
  ShieldCheck,
  UserCircle,
  Users,
  Users2,
} from "lucide-react";
import type { ReactNode } from "react";
import { ADMIN_PRINCIPAL_ID } from "../config/constants";
import { useInternetIdentity } from "../hooks/useInternetIdentity";
import NotificationBell from "./NotificationBell";

interface LayoutProps {
  children?: ReactNode;
}

export default function Layout({ children }: LayoutProps) {
  const { clear, identity } = useInternetIdentity();
  const isAuthenticated = !!identity && !identity.getPrincipal().isAnonymous();
  const isAdmin =
    isAuthenticated &&
    identity.getPrincipal().toString() === ADMIN_PRINCIPAL_ID;

  const handleLogout = () => {
    clear();
  };

  return (
    <div className="min-h-screen flex flex-col relative">
      {/* Header */}
      <header className="border-b border-border/60 bg-card/80 backdrop-blur-md sticky top-0 z-50 shadow-sm relative">
        <div className="container mx-auto px-4 py-4">
          <div className="flex items-center justify-between">
            {/* Logo - text only */}
            <Link
              to="/"
              className="flex items-center hover:opacity-80 transition-opacity"
            >
              <span className="text-xl font-bold font-serif tracking-wide">
                HKLO
              </span>
            </Link>

            {/* Navigation */}
            <nav className="flex items-center gap-2">
              {isAuthenticated ? (
                <>
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
                  <Button variant="ghost" asChild>
                    <Link to="/drafts" className="gap-2">
                      <FileText className="h-4 w-4" />
                      Mina inlägg och utkast
                    </Link>
                  </Button>
                  <Button variant="ghost" asChild>
                    <Link
                      to="/users"
                      className="gap-2"
                      data-ocid="nav.users.link"
                    >
                      <Users className="h-4 w-4" />
                      Användare
                    </Link>
                  </Button>
                  <Button variant="ghost" asChild>
                    <Link
                      to="/groups"
                      className="gap-2"
                      data-ocid="nav.groups.link"
                    >
                      <Users2 className="h-4 w-4" />
                      Grupper
                    </Link>
                  </Button>
                  <Button variant="ghost" asChild>
                    <Link to="/profile" className="gap-2">
                      <UserCircle className="h-4 w-4" />
                      Profil
                    </Link>
                  </Button>
                  <NotificationBell />
                  {isAdmin && (
                    <Button variant="ghost" asChild>
                      <Link to="/admin" className="gap-2">
                        <ShieldCheck className="h-4 w-4" />
                        Admin
                      </Link>
                    </Button>
                  )}
                  <Button
                    variant="outline"
                    onClick={handleLogout}
                    className="gap-2"
                  >
                    <LogOut className="h-4 w-4" />
                    Logga ut
                  </Button>
                </>
              ) : (
                <Button variant="default" asChild>
                  <Link to="/login" className="gap-2">
                    <LogIn className="h-4 w-4" />
                    Logga in
                  </Link>
                </Button>
              )}
            </nav>
          </div>
        </div>
      </header>

      {/* Main Content */}
      <main className="flex-1 bg-background/85 backdrop-blur-sm relative z-10">
        {children || <Outlet />}
      </main>

      {/* Footer */}
      <footer className="border-t border-border/60 bg-card/80 backdrop-blur-md py-8 mt-12 relative z-10">
        <div className="container mx-auto px-4">
          <div className="text-center text-sm text-muted-foreground">
            <p>
              © {new Date().getFullYear()} HKLO. Byggd med ❤️ med hjälp av{" "}
              <a
                href={`https://caffeine.ai/?utm_source=Caffeine-footer&utm_medium=referral&utm_content=${encodeURIComponent(
                  typeof window !== "undefined"
                    ? window.location.hostname
                    : "hklo",
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
