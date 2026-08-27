import { useEffect } from 'react'

// Marca de Kiosko: toldo de puesto/kiosko sobre un mostrador — neutro,
// sirve para cualquier tipo de negocio (no solo comida).
export function BrandMark({ size = 38 }) {
  return (
    <svg width={size} height={size} viewBox="0 0 64 64" className="shrink-0">
      <circle cx="32" cy="32" r="30" fill="#14110E" />
      <circle cx="32" cy="32" r="29" fill="none" stroke="#C79A3C" strokeWidth="1.4" />
      <g stroke="#E8CD7A" strokeWidth="2.6" fill="none" strokeLinecap="round" strokeLinejoin="round">
        <path d="M13 25 Q17.5 33 22 25 Q26.5 17 31 25 Q35.5 33 40 25 Q44.5 17 49 25" />
        <path d="M16 25 V40" />
        <path d="M46 25 V40" />
        <path d="M16 40 H46" />
        <path d="M18 40 V47 H44 V40" />
      </g>
    </svg>
  )
}

export function Btn({ variant = 'default', size = 'md', className = '', children, ...props }) {
  const base = 'inline-flex items-center gap-2 font-semibold tracking-wide transition-colors duration-200 disabled:opacity-35 disabled:cursor-not-allowed'
  const sizes = { md: 'px-4 py-2.5 text-[13px] rounded', sm: 'px-3 py-1.5 text-[11.5px] rounded-sm' }
  const variants = {
    default: 'border border-line text-cream hover:border-gold hover:text-gold bg-transparent',
    primary: 'bg-gold border border-gold text-paper hover:bg-golddark hover:border-golddark',
    ghost: 'border border-line text-creamsoft hover:text-cream hover:border-creamsoft bg-transparent',
    danger: 'border border-wine text-wine hover:bg-wine/10 bg-transparent',
    mustard: 'border border-golddark text-champagne hover:bg-champagne/10 bg-transparent',
    avocado: 'border border-sage text-sage hover:bg-sage/10 bg-transparent',
  }
  return (
    <button className={`${base} ${sizes[size]} ${variants[variant]} ${className}`} {...props}>
      {children}
    </button>
  )
}

export function Card({ className = '', children }) {
  return <div className={`bg-paper2 border border-line rounded shadow-[0_20px_44px_rgba(0,0,0,0.5)] ${className}`}>{children}</div>
}

export function StatCard({ label, value, tone = 'default' }) {
  const tones = {
    default: 'text-cream',
    gold: 'text-gold',
    champagne: 'text-champagne',
    sage: 'text-sage',
    wine: 'text-wine',
  }
  return (
    <div className="p-5 rounded border border-line bg-paper2">
      <div className="text-[11px] font-semibold uppercase tracking-wider text-creamsoft">{label}</div>
      <div className={`font-serif font-semibold text-2xl mt-2 ${tones[tone]}`}>{value}</div>
    </div>
  )
}

export function Field({ label, children }) {
  return (
    <div className="mb-3.5">
      <label className="block text-[11.5px] font-semibold mb-1.5 text-creamsoft tracking-wide">{label}</label>
      {children}
    </div>
  )
}

export function Input(props) {
  return (
    <input
      {...props}
      className={`w-full px-3 py-2.5 rounded-sm border border-line bg-paper text-cream text-sm focus:outline-none focus:border-gold ${props.className || ''}`}
    />
  )
}
export function Select(props) {
  return (
    <select
      {...props}
      className={`w-full px-3 py-2.5 rounded-sm border border-line bg-paper text-cream text-sm focus:outline-none focus:border-gold ${props.className || ''}`}
    />
  )
}
export function Textarea(props) {
  return (
    <textarea
      {...props}
      className={`w-full px-3 py-2.5 rounded-sm border border-line bg-paper text-cream text-sm focus:outline-none focus:border-gold ${props.className || ''}`}
    />
  )
}

export function Modal({ onClose, children, width = 'max-w-[560px]' }) {
  return (
    <div
      className="fixed inset-0 bg-black/70 z-[70] flex items-center justify-center p-4"
      onClick={(e) => e.target === e.currentTarget && onClose()}
    >
      <div className={`bg-paper2 border border-line rounded w-full ${width} max-h-[88vh] overflow-y-auto p-6 animate-popin`}>
        <button className="float-right text-creamsoft hover:text-gold text-lg" onClick={onClose}>
          ✕
        </button>
        {children}
      </div>
    </div>
  )
}

export function Toast({ message, onDone }) {
  useEffect(() => {
    const t = setTimeout(onDone, 2400)
    return () => clearTimeout(t)
  }, [onDone])
  return (
    <div className="fixed bottom-6 left-1/2 -translate-x-1/2 bg-paper2 border border-gold text-cream px-5 py-3 rounded-sm font-semibold text-[13px] z-[90] shadow-lg">
      {message}
    </div>
  )
}

export function Empty({ icon = '🧾', children }) {
  return (
    <div className="text-center py-10 px-3 text-creamsoft">
      <div className="text-3xl mb-2 opacity-70">{icon}</div>
      {children}
    </div>
  )
}

// Muestra el logo del negocio si tiene logo_url; si no, cae al emoji de siempre.
export function NegocioLogo({ negocio, size = 22, className = '' }) {
  if (negocio?.logo_url) {
    return (
      <img
        src={negocio.logo_url}
        alt={negocio.nombre}
        className={`inline-block rounded-full object-cover align-middle shrink-0 ${className}`}
        style={{ width: size, height: size }}
      />
    )
  }
  return <span className={className}>{negocio?.emoji || '🍴'}</span>
}

// Igual, pero para el banner rectangular de las tarjetas de negocio.
export function NegocioBanner({ negocio, className = '' }) {
  if (negocio?.logo_url) {
    return (
      <div className={`h-[74px] bg-paper3 border-b border-line overflow-hidden ${className}`}>
        <img src={negocio.logo_url} alt={negocio.nombre} className="w-full h-full object-cover" />
      </div>
    )
  }
  return <div className={`h-[74px] bg-gradient-to-br from-paper3 to-paper2 border-b border-line ${className}`} />
}

export function Pill({ children, tone = 'default' }) {
  const tones = {
    default: 'bg-paper3 text-creamsoft',
    preparacion: 'bg-champagne/15 text-champagne',
    listo: 'bg-sage/15 text-sage',
    entregado: 'bg-gold/15 text-gold',
    cancelado: 'bg-wine/15 text-wine',
    activo: 'bg-sage/15 text-sage border border-sage/35',
    pausado: 'bg-wine/15 text-wine border border-wine/35',
  }
  return <span className={`text-[10.5px] font-bold px-2.5 py-1 rounded-full uppercase tracking-wide ${tones[tone]}`}>{children}</span>
}