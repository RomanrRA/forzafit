import { describe, expect, it } from 'vitest';
import { epley1Rm, round1 } from './pr-detector.service';

describe('epley1Rm (формула Эпли)', () => {
  it('возвращает сам вес при 1 повторе', () => {
    expect(epley1Rm(100, 1)).toBe(100);
  });

  it('считает 1ПМ по Эпли для нескольких повторов', () => {
    // 100 кг × 10 повт → 100 × (1 + 10/30) = 133.33
    expect(epley1Rm(100, 10)).toBeCloseTo(133.333, 2);
  });

  it('5 повторов: 100 × (1 + 5/30) ≈ 116.67', () => {
    expect(epley1Rm(100, 5)).toBeCloseTo(116.667, 2);
  });

  it('монотонно растёт с числом повторов при том же весе', () => {
    expect(epley1Rm(80, 8)).toBeGreaterThan(epley1Rm(80, 3));
  });
});

describe('round1', () => {
  it('округляет до одного знака', () => {
    expect(round1(133.333)).toBe(133.3);
    expect(round1(116.666)).toBe(116.7);
  });

  it('не трогает целые', () => {
    expect(round1(100)).toBe(100);
  });
});
