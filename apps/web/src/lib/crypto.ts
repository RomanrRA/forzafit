// AES-GCM encryption using browser's native Web Crypto API.
// Key = SHA-256(APP_SECRET + userId) — protects stored health data from
// casual local-disk inspection. NOT a substitute for server-side encryption.

const APP_SECRET = 'forzafit-v1-2026'

async function deriveKey(userId: string): Promise<CryptoKey> {
  const raw = await crypto.subtle.digest(
    'SHA-256',
    new TextEncoder().encode(`${APP_SECRET}:${userId}`),
  )
  return crypto.subtle.importKey('raw', raw, { name: 'AES-GCM' }, false, [
    'encrypt',
    'decrypt',
  ])
}

export async function encryptData(plaintext: string, userId: string): Promise<string> {
  const key = await deriveKey(userId)
  const iv = crypto.getRandomValues(new Uint8Array(12))
  const encrypted = await crypto.subtle.encrypt(
    { name: 'AES-GCM', iv },
    key,
    new TextEncoder().encode(plaintext),
  )
  const out = new Uint8Array(12 + encrypted.byteLength)
  out.set(iv, 0)
  out.set(new Uint8Array(encrypted), 12)
  return btoa(String.fromCharCode(...out))
}

export async function decryptData(ciphertext: string, userId: string): Promise<string> {
  const key = await deriveKey(userId)
  const raw = Uint8Array.from(atob(ciphertext), (c) => c.charCodeAt(0))
  const decrypted = await crypto.subtle.decrypt(
    { name: 'AES-GCM', iv: raw.slice(0, 12) },
    key,
    raw.slice(12),
  )
  return new TextDecoder().decode(decrypted)
}

/** Try to load + decrypt. Falls back to plain JSON for legacy unencrypted data. */
export async function loadEncryptedJson<T>(key: string, userId: string): Promise<T[]> {
  try {
    const raw = localStorage.getItem(key)
    if (!raw) return []
    try {
      const json = await decryptData(raw, userId)
      return JSON.parse(json)
    } catch {
      // Legacy: stored as plain JSON — migrate on next save
      return JSON.parse(raw)
    }
  } catch {
    return []
  }
}

export async function saveEncryptedJson<T>(key: string, data: T[], userId: string): Promise<void> {
  const encrypted = await encryptData(JSON.stringify(data), userId)
  localStorage.setItem(key, encrypted)
}
