"""
Билдер male.glb для 3D-аватара ForzaFit.

Запуск:
  "C:\\Program Files\\Blender Foundation\\Blender 5.0\\blender.exe" \
      --background --python build_male.py

Логика male:
  1. create_human → андрогинный baseline с 11 shape keys.
  2. Установить макро:
     - $md-$ca-$ma-$yn = 1.0           (caucasian male young)
     - $md-universal-$ma-$yn-$av$mu-$av$wg = 1.0   (универсальная male point)
     - все $fe-* (female) = 0          (нет женских деформаций)
     - все cup-keys = 0                (нет груди)
     - все остальные $md-* = 0
  3. Запечь mix в base mesh.
  4. Применить genital baseline (penis-length-incr + penis-testicles-incr).
  5. Запечь.
  6. delete_helpers (убираем "платье"/маски).
  7. Создать Basis + загрузить 8 morph targets:
     - chest, waist, hips, arm, thigh, calf
     - muscle: universal-male-young-maxmuscle-averageweight
     - bodyFat: universal-male-young-averagemuscle-maxweight
  8. Export GLB.
"""

import os
import bpy

# Подгружаем общие helpers.
_HERE = os.path.dirname(os.path.abspath(__file__))
exec(open(os.path.join(_HERE, "_avatar_common.py"), encoding="utf-8").read())


MUSCLE_TARGET  = "macrodetails/universal-male-young-maxmuscle-averageweight.target.gz"
BODYFAT_TARGET = "macrodetails/universal-male-young-averagemuscle-maxweight.target.gz"
# Для male chest — pectoral muscle (а не bust-circ, который у мужчины
# выглядит как "грудь увеличивается над сосками").
CHEST_TARGET   = "torso/torso-muscle-pectoral-incr.target.gz"

GENITAL_BAKE = [
    ("genitals/penis-length-incr.target.gz", 0.6),
    ("genitals/penis-testicles-incr.target.gz", 0.5),
    ("genitals/penis-circ-incr.target.gz", 0.4),
]


def setup_male_macros(body):
    """Включить male caucasian young, обнулить female/cup."""
    if not body.data.shape_keys:
        return
    changes = 0
    for kb in body.data.shape_keys.key_blocks:
        n = kb.name
        if not n.startswith("$md-"):
            continue
        # Default: всё в 0.
        new_val = 0.0
        # Включить только нужные male macro points.
        if n == "$md-$ca-$ma-$yn":  # caucasian male young
            new_val = 1.0
        elif n == "$md-universal-$ma-$yn-$av$mu-$av$wg":  # male young avg-muscle avg-weight
            new_val = 1.0
        kb.value = new_val
        changes += 1
    log(f"  set {changes} macro keys for MALE (caucasian young avg-avg, no cup)")


def bake_genitals(body):
    """Применить penis-related targets и запечь в mesh."""
    for rel_path, weight in GENITAL_BAKE:
        target = os.path.join(TARGETS_ROOT, rel_path)
        if not os.path.exists(target):
            log(f"  WARN: genital target не найден: {target}")
            continue
        call_load_target(target, weight)
    bake_mix_to_mesh(body)
    log("  baked genitals")


def main():
    log("=" * 50)
    log("BUILDING MALE")
    log("=" * 50)
    clear_scene()
    bpy.ops.mpfb.create_human()
    body = find_body_mesh()
    if not body:
        log("ERROR: mesh не создан")
        return
    log(f"base mesh: {body.name} ({len(body.data.vertices)} verts)")

    # 1. Male macros → bake.
    setup_male_macros(body)
    bake_mix_to_mesh(body)
    log("  baked male macros")

    # 2. Genitals baseline → bake.
    bake_genitals(body)

    # 3. Временный rig ДО delete_helpers (он нужен joint cubes из helpers
    #    для расчёта костей), затем подключить body parts (rig нужен MPFB
    #    для load_library_proxy), затем удалить helpers.
    add_temp_rig(body)

    # 3a. Подключить eyes/teeth/tongue/eyelashes proxy-меши — иначе глазницы пустые.
    load_body_parts(body)

    # 3a'. Одежда: все варианты «низа» — три типа трусов + унисекс шорты.
    # Все четыре загружаются как отдельные mesh-объекты в один GLB, имена
    # `clothes_bottom_<key>`. Three.js на runtime показывает только выбранный.
    load_clothes_variants(body, "bottom", CLOTHES_MALE_BOTTOM)

    # 3a'''. Причёски — мужские + унисекс варианты в GLB; runtime выбирает.
    load_hair_variants(body, HAIR_FOR_MALE)

    # 3a''''. Теперь rig больше не нужен — снести до delete_helpers.
    cleanup_temp_rig()

    # 3b. Убрать helpers (joint cubes больше не нужны после add_standard_rig).
    bpy.context.view_layer.objects.active = body
    body.select_set(True)
    verts_before = len(body.data.vertices)
    bpy.ops.mpfb.delete_helpers()
    log(f"  delete_helpers: {verts_before} → {len(body.data.vertices)} verts")

    # 4. Создать Basis для shape keys.
    bpy.context.view_layer.objects.active = body
    body.select_set(True)
    body.shape_key_add(name="Basis", from_mix=False)

    # 5. Single-target morphs.
    morphs = [
        ("chest",   CHEST_TARGET,   1.0),  # pectoral muscle, симметричный
    ] + list(COMMON_MORPHS) + [
        ("muscle",  MUSCLE_TARGET,  1.0),
        ("bodyFat", BODYFAT_TARGET, 1.0),
    ]
    built = 0
    total = len(morphs) + len(COMMON_PAIRED_MORPHS)
    for name, rel_path, weight in morphs:
        target = os.path.join(TARGETS_ROOT, rel_path)
        if load_target_as_shapekey(body, name, target, weight):
            built += 1

    # 6. Paired morphs (l-/r- → один симметричный shape key).
    for name, rel_paths, weight in COMMON_PAIRED_MORPHS:
        if load_paired_targets_as_shapekey(body, name, rel_paths, weight):
            built += 1

    # 6.5. Transfer body shape keys → clothes. Точная barycentric для MHCLO,
    # ссылающейся на body-вершины (boxer_briefs, simple_shorts), и nearest-vertex
    # fallback для wolgade-стилей (panties, bra), индексированных по удалённым
    # helper-вершинам.
    transfer_body_shapekeys_to_clothes(body, {
        "bottom": ["waist", "hips", "thigh", "muscle", "bodyFat"],
    })

    # 7. Export.
    out_path = os.path.join(OUT_DIR, "male.glb")
    os.makedirs(OUT_DIR, exist_ok=True)
    export_glb(body, out_path)
    log(f"DONE — {built}/{total} morphs → {out_path}")


main()
