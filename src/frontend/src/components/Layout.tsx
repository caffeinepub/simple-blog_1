import { Button } from "@/components/ui/button";
import {
  Sheet,
  SheetContent,
  SheetHeader,
  SheetTitle,
  SheetTrigger,
} from "@/components/ui/sheet";
import { Link } from "@tanstack/react-router";
import {
  FileText,
  Home,
  LogIn,
  LogOut,
  Menu,
  PenSquare,
  ShieldCheck,
  UserCircle,
  Users,
  Users2,
} from "lucide-react";
import type { ReactNode } from "react";
import { useState } from "react";
import { ADMIN_PRINCIPAL_ID } from "../config/constants";
import { useInternetIdentity } from "../hooks/useInternetIdentity";
import NotificationBell from "./NotificationBell";

interface LayoutProps {
  children?: ReactNode;
}

export default function Layout({ children }: LayoutProps) {
  const { clear, identity, login } = useInternetIdentity();
  const isAuthenticated = !!identity && !identity.getPrincipal().isAnonymous();
  const principalStr = identity ? identity.getPrincipal().toString() : "";
  const isAdmin = isAuthenticated && principalStr === ADMIN_PRINCIPAL_ID;
  const [mobileOpen, setMobileOpen] = useState(false);

  const handleLogout = () => {
    clear();
    setMobileOpen(false);
  };

  const handleLogin = () => {
    login();
    setMobileOpen(false);
  };

  const closeMobile = () => setMobileOpen(false);

  return (
    <div className="min-h-screen flex flex-col relative">
      {/* Sticky Header */}
      <header
        className="border-b border-primary/10 bg-card/95 backdrop-blur-md sticky top-0 z-50"
        style={{
          boxShadow:
            "0 1px 0 0 oklch(0.72 0.18 72 / 0.08), 0 2px 12px -2px oklch(0.22 0.03 55 / 0.08)",
        }}
      >
        <div className="container mx-auto px-4">
          <div className="flex items-center justify-between h-14 md:h-16">
            {/* Logo — serif wordmark with amber underline accent */}
            <Link
              to="/"
              className="flex flex-col items-start hover:opacity-80 transition-opacity shrink-0 group"
              data-ocid="nav.home.link"
            >
              <span className="text-[1.45rem] font-black font-serif tracking-[0.18em] text-primary leading-none">
                HKLO
              </span>
              <span
                className="block h-[2px] w-full rounded-full bg-primary/70 mt-0.5 transition-all duration-300 group-hover:bg-primary"
                aria-hidden="true"
              />
            </Link>

            {/* Desktop Navigation */}
            <nav
              className="hidden lg:flex items-center gap-1"
              aria-label="Huvudnavigation"
            >
              {isAuthenticated ? (
                <>
                  <Button variant="ghost" size="sm" asChild>
                    <Link to="/" className="gap-1.5 text-sm">
                      <Home className="h-3.5 w-3.5" />
                      Hem
                    </Link>
                  </Button>
                  <Button variant="ghost" size="sm" asChild>
                    <Link
                      to="/create"
                      className="gap-1.5 text-sm"
                      data-ocid="nav.create.link"
                    >
                      <PenSquare className="h-3.5 w-3.5" />
                      Skapa inlägg
                    </Link>
                  </Button>
                  <Button variant="ghost" size="sm" asChild>
                    <Link
                      to="/drafts"
                      className="gap-1.5 text-sm"
                      data-ocid="nav.drafts.link"
                    >
                      <FileText className="h-3.5 w-3.5" />
                      Mina inlägg
                    </Link>
                  </Button>
                  <Button variant="ghost" size="sm" asChild>
                    <Link
                      to="/users"
                      className="gap-1.5 text-sm"
                      data-ocid="nav.users.link"
                    >
                      <Users className="h-3.5 w-3.5" />
                      Användare
                    </Link>
                  </Button>
                  <Button variant="ghost" size="sm" asChild>
                    <Link
                      to="/groups"
                      className="gap-1.5 text-sm"
                      data-ocid="nav.groups.link"
                    >
                      <Users2 className="h-3.5 w-3.5" />
                      Grupper
                    </Link>
                  </Button>
                  <Button variant="ghost" size="sm" asChild>
                    <Link
                      to="/profile"
                      className="gap-1.5 text-sm"
                      data-ocid="nav.profile.link"
                    >
                      <UserCircle className="h-3.5 w-3.5" />
                      Profil
                    </Link>
                  </Button>
                  <NotificationBell />
                  {isAdmin && (
                    <Button variant="ghost" size="sm" asChild>
                      <Link
                        to="/admin"
                        className="gap-1.5 text-sm"
                        data-ocid="nav.admin.link"
                      >
                        <ShieldCheck className="h-3.5 w-3.5" />
                        Admin
                      </Link>
                    </Button>
                  )}
                  {/* Separator before logout */}
                  <div
                    className="w-px h-4 bg-border/60 mx-1"
                    aria-hidden="true"
                  />
                  <Button
                    variant="outline"
                    size="sm"
                    onClick={handleLogout}
                    className="gap-1.5 text-sm"
                    data-ocid="nav.logout.button"
                  >
                    <LogOut className="h-3.5 w-3.5" />
                    Logga ut
                  </Button>
                </>
              ) : (
                /* Separator + prominent login CTA for guests */
                <div className="flex items-center gap-3">
                  <div className="w-px h-4 bg-border/60" aria-hidden="true" />
                  <Button
                    variant="default"
                    size="sm"
                    onClick={handleLogin}
                    className="gap-2 font-semibold px-4"
                    data-ocid="nav.login.button"
                  >
                    <LogIn className="h-4 w-4" />
                    Logga in
                  </Button>
                </div>
              )}
            </nav>

            {/* Mobile: Login button + Hamburger */}
            <div className="flex lg:hidden items-center gap-2">
              {!isAuthenticated && (
                <Button
                  variant="default"
                  size="sm"
                  onClick={handleLogin}
                  className="gap-1.5 text-sm font-semibold"
                  data-ocid="nav.mobile.login.button"
                >
                  <LogIn className="h-3.5 w-3.5" />
                  Logga in
                </Button>
              )}
              {isAuthenticated && <NotificationBell />}
              <Sheet open={mobileOpen} onOpenChange={setMobileOpen}>
                <SheetTrigger asChild>
                  <Button
                    variant="ghost"
                    size="icon"
                    aria-label="Öppna meny"
                    className="h-9 w-9"
                    data-ocid="nav.mobile.menu.button"
                  >
                    <Menu className="h-5 w-5" />
                  </Button>
                </SheetTrigger>
                <SheetContent
                  side="right"
                  className="w-72 bg-card/98 backdrop-blur-md"
                  data-ocid="nav.mobile.sheet"
                >
                  <SheetHeader className="mb-6 text-left">
                    <SheetTitle className="font-serif text-2xl tracking-widest text-primary">
                      HKLO
                    </SheetTitle>
                  </SheetHeader>
                  <nav
                    className="flex flex-col gap-1"
                    aria-label="Mobilnavigation"
                  >
                    {isAuthenticated ? (
                      <>
                        <Button
                          variant="ghost"
                          className="justify-start gap-3 h-11"
                          asChild
                          onClick={closeMobile}
                        >
                          <Link to="/" data-ocid="nav.mobile.home.link">
                            <Home className="h-4 w-4 text-primary" />
                            Hem
                          </Link>
                        </Button>
                        <Button
                          variant="ghost"
                          className="justify-start gap-3 h-11"
                          asChild
                          onClick={closeMobile}
                        >
                          <Link to="/create" data-ocid="nav.mobile.create.link">
                            <PenSquare className="h-4 w-4 text-primary" />
                            Skapa inlägg
                          </Link>
                        </Button>
                        <Button
                          variant="ghost"
                          className="justify-start gap-3 h-11"
                          asChild
                          onClick={closeMobile}
                        >
                          <Link to="/drafts" data-ocid="nav.mobile.drafts.link">
                            <FileText className="h-4 w-4 text-primary" />
                            Mina inlägg och utkast
                          </Link>
                        </Button>
                        <Button
                          variant="ghost"
                          className="justify-start gap-3 h-11"
                          asChild
                          onClick={closeMobile}
                        >
                          <Link to="/users" data-ocid="nav.mobile.users.link">
                            <Users className="h-4 w-4 text-primary" />
                            Användare
                          </Link>
                        </Button>
                        <Button
                          variant="ghost"
                          className="justify-start gap-3 h-11"
                          asChild
                          onClick={closeMobile}
                        >
                          <Link to="/groups" data-ocid="nav.mobile.groups.link">
                            <Users2 className="h-4 w-4 text-primary" />
                            Grupper
                          </Link>
                        </Button>
                        <Button
                          variant="ghost"
                          className="justify-start gap-3 h-11"
                          asChild
                          onClick={closeMobile}
                        >
                          <Link
                            to="/profile"
                            data-ocid="nav.mobile.profile.link"
                          >
                            <UserCircle className="h-4 w-4 text-primary" />
                            Profil
                          </Link>
                        </Button>
                        {isAdmin && (
                          <Button
                            variant="ghost"
                            className="justify-start gap-3 h-11"
                            asChild
                            onClick={closeMobile}
                          >
                            <Link to="/admin" data-ocid="nav.mobile.admin.link">
                              <ShieldCheck className="h-4 w-4 text-primary" />
                              Admin
                            </Link>
                          </Button>
                        )}
                        <div className="border-t border-border/40 my-2 pt-2">
                          <Button
                            variant="outline"
                            className="w-full justify-start gap-3 h-11"
                            onClick={handleLogout}
                            data-ocid="nav.mobile.logout.button"
                          >
                            <LogOut className="h-4 w-4" />
                            Logga ut
                          </Button>
                        </div>
                      </>
                    ) : (
                      <Button
                        variant="default"
                        className="w-full justify-start gap-3 h-11 mt-2"
                        onClick={handleLogin}
                        data-ocid="nav.mobile.login.button"
                      >
                        <LogIn className="h-4 w-4" />
                        Logga in
                      </Button>
                    )}
                  </nav>
                </SheetContent>
              </Sheet>
            </div>
          </div>
        </div>
      </header>

      {/* Main Content */}
      <main className="flex-1 bg-background relative z-10">{children}</main>

      {/* Footer */}
      <footer className="border-t border-primary/10 bg-card/90 backdrop-blur-md py-8 mt-12 relative z-10">
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
