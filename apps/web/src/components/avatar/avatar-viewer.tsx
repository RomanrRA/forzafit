'use client'

import { Suspense, useEffect, useMemo, useRef, useState, type CSSProperties } from 'react'
import { Canvas, useFrame, useThree } from '@react-three/fiber'
import { Bounds, Center, OrbitControls, useGLTF } from '@react-three/drei'
import { Expand, ScanFace, ZoomIn, ZoomOut } from 'lucide-react'
import * as THREE from 'three'
import {
  GROUP_LABELS,
  getMorphsForGender,
  type AvatarGender,
  type MorphSpec,
} from '@/lib/avatar-morphs'
import { applyBodyToMorphs } from '@/lib/avatar-morphs-from-body'
import {
  applyProfileToMorphs,
  type UserBodyProfile,
} from '@/lib/avatar-measurements-mapping'
import type { BodyMeasurement } from '@/hooks/use-body-measurements'
import type { BodyGoals } from '@/hooks/use-body-goals'

// Дефолтные значения для пустого аватара — «атлетичный» силуэт.
function athleticPreset(gender: AvatarGender): Record<string, number> {
  const base: Record<string, number> = {
    muscle: 0.55,
    bodyFat: 0.15,
    chest: 0.35,
    arm: 0.4,
    forearm: 0.4,
    thigh: 0.45,
    calf: 0.4,
    neck: 0.3,
    waist: 0.0,
    hips: gender === 'female' ? 0.35 : 0.15,
    eyeSize: 0.0,
    eyeAlmond: 0.0,
    noseSize: 0.0,
    lipFullness: 0.0,
  }
  if (gender === 'female') base.breastSize = 0.4
  return base
}

function cameraBtnStyle(active: boolean): CSSProperties {
  return {
    width: 34,
    height: 34,
    display: 'inline-flex',
    alignItems: 'center',
    justifyContent: 'center',
    padding: 0,
    borderRadius: 8,
    background: active ? 'var(--gl-bg-strong)' : 'var(--gl-bg)',
    border: '1px solid ' + (active ? 'var(--gl-border-strong)' : 'var(--gl-border)'),
    backdropFilter: 'blur(8px)',
    cursor: 'pointer',
    color: 'var(--txt-1)',
  }
}

// Пресеты кожи — реальные diffuse-текстуры MakeHuman из skins01/skins02 CC0
// паков. Сепарируем по полу: женские текстуры на мужском теле выглядят
// странно (на бронзовом женском скине, например, есть нюансы под женскую UV).
const SKIN_PRESETS: {
  key: string
  label: string
  gender: AvatarGender
  src: string
}[] = [
  // ── Женские (skins01_cc0) ──
  { key: 'light_f',          label: 'Светлая',        gender: 'female', src: '/avatar/skins/light_f.webp' },
  { key: 'fair_f',           label: 'Бледная',        gender: 'female', src: '/avatar/skins/fair_f.webp' },
  { key: 'creamy_f',         label: 'Кремовая',       gender: 'female', src: '/avatar/skins/creamy_f.webp' },
  { key: 'uniform_f',        label: 'Ровная',         gender: 'female', src: '/avatar/skins/uniform_f.webp' },
  { key: 'genuine_f',        label: 'Натуральная',    gender: 'female', src: '/avatar/skins/genuine_f.webp' },
  { key: 'alana_f',          label: 'Алана',          gender: 'female', src: '/avatar/skins/alana_f.webp' },
  { key: 'zoey_f',           label: 'Зои',            gender: 'female', src: '/avatar/skins/zoey_f.webp' },
  { key: 'redhead_f',        label: 'Рыжая',          gender: 'female', src: '/avatar/skins/redhead_f.webp' },
  { key: 'freckles_f',       label: 'Веснушки',       gender: 'female', src: '/avatar/skins/freckles_f.webp' },
  { key: 'ginger_f',         label: 'Имбирная',       gender: 'female', src: '/avatar/skins/ginger_f.webp' },
  { key: 'ginger2_f',        label: 'Имбирная 2',     gender: 'female', src: '/avatar/skins/ginger2_f.webp' },
  { key: 'ginger_makeup_f',  label: 'Имб. макияж',    gender: 'female', src: '/avatar/skins/ginger_makeup_f.webp' },
  { key: 'makeup_f',         label: 'С макияжем',     gender: 'female', src: '/avatar/skins/makeup_f.webp' },
  { key: 'natural_makeup_f', label: 'Натур. макияж',  gender: 'female', src: '/avatar/skins/natural_makeup_f.webp' },
  { key: 'violet_makeup_f',  label: 'Фиол. макияж',   gender: 'female', src: '/avatar/skins/violet_makeup_f.webp' },
  { key: 'midtoned_f',       label: 'Средний',        gender: 'female', src: '/avatar/skins/midtoned_f.webp' },
  { key: 'eurasian_young_f', label: 'Евразийка мол.', gender: 'female', src: '/avatar/skins/eurasian_young_f.webp' },
  { key: 'eurasian_mid_f',   label: 'Евразийка сред.',gender: 'female', src: '/avatar/skins/eurasian_mid_f.webp' },
  { key: 'eurasian_old_f',   label: 'Евразийка возр.',gender: 'female', src: '/avatar/skins/eurasian_old_f.webp' },
  { key: 'bronze_f',         label: 'Загорелая',      gender: 'female', src: '/avatar/skins/bronze_f.webp' },
  { key: 'bronze_makeup_f',  label: 'Загар + макияж', gender: 'female', src: '/avatar/skins/bronze_makeup_f.webp' },
  { key: 'indian_f',         label: 'Индийская',      gender: 'female', src: '/avatar/skins/indian_f.webp' },
  { key: 'indian2_f',        label: 'Индийская 2',    gender: 'female', src: '/avatar/skins/indian2_f.webp' },
  // ── Мужские (skins02_cc0) ──
  { key: 'light_m',          label: 'Светлая',        gender: 'male',   src: '/avatar/skins/light_m.webp' },
  { key: 'freckles_m',       label: 'Веснушки',       gender: 'male',   src: '/avatar/skins/freckles_m.webp' },
  { key: 'ginger_m',         label: 'Имбирный',       gender: 'male',   src: '/avatar/skins/ginger_m.webp' },
  { key: 'aksel_m',          label: 'Аксель',         gender: 'male',   src: '/avatar/skins/aksel_m.webp' },
  { key: 'slavic_mid_m',     label: 'Славянин сред.', gender: 'male',   src: '/avatar/skins/slavic_mid_m.webp' },
  { key: 'slavic_old_m',     label: 'Славянин возр.', gender: 'male',   src: '/avatar/skins/slavic_old_m.webp' },
  { key: 'eurasian_old_m',   label: 'Евразиец возр.', gender: 'male',   src: '/avatar/skins/eurasian_old_m.webp' },
  { key: 'emo_m',            label: 'Эмо',            gender: 'male',   src: '/avatar/skins/emo_m.webp' },
  { key: 'eyeliner_m',       label: 'С подводкой',    gender: 'male',   src: '/avatar/skins/eyeliner_m.webp' },
  { key: 'goth_m',           label: 'Готический',     gender: 'male',   src: '/avatar/skins/goth_m.webp' },
  { key: 'viking_m',         label: 'Викинг (тату)',  gender: 'male',   src: '/avatar/skins/viking_m.webp' },
  { key: 'tattooed_m',       label: 'С тату',         gender: 'male',   src: '/avatar/skins/tattooed_m.webp' },
  { key: 'african_m',        label: 'Тёмная',         gender: 'male',   src: '/avatar/skins/african_m.webp' },
]

// Причёски — должны совпадать с ключами `hair_<key>` из Blender pipeline
// (см. HAIR_MALE/HAIR_FEMALE/HAIR_UNISEX в _avatar_common.py).
// gender 'both' = унисекс (есть в обоих GLB).
type HairGender = AvatarGender | 'both'
const HAIR_STYLES: { key: string | null; label: string; gender: HairGender }[] = [
  // «Без причёски» — для обоих полов. У мужчин раньше hair-mhclo через
  // delete-groups вырезала макушку, теперь Blender pipeline снимает Mask-
  // модификаторы перед export (strip_hair_mask_modifiers), и макушка цела.
  { key: null,                label: 'Без причёски',     gender: 'both'   },
  // Женские — 11 пресетов (7 «классических» женских + 4 формально-унисекс
  // ассета, но визуально женственные: длинные, аниме, повязка, маугли).
  { key: 'blunt_bob',         label: 'Каре прямое',       gender: 'female' },
  { key: 'blunt_bob_bangs',   label: 'Каре + чёлка',      gender: 'female' },
  { key: 'braid_french',      label: 'Французская коса',  gender: 'female' },
  { key: 'braid_reverse_bun', label: 'Коса в пучок',      gender: 'female' },
  { key: 'bun_brown',         label: 'Пучок',             gender: 'female' },
  { key: 'straight_bangs',    label: 'Прямые с чёлкой',   gender: 'female' },
  { key: 'strawberry_cloud',  label: 'Кудри (розовые)',   gender: 'female' },
  { key: 'long',              label: 'Длинные',           gender: 'female' },
  { key: 'anime',             label: 'Аниме',             gender: 'female' },
  { key: 'headband_blond',    label: 'С повязкой',        gender: 'female' },
  { key: 'junglebook',        label: 'Маугли',            gender: 'female' },
  // Мужские — только 2, других реально мужских в hair01_cc0 нет.
  { key: 'culturalibre_02',   label: 'Стрижка 1',         gender: 'male' },
  { key: 'culturalibre_05',   label: 'Стрижка 2',         gender: 'male' },
]

// Цвет глаз — готовые eye-текстуры из MakeHuman system assets. На runtime
// просто подменяем mat.map целиком (никакого tinting). swatch — цветной
// кружок (приблизительный цвет радужки).
const EYE_PRESETS: { key: string; label: string; src: string; swatch: string }[] = [
  { key: 'brown',     label: 'Карие',         src: '/avatar/eyes/brown.png',      swatch: '#5a3a1f' },
  { key: 'brownlight',label: 'Светло-карие',  src: '/avatar/eyes/brownlight.png', swatch: '#a07845' },
  { key: 'green',     label: 'Зелёные',       src: '/avatar/eyes/green.png',      swatch: '#4a7a4a' },
  { key: 'bluegreen', label: 'Сине-зелёные',  src: '/avatar/eyes/bluegreen.png',  swatch: '#4a8888' },
  { key: 'blue',      label: 'Голубые',       src: '/avatar/eyes/blue.png',       swatch: '#4a78b0' },
  { key: 'lightblue', label: 'Светло-голубые',src: '/avatar/eyes/lightblue.png',  swatch: '#7ab4d8' },
  { key: 'deepblue',  label: 'Тёмно-синие',   src: '/avatar/eyes/deepblue.png',   swatch: '#1f3a78' },
  { key: 'grey',      label: 'Серые',         src: '/avatar/eyes/grey.png',       swatch: '#8a8e93' },
  { key: 'ice',       label: 'Ледяные',       src: '/avatar/eyes/ice.png',        swatch: '#b8d4e0' },
]

function ModelMesh({
  url,
  morphs,
  skinSrc,
  hairKey,
  eyeSrc,
}: {
  url: string
  morphs: Record<string, number>
  skinSrc: string
  hairKey: string | null
  eyeSrc: string
}) {
  const { scene } = useGLTF(url, true, true)
  const root = useRef<THREE.Group>(null)
  const currentRef = useRef<Record<string, number>>({})

  // DIAG: одноразовый дамп morph-структуры по mesh-объектам сцены.
  useEffect(() => {
    const rows: Array<{ name: string; dict: string[]; infl: number }> = []
    scene.traverse((obj) => {
      const mesh = obj as THREE.Mesh
      if (!mesh.isMesh) return
      const dict = mesh.morphTargetDictionary
        ? Object.keys(mesh.morphTargetDictionary)
        : []
      const infl = mesh.morphTargetInfluences?.length ?? 0
      rows.push({ name: mesh.name || '(no name)', dict, infl })
    })
    // eslint-disable-next-line no-console
    console.log('[AVATAR DIAG]', url)
    for (const r of rows) {
      // eslint-disable-next-line no-console
      console.log(`  ${r.name}  infl=${r.infl}  morphs=[${r.dict.join(',')}]`)
    }
  }, [scene, url])

  // Skin diffuse: подгружаем PNG из skins01/02 CC0 как texture и применяем
  // как map у body mesh. Body — это нода 'Human' (root MakeHuman + mesh
  // 'base'); three.js при загрузке glTF берёт имя из node, поэтому
  // mesh.name === 'Human'. Fallback на max-vertex отключён: у женского
  // GLB hair_anime (91k верт) больше body (14k), max-vertex эвристика
  // на нём ломалась — скин применялся на причёску.
  useEffect(() => {
    let cancelled = false
    let bodyMesh: THREE.Mesh | null = null
    scene.traverse((obj) => {
      const mesh = obj as THREE.Mesh
      if (bodyMesh) return
      if (!mesh.isMesh || !mesh.geometry) return
      const n = mesh.name?.toLowerCase()
      if (n === 'human' || n === 'base') bodyMesh = mesh
    })
    if (!bodyMesh) return

    const loader = new THREE.TextureLoader()
    loader.load(skinSrc, (tex) => {
      if (cancelled) return
      tex.colorSpace = THREE.SRGBColorSpace
      tex.flipY = false // glTF UV-конвенция
      const mats = Array.isArray((bodyMesh as THREE.Mesh).material)
        ? ((bodyMesh as THREE.Mesh).material as THREE.Material[])
        : [(bodyMesh as THREE.Mesh).material as THREE.Material]
      for (const m of mats) {
        const mat = m as THREE.MeshStandardMaterial
        if (!mat) continue
        if (mat.map && mat.map !== tex) mat.map.dispose()
        mat.map = tex
        // Roughness=1 (дефолт) делает кожу плоской «бархатной». Сбавляем —
        // появятся блики на щеках/носу, кожа перестанет выглядеть тряпкой.
        if ('roughness' in mat) mat.roughness = 0.55
        if ('metalness' in mat) mat.metalness = 0.0
        // MakeHuman бейкает AO в diffuse — кожа выходит тёмной. Лёгкий
        // brightness через color (color может быть >1, это HDR-multiplier).
        if ('color' in mat) mat.color.setRGB(1.15, 1.15, 1.15)
        mat.needsUpdate = true
      }
    })
    return () => {
      cancelled = true
    }
  }, [scene, skinSrc])

  // Причёска: ищем все hair_-меши, прячем все кроме выбранного. Если
  // hairKey === null или такой меши нет в GLB — все hair скрыты.
  useEffect(() => {
    scene.traverse((obj) => {
      const mesh = obj as THREE.Mesh
      if (!mesh.isMesh || !mesh.name) return
      if (!mesh.name.toLowerCase().startsWith('hair_')) return
      const key = mesh.name.slice(5) // "hair_<key>"
      mesh.visible = hairKey !== null && key === hairKey
    })
  }, [scene, hairKey])

  // MakeHuman экспортирует hair-материалы с alphaMode=BLEND. У BLEND нет
  // depth write → при вращении пряди рисуются «сквозь себя», получается
  // каша. Переключаем на alpha-test: depthWrite=true + transparent=false +
  // alphaTest>0. DoubleSide — чтобы пряди читались с обеих сторон.
  useEffect(() => {
    scene.traverse((obj) => {
      const mesh = obj as THREE.Mesh
      if (!mesh.isMesh || !mesh.name) return
      if (!mesh.name.toLowerCase().startsWith('hair_')) return
      const mats = Array.isArray(mesh.material)
        ? (mesh.material as THREE.Material[])
        : [mesh.material as THREE.Material]
      for (const m of mats) {
        const mat = m as THREE.MeshStandardMaterial
        if (!mat) continue
        mat.transparent = false
        mat.depthWrite = true
        mat.alphaTest = 0.5
        mat.side = THREE.DoubleSide
        mat.needsUpdate = true
      }
    })
  }, [scene])

  // Одежда (clothes_*) и body лежат практически на одной плоскости — без
  // глубинного зазора depth-buffer выбирает то одно, то другое и кожа
  // мерцает сквозь трусы/бра. Сдвигаем clothes на сегмент вперёд через
  // polygonOffset (рендер-уровень, без модификации геометрии). renderOrder=1
  // подстраховывает порядок прохода — clothes идут после body.
  useEffect(() => {
    scene.traverse((obj) => {
      const mesh = obj as THREE.Mesh
      if (!mesh.isMesh || !mesh.name) return
      if (!mesh.name.toLowerCase().startsWith('clothes_')) return
      mesh.renderOrder = 1
      const mats = Array.isArray(mesh.material)
        ? (mesh.material as THREE.Material[])
        : [mesh.material as THREE.Material]
      for (const m of mats) {
        const mat = m as THREE.MeshStandardMaterial
        if (!mat) continue
        mat.polygonOffset = true
        mat.polygonOffsetFactor = -2
        mat.polygonOffsetUnits = -2
        mat.depthWrite = true
        mat.transparent = false
        mat.alphaTest = 0
        mat.needsUpdate = true
      }
    })
  }, [scene])

  // Цвет глаз — просто подменяем eye-map целиком на готовую текстуру
  // MakeHuman из `/avatar/eyes/<key>.png`. Никакой обработки на лету.
  useEffect(() => {
    let cancelled = false
    const loader = new THREE.TextureLoader()
    loader.load(eyeSrc, (tex) => {
      if (cancelled) return
      tex.colorSpace = THREE.SRGBColorSpace
      tex.flipY = false // glTF convention
      scene.traverse((obj) => {
        const mesh = obj as THREE.Mesh
        if (!mesh.isMesh || !mesh.name) return
        const n = mesh.name.toLowerCase()
        if (n === 'base') return
        // Hair, clothes — точно не глаза. Иначе эвристика по имени материала
        // (brown.mhmat для глаз) ловит «Hair_bun_brown.mhmat» и текстура глаза
        // покрывает причёску.
        if (n.startsWith('hair_') || n.startsWith('clothes_')) return
        const mats = Array.isArray(mesh.material)
          ? (mesh.material as THREE.Material[])
          : [mesh.material as THREE.Material]
        const matNamesArr = mats.map(
          (m) => (m as { name?: string })?.name?.toLowerCase() ?? '',
        )
        const matNames = matNamesArr.join('|')
        const isEye =
          (n.includes('eye') && !n.includes('eyelash')) ||
          n === 'low-poly' ||
          n === 'low_poly' ||
          (matNames.includes('eye') && !matNames.includes('eyelash')) ||
          // Exact-match по eye-material имени, без includes — иначе ловит hair.
          matNamesArr.some((mn) => mn === 'brown' || mn === 'brown.mhmat')
        if (!isEye) return
        for (const m of mats) {
          const mat = m as THREE.MeshStandardMaterial
          if (!mat) continue
          if (mat.map && mat.map !== tex) mat.map.dispose()
          mat.map = tex
          if ('color' in mat) mat.color.setRGB(1, 1, 1)
          mat.needsUpdate = true
        }
      })
    })
    return () => {
      cancelled = true
    }
  }, [scene, eyeSrc])

  useFrame(() => {
    if (!scene) return
    scene.traverse((obj) => {
      const mesh = obj as THREE.Mesh
      if (!mesh.isMesh || !mesh.morphTargetDictionary || !mesh.morphTargetInfluences) return
      for (const [name, targetIdx] of Object.entries(mesh.morphTargetDictionary)) {
        const target = morphs[name] ?? 0
        const current = currentRef.current[name] ?? 0
        const next = current + (target - current) * 0.18
        currentRef.current[name] = next
        mesh.morphTargetInfluences[targetIdx as number] = next
      }
    })
  })

  return <primitive ref={root} object={scene} dispose={null} />
}

/**
 * One-shot перемещение камеры между body↔face режимами.
 * Анимирует только пока не достигла цели — потом отпускает контролы,
 * чтобы юзер мог свободно крутить/зумить без drift.
 */
function CameraFocus({
  mode,
  nonce,
}: {
  mode: 'face' | 'body'
  nonce: number
}) {
  const { camera, scene } = useThree()
  const animatingRef = useRef(false)
  const desiredRef = useRef<{ target: THREE.Vector3; distance: number } | null>(null)

  // Срабатывает при каждом изменении mode или nonce (включая первый mount).
  // Модель грузится асинхронно через Suspense — bbox может быть пустым,
  // поэтому ретраим пока сцена не появится. Это даёт корректный
  // initial-фокус на body после загрузки GLB.
  useEffect(() => {
    let cancelled = false
    let timer: ReturnType<typeof setTimeout> | null = null

    function tryFit() {
      if (cancelled) return
      const bbox = new THREE.Box3().setFromObject(scene)
      const size = new THREE.Vector3()
      const sizeOk =
        isFinite(bbox.min.y) &&
        isFinite(bbox.max.y) &&
        !bbox.isEmpty() &&
        bbox.getSize(size).length() > 0.1

      if (!sizeOk) {
        timer = setTimeout(tryFit, 80)
        return
      }

      const center = new THREE.Vector3()
      bbox.getCenter(center)

      if (mode === 'face') {
        desiredRef.current = {
          target: new THREE.Vector3(
            center.x,
            bbox.max.y - size.y * 0.05,
            center.z,
          ),
          distance: size.y * 0.4,
        }
      } else {
        desiredRef.current = {
          target: center.clone(),
          distance: size.y * 1.4,
        }
      }
      animatingRef.current = true
    }

    tryFit()
    return () => {
      cancelled = true
      if (timer) clearTimeout(timer)
    }
  }, [mode, nonce, scene])

  useFrame((state) => {
    if (!animatingRef.current || !desiredRef.current) return
    const controls = state.controls as unknown as {
      target: THREE.Vector3
      update: () => void
    } | null
    if (!controls) return

    const { target: desiredTarget, distance: desiredDistance } = desiredRef.current

    controls.target.lerp(desiredTarget, 0.12)
    const dir = new THREE.Vector3()
      .subVectors(camera.position, controls.target)
      .normalize()
    if (dir.lengthSq() < 1e-6) dir.set(0, 0, 1)
    const targetPos = new THREE.Vector3()
      .copy(controls.target)
      .add(dir.multiplyScalar(desiredDistance))
    camera.position.lerp(targetPos, 0.12)
    controls.update()

    if (
      controls.target.distanceTo(desiredTarget) < 0.02 &&
      camera.position.distanceTo(targetPos) < 0.05
    ) {
      animatingRef.current = false
      desiredRef.current = null
    }
  })

  return null
}

type ZoomFn = (dir: 'in' | 'out') => void

/**
 * Пробрасывает функцию зума наружу через ref, чтобы можно было
 * управлять камерой кнопками поверх Canvas.
 */
function ZoomBridge({
  apiRef,
}: {
  apiRef: React.MutableRefObject<ZoomFn | null>
}) {
  const camera = useThree((s) => s.camera)
  const controls = useThree((s) => s.controls) as
    | {
        target: THREE.Vector3
        minDistance?: number
        maxDistance?: number
        update?: () => void
      }
    | null

  useEffect(() => {
    apiRef.current = (dir) => {
      if (!controls?.target) return
      const factor = dir === 'in' ? 0.78 : 1.28
      const offset = new THREE.Vector3().subVectors(camera.position, controls.target)
      const minD = controls.minDistance ?? 0.1
      const maxD = controls.maxDistance ?? 100
      const newLen = THREE.MathUtils.clamp(offset.length() * factor, minD, maxD)
      offset.setLength(newLen)
      camera.position.copy(controls.target).add(offset)
      controls.update?.()
    }
    return () => {
      apiRef.current = null
    }
  }, [camera, controls, apiRef])

  return null
}

function Stage({
  url,
  morphs,
  focus,
  focusNonce,
  skinSrc,
  hairKey,
  eyeSrc,
  zoomRef,
}: {
  url: string
  morphs: Record<string, number>
  focus: 'face' | 'body'
  focusNonce: number
  skinSrc: string
  hairKey: string | null
  eyeSrc: string
  zoomRef: React.MutableRefObject<ZoomFn | null>
}) {
  // Уменьшили maxDistance, чтобы аватар не превращался в точку на максимуме
  // зума. В face-режиме разрешаем подъезжать сильно ближе — иначе нельзя
  // приблизить голову до уровня деталей лица.
  const maxDistance = focus === 'face' ? 5 : 8
  const minDistance = focus === 'face' ? 0.25 : 2

  // Размер canvas нужен только в ключе Bounds, чтобы пере-фитить при ресайзе
  // (мобильный viewport на iOS / поворот экрана). Сама Bounds — однократный
  // fit, иначе аватар «прыгает» при изменении морфов.
  const size = useThree((s) => s.size)
  const refitKey = `${Math.round(size.width)}x${Math.round(size.height)}`

  return (
    <>
      <ambientLight intensity={1.4} />
      <directionalLight position={[3, 5, 4]} intensity={2.4} castShadow />
      <directionalLight position={[-3, 2, -4]} intensity={1.1} />
      {/* rim из-за головы — освещает контур, отрывает фигуру от фона */}
      <directionalLight position={[0, 3, -5]} intensity={0.9} />
      {/* clip убран намеренно: clip сжимает near/far камеры на момент fit,
          после этого зум-in упирается в near plane и кажется, что
          приближать нельзя. observe тоже убран — иначе Bounds refit-ит
          при каждом изменении морфа, и аватар «прыгает». Вместо observe
          бампаем key при изменении размера canvas — это перемонтирует
          Bounds и заново фитит только при ресайзе. */}
      <Bounds key={`${url}-${refitKey}`} fit margin={1.25}>
        <Center>
          <Suspense fallback={null}>
            <ModelMesh
              url={url}
              morphs={morphs}
              skinSrc={skinSrc}
              hairKey={hairKey}
              eyeSrc={eyeSrc}
            />
          </Suspense>
        </Center>
      </Bounds>
      <OrbitControls
        makeDefault
        enablePan={false}
        minDistance={minDistance}
        maxDistance={maxDistance}
      />
      <CameraFocus mode={focus} nonce={focusNonce} />
      <ZoomBridge apiRef={zoomRef} />
    </>
  )
}

interface SliderRowProps {
  spec: MorphSpec
  value: number
  onChange: (v: number) => void
  onFocus?: () => void
  readOnly?: boolean
}

function SliderRow({ spec, value, onChange, onFocus, readOnly }: SliderRowProps) {
  return (
    <label className="flex flex-col gap-1" style={{ fontSize: 12 }}>
      <div className="flex items-center justify-between">
        <span style={{ color: 'var(--txt-2)', fontWeight: 600 }}>{spec.label}</span>
        <span className="tnum" style={{ color: 'var(--txt-3)' }}>
          {Math.round(value * 100)}%
        </span>
      </div>
      <input
        type="range"
        min={0}
        max={1}
        step={0.01}
        value={value}
        onChange={(e) => onChange(parseFloat(e.target.value))}
        onPointerDown={onFocus}
        onFocus={onFocus}
        disabled={readOnly}
        style={{
          width: '100%',
          accentColor: 'var(--c-accent)',
          opacity: readOnly ? 0.5 : 1,
        }}
      />
    </label>
  )
}

type TabKey = 'start' | 'now' | 'goal'
type SubTab = 'params' | 'look'

interface AvatarViewerProps {
  gender: AvatarGender
  startMeasurement?: BodyMeasurement | null
  currentMeasurement?: BodyMeasurement | null
  goals?: BodyGoals | null
  /** Базовые параметры из профиля юзера. Управляют scale модели и
   *  начальным «телосложением» (BMI-бакеты) для вкладки now. */
  profile?: UserBodyProfile | null
  /** Открыть диалог AI-цели (передаётся из AvatarBlock). */
  onOpenAiGoal?: () => void
}

export default function AvatarViewer({
  gender: propGender,
  startMeasurement,
  currentMeasurement,
  goals,
  profile,
  onOpenAiGoal,
}: AvatarViewerProps) {
  const [tab, setTab] = useState<TabKey>('now')
  const [subTab, setSubTab] = useState<SubTab>('params')
  // Пол строго из профиля — переключатель убран.
  const gender = propGender
  const defaultSkin = gender === 'male' ? 'light_m' : 'light_f'
  const [skinKey, setSkinKey] = useState<string>(defaultSkin)
  // Доступны только пресеты текущего пола — иначе UV не совпадает и кожа
  // выглядит криво (например, женская diffuse-волосатость на мужском теле).
  const visibleSkins = useMemo(
    () => SKIN_PRESETS.filter((s) => s.gender === gender),
    [gender],
  )
  const skinSrc = useMemo(() => {
    const found = visibleSkins.find((s) => s.key === skinKey)
    return (found ?? visibleSkins[0]).src
  }, [visibleSkins, skinKey])
  // Причёски: фильтруем «свой пол» + унисекс.
  const visibleHair = useMemo(
    () => HAIR_STYLES.filter((h) => h.gender === gender || h.gender === 'both'),
    [gender],
  )
  // Дефолт зависит от пола: у мужчин нет «Без причёски» (см. ниже про дырку
  // в черепе), поэтому стартовое значение — первая доступная причёска.
  const defaultHair = gender === 'male' ? 'culturalibre_02' : null
  const [hairKey, setHairKey] = useState<string | null>(defaultHair)
  useEffect(() => {
    // При смене пола: если текущий выбор недоступен → ставим дефолт пола.
    const has = visibleHair.some((h) => h.key === hairKey)
    if (!has) {
      setHairKey(gender === 'male' ? 'culturalibre_02' : null)
    }
  }, [visibleHair, hairKey, gender])
  const [eyeKey, setEyeKey] = useState<string>(EYE_PRESETS[0].key)
  const eyeSrc = useMemo(
    () =>
      EYE_PRESETS.find((e) => e.key === eyeKey)?.src ?? EYE_PRESETS[0].src,
    [eyeKey],
  )

  // Базовые морфы для каждой вкладки — из замеров поверх athletic preset.
  // Для вкладки «Сейчас» сначала применяем профиль (рост/вес/возраст из
  // users) — даёт BMI-бакет, затем детальные замеры обхватов поверх.
  // Ручные правки пользователя — в state, привязаны к вкладке.
  const profileResult = useMemo(() => {
    if (!profile) return null
    const baseline = athleticPreset(gender)
    return applyProfileToMorphs(baseline, { ...profile, gender })
  }, [profile, gender])

  const tabBaseMorphs = useMemo(() => {
    const baseline = athleticPreset(gender)
    const nowBaseline = profileResult ? profileResult.morphs : baseline
    return {
      start: applyBodyToMorphs(baseline, startMeasurement, gender),
      now: applyBodyToMorphs(nowBaseline, currentMeasurement, gender),
      goal: applyBodyToMorphs(baseline, goals, gender),
    } as Record<TabKey, Record<string, number>>
  }, [gender, startMeasurement, currentMeasurement, goals, profileResult])


  const [overrides, setOverrides] = useState<Record<TabKey, Record<string, number>>>({
    start: {},
    now: {},
    goal: {},
  })

  // При смене gender или появлении измерений — сбрасываем overrides.
  // Skin тоже переключаем на «свой» по полу, иначе UV female-текстуры
  // на male-теле даёт артефакты.
  useEffect(() => {
    setOverrides({ start: {}, now: {}, goal: {} })
    setSkinKey(gender === 'male' ? 'light_m' : 'light_f')
  }, [gender])

  const morphs = useMemo(() => {
    return { ...tabBaseMorphs[tab], ...overrides[tab] }
  }, [tabBaseMorphs, overrides, tab])

  const [focus, setFocus] = useState<'face' | 'body'>('body')
  // Бампается на каждый клик кнопки фокуса — даже если mode не меняется,
  // CameraFocus всё равно перенацеливается. Также инкрементится при mount,
  // чтобы initial fit на тело отрабатывал после загрузки модели.
  const [focusNonce, setFocusNonce] = useState(0)
  const recenter = (m: 'face' | 'body') => {
    setFocus(m)
    setFocusNonce((n) => n + 1)
  }
  const zoomRef = useRef<ZoomFn | null>(null)

  // Версия в query string — cache buster. Поднимать при перегенерации GLB,
  // иначе браузер / SW отдают старый файл и новые morph-таргеты на одежде
  // не подхватываются.
  const url = `/avatar/${gender}.glb?v=7`
  const visibleMorphs = useMemo(() => getMorphsForGender(gender), [gender])

  const byGroup = useMemo(() => {
    const out: Record<MorphSpec['group'], MorphSpec[]> = {
      face: [],
      torso: [],
      limbs: [],
      overall: [],
    }
    for (const m of visibleMorphs) out[m.group].push(m)
    return out
  }, [visibleMorphs])

  // Start read-only только если есть зафиксированный снимок.
  const readOnly = tab === 'start' && !!startMeasurement

  const applyPreset = (preset: 'athletic' | 'slim' | 'heavy' | 'reset') => {
    if (preset === 'reset') {
      setOverrides((prev) => ({ ...prev, [tab]: {} }))
      return
    }
    const next: Record<string, number> = {}
    for (const m of visibleMorphs) next[m.key] = 0
    if (preset === 'athletic') {
      Object.assign(next, athleticPreset(gender))
    } else if (preset === 'slim') {
      next.muscle = 0.2
      next.bodyFat = 0.0
      next.waist = 0.0
      next.hips = gender === 'female' ? 0.25 : 0.1
      if (gender === 'female') next.breastSize = 0.2
    } else if (preset === 'heavy') {
      next.bodyFat = 0.8
      next.muscle = 0.3
      next.waist = 0.6
      next.hips = 0.5
      next.chest = 0.5
      next.neck = 0.5
      if (gender === 'female') next.breastSize = 0.6
    }
    setOverrides((prev) => ({ ...prev, [tab]: next }))
  }

  return (
    <div
      style={{
        display: 'flex',
        flexDirection: 'column',
        gap: 10,
      }}
    >
      {/* Над canvas: табы Начало/Сейчас/Цель. Пол берётся из профиля. */}
      <div
        style={{
          display: 'flex',
          flexWrap: 'wrap',
          alignItems: 'center',
          gap: 8,
        }}
      >
      <div
        style={{
          display: 'inline-flex',
          alignSelf: 'flex-start',
          gap: 4,
          padding: 4,
          borderRadius: 10,
          background: 'var(--gl-bg)',
          border: '1px solid var(--gl-border)',
          backdropFilter: 'blur(8px)',
        }}
      >
        {(['start', 'now', 'goal'] as TabKey[]).map((t) => {
          const label = t === 'start' ? 'Начало' : t === 'now' ? 'Сейчас' : 'Цель'
          return (
            <button
              key={t}
              type="button"
              onClick={() => setTab(t)}
              className="glass-btn"
              style={{
                padding: '6px 12px',
                fontSize: 12,
                fontWeight: 700,
                borderRadius: 8,
                background: tab === t ? 'var(--gl-bg-strong)' : 'transparent',
                border:
                  '1px solid ' +
                  (tab === t ? 'var(--gl-border-strong)' : 'transparent'),
                color: tab === t ? 'var(--txt-1)' : 'var(--txt-2)',
                cursor: 'pointer',
              }}
            >
              {label}
            </button>
          )
        })}
      </div>
      </div>

      <div
        style={{
          display: 'grid',
          gridTemplateColumns: 'minmax(0, 1fr) 320px',
          gap: 16,
          alignItems: 'stretch',
          height: 'calc(100vh - 220px)',
        }}
        className="avatar-grid"
      >
        <div
          className="glass-card avatar-canvas-card"
          style={{ position: 'relative', overflow: 'hidden', minHeight: 360 }}
        >
          <Canvas
            camera={{ position: [0, 0, 8], fov: 35, near: 0.05, far: 200 }}
            shadows
            gl={{ antialias: true, preserveDrawingBuffer: false }}
            style={{ width: '100%', height: '100%' }}
          >
            <Stage
              url={url}
              morphs={morphs}
              focus={focus}
              focusNonce={focusNonce}
              skinSrc={skinSrc}
              hairKey={hairKey}
              eyeSrc={eyeSrc}
              zoomRef={zoomRef}
            />
          </Canvas>

        {/* Камера: зум + переключение лицо/общий вид */}
        <div
          style={{
            position: 'absolute',
            top: 12,
            right: 12,
            display: 'flex',
            flexDirection: 'column',
            gap: 6,
          }}
        >
          <button
            type="button"
            onClick={() => zoomRef.current?.('in')}
            className="glass-btn"
            title="Приблизить"
            aria-label="Приблизить"
            style={cameraBtnStyle(false)}
          >
            <ZoomIn size={16} />
          </button>
          <button
            type="button"
            onClick={() => zoomRef.current?.('out')}
            className="glass-btn"
            title="Отдалить"
            aria-label="Отдалить"
            style={cameraBtnStyle(false)}
          >
            <ZoomOut size={16} />
          </button>
          <button
            type="button"
            onClick={() => recenter('body')}
            className="glass-btn"
            title="Общий вид"
            aria-label="Общий вид"
            style={cameraBtnStyle(focus === 'body')}
          >
            <Expand size={16} />
          </button>
          <button
            type="button"
            onClick={() => recenter('face')}
            className="glass-btn"
            title="К лицу"
            aria-label="К лицу"
            style={cameraBtnStyle(focus === 'face')}
          >
            <ScanFace size={16} />
          </button>
        </div>
      </div>

      {/* Editor */}
      <div
        className="glass-card"
        style={{
          padding: 16,
          overflowY: 'auto',
          maxHeight: '100%',
          display: 'flex',
          flexDirection: 'column',
          gap: 12,
        }}
      >
        {/* SubTabs: Параметры / Внешний вид */}
        <div
          style={{
            display: 'flex',
            gap: 4,
            padding: 4,
            borderRadius: 10,
            background: 'var(--gl-bg)',
            border: '1px solid var(--gl-border)',
          }}
        >
          {(['params', 'look'] as SubTab[]).map((st) => {
            const label = st === 'params' ? 'Параметры' : 'Внешний вид'
            return (
              <button
                key={st}
                type="button"
                onClick={() => setSubTab(st)}
                className="glass-btn"
                style={{
                  flex: 1,
                  padding: '6px 10px',
                  fontSize: 12,
                  fontWeight: 700,
                  borderRadius: 8,
                  background: subTab === st ? 'var(--gl-bg-strong)' : 'transparent',
                  border:
                    '1px solid ' +
                    (subTab === st ? 'var(--gl-border-strong)' : 'transparent'),
                  color: subTab === st ? 'var(--txt-1)' : 'var(--txt-2)',
                  cursor: 'pointer',
                }}
              >
                {label}
              </button>
            )
          })}
        </div>

        {/* Tab context info */}
        <div
          style={{
            fontSize: 12,
            color: 'var(--txt-3)',
            display: 'flex',
            flexDirection: 'column',
            gap: 8,
          }}
        >
          {tab === 'start' &&
            (startMeasurement ? (
              <span>
                Снимок от {new Date(startMeasurement.date).toLocaleDateString('ru-RU')}
              </span>
            ) : (
              <>
                <span>Добавьте первый замер, чтобы зафиксировать «Начало».</span>
                <a
                  href="/body"
                  className="glass-btn"
                  style={{
                    padding: '6px 12px',
                    fontSize: 12,
                    fontWeight: 700,
                    borderRadius: 8,
                    color: 'var(--txt-1)',
                    textAlign: 'center',
                  }}
                >
                  Внести замер
                </a>
              </>
            ))}
          {tab === 'now' &&
            (currentMeasurement ? (
              <span>
                Последний замер от{' '}
                {new Date(currentMeasurement.date).toLocaleDateString('ru-RU')}
              </span>
            ) : (
              <span>Замеров пока нет — показан атлетичный силуэт.</span>
            ))}
          {tab === 'goal' &&
            (goals ? (
              <span>
                {goals.targetDate
                  ? `Цель к ${new Date(goals.targetDate).toLocaleDateString('ru-RU')}`
                  : 'Цель без даты'}
              </span>
            ) : (
              <>
                <span>
                  Цель ещё не задана. Подвигайте ползунки, чтобы прикинуть, к чему
                  хочется прийти.
                </span>
                {onOpenAiGoal && (
                  <button
                    type="button"
                    onClick={onOpenAiGoal}
                    className="glass-btn"
                    style={{
                      padding: '6px 12px',
                      fontSize: 12,
                      fontWeight: 700,
                      borderRadius: 8,
                      color: 'var(--txt-1)',
                      textAlign: 'center',
                      cursor: 'pointer',
                    }}
                  >
                    Задать AI-цель
                  </button>
                )}
              </>
            ))}
        </div>

        {subTab === 'params' && (
          <>
            {!readOnly && (
              <div style={{ display: 'flex', gap: 6, flexWrap: 'wrap' }}>
                <button
                  type="button"
                  onClick={() => applyPreset('athletic')}
                  className="glass-btn"
                  style={{ flex: 1, padding: '6px 8px', fontSize: 11, fontWeight: 700 }}
                >
                  Атлет
                </button>
                <button
                  type="button"
                  onClick={() => applyPreset('slim')}
                  className="glass-btn"
                  style={{ flex: 1, padding: '6px 8px', fontSize: 11, fontWeight: 700 }}
                >
                  Худой
                </button>
                <button
                  type="button"
                  onClick={() => applyPreset('heavy')}
                  className="glass-btn"
                  style={{ flex: 1, padding: '6px 8px', fontSize: 11, fontWeight: 700 }}
                >
                  Полный
                </button>
                <button
                  type="button"
                  onClick={() => applyPreset('reset')}
                  className="glass-btn"
                  style={{
                    flex: 1,
                    padding: '6px 8px',
                    fontSize: 11,
                    fontWeight: 700,
                    color: 'var(--c-red)',
                  }}
                >
                  Сброс
                </button>
              </div>
            )}

            {(['torso', 'limbs', 'overall'] as const).map((group) => {
              const items = byGroup[group]
              if (items.length === 0) return null
              return (
                <div
                  key={group}
                  style={{ display: 'flex', flexDirection: 'column', gap: 8 }}
                >
                  <div
                    style={{
                      fontSize: 11,
                      fontWeight: 800,
                      letterSpacing: 0.5,
                      textTransform: 'uppercase',
                      color: 'var(--txt-3)',
                    }}
                  >
                    {GROUP_LABELS[group]}
                  </div>
                  {items.map((spec) => (
                    <SliderRow
                      key={spec.key}
                      spec={spec}
                      value={morphs[spec.key] ?? 0}
                      readOnly={readOnly}
                      onChange={(v) =>
                        setOverrides((prev) => ({
                          ...prev,
                          [tab]: { ...prev[tab], [spec.key]: v },
                        }))
                      }
                    />
                  ))}
                </div>
              )
            })}
          </>
        )}

        {subTab === 'look' && (
          <>
            {/* Кожа — настоящие MakeHuman diffuse-текстуры */}
            <div style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
              <div
                style={{
                  fontSize: 11,
                  fontWeight: 800,
                  letterSpacing: 0.5,
                  textTransform: 'uppercase',
                  color: 'var(--txt-3)',
                }}
              >
                Кожа
              </div>
              <div style={{ display: 'flex', gap: 8, flexWrap: 'wrap' }}>
                {visibleSkins.map((preset) => {
                  const active = skinKey === preset.key
                  return (
                    <button
                      key={preset.key}
                      type="button"
                      onClick={() => setSkinKey(preset.key)}
                      title={preset.label}
                      aria-label={preset.label}
                      style={{
                        width: 44,
                        height: 44,
                        borderRadius: 8,
                        backgroundImage: `url(${preset.src})`,
                        // UV-атлас MakeHuman: лицо в верхней четверти, обрежем
                        // на превью именно его — пользователь видит «как
                        // выглядит лицо».
                        backgroundSize: '300% 300%',
                        backgroundPosition: '50% 18%',
                        border:
                          '2px solid ' +
                          (active ? 'var(--c-accent)' : 'var(--gl-border)'),
                        cursor: 'pointer',
                        boxShadow: active
                          ? '0 0 0 2px var(--c-accent-soft)'
                          : undefined,
                        padding: 0,
                      }}
                    />
                  )
                })}
              </div>
            </div>

            {/* Лицо — морфы */}
            {byGroup.face.length > 0 && (
              <div style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
                <div
                  style={{
                    fontSize: 11,
                    fontWeight: 800,
                    letterSpacing: 0.5,
                    textTransform: 'uppercase',
                    color: 'var(--txt-3)',
                  }}
                >
                  Лицо
                </div>
                {byGroup.face.map((spec) => (
                  <SliderRow
                    key={spec.key}
                    spec={spec}
                    value={morphs[spec.key] ?? 0}
                    readOnly={readOnly}
                    onChange={(v) =>
                      setOverrides((prev) => ({
                        ...prev,
                        [tab]: { ...prev[tab], [spec.key]: v },
                      }))
                    }
                  />
                ))}
              </div>
            )}

            {/* Причёска */}
            <div style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
              <div
                style={{
                  fontSize: 11,
                  fontWeight: 800,
                  letterSpacing: 0.5,
                  textTransform: 'uppercase',
                  color: 'var(--txt-3)',
                }}
              >
                Причёска
              </div>
              <div style={{ display: 'flex', gap: 6, flexWrap: 'wrap' }}>
                {visibleHair.map((h) => {
                  const active = hairKey === h.key
                  return (
                    <button
                      key={h.key ?? 'none'}
                      type="button"
                      onClick={() => setHairKey(h.key)}
                      className="glass-btn"
                      title={h.label}
                      style={{
                        padding: '6px 10px',
                        fontSize: 11,
                        fontWeight: 700,
                        borderRadius: 8,
                        background: active
                          ? 'var(--gl-bg-strong)'
                          : 'transparent',
                        border:
                          '1px solid ' +
                          (active ? 'var(--c-accent)' : 'var(--gl-border)'),
                        color: active ? 'var(--txt-1)' : 'var(--txt-2)',
                        cursor: 'pointer',
                      }}
                    >
                      {h.label}
                    </button>
                  )
                })}
              </div>
            </div>

            {/* Цвет глаз */}
            <div style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
              <div
                style={{
                  fontSize: 11,
                  fontWeight: 800,
                  letterSpacing: 0.5,
                  textTransform: 'uppercase',
                  color: 'var(--txt-3)',
                }}
              >
                Цвет глаз
              </div>
              <div style={{ display: 'flex', gap: 6, flexWrap: 'wrap' }}>
                {EYE_PRESETS.map((preset) => {
                  const active = eyeKey === preset.key
                  return (
                    <button
                      key={preset.key}
                      type="button"
                      onClick={() => setEyeKey(preset.key)}
                      title={preset.label}
                      aria-label={preset.label}
                      style={{
                        width: 30,
                        height: 30,
                        borderRadius: '50%',
                        background: preset.swatch,
                        border:
                          '2px solid ' +
                          (active ? 'var(--c-accent)' : 'var(--gl-border)'),
                        cursor: 'pointer',
                        boxShadow: active
                          ? '0 0 0 2px var(--c-accent-soft)'
                          : undefined,
                        padding: 0,
                      }}
                    />
                  )
                })}
              </div>
            </div>
          </>
        )}
      </div>
      </div>
    </div>
  )
}

useGLTF.preload('/avatar/male.glb?v=7', true, true)
useGLTF.preload('/avatar/female.glb?v=7', true, true)
