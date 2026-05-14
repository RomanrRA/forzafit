"""
Генерация male.glb + female.glb с 7 shape keys для 3D-аватара ForzaFit.

Запуск: Blender 5.0.1 (или 4.5 LTS) → Scripting → Open → этот файл → Run.
Требует установленный и активированный MPFB2.

Что делает:
  1. Создаёт базового мужского MakeHuman-персонажа.
  2. Для каждого morph (chest/waist/hips/arm/thigh/muscle/bodyFat):
       - применяет target с весом +1.0
       - копирует deformed vertices в shape key
       - сбрасывает target к нейтрали
  3. Экспортирует GLB с shape keys.
  4. Повторяет для женского персонажа.

Если MPFB2 API в этой версии Blender отличается — функция
`apply_target_as_shape_key` написана через generic подход на bpy ops,
он должен работать. Если что-то падает — см. логи и комментарии внизу.
"""

import os
import sys
import bpy

# ─── Конфиг ─────────────────────────────────────────────────────────

# Куда писать GLB. Если репо лежит не по этому пути — поправь руками.
OUT_DIR = os.path.normpath(os.path.join(
    os.path.dirname(bpy.data.filepath) if bpy.data.filepath else os.getcwd(),
    "..", "..", "apps", "web", "public", "avatar"
))

# Названия shape keys в финальном GLB → имя MakeHuman target, который их даёт.
# Веса (+1.0 / -1.0) для типичных macro/measure targets:
#   chest-cup -> +1.0 увеличивает грудь
#   stomach -> +1.0 увеличивает живот
#   etc.
# Если конкретное имя target не находится — попробуем альтернативные ниже.
MORPHS = [
    # (shape_key_name, macro_or_target_name, weight)
    ("chest",   "macrodetail-universal-muscle",     0.0),  # placeholder, override below
    ("waist",   "measure-waist-decrease",           1.0),
    ("hips",    "measure-hips-increase",            1.0),
    ("arm",     "measure-upperarm-circ-increase",   1.0),
    ("thigh",   "measure-thigh-circ-increase",      1.0),
    ("muscle",  "macrodetails-universal/Muscle",    1.0),
    ("bodyFat", "macrodetails-universal/Weight",    1.0),
]

# Названия measure targets отличаются от версии к версии. Список fallback
# имён, которые скрипт перепробует, пока не найдёт реально существующий
# target в MakeHuman/MPFB2 каталоге.
MORPH_FALLBACKS = {
    "chest":   ["measure-bust-increase", "macrodetail-chest", "breast-cup1"],
    "waist":   ["measure-waist-decrease", "waist-narrow", "stomach-decrease"],
    "hips":    ["measure-hips-increase", "hip-wide"],
    "arm":     ["measure-upperarm-circ-increase", "upperarm-width"],
    "thigh":   ["measure-thigh-circ-increase", "thigh-volume-increase"],
    "muscle":  ["macrodetails-universal/Muscle", "macrodetail-muscle"],
    "bodyFat": ["macrodetails-universal/Weight", "macrodetail-weight"],
}


# ─── Helpers ────────────────────────────────────────────────────────

def log(msg):
    print(f"[avatar] {msg}", flush=True)


def clear_scene():
    bpy.ops.object.select_all(action='SELECT')
    bpy.ops.object.delete(use_global=False)
    for block in (bpy.data.meshes, bpy.data.armatures, bpy.data.materials, bpy.data.images):
        for item in list(block):
            if item.users == 0:
                block.remove(item)


def create_human(gender: str):
    """gender: 'male' | 'female'. Создаёт базового MakeHuman-персонажа через MPFB2."""
    log(f"create_human({gender})")
    try:
        # MPFB2 API: создать human через NewHumanOperator
        bpy.ops.mpfb.create_human(scale_factor='DECIMETER')
    except Exception as e:
        log(f"FAILED bpy.ops.mpfb.create_human: {e}")
        log("Пробую альтернативу: bpy.ops.mpfb.new_human")
        try:
            bpy.ops.mpfb.new_human()
        except Exception as e2:
            log(f"FAILED bpy.ops.mpfb.new_human: {e2}")
            raise

    # Найти созданный mesh (basemesh)
    body = None
    for obj in bpy.context.scene.objects:
        if obj.type == 'MESH' and ('basemesh' in obj.name.lower() or 'human' in obj.name.lower()):
            body = obj
            break
    if body is None:
        # последний меш в сцене
        meshes = [o for o in bpy.context.scene.objects if o.type == 'MESH']
        if not meshes:
            raise RuntimeError("No mesh created — MPFB2 не сработал")
        body = meshes[-1]

    log(f"  base mesh: {body.name}")

    # Применяем macro gender
    bpy.context.view_layer.objects.active = body
    try:
        bpy.ops.mpfb.human_set_macro(macro_name='gender',
                                      value=0.0 if gender == 'female' else 1.0)
    except Exception:
        # Альтернатива: через свойства объекта
        log("  set gender via property (fallback)")
        if hasattr(body, 'mhmacropanel'):
            body.mhmacropanel.gender = 0.0 if gender == 'female' else 1.0

    return body


def apply_target_as_shape_key(body, shape_key_name: str, target_candidates: list, weight: float):
    """
    Применяет один из target_candidates к меш и сохраняет результат как shape key.
    """
    log(f"  apply {shape_key_name} ← {target_candidates}")
    bpy.context.view_layer.objects.active = body

    applied_target = None
    for target_name in target_candidates:
        try:
            bpy.ops.mpfb.human_set_target(target_name=target_name, value=weight)
            applied_target = target_name
            break
        except Exception as e:
            log(f"    target '{target_name}' fail: {e}")
            continue

    if applied_target is None:
        log(f"  WARN: ни один target для {shape_key_name} не сработал — пропускаю")
        return False

    # Создаём shape key из текущего deformed состояния
    # `from_mix=True` копирует текущие vertices в новый shape key
    if not body.data.shape_keys:
        body.shape_key_add(name='Basis')
    body.shape_key_add(name=shape_key_name, from_mix=True)

    # Сбрасываем target к 0
    try:
        bpy.ops.mpfb.human_set_target(target_name=applied_target, value=0.0)
    except Exception:
        pass

    log(f"  OK shape key '{shape_key_name}' via '{applied_target}'")
    return True


def export_glb(body, out_path: str):
    bpy.ops.object.select_all(action='DESELECT')
    body.select_set(True)
    bpy.context.view_layer.objects.active = body
    log(f"  export → {out_path}")
    bpy.ops.export_scene.gltf(
        filepath=out_path,
        export_format='GLB',
        use_selection=True,
        export_morph=True,
        export_apply=False,
        export_skins=True,
    )


def build_one(gender: str):
    clear_scene()
    body = create_human(gender)

    # Базовый shape key
    if not body.data.shape_keys:
        body.shape_key_add(name='Basis')

    morphs_built = 0
    for shape_key_name, primary, weight in MORPHS:
        candidates = [primary] + MORPH_FALLBACKS.get(shape_key_name, [])
        candidates = list(dict.fromkeys(candidates))  # dedupe сохраняя порядок
        if apply_target_as_shape_key(body, shape_key_name, candidates, weight if weight else 1.0):
            morphs_built += 1

    out_path = os.path.join(OUT_DIR, f"{gender}.glb")
    os.makedirs(OUT_DIR, exist_ok=True)
    export_glb(body, out_path)
    log(f"DONE {gender} — {morphs_built}/{len(MORPHS)} morphs")


def main():
    log(f"OUT_DIR = {OUT_DIR}")
    if 'mpfb' not in sys.modules and 'mpfb' not in [a.module for a in bpy.context.preferences.addons]:
        log("ERROR: MPFB2 не активирован. Edit → Preferences → Add-ons → enable MPFB.")
        return

    build_one('male')
    build_one('female')
    log("ALL DONE — закоммить apps/web/public/avatar/*.glb")


if __name__ == "__main__":
    main()
