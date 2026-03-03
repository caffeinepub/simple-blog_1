/**
 * Custom hook for sharing content.
 * Tries native Web Share API first; returns isSupported=false when fallback modal is needed.
 */
export function useShare() {
  const isSupported = typeof navigator !== 'undefined' && !!navigator.share;

  /**
   * Attempt native share. Returns true if native share was used, false if fallback is needed.
   */
  const share = async (title: string, url: string): Promise<boolean> => {
    if (isSupported) {
      try {
        await navigator.share({ title, url });
        return true;
      } catch (err: unknown) {
        // User cancelled or share failed – fall through to modal
        if (err instanceof Error && err.name === 'AbortError') {
          return true; // User cancelled, no need for fallback
        }
        return false;
      }
    }
    return false;
  };

  return { share, isSupported };
}
