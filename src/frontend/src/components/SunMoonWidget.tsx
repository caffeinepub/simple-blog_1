/**
 * SunMoonWidget
 *
 * Displays:
 *  - Left side: today's date + current solar phase (time of day)
 *  - Right side: current lunar phase with emoji + name
 *
 * All computed client-side — no external API needed.
 */

import { useEffect, useState } from "react";

// ─── Solar phase ─────────────────────────────────────────────────────────────

type SolarPhase = {
  emoji: string;
  label: string;
};

function getSolarPhase(hour: number): SolarPhase {
  if (hour >= 5 && hour < 7) return { emoji: "🌅", label: "Gryning" };
  if (hour >= 7 && hour < 12) return { emoji: "🌤️", label: "Förmiddag" };
  if (hour >= 12 && hour < 14) return { emoji: "☀️", label: "Middag" };
  if (hour >= 14 && hour < 17) return { emoji: "🌞", label: "Eftermiddag" };
  if (hour >= 17 && hour < 20) return { emoji: "🌇", label: "Kväll" };
  if (hour >= 20 && hour < 22) return { emoji: "🌆", label: "Skymning" };
  return { emoji: "🌙", label: "Natt" };
}

// ─── Lunar phase ──────────────────────────────────────────────────────────────

type LunarPhase = {
  emoji: string;
  label: string;
};

/**
 * Returns the approximate lunar phase for a given date.
 * Uses a known new-moon reference date and the average lunar cycle (~29.53 days).
 */
function getLunarPhase(date: Date): LunarPhase {
  // Known new moon: January 11, 2024 11:57 UTC
  const knownNewMoon = new Date("2024-01-11T11:57:00Z").getTime();
  const lunarCycleMs = 29.530588853 * 24 * 60 * 60 * 1000;

  const elapsed = date.getTime() - knownNewMoon;
  // Normalise to [0, 1)
  const cyclePos = ((elapsed % lunarCycleMs) + lunarCycleMs) % lunarCycleMs;
  const fraction = cyclePos / lunarCycleMs;

  if (fraction < 0.0625) return { emoji: "🌑", label: "Nymåne" };
  if (fraction < 0.1875) return { emoji: "🌒", label: "Tilltagande skära" };
  if (fraction < 0.3125) return { emoji: "🌓", label: "Första kvarteret" };
  if (fraction < 0.4375) return { emoji: "🌔", label: "Tilltagande gibbös" };
  if (fraction < 0.5625) return { emoji: "🌕", label: "Fullmåne" };
  if (fraction < 0.6875) return { emoji: "🌖", label: "Avtagande gibbös" };
  if (fraction < 0.8125) return { emoji: "🌗", label: "Sista kvarteret" };
  if (fraction < 0.9375) return { emoji: "🌘", label: "Avtagande skära" };
  return { emoji: "🌑", label: "Nymåne" };
}

// ─── Date formatting ──────────────────────────────────────────────────────────

function formatDate(date: Date): string {
  return date.toLocaleDateString("sv-SE", {
    weekday: "short",
    year: "numeric",
    month: "short",
    day: "numeric",
  });
}

// ─── Component ────────────────────────────────────────────────────────────────

interface SunMoonWidgetProps {
  /** When true, renders as a standalone section (no border-b, slightly larger) */
  standalone?: boolean;
}

export default function SunMoonWidget({
  standalone = false,
}: SunMoonWidgetProps) {
  const [now, setNow] = useState(() => new Date());

  // Refresh every minute so phases stay current
  useEffect(() => {
    const id = setInterval(() => setNow(new Date()), 60_000);
    return () => clearInterval(id);
  }, []);

  const solar = getSolarPhase(now.getHours());
  const lunar = getLunarPhase(now);
  const dateStr = formatDate(now);

  if (standalone) {
    return (
      <div className="flex items-center justify-center gap-4 w-full py-2 text-sm text-foreground/70 bg-card/60 backdrop-blur-sm rounded-lg border border-border/30 shadow-sm">
        {/* Icon */}
        <img
          src="/assets/uploads/Ikon-2.jpg"
          alt="HKLO"
          className="h-8 w-auto object-contain rounded-sm flex-shrink-0"
        />

        {/* Date */}
        <span className="font-semibold text-foreground/90 whitespace-nowrap">
          {dateStr}
        </span>

        <span className="text-border/60">·</span>

        {/* Solar phase */}
        <span className="flex items-center gap-1 whitespace-nowrap">
          <span>{solar.emoji}</span>
          <span>{solar.label}</span>
        </span>

        <span className="text-border/60">·</span>

        {/* Lunar phase */}
        <span className="flex items-center gap-1 whitespace-nowrap">
          <span>{lunar.emoji}</span>
          <span>{lunar.label}</span>
        </span>
      </div>
    );
  }

  return (
    <div className="flex items-center gap-3 w-full px-4 py-1 text-xs text-muted-foreground border-b border-border/40 bg-card/30">
      {/* Icon */}
      <img
        src="/assets/uploads/Ikon-2.jpg"
        alt="HKLO"
        className="h-6 w-auto object-contain rounded-sm flex-shrink-0"
      />

      {/* Date */}
      <span className="font-medium text-foreground/80 whitespace-nowrap">
        {dateStr}
      </span>

      {/* Solar phase */}
      <span className="flex items-center gap-1 whitespace-nowrap">
        <span>{solar.emoji}</span>
        <span>{solar.label}</span>
      </span>

      {/* Lunar phase */}
      <span className="flex items-center gap-1 whitespace-nowrap">
        <span>{lunar.emoji}</span>
        <span>{lunar.label}</span>
      </span>
    </div>
  );
}
