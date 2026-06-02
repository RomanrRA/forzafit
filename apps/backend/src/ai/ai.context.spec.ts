import { describe, expect, it } from 'vitest';
import { buildProfileContext, buildCoachContext } from './ai.context';

describe('buildProfileContext', () => {
  it('возвращает null, если про пользователя ничего не известно', () => {
    expect(
      buildProfileContext({
        gender: null,
        dob: null,
        heightCm: null,
        weightKg: null,
        goal: null,
      }),
    ).toBeNull();
  });

  it('переводит пол и считает возраст из dob', () => {
    const dob = new Date('2000-01-01');
    const ctx = buildProfileContext({
      gender: 'male',
      dob,
      heightCm: 180,
      weightKg: 80,
      goal: null,
    });
    expect(ctx).toContain('Пол: мужской');
    expect(ctx).toContain('Рост: 180 см');
    expect(ctx).toContain('Вес: 80 кг');
    expect(ctx).toMatch(/Возраст: \d+ лет/);
    expect(ctx).toContain('не переспрашивай');
  });

  it('неизвестный пол отдаёт как есть', () => {
    const ctx = buildProfileContext({
      gender: 'нечто',
      dob: null,
      heightCm: null,
      weightKg: null,
      goal: null,
    });
    expect(ctx).toContain('Пол: нечто');
  });
});

describe('buildCoachContext', () => {
  it('одно намерение → строка «Намерение пользователя»', () => {
    const ctx = buildCoachContext(['lose'], 3, null);
    expect(ctx).toContain('Намерение пользователя: сбросить вес/жир');
    expect(ctx).toContain('Желаемый срок: 3 мес.');
    expect(ctx).toContain('замеров тела в БД нет');
  });

  it('несколько намерений → список «комбинировать»', () => {
    const ctx = buildCoachContext(['lose', 'strength'], undefined, null);
    expect(ctx).toContain('комбинировать');
    expect(ctx).toContain('- сбросить вес/жир');
    expect(ctx).toContain('- нарастить силовые показатели');
    expect(ctx).not.toContain('Желаемый срок');
  });

  it('с замером тела печатает обхваты, прочерк для null', () => {
    const ctx = buildCoachContext(['maintain'], 6, {
      date: '2026-06-01',
      weightKg: 75,
      bodyFatPct: null,
      chestCm: 100,
      waistCm: 80,
      hipsCm: 95,
      armCm: 35,
      thighCm: 58,
      calfCm: 38,
      forearmCm: 30,
      neckCm: 38,
    });
    expect(ctx).toContain('Последний замер тела:');
    expect(ctx).toContain('- вес: 75 кг');
    expect(ctx).toContain('- % жира: —');
    expect(ctx).toContain('- талия: 80 см');
  });
});
