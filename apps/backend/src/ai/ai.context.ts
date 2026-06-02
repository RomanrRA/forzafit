// Построение текстового контекста для AI-промптов (профиль пользователя,
// режим AI-coach). Чистые функции без побочных эффектов — легко тестируются.

export type CoachIntent = 'lose' | 'gain' | 'maintain' | 'strength';

const INTENT_LABEL: Record<CoachIntent, string> = {
  lose: 'сбросить вес/жир',
  gain: 'набрать мышечную массу',
  maintain: 'поддерживать форму, улучшить композицию',
  strength: 'нарастить силовые показатели',
};

const GENDER_LABEL: Record<string, string> = {
  male: 'мужской',
  female: 'женский',
  other: 'другой',
};

export function buildProfileContext(user: {
  gender: string | null;
  dob: Date | null;
  heightCm: number | null;
  weightKg: number | null;
  goal: string | null;
}): string | null {
  const lines: string[] = [];
  if (user.gender) lines.push(`- Пол: ${GENDER_LABEL[user.gender] ?? user.gender}`);
  if (user.dob) {
    const age = Math.floor((Date.now() - user.dob.getTime()) / (365.25 * 24 * 3600 * 1000));
    lines.push(`- Возраст: ${age} лет`);
  }
  if (user.heightCm) lines.push(`- Рост: ${user.heightCm} см`);
  if (user.weightKg) lines.push(`- Вес: ${user.weightKg} кг`);
  if (user.goal) lines.push(`- Цель из профиля: ${user.goal}`);
  if (lines.length === 0) return null;
  return `## Что уже известно о пользователе (из профиля)\n${lines.join('\n')}\n\nЭти данные не переспрашивай.`;
}

export function buildCoachContext(
  intents: CoachIntent[],
  targetMonths: number | undefined,
  measurement: {
    date: Date | string;
    weightKg: number | null;
    bodyFatPct: number | null;
    chestCm: number | null;
    waistCm: number | null;
    hipsCm: number | null;
    armCm: number | null;
    thighCm: number | null;
    calfCm: number | null;
    forearmCm: number | null;
    neckCm: number | null;
  } | null,
): string {
  const today = new Date().toISOString().slice(0, 10);
  const intentList = intents.map((i) => `- ${INTENT_LABEL[i]}`).join('\n');
  const lines: string[] = [
    '## Режим AI-coach: цель + программа',
    '',
    `Сегодня: ${today}`,
    intents.length > 1
      ? `Намерения пользователя (комбинировать):\n${intentList}`
      : `Намерение пользователя: ${INTENT_LABEL[intents[0]]}`,
  ];
  if (targetMonths != null) {
    lines.push(`Желаемый срок: ${targetMonths} мес.`);
  }
  lines.push('');

  if (measurement) {
    lines.push('Последний замер тела:');
    const fmt = (v: number | null) => (v == null ? '—' : String(v));
    lines.push(`- вес: ${fmt(measurement.weightKg)} кг`);
    lines.push(`- % жира: ${fmt(measurement.bodyFatPct)}`);
    lines.push(`- грудь: ${fmt(measurement.chestCm)} см`);
    lines.push(`- талия: ${fmt(measurement.waistCm)} см`);
    lines.push(`- бёдра: ${fmt(measurement.hipsCm)} см`);
    lines.push(`- плечо: ${fmt(measurement.armCm)} см`);
    lines.push(`- бедро: ${fmt(measurement.thighCm)} см`);
    lines.push(`- икра: ${fmt(measurement.calfCm)} см`);
    lines.push(`- предплечье: ${fmt(measurement.forearmCm)} см`);
    lines.push(`- шея: ${fmt(measurement.neckCm)} см`);
    lines.push('');
  } else {
    lines.push(
      'Текущих замеров тела в БД нет — опирайся на профиль (рост, вес, пол).',
      '',
    );
  }

  lines.push(
    '## ОБЯЗАТЕЛЬНО: два tool_call в одном ответе',
    '',
    'В этом режиме ты должен вызвать **оба** tool в одном ответе:',
    '1. `suggest_body_goal` — целевые показатели тела (вес/% жира/обхваты, targetDate, rationale).',
    '   Правила: BMI 18.5-25, % жира М 10-20% / Ж 18-28%, темп 0.5-0.7 кг/нед сброс, 0.2-0.4 кг/нед набор.',
    '   targetDate в будущем минимум 2 месяца, максимум 12. Если каких-то текущих замеров нет — оставь соответствующие цели null.',
    '2. `generate_plan` — программа тренировок, **подогнанная под эту цель**.',
    '   При сбросе: больше кардио/circuit, дефицит. При наборе: гипертрофия 8-12 повторов, прогрессия. При силе: 3-6 повторов в базовых движениях (присед/тяга/жим), длинный отдых 2-4 мин, RPE 7-9. При maintain: смешанный.',
    '   Если намерений несколько — совмести (lose+strength = рекомпозиция: силовая база + дефицит; gain+strength = периодизация: тяжёлые сеты 3-6 + объёмные 8-12).',
    '   В description плана упомяни связь с целью («Программа на 3 мес под сброс 5 кг»).',
    '',
    'Не задавай вопросов — все ответы анкеты уже в первом сообщении пользователя.',
  );

  return lines.join('\n');
}
