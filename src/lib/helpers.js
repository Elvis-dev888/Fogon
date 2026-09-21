export const fmt$ = (n) => '$' + Math.round(n || 0).toLocaleString('es-CO')

export const fmtDate = (d) => {
  if (!d) return '—'
  const date = new Date(d)
  if (isNaN(date.getTime())) return '—'
  return date.toLocaleDateString('es-CO', { day: '2-digit', month: 'short' })
}

export const fmtTime = (d) => {
  if (!d) return ''
  const date = new Date(d)
  if (isNaN(date.getTime())) return ''
  return date.toLocaleTimeString('es-CO', { hour: '2-digit', minute: '2-digit', hour12: true })
}

export const fmtDateTime = (d) => {
  if (!d) return '—'
  const date = new Date(d)
  if (isNaN(date.getTime())) return '—'
  const time = date.toLocaleTimeString('es-CO', { hour: '2-digit', minute: '2-digit', hour12: true })
  const day = date.toLocaleDateString('es-CO', { day: 'numeric', month: 'short' })
  return `${day} · ${time}`
}

export const fmtDateLong = (d) => {
  if (!d) return '—'
  const date = new Date(d)
  if (isNaN(date.getTime())) return '—'
  return date.toLocaleDateString('es-CO', { day: 'numeric', month: 'long', year: 'numeric' })
}

export const sameMonth = (d) => {
  if (!d) return false
  const x = new Date(d)
  if (isNaN(x.getTime())) return false
  const now = new Date()
  return x.getMonth() === now.getMonth() && x.getFullYear() === now.getFullYear()
}

// 'YYYY-MM-DD' en horario local — para agrupar movimientos por día y para que
// coincida con lo que devuelve un <input type="date">.
export const dateStr = (d) => {
  if (!d) return ''
  const x = new Date(d)
  if (isNaN(x.getTime())) return ''
  const y = x.getFullYear()
  const m = String(x.getMonth() + 1).padStart(2, '0')
  const day = String(x.getDate()).padStart(2, '0')
  return `${y}-${m}-${day}`
}

// 'YYYY-MM' en horario local — para agrupar por mes y para que coincida con
// lo que devuelve un <input type="month">.
export const monthStr = (d) => {
  const s = dateStr(d)
  return s ? s.slice(0, 7) : ''
}

export const todayStr = () => dateStr(new Date())

// 'YYYY-MM' -> "Agosto 2026"
export const fmtMonthLabel = (ym) => {
  const [y, m] = ym.split('-').map(Number)
  const d = new Date(y, m - 1, 1)
  const label = d.toLocaleDateString('es-CO', { month: 'long', year: 'numeric' })
  return label.charAt(0).toUpperCase() + label.slice(1)
}

export const ESTADOS = ['Pendiente', 'En preparación', 'Listo', 'Entregado']

export const THUMBS = ['#231C16', '#221E17', '#1E211C', '#211A1A']
export const thumbFor = (emoji) => THUMBS[(emoji || '🍽️').charCodeAt(0) % 4]

// Campana potente de restaurante y timbre de comanda con Web Audio
export function playCampanaRestaurante(forzar = false) {
  if (typeof window !== 'undefined' && !forzar) {
    const habilitado = window.localStorage?.getItem('kiosko_sonido_habilitado')
    if (habilitado === 'false') return
  }
  try {
    const Ctx = window.AudioContext || window.webkitAudioContext
    if (!Ctx) return
    const ctx = new Ctx()

    // Acordes de campana de servicio de restaurante: D5 (587Hz) + A5 (880Hz) seguido de D6 (1175Hz)
    const campanas = [
      { freqs: [880, 1760], start: 0, dur: 0.55, vol: 0.65 },
      { freqs: [1175, 2350], start: 0.16, dur: 0.85, vol: 0.75 },
    ]

    campanas.forEach(({ freqs, start, dur, vol }) => {
      freqs.forEach((freq, idx) => {
        const osc = ctx.createOscillator()
        const gain = ctx.createGain()
        osc.type = idx === 0 ? 'triangle' : 'sine'
        osc.frequency.value = freq

        const s = ctx.currentTime + start
        gain.gain.setValueAtTime(0.0001, s)
        gain.gain.exponentialRampToValueAtTime(vol * (idx === 0 ? 1 : 0.6), s + 0.015)
        gain.gain.exponentialRampToValueAtTime(0.0001, s + dur)

        osc.connect(gain)
        gain.connect(ctx.destination)
        osc.start(s)
        osc.stop(s + dur + 0.05)
      })
    })

    setTimeout(() => ctx.close(), 1300)
  } catch {
    // Si el navegador bloquea audio, continúa silenciosamente
  }
}

// Compatibilidad hacia atrás
export function playPedidoNuevo() {
  playCampanaRestaurante()
}

// Extrae el número o nombre de mesa de las notas o propiedades del pedido
export function extractMesaFromPedido(pedido) {
  if (!pedido) return null
  if (pedido.mesa) return String(pedido.mesa).trim()
  const texto = `${pedido.notas_entrega || ''} ${pedido.direccion || ''}`
  const match = texto.match(/Mesa\s*#?\s*([0-9a-zA-ZáéíóúÁÉÍÓÚ]+)/i)
  if (match) return match[1]
  return null
}

// Selecciona la mejor voz femenina natural disponible en español
export function seleccionarVozFemeninaEspanol(voicesList) {
  const voices = voicesList || (typeof window !== 'undefined' && window.speechSynthesis ? window.speechSynthesis.getVoices() : []) || []
  if (!voices.length) return null

  const vocesEs = voices.filter((v) => v.lang && v.lang.toLowerCase().startsWith('es'))
  if (!vocesEs.length) return null

  // Voces femeninas reconocidas en Windows, Android, Chrome, Edge y Mac/iOS
  const nombresFemeninos = [
    'sabina', 'elena', 'laura', 'paulina', 'monica', 'mónica', 'lucia', 'lucía',
    'sofia', 'sofía', 'camila', 'valeria', 'ximena', 'jimena', 'penelope', 'penélope',
    'francisca', 'victoria', 'female', 'mujer', 'zira'
  ]

  for (const nombre of nombresFemeninos) {
    const encontrada = vocesEs.find((v) => (v.name || '').toLowerCase().includes(nombre))
    if (encontrada) return encontrada
  }

  // Voces naturales de Google o Microsoft Online / Neural
  const vozCalidad = vocesEs.find((v) => {
    const n = (v.name || '').toLowerCase()
    return n.includes('google') || n.includes('natural') || n.includes('online') || n.includes('neural')
  })
  if (vozCalidad) return vozCalidad

  // Descartar voces masculinas explícitas
  const nombresMasculinos = ['raul', 'raúl', 'pablo', 'david', 'jorge', 'male', 'hombre', 'miguel', 'carlos']
  const noMasculina = vocesEs.find((v) => {
    const n = (v.name || '').toLowerCase()
    return !nombresMasculinos.some((m) => n.includes(m))
  })
  if (noMasculina) return noMasculina

  return vocesEs[0]
}

// Anuncio hablado con voz inteligente femenina (Text-to-Speech)
export function speakAnuncioPedido(pedido) {
  try {
    if (typeof window === 'undefined' || !window.speechSynthesis) return
    window.speechSynthesis.cancel() // cancela cualquier voz previa

    const mesa = extractMesaFromPedido(pedido)
    const cliente = (pedido?.cliente || 'Cliente').trim()
    const esDomicilio = pedido?.tipo_entrega === 'domicilio'

    let texto = ''
    if (mesa) {
      texto = `¡Nuevo pedido! En la mesa ${mesa}, para ${cliente}.`
    } else if (esDomicilio) {
      texto = `¡Nuevo pedido a domicilio, para ${cliente}.`
    } else {
      texto = `¡Nuevo pedido en el local, para ${cliente}.`
    }

    const utterance = new SpeechSynthesisUtterance(texto)
    utterance.lang = 'es-CO'
    utterance.volume = 1.0
    utterance.rate = 0.96 // cadencia natural, clara y agradable
    utterance.pitch = 1.0 // tono cálido y natural, sin efecto metálico

    const voz = seleccionarVozFemeninaEspanol()
    if (voz) {
      utterance.voice = voz
      if (voz.lang) utterance.lang = voz.lang
    }

    window.speechSynthesis.speak(utterance)
  } catch {
    // Si speech no está disponible, no pasa nada
  }
}

// Función unificada: Campana de restaurante + Voz inteligente con aviso del pedido
export function notificarPedidoNuevoConVoz(pedido, forzar = false) {
  if (typeof window !== 'undefined' && !forzar) {
    const habilitado = window.localStorage?.getItem('kiosko_sonido_habilitado')
    if (habilitado === 'false') return // el usuario lo silenció con la campanita
  }

  // 1. Suena la campana
  playCampanaRestaurante()

  // 2. 600ms después anuncia con la voz
  setTimeout(() => {
    speakAnuncioPedido(pedido)
  }, 600)

  // 3. Notificación nativa del sistema si está minimizada la app
  try {
    if (typeof window !== 'undefined' && 'Notification' in window && Notification.permission === 'granted') {
      const mesa = extractMesaFromPedido(pedido)
      const titulo = mesa ? `🛎️ ¡Nuevo pedido en Mesa ${mesa}!` : `🛎️ ¡Nuevo pedido de ${pedido?.cliente || 'Cliente'}!`
      const cuerpo = `${pedido?.cliente || 'Cliente'} · Total: ${fmt$(pedido?.total || 0)}${pedido?.tipo_entrega === 'domicilio' ? ' (Domicilio)' : ''}`
      new Notification(titulo, {
        body: cuerpo,
        icon: '/Kiosko.jpg',
        badge: '/Kiosko.jpg',
      })
    }
  } catch {}
}

export function formatWhatsAppNumber(phone) {
  if (!phone) return ''
  let cleaned = String(phone).replace(/\D/g, '')
  if (cleaned.length === 10 && cleaned.startsWith('3')) {
    cleaned = '57' + cleaned
  }
  return cleaned
}
