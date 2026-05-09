# Редизайн ForzaFit под Claude Design

Этот документ — живой статус миграции UI на дизайн из Claude Design
(`https://claude.ai/design/p/019e081f-e2ca-70d8-8cfa-38820c7dba8b`).
Обновлять по ходу работы — чтобы новая сессия Claude Code могла подхватить
контекст без потерь после компакции/окончания токенов.

## Источник дизайна

Локальные файлы (исходники макета):
`c:\Users\roman\Downloads\` —
`ForzaFit Web.html`, `Active Workout.html`, `forza-theme.css`, `forza-icons.jsx`,
`forza-screen.jsx`, `forza-extras.jsx`, `forza-web.jsx`, `forza-tabs-web.jsx`,
`forza-tabs-mobile.jsx`, `tweaks-panel.jsx`, `ios-frame.jsx`.

**Палитра/токены `forza-theme.css` совпадают с `apps/web/src/app/globals.css` 1-в-1**
(— oklch фоновые градиенты, glass-* классы, `--c-green/orange/yellow/red/blue`,
`--r-card`, `--r-pill`, `--bn` и т.д.). Палитру переделывать НЕ нужно.

## Глобальные изменения

- В `globals.css` добавлен `--c-violet: #a855f7` (использован для категории
  «Объём» в Ачивках; можно переиспользовать в других местах).
- В `apps/web/src/lib/utils.ts` добавлена `plural(n, [one, few, many])` —
  русская плюрализация (склонения по числу). Использовать везде вместо
  ручных тернарников. Уже применено в `/profile` (тренировка/серия/PR/ачивка)
  и `Sidebar` (день streak).
- `globals.css` → `.btn-primary-fill` — общий цветовой пресет (gradient
  `--c-accent` + accent-glow shadow). Делит background/border/shadow с
  `.glass-btn-primary`, отличается только border-radius. Применён в
  `Button.default` (`apps/web/src/components/ui/button.tsx`) — все default-кнопки
  shadcn теперь визуально идентичны кнопке «Начать тренировку». Старая
  синяя тень `rgba(28,108,240,...)` (рудимент shadcn) удалена.

## Прогресс по экранам

### ✅ Active Workout (`/workouts/[id]/active`)
Single-exercise focused вид по дизайну `Active Workout.html`. Полная замена UX:
hero + BigStepper + RPE 1-10 + CTA + RestTimer + список выполненных подходов.

Изменения:
- **Schema:** `workout_sets.rpe integer` (миграция `0007_add_rpe_to_workout_sets.sql`).
- **Backend DTO/service:** `AddSetDto.rpe` (`@Min(1) @Max(10)`),
  `service.addSet` пишет rpe.
- **Frontend types/hooks:** `WorkoutSet.rpe`, `useAddSet/useUpdateSet` принимают rpe.
- **Компоненты:**
  - `apps/web/src/components/workouts/active/big-stepper.tsx` —
    универсальный stepper (long-press scrubbing, 60px кнопки, 64px цифра).
  - `apps/web/src/components/workouts/active/rest-timer.tsx` —
    круговой таймер с +30/−30/пауза/skip.
  - `apps/web/src/components/workouts/active/active-workout.tsx` —
    основной компонент: TopBar, ExerciseStage, Hero, set-dots, RPE-grid (1-10),
    CTA, DoneSetsTable, навигация ←/→ между упражнениями, BodyweightToggle.
- **Страница:** `apps/web/src/app/(app)/workouts/[id]/active/page.tsx`.
  Если тренировка завершена — редирект на `/workouts/[id]`.
- **Кнопка перехода:** на `/workouts/[id]` — `glass-btn-primary` сверху.
  Текст: «Начать тренировку» (если ни одного выполненного подхода) /
  «Продолжить тренировку» (если есть хотя бы один).
- **Keyboard:** ↑↓ ±2.5 кг, ←→ ±1 повтор, Space = «Подход выполнен»,
  цифры 1–9 (и 0 для 10) = RPE.
- **Свой вес:** переключатель под BigStepper; при включении пишется
  `weightKg = 0` (сохранён существующий контракт).

### ✅ Drag & Drop упражнений
Зависимости: установлены `@dnd-kit/core`, `@dnd-kit/sortable`, `@dnd-kit/utilities`.

- **Backend:** `UpdateWorkoutExerciseDto.orderIndex` (`@Min(0)`),
  `service.updateExercise` пишет orderIndex.
- **Hook:** `useReorderWorkoutExercises(workoutId)` — bulk PATCH через
  `Promise.all`.
- **Компоненты:**
  - `apps/web/src/components/workouts/sortable-exercise-list.tsx` —
    переиспользуемый список с прогресс-полосками
    (используется в `ActiveWorkout` над AddExerciseDialog).
  - `apps/web/src/components/workouts/sortable-workout-exercises.tsx` —
    обёртка для существующих `ExerciseRow` карточек на `/workouts/[id]`
    (только когда тренировка активная).
  - `SortablePlanExercise` внутри `plan-builder.tsx` — drag handle для
    упражнений в дне.
- **Поведение:** PointerSensor distance=6, TouchSensor delay=200ms tolerance=8
  (чтобы не конфликтовать с тапом на мобиле).

### ✅ Achievements (`/achievements`)
Плоский grid 2/3/4 колонок (mobile/tablet/desktop), фильтры на отдельной строке,
чипы категорий, маркер цвета категории на карточке.

- Frontend type `AchievementCategory` приведён к реальному enum БД:
  `milestone | consistency | strength | volume | time | social`.
  (Раньше был устаревший `streak | pr | comeback`, что давало пустые чипы.)
- Цвета категорий: milestone=blue, consistency=orange, strength=green,
  volume=violet, time=yellow, social=red.
- Status-фильтры (Все/Получены/В процессе) — `whitespace-nowrap` +
  `flex-shrink: 0`.
- **Сохранены** улучшения сверх дизайна: `+points`-чип в карточке,
  отображение `current/target` рядом с %, дата получения.

## Что ещё в плане (по убыванию приоритета)

### ⏳ Dashboard / Today (`/dashboard`)
Дизайн `WebTabToday`: hero «Сегодня в зале» + Streak heatmap + Питание + PR +
вес тела со sparkline. Текущий dashboard 517 строк — содержит body-reminder и
кастомные метрики, которые надо аккуратно сохранить или вписать в новый layout.

Стратегия: компактный layout по дизайну, но сохранить функциональность
тела/PR/streak. Питания нет (фича не реализована) — карточку «Питание»
оставить как placeholder или скрыть до релиза nutrition-модуля.

### ⏳ Progress (`/progress`)
Дизайн `WebTabProgress`: фильтры периода (неделя/месяц/3мес/год), карточка
веса тела с большим sparkline, grid 2×2 с упражнениями (PR + sparkline за
несколько недель). Текущая страница уже использует `useProgress` и
`usePersonalRecords` — данные есть.

### ✅ Profile (`/profile`)
Hero-карточка по дизайну: avatar 72px (gradient orange→violet) + имя + email +
meta-строка с цифрами (тренировок · streak · PR). Карточка «Статистика» —
4 числа в 2 колонки с цветными иконками (тренировки=accent, серия=orange,
PR=green, ачивки=yellow). Использует `useGamificationOverview` и
`useWorkouts({ status: 'completed', limit: 1 })`.

Функциональные карточки (личные данные, пароль, тема, выход) сохранены —
их в дизайне нет, но они нужны.

### ⏳ Active Workout — потенциальные правки
- Right rail (320px) с streak/14-day calendar/today plan — на широком экране.
  Сейчас списки упражнений отображаются над AddExerciseDialog (обычной полосой).
- NextUp карточка после завершения упражнения.
- Анимация Toast на PR (сейчас только через CelebrationDialog).

### ⏳ Layout
Sidebar и BottomNav уже близки к дизайну, можно подровнять мелочи (collapse
кнопка в сайдбаре, ⌘1-⌘5 хинты).

### ⛔ Food
В макете есть `WebTabFood`. В проекте нет nutrition-фичи — пропускаем до
реализации модуля.

## Решения по UX (что не из макета)

- **Список упражнений в Active Workout** разместили **над AddExerciseDialog**
  (по запросу пользователя), а не справа как rail в дизайне. Работает и на
  мобиле, и на вебе одинаково.
- **D&D handle** в обычном `/workouts/[id]` — только когда тренировка
  активная. На завершённой не нужен.
- **RPE кнопки**: дизайн рисует 6-10 (пользователь сказал «на макете баг»),
  делаем **1–10**. БД constraint via DTO (`@Min(1) @Max(10)`).
- **Группировка по категориям в Ачивках** убрана (по дизайну) — заменена на
  чипы-фильтры. Так компактнее.

## Чек-лист перед мержем редизайна

- [ ] Прогнать руками все 4 темы (light/dark) на Active Workout, Achievements,
      перетаскивание в плане.
- [ ] Проверить мобильную версию (Pro Max 430px ширина).
- [ ] Проверить, что на завершённой тренировке кнопка «Активный режим» не
      рендерится.
- [ ] Сборка `apps/backend` (`npx tsc --noEmit`) и `apps/web`
      (`npx tsc --noEmit`) — без ошибок.
- [ ] Прокатиться по всем D&D местам: Active list, обычный `/workouts/[id]`,
      редактор плана.

## История миграции (хронологически)

1. 2026-05-10 — Active Workout каркас + UI + RPE миграция.
2. 2026-05-10 — Кнопки «Начать / Продолжить тренировку».
3. 2026-05-10 — D&D в Active list, обычной тренировке, редакторе плана.
4. 2026-05-10 — Достижения: тип категорий приведён к БД, плоский grid,
   фильтры, `--c-violet`.
5. 2026-05-10 — Profile: hero-карточка + Statistics, утилита `plural()`
   для русских склонений.
6. 2026-05-10 — Унифицированный цвет primary-кнопок: `.btn-primary-fill`
   в `Button.default` (включая «Сохранить», «Изменить пароль», «Сохранить план»).

## Файлы, которые трогаем чаще всего

- `apps/web/src/app/globals.css` — токены/цвета.
- `apps/web/src/app/(app)/workouts/[id]/page.tsx` — обычный режим тренировки.
- `apps/web/src/app/(app)/workouts/[id]/active/page.tsx` — активный режим.
- `apps/web/src/components/workouts/active/*.tsx` — компоненты активной.
- `apps/web/src/components/workouts/sortable-*.tsx` — D&D обёртки.
- `apps/web/src/components/plans/plan-builder.tsx` — редактор плана.
- `apps/web/src/app/(app)/achievements/page.tsx` — достижения.
- `apps/web/src/hooks/use-workouts.ts`, `use-gamification.ts` — типы и хуки.
- `apps/backend/src/db/schema.ts` + `apps/backend/drizzle/migrations/*` —
  схема БД.
- `apps/backend/src/workouts/dto/workout.dto.ts`,
  `workouts.service.ts` — backend DTO/service для подходов и упражнений.
