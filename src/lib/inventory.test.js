import test from 'node:test'
import assert from 'node:assert/strict'
import { calculateWeightedCost, calculateMargin, calculateInventoryValuation } from './inventory.js'

test('calcula costo promedio ponderado correctamente', () => {
  // Teníamos 10 unidades a $1.000 (total $10.000) y compramos 10 unidades por $20.000 ($2.000 c/u)
  // Total 20 unidades por $30.000 => $1.500 c/u
  const costo = calculateWeightedCost(10, 1000, 10, 20000)
  assert.equal(costo, 1500)

  // Si arrancamos de 0 stock
  const costoNuevo = calculateWeightedCost(0, 0, 5, 25000)
  assert.equal(costoNuevo, 5000)
})

test('calcula margen y porcentaje de ganancia comercial', () => {
  const { margen, porcentaje } = calculateMargin(15000, 10000)
  assert.equal(margen, 5000)
  assert.equal(porcentaje, 50)

  const margenSinCosto = calculateMargin(8000, 0)
  assert.equal(margenSinCosto.margen, 8000)
  assert.equal(margenSinCosto.porcentaje, 100)
})

test('calcula la valuación total del inventario', () => {
  const items = [
    { stock: 10, costo_unitario: 5000 },
    { stock: 2, costo_unitario: 20000 },
    { stock: 15, costo_unitario: 1000 },
  ]
  const total = calculateInventoryValuation(items)
  // (10 * 5000) + (2 * 20000) + (15 * 1000) = 50000 + 40000 + 15000 = 105000
  assert.equal(total, 105000)
})

