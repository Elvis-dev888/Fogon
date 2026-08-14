export const fmt$ = (n) => '$' + Math.round(n || 0).toLocaleString('es-CO')

export const fmtDate = (d) =>
  new Date(d).toLocaleDateString('es-CO', { day: '2-digit', month: 'short' })

export const fmtDateLong = (d) =>
  new Date(d).toLocaleDateString('es-CO', { day: 'numeric', month: 'long', year: 'numeric' })

export const sameMonth = (d) => {
  const x = new Date(d)
  const now = new Date()
  return x.getMonth() === now.getMonth() && x.getFullYear() === now.getFullYear()
}

// 'YYYY-MM-DD' en horario local — para agrupar movimientos por día y para que
// coincida con lo que devuelve un <input type="date">.
export const dateStr = (d) => {
  const x = new Date(d)
  const y = x.getFullYear()
  const m = String(x.getMonth() + 1).padStart(2, '0')
  const day = String(x.getDate()).padStart(2, '0')
  return `${y}-${m}-${day}`
}

// 'YYYY-MM' en horario local — para agrupar por mes y para que coincida con
// lo que devuelve un <input type="month">.
export const monthStr = (d) => dateStr(d).slice(0, 7)

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

// Timbre de "pedido nuevo" hecho con Web Audio (sin archivos de sonido que subir).
// Los navegadores bloquean audio hasta que hay una interacción del usuario en la
// página (un clic, por ejemplo) — por eso puede no sonar la primerísima vez que
// se abre la pestaña de Pedidos, pero sí de ahí en adelante.
export function playPedidoNuevo() {
  try {
    const Ctx = window.AudioContext || window.webkitAudioContext
    if (!Ctx) return
    const ctx = new Ctx()
    const notas = [880, 1108]
    notas.forEach((freq, i) => {
      const osc = ctx.createOscillator()
      const gain = ctx.createGain()
      osc.type = 'sine'
      osc.frequency.value = freq
      const start = ctx.currentTime + i * 0.14
      gain.gain.setValueAtTime(0.0001, start)
      gain.gain.exponentialRampToValueAtTime(0.22, start + 0.02)
      gain.gain.exponentialRampToValueAtTime(0.0001, start + 0.32)
      osc.connect(gain)
      gain.connect(ctx.destination)
      osc.start(start)
      osc.stop(start + 0.34)
    })
    setTimeout(() => ctx.close(), 700)
  } catch {
    // si el navegador bloquea el audio, no pasa nada — el aviso visual sigue funcionando
  }
}
