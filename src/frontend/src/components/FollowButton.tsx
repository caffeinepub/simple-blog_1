import { Button } from "@/components/ui/button";
import {
  Popover,
  PopoverContent,
  PopoverTrigger,
} from "@/components/ui/popover";
import type { Principal } from "@dfinity/principal";
import { Check, Loader2, UserMinus, UserPlus } from "lucide-react";
import { useState } from "react";
import { toast } from "sonner";
import { useInternetIdentity } from "../hooks/useInternetIdentity";
import {
  useFollowUser,
  useIsFollowing,
  useUnfollowUser,
} from "../hooks/useQueries";

interface FollowButtonProps {
  targetPrincipal: Principal;
  targetAlias: string;
}

export default function FollowButton({
  targetPrincipal,
  targetAlias,
}: FollowButtonProps) {
  const { identity } = useInternetIdentity();
  const isAuthenticated = !!identity && !identity.getPrincipal().isAnonymous();
  const currentPrincipal = identity?.getPrincipal().toString();

  // Hide button if viewing own post
  if (!isAuthenticated || currentPrincipal === targetPrincipal.toString()) {
    return null;
  }

  return (
    <FollowButtonInner
      targetPrincipal={targetPrincipal}
      targetAlias={targetAlias}
    />
  );
}

function FollowButtonInner({
  targetPrincipal,
  targetAlias,
}: FollowButtonProps) {
  const { data: isFollowing, isLoading } = useIsFollowing(targetPrincipal);
  const followMutation = useFollowUser();
  const unfollowMutation = useUnfollowUser();
  const [confirmOpen, setConfirmOpen] = useState(false);

  const isPending = followMutation.isPending || unfollowMutation.isPending;

  const handleFollow = async (e: React.MouseEvent) => {
    e.preventDefault();
    e.stopPropagation();
    try {
      await followMutation.mutateAsync(targetPrincipal);
      toast.success(`Du följer nu ${targetAlias}`);
    } catch {
      toast.error("Kunde inte följa användaren. Försök igen.");
    }
  };

  const handleUnfollow = async (e: React.MouseEvent) => {
    e.preventDefault();
    e.stopPropagation();
    setConfirmOpen(false);
    try {
      await unfollowMutation.mutateAsync(targetPrincipal);
      toast.success(`Du följer inte längre ${targetAlias}`);
    } catch {
      toast.error("Kunde inte sluta följa. Försök igen.");
    }
  };

  if (isLoading) {
    return (
      <span className="inline-flex items-center px-2 py-1 text-xs text-muted-foreground">
        <Loader2 className="h-3 w-3 animate-spin" />
      </span>
    );
  }

  if (isFollowing) {
    return (
      <Popover open={confirmOpen} onOpenChange={setConfirmOpen}>
        <PopoverTrigger asChild>
          <button
            type="button"
            onClick={(e) => {
              e.preventDefault();
              e.stopPropagation();
              setConfirmOpen(true);
            }}
            disabled={isPending}
            data-ocid="follow.toggle"
            className="inline-flex items-center gap-1 text-xs font-medium px-2.5 py-1 rounded-full border border-primary/30 bg-primary/10 text-primary hover:bg-destructive/10 hover:border-destructive/30 hover:text-destructive transition-all duration-200 disabled:opacity-50"
          >
            {isPending ? (
              <Loader2 className="h-3 w-3 animate-spin" />
            ) : (
              <Check className="h-3 w-3" />
            )}
            Följer
          </button>
        </PopoverTrigger>
        <PopoverContent
          className="w-auto p-3"
          side="top"
          align="center"
          data-ocid="follow.popover"
          onClick={(e) => e.stopPropagation()}
        >
          <div className="space-y-2">
            <p className="text-sm font-medium text-foreground">
              Sluta följa{" "}
              <span className="text-primary font-semibold">{targetAlias}</span>?
            </p>
            <div className="flex gap-2">
              <Button
                size="sm"
                variant="destructive"
                onClick={handleUnfollow}
                disabled={isPending}
                className="h-7 text-xs gap-1"
                data-ocid="follow.confirm_button"
              >
                <UserMinus className="h-3 w-3" />
                Sluta följa
              </Button>
              <Button
                size="sm"
                variant="outline"
                onClick={(e) => {
                  e.preventDefault();
                  e.stopPropagation();
                  setConfirmOpen(false);
                }}
                className="h-7 text-xs"
                data-ocid="follow.cancel_button"
              >
                Avbryt
              </Button>
            </div>
          </div>
        </PopoverContent>
      </Popover>
    );
  }

  return (
    <button
      type="button"
      onClick={handleFollow}
      disabled={isPending}
      data-ocid="follow.button"
      className="inline-flex items-center gap-1 text-xs font-medium px-2.5 py-1 rounded-full border border-border/50 bg-card text-muted-foreground hover:border-primary/40 hover:text-primary hover:bg-primary/5 transition-all duration-200 disabled:opacity-50"
    >
      {isPending ? (
        <Loader2 className="h-3 w-3 animate-spin" />
      ) : (
        <UserPlus className="h-3 w-3" />
      )}
      Följ
    </button>
  );
}
