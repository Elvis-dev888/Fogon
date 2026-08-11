export const fmt$ = (n) => '$' + Math.round(n || 0).toLocaleString('es-CO')

export const fmtDate = (d) =>
  new Date(d).toLocaleDateString('es-CO', { day: '2-digit', month: 'short' })

export const sameMonth = (d) => {
  const x = new Date(d)
  const now = new Date()
  return x.getMonth() === now.getMonth() && x.getFullYear() === now.getFullYear()
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
