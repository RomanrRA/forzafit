# 3D-аватар ForzaFit — живой статус разработки

Этот документ — журнал миграции фичи «3D-аватар клиента по замерам».
Обновлять после каждого шага, чтобы новая сессия Claude Code могла продолжить
без потерь после компакции / окончания токенов / обрыва связи.

**Текущий статус (2026-05-19):** все 5 этапов MVP закрыты в worktree
`feat-avatar`. Сверху доделаны причёски/глаза/скины и dev-переключатель пола.
Ветка ещё не слита в main — ждём локальной проверки и решения по размеру GLB
(female.glb = 133 МБ, в .gitignore).

---

## Цель

Дать пользователю возможность увидеть себя в 3D по своим замерам, сравнить
«старт / сейчас / цель», крутить модель. Сильный мотивационный крючок до
геймификации Этапа 3.

## Стек

- **Backend:** NestJS + Drizzle. Новая таблица `body_goals` (one-to-one с users).
  Эндпоинты `GET /body-goals`, `PUT /body-goals`, `DELETE /body-goals`.
- **3D-моделинг:** Blender 5.0.1 + MPFB2 (MakeHuman Plugin). Pipeline из трёх
  скриптов (`_avatar_common.py` + `build_male.py` + `build_female.py`) → 2 GLB
  с 7 shape keys, набором причёсок и каноническими именами объектов
  (eyes/teeth/tongue/eyelashes) для three.js.
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

### ✅ Этап 2. Blender pipeline (задача #4)

**Коммиты:**
- `67bf1f3 feat(avatar): Blender pipeline для генерации male/female GLB`
  — первый цельный скрипт `generate_avatar_glb.py` + `AVATAR_BUILD.md`.
- `fe64d18 feat(avatar): причёски/глаза/скины + переключатель пола в UI`
  — pipeline переработан в модульный.

Итоговая структура `scripts/avatar/`:
- `_avatar_common.py` (561 строка) — общий код:
  - 7 shape keys (chest/waist/hips/arm/thigh/muscle/bodyFat) через
    `shape_key_add(from_mix=True)` с fallback-именами target.
  - `BODY_PARTS` с каноническими именами `eyes/teeth/tongue/eyelashes`
    (переименование MPFB-объектов после `load_library_proxy`, чтобы three.js
    мог найти их по имени).
  - `HAIR_FEMALE/HAIR_MALE/HAIR_UNISEX` + `load_hair_variants` через
    `load_library_clothes` (MPFB hair type="clothes" в JSON pack).
- `build_male.py` — 2 причёски (culturalibre_02, culturalibre_05) → `male.glb`
  ≈ 8.7 МБ. Других реально мужских причёсок в hair01_cc0 нет; «Без причёски» у
  М недоступно из-за delete-groups в hair-mhclo (вырезают вершины макушки).
- `build_female.py` — 11 причёсок (bobs, косы, пучок, длинные/аниме и т.п.)
  → `female.glb` ≈ 133 МБ. ⚠ Слишком большой, оптимизация ниже.
- `AVATAR_BUILD.md` — пошаговая инструкция.

**Артефакты (в `.gitignore`):**
- `apps/web/public/avatar/male.glb`
- `apps/web/public/avatar/female.glb`

На main эти файлы лежат untracked (результат прогона Blender пользователем).

### ✅ Этап 3. Маппинг cm → morph weights (задача #6)

Файлы:
- `apps/web/src/lib/avatar-morphs.ts` — типы `MorphKey`, набор ключей.
- `apps/web/src/lib/avatar-morphs-from-body.ts` — функции расчёта morph
  weights из `BodyMeasurement` / `BodyGoal` / `User`. P50-калибровка по
  gender + heightCm.

### ✅ Этап 4. AvatarViewer на R3F (задача #5)

Файл: `apps/web/src/components/avatar/avatar-viewer.tsx` (≈ 1207 строк).

Что внутри:
- `<Canvas>` от R3F, ambient 1.4 + key 2.4 + rim сзади.
- `useGLTF('/avatar/male.glb' | '/avatar/female.glb')` по полу.
- `OrbitControls` (drag/zoom).
- Lerp morph weights между текущим и целевым состоянием — плавный переход
  между табами.
- **Skin diffuse-текстуры:** 36 пресетов MakeHuman (23 жен, 13 муж) через
  `TextureLoader`. У body нет своего diffuse → ставим `mat.map` напрямую.
  `roughness=0.55`, `color × 1.15` — кожа перестала выглядеть «бархатной».
- **Цвет глаз:** подмена `mat.map` на готовую eye-текстуру MakeHuman
  (`/avatar/eyes/<key>.png`, 9 пресетов). Без shader-патчей и canvas-tint.
- **Причёски:** через `mesh.visible` по имени `hair_<key>`.
- **Dev-переключатель М/Ж** над canvas (для теста, сбрасывает overrides).
- Lazy import: `dynamic(..., { ssr: false, loading: () => <Skeleton /> })`.

Зависимости (`apps/web/package.json`): `three`, `@react-three/fiber`,
`@react-three/drei`.

### ✅ Этап 5. Страница `/avatar` + цели (задача #7)

Файлы:
- `apps/web/src/app/(app)/avatar/page.tsx` (≈ 180 строк) — табы
  «Сейчас / Старт / Цель», `<AvatarViewer>`, CTA «Добавьте замеры» если пусто.
- `apps/web/src/app/(app)/avatar/goals/page.tsx` — форма ввода целей.
- `apps/web/src/hooks/use-body-goals.ts` — TanStack Query
  (`useBodyGoals`, `useUpsertBodyGoals`, `useDeleteBodyGoals`).
- `apps/web/src/components/layout/sidebar.tsx` — пункт «Аватар» после «Замеры».
- `apps/web/src/components/layout/bottom-nav.tsx` — пункт «Аватар» в моб. навигации.
- `apps/web/src/app/globals.css` — стили под avatar viewer (canvas-фон,
  переходы).

## Ассеты

- **Eye-текстуры** (9 шт, ~6 МБ) — в репо: `apps/web/public/avatar/eyes/*.png`.
- **Skin-текстуры** (36 шт, ~150 МБ) — в `.gitignore`, копируются из
  MakeHuman паков (skins01_cc0 / skins02_cc0).
- **GLB-ы** — в `.gitignore` (генерируются Blender pipeline). На main лежат
  untracked: `male.glb` + `female.glb`.

## Где остановились / следующий шаг

**2026-05-24:** одежда тянется за морфами тела + оптимизация GLB. Локально
проверено пользователем («ок»). Ветка готова к мерджу.

### Что доделано 2026-05-24

1. **Трусы/бра тянутся за морфами тела.** В `_avatar_common.py`:
   - `transfer_body_shapekeys_to_clothes(body, slot_to_shape_keys)` — для каждого
     clothes-меша в сцене создаёт shape keys с теми же именами, что у body,
     и заполняет их координатами через MPFB `Mhclo.verts` (barycentric).
   - **Fallback nearest-vertex** (`_build_clothes_to_body_nearest`): если MHCLO
     ссылается на удалённые helper-вершины (>= len(body.vertices) после
     `delete_helpers`), используется ближайшая body-вершина и одежда
     сдвигается жёстко на её дельту. Менее точно (без локального вращения),
     но универсально.
   - **Почему нужен fallback:** MHCLO от WojackOWL (boxer_briefs) и joepal
     (simple_shorts) ссылаются на body-вершины (индексы 4000-13000, выживают).
     MHCLO от wolgade (panties, bra) ссылается на helper-вершины (17000+,
     удаляются `delete_helpers`). Поэтому у мужчины простой barycentric
     работает «из коробки», а у женщины — только через fallback.
   - В `build_male.py`/`build_female.py` добавлен вызов transfer после
     `load_target_as_shapekey`.
2. **Фикс z-fighting body↔clothes** в `avatar-viewer.tsx`: к материалам
   `clothes_*` применён `polygonOffset: true, factor=-2, units=-2,
   renderOrder=1`. Без этого кожа просвечивала сквозь трусы/бра.
3. **«Без причёски» включено для мужчин** (раньше только female из-за
   дыры в макушке от hair-mhclo delete-groups; теперь pipeline снимает
   Mask-модификаторы перед export через `strip_hair_mask_modifiers`).
4. **Body mesh ищется по имени** (`human`/`base`), а не max-vertex —
   у женщин hair_anime (91k верт) больше body (14k) и скин уходил на причёску.
5. **Hair-материалы переведены на alpha-test** (`depthWrite=true,
   alphaTest=0.5, DoubleSide`) — фикс «каши» при вращении.
6. **Cache-buster** в URL GLB поднят до `?v=7` после каждого ребилда.

### Оптимизация GLB 2026-05-24

Прогон `gltf-transform`: `resize 1024 → webp q=80 → dedup → prune`. Результат:
- `female.glb`: **130 МБ → 10.2 МБ** (12.8×)
- `male.glb`: **12 МБ → 4.9 МБ** (2.5×)

Морфы сохранены полностью (проверено node-инспектором: те же sparse/dense
дельты до и после). На разрешении viewport ≈ 600px разница 4096→1024 текстур
визуально незаметна.

### Что осталось до выкатки

1. **Закоммитить uncommitted правки в worktree** (этот файл +
   `_avatar_common.py`, `build_male.py`, `build_female.py`, `avatar-viewer.tsx`).
2. **Слить `feat-avatar` → `main`.**
3. **Решить как доставлять GLB на прод** — больше не критично (10 МБ норм для
   первой загрузки, дальше браузер кеширует):
   - (a) Закоммитить в `apps/web/public/avatar/`, убрать из .gitignore.
     Раздуваем репо на 15 МБ, но это разовая операция (новые GLB не каждый день).
   - (b) Хранить в S3/CDN, грузить по абсолютному URL.
4. **Удалить мусор** `apps/web/public/avatar/bash.exe.stackdump` на main.
5. `bash deploy.sh forzafit.ru`.
6. (Опционально, отложено) `bodyMeasurements.thighCm` — добавить колонку
   или derive в UI от hipsCm. На v1 derive.

Worktree: `.claude/worktrees/feat-avatar`, branch `worktree-feat-avatar`.
Коммиты (от main):
- `e656c45` — Этап 1 (backend body_goals)
- `67bf1f3` — Этап 2 первой версии (один Blender-скрипт)
- `3e491cb` — журнал (первая версия)
- `0522850` — журнал, фиксация блокера на MH system assets
- `fe64d18` — Этап 2 переработка + Этапы 3-5 + причёски/глаза/скины/UI

## Открытые вопросы

1. **bodyMeasurements.thighCm** — добавлять колонку или derive в UI от
   hipsCm? Решение отложено, на v1 derive.
2. **female.glb 133 МБ** — оптимизация обязательна перед мерджем
   (см. «Следующий шаг» п. 1).
3. **Гендер при `users.gender = null`** — рендерим male по умолчанию или
   нейтральный? Решение пока: показать pre-page выбор пола перед первым
   рендером. (Dev-переключатель в viewer покрывает ручной кейс.)
4. **Хранение GLB** — в репо или в CDN? См. п. 3 выше.
5. **Производительность** — drei `useGLTF` кэширует, OrbitControls дёшево.
   На бюджетном Android всё должно идти 30+ fps. Тестировать на прод-сборке.

## Файлы, которые трогает фича

Backend:
- `apps/backend/src/db/schema.ts`
- `apps/backend/drizzle/migrations/0010_body_goals.sql`
- `apps/backend/drizzle/migrations/meta/_journal.json`
- `apps/backend/src/body-goals/*` (новый модуль)
- `apps/backend/src/app.module.ts`

Pipeline:
- `scripts/avatar/AVATAR_BUILD.md`
- `scripts/avatar/_avatar_common.py`
- `scripts/avatar/build_male.py`
- `scripts/avatar/build_female.py`

Артефакты (в .gitignore):
- `apps/web/public/avatar/male.glb`
- `apps/web/public/avatar/female.glb`
- `apps/web/public/avatar/skins/*` (~150 МБ)

В репо:
- `apps/web/public/avatar/eyes/*.png` (9 шт)

Frontend:
- `apps/web/src/lib/avatar-morphs.ts`
- `apps/web/src/lib/avatar-morphs-from-body.ts`
- `apps/web/src/components/avatar/avatar-viewer.tsx`
- `apps/web/src/app/(app)/avatar/page.tsx`
- `apps/web/src/app/(app)/avatar/goals/page.tsx`
- `apps/web/src/hooks/use-body-goals.ts`
- `apps/web/src/components/layout/sidebar.tsx`
- `apps/web/src/components/layout/bottom-nav.tsx`
- `apps/web/src/app/globals.css`
- `apps/web/package.json` (three, @react-three/fiber, @react-three/drei)
