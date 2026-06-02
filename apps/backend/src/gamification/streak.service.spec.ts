import { beforeEach, describe, expect, it, vi } from 'vitest';
import { StreakService } from './streak.service';

/** Минимальный chainable-мок drizzle для update(...).set(...).where(...). */
function makeDbMock() {
  const where = vi.fn().mockResolvedValue(undefined);
  const set = vi.fn(() => ({ where }));
  const update = vi.fn(() => ({ set }));
  return { update, set, where };
}

function makeService(existing: {
  currentCount: number;
  longestCount: number;
  lastActivityDate: Date | null;
}) {
  const dbMock = makeDbMock();
  const service = new StreakService({ db: dbMock } as never);
  // Изолируем чистую логику от чтения/инициализации из БД.
  service.getOrInit = vi.fn().mockResolvedValue(existing) as never;
  return { service, dbMock };
}

const day = (iso: string) => new Date(`${iso}T12:00:00`);

describe('StreakService.updateForActivity', () => {
  beforeEach(() => vi.clearAllMocks());

  it('первая активность: current=1, longest=1, isNewLongest=true', async () => {
    const { service } = makeService({
      currentCount: 0,
      longestCount: 0,
      lastActivityDate: null,
    });
    const res = await service.updateForActivity('u1', day('2026-06-02'));
    expect(res.currentCount).toBe(1);
    expect(res.longestCount).toBe(1);
    expect(res.isNewLongest).toBe(true);
    expect(res.daysSincePrevious).toBeNull();
  });

  it('та же дата (diff=0): счётчик не меняется, в БД не пишем', async () => {
    const { service, dbMock } = makeService({
      currentCount: 5,
      longestCount: 9,
      lastActivityDate: day('2026-06-02'),
    });
    const res = await service.updateForActivity('u1', day('2026-06-02'));
    expect(res.currentCount).toBe(5);
    expect(res.daysSincePrevious).toBe(0);
    expect(dbMock.update).not.toHaveBeenCalled();
  });

  it('следующий день (diff=1): инкремент', async () => {
    const { service } = makeService({
      currentCount: 5,
      longestCount: 9,
      lastActivityDate: day('2026-06-01'),
    });
    const res = await service.updateForActivity('u1', day('2026-06-02'));
    expect(res.currentCount).toBe(6);
    expect(res.daysSincePrevious).toBe(1);
    expect(res.isNewLongest).toBe(false);
  });

  it('пропуск (diff>1): сброс до 1', async () => {
    const { service } = makeService({
      currentCount: 5,
      longestCount: 9,
      lastActivityDate: day('2026-05-28'),
    });
    const res = await service.updateForActivity('u1', day('2026-06-02'));
    expect(res.currentCount).toBe(1);
    expect(res.daysSincePrevious).toBe(5);
    expect(res.longestCount).toBe(9);
  });

  it('новый рекорд longest при инкременте', async () => {
    const { service } = makeService({
      currentCount: 9,
      longestCount: 9,
      lastActivityDate: day('2026-06-01'),
    });
    const res = await service.updateForActivity('u1', day('2026-06-02'));
    expect(res.currentCount).toBe(10);
    expect(res.longestCount).toBe(10);
    expect(res.isNewLongest).toBe(true);
  });
});
