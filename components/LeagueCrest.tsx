import { League } from '@/lib/mockData';

// Renders the real, licensed league logo flush against whatever it's placed
// on — no plate, no circle, no border, and critically: no forced square box.
// Logos have very different natural proportions (Bundesliga/Ligue 1 are wide,
// LaLiga/Premier League/Serie A are tall icon-over-wordmark marks), so this
// fixes a consistent HEIGHT and lets width follow each logo's own aspect
// ratio via a plain <img>, rather than squeezing every logo into an equal
// width×height square (which was cramming the tall ones down small enough to
// look cropped). Falls back to a placeholder shield (not a reproduction of
// any real league logo) for leagues you don't have a licensed asset for yet.
// See BACKEND_INTEGRATION.md "League logos".
export default function LeagueCrest({ league, size = 72 }: { league: League; size?: number }) {
  if (league.logoUrl) {
    // eslint-disable-next-line @next/next/no-img-element
    return (
      <img
        src={league.logoUrl}
        alt={`${league.name} logo`}
        style={{ height: size, width: 'auto', maxWidth: size * 1.8 }}
        className="object-contain shrink-0"
      />
    );
  }

  return (
    <svg width={size} height={size * 1.1} viewBox="0 0 40 44" fill="none">
      <path
        d="M20 1 L37 6 V21 C37 32 30 40 20 43 C10 40 3 32 3 21 V6 Z"
        fill={league.primary}
        stroke={league.secondary}
        strokeWidth="1.5"
      />
      <path
        d="M20 5 L33 9 V21 C33 30 27.5 36.5 20 39 C12.5 36.5 7 30 7 21 V9 Z"
        fill={league.secondary}
        opacity="0.16"
      />
      <text
        x="20"
        y="25"
        textAnchor="middle"
        fontSize="13"
        fontWeight="700"
        fill={league.secondary}
        fontFamily="var(--font-display)"
      >
        {league.logoInitials}
      </text>
    </svg>
  );
}
