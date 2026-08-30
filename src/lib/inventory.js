export function calculateWeightedCost(stockActual = 0, costoActual = 0, cantidadComprada = 0, valorCompra = 0) {
  const stock = Math.max(0, Number(stockActual) || 0)
  const costo = Math.max(0, Number(costoActual) || 0)
  const cant = Math.max(0, Number(cantidadComprada) || 0)
  const valor = Math.max(0, Number(valorCompra) || 0)

  const nuevoStock = stock + cant
  if (nuevoStock <= 0) return 0

  const costoUnitarioCompra = cant > 0 ? valor / cant : 0
  if (stock === 0 || costo === 0) return Math.round(costoUnitarioCompra * 100) / 100

  const costoPonderado = ((stock * costo) + valor) / nuevoStock
  return Math.round(costoPonderado * 100) / 100
}

export function calculateMargin(salePrice = 0, unitCost = 0) {
  const precio = Math.max(0, Number(salePrice) || 0)
  const costo = Math.max(0, Number(unitCost) || 0)
  const margen = precio - costo
  const porcentaje = costo > 0 ? Math.round((margen / costo) * 100) : (precio > 0 ? 100 : 0)

  return {
    margen,
    porcentaje,
  }
}

export function calculateInventoryValuation(items = []) {
  return items.reduce((sum, item) => {
    const stock = Math.max(0, Number(item.stock) || 0)
    const cost = Math.max(0, Number(item.costo_unitario) || 0)
    return sum + (stock * cost)
  }, 0)
}

