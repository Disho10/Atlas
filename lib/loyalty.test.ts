import { describe, it, expect } from 'vitest';
import { pointsToDiscount, isValidRedemption, POINTS_PER_DOLLAR } from './loyalty';

describe('pointsToDiscount', () => {
  it('converts 100 points to $5', () => {
    expect(pointsToDiscount(100)).toBe(5);
  });

  it('scales linearly', () => {
    expect(pointsToDiscount(500)).toBe(25);
  });

  it('stays consistent with POINTS_PER_DOLLAR', () => {
    expect(pointsToDiscount(POINTS_PER_DOLLAR)).toBe(1);
  });
});

describe('isValidRedemption', () => {
  it('rejects anything under 100', () => {
    expect(isValidRedemption(50)).toBe(false);
    expect(isValidRedemption(0)).toBe(false);
    expect(isValidRedemption(-100)).toBe(false);
  });

  it('rejects non-multiples of 100', () => {
    expect(isValidRedemption(150)).toBe(false);
    expect(isValidRedemption(199)).toBe(false);
  });

  it('accepts valid multiples of 100 at or above 100', () => {
    expect(isValidRedemption(100)).toBe(true);
    expect(isValidRedemption(300)).toBe(true);
    expect(isValidRedemption(1000)).toBe(true);
  });
});
