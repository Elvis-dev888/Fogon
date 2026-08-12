import { supabase } from './supabaseClient'

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
            supabase.from('pedidos').select('id', { count: 'exact', head: true }).eq('negocio_id', n.id),
            supabase.from('ventas').select('total, creado_en').eq('negocio_id', n.id),
          ])
        if (e1) throw e1
        if (e2) throw e2
        if (e3) throw e3
        const now = new Date()
        const ventasMes = (ventas || [])
          .filter((v) => {
            const d = new Date(v.creado_en)
            return d.getMonth() === now.getMonth() && d.getFullYear() === now.getFullYear()
          })
          .reduce((a, v) => a + v.total, 0)
        return { ...n, productosCount, pedidosCount, ventasMes }
      } catch (err) {
        console.error(`[Fogón] No se pudieron cargar las estadísticas de "${n.nombre}":`, err)
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
export async function setIngredienteStock(id, stock) {
  const { error } = await supabase.from('ingredientes').update({ stock }).eq('id', id)
  if (error) throw error
}

/* =========================================================
   COMPRAS  (aumentan inventario + quedan como egreso implícito)
   ========================================================= */
export async function fetchCompras(negocioId) {
  const { data, error } = await supabase
    .from('compras')
    .select('*, ingredientes(nombre)')
    .eq('negocio_id', negocioId)
    .order('creado_en', { ascending: false })
  if (error) throw error
  return data
}
export async function registrarCompra(negocioId, { ingredienteId, cantidad, valor }, stockActual) {
  const { error: e1 } = await supabase.from('compras').insert({
    negocio_id: negocioId,
    ingrediente_id: ingredienteId,
    cantidad,
    valor,
  })
  if (e1) throw e1
  const { error: e2 } = await supabase
    .from('ingredientes')
    .update({ stock: stockActual + cantidad })
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

export async function crearPedido(negocioId, { cliente, items, total }) {
  const { data: pedido, error: e1 } = await supabase
    .from('pedidos')
    .insert({ negocio_id: negocioId, cliente, total, estado: 'Pendiente' })
    .select()
    .single()
  if (e1) throw e1

    const itemsPayload = items.map((it) => ({
    pedido_id: pedido.id,
    producto_id: it.productId,
    nombre: it.nombre,
    cantidad: it.cantidad,
    adiciones: it.adiciones,
    observaciones: it.obs,
    subtotal: it.subtotal,
  }))
  const { error: e2 } = await supabase.from('pedido_items').insert(itemsPayload)
  if (e2) throw e2

  // La venta se genera automáticamente al confirmar el pedido
  const { error: e3 } = await supabase.from('ventas').insert({
    negocio_id: negocioId,
    pedido_id: pedido.id,
    total,
  })
  if (e3) throw e3

  return pedido
}

export async function avanzarEstadoPedido(pedidoId, nuevoEstado) {
  const { error } = await supabase.from('pedidos').update({ estado: nuevoEstado }).eq('id', pedidoId)
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
    .select('*')
    .eq('negocio_id', negocioId)
    .order('creado_en', { ascending: false })
  if (error) throw error
  return data
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
export async function toggleTrabajadorEstado(trabajador) {
  const nuevoEstado = trabajador.estado === 'Activo' ? 'Inactivo' : 'Activo'
  const { error } = await supabase.from('trabajadores').update({ estado: nuevoEstado }).eq('id', trabajador.id)
  if (error) throw error
}
export async function registrarPago(trabajadorId, negocioId, { periodo, valor }) {
  const { error } = await supabase.from('pagos').insert({ trabajador_id: trabajadorId, negocio_id: negocioId, periodo, valor })
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
export async function createEgreso(negocioId, { concepto, valor }) {
  const { error } = await supabase.from('egresos').insert({ negocio_id: negocioId, concepto, valor })
  if (error) throw error
}
