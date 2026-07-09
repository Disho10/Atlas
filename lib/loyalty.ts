// 100 points = $5 off. Pure so it's testable — see lib/loyalty.test.ts.
// The actual point BALANCE is only ever mutated server-side via the
// apply_loyalty() Postgres function; this just converts a redemption amount
// to a dollar discount for display/validation purposes.
export const POINTS_PER_DOLLAR = 20;

export function pointsToDiscount(points: number): number {
  return points / POINTS_PER_DOLLAR;
}

export function isValidRedemption(points: number): boolean {
  return points >= 100 && points % 100 === 0;
}
