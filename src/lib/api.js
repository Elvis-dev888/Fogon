import { supabase } from './supabaseClient'
import { shouldCreateSale } from './orderSales'

/* =========================================================
   NEGOCIOS
   ========================================================= */
export async function fetchNegocios() {
  const { data: negocios, error } = await supabase.from('negocios').select('*').order('creado_en')
  if (error) throw error

  // Traemos conteos simples para las tarjetas del Superadmin (consultas ligeras, una por negocio).
  // Si alguna de estas consultas extra falla, no debe tumbar la lista completa de negocios —
  // por eso cada negocio se protege con su propio try/catch y cae a stats en cero.
  const withStats = await Promise.all(
    negocios.map(async (n) => {
      try {
        const [{ count: productosCount, error: e1 }, { count: pedidosCount, error: e2 }, { data: ventas, error: e3 }] =
          await Promise.all([
            supabase.from('productos').select('id', { count: 'exact', head: true }).eq('negocio_id', n.id),
            supabase.from('pedidos').select('id', { count: 'exact', head: true }).eq('negocio_id', n.id).neq('estado', 'Cancelado'),
            supabase.from('ventas').select('total, creado_en, pedidos(estado)').eq('negocio_id', n.id),
          ])
        if (e1) throw e1
        if (e2) throw e2
        if (e3) throw e3
        const now = new Date()
        const ventasMes = (ventas || [])
          .filter((v) => (!v.pedidos || v.pedidos.estado !== 'Cancelado'))
          .filter((v) => {
            const d = new Date(v.creado_en)
            return d.getMonth() === now.getMonth() && d.getFullYear() === now.getFullYear()
          })
          .reduce((a, v) => a + v.total, 0)
        return { ...n, productosCount, pedidosCount, ventasMes }
      } catch (err) {
        console.error(`[Kiosko] No se pudieron cargar las estadísticas de "${n.nombre}":`, err)
        return { ...n, productosCount: 0, pedidosCount: 0, ventasMes: 0 }
      }
    })
  )
  return withStats
}

export async function createNegocio({ nombre, slogan, emoji }) {
  const { data, error } = await supabase
    .from('negocios')
    .insert({ nombre, slogan, emoji: emoji || '🍴', estado: 'Activo' })
    .select()
    .single()
  if (error) throw error
  return data
}

export async function toggleNegocioEstado(negocio) {
  const nuevoEstado = negocio.estado === 'Activo' ? 'Pausado' : 'Activo'
  const { error } = await supabase.from('negocios').update({ estado: nuevoEstado }).eq('id', negocio.id)
  if (error) throw error
}

export async function eliminarNegocio(id) {
  // 1. Desvincular perfiles asociados para evitar inconsistencias
  await supabase.from('perfiles').update({ negocio_id: null, rol: 'pendiente' }).eq('negocio_id', id)
  
  // 2. Intentar RPC de borrado atómico
  const { error: rpcError } = await supabase.rpc('eliminar_negocio_superadmin', { p_negocio_id: id })
  if (rpcError) {
    // 3. Fallback directo a delete sobre la tabla negocios
    const { error: directError } = await supabase.from('negocios').delete().eq('id', id)
    if (directError) throw directError
  }
}

export async function updateNegocio(id, cambios) {
  const { error } = await supabase.from('negocios').update(cambios).eq('id', id)
  if (error) throw error
}

// Base inicial: el capital con el que arrancó el negocio antes de empezar a
// registrar movimientos en Kiosko. Se guarda en negocios.capital_inicial y se
// usa en la pestaña "Ingresos / Egresos" para calcular el saldo real.
export async function updateCapitalInicial(id, capitalInicial) {
  const { error } = await supabase.from('negocios').update({ capital_inicial: capitalInicial }).eq('id', id)
  if (error) throw error
}

// Sube el logo a Storage dentro de una carpeta con el id del negocio
// (mismo patrón que las fotos de producto) y devuelve la URL pública.
export async function subirLogoNegocio(negocioId, file) {
  const ext = file.name.split('.').pop()
  const path = `${negocioId}/logo-${crypto.randomUUID()}.${ext}`
  const { error } = await supabase.storage.from('negocios').upload(path, file, { upsert: true })
  if (error) throw error
  const { data } = supabase.storage.from('negocios').getPublicUrl(path)
  return data.publicUrl
}

/* =========================================================
   CATEGORIAS
   ========================================================= */
export async function fetchCategorias(negocioId) {
  const { data, error } = await supabase.from('categorias').select('*').eq('negocio_id', negocioId).order('nombre')
  if (error) throw error
  return data
}
export async function createCategoria(negocioId, nombre) {
  const { error } = await supabase.from('categorias').insert({ negocio_id: negocioId, nombre })
  if (error) throw error
}
export async function deleteCategoria(id) {
  const { error } = await supabase.from('categorias').delete().eq('id', id)
  if (error) throw error
}

/* =========================================================
   PRODUCTOS  (adiciones se guardan como jsonb: [{nombre, precio}])
   ========================================================= */
export async function fetchProductos(negocioId) {
  const { data, error } = await supabase.from('productos').select('*').eq('negocio_id', negocioId).order('categoria')
  if (error) throw error
  return data
}
export async function createProducto(negocioId, producto) {
  const { error } = await supabase.from('productos').insert({ negocio_id: negocioId, ...producto })
  if (error) throw error
}
export async function updateProducto(id, cambios) {
  const { error } = await supabase.from('productos').update(cambios).eq('id', id)
  if (error) throw error
}
export async function deleteProducto(id) {
  const { error } = await supabase.from('productos').delete().eq('id', id)
  if (error) throw error
}

// Sube la foto a Storage dentro de una carpeta con el id del negocio
// (así las políticas de seguridad saben de quién es cada foto) y
// devuelve la URL pública para guardarla en productos.imagen_url.
export async function subirFotoProducto(negocioId, file) {
  const ext = file.name.split('.').pop()
  const path = `${negocioId}/${crypto.randomUUID()}.${ext}`
  const { error } = await supabase.storage.from('productos').upload(path, file, { upsert: true })
  if (error) throw error
  const { data } = supabase.storage.from('productos').getPublicUrl(path)
  return data.publicUrl
}

/* =========================================================
   INGREDIENTES / INVENTARIO
   ========================================================= */
export async function fetchIngredientes(negocioId) {
  const { data, error } = await supabase.from('ingredientes').select('*').eq('negocio_id', negocioId).order('nombre')
  if (error) throw error
  return data
}
export async function createIngrediente(negocioId, ingrediente) {
  const { error } = await supabase.from('ingredientes').insert({ negocio_id: negocioId, ...ingrediente })
  if (error) throw error
}
export async function updateIngrediente(id, cambios) {
  const { error } = await supabase.from('ingredientes').update(cambios).eq('id', id)
  if (error) throw error
}
export async function deleteIngrediente(id) {
  const { error } = await supabase.from('ingredientes').delete().eq('id', id)
  if (error) throw error
}
export async function setIngredienteStock(id, stock) {
  const { error } = await supabase.from('ingredientes').update({ stock }).eq('id', id)
  if (error) throw error
}
export async function registrarVentaInventario(negocioId, { ingredienteId, cantidad, precioUnitario, concepto }, stockActual) {
  const cant = Number(cantidad) || 0
  const precio = Number(precioUnitario) || 0
  const total = cant * precio
  const nuevoStock = Math.max(0, (Number(stockActual) || 0) - cant)

  const { error: e1 } = await supabase.from('ingredientes').update({ stock: nuevoStock }).eq('id', ingredienteId)
  if (e1) throw e1

  const { error: e2 } = await supabase.from('ingresos').insert({
    negocio_id: negocioId,
    concepto: concepto || `Venta de inventario (${cant} und)`,
    valor: total,
  })
  if (e2) throw e2
}

/* =========================================================
   COMPRAS  (aumentan inventario + quedan como egreso implícito)
   ========================================================= */
export async function fetchCompras(negocioId) {
  const { data, error } = await supabase
    .from('compras')
    .select('*, ingredientes(nombre, unidad)')
    .eq('negocio_id', negocioId)
    .order('creado_en', { ascending: false })
  if (error) throw error
  return data
}
export async function registrarCompra(negocioId, { ingredienteId, cantidad, valor }, stockActual = 0, costoActual = 0) {
  const { error: e1 } = await supabase.from('compras').insert({
    negocio_id: negocioId,
    ingrediente_id: ingredienteId,
    cantidad,
    valor,
  })
  if (e1) throw e1

  const nuevoStock = Number(stockActual) + Number(cantidad)
  const costoUnitarioCompra = Number(cantidad) > 0 ? Number(valor) / Number(cantidad) : 0
  const nuevoCosto = nuevoStock > 0 && Number(costoActual) > 0
    ? ((Number(stockActual) * Number(costoActual)) + Number(valor)) / nuevoStock
    : costoUnitarioCompra

  const updates = { stock: nuevoStock }
  if (costoUnitarioCompra > 0) {
    updates.costo_unitario = Math.round(nuevoCosto * 100) / 100
  }

  const { error: e2 } = await supabase
    .from('ingredientes')
    .update(updates)
    .eq('id', ingredienteId)
  if (e2) throw e2
}

/* =========================================================
   PEDIDOS + ITEMS  (crear pedido genera también la venta)
   ========================================================= */
export async function fetchPedidos(negocioId) {
  const { data, error } = await supabase
    .from('pedidos')
    .select('*, pedido_items(*)')
    .eq('negocio_id', negocioId)
    .order('numero', { ascending: false })
  if (error) throw error
  return data
}

export async function crearPedido(negocioId, { cliente, items, total, tipo_entrega, direccion, telefono, notas_entrega }) {
  const { data: pedido, error: e1 } = await supabase
    .from('pedidos')
    .insert({
      negocio_id: negocioId,
      cliente: cliente || 'Cliente',
      total,
      estado: 'Pendiente',
      tipo_entrega: tipo_entrega || 'local',
      direccion: direccion ? direccion.trim() : '',
      telefono: telefono ? telefono.trim() : '',
      notas_entrega: notas_entrega ? notas_entrega.trim() : '',
    })
    .select()
    .single()
  if (e1) throw e1

  const itemsPayload = items.map((it) => ({
    pedido_id: pedido.id,
    producto_id: it.producto_id || it.productId,
    nombre: it.nombre,
    cantidad: it.cantidad,
    adiciones: it.adiciones,
    observaciones: it.obs,
    subtotal: it.subtotal,
  }))
  const { error: e2 } = await supabase.from('pedido_items').insert(itemsPayload)
  if (e2) throw e2

  return pedido
}

export async function avanzarEstadoPedido(pedidoId, nuevoEstado) {
  const { data: pedidoActual, error: ePedido } = await supabase
    .from('pedidos')
    .select('estado, total, negocio_id')
    .eq('id', pedidoId)
    .single()

  if (ePedido) throw ePedido

  if (shouldCreateSale(pedidoActual?.estado, nuevoEstado)) {
    const { data: ventaExistente } = await supabase
      .from('ventas')
      .select('id')
      .eq('pedido_id', pedidoId)
      .maybeSingle()

    if (!ventaExistente) {
      const { error: e3 } = await supabase.from('ventas').insert({
        negocio_id: pedidoActual.negocio_id,
        pedido_id: pedidoId,
        total: pedidoActual.total,
      })
      if (e3) throw e3
    }
  } else if (nuevoEstado === 'Cancelado') {
    // Si se cancela un pedido que ya tenía venta, borrar la venta de inmediato
    await supabase.from('ventas').delete().eq('pedido_id', pedidoId)
  }

  const { error } = await supabase.from('pedidos').update({ estado: nuevoEstado }).eq('id', pedidoId)
  if (error) throw error
}

// Reversa el stock que se descontó a cada producto de este pedido (el mismo
// gatillo de la base de datos que descuenta al insertar un pedido_item no
// existe al revés, así que aquí se hace a mano). Solo toca productos que sí
// llevan control de stock (stock no nulo) — igual que hace el gatillo.
async function restaurarStockItems(items, productos) {
  for (const it of items || []) {
    const productoId = it.producto_id || it.productId
    if (!productoId) continue
    const prod = productos.find((p) => p.id === productoId)
    if (prod && prod.stock !== null && prod.stock !== undefined) {
      await supabase.from('productos').update({ stock: prod.stock + it.cantidad }).eq('id', productoId)
    }
  }
}

// Edita un pedido ya confirmado: reemplaza sus items por los nuevos,
// recalcula el total, lo deja igual en la "venta" asociada (para que
// Finanzas y Ventas no queden desfasados) y ajusta el stock de productos
// (revierte el de los items viejos, el gatillo descuenta el de los nuevos).
export async function actualizarPedido(pedido, productos, nuevosItems) {
  await restaurarStockItems(pedido.pedido_items || pedido.items, productos)

  const { error: eDel } = await supabase.from('pedido_items').delete().eq('pedido_id', pedido.id)
  if (eDel) throw eDel

  const total = nuevosItems.reduce((a, it) => a + it.subtotal, 0)
  if (nuevosItems.length > 0) {
    const itemsPayload = nuevosItems.map((it) => ({
      pedido_id: pedido.id,
      producto_id: it.producto_id || it.productId || null,
      nombre: it.nombre,
      cantidad: it.cantidad,
      adiciones: it.adiciones,
      observaciones: it.obs || '',
      subtotal: it.subtotal,
    }))
    const { error: eIns } = await supabase.from('pedido_items').insert(itemsPayload)
    if (eIns) throw eIns
  }

  const { error: eUpd } = await supabase.from('pedidos').update({ total }).eq('id', pedido.id)
  if (eUpd) throw eUpd
  await supabase.from('ventas').update({ total }).eq('pedido_id', pedido.id)

  return { items: nuevosItems, total }
}

// Cancela un pedido: nunca lo borra (queda con estado "Cancelado" para el
// historial), le devuelve el stock a los productos que tenía, y borra la
// "venta" asociada para que no siga contando en los reportes de ingresos.
export async function cancelarPedido(pedido, productos, canceladoPor) {
  await restaurarStockItems(pedido.pedido_items || pedido.items, productos)
  await supabase.from('ventas').delete().eq('pedido_id', pedido.id)
  const { error } = await supabase
    .from('pedidos')
    .update({ estado: 'Cancelado', cancelado_en: new Date().toISOString(), cancelado_por: canceladoPor || null })
    .eq('id', pedido.id)
  if (error) throw error
}

export function suscribirsePedido(pedidoId, onChange) {
  const channel = supabase
    .channel(`pedido-${pedidoId}`)
    .on(
      'postgres_changes',
      { event: 'UPDATE', schema: 'public', table: 'pedidos', filter: `id=eq.${pedidoId}` },
      (payload) => onChange(payload.new)
    )
    .subscribe()
  return () => supabase.removeChannel(channel)
}

/* =========================================================
   VENTAS
   ========================================================= */
export async function fetchVentas(negocioId) {
  const { data, error } = await supabase
    .from('ventas')
    .select('*, pedidos(*, pedido_items(*))')
    .eq('negocio_id', negocioId)
    .order('creado_en', { ascending: false })
  if (error) throw error
  // Asegurar que ninguna venta de un pedido cancelado sea devuelta o sumada
  return (data || []).filter((v) => !v.pedidos || v.pedidos.estado !== 'Cancelado')
}

/* =========================================================
   TRABAJADORES + PAGOS
   ========================================================= */
export async function fetchTrabajadores(negocioId) {
  const { data, error } = await supabase
    .from('trabajadores')
    .select('*, pagos(*)')
    .eq('negocio_id', negocioId)
    .order('nombre')
  if (error) throw error
  return data
}
export async function createTrabajador(negocioId, trabajador) {
  const { error } = await supabase.from('trabajadores').insert({ negocio_id: negocioId, ...trabajador, estado: 'Activo' })
  if (error) throw error
}
export async function updateTrabajador(id, cambios) {
  const { error } = await supabase.from('trabajadores').update(cambios).eq('id', id)
  if (error) throw error
}
export async function deleteTrabajador(id) {
  const { error } = await supabase.from('trabajadores').delete().eq('id', id)
  if (error) throw error
}
export async function toggleTrabajadorEstado(trabajador) {
  const nuevoEstado = trabajador.estado === 'Activo' ? 'Inactivo' : 'Activo'
  const { error } = await supabase.from('trabajadores').update({ estado: nuevoEstado }).eq('id', trabajador.id)
  if (error) throw error
}
export async function registrarPago(trabajadorId, negocioId, { periodo, valor }) {
  const { error } = await supabase.from('pagos').insert({ trabajador_id: trabajadorId, negocio_id: negocioId, periodo, valor })
  if (error) throw error
}
export async function deletePago(id) {
  const { error } = await supabase.from('pagos').delete().eq('id', id)
  if (error) throw error
}

/* =========================================================
   INGRESOS / EGRESOS manuales
   ========================================================= */
export async function fetchIngresos(negocioId) {
  const { data, error } = await supabase.from('ingresos').select('*').eq('negocio_id', negocioId).order('creado_en', { ascending: false })
  if (error) throw error
  return data
}
export async function fetchEgresos(negocioId) {
  const { data, error } = await supabase.from('egresos').select('*').eq('negocio_id', negocioId).order('creado_en', { ascending: false })
  if (error) throw error
  return data
}
export async function createIngreso(negocioId, { concepto, valor }) {
  const { error } = await supabase.from('ingresos').insert({ negocio_id: negocioId, concepto, valor })
  if (error) throw error
}
export async function deleteIngreso(id) {
  const { error } = await supabase.from('ingresos').delete().eq('id', id)
  if (error) throw error
}
export async function createEgreso(negocioId, { concepto, valor }) {
  const { error } = await supabase.from('egresos').insert({ negocio_id: negocioId, concepto, valor })
  if (error) throw error
}
export async function deleteEgreso(id) {
  const { error } = await supabase.from('egresos').delete().eq('id', id)
  if (error) throw error
}
export async function deleteCompra(id) {
  const { error } = await supabase.from('compras').delete().eq('id', id)
  if (error) throw error
}

/* =========================================================
   SUGERENCIAS Y FEEDBACK (Para Superadmin)
   ========================================================= */
export async function enviarSugerencia({ negocioId, negocioNombre, usuarioEmail, tipo, titulo, mensaje }) {
  const { error } = await supabase.from('sugerencias').insert({
    negocio_id: negocioId || null,
    negocio_nombre: negocioNombre || '',
    usuario_email: usuarioEmail || '',
    tipo: tipo || 'idea',
    titulo: titulo ? titulo.trim() : '',
    mensaje: mensaje.trim(),
    estado: 'Pendiente',
  })
  if (error) throw error
}

export async function fetchSugerencias() {
  const { data, error } = await supabase
    .from('sugerencias')
    .select('*')
    .order('creado_en', { ascending: false })
  if (error) throw error
  return data || []
}

export async function actualizarEstadoSugerencia(id, nuevoEstado) {
  const { error } = await supabase
    .from('sugerencias')
    .update({ estado: nuevoEstado })
    .eq('id', id)
  if (error) throw error
}

export async function eliminarSugerencia(id) {
  const { error } = await supabase
    .from('sugerencias')
    .delete()
    .eq('id', id)
  if (error) throw error
}