import test from 'node:test'
import assert from 'node:assert/strict'
import { shouldCreateSale } from './orderSales.js'

test('no genera venta si el pedido está pendiente o cancelado', () => {
  assert.equal(shouldCreateSale('Pendiente', 'Pendiente'), false)
  assert.equal(shouldCreateSale('Cancelado', 'Entregado'), false)
  assert.equal(shouldCreateSale('Pendiente', 'Cancelado'), false)
  assert.equal(shouldCreateSale('En preparación', 'Cancelado'), false)
  assert.equal(shouldCreateSale('Listo', 'Cancelado'), false)
  assert.equal(shouldCreateSale('Entregado', 'Cancelado'), false)
})

test('genera venta cuando un pedido pendiente pasa a un estado real', () => {
  assert.equal(shouldCreateSale('Pendiente', 'En preparación'), true)
  assert.equal(shouldCreateSale('Pendiente', 'Listo'), true)
  assert.equal(shouldCreateSale('Pendiente', 'Entregado'), true)
})
