import { ThumbsDown, ThumbsUp } from "lucide-react";
import { useCallback, useEffect, useRef, useState } from "react";
import { toast } from "sonner";
import type { Post } from "../backend";
import { useInternetIdentity } from "../hooks/useInternetIdentity";
import {
  useDislikePost,
  useGetPostReactions,
  useLikePost,
} from "../hooks/useQueries";

interface Particle {
  x: number;
  y: number;
  vx: number;
  vy: number;
  size: number;
  color: string;
  alpha: number;
  rotation: number;
  rotationSpeed: number;
  shape: "square" | "triangle" | "circle" | "star";
  life: number;
  maxLife: number;
}

interface ReactionButtonsProps {
  post: Post;
}

const LIKE_COLORS = ["#f59e0b", "#fbbf24", "#fcd34d", "#f97316", "#fb923c"];
const DISLIKE_COLORS = ["#6366f1", "#818cf8", "#a5b4fc", "#8b5cf6", "#c4b5fd"];

function drawShape(
  ctx: CanvasRenderingContext2D,
  shape: Particle["shape"],
  x: number,
  y: number,
  size: number,
  rotation: number,
) {
  ctx.save();
  ctx.translate(x, y);
  ctx.rotate(rotation);
  ctx.beginPath();
  if (shape === "square") {
    ctx.rect(-size / 2, -size / 2, size, size);
  } else if (shape === "circle") {
    ctx.arc(0, 0, size / 2, 0, Math.PI * 2);
  } else if (shape === "triangle") {
    ctx.moveTo(0, -size / 2);
    ctx.lineTo(size / 2, size / 2);
    ctx.lineTo(-size / 2, size / 2);
    ctx.closePath();
  } else if (shape === "star") {
    for (let i = 0; i < 5; i++) {
      const angle = (i * 4 * Math.PI) / 5 - Math.PI / 2;
      const r = i % 2 === 0 ? size / 2 : size / 4;
      if (i === 0) ctx.moveTo(Math.cos(angle) * r, Math.sin(angle) * r);
      else ctx.lineTo(Math.cos(angle) * r, Math.sin(angle) * r);
    }
    ctx.closePath();
  }
  ctx.restore();
}

function createParticles(
  originX: number,
  originY: number,
  colors: string[],
  count = 22,
): Particle[] {
  const shapes: Particle["shape"][] = ["square", "triangle", "circle", "star"];
  return Array.from({ length: count }, () => {
    const angle = Math.random() * Math.PI * 2;
    const speed = 2.5 + Math.random() * 5;
    const maxLife = 45 + Math.random() * 30;
    return {
      x: originX,
      y: originY,
      vx: Math.cos(angle) * speed,
      vy: Math.sin(angle) * speed - 2,
      size: 5 + Math.random() * 8,
      color: colors[Math.floor(Math.random() * colors.length)],
      alpha: 1,
      rotation: Math.random() * Math.PI * 2,
      rotationSpeed: (Math.random() - 0.5) * 0.3,
      shape: shapes[Math.floor(Math.random() * shapes.length)],
      life: 0,
      maxLife,
    };
  });
}

function ParticleCanvas({
  particles,
  onDone,
}: {
  particles: Particle[];
  onDone: () => void;
}) {
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const rafRef = useRef<number>(0);
  const particlesRef = useRef<Particle[]>(particles);

  useEffect(() => {
    particlesRef.current = particles.map((p) => ({ ...p }));
    const canvas = canvasRef.current;
    if (!canvas) return;
    const ctx = canvas.getContext("2d");
    if (!ctx) return;

    const animate = () => {
      ctx.clearRect(0, 0, canvas.width, canvas.height);
      let alive = false;

      for (const p of particlesRef.current) {
        p.life++;
        if (p.life > p.maxLife) continue;
        alive = true;

        p.x += p.vx;
        p.y += p.vy;
        p.vy += 0.18; // gravity
        p.vx *= 0.97;
        p.rotation += p.rotationSpeed;
        p.alpha = 1 - p.life / p.maxLife;

        ctx.globalAlpha = p.alpha;
        ctx.fillStyle = p.color;
        drawShape(ctx, p.shape, p.x, p.y, p.size, p.rotation);
        ctx.fill();
      }

      ctx.globalAlpha = 1;

      if (alive) {
        rafRef.current = requestAnimationFrame(animate);
      } else {
        onDone();
      }
    };

    rafRef.current = requestAnimationFrame(animate);
    return () => cancelAnimationFrame(rafRef.current);
  }, [particles, onDone]);

  return (
    <canvas
      ref={canvasRef}
      width={200}
      height={160}
      className="pointer-events-none absolute"
      style={{ left: "-80px", top: "-80px", zIndex: 50 }}
    />
  );
}

export default function ReactionButtons({ post }: ReactionButtonsProps) {
  const { identity, login, isLoggingIn } = useInternetIdentity();
  const isAuthenticated = !!identity && !identity.getPrincipal().isAnonymous();

  const { data: reactions, isLoading: reactionsLoading } = useGetPostReactions(
    post.id,
  );
  const likeMutation = useLikePost();
  const dislikeMutation = useDislikePost();

  const [likeParticles, setLikeParticles] = useState<Particle[] | null>(null);
  const [dislikeParticles, setDislikeParticles] = useState<Particle[] | null>(
    null,
  );

  const likeButtonRef = useRef<HTMLButtonElement>(null);
  const dislikeButtonRef = useRef<HTMLButtonElement>(null);

  // Determine current user's reaction from post data
  const userPrincipal = identity?.getPrincipal().toString();
  const hasLiked =
    isAuthenticated && post.likedBy.some((p) => p.toString() === userPrincipal);
  const hasDisliked =
    isAuthenticated &&
    post.dislikedBy.some((p) => p.toString() === userPrincipal);

  const likeCount = reactions ? Number(reactions.likes) : post.likedBy.length;
  const dislikeCount = reactions
    ? Number(reactions.dislikes)
    : post.dislikedBy.length;

  const spawnParticles = useCallback((type: "like" | "dislike") => {
    const ref = type === "like" ? likeButtonRef : dislikeButtonRef;
    const colors = type === "like" ? LIKE_COLORS : DISLIKE_COLORS;
    const btn = ref.current;
    if (!btn) return;
    const rect = btn.getBoundingClientRect();
    const cx = rect.width / 2;
    const cy = rect.height / 2;
    const particles = createParticles(cx, cy, colors);
    if (type === "like") {
      setLikeParticles(particles);
    } else {
      setDislikeParticles(particles);
    }
  }, []);

  const handleLike = async (e: React.MouseEvent) => {
    e.preventDefault();
    e.stopPropagation();
    if (!isAuthenticated) {
      toast.info("Logga in för att gilla inlägg");
      try {
        await login();
      } catch {
        /* ignore */
      }
      return;
    }
    spawnParticles("like");
    try {
      await likeMutation.mutateAsync(post.id);
    } catch {
      toast.error("Kunde inte gilla inlägget. Försök igen.");
    }
  };

  const handleDislike = async (e: React.MouseEvent) => {
    e.preventDefault();
    e.stopPropagation();
    if (!isAuthenticated) {
      toast.info("Logga in för att ogilla inlägg");
      try {
        await login();
      } catch {
        /* ignore */
      }
      return;
    }
    spawnParticles("dislike");
    try {
      await dislikeMutation.mutateAsync(post.id);
    } catch {
      toast.error("Kunde inte ogilla inlägget. Försök igen.");
    }
  };

  const isLiking = likeMutation.isPending;
  const isDisliking = dislikeMutation.isPending;

  return (
    <div className="flex items-center gap-3">
      {/* Like button */}
      <div className="relative">
        {likeParticles && (
          <ParticleCanvas
            particles={likeParticles}
            onDone={() => setLikeParticles(null)}
          />
        )}
        <button
          type="button"
          ref={likeButtonRef}
          onClick={handleLike}
          disabled={isLiking || isLoggingIn}
          aria-label="Gilla"
          className={`
            relative flex items-center gap-1.5 px-3 py-1.5 rounded-full text-sm font-medium
            border transition-all duration-200 select-none
            ${
              hasLiked
                ? "bg-amber-100 border-amber-300 text-amber-700 dark:bg-amber-900/40 dark:border-amber-600 dark:text-amber-300 shadow-sm"
                : "bg-card border-border/50 text-muted-foreground hover:border-amber-300 hover:text-amber-600 hover:bg-amber-50 dark:hover:bg-amber-950/20"
            }
            disabled:opacity-60 disabled:cursor-not-allowed
          `}
        >
          <ThumbsUp
            className={`h-4 w-4 transition-transform duration-150 ${isLiking ? "scale-90" : hasLiked ? "scale-110" : ""}`}
            fill={hasLiked ? "currentColor" : "none"}
          />
          <span
            className={`tabular-nums transition-all duration-200 ${reactionsLoading ? "opacity-40" : ""}`}
          >
            {likeCount}
          </span>
        </button>
      </div>

      {/* Dislike button */}
      <div className="relative">
        {dislikeParticles && (
          <ParticleCanvas
            particles={dislikeParticles}
            onDone={() => setDislikeParticles(null)}
          />
        )}
        <button
          type="button"
          ref={dislikeButtonRef}
          onClick={handleDislike}
          disabled={isDisliking || isLoggingIn}
          aria-label="Ogilla"
          className={`
            relative flex items-center gap-1.5 px-3 py-1.5 rounded-full text-sm font-medium
            border transition-all duration-200 select-none
            ${
              hasDisliked
                ? "bg-indigo-100 border-indigo-300 text-indigo-700 dark:bg-indigo-900/40 dark:border-indigo-600 dark:text-indigo-300 shadow-sm"
                : "bg-card border-border/50 text-muted-foreground hover:border-indigo-300 hover:text-indigo-600 hover:bg-indigo-50 dark:hover:bg-indigo-950/20"
            }
            disabled:opacity-60 disabled:cursor-not-allowed
          `}
        >
          <ThumbsDown
            className={`h-4 w-4 transition-transform duration-150 ${isDisliking ? "scale-90" : hasDisliked ? "scale-110" : ""}`}
            fill={hasDisliked ? "currentColor" : "none"}
          />
          <span
            className={`tabular-nums transition-all duration-200 ${reactionsLoading ? "opacity-40" : ""}`}
          >
            {dislikeCount}
          </span>
        </button>
      </div>

      {!isAuthenticated && (
        <span className="text-xs text-muted-foreground italic">
          Logga in för att reagera
        </span>
      )}
    </div>
  );
}
