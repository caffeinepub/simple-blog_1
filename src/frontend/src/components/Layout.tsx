import { Link, Outlet, useNavigate } from '@tanstack/react-router';
import { PenSquare, BookOpen } from 'lucide-react';
import { Button } from '@/components/ui/button';

export default function Layout() {
  const navigate = useNavigate();
  const currentYear = new Date().getFullYear();
  const appIdentifier = encodeURIComponent(
    typeof window !== 'undefined' ? window.location.hostname : 'simple-blog'
  );

  return (
    <div className="min-h-screen flex flex-col bg-background">
      <header className="border-b border-border/40 bg-background/95 backdrop-blur supports-[backdrop-filter]:bg-background/60 sticky top-0 z-50">
        <div className="container max-w-5xl mx-auto px-6 py-6">
          <div className="flex items-center justify-between">
            <Link to="/" className="flex items-center gap-2 group">
              <BookOpen className="h-7 w-7 text-primary transition-transform group-hover:scale-110" />
              <h1 className="text-2xl font-serif font-bold text-foreground tracking-tight">
                The Journal
              </h1>
            </Link>
            <nav className="flex items-center gap-4">
              <Button
                variant="ghost"
                size="sm"
                onClick={() => navigate({ to: '/' })}
                className="text-muted-foreground hover:text-foreground"
              >
                Home
              </Button>
              <Button
                variant="default"
                size="sm"
                onClick={() => navigate({ to: '/create' })}
                className="gap-2"
              >
                <PenSquare className="h-4 w-4" />
                Write
              </Button>
            </nav>
          </div>
        </div>
      </header>

      <main className="flex-1">
        <Outlet />
      </main>

      <footer className="border-t border-border/40 bg-muted/30 mt-16">
        <div className="container max-w-5xl mx-auto px-6 py-8">
          <div className="flex flex-col items-center justify-center gap-2 text-sm text-muted-foreground">
            <p>
              © {currentYear} The Journal. Built with ❤️ using{' '}
              <a
                href={`https://caffeine.ai/?utm_source=Caffeine-footer&utm_medium=referral&utm_content=${appIdentifier}`}
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
