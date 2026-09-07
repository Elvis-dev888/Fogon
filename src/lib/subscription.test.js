import test from 'node:test'
import assert from 'node:assert/strict'
import { getSubscriptionSummary, formatDaysLeft, getTierForProductCount, TRIAL_DAYS } from './subscription.js'

test('trial activo entrega acceso completo y días restantes (67 días)', () => {
  const today = new Date()
  const started = new Date(today.getTime() - 7 * 24 * 60 * 60 * 1000)
  const ends = new Date(today.getTime() + 60 * 24 * 60 * 60 * 1000)

  const summary = getSubscriptionSummary({
    creado_en: started.toISOString(),
    trial_started_at: started.toISOString(),
    trial_ends_at: ends.toISOString(),
    subscription_status: 'trial',
    access_level: 'completo',
  }, 20)

  assert.equal(TRIAL_DAYS, 67)
  assert.equal(summary.isTrialActive, true)
  assert.equal(summary.accessGranted, true)
  assert.equal(summary.plan, 'Plan Básico (Trial)')
  assert.equal(summary.unlimitedEmployees, true)
  assert.ok(summary.remainingDays >= 59)
  assert.match(formatDaysLeft(summary.remainingDays), /d[ií]as|\d+ días/)
})

test('clasifica planes según cantidad de productos', () => {
  assert.equal(getTierForProductCount(10).key, 'basico')
  assert.equal(getTierForProductCount(33).key, 'basico')
  assert.equal(getTierForProductCount(34).key, 'pro')
  assert.equal(getTierForProductCount(100).key, 'pro')
  assert.equal(getTierForProductCount(101).key, 'enterprise')
})

test('negocio con cortesía VIP tiene acceso permanente ilimitado', () => {
  const summary = getSubscriptionSummary({
    subscription_status: 'vip',
    is_vip: true,
  }, 150)

  assert.equal(summary.isVip, true)
  assert.equal(summary.accessGranted, true)
  assert.equal(summary.statusLabel, 'Cortesía VIP')
  assert.equal(formatDaysLeft(summary.remainingDays), 'Acceso permanente')
})

test('trial vencido requiere suscripción', () => {
  const today = new Date()
  const started = new Date(today.getTime() - 70 * 24 * 60 * 60 * 1000)
  const ends = new Date(today.getTime() - 3 * 24 * 60 * 60 * 1000)

  const summary = getSubscriptionSummary({
    creado_en: started.toISOString(),
    trial_started_at: started.toISOString(),
    trial_ends_at: ends.toISOString(),
    subscription_status: 'trial',
  }, 15)

  assert.equal(summary.isTrialExpired, true)
  assert.equal(summary.accessGranted, false)
  assert.equal(summary.statusLabel, 'Trial vencido')
})
