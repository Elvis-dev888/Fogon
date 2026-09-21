import test from 'node:test'
import assert from 'node:assert/strict'
import {
  SUPPORT_EMAIL,
  MAX_FAILED_ATTEMPTS,
  LOCKOUT_DURATION_MS,
  MASTER_UNLOCK_CODE,
  getUnlockCodeForEmail,
  getSecurityStatus,
  recordFailedAttempt,
  clearFailedAttempts,
  unlockAccountWithCode,
  formatRemainingTime,
} from './security.js'

// Mock de localStorage en entorno de pruebas Node.js
if (typeof globalThis.window === 'undefined') {
  const store = new Map()
  globalThis.window = {
    localStorage: {
      getItem: (key) => store.get(key) || null,
      setItem: (key, val) => store.set(key, String(val)),
      removeItem: (key) => store.delete(key),
      clear: () => store.clear(),
    },
  }
}

test('Seguridad: constantes y soporte oficial', () => {
  assert.equal(SUPPORT_EMAIL, 'kkiosko440@gmail.com')
  assert.equal(MAX_FAILED_ATTEMPTS, 6)
  assert.equal(LOCKOUT_DURATION_MS, 6 * 60 * 60 * 1000)
  assert.equal(MASTER_UNLOCK_CODE, 'KIOSKO-UNLOCK-2026')
})

test('Seguridad: generación determinista de código de desbloqueo', () => {
  const email = 'elvis.admin@kiosko.app'
  const code1 = getUnlockCodeForEmail(email)
  const code2 = getUnlockCodeForEmail('ELVIS.ADMIN@KIOSKO.APP ')
  assert.match(code1, /^KIO-\d{6}$/)
  assert.equal(code1, code2, 'Debe ser case-insensitive y sin espacios')

  const codeOther = getUnlockCodeForEmail('otro.negocio@gmail.com')
  assert.notEqual(code1, codeOther, 'Correos distintos generan códigos distintos')
})

test('Seguridad: conteo de intentos fallidos hasta el bloqueo de 6 horas', () => {
  const email = 'dueño.prueba@kiosko.app'
  clearFailedAttempts(email)

  let status = getSecurityStatus(email)
  assert.equal(status.isLocked, false)
  assert.equal(status.attemptsLeft, 6)

  // Intentos 1 a 5
  for (let i = 1; i <= 5; i++) {
    const res = recordFailedAttempt(email)
    assert.equal(res.isLocked, false)
    assert.equal(res.attemptsLeft, 6 - i)
  }

  // Intento 6: debe bloquearse
  const lockedRes = recordFailedAttempt(email)
  assert.equal(lockedRes.isLocked, true)
  assert.equal(lockedRes.attemptsLeft, 0)
  assert.ok(lockedRes.remainingMs > 0 && lockedRes.remainingMs <= LOCKOUT_DURATION_MS)

  // Consultar estado nuevamente
  const checkStatus = getSecurityStatus(email)
  assert.equal(checkStatus.isLocked, true)
  assert.equal(checkStatus.attemptsLeft, 0)
})

test('Seguridad: desbloqueo con código específico y clave maestra', () => {
  const email = 'bloqueado@kiosko.app'
  clearFailedAttempts(email)

  // Forzar 6 intentos
  for (let i = 0; i < 6; i++) {
    recordFailedAttempt(email)
  }
  assert.equal(getSecurityStatus(email).isLocked, true)

  // Código erróneo no desbloquea
  const failedUnlock = unlockAccountWithCode(email, 'KIO-000000')
  assert.equal(failedUnlock, false)
  assert.equal(getSecurityStatus(email).isLocked, true)

  // Código correcto desbloquea
  const validCode = getUnlockCodeForEmail(email)
  const successUnlock = unlockAccountWithCode(email, validCode)
  assert.equal(successUnlock, true)
  assert.equal(getSecurityStatus(email).isLocked, false)
  assert.equal(getSecurityStatus(email).attemptsLeft, 6)

  // Bloquear de nuevo y probar clave maestra
  for (let i = 0; i < 6; i++) {
    recordFailedAttempt(email)
  }
  assert.equal(getSecurityStatus(email).isLocked, true)
  const masterUnlock = unlockAccountWithCode(email, 'kiosko-unlock-2026')
  assert.equal(masterUnlock, true)
  assert.equal(getSecurityStatus(email).isLocked, false)
})

test('Seguridad: formateo de tiempo restante legible', () => {
  assert.equal(formatRemainingTime(0), '0 min')
  assert.equal(formatRemainingTime(45 * 1000), '1 min')
  assert.equal(formatRemainingTime(25 * 60 * 1000), '25 min')
  assert.equal(formatRemainingTime(5 * 3600 * 1000 + 30 * 60 * 1000), '5 h 30 min')
})

test('Pedidos: extracción correcta de número de mesa desde notas o propiedad', async () => {
  const { extractMesaFromPedido } = await import('./helpers.js')
  assert.equal(extractMesaFromPedido(null), null)
  assert.equal(extractMesaFromPedido({ mesa: '5' }), '5')
  assert.equal(extractMesaFromPedido({ notas_entrega: '🍽️ Mesa 4 · 💵 Efectivo · Sin cebolla' }), '4')
  assert.equal(extractMesaFromPedido({ notas_entrega: 'Mesa #12' }), '12')
  assert.equal(extractMesaFromPedido({ notas_entrega: 'Mesa Terraza2' }), 'Terraza2')
  assert.equal(extractMesaFromPedido({ notas_entrega: 'Pedido para llevar sin mesa' }), null)
})

test('Voz inteligente: prioriza voces femeninas en español y descarta voces robóticas masculinas', async () => {
  const { seleccionarVozFemeninaEspanol } = await import('./helpers.js')
  const vocesMock = [
    { name: 'Microsoft David Desktop - English (United States)', lang: 'en-US' },
    { name: 'Microsoft Raul - Spanish (Mexico)', lang: 'es-MX' },
    { name: 'Microsoft Sabina - Spanish (Mexico)', lang: 'es-MX' },
    { name: 'Microsoft Pablo - Spanish (Spain)', lang: 'es-ES' },
  ]
  const seleccionada = seleccionarVozFemeninaEspanol(vocesMock)
  assert.equal(seleccionada?.name, 'Microsoft Sabina - Spanish (Mexico)', 'Debe priorizar Sabina frente a Raul o Pablo')

  const vocesSoloGoogle = [
    { name: 'Google US English', lang: 'en-US' },
    { name: 'Google español', lang: 'es-ES' },
  ]
  assert.equal(seleccionarVozFemeninaEspanol(vocesSoloGoogle)?.name, 'Google español')
})


