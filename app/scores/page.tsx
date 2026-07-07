import { leagues } from '@/lib/mockData';

// TODO(backend): replace with a live scores API (e.g. Sportradar / API-Football).
// Structure kept simple on purpose so the fetch can be swapped in without touching the UI.
const MOCK_RESULTS: Record<string, { home: string; away: string; score: string; date: string }[]> = {
  'la-liga': [{ home: 'Real Madrid', away: 'Sevilla', score: '3–1', date: 'Sat' }],
  'premier-league': [{ home: 'Man City', away: 'Arsenal', score: '2–2', date: 'Sun' }],
  'serie-a': [{ home: 'Inter Milan', away: 'Juventus', score: '1–0', date: 'Sat' }],
  'bundesliga': [{ home: 'Bayern Munich', away: 'Dortmund', score: '4–2', date: 'Fri' }],
  'ligue-1': [{ home: 'PSG', away: 'Marseille', score: '2–1', date: 'Sun' }],
};

export default function ScoresPage() {
  const top5 = leagues.filter(l => l.slug !== 'lebanese-league');

  return (
    <main className="max-w-3xl mx-auto px-6 py-14">
      <h1 className="font-display text-3xl mb-8">Match Results</h1>
      <div className="space-y-8">
        {top5.map(l => (
          <div key={l.slug}>
            <h2 className="text-sm uppercase tracking-widest2 text-steel mb-3" style={{ fontFamily: l.font }}>{l.name}</h2>
            {MOCK_RESULTS[l.slug]?.map((m, i) => (
              <div key={i} className="flex items-center justify-between border border-black/10 dark:border-white/10 rounded-xl px-5 py-4">
                <span>{m.home}</span>
                <span className="font-display text-lg tabular">{m.score}</span>
                <span>{m.away}</span>
                <span className="text-xs text-steel">{m.date}</span>
              </div>
            ))}
          </div>
        ))}
      </div>
    </main>
  );
}
