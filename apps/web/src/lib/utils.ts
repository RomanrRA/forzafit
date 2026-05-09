import { type ClassValue, clsx } from 'clsx'
import { twMerge } from 'tailwind-merge'

export function cn(...inputs: ClassValue[]) {
  return twMerge(clsx(inputs))
}

/**
 * Возвращает правильную форму существительного по русской плюрализации.
 *   plural(1,  ['день', 'дня', 'дней']) → 'день'
 *   plural(2,  ['день', 'дня', 'дней']) → 'дня'
 *   plural(11, ['день', 'дня', 'дней']) → 'дней'
 *   plural(21, ['день', 'дня', 'дней']) → 'день'
 *   plural(102, ['рекорд', 'рекорда', 'рекордов']) → 'рекорда'
 */
export function plural(
  n: number,
  forms: readonly [string, string, string],
): string {
  const abs = Math.abs(Math.trunc(n))
  const mod10 = abs % 10
  const mod100 = abs % 100
  if (mod100 >= 11 && mod100 <= 14) return forms[2]
  if (mod10 === 1) return forms[0]
  if (mod10 >= 2 && mod10 <= 4) return forms[1]
  return forms[2]
}
