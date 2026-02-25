import { useGetAllPublishedPosts } from '../hooks/useQueries';
import PostCard from '../components/PostCard';
import { Loader2, Copy, Check } from 'lucide-react';
import { useInternetIdentity } from '../hooks/useInternetIdentity';
import { useState } from 'react';

export default function HomePage() {
  const { data: posts, isLoading, error } = useGetAllPublishedPosts();
  const { identity } = useInternetIdentity();
  const [copied, setCopied] = useState(false);

  const isAuthenticated = !!identity && !identity.getPrincipal().isAnonymous();
  const principalId = isAuthenticated ? identity.getPrincipal().toString() : null;

  const handleCopy = () => {
    if (principalId) {
      navigator.clipboard.writeText(principalId);
      setCopied(true);
      setTimeout(() => setCopied(false), 2000);
    }
  };

  if (isLoading) {
    return (
      <div className="container max-w-5xl mx-auto px-6 py-16">
        <div className="flex items-center justify-center py-20">
          <Loader2 className="h-8 w-8 animate-spin text-primary" />
        </div>
      </div>
    );
  }

  if (error) {
    return (
      <div className="container max-w-5xl mx-auto px-6 py-16">
        <div className="text-center py-20">
          <p className="text-destructive">Kunde inte ladda inlägg. Försök igen senare.</p>
        </div>
      </div>
    );
  }

  const sortedPosts = posts ? [...posts].sort((a, b) => Number(b.createdAt - a.createdAt)) : [];

  return (
    <div className="container max-w-5xl mx-auto px-6 py-16">
      {/* Debug: Principal ID display — visible only when logged in */}
      {principalId && (
        <div className="mb-8 p-4 rounded-lg border border-border bg-muted/40 flex flex-col sm:flex-row sm:items-center gap-3">
          <div className="flex-1 min-w-0">
            <p className="text-xs font-semibold text-muted-foreground uppercase tracking-wider mb-1">
              Ditt Principal ID (för admin-konfiguration)
            </p>
            <p className="text-sm font-mono text-foreground break-all">{principalId}</p>
          </div>
          <button
            onClick={handleCopy}
            className="flex items-center gap-1.5 text-xs px-3 py-1.5 rounded-md border border-border bg-background hover:bg-muted transition-colors shrink-0 self-start sm:self-center"
          >
            {copied ? (
              <>
                <Check className="h-3.5 w-3.5 text-green-600" />
                Kopierat!
              </>
            ) : (
              <>
                <Copy className="h-3.5 w-3.5" />
                Kopiera
              </>
            )}
          </button>
        </div>
      )}

      <div className="mb-12 text-center">
        <h2 className="text-4xl md:text-5xl font-serif font-bold text-foreground mb-4 tracking-tight">
          Senaste berättelserna
        </h2>
        <p className="text-lg text-muted-foreground max-w-2xl mx-auto leading-relaxed">
          Tankar, idéer och berättelser från vår gemenskap av skribenter
        </p>
      </div>

      {sortedPosts.length === 0 ? (
        <div className="text-center py-20">
          <p className="text-muted-foreground text-lg">
            Inga publicerade inlägg ännu. Bli den första att dela din berättelse!
          </p>
        </div>
      ) : (
        <div className="grid gap-8 md:gap-10">
          {sortedPosts.map((post) => (
            <PostCard key={post.id.toString()} post={post} />
          ))}
        </div>
      )}
    </div>
  );
}
