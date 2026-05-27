/**
 * Загрузчик публичной базы упражнений free-exercise-db (yuhonas, Unlicense).
 * 873 упражнения с инструкциями и 2 кадрами картинки каждый.
 *
 * Имена и инструкции переводятся отдельным скриптом (tmp/translate-exercises.mjs)
 * и сохраняются в exercise-translations.json рядом с исходным JSON.
 */
import * as fs from 'fs';
import * as path from 'path';

export interface FreeDbItem {
  id: string;
  name: string;
  force: 'pull' | 'push' | 'static' | null;
  level: 'beginner' | 'intermediate' | 'expert';
  mechanic: 'compound' | 'isolation' | null;
  equipment: string | null;
  primaryMuscles: string[];
  secondaryMuscles: string[];
  instructions: string[];
  category: string;
  images: string[];
}

export interface Translation {
  name_ru: string;
  instructions_ru: string[];
}

export interface SeededFromFreeDb {
  sourceId: string;
  /** Имя на русском (если есть перевод) или оригинальное английское. */
  name: string;
  /** Оригинальное английское имя из free-exercise-db — для матчинга по существующей БД,
   *  где AI-планировщик мог сохранить латинский вариант («Bench Press» вместо «Жим лёжа»). */
  sourceName: string;
  muscleGroups: string[];
  primaryMuscles: string[];
  secondaryMuscles: string[];
  equipment: string | null;
  difficulty: 'beginner' | 'intermediate' | 'advanced';
  category: string;
  force: string | null;
  mechanic: string | null;
  instructions: string[];
  imageUrls: string[];
}

const LEVEL_MAP: Record<string, 'beginner' | 'intermediate' | 'advanced'> = {
  beginner: 'beginner',
  intermediate: 'intermediate',
  expert: 'advanced',
};

const EQUIPMENT_MAP: Record<string, string> = {
  'body only': 'bodyweight',
  barbell: 'barbell',
  dumbbell: 'dumbbell',
  kettlebells: 'kettlebell',
  cable: 'cable',
  bands: 'bands',
  machine: 'machine',
  'exercise ball': 'exercise_ball',
  'foam roll': 'foam_roll',
  'medicine ball': 'medball',
  e_z_curl_bar: 'ez_bar',
  other: 'other',
};

// Переводим primaryMuscles → muscleGroups (наше legacy-поле) на русский,
// чтобы UI-фильтры и Chip показывали родную терминологию.
const MUSCLE_RU: Record<string, string> = {
  abdominals: 'пресс',
  abductors: 'отводящие мышцы',
  adductors: 'приводящие мышцы',
  biceps: 'бицепс',
  calves: 'икры',
  chest: 'грудь',
  forearms: 'предплечья',
  glutes: 'ягодицы',
  hamstrings: 'бицепс бедра',
  lats: 'широчайшие',
  'lower back': 'поясница',
  'middle back': 'середина спины',
  neck: 'шея',
  quadriceps: 'квадрицепс',
  shoulders: 'плечи',
  traps: 'трапеция',
  triceps: 'трицепс',
};

function ruMuscles(list: string[]): string[] {
  return list.map((m) => MUSCLE_RU[m.toLowerCase()] ?? m);
}

function loadJson<T>(filename: string): T | null {
  const candidates = [
    path.join(__dirname, filename),
    path.join(process.cwd(), 'src/workouts/exercises', filename),
  ];
  for (const p of candidates) {
    try {
      return JSON.parse(fs.readFileSync(p, 'utf-8')) as T;
    } catch {
      // continue
    }
  }
  return null;
}

/**
 * Возвращает упражнения из free-exercise-db в формате готовом для вставки.
 * Если translations JSON отсутствует или пуст — возвращает упражнения с английскими именами
 * (всё равно полезно: инструкции/картинки/категории заполнены).
 */
export function loadFreeDbSeed(): SeededFromFreeDb[] {
  const items = loadJson<FreeDbItem[]>('free-exercise-db.json');
  if (!items) return [];

  const translations =
    loadJson<Record<string, Translation>>('exercise-translations.json') ?? {};

  return items.map((item) => {
    const t = translations[item.id];
    const imageUrls = (item.images ?? []).map((rel) => {
      // free-exercise-db даёт пути вида '3_4_Sit-Up/0.jpg'. Конвертированные WebP лежат
      // в apps/web/public/exercises/{id}/{0,1}.webp.
      const base = rel.replace(/\.(jpg|jpeg|png)$/i, '.webp');
      return `/exercises/${base}`;
    });

    return {
      sourceId: item.id,
      name: t?.name_ru || item.name,
      sourceName: item.name,
      muscleGroups: ruMuscles(item.primaryMuscles ?? []),
      primaryMuscles: item.primaryMuscles ?? [],
      secondaryMuscles: item.secondaryMuscles ?? [],
      equipment: item.equipment ? (EQUIPMENT_MAP[item.equipment] ?? item.equipment) : null,
      difficulty: LEVEL_MAP[item.level] ?? 'beginner',
      category: item.category,
      force: item.force,
      mechanic: item.mechanic,
      instructions: t?.instructions_ru?.length ? t.instructions_ru : item.instructions ?? [],
      imageUrls,
    };
  });
}
