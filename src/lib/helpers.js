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
