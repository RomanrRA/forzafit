export type AchievementCondition =
  | { type: 'workout_count'; value: number }
  | { type: 'streak'; value: number }
  | { type: 'pr_count'; value: number }
  | { type: 'session_pr_count'; value: number }
  | { type: 'session_volume'; value: number }
  | { type: 'workout_set_count'; value: number }
  | { type: 'time_before_hour'; value: number }
  | { type: 'time_after_hour'; value: number }
  | { type: 'comeback'; value: number };

export type AchievementCategory =
  | 'consistency'
  | 'strength'
  | 'volume'
  | 'milestone'
  | 'time'
  | 'social';

export interface AchievementSeed {
  code: string;
  title: string;
  description: string;
  emoji: string;
  category: AchievementCategory;
  points: number;
  threshold?: number;
  condition: AchievementCondition;
  sortOrder: number;
}

export const ACHIEVEMENT_SEEDS: AchievementSeed[] = [
  // ─── Milestones ───────────────────────────────────────────
  {
    code: 'first_workout',
    title: 'Первая тренировка',
    description: 'Заверши первую тренировку',
    emoji: '🏃',
    category: 'milestone',
    points: 10,
    threshold: 1,
    condition: { type: 'workout_count', value: 1 },
    sortOrder: 10,
  },
  {
    code: 'workouts_10',
    title: 'Десятка',
    description: '10 завершённых тренировок',
    emoji: '🎖️',
    category: 'milestone',
    points: 20,
    threshold: 10,
    condition: { type: 'workout_count', value: 10 },
    sortOrder: 20,
  },
  {
    code: 'workouts_50',
    title: 'Полсотни',
    description: '50 завершённых тренировок',
    emoji: '🏅',
    category: 'milestone',
    points: 50,
    threshold: 50,
    condition: { type: 'workout_count', value: 50 },
    sortOrder: 30,
  },
  {
    code: 'workouts_100',
    title: 'Сотая',
    description: '100 завершённых тренировок',
    emoji: '🏆',
    category: 'milestone',
    points: 150,
    threshold: 100,
    condition: { type: 'workout_count', value: 100 },
    sortOrder: 40,
  },
  {
    code: 'sets_100',
    title: 'Сотня сетов',
    description: '100 завершённых рабочих сетов',
    emoji: '💯',
    category: 'milestone',
    points: 30,
    threshold: 100,
    condition: { type: 'workout_set_count', value: 100 },
    sortOrder: 50,
  },
  {
    code: 'sets_1000',
    title: 'Тысяча сетов',
    description: '1000 завершённых рабочих сетов',
    emoji: '🪙',
    category: 'milestone',
    points: 200,
    threshold: 1000,
    condition: { type: 'workout_set_count', value: 1000 },
    sortOrder: 60,
  },

  // ─── Consistency / Streaks ────────────────────────────────
  {
    code: 'streak_3',
    title: 'Три подряд',
    description: 'Тренируйся 3 дня подряд',
    emoji: '🔥',
    category: 'consistency',
    points: 15,
    threshold: 3,
    condition: { type: 'streak', value: 3 },
    sortOrder: 110,
  },
  {
    code: 'streak_7',
    title: 'Неделя огня',
    description: '7 дней подряд с тренировкой',
    emoji: '🔥🔥',
    category: 'consistency',
    points: 30,
    threshold: 7,
    condition: { type: 'streak', value: 7 },
    sortOrder: 120,
  },
  {
    code: 'streak_14',
    title: 'Двухнедельный',
    description: '14 дней подряд с тренировкой',
    emoji: '💪',
    category: 'consistency',
    points: 50,
    threshold: 14,
    condition: { type: 'streak', value: 14 },
    sortOrder: 130,
  },
  {
    code: 'streak_30',
    title: 'Месяц силы',
    description: '30 дней подряд с тренировкой',
    emoji: '💎',
    category: 'consistency',
    points: 100,
    threshold: 30,
    condition: { type: 'streak', value: 30 },
    sortOrder: 140,
  },
  {
    code: 'streak_100',
    title: 'Сто дней',
    description: '100 дней подряд с тренировкой',
    emoji: '👑',
    category: 'consistency',
    points: 300,
    threshold: 100,
    condition: { type: 'streak', value: 100 },
    sortOrder: 150,
  },
  {
    code: 'comeback',
    title: 'Возвращение',
    description: 'Вернулся после паузы в 14+ дней',
    emoji: '🔄',
    category: 'consistency',
    points: 20,
    condition: { type: 'comeback', value: 14 },
    sortOrder: 160,
  },

  // ─── Strength / PRs ───────────────────────────────────────
  {
    code: 'pr_first',
    title: 'Первый рекорд',
    description: 'Установи первый личный рекорд',
    emoji: '🌟',
    category: 'strength',
    points: 15,
    threshold: 1,
    condition: { type: 'pr_count', value: 1 },
    sortOrder: 210,
  },
  {
    code: 'pr_5',
    title: 'Пятёрка PR',
    description: '5 личных рекордов',
    emoji: '⭐',
    category: 'strength',
    points: 40,
    threshold: 5,
    condition: { type: 'pr_count', value: 5 },
    sortOrder: 220,
  },
  {
    code: 'pr_10',
    title: 'Десятка PR',
    description: '10 личных рекордов',
    emoji: '📈',
    category: 'strength',
    points: 80,
    threshold: 10,
    condition: { type: 'pr_count', value: 10 },
    sortOrder: 230,
  },
  {
    code: 'triple_pr',
    title: 'Тройной прорыв',
    description: 'Установи 3 PR за одну тренировку',
    emoji: '🚀',
    category: 'strength',
    points: 50,
    threshold: 3,
    condition: { type: 'session_pr_count', value: 3 },
    sortOrder: 240,
  },

  // ─── Volume ───────────────────────────────────────────────
  {
    code: 'volume_1000',
    title: 'Тонна',
    description: 'Подними суммарный объём 1000 кг за тренировку',
    emoji: '🎯',
    category: 'volume',
    points: 25,
    threshold: 1000,
    condition: { type: 'session_volume', value: 1000 },
    sortOrder: 310,
  },
  {
    code: 'volume_5000',
    title: 'Пять тонн',
    description: 'Подними суммарный объём 5000 кг за тренировку',
    emoji: '🏋️',
    category: 'volume',
    points: 75,
    threshold: 5000,
    condition: { type: 'session_volume', value: 5000 },
    sortOrder: 320,
  },

  // ─── Time of day ──────────────────────────────────────────
  {
    code: 'early_bird',
    title: 'Ранняя пташка',
    description: 'Заверши тренировку, начатую до 7:00',
    emoji: '⚡',
    category: 'time',
    points: 15,
    condition: { type: 'time_before_hour', value: 7 },
    sortOrder: 410,
  },
  {
    code: 'night_owl',
    title: 'Сова',
    description: 'Заверши тренировку, начатую после 23:00',
    emoji: '🌙',
    category: 'time',
    points: 15,
    condition: { type: 'time_after_hour', value: 23 },
    sortOrder: 420,
  },
];
