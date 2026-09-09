/**
 * Kiosko - Utilidades de Nómina y Comisiones por Venta
 * Soporta 3 esquemas:
 * 1. Sueldo Fijo ('fijo'): Diario, semanal, quincenal o mensual.
 * 2. Solo Comisión ('comision'): 100% comisión por porcentaje (%) o monto fijo ($ por prenda/artículo).
 * 3. Mixto ('mixto'): Sueldo base fijo + comisión por ventas.
 */

export function calculateWorkerSalesAndCommission(worker = {}, sales = [], orders = []) {
  const workerId = worker.id
  const workerName = (worker.nombre || '').trim().toLowerCase()
  const esquema = worker.esquema_pago || 'fijo'
  const tipoComision = worker.tipo_comision || 'porcentaje'
  const valorComision = Number(worker.valor_comision) || 0
  const sueldoBase = Number(worker.pago) || 0

  // Filtrar pedidos y ventas asignados a este trabajador
  // Considera ventas y pedidos activos (no cancelados)
  const pool = [...sales, ...orders]
  const vistos = new Set()
  const ventasTrabajador = []

  for (const item of pool) {
    if (!item || !item.id) continue
    if (vistos.has(item.id)) continue
    vistos.add(item.id)

    // Descartar cancelados
    if (item.estado === 'Cancelado' || item.pedidos?.estado === 'Cancelado') continue

    const pedido = item.pedidos || item
    const asignadoId = item.trabajador_id || item.trabajadorId || item.vendedor_id || pedido.trabajador_id || pedido.trabajadorId || pedido.vendedor_id
    const asignadoNombre = (item.vendedor || item.mesero || item.cliente || pedido.vendedor || pedido.mesero || '').trim().toLowerCase()

    const coincideId = workerId && asignadoId === workerId
    const coincideNombre = workerName && (
      asignadoNombre === workerName ||
      asignadoNombre.includes(`vendedor: ${workerName}`) ||
      asignadoNombre.includes(`atendido por: ${workerName}`)
    )

    if (coincideId || coincideNombre) {
      ventasTrabajador.push(item)
    }
  }

  // Calcular total vendido y total de prendas/artículos
  let totalDinero = 0
  let totalPrendas = 0

  for (const v of ventasTrabajador) {
    totalDinero += Number(v.total) || 0
    const items = v.items || v.pedido_items || v.pedidos?.pedido_items || v.pedidos?.items || []
    if (Array.isArray(items) && items.length > 0) {
      for (const it of items) {
        totalPrendas += Number(it.cantidad) || 1
      }
    } else {
      totalPrendas += 1
    }
  }

  // Calcular comisión bruta
  let comisionBruta = 0
  if (esquema === 'comision' || esquema === 'mixto') {
    if (tipoComision === 'porcentaje') {
      comisionBruta = (totalDinero * valorComision) / 100
    } else if (tipoComision === 'monto_fijo') {
      comisionBruta = totalPrendas * valorComision
    }
  }

  // Pagos previos registrados para comisiones
  const pagos = Array.isArray(worker.pagos) ? worker.pagos : []
  const pagosComision = pagos
    .filter(p => (p.periodo || '').toLowerCase().includes('comisi') || (p.tipo || '') === 'comision')
    .reduce((acc, p) => acc + (Number(p.valor) || 0), 0)

  const comisionPendiente = Math.max(0, comisionBruta - pagosComision)

  return {
    esquema,
    tipoComision,
    valorComision,
    sueldoBase,
    totalVentas: ventasTrabajador.length,
    totalPrendas,
    totalDinero,
    comisionBruta: Math.round(comisionBruta),
    pagosComision: Math.round(pagosComision),
    comisionPendiente: Math.round(comisionPendiente),
    totalPendienteLiquidar: esquema === 'fijo' ? sueldoBase : Math.round(comisionPendiente),
  }
}

export function formatCompensationLabel(worker = {}, t = {}) {
  const esquema = worker.esquema_pago || 'fijo'
  const valorComision = Number(worker.valor_comision) || 0
  const tipoComision = worker.tipo_comision || 'porcentaje'
  const sueldoBase = Number(worker.pago) || 0
  const frecuencia = worker.frecuencia_pago || 'mensual'

  const freqLabel = frecuencia === 'diario'
    ? (t.staff?.daily || 'día')
    : frecuencia === 'quincenal'
      ? (t.staff?.biweekly || 'quincena')
      : frecuencia === 'semanal'
        ? (t.staff?.weekly || 'semana')
        : (t.staff?.monthly || 'mes')

  if (esquema === 'fijo') {
    return `${t.staff?.fixedSalary || 'Sueldo Fijo'}: $${sueldoBase.toLocaleString('es-CO')} COP / ${freqLabel}`
  }

  if (esquema === 'comision') {
    if (tipoComision === 'porcentaje') {
      return `${t.staff?.onlyCommission || 'Solo Comisión'}: ${valorComision}% ${t.staff?.perSale || 'por venta'}`
    }
    return `${t.staff?.onlyCommission || 'Solo Comisión'}: $${valorComision.toLocaleString('es-CO')} COP ${t.staff?.perItem || 'por prenda/artículo'}`
  }

  // Mixto
  const comisionTxt = tipoComision === 'porcentaje'
    ? `${valorComision}%`
    : `$${valorComision.toLocaleString('es-CO')} COP`
  return `${t.staff?.mixedSalary || 'Base'} $${sueldoBase.toLocaleString('es-CO')} + ${comisionTxt} ${t.staff?.commission || 'comisión'}`
}
