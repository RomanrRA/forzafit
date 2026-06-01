// Нормализация и fuzzy-сопоставление названий упражнений.
// Используется и в resolveByName (AI/пользовательские имена → упражнение из базы),
// и в разовом скрипте бэкфилла медиа (упражнения без картинок → аналог с картинками).

// Стоп-слова — ТОЛЬКО предлоги/союзы-связки. Позиционные слова (лёжа/сидя/стоя)
// и «в тренажёре» НЕ выкидываем: они различают разные движения (жим лёжа ≠ жим
// стоя ≠ жим ногами), иначе матчер ложно схлопывает их в одно.
const STOPWORDS = new Set([
  'в', 'на', 'с', 'со', 'из', 'по', 'к', 'от', 'для', 'до', 'и', 'или',
]);

/**
 * Канонизация строки: нижний регистр, ё→е, убрать скобки/пунктуацию,
 * схлопнуть пробелы. Возвращает чистую строку для точного сравнения.
 */
export function normalizeName(s: string): string {
  return (s ?? '')
    .toLowerCase()
    .replace(/ё/g, 'е')
    .replace(/\([^)]*\)/g, ' ') // выкинуть скобочные уточнения целиком
    .replace(/[^a-zа-я0-9]+/gi, ' ')
    .replace(/\s+/g, ' ')
    .trim();
}

/** Набор значимых токенов (без стоп-слов). */
export function nameTokens(s: string): Set<string> {
  const toks = normalizeName(s)
    .split(' ')
    .filter((t) => t.length > 1 && !STOPWORDS.has(t));
  return new Set(toks);
}

/**
 * Оценка близости двух названий в [0..1].
 * Комбинируем Жаккара по токенам с бонусом за вложенность (одно множество ⊆ другого).
 */
export function similarity(a: string, b: string): number {
  const na = normalizeName(a);
  const nb = normalizeName(b);
  if (!na || !nb) return 0;
  if (na === nb) return 1;

  const ta = nameTokens(a);
  const tb = nameTokens(b);
  if (ta.size === 0 || tb.size === 0) return na === nb ? 1 : 0;

  let inter = 0;
  for (const t of ta) if (tb.has(t)) inter++;
  const union = ta.size + tb.size - inter;
  const jaccard = inter / union;

  // Вложенность: все токены меньшего множества входят в большее.
  const smaller = ta.size <= tb.size ? ta : tb;
  const containment = inter / smaller.size;

  return Math.max(jaccard, 0.5 * jaccard + 0.5 * containment);
}

export interface MatchCandidate {
  id: string;
  name: string;
  equipment: string | null;
  hasImages: boolean;
}

/**
 * Лучший кандидат для `query` среди `candidates`.
 * `minScore` — порог принятия. При равных очках приоритет у кандидата с картинками.
 * `preferImages` приподнимает score кандидатов с картинками, чтобы AI-имена
 * цеплялись за упражнения с фото, а не за «голые» записи.
 */
export function bestMatch(
  query: string,
  candidates: MatchCandidate[],
  opts: { minScore?: number; preferImages?: boolean } = {},
): { candidate: MatchCandidate; score: number } | null {
  const minScore = opts.minScore ?? 0.7;
  const preferImages = opts.preferImages ?? true;

  let best: { candidate: MatchCandidate; score: number } | null = null;
  for (const c of candidates) {
    const base = similarity(query, c.name);
    const score = preferImages && c.hasImages ? Math.min(1, base + 0.05) : base;
    if (score < minScore) continue;
    if (
      !best ||
      score > best.score ||
      (score === best.score && c.hasImages && !best.candidate.hasImages)
    ) {
      best = { candidate: c, score };
    }
  }
  return best;
}
