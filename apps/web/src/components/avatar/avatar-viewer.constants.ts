import type { AvatarGender } from '@/lib/avatar-morphs'

// Пресеты кожи — реальные diffuse-текстуры MakeHuman из skins01/skins02 CC0
// паков. Сепарируем по полу: женские текстуры на мужском теле выглядят
// странно (на бронзовом женском скине, например, есть нюансы под женскую UV).
export const SKIN_PRESETS: {
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
export const HAIR_STYLES: { key: string | null; label: string; gender: HairGender }[] = [
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
export const EYE_PRESETS: { key: string; label: string; src: string; swatch: string }[] = [
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
