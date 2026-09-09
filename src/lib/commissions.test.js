import test from 'node:test'
import assert from 'node:assert/strict'
import { calculateWorkerSalesAndCommission, formatCompensationLabel } from './commissions.js'

test('Sueldo Fijo tradicional: sin comisiones sobre ventas', () => {
  const worker = {
    id: 'w-1',
    nombre: 'Carlos Cocinero',
    pago: 1750000,
    esquema_pago: 'fijo',
    frecuencia_pago: 'mensual',
  }
  const sales = [
    { id: 'v-1', trabajador_id: 'w-1', total: 250000, items: [{ cantidad: 2 }] },
    { id: 'v-2', trabajador_id: 'w-1', total: 150000, items: [{ cantidad: 1 }] },
  ]
  const res = calculateWorkerSalesAndCommission(worker, sales, [])
  assert.equal(res.esquema, 'fijo')
  assert.equal(res.sueldoBase, 1750000)
  assert.equal(res.comisionBruta, 0)
  assert.equal(res.comisionPendiente, 0)
  assert.equal(res.totalPendienteLiquidar, 1750000)
})

test('Solo Comisión por Porcentaje (%): calcula sobre volumen total de venta', () => {
  const worker = {
    id: 'w-2',
    nombre: 'Laura Ventas',
    pago: 0,
    esquema_pago: 'comision',
    tipo_comision: 'porcentaje',
    valor_comision: 10, // 10%
  }
  const sales = [
    { id: 'v-10', trabajador_id: 'w-2', total: 600000, items: [{ cantidad: 3 }] },
    { id: 'v-11', trabajador_id: 'w-2', total: 400000, items: [{ cantidad: 2 }] },
    { id: 'v-12', trabajador_id: 'w-2', total: 500000, estado: 'Cancelado' }, // Debe ser ignorada
  ]
  const res = calculateWorkerSalesAndCommission(worker, sales, [])
  assert.equal(res.totalVentas, 2)
  assert.equal(res.totalPrendas, 5)
  assert.equal(res.totalDinero, 1000000)
  assert.equal(res.comisionBruta, 100000) // 10% de 1.000.000
  assert.equal(res.comisionPendiente, 100000)
})

test('Solo Comisión por Prenda/Artículo ($ COP fijo): descuenta pagos previos de comisión', () => {
  const worker = {
    id: 'w-3',
    nombre: 'Andrés Confección',
    pago: 0,
    esquema_pago: 'comision',
    tipo_comision: 'monto_fijo',
    valor_comision: 5000, // 5.000 COP por prenda
    pagos: [
      { id: 'p-1', periodo: 'Comisión Semana 1', valor: 15000 },
    ],
  }
  const sales = [
    { id: 'v-20', trabajador_id: 'w-3', total: 180000, items: [{ cantidad: 4 }] },
    { id: 'v-21', trabajador_id: 'w-3', total: 90000, items: [{ cantidad: 3 }] },
  ]
  const res = calculateWorkerSalesAndCommission(worker, sales, [])
  assert.equal(res.totalPrendas, 7)
  assert.equal(res.comisionBruta, 35000) // 7 * 5.000
  assert.equal(res.pagosComision, 15000)
  assert.equal(res.comisionPendiente, 20000)
})

test('Esquema Mixto: sueldo base + comisión sobre ventas', () => {
  const worker = {
    id: 'w-4',
    nombre: 'Sofía Boutique',
    pago: 800000,
    esquema_pago: 'mixto',
    tipo_comision: 'porcentaje',
    valor_comision: 5, // 5%
  }
  const sales = [
    { id: 'v-30', trabajador_id: 'w-4', total: 1000000, items: [{ cantidad: 5 }] },
  ]
  const res = calculateWorkerSalesAndCommission(worker, sales, [])
  assert.equal(res.sueldoBase, 800000)
  assert.equal(res.comisionBruta, 50000)
  assert.equal(res.comisionPendiente, 50000)
})

test('formatCompensationLabel devuelve etiquetas descriptivas según idioma', () => {
  const workerFijo = { esquema_pago: 'fijo', pago: 1750000, frecuencia_pago: 'mensual' }
  const workerComisionPct = { esquema_pago: 'comision', tipo_comision: 'porcentaje', valor_comision: 10 }
  const workerComisionMonto = { esquema_pago: 'comision', tipo_comision: 'monto_fijo', valor_comision: 4000 }

  const tEs = {
    staff: {
      fixedSalary: 'Sueldo Fijo',
      onlyCommission: 'Solo Comisión',
      monthly: 'mes',
      perSale: 'por venta',
      perItem: 'por prenda/artículo',
    }
  }

  assert.match(formatCompensationLabel(workerFijo, tEs), /Sueldo Fijo.*1\.750\.000.*mes/)
  assert.match(formatCompensationLabel(workerComisionPct, tEs), /Solo Comisión.*10%.*por venta/)
  assert.match(formatCompensationLabel(workerComisionMonto, tEs), /Solo Comisión.*4\.000.*por prenda\/artículo/)
})

test('formatWhatsAppNumber limpia caracteres no numéricos y normaliza prefijo', async () => {
  const { formatWhatsAppNumber } = await import('./helpers.js')
  assert.equal(formatWhatsAppNumber(''), '')
  assert.equal(formatWhatsAppNumber('+57 300 123 4567'), '573001234567')
  assert.equal(formatWhatsAppNumber('310-987-6543'), '573109876543') // agrega 57 si tiene 10 dígitos y empieza con 3
  assert.equal(formatWhatsAppNumber('55 11 98765 4321'), '5511987654321') // Brasil se mantiene intacto
})

