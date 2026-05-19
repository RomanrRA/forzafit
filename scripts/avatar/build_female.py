"""
Билдер female.glb для 3D-аватара ForzaFit.

Запуск:
  "C:\\Program Files\\Blender Foundation\\Blender 5.0\\blender.exe" \
      --background --python build_female.py

Логика female:
  1. create_human → андрогинный baseline.
  2. Установить макро:
     - $md-$ca-$fe-$yn = 1.0           (caucasian female young)
     - $md-universal-$fe-$yn-$av$mu-$av$wg = 1.0   (универсальная female point)
     - оба $fe-cup-* keys = 1.0        (средняя cup size активна)
     - все $ma-* (male) = 0
     - все остальные $md-* = 0
  3. Запечь mix в base mesh.
  4. delete_helpers.
  5. Basis + 9 morph targets:
     - chest, waist, hips, arm, thigh, calf
     - muscle: universal-female-young-maxmuscle-averageweight
     - bodyFat: universal-female-young-averagemuscle-maxweight
     - breastSize: настоящий cupsize target
       breast/female-young-averagemuscle-averageweight-maxcup-averagefirmness
  6. Export GLB.
"""

import os
import bpy

# Подгружаем общие helpers.
_HERE = os.path.dirname(os.path.abspath(__file__))
exec(open(os.path.join(_HERE, "_avatar_common.py"), encoding="utf-8").read())


MUSCLE_TARGET  = "macrodetails/universal-female-young-maxmuscle-averageweight.target.gz"
BODYFAT_TARGET = "macrodetails/universal-female-young-averagemuscle-maxweight.target.gz"
BREAST_TARGET  = "breast/female-young-averagemuscle-averageweight-maxcup-averagefirmness.target.gz"
# Для female chest — обхват груди (это и грудная клетка, и грудь),
# естественно для женской анатомии.
CHEST_TARGET   = "torso/measure-bust-circ-incr.target.gz"


def setup_female_macros(body):
    """Включить female caucasian young + cup, обнулить male."""
    if not body.data.shape_keys:
        return
    changes = 0
    for kb in body.data.shape_keys.key_blocks:
        n = kb.name
        if not n.startswith("$md-"):
            continue
        new_val = 0.0
        if n == "$md-$ca-$fe-$yn":  # caucasian female young
            new_val = 1.0
        elif n == "$md-universal-$fe-$yn-$av$mu-$av$wg":  # female young avg-muscle avg-weight
            new_val = 1.0
        elif "cup" in n and "$fe" in n:
            # Базовая грудь маленькая (cup ~0.15). Слайдер breastSize растит
            # её до полноценной — иначе слайдер не может уменьшить ниже base.
            new_val = 0.15
        kb.value = new_val
        changes += 1
    log(f"  set {changes} macro keys for FEMALE (caucasian young avg-avg, with cup)")


def main():
    log("=" * 50)
    log("BUILDING FEMALE")
    log("=" * 50)
    clear_scene()
    bpy.ops.mpfb.create_human()
    body = find_body_mesh()
    if not body:
        log("ERROR: mesh не создан")
        return
    log(f"base mesh: {body.name} ({len(body.data.vertices)} verts)")

    # 1. Female macros → bake.
    setup_female_macros(body)
    bake_mix_to_mesh(body)
    log("  baked female macros")

    # 2. Временный rig ДО delete_helpers, затем body parts, затем удалить helpers.
    add_temp_rig(body)

    # 2a. Подключить eyes/teeth/tongue/eyelashes proxy-меши.
    load_body_parts(body)

    # 2a'. Одежда: варианты «низа» (трусы / шорты) + «верха» (bra).
    # Загружаются как отдельные mesh-объекты с именами `clothes_<slot>_<key>`,
    # three.js на runtime переключает .visible.
    load_clothes_variants(body, "bottom", CLOTHES_FEMALE_BOTTOM)
    load_clothes_variants(body, "top",    CLOTHES_FEMALE_TOP)

    # 2a''. Причёски — женские + унисекс варианты в GLB; runtime выбирает.
    load_hair_variants(body, HAIR_FOR_FEMALE)

    # 2a'''. Теперь можно снести rig — он нужен был только для proxy/clothes/hair.
    cleanup_temp_rig()

    # 2b. Убрать helpers.
    bpy.context.view_layer.objects.active = body
    body.select_set(True)
    verts_before = len(body.data.vertices)
    bpy.ops.mpfb.delete_helpers()
    log(f"  delete_helpers: {verts_before} → {len(body.data.vertices)} verts")

    # 3. Создать Basis.
    bpy.context.view_layer.objects.active = body
    body.select_set(True)
    body.shape_key_add(name="Basis", from_mix=False)

    # 4. Single-target morphs.
    morphs = [
        ("chest", CHEST_TARGET, 1.0),
    ] + list(COMMON_MORPHS) + [
        ("muscle",     MUSCLE_TARGET,  1.0),
        ("bodyFat",    BODYFAT_TARGET, 1.0),
        ("breastSize", BREAST_TARGET,  1.0),
    ]
    built = 0
    total = len(morphs) + len(COMMON_PAIRED_MORPHS)
    for name, rel_path, weight in morphs:
        target = os.path.join(TARGETS_ROOT, rel_path)
        if load_target_as_shapekey(body, name, target, weight):
            built += 1

    # 5. Paired morphs (forearm).
    for name, rel_paths, weight in COMMON_PAIRED_MORPHS:
        if load_paired_targets_as_shapekey(body, name, rel_paths, weight):
            built += 1

    # 6. Export.
    out_path = os.path.join(OUT_DIR, "female.glb")
    os.makedirs(OUT_DIR, exist_ok=True)
    export_glb(body, out_path)
    log(f"DONE — {built}/{total} morphs → {out_path}")


main()
