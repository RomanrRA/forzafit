import { describe, expect, it } from 'vitest';
import {
  bucketOf,
  normalizedEntropy,
  normalizeStats,
  type RawStatInputs,
} from './stats.service';

const EMPTY: RawStatInputs = {
  bodyweightKg: null,
  topOneRmKg: [],
  recentPrCount: 0,
  sessionReps: [],
  intensityRatios: [],
  currentStreak: 0,
  sessions28: 0,
  muscleBucketCounts: {},
};

describe('bucketOf', () => {
  it('маппит primaryMuscles в крупную группу по первому распознанному', () => {
    expect(bucketOf(['quadriceps'])).toBe('legs');
    expect(bucketOf(['lats'])).toBe('back');
    expect(bucketOf(['biceps'])).toBe('arms');
    expect(bucketOf(['abdominals'])).toBe('core');
  });
  it('возвращает null без распознанных мышц', () => {
    expect(bucketOf([])).toBeNull();
    expect(bucketOf(null)).toBeNull();
    expect(bucketOf(['unknown-muscle'])).toBeNull();
  });
});

describe('normalizedEntropy', () => {
  it('0 для пустого распределения', () => {
    expect(normalizedEntropy([0, 0, 0])).toBe(0);
  });
  it('0 когда всё в одной группе', () => {
    expect(normalizedEntropy([10, 0, 0, 0, 0, 0])).toBe(0);
  });
  it('1 при идеально равномерном распределении', () => {
    expect(normalizedEntropy([5, 5, 5, 5, 5, 5])).toBeCloseTo(1, 5);
  });
});

describe('normalizeStats', () => {
  it('пустой ввод → все статы 0, уровень 1', () => {
    const { stats, overall, level } = normalizeStats(EMPTY);
    expect(Object.values(stats)).toEqual([0, 0, 0, 0, 0, 0]);
    expect(overall).toBe(0);
    expect(level).toBe(1);
  });

  it('СИЛА: 2× веса тела (в среднем по топ-PR) → 100', () => {
    const { stats } = normalizeStats({
      ...EMPTY,
      bodyweightKg: 80,
      topOneRmKg: [160, 160, 160],
    });
    expect(stats.strength).toBe(100);
  });

  it('СИЛА: фолбэк массы тела 75 кг, когда вес не задан', () => {
    const { stats } = normalizeStats({ ...EMPTY, topOneRmKg: [75] });
    // ratio 1.0 при STRENGTH_RATIO_FULL=2.0 → 50
    expect(stats.strength).toBe(50);
  });

  it('ИНТЕНСИВНОСТЬ: отношения >1 капаются в 1 (=100)', () => {
    const { stats } = normalizeStats({
      ...EMPTY,
      intensityRatios: [1.4, 1.2, 1.0],
    });
    expect(stats.intensity).toBe(100);
  });

  it('ДИСЦИПЛИНА: среднее стрика и частоты', () => {
    const { stats } = normalizeStats({
      ...EMPTY,
      currentStreak: 30, // → 100
      sessions28: 8, // 8/16 → 50
    });
    expect(stats.discipline).toBe(75);
  });

  it('статы клампятся в 0..100 при экстремальных входах', () => {
    const { stats } = normalizeStats({
      ...EMPTY,
      bodyweightKg: 80,
      topOneRmKg: [400, 400, 400],
      recentPrCount: 999,
      sessionReps: [9999],
      currentStreak: 999,
      sessions28: 999,
    });
    for (const v of Object.values(stats)) {
      expect(v).toBeGreaterThanOrEqual(0);
      expect(v).toBeLessThanOrEqual(100);
    }
  });
});
