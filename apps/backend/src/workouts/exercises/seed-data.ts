/**
 * Публичные упражнения, которые досеваются на старте сервиса.
 * Имена должны совпадать с тем, что AI выдаёт в plan-wizard prompt,
 * чтобы resolveByName находил их без создания custom-дубликатов.
 */
export interface SeedExercise {
  name: string;
  muscleGroups: string[];
  equipment: string;
  difficulty: 'beginner' | 'intermediate' | 'advanced';
  description?: string;
}

const CROSSFIT: SeedExercise[] = [
  { name: 'Бёрпи', muscleGroups: ['full_body'], equipment: 'bodyweight', difficulty: 'beginner' },
  { name: 'Трастеры', muscleGroups: ['full_body', 'legs', 'shoulders'], equipment: 'barbell', difficulty: 'intermediate' },
  { name: 'Рывок штанги', muscleGroups: ['full_body'], equipment: 'barbell', difficulty: 'advanced' },
  { name: 'Толчок штанги', muscleGroups: ['full_body'], equipment: 'barbell', difficulty: 'advanced' },
  { name: 'Кластер (штанга)', muscleGroups: ['full_body'], equipment: 'barbell', difficulty: 'advanced' },
  { name: 'Махи гирей', muscleGroups: ['back', 'glutes'], equipment: 'kettlebell', difficulty: 'beginner' },
  { name: 'Подтягивания киппингом', muscleGroups: ['back'], equipment: 'pullup_bar', difficulty: 'intermediate' },
  { name: 'Подтягивания строгие', muscleGroups: ['back'], equipment: 'pullup_bar', difficulty: 'intermediate' },
  { name: 'Отжимания в стойке на руках (HSPU)', muscleGroups: ['shoulders'], equipment: 'wall', difficulty: 'advanced' },
  { name: 'Бросок медбола в стену (Wall Ball)', muscleGroups: ['legs', 'shoulders'], equipment: 'medball', difficulty: 'beginner' },
  { name: 'Прыжки на тумбу', muscleGroups: ['legs'], equipment: 'box', difficulty: 'beginner' },
  { name: 'Sit-up', muscleGroups: ['core'], equipment: 'bodyweight', difficulty: 'beginner' },
  { name: 'Прыжки со скакалкой', muscleGroups: ['full_body'], equipment: 'jump_rope', difficulty: 'beginner' },
  { name: 'Двойные прыжки (Double-Unders)', muscleGroups: ['full_body'], equipment: 'jump_rope', difficulty: 'intermediate' },
  { name: 'Воздушные приседания', muscleGroups: ['legs'], equipment: 'bodyweight', difficulty: 'beginner' },
  { name: 'Гребля (rower)', muscleGroups: ['full_body'], equipment: 'rower', difficulty: 'beginner' },
  { name: 'Турецкий подъём', muscleGroups: ['full_body', 'core'], equipment: 'kettlebell', difficulty: 'intermediate' },
  { name: 'Рывок гири', muscleGroups: ['full_body'], equipment: 'kettlebell', difficulty: 'intermediate' },
  { name: 'Бег 400м', muscleGroups: ['full_body'], equipment: 'none', difficulty: 'beginner' },
  { name: 'Бег 800м', muscleGroups: ['full_body'], equipment: 'none', difficulty: 'beginner' },
  { name: 'Носки к перекладине (Toes-to-Bar)', muscleGroups: ['core'], equipment: 'pullup_bar', difficulty: 'intermediate' },
  { name: 'Велоэргометр (Assault Bike)', muscleGroups: ['full_body'], equipment: 'bike', difficulty: 'beginner' },
  { name: 'Прогулка фермера', muscleGroups: ['full_body', 'core'], equipment: 'dumbbell', difficulty: 'beginner' },
];

const SWIMMING: SeedExercise[] = [
  { name: 'Кроль 50м', muscleGroups: ['full_body'], equipment: 'pool', difficulty: 'beginner' },
  { name: 'Кроль 100м', muscleGroups: ['full_body'], equipment: 'pool', difficulty: 'intermediate' },
  { name: 'Кроль 200м', muscleGroups: ['full_body'], equipment: 'pool', difficulty: 'intermediate' },
  { name: 'Кроль 400м', muscleGroups: ['full_body'], equipment: 'pool', difficulty: 'advanced' },
  { name: 'Брасс 50м', muscleGroups: ['full_body'], equipment: 'pool', difficulty: 'beginner' },
  { name: 'Брасс 100м', muscleGroups: ['full_body'], equipment: 'pool', difficulty: 'beginner' },
  { name: 'Брасс 200м', muscleGroups: ['full_body'], equipment: 'pool', difficulty: 'intermediate' },
  { name: 'На спине 50м', muscleGroups: ['full_body', 'back'], equipment: 'pool', difficulty: 'beginner' },
  { name: 'На спине 100м', muscleGroups: ['full_body', 'back'], equipment: 'pool', difficulty: 'intermediate' },
  { name: 'Баттерфляй 25м', muscleGroups: ['full_body', 'shoulders'], equipment: 'pool', difficulty: 'intermediate' },
  { name: 'Баттерфляй 50м', muscleGroups: ['full_body', 'shoulders'], equipment: 'pool', difficulty: 'advanced' },
  { name: 'Разминка кролем 200м', muscleGroups: ['full_body'], equipment: 'pool', difficulty: 'beginner' },
  { name: 'Заминка кролем 200м', muscleGroups: ['full_body'], equipment: 'pool', difficulty: 'beginner' },
];

export const SEED_PUBLIC_EXERCISES: SeedExercise[] = [...CROSSFIT, ...SWIMMING];
