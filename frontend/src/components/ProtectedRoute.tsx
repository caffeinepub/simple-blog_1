import { type ReactNode } from 'react';
import { useNavigate } from '@tanstack/react-router';
import { useInternetIdentity } from '../hooks/useInternetIdentity';
import { useEffect } from 'react';

interface ProtectedRouteProps {
  children: ReactNode;
}

export default function ProtectedRoute({ children }: ProtectedRouteProps) {
  const { identity, isInitializing } = useInternetIdentity();
  const navigate = useNavigate();

  useEffect(() => {
    // Wait for initialization to complete
    if (isInitializing) {
      return;
    }

    // Check if user is authenticated
    const isAuthenticated = identity && !identity.getPrincipal().isAnonymous();

    if (!isAuthenticated) {
      navigate({ to: '/login' });
    }
  }, [identity, isInitializing, navigate]);

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

  // Show nothing while redirecting
  if (!identity || identity.getPrincipal().isAnonymous()) {
    return null;
  }

  return <>{children}</>;
}
