import type { CSSProperties } from 'react'
import type { AvatarGender } from '@/lib/avatar-morphs'

// Дефолтные значения для пустого аватара — «атлетичный» силуэт.
export function athleticPreset(gender: AvatarGender): Record<string, number> {
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

export function cameraBtnStyle(active: boolean): CSSProperties {
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
