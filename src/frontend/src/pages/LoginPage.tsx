import { Button } from "@/components/ui/button";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { useNavigate } from "@tanstack/react-router";
import { BookOpen, ExternalLink, LogIn } from "lucide-react";
import { useEffect } from "react";
import LanguageSelector from "../components/LanguageSelector";
import { useLanguage } from "../contexts/LanguageContext";
import { useInternetIdentity } from "../hooks/useInternetIdentity";

export default function LoginPage() {
  const { login, identity, isLoggingIn, isInitializing } =
    useInternetIdentity();
  const navigate = useNavigate();
  const { t } = useLanguage();

  // Redirect to home if already authenticated
  useEffect(() => {
    if (!isInitializing && identity && !identity.getPrincipal().isAnonymous()) {
      navigate({ to: "/" });
    }
  }, [identity, isInitializing, navigate]);

  const handleLogin = async () => {
    try {
      await login();
    } catch (error) {
      console.error("Login failed:", error);
    }
  };

  // Show loading state while initializing
  if (isInitializing) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-background">
        <div className="text-center">
          <div className="animate-spin text-4xl mb-4">⏳</div>
          <p className="text-muted-foreground">{t.loginInitializing}</p>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen flex flex-col items-center justify-center bg-background px-4">
      <div className="w-full max-w-md space-y-8">
        {/* Language Selector — above HKLO heading */}
        <div className="flex justify-center">
          <LanguageSelector compact />
        </div>

        {/* Logo and Title */}
        <div className="flex flex-col items-center gap-4">
          <div className="flex items-center gap-3">
            <BookOpen className="h-12 w-12 text-primary" />
            <h1 className="text-5xl font-serif font-bold text-foreground tracking-tight">
              HKLO
            </h1>
          </div>
          <p className="text-muted-foreground text-center text-lg">
            {t.loginSubtitle}
          </p>
        </div>

        {/* Login Card */}
        <Card className="border-border/50 shadow-lg">
          <CardHeader className="space-y-2">
            <CardTitle className="text-2xl font-serif text-center">
              {t.loginWelcome}
            </CardTitle>
            <CardDescription className="text-center">
              {t.loginDescription}
            </CardDescription>
          </CardHeader>
          <CardContent className="space-y-6">
            <Button
              onClick={handleLogin}
              disabled={isLoggingIn || isInitializing}
              className="w-full gap-2 h-12 text-base"
              size="lg"
            >
              {isLoggingIn ? (
                <>
                  <span className="animate-spin">⏳</span>
                  {t.loginLoading}
                </>
              ) : (
                <>
                  <LogIn className="h-5 w-5" />
                  {t.loginButton}
                </>
              )}
            </Button>

            <div className="relative">
              <div className="absolute inset-0 flex items-center">
                <span className="w-full border-t border-border" />
              </div>
              <div className="relative flex justify-center text-xs uppercase">
                <span className="bg-card px-2 text-muted-foreground">
                  {t.loginNoAccount}
                </span>
              </div>
            </div>

            <a
              href="https://identity.ic0.app"
              target="_blank"
              rel="noopener noreferrer"
              className="flex items-center justify-center gap-2 w-full py-3 px-4 rounded-md border border-border bg-background hover:bg-accent hover:text-accent-foreground transition-colors text-sm font-medium"
            >
              <ExternalLink className="h-4 w-4" />
              {t.loginCreateIdentity}
            </a>

            <p className="text-xs text-muted-foreground text-center leading-relaxed">
              {t.loginPrivacyNote}
            </p>
          </CardContent>
        </Card>

        {/* Footer */}
        <div className="text-center text-sm text-muted-foreground">
          <p>
            Byggd med ❤️ med hjälp av{" "}
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
    </div>
  );
}
