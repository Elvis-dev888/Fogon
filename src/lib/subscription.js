const MS_PER_DAY = 1000 * 60 * 60 * 24

export function toDate(value) {
  if (!value) return null
  const date = new Date(value)
  return Number.isNaN(date.getTime()) ? null : date
}

export function daysBetween(dateA, dateB) {
  if (!dateA || !dateB) return 0
  const ms = Math.max(0, dateB.getTime() - dateA.getTime())
  return Math.floor(ms / MS_PER_DAY)
}

export function getSubscriptionSummary(negocio = {}) {
  const createdAt = toDate(negocio.creado_en) || new Date()
  const trialStartedAt = toDate(negocio.trial_started_at) || createdAt
  const trialEndsAt = toDate(negocio.trial_ends_at) || new Date(trialStartedAt.getTime() + 180 * MS_PER_DAY)
  const subscriptionStatus = negocio.subscription_status || 'trial'
  const plan = negocio.plan || 'Kiosko Pro Trial'
  const access = negocio.access_level || 'completo'
  const renewedAt = toDate(negocio.renewal_date)

  const today = new Date()
  const remainingDays = Math.max(0, daysBetween(today, trialEndsAt))
  const isTrialActive = subscriptionStatus === 'trial' && today < trialEndsAt
  const isTrialExpired = subscriptionStatus === 'trial' && today >= trialEndsAt
  const isActive = subscriptionStatus === 'active'
  const accessGranted = isTrialActive || isActive

  const statusLabel = isTrialActive ? 'Trial activo' : isTrialExpired ? 'Trial vencido' : isActive ? 'Activo' : subscriptionStatus || 'Trial'

  return {
    plan,
    subscriptionStatus,
    trialStartedAt,
    trialEndsAt,
    remainingDays,
    access,
    accessGranted,
    isTrialActive,
    isTrialExpired,
    isActive,
    renewedAt,
    statusLabel,
    price: 4.99,
  }
}

export function formatDaysLeft(value) {
  if (value <= 0) return '0 días'
  if (value === 1) return '1 día'
  return `${value} días`
}
