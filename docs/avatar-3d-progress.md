# 3D-аватар ForzaFit — живой статус разработки

Этот документ — журнал миграции фичи «3D-аватар клиента по замерам».
Обновлять после каждого шага, чтобы новая сессия Claude Code могла продолжить
без потерь после компакции / окончания токенов / обрыва связи.

**Текущий статус:** этап 2 завершён, ждём пользователя на прогоне Blender.

---

## Цель

Дать пользователю возможность увидеть себя в 3D по своим замерам, сравнить
«старт / сейчас / цель», крутить модель. Сильный мотивационный крючок до
геймификации Этапа 3.

## Стек

- **Backend:** NestJS + Drizzle. Новая таблица `body_goals` (one-to-one с users).
  Эндпоинты `GET /body-goals`, `PUT /body-goals`, `DELETE /body-goals`.
- **3D-моделинг:** Blender 5.0.1 (fallback 4.5 LTS) + MPFB2 (MakeHuman Plugin).
  One-time скрипт → 2 GLB-файла (male + female) с 7 shape keys.
- **Frontend:** Three.js + @react-three/fiber + @react-three/drei. Lazy import
  через `next/dynamic` чтобы не утяжелять основной бандл.
- **UX:** 1 canvas + табы «Сейчас / Старт / Цель» с плавной morph-интерполяцией.
- **Fallback при отсутствии замеров:** рендер по `users.weightKg/heightCm/gender`
  + P50 антропометрические нормы.

## Скоуп MVP

7 morph targets:
- 5 обхватов: `chest`, `waist`, `hips`, `arm`, `thigh`
- 2 общих: `muscle`, `bodyFat`

Страница `/avatar` (новая, отдельный пункт в Sidebar после «Замеры»):
- 1 canvas с OrbitControls (drag/zoom)
- Табы: Сейчас / Старт / Цель
- Кнопки: «Изменить замеры» → `/body`, «Задать цель» → `/avatar/goals`

Подстраница `/avatar/goals` — форма ввода целей (вес, % жира, обхваты,
целевая дата).

## Этапы разработки

### ✅ Этап 1. Backend `body_goals` (задача #8)

**Commit:** `e656c45 feat(body-goals): backend модуль body_goals для 3D-аватара`

Файлы:
- `apps/backend/src/db/schema.ts` — добавлена `bodyGoals` (PK userId, FK cascade,
  поля: weightKg, bodyFatPct, chestCm, waistCm, hipsCm, armCm, thighCm,
  targetDate) + `bodyGoalsRelations` + `bodyGoal` в `usersRelations`.
- `apps/backend/drizzle/migrations/0010_body_goals.sql` — миграция руками
  (не через `db:generate` — есть schema drift с password_hash, не моё).
- `apps/backend/drizzle/migrations/meta/_journal.json` — добавлен entry 10.
- `apps/backend/src/body-goals/`:
  - `body-goals.controller.ts` — GET/PUT/DELETE `/body-goals`
  - `body-goals.service.ts` — `findMine` (or null), `upsert` через
    `onConflictDoUpdate`, `delete`
  - `body-goals.module.ts`
  - `dto/body-goal.dto.ts` — `UpsertBodyGoalDto` со всеми полями опционально
- `apps/backend/src/app.module.ts` — зарегистрирован `BodyGoalsModule`.

**Проверки:** `npx tsc --noEmit` clean.

**Открытое:**
- В `bodyMeasurements` нет `thighCm`, в `bodyGoals` есть. На фронте для текущих
  обхватов thigh пока derive от hipsCm (или просто 0.5 morph weight). Если
  пользователю нужно — добавим миграцию для bodyMeasurements.thigh_cm позже.

### ✅ Этап 2. Blender pipeline (задача #4)

**Commit:** `67bf1f3 feat(avatar): Blender pipeline для генерации male/female GLB`

Файлы:
- `scripts/avatar/AVATAR_BUILD.md` — пошаговая инструкция (5 шагов):
  установка Blender → MPFB2 → MakeHuman assets → запуск скрипта → проверка GLB.
- `scripts/avatar/generate_avatar_glb.py` — Blender Python скрипт:
  - Создаёт male / female через `bpy.ops.mpfb.create_human` (с fallback
    на `bpy.ops.mpfb.new_human`)
  - Применяет macro gender
  - Для каждого morph пробует список target-имён (есть fallbacks под разные
    версии MPFB2)
  - Сохраняет deformed mesh как shape key через `shape_key_add(from_mix=True)`
  - Экспорт GLB с `export_morph=True`
  - Логирует прогресс в консоль Blender

Скрипт устойчив к разным версиям MPFB2 через `try/except` и списки
fallback-имён target.

**Конечный результат должен быть:**
- `apps/web/public/avatar/male.glb` (1-2 MB, 7 shape keys)
- `apps/web/public/avatar/female.glb` (1-2 MB, 7 shape keys)

**Статус:** ⏳ ждём пользователя на прогоне Blender (он установит и запустит).

### ⏳ Этап 3. Маппинг cm → morph weights (задача #6)

**Цель:** утилита `apps/web/src/lib/avatar-morphs.ts` с функциями:
- `bodyToMorphs(body: BodyMeasurement | null, user: User): Record<MorphKey, number>`
- `goalsToMorphs(goals: BodyGoals | null, user: User): Record<MorphKey, number>`

Калибровка через антропометрические P50-нормы:
- Зависят от gender + heightCm.
- Берём табличные значения P50 / P10 / P90 → линейная интерполяция в [0..1].
- Для muscle / bodyFat:
  - bodyFat по `users.bodyFatPct` либо derived от weight/BMI
  - muscle — derived от PR в тренировках + weight (или просто константа 0.5 на v1)

**Зависимостей нет, чистый TS.** Может делаться параллельно с Этапом 2.

### ⏳ Этап 4. AvatarViewer на R3F (задача #5)

**Цель:** компонент `apps/web/src/components/avatar/avatar-viewer.tsx`.

Зависимости (`npm install --legacy-peer-deps`):
- `three`
- `@react-three/fiber`
- `@react-three/drei`

Компонент:
- `<Canvas>` от R3F с lights (ambient + directional)
- `useGLTF('/avatar/male.glb')` либо `/female.glb` по полу
- `OrbitControls` от drei (вращение drag-ом, zoom скроллом)
- `applyMorphs(scene, morphWeights)` — итерация по `mesh.morphTargetInfluences`
  с lerp от текущих к целевым (плавный переход между табами)
- Skeleton-плейсхолдер пока грузится модель
- Lazy import: `dynamic(() => import('@/components/avatar/avatar-viewer'),
  { ssr: false, loading: () => <Skeleton /> })`

### ⏳ Этап 5. Страница `/avatar` + цели (задача #7)

Файлы:
- `apps/web/src/app/(app)/avatar/page.tsx` — главная:
  - Табы «Сейчас / Старт / Цель»
  - `<AvatarViewer morphs={...} />` (один экземпляр, morphs меняются)
  - Кнопки «Изменить замеры» (→ `/body`), «Задать цель» (→ `/avatar/goals`)
  - Если нет замеров → CTA «Добавьте замеры для точности», рендер по weight/height
- `apps/web/src/app/(app)/avatar/goals/page.tsx` — форма ввода целей
- `apps/web/src/hooks/use-body-goals.ts` — TanStack Query (useBodyGoals,
  useUpsertBodyGoals, useDeleteBodyGoals)
- `apps/web/src/components/layout/sidebar.tsx` — добавить пункт «Аватар»
  после «Замеры». Иконка `User` или `Sparkles` из lucide.

## Где остановились / следующий шаг

**2026-05-14 (вечер, конец дня):**
- ✅ Этап 1 закоммичен
- ✅ Этап 2 закоммичен (скрипт + инструкция)
- ⏳ **Пользователь:** Blender 5.0.1 установлен, MPFB2 активирован (`Build info: FROM_SOURCE, Blender (5,0,1), Python (3,11,13)`).
- ⛔ **Текущий блокер:** MakeHuman system assets не установлены — в панели «Apply assets» висит предупреждение «It seems the makehuman system... have not been installed». Без них `bpy.ops.mpfb.create_human` упадёт.
- 🔜 **Следующий шаг (на завтра):**
  1. В Blender → панель MPFB → `System and resources` → `Web resources` → кнопка `Asset packs`.
  2. Скачать пакеты «MakeHuman system data» и «MakeHuman target packs» (см. https://github.com/makehumancommunity/mpfb2/wiki/Installing-MPFB → секция «Installing system assets»).
  3. Распаковать в каталог `System data` (видно в `Directories` → кнопка `System data`).
  4. Перезапустить Blender.
  5. Проверить через `New human` → `From scratch` — должен создаться базовый человек.
  6. Запустить `scripts/avatar/generate_avatar_glb.py` через Scripting workspace.
- 🔜 После получения `male.glb` + `female.glb`:
  1. Закоммитить GLB-файлы в `apps/web/public/avatar/`
  2. Перейти к Этапу 3 (cm → morph weights)
  3. Потом Этап 4 (R3F)
  4. Потом Этап 5 (страница)

Worktree: `.claude/worktrees/feat-avatar`, branch `worktree-feat-avatar`.
Коммиты:
- `e656c45` — Этап 1 (backend)
- `67bf1f3` — Этап 2 (Blender pipeline)

## Открытые вопросы

1. **bodyMeasurements.thighCm** — добавлять колонку в текущих замерах или
   derive в UI от hipsCm? Решение отложено, на v1 derive.
2. **Цвет / стиль аватара** — нейтральная заливка по умолчанию. Кастомизация
   (skin/hair) — Stage 2.
3. **Гендер при `users.gender = null`** — рендерим male по умолчанию или
   нейтральный? Решение пока: показать pre-page выбор пола перед первым
   рендером.
4. **Производительность** — drei `useGLTF` кэширует, OrbitControls дёшево.
   На бюджетном Android всё должно идти 30+ fps. Тестировать на этапе 5.

## Файлы, которые трогает фича

Backend:
- `apps/backend/src/db/schema.ts`
- `apps/backend/drizzle/migrations/0010_body_goals.sql`
- `apps/backend/drizzle/migrations/meta/_journal.json`
- `apps/backend/src/body-goals/*` (новый модуль)
- `apps/backend/src/app.module.ts`

Pipeline:
- `scripts/avatar/AVATAR_BUILD.md`
- `scripts/avatar/generate_avatar_glb.py`

Артефакты:
- `apps/web/public/avatar/male.glb` (будет после Этапа 2 прогона)
- `apps/web/public/avatar/female.glb` (будет после Этапа 2 прогона)

Frontend (после Этапа 2):
- `apps/web/src/lib/avatar-morphs.ts`
- `apps/web/src/components/avatar/avatar-viewer.tsx`
- `apps/web/src/app/(app)/avatar/page.tsx`
- `apps/web/src/app/(app)/avatar/goals/page.tsx`
- `apps/web/src/hooks/use-body-goals.ts`
- `apps/web/src/components/layout/sidebar.tsx` (добавить пункт)
- `apps/web/package.json` (three, @react-three/fiber, @react-three/drei)
