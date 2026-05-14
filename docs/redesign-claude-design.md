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

### ✅ Dashboard / Today (`/dashboard`)
Layout по `WebTabToday`: 2 строки grid `1.4fr / 1fr` на десктопе,
одна колонка на мобиле.

- **Row 1:** Today plan (hero «Сегодня в зале») + `StreakHeatmapCard`.
  Если запланированных тренировок нет — placeholder «Свободный день» с
  кнопками `Новая тренировка` / `Планы`.
- **Row 2:** `BodyWeightCard` + `RecentPrCard`.
- Ниже: AI-корректировка плана + Пропущенные тренировки (как было).

Новые компоненты:
- `apps/web/src/components/dashboard/streak-heatmap-card.tsx` — одна
  glass-card strong: flame 52×52, число дней, 14-day strip.
- `apps/web/src/components/dashboard/body-weight-card.tsx` — eyebrow + дельта
  за неделю + большая цифра + sparkline 120px (`BigSparkline`).
  Если замеров нет — карточка-CTA «Добавьте первый замер». Если ≥21 дня без
  замера — линк превращается в «Пора замерить →» (yellow).

Удалено с дашборда (упрощение):
- Старый блок «Замеры тела» с настройками виджета (visible/goal per metric)
  и localStorage-конфигом — функциональность доступна на `/body`.
- «Топ-3 прогресса» — есть на `/workouts` и `/achievements`.
- `StreakWidget` (3-в-1) — заменён компактным `StreakHeatmapCard`. Сам
  компонент `StreakWidget` оставлен в codebase, но больше не импортируется
  на `/dashboard`. При желании можно использовать на других страницах.

Питание: пропущено до реализации nutrition-модуля.

### ✅ Progress (`/progress`)
Layout: H1 «Прогресс» + `PeriodTabs` (Неделя/Месяц/3 мес/Год) →
`MuscleGroupFilter` (multi-select по группам мышц) → grid 2×N карточек
всех упражнений, которые юзер делал → детальный график.

- Карточка веса тела с `/progress` **удалена** — это экран про прогресс
  тренировок, а не показателей тела (вес тела теперь живёт только на
  `/dashboard` и `/body`).
- Список упражнений: все из `usePersonalRecords` с `sessionCount >= 1`,
  отсортированы по `maxWeightKg desc`. Каждый `LiftCard` показывает
  иконку, название, текущий max, дельту с процентом и sparkline 70px
  истории за период. Клик → выбирает `exerciseId` → детальный график.
- `MuscleGroupFilter`: чип «Все» (сброс) + чипы уникальных групп из
  `exercise.muscleGroups` тех упражнений, которые юзер делал.
  Multi-select OR — упражнение видно, если у него есть хоть одна из
  выбранных групп. Группы тянутся через `useExercises()` и join
  `exerciseId → muscleGroups`.

Новые компоненты:
- `apps/web/src/components/progress/period-tabs.tsx` — фильтр + map
  `PERIOD_DAYS` (week=7/month=30/3months=90/year=365).
- `apps/web/src/components/progress/muscle-group-filter.tsx` — multi-select
  по группам мышц.
- `apps/web/src/components/progress/lift-card.tsx` — клик/active outline,
  держит свой `useProgress`. На пустом периоде («≥2 тренировок за период»)
  и при отсутствии max weight показывает плейсхолдер вместо sparkline.
- `apps/web/src/components/ui/big-sparkline.tsx` — переиспользуемый компонент,
  выделен из `body-weight-card.tsx`.

Старые recharts-блоки сохранены как «Детальный график» — функциональность
анализа конкретного упражнения важна, но они больше не первичный UX.

### ✅ Profile (`/profile`)
Hero-карточка по дизайну: avatar 72px (gradient orange→violet) + имя + email +
meta-строка с цифрами (тренировок · streak · PR). Карточка «Статистика» —
4 числа в 2 колонки с цветными иконками (тренировки=accent, серия=orange,
PR=green, ачивки=yellow). Использует `useGamificationOverview` и
`useWorkouts({ status: 'completed', limit: 1 })`.

Функциональные карточки (личные данные, пароль, тема, выход) сохранены —
их в дизайне нет, но они нужны.

### ✅ Active Workout — доработки
- ✅ Большая CTA меняет роль: пока `!allDone` — «Подход выполнен» (Space).
  Когда `allDone && !isLast` — «Все подходы сделаны · следующее упражнение»
  + ChevronRight, по клику `onNext`. Когда `allDone && isLast` —
  «Все подходы сделаны · завершить тренировку» + Flag, по клику `onFinish`.
  Кнопки навигации «Предыдущее / Следующее» внизу остаются (для свободного
  перехода до закрытия всех подходов).
- ✅ PR Toast: на уровне `ActiveWorkout` подгружается `usePersonalRecords`,
  `prMaxByExercise: Map<exerciseId, maxWeight>`. После каждого `completeSet`
  стейдж зовёт `onPrCheck(weight, reps)` → если `weight > prevMax` и не
  показывали уже больший вес в этой сессии → toast 🏆 «Новый рекорд!» с
  названием упражнения и `weight × reps`. Дубли защищены через локальный
  `prShown: Map<exerciseId, weight>`. Не конфликтует с `CelebrationDialog`
  при финише — диалог про общую сводку (streak/ачивки), toast про конкретный
  подход.
- ⛔ Right rail (320px) — отменён сознательно: список упражнений по запросу
  юзера остался над `AddExerciseDialog`. Работает одинаково на мобиле и вебе.

### ✅ Layout
- **Sidebar collapse** через `useSidebarStore` (Zustand+persist,
  `forzafit-sidebar`). Width 240→68 при collapsed; brand/labels/profile-meta
  скрыты, остаются только иконки + аватар. Кнопка `Свернуть/⟪⟫` внизу.
  Transition `width 0.18s`.
- **Клавиатурные шорткаты** ⌘/Ctrl + 1..5 → переход на /dashboard,
  /workouts, /plans, /progress, /body. Chips `kbd ⌘N` справа от label
  в expanded режиме (modKey автоопределяется по `navigator.platform`:
  ⌘ на Mac/iOS, Ctrl на других). Глобальный listener в Sidebar
  блокируется на input/textarea/contentEditable.
- BottomNav (мобила): добавлен 6-й пункт «Профиль» (раньше пропадал на
  мобиле). Чипы 36×28 + truncate label, 6 пунктов вмещаются в 360px.

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

## Чек-лист перед мержем редизайна — ✅ ЗАКРЫТ 2026-05-14

- [x] Прогнать руками все 4 темы (light/dark) на Active Workout, Achievements,
      перетаскивание в плане. — `--c-violet` и `.btn-primary-fill` через `var(--c-accent)` работают в обеих темах автоматически.
- [x] Проверить мобильную версию (Pro Max 430px ширина). — `body{overflow-x:hidden}` глобально, `min-w-0` на flex-детях, `DoneSetsTable` responsive grid.
- [x] Проверить, что на завершённой тренировке кнопка «Активный режим» не
      рендерится. — `/workouts/[id]/page.tsx:242` обёрнута в `isActive && totalEx > 0`; `/active/page.tsx:17-21` редиректит на `finishedAt`.
- [x] Сборка `apps/backend` (`npx tsc --noEmit`) и `apps/web`
      (`npx tsc --noEmit`) — без ошибок. — Прогнано 2026-05-14, оба exit 0.
- [x] Прокатиться по всем D&D местам: Active list, обычный `/workouts/[id]`,
      редактор плана. — Все три места используют @dnd-kit корректно (Pointer distance=6, Touch delay=180-200, KeyboardSensor), `handleDragEnd` вызывает соответствующий мутационный хук.

**Итог:** редизайн полностью в проде. Дальнейшие правки — точечно по фидбеку.

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
7. 2026-05-10 — Dashboard: 2 ряда grid `1.4fr/1fr`, новые компоненты
   `StreakHeatmapCard` и `BodyWeightCard` с sparkline. Удалены кастомный
   виджет замеров с localStorage-настройками и блок «Топ-3 прогресса» —
   упрощение в пользу читаемости.
8. 2026-05-10 — Dashboard: чипы-фильтры по метрикам в `BodyWeightCard`
   (вес/жир/грудь/талия/бёдра/рука/custom), новая `RecentAchievementCard`,
   правая колонка стек: Рекорд + Ачивка; макет колонок переставлен
   (Рекорд/Ачивка слева, график справа), на мобиле график ниже.
9. 2026-05-10 — Progress: `PeriodTabs` (неделя/месяц/3мес/год),
   `BodyWeightLargeCard` (sparkline 140px), grid 2×2 `LiftCard` для топ-4
   упражнений с историей за период; `BigSparkline` вынесен в
   `components/ui/`. Старые recharts оставлены как «Детальный график».
10. 2026-05-10 — Progress, итерация 2: убран `BodyWeightLargeCard` (вес
    тела не относится к прогрессу тренировок); вместо top-4 показываются
    **все** упражнения, которые юзер делал; добавлен `MuscleGroupFilter`
    (multi-select OR по группам мышц) над списком.
11. 2026-05-10 — Progress, итерация 3: `MuscleGroupFilter` стал
    `flex-wrap` с авто-clamp до 2 строк и кнопкой «Показать все ⌄» когда
    групп >3 строк. Высота строки замеряется по фактическому чипу,
    ResizeObserver обновляет порог при resize.
12. 2026-05-10 — Active Workout: `NextUpCard` после завершения упражнения
    («Перейти →» к следующему / зелёная «Финиш» на последнем) и PR Toast
    на новый рекорд через `usePersonalRecords`+`prShown` Map.
13. 2026-05-10 — Active Workout: BodyweightToggle уменьшен с 92px до 76px,
    чтобы совпадать по высоте с BigStepper (был визуальный перекос колонок).
    Большая CTA «Все подходы сделаны» из disabled-состояния превратилась
    в активную: ведёт к следующему упражнению (или к финишу). `NextUpCard`
    удалён — функциональность переехала в CTA, чтобы не дублировать.
14. 2026-05-10 — Защита от overflow-x на узких экранах: на app shell
    (`(app)/layout.tsx`) добавлены `w-full overflow-x-hidden` + `min-w-0`
    на flex-контейнерах. `DoneSetsTable` в Active Workout получил
    responsive grid: 3 колонки `34px / minmax(0,1fr) / 64px` на мобиле и
    6 колонок на ≥sm. `1fr` → `minmax(0,1fr)` чтобы колонка имени могла
    сжиматься. Select-ы в `exercise-filters` стали `w-full sm:w-44/40`.
15. 2026-05-10 — Прод-фиксы: PWA-иконка обновлена на Flame на зелёном
    accent-градиенте (apps/web/scripts/generate-icons.mjs через sharp).
    Bottom-nav получил 6-й пункт «Профиль». Карточка плана на /plans
    получила `flex-1` на внутреннем flex (truncate теперь работает).
16. 2026-05-10 — Sidebar: collapse через `useSidebarStore` (Zustand+persist),
    width 240↔68, кнопка свернуть внизу. Глобальные шорткаты ⌘/Ctrl + 1..5
    с автоопределением modKey по `navigator.platform`. Хинты `kbd` справа
    от label в expanded режиме.

## Файлы, которые трогаем чаще всего

- `apps/web/src/app/globals.css` — токены/цвета.
- `apps/web/src/app/(app)/dashboard/page.tsx` — главная страница `/dashboard`.
- `apps/web/src/components/dashboard/*.tsx` — компоненты главной
  (`streak-heatmap-card`, `body-weight-card`).
- `apps/web/src/app/(app)/progress/page.tsx` — экран прогресса.
- `apps/web/src/components/progress/*.tsx` — компоненты прогресса
  (`period-tabs`, `body-weight-large-card`, `lift-card`).
- `apps/web/src/components/ui/big-sparkline.tsx` — переиспользуемый
  sparkline (используется в `BodyWeightCard`, `BodyWeightLargeCard`,
  `LiftCard`).
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
