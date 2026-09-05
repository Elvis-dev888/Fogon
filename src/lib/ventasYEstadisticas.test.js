import test from 'node:test'
import assert from 'node:assert/strict'
import { dateStr, todayStr } from './helpers.js'

function resumirProductosVendidos(ventas = []) {
  const map = {}
  ;(ventas || []).forEach((v) => {
    if (!v) return
    const items = v.pedidos?.pedido_items || []
    if (Array.isArray(items)) {
      items.forEach((it) => {
        if (!it) return
        const nombre = String(it.nombre || 'Producto').trim()
        const cant = Math.max(0, Number(it.cantidad) || 1)
        const sub = Math.max(0, Number(it.subtotal) || 0)
        if (!map[nombre]) map[nombre] = { nombre, cantidad: 0, total: 0 }
        map[nombre].cantidad += cant
        map[nombre].total += sub
      })
    }
  })
  return Object.values(map).sort((a, b) => b.total - a.total)
}

function filtrarVentas(todasVentas = [], filtroPeriodo, fechaInicio = todayStr(), fechaFin = todayStr()) {
  const hoyStr = todayStr()
  const dAyer = new Date()
  dAyer.setDate(dAyer.getDate() - 1)
  const ayerStr = dateStr(dAyer)

  const d7 = new Date()
  d7.setDate(d7.getDate() - 6)
  const hace7DiasStr = dateStr(d7)

  const now = new Date()
  const dMesAnt = new Date(now.getFullYear(), now.getMonth() - 1, 1)
  const mesAnteriorStr = dateStr(dMesAnt).slice(0, 7)

  return (todasVentas || []).filter((v) => {
    if (!v) return false
    if (filtroPeriodo === 'todo') return true
    if (!v.creado_en) return false
    const fVentaStr = dateStr(v.creado_en)
    if (!fVentaStr || fVentaStr.includes('NaN')) return false

    if (filtroPeriodo === 'hoy') return fVentaStr === hoyStr
    if (filtroPeriodo === '2dias') return fVentaStr >= ayerStr && fVentaStr <= hoyStr
    if (filtroPeriodo === 'semana') return fVentaStr >= hace7DiasStr && fVentaStr <= hoyStr
    if (filtroPeriodo === 'mes') return fVentaStr.slice(0, 7) === hoyStr.slice(0, 7)
    if (filtroPeriodo === 'mes_anterior') return fVentaStr.slice(0, 7) === mesAnteriorStr
    if (filtroPeriodo === 'personalizado') {
      if (fechaInicio && fVentaStr < fechaInicio) return false
      if (fechaFin && fVentaStr > fechaFin) return false
      return true
    }
    return true
  })
}

test('filtrarVentas maneja arrays vacios o nulos sin romper', () => {
  assert.deepEqual(filtrarVentas([], 'mes_anterior'), [])
  assert.deepEqual(filtrarVentas(null, 'todo'), [])
  assert.deepEqual(filtrarVentas([null, { total: 1000 }], 'hoy'), [])
})

test('filtrarVentas filtra correctamente mes anterior y todo el historico', () => {
  const now = new Date()
  const dMesAnt = new Date(now.getFullYear(), now.getMonth() - 1, 15)
  const dMesActual = new Date(now.getFullYear(), now.getMonth(), 1)
  const ventas = [
    { id: 1, creado_en: dMesAnt.toISOString(), total: 25000 },
    { id: 2, creado_en: dMesActual.toISOString(), total: 30000 },
    { id: 3, creado_en: null, total: 10000 },
  ]

  const mesAnt = filtrarVentas(ventas, 'mes_anterior')
  assert.equal(mesAnt.length, 1)
  assert.equal(mesAnt[0].id, 1)

  const todo = filtrarVentas(ventas, 'todo')
  assert.equal(todo.length, 3)
})

test('resumirProductosVendidos maneja items nulos, cantidades invalidas y suma con precision', () => {
  const ventas = [
    {
      pedidos: {
        pedido_items: [
          { nombre: 'Hamburguesa', cantidad: 2, subtotal: 36000 },
          { nombre: 'Papas', cantidad: 1, subtotal: 8000 },
          null,
        ],
      },
    },
    {
      pedidos: {
        pedido_items: [
          { nombre: 'Hamburguesa', cantidad: 1, subtotal: 18000 },
          { nombre: null, cantidad: 5, subtotal: 10000 },
        ],
      },
    },
    { pedidos: null },
    null,
  ]

  const resumen = resumirProductosVendidos(ventas)
  assert.equal(resumen.length, 3)
  const burger = resumen.find((r) => r.nombre === 'Hamburguesa')
  assert.equal(burger.cantidad, 3)
  assert.equal(burger.total, 54000)
})
