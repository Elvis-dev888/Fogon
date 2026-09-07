const MS_PER_DAY = 1000 * 60 * 60 * 24
export const TRIAL_DAYS = 67

export const TIERS = [
  { key: 'basico', name: 'Plan Básico', maxProducts: 33, priceUsd: 6.99, priceCop: 28000 },
  { key: 'pro', name: 'Plan Pro', maxProducts: 100, priceUsd: 19.99, priceCop: 80000 },
  { key: 'enterprise', name: 'Plan Enterprise', maxProducts: Infinity, priceUsd: 69.99, priceCop: 280000 },
]

export function getTierForProductCount(count = 0) {
  if (count <= 33) return TIERS[0]
  if (count <= 100) return TIERS[1]
  return TIERS[2]
}

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

export function getSubscriptionSummary(negocio = {}, productCount = 0) {
  const createdAt = toDate(negocio.creado_en) || new Date()
  const trialStartedAt = toDate(negocio.trial_started_at) || createdAt
  const trialEndsAt = toDate(negocio.trial_ends_at) || new Date(trialStartedAt.getTime() + TRIAL_DAYS * MS_PER_DAY)
  const subscriptionStatus = negocio.subscription_status || 'trial'
  const isVip = Boolean(negocio.is_vip || subscriptionStatus === 'vip' || negocio.plan === 'VIP / Cortesía')
  const tier = getTierForProductCount(productCount || negocio.productosCount || 0)
  
  const plan = isVip
    ? 'Plan Cortesía VIP'
    : negocio.plan && negocio.plan !== 'Kiosko Pro Trial'
      ? negocio.plan
      : subscriptionStatus === 'trial'
        ? `${tier.name} (Trial)`
        : tier.name

  const access = negocio.access_level || 'completo'
  const renewedAt = toDate(negocio.renewal_date)

  const today = new Date()
  const remainingDays = isVip ? Infinity : Math.max(0, daysBetween(today, trialEndsAt))
  const isTrialActive = !isVip && subscriptionStatus === 'trial' && today < trialEndsAt
  const isTrialExpired = !isVip && subscriptionStatus === 'trial' && today >= trialEndsAt
  const isActive = isVip || subscriptionStatus === 'active'
  const accessGranted = isVip || isTrialActive || isActive

  const statusLabel = isVip
    ? 'Cortesía VIP'
    : isTrialActive
      ? 'Trial activo'
      : isTrialExpired
        ? 'Trial vencido'
        : isActive
          ? 'Activo'
          : subscriptionStatus || 'Trial'

  return {
    plan,
    tier,
    isVip,
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
    priceUsd: tier.priceUsd,
    priceCop: tier.priceCop,
    unlimitedEmployees: true,
  }
}

export function formatDaysLeft(value) {
  if (value === Infinity) return 'Acceso permanente'
  if (value <= 0) return '0 días'
  if (value === 1) return '1 día'
  return `${value} días`
}

