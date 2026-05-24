"""
Общие helpers для билдеров аватара (build_male.py / build_female.py).

Подключается через exec(open(...).read()) — Blender headless не даёт удобного
sys.path для соседних модулей, exec надёжнее и проще.
"""
import os
import bpy

# OUT_DIR — относительно расположения этого файла (scripts/avatar/), чтобы
# pipeline корректно писал и в main repo, и в worktree, и в форках.
_THIS_DIR = os.path.dirname(os.path.abspath(__file__))
OUT_DIR = os.path.normpath(os.path.join(_THIS_DIR, "..", "..", "apps", "web", "public", "avatar"))

MPFB_DATA = os.path.expandvars(
    r"%APPDATA%\Blender Foundation\Blender\5.0\extensions\user_default\mpfb\data"
)
TARGETS_ROOT = os.path.join(MPFB_DATA, "targets")

# MakeHuman system assets pack — отдельно распакован. Тут лежат proxy-меши
# для глаз/зубов/языка/ресниц, которые НЕ поставляются с MPFB по умолчанию.
SYSTEM_ASSETS_ROOT = r"C:\Program Files\Blender Foundation\Blender 5.0\assets\makehuman_system_assets_cc0"

# Body parts: (object_type, относительный путь до .mhclo, канонич. имя меши).
# MPFB именует объект по имени папки proxy (например, `low-poly` для глаз),
# а это потом затрудняет идентификацию в three.js. Переименовываем сразу после
# load в канонические `eyes/teeth/tongue/eyelashes`.
BODY_PARTS = [
    ("Eyes",      "eyes/low-poly/low-poly.mhclo",                "eyes"),
    ("Teeth",     "teeth/teeth_base/teeth_base.mhclo",           "teeth"),
    ("Tongue",    "tongue/tongue01/tongue01.mhclo",              "tongue"),
    ("Eyelashes", "eyelashes/eyelashes01/eyelashes01.mhclo",     "eyelashes"),
]

# Одежда: всё внутри underwear01_cc0 (MPFB регистрирует ассет-рут через
# структуру каталога). CC0-паки лежат рядом со скачанными вручную с
# makehumancommunity.org мужскими (CC-BY, авторы WojackOWL/Unknown).
_UW01_ROOT = r"C:\Program Files\Blender Foundation\Blender 5.0\assets\underwear01_cc0\clothes"

# Каждый вариант → (key, абсолютный путь до .mhclo).
# В GLB он попадёт как отдельный mesh с именем `clothes_<slot>_<key>`
# (см. load_clothes_variants). Three.js на runtime включает/выключает .visible.
CLOTHES_MALE_BOTTOM = [
    ("boxer_briefs",    os.path.join(_UW01_ROOT, "wojackowl_boxer_briefs",    "Boxer_Breifs_-_CausalUnderwear.mhclo")),
    ("boxer_shorts",    os.path.join(_UW01_ROOT, "wojackowl_boxer_shorts",    "Boxers_-_CausalUnderwear.mhclo")),
    ("high_cut_briefs", os.path.join(_UW01_ROOT, "wojackowl_high_cut_briefs", "HiCut_Briefs.mhclo")),
    ("simple_shorts",   os.path.join(_UW01_ROOT, "joepal_simple_shorts",      "grey_shorts.mhclo")),
]

CLOTHES_FEMALE_BOTTOM = [
    ("panties",       os.path.join(_UW01_ROOT, "wolgade_female_panties_01", "wolgade_female_panties_01.mhclo")),
    ("simple_shorts", os.path.join(_UW01_ROOT, "joepal_simple_shorts",      "grey_shorts.mhclo")),
]

CLOTHES_FEMALE_TOP = [
    ("bra", os.path.join(_UW01_ROOT, "wolgade_female_top_01", "wolgade_female_top_01.mhclo")),
]

# Причёски из hair01_cc0. Разделены по полу: женские причёски на мужском
# теле выглядят странно (длинные косы и т.п.) и наоборот. Все варианты
# нужного пола грузятся в один GLB как отдельные mesh-объекты с именами
# `hair_<key>`. JSON pack type="clothes" → грузим через load_library_clothes.
_HAIR_ROOT = r"C:\Program Files\Blender Foundation\Blender 5.0\assets\hair01_cc0\hair"

def _hair(key, folder, mhclo_name=None):
    fname = mhclo_name or f"{folder}.mhclo"
    return (key, os.path.join(_HAIR_ROOT, folder, fname))

# Женские: разные стили + ассеты которые формально «унисекс», но визуально
# подходят только женщинам (длинные, аниме, повязка, маугли).
HAIR_FEMALE = [
    _hair("blunt_bob",            "toigo_blunt_bob"),
    _hair("blunt_bob_bangs",      "toigo_blunt_bob_with_bangs"),
    _hair("braid_french",         "elvs_french_braid_variation"),
    _hair("braid_reverse_bun",    "elvs_reverse_french_braid_bun"),
    _hair("bun_brown",            "rehmanpolanski_hair_bun_brown"),
    _hair("straight_bangs",       "cortu_straight_bangs"),
    _hair("strawberry_cloud",     "cortu_strawberry_cloud_hair"),
    _hair("long",                 "o4saken_long01"),
    _hair("anime",                "learning_anime_hair"),
    _hair("headband_blond",       "sonntag78_blond_with_headband"),
    _hair("junglebook",           "sonntag78_junglebook_hair"),
]

# Мужские: всё короткое/мужественное из hair01_cc0. В паке мало реально
# мужских стилей — только два culturalibre.
HAIR_MALE = [
    _hair("culturalibre_02",      "culturalibre_hair_02"),
    _hair("culturalibre_05",      "culturalibre_hair_05"),
]

# Унисекс — практически нет: пак ориентирован на женские стили.
HAIR_UNISEX = []

# Полные списки для build_male / build_female (HAIR_UNISEX дублируется в оба).
HAIR_FOR_MALE   = HAIR_MALE + HAIR_UNISEX
HAIR_FOR_FEMALE = HAIR_FEMALE + HAIR_UNISEX

# Для обратной совместимости — общий список (если кто-то импортировал старое).
HAIR_VARIANTS = HAIR_FOR_FEMALE

# Морфы общие для обоих полов (одиночные targets).
# chest вынесен в gender-specific: для male используется pectoral muscle.
COMMON_MORPHS = [
    # (shape_key_name, относительный путь от targets/, weight)
    ("waist",    "torso/measure-waist-circ-incr.target.gz",  1.0),
    ("arm",      "arms/measure-upperarm-circ-incr.target.gz",1.0),
    ("thigh",    "legs/measure-thigh-circ-incr.target.gz",   1.0),
    ("calf",     "legs/measure-calf-circ-incr.target.gz",    1.0),
    ("neck",     "neck/measure-neck-circ-incr.target.gz",    1.0),
    # Лицо — одиночные (не парные).
    ("noseSize",  "nose/nose-volume-incr.target.gz",         1.0),
    ("noseWidth", "nose/nose-width1-incr.target.gz",         1.0),
    ("noseHump",  "nose/nose-hump-incr.target.gz",           1.0),
    ("nosePoint", "nose/nose-point-down.target.gz",          1.0),
]

# Парные / комбинированные морфы (несколько targets склеиваются в один shape key).
COMMON_PAIRED_MORPHS = [
    ("forearm", [
        "arms/l-lowerarm-muscle-incr.target.gz",
        "arms/r-lowerarm-muscle-incr.target.gz",
    ], 1.0),
    # Бёдра = обхват + объём ягодиц (иначе только сами бёдра растут, попа не двигается).
    ("hips", [
        "torso/measure-hips-circ-incr.target.gz",
        "buttocks/buttocks-volume-incr.target.gz",
    ], 1.0),
    # Лицо: парные l-/r- + объединённые upper+lower.
    ("eyeSize", [
        "eyes/l-eye-scale-incr.target.gz",
        "eyes/r-eye-scale-incr.target.gz",
    ], 1.0),
    ("eyeAlmond", [
        # Поднять внешние уголки глаз → миндалевидный разрез.
        "eyes/l-eye-corner1-up.target.gz",
        "eyes/r-eye-corner1-up.target.gz",
    ], 1.0),
    ("lipFullness", [
        "mouth/mouth-upperlip-volume-incr.target.gz",
        "mouth/mouth-lowerlip-volume-incr.target.gz",
    ], 1.0),
]


def log(msg):
    print(f"[avatar] {msg}", flush=True)


# Глобальный «слот» с путём к текущему MHCLO для monkey-patch ClothesService
# (см. _patch_clothes_service ниже). MPFB 2.0.15 при interpolate-delete-group
# теряет mhclo_full_path и валится с "Cannot load empty file name", если
# clothes_object не находится через зарегистрированный asset root. Кладём путь
# сюда вручную, патч берёт его как fallback.
CURRENT_CLOTHES_PATH = {"path": None}


def _ensure_clothes_patch():
    """Ленивый monkey-patch: первый вызов load_clothes_variants хукает
    ClothesService.interpolate_vertex_group_from_basemesh_to_clothes так,
    что пустой mhclo_full_path fallback'ит на CURRENT_CLOTHES_PATH.

    Делаем лениво, потому что на момент exec() helpers MPFB-extension ещё
    не зарегистрирован в Blender, импорт падает.
    """
    if getattr(_ensure_clothes_patch, "_done", False):
        return
    # В Blender 5.x extensions регистрируются под пакетом bl_ext. Сначала
    # пробуем правильный namespace (bl_ext.user_default.mpfb), fallback на
    # plain mpfb для совместимости с legacy-аддонной установкой.
    ClothesService = None
    last_exc = None
    for modname in ("bl_ext.user_default.mpfb.services.clothesservice",
                    "mpfb.services.clothesservice"):
        try:
            mod = __import__(modname, fromlist=["ClothesService"])
            ClothesService = getattr(mod, "ClothesService", None)
            if ClothesService is not None:
                break
        except Exception as e:
            last_exc = e
    if ClothesService is None:
        log(f"  [patch] FAIL import ClothesService: {type(last_exc).__name__}: {last_exc}")
        return
    _orig = ClothesService.interpolate_vertex_group_from_basemesh_to_clothes

    def _patched(basemesh, clothes_object, vertex_group_name, match_cutoff=0.3, mhclo_full_path=None):
        if not mhclo_full_path and CURRENT_CLOTHES_PATH["path"]:
            mhclo_full_path = CURRENT_CLOTHES_PATH["path"]
        return _orig(basemesh, clothes_object, vertex_group_name,
                     match_cutoff=match_cutoff, mhclo_full_path=mhclo_full_path)

    ClothesService.interpolate_vertex_group_from_basemesh_to_clothes = staticmethod(_patched)
    _ensure_clothes_patch._done = True
    log(f"  [patch] ClothesService.interpolate_vertex_group hooked ({ClothesService.__module__})")


def clear_scene():
    bpy.ops.object.select_all(action="SELECT")
    bpy.ops.object.delete(use_global=False)
    for block in (bpy.data.meshes, bpy.data.armatures, bpy.data.materials, bpy.data.images):
        for item in list(block):
            if item.users == 0:
                block.remove(item)


def find_body_mesh():
    meshes = [o for o in bpy.context.scene.objects if o.type == "MESH"]
    if not meshes:
        return None
    return max(meshes, key=lambda o: len(o.data.vertices))


def call_load_target(target_path: str, weight: float):
    """В headless нужны directory+files, чистый filepath не работает."""
    bpy.ops.mpfb.load_target(
        directory=os.path.dirname(target_path) + os.sep,
        files=[{"name": os.path.basename(target_path)}],
        weight=weight,
    )


def bake_mix_to_mesh(body):
    """Запечь текущий shape-key-mix в vertex positions base mesh,
    очистить все shape keys. Mesh остаётся в deformed состоянии."""
    if not body.data.shape_keys:
        return
    bpy.context.view_layer.objects.active = body
    mix_sk = body.shape_key_add(from_mix=True)
    coords = [kv.co.copy() for kv in mix_sk.data]
    for i, v in enumerate(body.data.vertices):
        v.co = coords[i]
    body.shape_key_clear()


def load_target_as_shapekey(body, shape_key_name: str, target_path: str, weight: float):
    """Грузит .target.gz как shape key, переименовывает в нужное имя,
    удаляет служебные $md-keys, выставляет value=0 для экспорта."""
    if not os.path.exists(target_path):
        log(f"  SKIP {shape_key_name}: файл не найден {target_path}")
        return False

    before = set()
    if body.data.shape_keys:
        before = {kb.name for kb in body.data.shape_keys.key_blocks}

    bpy.context.view_layer.objects.active = body
    body.select_set(True)
    try:
        call_load_target(target_path, weight)
    except Exception as e:
        log(f"  FAIL {shape_key_name}: {e}")
        return False

    if not body.data.shape_keys:
        log(f"  FAIL {shape_key_name}: shape_keys не появились")
        return False
    after = {kb.name for kb in body.data.shape_keys.key_blocks}
    new_keys = after - before
    # Сначала ищем "настоящий" (не $md-) shape key — это обычные measure-targets.
    real = [n for n in new_keys if not n.startswith("$")]
    if real:
        chosen = real[0]
    elif new_keys:
        # Cupsize и подобные macro-семейные targets создают только $md-keys.
        # Тогда наш morph — это сам $md-key. Берём первый новый.
        chosen = next(iter(new_keys))
    else:
        log(f"  FAIL {shape_key_name}: ни одного нового key не появилось")
        return False

    kb = body.data.shape_keys.key_blocks[chosen]
    kb.name = shape_key_name
    kb.value = 0.0

    # Удалить остальные служебные ключи, появившиеся вместе.
    for n in new_keys:
        if n == chosen:
            continue
        idx = body.data.shape_keys.key_blocks.find(n)
        if idx >= 0:
            body.active_shape_key_index = idx
            bpy.ops.object.shape_key_remove(all=False)

    log(f"  OK {shape_key_name} ← {os.path.basename(target_path)}")
    return True


def load_paired_targets_as_shapekey(body, shape_key_name: str, target_rel_paths, weight: float = 1.0):
    """Грузит несколько target'ов (l- + r- симметричных), затем склеивает их
    в один shape key через from_mix. Промежуточные l-/r- shape keys удаляются."""
    target_paths = [os.path.join(TARGETS_ROOT, p) for p in target_rel_paths]
    for p in target_paths:
        if not os.path.exists(p):
            log(f"  SKIP {shape_key_name}: файл не найден {p}")
            return False

    if not body.data.shape_keys:
        body.shape_key_add(name="Basis", from_mix=False)

    before = {kb.name for kb in body.data.shape_keys.key_blocks}

    bpy.context.view_layer.objects.active = body
    body.select_set(True)
    try:
        for p in target_paths:
            call_load_target(p, weight)
    except Exception as e:
        log(f"  FAIL {shape_key_name}: {e}")
        return False

    after = {kb.name for kb in body.data.shape_keys.key_blocks}
    new_keys = after - before
    if not new_keys:
        log(f"  FAIL {shape_key_name}: новых shape keys не появилось")
        return False

    # Сейчас в mix активны все промежуточные l-/r- targets с weight.
    # Создаём from_mix → объединяем их deformation в один key.
    mix_sk = body.shape_key_add(from_mix=True)
    mix_sk.name = shape_key_name
    mix_sk.value = 0.0

    # Удалить промежуточные ключи.
    for n in new_keys:
        idx = body.data.shape_keys.key_blocks.find(n)
        if idx >= 0:
            body.active_shape_key_index = idx
            bpy.ops.object.shape_key_remove(all=False)

    log(f"  OK {shape_key_name} ← paired [{', '.join(os.path.basename(p) for p in target_paths)}]")
    return True


def add_temp_rig(body):
    """Временный standard rig для proxy-loader'а MPFB.
    ВАЖНО: вызывать ДО delete_helpers — joint cubes (helper geometry) нужны
    для расчёта позиций костей, иначе ZeroDivisionError.
    """
    bpy.context.view_layer.objects.active = body
    body.select_set(True)
    try:
        bpy.ops.mpfb.add_standard_rig()
        log("  added temporary standard rig for proxy loading")
        return True
    except Exception as e:
        log(f"  WARN add_standard_rig: {e}")
        return False


def load_body_parts(body):
    """Подключить eye/teeth/tongue/eyelashes proxy-меши из system_assets pack.

    Особенность MPFB: load_library_proxy требует armature на теле
    («set up rigging is enabled, but could not find a rig to attach to»).
    Поэтому добавляй временный rig (add_temp_rig) ДО вызова этой функции.
    Армуру удаляй отдельным вызовом `cleanup_temp_rig()` — после того, как
    подгружена ВСЯ требующая её оснастка (включая clothes).
    """
    loaded = []
    for object_type, rel_path, canon in BODY_PARTS:
        fp = os.path.join(SYSTEM_ASSETS_ROOT, rel_path)
        if not os.path.exists(fp):
            log(f"  SKIP body-part {object_type}: not found {fp}")
            continue
        before = {o.name for o in bpy.context.scene.objects if o.type == "MESH"}
        bpy.context.view_layer.objects.active = body
        body.select_set(True)
        try:
            bpy.ops.mpfb.load_library_proxy(filepath=fp, object_type=object_type)
        except Exception as e:
            log(f"  FAIL body-part {object_type}: {e}")
            continue
        after = {o.name for o in bpy.context.scene.objects if o.type == "MESH"}
        new_names = after - before
        if new_names:
            new_name = next(iter(new_names))
            obj = bpy.data.objects.get(new_name)
            if obj:
                obj.name = canon
                if obj.data:
                    obj.data.name = canon
        loaded.append(canon)
        log(f"  loaded body-part {object_type} ← {rel_path} → {canon}")
    return loaded


def cleanup_temp_rig():
    """Удалить временный armature и armature-modifiers — в GLB не нужен
    (export_skins=False). Работаем через имена, чтобы избежать stale references."""
    armature_names = [o.name for o in bpy.context.scene.objects if o.type == "ARMATURE"]
    if not armature_names:
        return
    # Снять armature modifier у всех meshes.
    for o in list(bpy.context.scene.objects):
        if o.type != "MESH":
            continue
        for mod in list(o.modifiers):
            if mod.type == "ARMATURE":
                o.modifiers.remove(mod)
    # Снять parenting (бережём world transform).
    for o in list(bpy.context.scene.objects):
        if o.parent and o.parent.type == "ARMATURE":
            world = o.matrix_world.copy()
            o.parent = None
            o.matrix_world = world
    # Удалить armature objects + их данные.
    for name in armature_names:
        obj = bpy.data.objects.get(name)
        if obj:
            arm_data = obj.data
            bpy.data.objects.remove(obj, do_unlink=True)
            if arm_data and arm_data.users == 0:
                bpy.data.armatures.remove(arm_data)
    log(f"  removed temporary armatures: {armature_names}")


def load_clothes_variants(body, slot, variants):
    """Подключить НЕСКОЛЬКО вариантов одежды одного слота в одну сцену.

    `slot` — "bottom" | "top" (логический слот для рантайма).
    `variants` — список (key, mhclo_path).

    После каждой загрузки находим только-что появившийся mesh и переименовываем
    его в `clothes_<slot>_<key>`. Дополнительно `obj["clothes_slot"] = slot`,
    чтобы three.js мог группировать варианты при экспорте через GLTF "extras".

    Особенность MPFB: оператор требует active basemesh + armature
    (set_up_rigging). Вызывать ПОСЛЕ add_temp_rig и ДО delete_helpers
    (без helpers MHCLO-проекция страдает). cleanup_temp_rig — после.

    Все варианты запекаются на текущем mix-силуэте body, runtime shape-keys
    body на одежду не влияют — возможны клиппинги при экстремальных морфах.
    """
    _ensure_clothes_patch()
    loaded = []
    for key, fp in variants:
        if not os.path.exists(fp):
            log(f"  SKIP clothes {slot}/{key}: not found {fp}")
            continue
        before = {o.name for o in bpy.context.scene.objects if o.type == "MESH"}
        bpy.context.view_layer.objects.active = body
        body.select_set(True)
        CURRENT_CLOTHES_PATH["path"] = fp  # fallback для monkey-patch
        try:
            bpy.ops.mpfb.load_library_clothes(
                filepath=fp,
                object_type="Clothes",
                material_type="MAKESKIN",
            )
        except Exception as e:
            log(f"  FAIL clothes {slot}/{key}: {e}")
            CURRENT_CLOTHES_PATH["path"] = None
            continue
        CURRENT_CLOTHES_PATH["path"] = None
        after = {o.name for o in bpy.context.scene.objects if o.type == "MESH"}
        new_names = after - before
        if not new_names:
            log(f"  FAIL clothes {slot}/{key}: новых mesh не появилось")
            continue
        # У одежды один новый mesh-объект.
        new_name = next(iter(new_names))
        obj = bpy.data.objects.get(new_name)
        if not obj:
            log(f"  FAIL clothes {slot}/{key}: объект {new_name} не найден")
            continue
        canon = f"clothes_{slot}_{key}"
        obj.name = canon
        if obj.data:
            obj.data.name = canon
        obj["clothes_slot"] = slot
        obj["clothes_key"] = key
        # Сохраняем путь к MHCLO — нужен потом для transfer_body_shapekeys_to_clothes
        # (barycentric проекция вершин одежды по треугольникам тела).
        obj["mhclo_path"] = fp
        loaded.append(canon)
        log(f"  loaded clothes {slot}/{key} ← {os.path.basename(fp)} → {canon}")
    return loaded


# Совместимость со старыми вызовами.
def load_clothes(body, mhclo_paths):
    variants = [(os.path.splitext(os.path.basename(p))[0], p) for p in mhclo_paths]
    return load_clothes_variants(body, "legacy", variants)


def load_hair_variants(body, variants):
    """Подключить hair-proxy варианты из hair01_cc0.

    Hair в этом паке регистрируется с `type="clothes"` (см. hair01.json), поэтому
    load_library_clothes — рабочий путь. В сцену добавляются отдельные
    mesh-объекты с именами `hair_<key>`, three.js на runtime включает только
    выбранный. Custom prop `hair_key` сохраняется в GLTF extras.

    Требует armature (set_up_rigging) — вызывать ПОСЛЕ add_temp_rig и ДО
    cleanup_temp_rig + delete_helpers (helpers нужны MHCLO-проекции).
    """
    _ensure_clothes_patch()
    loaded = []
    for key, fp in variants:
        if not os.path.exists(fp):
            log(f"  SKIP hair/{key}: not found {fp}")
            continue
        before = {o.name for o in bpy.context.scene.objects if o.type == "MESH"}
        bpy.context.view_layer.objects.active = body
        body.select_set(True)
        CURRENT_CLOTHES_PATH["path"] = fp
        try:
            bpy.ops.mpfb.load_library_clothes(
                filepath=fp,
                object_type="Clothes",
                material_type="MAKESKIN",
            )
        except Exception as e:
            log(f"  FAIL hair/{key}: {e}")
            CURRENT_CLOTHES_PATH["path"] = None
            continue
        CURRENT_CLOTHES_PATH["path"] = None
        after = {o.name for o in bpy.context.scene.objects if o.type == "MESH"}
        new_names = after - before
        if not new_names:
            log(f"  FAIL hair/{key}: новых mesh не появилось")
            continue
        new_name = next(iter(new_names))
        obj = bpy.data.objects.get(new_name)
        if not obj:
            log(f"  FAIL hair/{key}: объект {new_name} не найден")
            continue
        canon = f"hair_{key}"
        obj.name = canon
        if obj.data:
            obj.data.name = canon
        obj["hair_key"] = key
        loaded.append(canon)
        log(f"  loaded hair/{key} ← {os.path.basename(fp)} → {canon}")
    return loaded


def _import_mhclo_class():
    """Lazy импорт Mhclo (MPFB extension namespace в Blender 5.x / legacy mpfb)."""
    last_exc = None
    for modname in ("bl_ext.user_default.mpfb.entities.clothes.mhclo",
                    "mpfb.entities.clothes.mhclo"):
        try:
            mod = __import__(modname, fromlist=["Mhclo"])
            cls = getattr(mod, "Mhclo", None)
            if cls is not None:
                return cls
        except Exception as e:
            last_exc = e
    log(f"  [transfer] FAIL import Mhclo: {type(last_exc).__name__}: {last_exc}")
    return None


def _snapshot_max_delta_from_basis(clothes, active_idx):
    """Максимальный |Δ| между активным shape key и Basis. Диагностический."""
    if not clothes.data.shape_keys:
        return 0.0
    sks = clothes.data.shape_keys.key_blocks
    if active_idx <= 0 or active_idx >= len(sks):
        return 0.0
    basis = sks[0].data
    active = sks[active_idx].data
    m = 0.0
    n = min(len(basis), len(active))
    for i in range(n):
        dx = active[i].co[0] - basis[i].co[0]
        dy = active[i].co[1] - basis[i].co[1]
        dz = active[i].co[2] - basis[i].co[2]
        d2 = dx*dx + dy*dy + dz*dz
        if d2 > m:
            m = d2
    return m ** 0.5


def _build_clothes_to_body_nearest(body, clothes):
    """KD-tree по body Basis-вершинам → для каждой clothes Basis-вершины
    найти ближайшую body-вершину. Возвращает list[int] длиной по числу
    clothes-вершин (или None если что-то пошло не так).

    Нужен для fallback в _fit_clothes_into_active_shapekey, когда MHCLO
    ссылается на helper-вершины (индексы > len(body.vertices) после
    delete_helpers). Случается с MHCLO от wolgade (panties, bra) —
    они индексированы по helper-юбкам MakeHuman.
    """
    from mathutils.kdtree import KDTree

    body_sks = body.data.shape_keys
    if body_sks and "Basis" in body_sks.key_blocks:
        body_basis = body_sks.key_blocks["Basis"].data
    else:
        body_basis = body.data.vertices

    clothes_sks = clothes.data.shape_keys
    if clothes_sks and "Basis" in clothes_sks.key_blocks:
        clothes_basis = clothes_sks.key_blocks["Basis"].data
    else:
        clothes_basis = clothes.data.vertices

    kd = KDTree(len(body_basis))
    for i, v in enumerate(body_basis):
        kd.insert(v.co, i)
    kd.balance()

    nearest = [0] * len(clothes_basis)
    for i, v in enumerate(clothes_basis):
        _co, idx, _dist = kd.find(v.co)
        nearest[i] = idx
    return nearest


def _fit_clothes_into_active_shapekey(body, clothes, mhclo, body_sk_name,
                                      nearest_map=None):
    """Записать в активный shape key clothes позиции, спроецированные на body
    в состоянии «только body_sk_name поднят на 1.0».

    Читаем абсолютные позиции вершин body напрямую из
    `body.data.shape_keys.key_blocks[body_sk_name].data[i].co` — это
    стабильные значения, не зависящие от depsgraph/evaluated_get
    (headless Blender в `--background` режиме evaluated_get для shape keys
    обновляет ненадёжно, поэтому идём через сырые данные).

    Если MHCLO ссылается на helper-индексы (>= human_count) — fallback на
    nearest-vertex: сдвигаем clothes-вершину на дельту ближайшей body-вершины
    от её Basis-позиции. Менее точно (одежда двигается «жёстко» без локального
    вращения), но работает для wolgade-MHCLO (panties, bra).
    """
    from mathutils import Vector

    body_sks = body.data.shape_keys
    if not body_sks or body_sk_name not in body_sks.key_blocks:
        return False
    human_vertices = body_sks.key_blocks[body_sk_name].data
    human_count = len(human_vertices)
    body_basis = body_sks.key_blocks["Basis"].data if "Basis" in body_sks.key_blocks else None

    x_size = y_size = z_size = 1.0
    if mhclo.x_scale and mhclo.y_scale and mhclo.z_scale:
        if (mhclo.x_scale[0] < human_count and mhclo.x_scale[1] < human_count and
                mhclo.y_scale[0] < human_count and mhclo.y_scale[1] < human_count and
                mhclo.z_scale[0] < human_count and mhclo.z_scale[1] < human_count):
            x_size = abs(human_vertices[mhclo.x_scale[0]].co[0]
                         - human_vertices[mhclo.x_scale[1]].co[0]) / mhclo.x_scale[2]
            y_size = abs(human_vertices[mhclo.y_scale[0]].co[2]
                         - human_vertices[mhclo.y_scale[1]].co[2]) / mhclo.y_scale[2]
            z_size = abs(human_vertices[mhclo.z_scale[0]].co[1]
                         - human_vertices[mhclo.z_scale[1]].co[1]) / mhclo.z_scale[2]

    if not clothes.data.shape_keys:
        return False
    active_idx = clothes.active_shape_key_index
    sks = clothes.data.shape_keys.key_blocks
    if active_idx <= 0 or active_idx >= len(sks):
        return False
    clothes_verts = sks[active_idx].data
    clothes_basis = sks["Basis"].data if "Basis" in sks else None

    bary_ok = 0
    fallback_ok = 0
    skipped = 0
    for i, info in mhclo.verts.items():
        if i >= len(clothes_verts):
            skipped += 1
            continue
        v0, v1, v2 = info["verts"]
        if v0 >= human_count or v1 >= human_count or v2 >= human_count:
            # MHCLO ссылается на удалённые helper-вершины. Fallback на nearest.
            if nearest_map is None or body_basis is None or clothes_basis is None:
                skipped += 1
                continue
            nearest_idx = nearest_map[i]
            if nearest_idx >= human_count:
                skipped += 1
                continue
            delta = human_vertices[nearest_idx].co - body_basis[nearest_idx].co
            clothes_verts[i].co = clothes_basis[i].co + delta
            fallback_ok += 1
            continue
        w = info["weights"]
        o = info["offsets"]
        offset = Vector((o[0] * x_size, o[1] * z_size, o[2] * y_size))
        pos = (w[0] * human_vertices[v0].co
               + w[1] * human_vertices[v1].co
               + w[2] * human_vertices[v2].co
               + offset)
        clothes_verts[i].co = pos
        bary_ok += 1

    # Если ВСЁ через fallback — заодно покрыть clothes-вершины которых нет в
    # mhclo.verts (бывает, если в mhclo не каждая cloth-вершина mapped).
    if bary_ok == 0 and fallback_ok > 0 and clothes_basis is not None:
        mapped = set(mhclo.verts.keys())
        for i in range(len(clothes_verts)):
            if i in mapped:
                continue
            nearest_idx = nearest_map[i]
            if nearest_idx >= human_count:
                continue
            delta = human_vertices[nearest_idx].co - body_basis[nearest_idx].co
            clothes_verts[i].co = clothes_basis[i].co + delta
            fallback_ok += 1

    log(f"    fit {clothes.name}/{body_sk_name}: bary={bary_ok} fallback={fallback_ok} skip={skipped}")
    return (bary_ok + fallback_ok) > 0


def transfer_body_shapekeys_to_clothes(body, slot_to_shape_keys):
    """Перенести деформации body shape keys на shape keys одежды.

    Для каждого clothes-объекта в сцене (с custom prop 'clothes_slot' и
    'mhclo_path') добавляем shape keys из slot_to_shape_keys[slot] и
    заполняем их через barycentric projection (Mhclo.verts).

    Three.js на runtime поднимает morph influence по имени shape key — тело
    и одежда поднимут одинаковый morph синхронно.

    slot_to_shape_keys пример: {'bottom': ['waist','hips','thigh',
    'muscle','bodyFat'], 'top': ['chest','breastSize','muscle','bodyFat']}.
    """
    Mhclo = _import_mhclo_class()
    if Mhclo is None:
        log("  transfer: SKIP — Mhclo не импортирован")
        return

    clothes_objs = []
    for o in bpy.context.scene.objects:
        if o.type != "MESH":
            continue
        slot = o.get("clothes_slot")
        path = o.get("mhclo_path")
        if not slot or not path:
            continue
        if not slot_to_shape_keys.get(slot):
            continue
        clothes_objs.append((o, slot, path))

    if not clothes_objs:
        log("  transfer: clothes-объектов с подходящим slot нет")
        return
    if not body.data.shape_keys:
        log("  transfer: на body нет shape keys")
        return

    body_sks = body.data.shape_keys.key_blocks

    total_transferred = 0
    for clothes, slot, mhclo_path in clothes_objs:
        sk_names = slot_to_shape_keys.get(slot, [])
        mhclo = Mhclo()
        mhclo.load(mhclo_path)
        mhclo.clothes = clothes

        if not clothes.data.shape_keys:
            clothes.shape_key_add(name="Basis", from_mix=False)

        nearest_map = _build_clothes_to_body_nearest(body, clothes)

        ok_for_this = 0
        for sk_name in sk_names:
            if sk_name not in body_sks:
                continue
            sks_block = clothes.data.shape_keys.key_blocks
            if sk_name not in sks_block:
                clothes.shape_key_add(name=sk_name, from_mix=False)
            sks_block = clothes.data.shape_keys.key_blocks
            idx = sks_block.find(sk_name)
            if idx <= 0:
                continue
            clothes.active_shape_key_index = idx

            if _fit_clothes_into_active_shapekey(body, clothes, mhclo, sk_name,
                                                 nearest_map=nearest_map):
                ok_for_this += 1
                dmax = _snapshot_max_delta_from_basis(clothes, idx)
                log(f"    {clothes.name}/{sk_name}: max delta = {dmax:.4f}")

        total_transferred += ok_for_this
        log(f"  transferred {ok_for_this}/{len(sk_names)} shape keys → {clothes.name}")

    log(f"  transfer: total {total_transferred} clothes shape keys")


def strip_hair_mask_modifiers(body):
    """Снять Mask-модификаторы у body, которые добавляют hair-mhclo через
    delete-groups. Без этого export_apply=True вырезает вершины макушки и
    при показе «Без причёски» получается дыра. Hair всё равно лежит сверху;
    возможен лёгкий z-fight на коротких причёсках — это меньшее зло.

    Не трогает Mask-модификаторы с другими именами/группами (на случай
    если когда-нибудь появятся осознанные cutout-маски).
    """
    if not body or body.type != "MESH":
        return
    removed = []
    for mod in list(body.modifiers):
        if mod.type != "MASK":
            continue
        vgname = (mod.vertex_group or "").lower()
        if "delete" in vgname or "hair" in vgname:
            removed.append(f"{mod.name}({mod.vertex_group})")
            body.modifiers.remove(mod)
    if removed:
        log(f"  stripped hair Mask modifiers: {removed}")


def export_glb(body, out_path: str):
    # Перед export_apply снимаем Mask-модификаторы от hair-mhclo: иначе
    # макушка вырезается и «Без причёски» показывает дыру.
    strip_hair_mask_modifiers(body)

    # Выбираем body + глаза/ресницы/зубы (все остальные mesh-объекты сцены),
    # чтобы в GLB попали глаза. MPFB создаёт их отдельными meshes; без них
    # глазницы пустые.
    bpy.ops.object.select_all(action="DESELECT")
    extra_meshes = []
    for o in bpy.context.scene.objects:
        if o.type == "MESH":
            o.select_set(True)
            if o is not body:
                extra_meshes.append(o.name)
    bpy.context.view_layer.objects.active = body
    if extra_meshes:
        log(f"  extra meshes for export: {extra_meshes}")
    log(f"  export → {out_path}")
    bpy.ops.export_scene.gltf(
        filepath=out_path,
        export_format="GLB",
        use_selection=True,
        export_morph=True,
        # export_apply=True применит modifiers и axis-conversion (Z-up Blender →
        # Y-up glTF), иначе модель может прийти лежащей в Three.js.
        export_apply=True,
        export_skins=False,
        export_yup=True,
    )
