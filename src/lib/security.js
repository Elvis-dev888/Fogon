export const SUPPORT_EMAIL = 'kkiosko440@gmail.com'
export const MAX_FAILED_ATTEMPTS = 6
export const LOCKOUT_DURATION_MS = 6 * 60 * 60 * 1000 // 6 horas
export const MASTER_UNLOCK_CODE = 'KIOSKO-UNLOCK-2026'

const STORAGE_PREFIX = 'kiosko_sec_lock_'

function getStorage() {
  if (typeof window !== 'undefined' && window.localStorage) {
    return window.localStorage
  }
  return null
}

/**
 * Genera un código de desbloqueo determinista de 6 dígitos con prefijo KIO-
 * para un correo determinado. Así el Superadmin puede entregárselo al usuario
 * por correo oficial cuando este solicite asistencia.
 */
export function getUnlockCodeForEmail(email) {
  if (!email || typeof email !== 'string') return ''
  const clean = email.toLowerCase().trim()
  let hash = 0
  for (let i = 0; i < clean.length; i++) {
    hash = ((hash << 5) - hash) + clean.charCodeAt(i)
    hash |= 0
  }
  const positive = Math.abs(hash)
  const code = (positive % 900000) + 100000 // número de 6 dígitos entre 100000 y 999999
  return `KIO-${code}`
}

/**
 * Consulta el estado de seguridad de un correo.
 * Si el tiempo de bloqueo ya expiró, limpia el bloqueo automáticamente.
 */
export function getSecurityStatus(email) {
  if (!email || typeof email !== 'string') {
    return { isLocked: false, attemptsLeft: MAX_FAILED_ATTEMPTS, lockedUntil: 0, remainingMs: 0 }
  }
  const clean = email.toLowerCase().trim()
  const storage = getStorage()
  if (!storage) {
    return { isLocked: false, attemptsLeft: MAX_FAILED_ATTEMPTS, lockedUntil: 0, remainingMs: 0 }
  }

  try {
    const raw = storage.getItem(STORAGE_PREFIX + clean)
    if (!raw) {
      return { isLocked: false, attemptsLeft: MAX_FAILED_ATTEMPTS, lockedUntil: 0, remainingMs: 0 }
    }
    const data = JSON.parse(raw)
    const now = Date.now()

    if (data.lockedUntil && data.lockedUntil > now) {
      return {
        isLocked: true,
        attemptsLeft: 0,
        lockedUntil: data.lockedUntil,
        remainingMs: data.lockedUntil - now,
      }
    }

    // Si el tiempo de bloqueo ya pasó, reiniciamos el contador
    if (data.lockedUntil && data.lockedUntil <= now) {
      storage.removeItem(STORAGE_PREFIX + clean)
      return { isLocked: false, attemptsLeft: MAX_FAILED_ATTEMPTS, lockedUntil: 0, remainingMs: 0 }
    }

    const count = Number(data.count) || 0
    return {
      isLocked: false,
      attemptsLeft: Math.max(0, MAX_FAILED_ATTEMPTS - count),
      lockedUntil: 0,
      remainingMs: 0,
    }
  } catch {
    return { isLocked: false, attemptsLeft: MAX_FAILED_ATTEMPTS, lockedUntil: 0, remainingMs: 0 }
  }
}

/**
 * Registra un intento fallido para el correo indicado.
 * Al alcanzar MAX_FAILED_ATTEMPTS (6), bloquea por 6 horas.
 */
export function recordFailedAttempt(email) {
  if (!email || typeof email !== 'string') {
    return { isLocked: false, attemptsLeft: MAX_FAILED_ATTEMPTS, lockedUntil: 0, remainingMs: 0 }
  }
  const clean = email.toLowerCase().trim()
  const storage = getStorage()
  const current = getSecurityStatus(clean)
  const currentCount = MAX_FAILED_ATTEMPTS - current.attemptsLeft
  const newCount = currentCount + 1

  if (newCount >= MAX_FAILED_ATTEMPTS) {
    const lockedUntil = Date.now() + LOCKOUT_DURATION_MS
    if (storage) {
      try {
        storage.setItem(STORAGE_PREFIX + clean, JSON.stringify({ count: newCount, lockedUntil }))
      } catch {}
    }
    return { isLocked: true, attemptsLeft: 0, lockedUntil, remainingMs: LOCKOUT_DURATION_MS }
  } else {
    if (storage) {
      try {
        storage.setItem(STORAGE_PREFIX + clean, JSON.stringify({ count: newCount, lockedUntil: 0 }))
      } catch {}
    }
    return {
      isLocked: false,
      attemptsLeft: MAX_FAILED_ATTEMPTS - newCount,
      lockedUntil: 0,
      remainingMs: 0,
    }
  }
}

/**
 * Limpia los intentos fallidos y el bloqueo de un correo (por ejemplo al autenticarse exitosamente).
 */
export function clearFailedAttempts(email) {
  if (!email || typeof email !== 'string') return
  const clean = email.toLowerCase().trim()
  const storage = getStorage()
  if (storage) {
    try {
      storage.removeItem(STORAGE_PREFIX + clean)
    } catch {}
  }
}

/**
 * Valida un código de desbloqueo ingresado por el usuario.
 * Si coincide con el código único del correo o con la clave maestra, desbloquea la cuenta.
 */
export function unlockAccountWithCode(email, inputCode) {
  if (!email || !inputCode) return false
  const cleanCode = String(inputCode).trim().toUpperCase()
  const expectedCode = getUnlockCodeForEmail(email)
  if (cleanCode === expectedCode || cleanCode === MASTER_UNLOCK_CODE) {
    clearFailedAttempts(email)
    return true
  }
  return false
}

/**
 * Formatea milisegundos restantes a texto legible tipo "5 h 42 min" o "28 min"
 */
export function formatRemainingTime(ms) {
  if (!ms || ms <= 0) return '0 min'
  const totalSeconds = Math.floor(ms / 1000)
  const hours = Math.floor(totalSeconds / 3600)
  const minutes = Math.floor((totalSeconds % 3600) / 60)
  if (hours > 0) {
    return `${hours} h ${minutes} min`
  }
  return `${Math.max(1, minutes)} min`
}

