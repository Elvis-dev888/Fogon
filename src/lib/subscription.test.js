import test from 'node:test'
import assert from 'node:assert/strict'
import { getSubscriptionSummary, formatDaysLeft } from './subscription.js'

test('trial activo entrega acceso completo y días restantes', () => {
  const today = new Date()
  const started = new Date(today.getTime() - 10 * 24 * 60 * 60 * 1000)
  const ends = new Date(today.getTime() + 170 * 24 * 60 * 60 * 1000)

  const summary = getSubscriptionSummary({
    creado_en: started.toISOString(),
    trial_started_at: started.toISOString(),
    trial_ends_at: ends.toISOString(),
    subscription_status: 'trial',
    plan: 'Kiosko Pro Trial',
    access_level: 'completo',
  })

  assert.equal(summary.isTrialActive, true)
  assert.equal(summary.accessGranted, true)
  assert.equal(summary.plan, 'Kiosko Pro Trial')
  assert.ok(summary.remainingDays >= 160)
  assert.match(formatDaysLeft(summary.remainingDays), /d[ií]as|\d+ días/)
})

test('trial vencido requiere suscripción', () => {
  const today = new Date()
  const started = new Date(today.getTime() - 190 * 24 * 60 * 60 * 1000)
  const ends = new Date(today.getTime() - 2 * 24 * 60 * 60 * 1000)

  const summary = getSubscriptionSummary({
    creado_en: started.toISOString(),
    trial_started_at: started.toISOString(),
    trial_ends_at: ends.toISOString(),
    subscription_status: 'trial',
  })

  assert.equal(summary.isTrialExpired, true)
  assert.equal(summary.accessGranted, false)
  assert.equal(summary.statusLabel, 'Trial vencido')
})
