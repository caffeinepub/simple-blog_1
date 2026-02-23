import { useEffect } from 'react';
import { useNavigate } from '@tanstack/react-router';
import { useInternetIdentity } from '../hooks/useInternetIdentity';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { BookOpen, LogIn, ExternalLink } from 'lucide-react';

export default function LoginPage() {
  const { login, identity, isLoggingIn, isInitializing } = useInternetIdentity();
  const navigate = useNavigate();

  // Redirect to home if already authenticated
  useEffect(() => {
    if (!isInitializing && identity && !identity.getPrincipal().isAnonymous()) {
      navigate({ to: '/' });
    }
  }, [identity, isInitializing, navigate]);

  const handleLogin = async () => {
    try {
      await login();
    } catch (error) {
      console.error('Login failed:', error);
    }
  };

  // Show loading state while initializing
  if (isInitializing) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-background">
        <div className="text-center">
          <div className="animate-spin text-4xl mb-4">⏳</div>
          <p className="text-muted-foreground">Laddar...</p>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen flex flex-col items-center justify-center bg-background px-4">
      <div className="w-full max-w-md space-y-8">
        {/* Logo and Title */}
        <div className="flex flex-col items-center gap-4">
          <div className="flex items-center gap-3">
            <BookOpen className="h-12 w-12 text-primary" />
            <h1 className="text-5xl font-serif font-bold text-foreground tracking-tight">
              HKLO
            </h1>
          </div>
          <p className="text-muted-foreground text-center text-lg">
            Dela dina berättelser med världen
          </p>
        </div>

        {/* Login Card */}
        <Card className="border-border/50 shadow-lg">
          <CardHeader className="space-y-2">
            <CardTitle className="text-2xl font-serif text-center">
              Välkommen
            </CardTitle>
            <CardDescription className="text-center">
              Logga in för att skapa och dela dina inlägg
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
                  Loggar in...
                </>
              ) : (
                <>
                  <LogIn className="h-5 w-5" />
                  Logga in med Internet Identity
                </>
              )}
            </Button>

            <div className="relative">
              <div className="absolute inset-0 flex items-center">
                <span className="w-full border-t border-border" />
              </div>
              <div className="relative flex justify-center text-xs uppercase">
                <span className="bg-card px-2 text-muted-foreground">
                  Har du inget konto?
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
              Skapa Internet Identity
            </a>

            <p className="text-xs text-muted-foreground text-center leading-relaxed">
              Internet Identity är en säker och anonym autentiseringstjänst som skyddar din integritet.
            </p>
          </CardContent>
        </Card>

        {/* Footer */}
        <div className="text-center text-sm text-muted-foreground">
          <p>
            Byggd med ❤️ med hjälp av{' '}
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
    </div>
  );
}
