# Сборка GLB-моделей для 3D-аватара

Этот документ описывает one-time pipeline для генерации двух файлов:
- `apps/web/public/avatar/male.glb`
- `apps/web/public/avatar/female.glb`

Каждый файл — гуманоидный mesh с **7 shape keys** (morph targets):
`chest`, `waist`, `hips`, `arm`, `thigh`, `muscle`, `bodyFat`.

Pipeline нужно прогнать **один раз** (или при изменении набора morphs).
Результат коммитится в репо.

---

## Стек

- Blender 5.0.1 (или 4.5 LTS как fallback)
- MPFB2 — MakeHuman Plugin for Blender (open source)
- Python скрипт `generate_avatar_glb.py` (этот каталог)

---

## Шаг 1. Установить Blender

У тебя уже стоит **Blender 5.0.1**. Если в шаге 3 MPFB2 не запустится — скачай
**Blender 4.5 LTS** с https://www.blender.org/download/lts/ и поставь параллельно
(не удаляя 5.0.1).

## Шаг 2. Установить MPFB2

1. Скачать последний релиз:
   https://github.com/makehumancommunity/mpfb2/releases
   → файл вида `mpfb-v2.0.X.zip` (**не распаковывать**).
2. Открыть Blender → `Edit` → `Preferences` → `Add-ons` → `Install...`
3. Выбрать скачанный zip → `Install Add-on`.
4. Поставить галочку напротив `MPFB`.
5. Если в Blender 5.0.1 add-on не активируется или валится с ошибкой —
   перейти на Blender 4.5 LTS и повторить.

Проверка установки: в правом боковом меню `N` должен появиться таб `MPFB`.

## Шаг 3. Скачать MakeHuman assets

MPFB2 требует базовые данные от MakeHuman (mesh, targets, rigs):

1. В Blender → таб `MPFB` → раздел `System` (или `Settings`).
2. Кнопка `Download MakeHuman assets` (или аналог) — это качает базовый mesh
   и набор macro/measure targets (~200 MB).
3. Подождать (1-5 минут зависит от канала).

## Шаг 4. Запустить скрипт генерации

1. В Blender → `Scripting` workspace (вкладка наверху).
2. `Open` → выбрать `generate_avatar_glb.py` из этого каталога.
3. Прокрутить вниз файла — там константа `OUT_DIR`. По умолчанию указывает
   на `apps/web/public/avatar/` относительно репо. Если путь не работает —
   поправить на абсолютный (например, `C:/Users/roman/Projects/fitnessHelper/apps/web/public/avatar`).
4. Нажать `Run Script` (▶).
5. Смотреть на консоль Blender (`Window` → `Toggle System Console` на Windows):
   - сначала генерируется male → пишется `male.glb`
   - потом female → пишется `female.glb`
   - в логе должно быть `[avatar] DONE male`, `[avatar] DONE female`.

Время: ~2-5 минут.

## Шаг 5. Проверка результата

```
apps/web/public/avatar/male.glb       (~1-2 MB)
apps/web/public/avatar/female.glb     (~1-2 MB)
```

Можно открыть https://gltf-viewer.donmccurdy.com/ и подгрузить файл,
проверить что:
- модель видна
- в правом меню `Morph Targets` есть 7 названий: chest, waist, hips, arm, thigh, muscle, bodyFat
- слайдеры реально деформируют меш

---

## Если что-то сломалось

- **MPFB2 не активируется в 5.0.1** → пересядь на 4.5 LTS (шаг 1).
- **Нет meshes / targets** → переделать шаг 3 (Download MakeHuman assets).
- **Скрипт падает с `ModuleNotFoundError: mpfb`** → MPFB2 не активирован,
  проверь галочку в Add-ons.
- **GLB не появился** → проверь `OUT_DIR` в скрипте, проверь права на запись.
- **GLB без shape keys** → проверь логи Blender, скорее всего targets не
  скачались.

Подробности API MPFB2: https://github.com/makehumancommunity/mpfb2/wiki
