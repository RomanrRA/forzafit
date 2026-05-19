# Сборка GLB-моделей для 3D-аватара

Pipeline генерирует два файла:
- `apps/web/public/avatar/male.glb` (8 morphs)
- `apps/web/public/avatar/female.glb` (9 morphs — есть `breastSize`)

Morph targets (shape keys):
- общие: `chest`, `waist`, `hips`, `arm`, `thigh`, `calf`, `muscle`, `bodyFat`
- только female: `breastSize`

Запускается **headless** — Blender UI не нужен, GLB пишется на диск напрямую.

---

## Стек

- Blender 5.0 (или новее)
- MPFB2 — MakeHuman Plugin for Blender (открытый)
- MakeHuman system assets (`makehuman_system_assets_cc0.zip` от MakeHuman Community)

---

## Шаг 1. Установить Blender + MPFB2

1. Скачать **Blender 5.0+** с https://www.blender.org/download/
2. Скачать **MPFB2** с https://github.com/makehumancommunity/mpfb2/releases (файл `mpfb2-2.0.x.zip`).
3. В Blender → `Edit` → `Preferences` → `Add-ons` → `Install...` → выбрать zip → ✅ галочку.

## Шаг 2. Установить MakeHuman assets

1. Скачать `makehuman_system_assets_cc0.zip` (~150 MB) — обычно ссылка из MPFB UI или с сайта MakeHuman Community.
2. **В Blender (один раз, UI):** таб `MPFB` (правая панель `N` в 3D Viewport) → `System` → `Load asset pack` → выбрать zip.
3. Это распакует ассеты в:
   ```
   %APPDATA%\Blender Foundation\Blender\5.0\extensions\user_default\mpfb\data\
   ```

Проверка: внутри должны быть папки `3dobjs/`, `targets/`, `rigs/`, etc.

## Шаг 3. Запустить билдеры

Из корня репо (PowerShell):

```powershell
$blender = "C:\Program Files\Blender Foundation\Blender 5.0\blender.exe"
$dir = ".claude\worktrees\feat-avatar\scripts\avatar"
& $blender --background --python "$dir\build_male.py"
& $blender --background --python "$dir\build_female.py"
```

Каждый запуск ~30 секунд. Результат — два `.glb` в `apps/web/public/avatar/`.

В логе ищи `DONE — N/N morphs` — это значит всё сложилось.

## Шаг 4. Проверка

Открыть https://gltf-viewer.donmccurdy.com/ → drag-and-drop `male.glb` / `female.glb`:
- модель видна, узнаваемая фигура
- правая панель `Morph Targets` показывает все 8 (или 9 у female) имён
- слайдеры реально деформируют меш

---

## Структура скриптов

- `_avatar_common.py` — shared helpers: `clear_scene`, `call_load_target`, `bake_mix_to_mesh`, `load_target_as_shapekey`, `export_glb` + константы путей и `COMMON_MORPHS`.
- `build_male.py` — male-специфичная логика: macro keys male+caucasian+no-cup, baseline для гениталий, muscle/bodyFat male-варианты.
- `build_female.py` — female-специфичная: macro keys female+caucasian+cup, breastSize через `breast/female-young-...-maxcup-averagefirmness`.

Оба билдера подгружают `_avatar_common.py` через `exec(open(...).read())` — обычный `import` в Blender headless капризно ведёт себя с соседними файлами.

---

## Если что-то ломается

- **"MPFB не активирован"** → проверь галочку в Add-ons; перезапусти Blender.
- **"No file is selected for import"** при `load_target` → используй `directory=` + `files=` вместо чистого `filepath` (см. `call_load_target` в common).
- **Морф появился, но создал кучу `$md-` keys** → они автоматически удаляются в `load_target_as_shapekey`, остаётся только наш named morph.
- **Cupsize morph не находится** → `load_target_as_shapekey` теперь умеет fallback на `$md-`-key (потому что cup-targets из macro-семейства не создают "real" key).

---

Подробности MPFB2 API: https://github.com/makehumancommunity/mpfb2/wiki
