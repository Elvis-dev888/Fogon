import { useState } from 'react'
import { Btn, Card, StatCard, Pill, Modal, Field, Input, Select, Textarea, Empty } from './ui'
import { fmt$, fmtDate, fmtDateLong, fmtMonthLabel, sameMonth, dateStr, monthStr, todayStr, ESTADOS, thumbFor } from '../lib/helpers'
import {
  createCategoria, deleteCategoria, createProducto, updateProducto, deleteProducto, subirFotoProducto,
  createIngrediente, setIngredienteStock, registrarCompra, avanzarEstadoPedido, actualizarPedido, cancelarPedido,
  createTrabajador, updateTrabajador, toggleTrabajadorEstado, registrarPago, createIngreso, createEgreso,
  updateNegocio, subirLogoNegocio, updateCapitalInicial,
} from '../lib/api'
import { EditarPedidoModal, ConfirmCancelModal } from './PedidoCompartido'

const estadoTone = (e) => (
  e === 'Pendiente' ? 'default' : e === 'En preparación' ? 'preparacion' : e === 'Listo' ? 'listo' : e === 'Cancelado' ? 'cancelado' : 'entregado'
)

/* ---------------- Mi negocio (logo + datos básicos) ---------------- */
export function TabMiNegocio({ negocio, notify, onNegocioUpdated }) {
  const [nombre, setNombre] = useState(negocio.nombre || '')
  const [slogan, setSlogan] = useState(negocio.slogan || '')
  const [descripcion, setDescripcion] = useState(negocio.descripcion || '')
  const [preview, setPreview] = useState(negocio.logo_url || null)
  const [archivo, setArchivo] = useState(null)
  const [guardando, setGuardando] = useState(false)
  const [subiendo, setSubiendo] = useState(false)

  function onPickFile(e) {
    const file = e.target.files?.[0]
    if (!file) return
    setArchivo(file)
    setPreview(URL.createObjectURL(file))
  }

  async function guardar(e) {
    e.preventDefault()
    setGuardando(true)
    try {
      let logoUrl = negocio.logo_url
      if (archivo) {
        setSubiendo(true)
        logoUrl = await subirLogoNegocio(negocio.id, archivo)
        setSubiendo(false)
      }
      const cambios = { nombre, slogan, descripcion, logo_url: logoUrl }
      await updateNegocio(negocio.id, cambios)
      notify('Datos del negocio actualizados')
      if (onNegocioUpdated) await onNegocioUpdated(cambios)
    } finally {
      setGuardando(false)
    }
  }

  return (
    <div>
      <SectionTitle title="Mi negocio" sub="El logo y los datos que ven tus clientes en el catálogo." />
      <Card className="p-6 max-w-[520px]">
        <form onSubmit={guardar}>
          <Field label="Logo del negocio">
            <div className="flex items-center gap-4">
              <div className="w-20 h-20 rounded-full border border-line overflow-hidden flex items-center justify-center text-3xl bg-paper shrink-0">
                {preview ? <img src={preview} alt="" className="w-full h-full object-cover" /> : negocio.emoji}
              </div>
              <label className="text-[12.5px] text-gold cursor-pointer hover:text-champagne">
                {preview ? 'Cambiar logo' : 'Subir logo'}
                <input type="file" accept="image/*" className="hidden" onChange={onPickFile} />
              </label>
            </div>
          </Field>
          <Field label="Nombre del negocio"><Input required value={nombre} onChange={(e) => setNombre(e.target.value)} /></Field>
          <Field label="Eslogan"><Input value={slogan} onChange={(e) => setSlogan(e.target.value)} /></Field>
          <Field label="Descripción"><Textarea rows={3} value={descripcion} onChange={(e) => setDescripcion(e.target.value)} /></Field>
          <Btn variant="primary" className="w-full justify-center" disabled={guardando}>
            {subiendo ? 'Subiendo logo…' : guardando ? 'Guardando…' : 'Guardar cambios'}
          </Btn>
        </form>
      </Card>
    </div>
  )
}

/* ---------------- Dashboard ---------------- */
export function TabDashboard({ negocio, data }) {
  const ventasMes = data.ventas.filter((v) => sameMonth(v.creado_en)).reduce((a, v) => a + v.total, 0)
  const comprasMes = data.compras.filter((c) => sameMonth(c.creado_en)).reduce((a, c) => a + c.valor, 0)
  const pagosMes = data.trabajadores.flatMap((w) => w.pagos).filter((p) => sameMonth(p.creado_en)).reduce((a, p) => a + p.valor, 0)
  const otrosMes = data.egresos.filter((e) => sameMonth(e.creado_en)).reduce((a, e) => a + e.valor, 0)
  const resultado = ventasMes - (comprasMes + pagosMes + otrosMes)
  const pendientes = data.pedidos.filter((p) => p.estado !== 'Entregado' && p.estado !== 'Cancelado').length
  const lowStock = data.ingredientes.filter((i) => i.stock <= i.minimo)

  return (
    <div>
      <SectionTitle title="Resumen del mes" sub={new Date().toLocaleDateString('es-CO', { month: 'long', year: 'numeric' })} />
      <div className="grid grid-cols-[repeat(auto-fit,minmax(180px,1fr))] gap-3.5 mb-6">
        <StatCard label="Ventas" value={fmt$(ventasMes)} tone="gold" />
        <StatCard label="Compras" value={fmt$(comprasMes)} tone="champagne" />
        <StatCard label="Pagos a trabajadores" value={fmt$(pagosMes)} />
        <StatCard label="Otros gastos" value={fmt$(otrosMes)} />
        <StatCard label="Resultado aprox." value={fmt$(resultado)} tone="sage" />
      </div>
      <div className="grid grid-cols-[1.3fr_.9fr] gap-4 max-[820px]:grid-cols-1">
        <Card className="p-5">
          <h3 className="font-serif text-lg font-semibold mb-3">
            Pedidos recientes {pendientes > 0 && <Pill tone="preparacion">{pendientes} en curso</Pill>}
          </h3>
          {data.pedidos.length === 0 ? (
            <Empty icon="🧾">Aún no hay pedidos. Cuando un cliente confirme uno, aparecerá aquí.</Empty>
          ) : (
            <Table
              head={['Pedido', 'Cliente', 'Total', 'Estado']}
              rows={data.pedidos.slice(0, 6).map((p) => [
                <span className="font-mono">#{p.numero}</span>,
                p.cliente,
                <span className="font-mono">{fmt$(p.total)}</span>,
                <Pill tone={estadoTone(p.estado)}>{p.estado}</Pill>,
              ])}
            />
          )}
        </Card>
        <Card className="p-5">
          <h3 className="font-serif text-lg font-semibold mb-3">Inventario bajo</h3>
          {lowStock.length === 0 ? (
            <p className="text-creamsoft text-[13.5px]">Todo el inventario está en buen nivel. 👍</p>
          ) : (
            lowStock.map((i) => (
              <div key={i.id} className="border-l-2 border-wine bg-wine/10 px-3 py-2 rounded-sm text-[12.5px] mb-2">
                <b>{i.nombre}</b> — quedan {i.stock} {i.unidad} (mínimo {i.minimo})
              </div>
            ))
          )}
        </Card>
      </div>
    </div>
  )
}

/* ---------------- Productos ---------------- */
export function TabProductos({ negocio, data, reload, notify }) {
  const [modal, setModal] = useState(null) // null | 'new' | 'new-adicion' | producto object
  const menu = data.productos.filter((p) => !p.es_adicion)
  const adicionales = data.productos.filter((p) => p.es_adicion)

  return (
    <div>
      <SectionTitle title="Productos" sub={`Catálogo configurable de ${negocio.nombre} — ${menu.length} productos.`}
        action={<Btn variant="primary" onClick={() => setModal('new')}>➕ Nuevo producto</Btn>} />
      <div className="grid grid-cols-[repeat(auto-fill,minmax(240px,1fr))] gap-4">
        {menu.map((p) => (
          <ProductoCard key={p.id} p={p}
            onToggle={async () => { await updateProducto(p.id, { disponible: !p.disponible }); notify(`${p.nombre} ${p.disponible ? 'marcado como agotado' : 'disponible de nuevo'}`); reload() }}
            onEdit={() => setModal(p)}
            onDelete={async () => { await deleteProducto(p.id); notify('Producto eliminado'); reload() }}
          />
        ))}
      </div>

      <div className="mt-10">
        <SectionTitle title="Adicionales" sub="Extras que el cliente puede agregarle a cualquier producto (queso, jamón, chicharrón...)."
          action={<Btn size="sm" variant="mustard" onClick={() => setModal('new-adicion')}>➕ Nuevo adicional</Btn>} />
        {adicionales.length === 0 ? (
          <Empty icon="➕">Aún no has creado adicionales.</Empty>
        ) : (
          <div className="grid grid-cols-[repeat(auto-fill,minmax(200px,1fr))] gap-3">
            {adicionales.map((a) => (
              <div key={a.id} className="border border-line rounded p-3.5 bg-paper2">
                <div className="flex justify-between items-start mb-1">
                  <h4 className="font-semibold text-[14px]">{a.nombre}</h4>
                  {!a.disponible && <Pill tone="cancelado">Inactivo</Pill>}
                </div>
                <div className="font-mono font-bold text-champagne text-[13px] mb-2.5">+ {fmt$(a.precio)}</div>
                <div className="flex gap-1.5 flex-wrap">
                  <Btn size="sm" variant="ghost" onClick={async () => { await updateProducto(a.id, { disponible: !a.disponible }); notify(`${a.nombre} ${a.disponible ? 'desactivado' : 'activado'}`); reload() }}>
                    {a.disponible ? 'Desactivar' : 'Activar'}
                  </Btn>
                  <Btn size="sm" variant="ghost" onClick={() => setModal(a)}>Editar</Btn>
                  <Btn size="sm" variant="danger" onClick={async () => { await deleteProducto(a.id); notify('Adicional eliminado'); reload() }}>Eliminar</Btn>
                </div>
              </div>
            ))}
          </div>
        )}
      </div>

      {modal && (
        <ProductoModal
          negocio={negocio} categorias={data.categorias}
          producto={modal === 'new' || modal === 'new-adicion' ? null : modal}
          esAdicionDefault={modal === 'new-adicion'}
          onClose={() => setModal(null)}
          onSaved={() => { setModal(null); notify(typeof modal === 'string' ? 'Producto creado' : 'Producto actualizado'); reload() }}
        />
      )}
    </div>
  )
}

function ProductoCard({ p, onToggle, onEdit, onDelete }) {
  return (
    <div className="group border border-line rounded overflow-hidden bg-paper2 hover:border-gold transition-colors relative">
      {!p.disponible && <span className="absolute top-2 right-2 text-[9.5px] font-bold px-2 py-1 rounded-full bg-paper text-creamsoft border border-line uppercase">Agotado</span>}
      <div className="h-24 flex items-center justify-center text-4xl relative border-b border-line overflow-hidden" style={{ background: thumbFor(p.emoji) }}>
        {p.imagen_url ? <img src={p.imagen_url} alt={p.nombre} className="w-full h-full object-cover" /> : p.emoji}
        <div className="absolute inset-x-0 bottom-0 top-0 pointer-events-none">
          <span className="steam-span absolute bottom-[70%] left-[45%] w-[5px] h-5 rounded-full bg-cream/40 blur-[3px] opacity-0" />
        </div>
      </div>
      <div className="p-3.5">
        <span className="text-[10.5px] text-creamsoft font-semibold uppercase tracking-wide">{p.categoria}</span>
        <h4 className="font-serif font-semibold text-[15px] mb-0.5">{p.nombre}</h4>
        <div className="font-mono font-bold text-gold my-2">{fmt$(p.precio)}</div>
        {p.stock !== null && p.stock !== undefined && (
          <div className={`text-[11.5px] font-semibold mb-1.5 ${p.stock === 0 ? 'text-wine' : 'text-creamsoft'}`}>
            {p.stock === 0 ? 'Sin stock' : `Quedan ${p.stock}`}
          </div>
        )}
        <div className="flex gap-1.5 flex-wrap">
          <Btn size="sm" variant="ghost" onClick={onToggle}>{p.disponible ? 'Marcar agotado' : 'Reactivar'}</Btn>
          <Btn size="sm" variant="ghost" onClick={onEdit}>Editar</Btn>
          <Btn size="sm" variant="danger" onClick={onDelete}>Eliminar</Btn>
        </div>
      </div>
    </div>
  )
}

function ProductoModal({ negocio, categorias, producto, esAdicionDefault, onClose, onSaved }) {
  const esAdicion = producto ? !!producto.es_adicion : !!esAdicionDefault
  const [nombre, setNombre] = useState(producto?.nombre || '')
  const [categoria, setCategoria] = useState(producto?.categoria || categorias[0]?.nombre || '')
  const [precio, setPrecio] = useState(producto?.precio || '')
  const [desc, setDesc] = useState(producto?.desc || '')
  const [emoji, setEmoji] = useState(producto?.emoji || '🍽️')
  const [stock, setStock] = useState(producto?.stock ?? '')
  const [imagenUrl, setImagenUrl] = useState(producto?.imagen_url || '')
  const [archivo, setArchivo] = useState(null)
  const [preview, setPreview] = useState(producto?.imagen_url || null)
  const [subiendo, setSubiendo] = useState(false)
  const [saving, setSaving] = useState(false)

  function onPickFile(e) {
    const file = e.target.files?.[0]
    if (!file) return
    setArchivo(file)
    setPreview(URL.createObjectURL(file))
  }

  async function submit(e) {
    e.preventDefault()
    setSaving(true)
    try {
      let urlFinal = imagenUrl
      if (archivo) {
        setSubiendo(true)
        urlFinal = await subirFotoProducto(negocio.id, archivo)
        setSubiendo(false)
      }
      const payload = esAdicion
        ? { nombre, categoria: 'Adicionales', precio: parseFloat(precio) || 0, desc: '', emoji: '➕', imagen_url: null, stock: null, es_adicion: true }
        : { nombre, categoria, precio: parseFloat(precio) || 0, desc, emoji, imagen_url: urlFinal || null, stock: stock === '' ? null : parseInt(stock, 10) }
      if (producto) await updateProducto(producto.id, payload)
      else await createProducto(negocio.id, { ...payload, disponible: true, adiciones: [] })
      onSaved()
    } finally {
      setSaving(false)
    }
  }

  if (esAdicion) {
    return (
      <Modal onClose={onClose}>
        <h2 className="font-serif text-xl font-semibold mb-1">{producto ? 'Editar adicional' : 'Nuevo adicional'}</h2>
        <p className="text-creamsoft text-[13px] mb-4">Va a quedar disponible para agregarse a cualquier producto del menú.</p>
        <form onSubmit={submit}>
          <Field label="Nombre"><Input required value={nombre} onChange={(e) => setNombre(e.target.value)} placeholder="Ej: Queso, Jamón, Huevo" /></Field>
          <Field label="Precio adicional (COP)"><Input required type="number" value={precio} onChange={(e) => setPrecio(e.target.value)} /></Field>
          <Btn variant="primary" className="w-full justify-center" disabled={saving}>
            {saving ? 'Guardando…' : producto ? 'Guardar cambios' : 'Crear adicional'}
          </Btn>
        </form>
      </Modal>
    )
  }

  return (
    <Modal onClose={onClose}>
      <h2 className="font-serif text-xl font-semibold mb-4">{producto ? 'Editar producto' : 'Nuevo producto'}</h2>
      <form onSubmit={submit}>
        <Field label="Foto del producto (opcional)">
          <div className="flex items-center gap-3">
            <div className="w-16 h-16 rounded border border-line overflow-hidden flex items-center justify-center text-2xl bg-paper shrink-0">
              {preview ? <img src={preview} alt="" className="w-full h-full object-cover" /> : emoji}
            </div>
            <label className="text-[12.5px] text-gold cursor-pointer hover:text-champagne">
              {preview ? 'Cambiar foto' : 'Subir foto'}
              <input type="file" accept="image/*" className="hidden" onChange={onPickFile} />
            </label>
          </div>
        </Field>
        <Field label="Nombre"><Input required value={nombre} onChange={(e) => setNombre(e.target.value)} /></Field>
        <div className="grid grid-cols-2 gap-3">
          <Field label="Categoría">
            <Select value={categoria} onChange={(e) => setCategoria(e.target.value)}>
              {categorias.map((c) => <option key={c.id}>{c.nombre}</option>)}
            </Select>
          </Field>
          <Field label="Precio (COP)"><Input required type="number" value={precio} onChange={(e) => setPrecio(e.target.value)} /></Field>
        </div>
        <Field label="Descripción"><Textarea rows={2} value={desc} onChange={(e) => setDesc(e.target.value)} /></Field>
        <Field label="Emoji / ícono (se usa si no hay foto)"><Input maxLength={2} value={emoji} onChange={(e) => setEmoji(e.target.value)} /></Field>
        <Field label="Stock (cantidad disponible — déjalo vacío para no controlar cantidad)">
          <Input type="number" min="0" placeholder="Sin límite" value={stock} onChange={(e) => setStock(e.target.value)} />
        </Field>
        <Btn variant="primary" className="w-full justify-center" disabled={saving}>
          {subiendo ? 'Subiendo foto…' : saving ? 'Guardando…' : producto ? 'Guardar cambios' : 'Crear producto'}
        </Btn>
      </form>
    </Modal>
  )
}

/* ---------------- Categorías ---------------- */
export function TabCategorias({ negocio, data, reload, notify }) {
  const [nombre, setNombre] = useState('')

  async function add() {
    if (!nombre.trim()) return
    await createCategoria(negocio.id, nombre.trim())
    setNombre('')
    notify('Categoría agregada')
    reload()
  }
  async function remove(cat) {
    if (data.productos.some((p) => p.categoria === cat.nombre)) {
      notify('No se puede eliminar: hay productos en esta categoría')
      return
    }
    await deleteCategoria(cat.id)
    reload()
  }

  return (
    <div>
      <SectionTitle title="Categorías" sub={`Organiza el catálogo de ${negocio.nombre}.`} />
      <Card className="p-5 mb-4">
        <div className="flex gap-3 items-end">
          <div className="flex-1"><Field label="Nueva categoría"><Input value={nombre} onChange={(e) => setNombre(e.target.value)} placeholder="Ej: Postres" /></Field></div>
          <Btn variant="mustard" onClick={add}>Agregar</Btn>
        </div>
      </Card>
      <div className="flex flex-wrap gap-2">
        {data.categorias.map((c) => (
          <span key={c.id} className="flex items-center gap-2 px-3 py-1.5 rounded-full border border-gold bg-gold/10 text-gold text-[12.5px] font-semibold">
            {c.nombre} <span className="opacity-60 font-mono">({data.productos.filter((p) => p.categoria === c.nombre).length})</span>
            <button onClick={() => remove(c)} className="text-wine font-bold">✕</button>
          </span>
        ))}
      </div>
    </div>
  )
}

/* ---------------- Inventario ---------------- */
export function TabInventario({ negocio, data, reload, notify }) {
  const [modal, setModal] = useState(false)
  const [ajuste, setAjuste] = useState(null)

  return (
    <div>
      <SectionTitle title="Inventario" sub="Existencias de ingredientes y materias primas."
        action={<Btn variant="primary" onClick={() => setModal(true)}>➕ Nuevo ingrediente</Btn>} />
      <Card className="p-5">
        <Table
          head={['Ingrediente', 'Existencias', 'Mínimo', 'Estado', '']}
          rows={data.ingredientes.map((i) => [
            <b>{i.nombre}</b>,
            <span className="font-mono">{i.stock} {i.unidad}</span>,
            <span className="font-mono">{i.minimo} {i.unidad}</span>,
            i.stock <= i.minimo ? <Pill tone="pausado">Bajo</Pill> : <Pill tone="listo">OK</Pill>,
            <Btn size="sm" variant="ghost" onClick={() => setAjuste(i)}>Ajustar</Btn>,
          ])}
        />
      </Card>
      {modal && (
        <IngredienteModal negocio={negocio} onClose={() => setModal(false)}
          onSaved={() => { setModal(false); notify('Ingrediente agregado'); reload() }} />
      )}
      {ajuste && (
        <AjusteModal ingrediente={ajuste} onClose={() => setAjuste(null)}
          onSaved={() => { setAjuste(null); notify('Existencias actualizadas'); reload() }} />
      )}
    </div>
  )
}
function IngredienteModal({ negocio, onClose, onSaved }) {
  const [nombre, setNombre] = useState('')
  const [unidad, setUnidad] = useState('kg')
  const [stock, setStock] = useState(0)
  const [minimo, setMinimo] = useState(1)
  async function submit(e) {
    e.preventDefault()
    await createIngrediente(negocio.id, { nombre, unidad: unidad.trim() || 'und', stock: parseFloat(stock) || 0, minimo: parseFloat(minimo) || 0 })
    onSaved()
  }
  return (
    <Modal onClose={onClose}>
      <h2 className="font-serif text-xl font-semibold mb-4">Nuevo ingrediente</h2>
      <form onSubmit={submit}>
        <Field label="Nombre"><Input required value={nombre} onChange={(e) => setNombre(e.target.value)} placeholder="Ej: Carne de res, Gaseosa 400ml, Pan de hamburguesa" /></Field>
        <div className="grid grid-cols-2 gap-3">
          <Field label="Unidad de medida">
            <Input list="unidades-sugeridas" required value={unidad} onChange={(e) => setUnidad(e.target.value)} placeholder="kg" />
            <datalist id="unidades-sugeridas">
              <option value="kg" /><option value="g" /><option value="lb" />
              <option value="l" /><option value="ml" /><option value="und" />
              <option value="paquete" /><option value="display" /><option value="caja" /><option value="docena" />
            </datalist>
          </Field>
          <Field label="Existencias iniciales"><Input required type="number" step="any" value={stock} onChange={(e) => setStock(e.target.value)} /></Field>
        </div>
        <p className="text-creamsoft text-[12px] -mt-2 mb-3.5">
          Usa la unidad en la que controlas ese producto: <b>kg</b> o <b>lb</b> para carnes que compras y pesas,
          <b> und</b> o <b>display</b> para bebidas y gaseosas (si las controlas por caja/display, pon ahí cuántos
          displays tienes), <b>paquete</b> para el pan, etc. Tú decides qué representa una unidad para cada producto.
        </p>
        <Field label="Nivel mínimo (alerta de reposición)"><Input required type="number" step="any" value={minimo} onChange={(e) => setMinimo(e.target.value)} /></Field>
        <Btn variant="primary" className="w-full justify-center">Guardar ingrediente</Btn>
      </form>
    </Modal>
  )
}
function AjusteModal({ ingrediente, onClose, onSaved }) {
  const [stock, setStock] = useState(ingrediente.stock)
  async function submit(e) {
    e.preventDefault()
    await setIngredienteStock(ingrediente.id, parseFloat(stock) || 0)
    onSaved()
  }
  return (
    <Modal onClose={onClose}>
      <h2 className="font-serif text-xl font-semibold mb-4">Ajustar existencias — {ingrediente.nombre}</h2>
      <form onSubmit={submit}>
        <Field label={`Nueva cantidad (${ingrediente.unidad})`}><Input required type="number" value={stock} onChange={(e) => setStock(e.target.value)} /></Field>
        <Btn variant="primary" className="w-full justify-center">Guardar</Btn>
      </form>
    </Modal>
  )
}

/* ---------------- Compras ---------------- */
export function TabCompras({ negocio, data, reload, notify }) {
  const [modal, setModal] = useState(false)
  return (
    <div>
      <SectionTitle title="Compras" sub="Cada compra aumenta el inventario y se registra como egreso."
        action={<Btn variant="primary" onClick={() => setModal(true)}>➕ Registrar compra</Btn>} />
      <Card className="p-5">
        {data.compras.length === 0 ? <Empty>Todavía no hay compras registradas.</Empty> : (
          <Table
            head={['Fecha', 'Ingrediente', 'Cantidad', 'Valor']}
            rows={data.compras.map((c) => [
              <span className="font-mono">{fmtDate(c.creado_en)}</span>,
              c.ingredientes?.nombre || '—',
              <span className="font-mono">{c.cantidad}</span>,
              <span className="font-mono">{fmt$(c.valor)}</span>,
            ])}
          />
        )}
      </Card>
      {modal && (
        <CompraModal negocio={negocio} ingredientes={data.ingredientes} onClose={() => setModal(false)}
          onSaved={() => { setModal(false); notify('Compra registrada — inventario actualizado'); reload() }} />
      )}
    </div>
  )
}
function CompraModal({ negocio, ingredientes, onClose, onSaved }) {
  const [ingId, setIngId] = useState(ingredientes[0]?.id || '')
  const [cantidad, setCantidad] = useState(1)
  const [valor, setValor] = useState('')
  const ing = ingredientes.find((i) => i.id === ingId)
  async function submit(e) {
    e.preventDefault()
    await registrarCompra(negocio.id, { ingredienteId: ingId, cantidad: parseFloat(cantidad) || 0, valor: parseFloat(valor) || 0 }, ing.stock)
    onSaved()
  }
  return (
    <Modal onClose={onClose}>
      <h2 className="font-serif text-xl font-semibold mb-1">Registrar compra</h2>
      <p className="text-creamsoft text-[13px] mb-4">Aumenta el inventario y se contabiliza como egreso.</p>
      <form onSubmit={submit}>
        <Field label="Ingrediente">
          <Select value={ingId} onChange={(e) => setIngId(e.target.value)}>
            {ingredientes.map((i) => <option key={i.id} value={i.id}>{i.nombre}</option>)}
          </Select>
        </Field>
        {ing && (
          <p className="text-creamsoft text-[12px] -mt-2 mb-3">
            Existencia actual: <b className="font-mono">{ing.stock} {ing.unidad}</b>
          </p>
        )}
        <div className="grid grid-cols-2 gap-3">
          <Field label={`Cantidad comprada${ing ? ` (${ing.unidad})` : ''}`}>
            <Input required type="number" step="any" value={cantidad} onChange={(e) => setCantidad(e.target.value)} />
          </Field>
          <Field label="Valor total pagado (COP)"><Input required type="number" value={valor} onChange={(e) => setValor(e.target.value)} /></Field>
        </div>
        <p className="text-creamsoft text-[12px] -mt-2 mb-3.5">
          La cantidad va en la misma unidad del ingrediente (arriba). Si compraste 5 kg de carne, pon 5; si compraste
          2 displays de gaseosa y ese ingrediente se maneja por display, pon 2.
        </p>
        <Btn variant="primary" className="w-full justify-center">Registrar compra</Btn>
      </form>
    </Modal>
  )
}

/* ---------------- Pedidos (kanban) ----------------
   `simple`: usado desde la vista de Empleado — en vez de las 4 columnas y
   4 pasos (Pendiente → En preparación → Listo → Entregado), el empleado
   solo ve 2 acciones por pedido: "Pedido aceptado" (para que el cliente
   sepa que ya lo vieron) y "Entregado". El estado internamente sigue
   usando los mismos 4 valores (para no romper nada más de la app), solo
   se saltan pasos al avanzar. En ambos modos, mientras el pedido no esté
   Entregado ni Cancelado, se puede Editar o Cancelar. */
export function TabPedidos({ data, reload, notify, simple, onAvanzar }) {
  const [editando, setEditando] = useState(null) // pedido que se está editando
  const [cancelando, setCancelando] = useState(null) // pedido que se va a cancelar
  const productos = data.productos || []

  async function advance(p) {
    const i = ESTADOS.indexOf(p.estado)
    await avanzarEstadoPedido(p.id, ESTADOS[i + 1])
    notify(`Pedido #${p.numero} → ${ESTADOS[i + 1]}`)
    if (onAvanzar) onAvanzar(p.id)
    reload()
  }
  async function aceptar(p) {
    await avanzarEstadoPedido(p.id, 'En preparación')
    notify(`Pedido #${p.numero} aceptado`)
    if (onAvanzar) onAvanzar(p.id)
    reload()
  }
  async function entregar(p) {
    await avanzarEstadoPedido(p.id, 'Entregado')
    notify(`Pedido #${p.numero} entregado`)
    if (onAvanzar) onAvanzar(p.id)
    reload()
  }

  const acciones = (p) => (
    <div className="flex gap-1.5 mt-1.5">
      <button onClick={() => setEditando(p)} className="text-[11px] text-creamsoft hover:text-gold">✏️ Editar</button>
      <button onClick={() => setCancelando(p)} className="text-[11px] text-creamsoft hover:text-wine">❌ Cancelar</button>
    </div>
  )

  const modales = (
    <>
      {editando && (
        <EditarPedidoModal pedido={editando} productos={productos} onClose={() => setEditando(null)}
          guardar={(p, prods, items) => actualizarPedido(p, prods, items)}
          onSaved={() => { const id = editando.id; setEditando(null); notify(`Pedido #${editando.numero} actualizado`); if (onAvanzar) onAvanzar(id); reload() }} />
      )}
      {cancelando && (
        <ConfirmCancelModal pedido={cancelando} onClose={() => setCancelando(null)}
          cancelar={async () => {
            const id = cancelando.id
            await cancelarPedido(cancelando, productos, simple ? 'Empleado' : 'Administrador')
            setCancelando(null)
            notify(`Pedido #${cancelando.numero} cancelado`)
            if (onAvanzar) onAvanzar(id)
            reload()
          }} />
      )}
    </>
  )

  if (simple) {
    const porAtender = data.pedidos.filter((p) => p.estado !== 'Entregado' && p.estado !== 'Cancelado')
    const entregados = data.pedidos.filter((p) => p.estado === 'Entregado')
    const columnas = [['Por atender', porAtender], ['Entregados', entregados]]
    return (
      <div>
        <SectionTitle title="Pedidos" sub="Toca una vez para aceptar el pedido y otra vez cuando lo entregues. Puedes editar o cancelar mientras no esté entregado." />
        <div className="grid grid-cols-2 gap-3.5 max-[820px]:grid-cols-1">
          {columnas.map(([titulo, items]) => (
            <div key={titulo} className="bg-paper2 border border-line rounded p-3 min-h-[120px]">
              <h4 className="text-[11px] uppercase tracking-wide text-creamsoft font-semibold mb-3 flex justify-between">
                {titulo} <span className="font-mono">{items.length}</span>
              </h4>
              {items.length === 0 ? (
                <p className="text-[12px] text-creamsoft px-1.5">Sin pedidos</p>
              ) : items.map((p) => (
                <div key={p.id} className="bg-paper rounded-sm p-3 mb-2 border border-line border-l-2 border-l-gold text-[12px]">
                  <b className="font-mono text-gold">#{p.numero}</b> · {p.cliente}
                  <div className="my-1.5 text-creamsoft">{p.pedido_items.map((it) => `${it.cantidad}× ${it.nombre}`).join(', ')}</div>
                  <div className="flex justify-between items-center mt-2">
                    <span className="font-mono">{fmt$(p.total)}</span>
                    {p.estado === 'Pendiente' && <Btn size="sm" variant="avocado" onClick={() => aceptar(p)}>✅ Pedido aceptado</Btn>}
                    {(p.estado === 'En preparación' || p.estado === 'Listo') && <Btn size="sm" variant="avocado" onClick={() => entregar(p)}>📦 Entregado</Btn>}
                    {p.estado === 'Entregado' && <span className="text-[11px]">✅</span>}
                  </div>
                  {p.estado !== 'Entregado' && acciones(p)}
                </div>
              ))}
            </div>
          ))}
        </div>
        {modales}
      </div>
    )
  }

  const cancelados = data.pedidos.filter((p) => p.estado === 'Cancelado')

  return (
    <div>
      <SectionTitle title="Pedidos" sub="Gestión en tiempo real — pensada para tablet o computador en cocina." />
      <div className="grid grid-cols-4 gap-3.5 max-[820px]:grid-cols-2">
        {ESTADOS.map((est) => {
          const items = data.pedidos.filter((p) => p.estado === est)
          return (
            <div key={est} className="bg-paper2 border border-line rounded p-3 min-h-[120px]">
              <h4 className="text-[11px] uppercase tracking-wide text-creamsoft font-semibold mb-3 flex justify-between">
                {est} <span className="font-mono">{items.length}</span>
              </h4>
              {items.length === 0 ? (
                <p className="text-[12px] text-creamsoft px-1.5">Sin pedidos</p>
              ) : items.map((p) => (
                <div key={p.id} className="bg-paper rounded-sm p-3 mb-2 border border-line border-l-2 border-l-gold text-[12px]">
                  <b className="font-mono text-gold">#{p.numero}</b> · {p.cliente}
                  <div className="my-1.5 text-creamsoft">{p.pedido_items.map((it) => `${it.cantidad}× ${it.nombre}`).join(', ')}</div>
                  <div className="flex justify-between items-center mt-2">
                    <span className="font-mono">{fmt$(p.total)}</span>
                    {est !== 'Entregado'
                      ? <Btn size="sm" variant="avocado" onClick={() => advance(p)}>Pasar a {ESTADOS[ESTADOS.indexOf(est) + 1]}</Btn>
                      : <span className="text-[11px]">✅</span>}
                  </div>
                  {est !== 'Entregado' && acciones(p)}
                </div>
              ))}
            </div>
          )
        })}
      </div>

      <div className="mt-6">
        <h4 className="text-[11px] uppercase tracking-wide text-creamsoft font-semibold mb-3 flex items-center gap-2">
          Cancelados <span className="font-mono">{cancelados.length}</span>
        </h4>
        {cancelados.length === 0 ? (
          <p className="text-[12px] text-creamsoft">Ningún pedido cancelado.</p>
        ) : (
          <Table
            head={['Pedido', 'Cliente', 'Total', 'Cancelado el', 'Por']}
            rows={cancelados.map((p) => [
              <span className="font-mono">#{p.numero}</span>,
              p.cliente,
              <span className="font-mono">{fmt$(p.total)}</span>,
              p.cancelado_en ? fmtDate(p.cancelado_en) : '—',
              p.cancelado_por || '—',
            ])}
          />
        )}
      </div>
      {modales}
    </div>
  )
}

/* ---------------- Ventas ---------------- */
export function TabVentas({ data }) {
  const [detalle, setDetalle] = useState(null) // venta abierta para ver su detalle
  const [rango, setRango] = useState('mes') // 'mes' | 'historico' — para el resumen por producto
  const total = data.ventas.reduce((a, v) => a + v.total, 0)
  const ventasMes = data.ventas.filter((v) => sameMonth(v.creado_en))
  const mes = ventasMes.reduce((a, v) => a + v.total, 0)
  const prom = data.ventas.length ? total / data.ventas.length : 0

  const resumenProductos = resumirProductosVendidos(rango === 'mes' ? ventasMes : data.ventas)

  return (
    <div>
      <SectionTitle title="Ventas" sub="Cada pedido confirmado genera su registro de venta." />
      <div className="grid grid-cols-[repeat(auto-fit,minmax(180px,1fr))] gap-3.5 mb-6">
        <StatCard label="Ventas del mes" value={fmt$(mes)} tone="gold" />
        <StatCard label="Histórico total" value={fmt$(total)} />
        <StatCard label="Pedidos" value={data.ventas.length} tone="champagne" />
        <StatCard label="Ticket promedio" value={fmt$(prom)} />
      </div>
      <Card className="p-5 mb-6">
        {data.ventas.length === 0 ? <Empty icon="💵">Aún no hay ventas registradas.</Empty> : (
          <Table head={['Fecha', 'Pedido', 'Productos', 'Total', '']} rows={data.ventas.map((v) => {
            const items = v.pedidos?.pedido_items || []
            const resumen = items.length
              ? items.map((it) => `${it.cantidad}× ${it.nombre}`).join(', ')
              : '—'
            return [
              <span className="font-mono">{fmtDate(v.creado_en)}</span>,
              v.pedidos?.numero ? `#${v.pedidos.numero}` : '—',
              <span className="text-[12.5px] text-creamsoft">{resumen}</span>,
              <span className="font-mono">{fmt$(v.total)}</span>,
              items.length > 0 && (
                <button onClick={() => setDetalle(v)} className="text-[12px] font-semibold text-gold hover:text-golddark whitespace-nowrap">
                  Ver detalle →
                </button>
              ),
            ]
          })} />
        )}
      </Card>

      <div className="flex items-center justify-between flex-wrap gap-3 mb-3">
        <h3 className="font-serif text-lg font-semibold">Productos vendidos</h3>
        <div className="flex gap-1 bg-paper2 border border-line rounded-full p-1">
          {[['mes', 'Este mes'], ['historico', 'Todo el histórico']].map(([k, label]) => (
            <button key={k} onClick={() => setRango(k)}
              className={`px-3.5 py-1.5 rounded-full text-[12px] font-semibold ${rango === k ? 'bg-gold text-paper' : 'text-creamsoft hover:text-cream'}`}>
              {label}
            </button>
          ))}
        </div>
      </div>
      <p className="text-creamsoft text-[12.5px] mb-3">
        Cuánto se vendió de cada producto — sirve para saber qué reponer en Inventario/Compras.
      </p>
      <Card className="p-5">
        {resumenProductos.length === 0 ? <Empty icon="📦">No hay productos vendidos en este rango.</Empty> : (
          <Table
            head={['Producto', 'Cantidad vendida', 'Valor unitario prom.', 'Total vendido']}
            rows={resumenProductos.map((p) => [
              p.nombre,
              <span className="font-mono">{p.cantidad}</span>,
              <span className="font-mono">{fmt$(p.total / p.cantidad)}</span>,
              <span className="font-mono">{fmt$(p.total)}</span>,
            ])}
          />
        )}
      </Card>

      {detalle && <VentaDetalleModal venta={detalle} onClose={() => setDetalle(null)} />}
    </div>
  )
}

// Suma cantidad y valor total por nombre de producto, a partir de las líneas
// (pedido_items) de un conjunto de ventas — para la tabla "Productos vendidos".
function resumirProductosVendidos(ventas) {
  const map = {}
  ventas.forEach((v) => {
    const items = v.pedidos?.pedido_items || []
    items.forEach((it) => {
      if (!map[it.nombre]) map[it.nombre] = { nombre: it.nombre, cantidad: 0, total: 0 }
      map[it.nombre].cantidad += it.cantidad
      map[it.nombre].total += it.subtotal
    })
  })
  return Object.values(map).sort((a, b) => b.total - a.total)
}

/* ---------------- Trabajadores ---------------- */
export function TabTrabajadores({ negocio, data, reload, notify }) {
  const [modal, setModal] = useState(null) // null | 'new' | trabajador (para editar)
  const [pagoFor, setPagoFor] = useState(null)

  return (
    <div>
      <SectionTitle title="Trabajadores" sub={`Equipo de ${negocio.nombre}.`}
        action={<Btn variant="primary" onClick={() => setModal('new')}>➕ Nuevo trabajador</Btn>} />
      <div className="grid grid-cols-[repeat(auto-fill,minmax(240px,1fr))] gap-4">
        {data.trabajadores.map((w) => {
          const ultimoPago = w.pagos.length ? w.pagos[w.pagos.length - 1] : null
          return (
            <Card key={w.id} className="p-5">
              <Pill tone={w.estado === 'Activo' ? 'activo' : 'pausado'}>{w.estado}</Pill>
              <h4 className="font-serif font-semibold text-base mt-1.5 mb-0.5">{w.nombre}</h4>
              <p className="text-creamsoft text-[13px] mb-2">{w.cargo}</p>
              <p className="font-mono font-bold mb-3">{fmt$(w.pago)}/mes</p>
              <div className="flex gap-1.5 flex-wrap">
                <Btn size="sm" variant="ghost" onClick={() => setModal(w)}>✏️ Editar salario</Btn>
                <Btn size="sm" variant="mustard" onClick={() => setPagoFor(w)}>Registrar pago</Btn>
                <Btn size="sm" variant="ghost" onClick={async () => { await toggleTrabajadorEstado(w); reload() }}>
                  {w.estado === 'Activo' ? 'Desactivar' : 'Activar'}
                </Btn>
              </div>
              {ultimoPago && <p className="mt-2.5 text-[11.5px] text-creamsoft">Último pago: {fmtDate(ultimoPago.creado_en)} · {fmt$(ultimoPago.valor)}</p>}
            </Card>
          )
        })}
      </div>
      {modal && (
        <TrabajadorModal
          negocio={negocio}
          trabajador={modal === 'new' ? null : modal}
          onClose={() => setModal(null)}
          onSaved={() => { setModal(null); notify(modal === 'new' ? 'Trabajador agregado' : 'Salario actualizado'); reload() }}
        />
      )}
      {pagoFor && (
        <PagoModal negocio={negocio} trabajador={pagoFor} onClose={() => setPagoFor(null)}
          onSaved={() => { setPagoFor(null); notify(`Pago registrado a ${pagoFor.nombre}`); reload() }} />
      )}
    </div>
  )
}
function TrabajadorModal({ negocio, trabajador, onClose, onSaved }) {
  const [nombre, setNombre] = useState(trabajador?.nombre || '')
  const [cargo, setCargo] = useState(trabajador?.cargo || '')
  const [pago, setPago] = useState(trabajador?.pago ?? '')
  const [guardando, setGuardando] = useState(false)
  async function submit(e) {
    e.preventDefault()
    setGuardando(true)
    try {
      const payload = { nombre, cargo, pago: parseFloat(pago) || 0 }
      if (trabajador) await updateTrabajador(trabajador.id, payload)
      else await createTrabajador(negocio.id, payload)
      onSaved()
    } finally {
      setGuardando(false)
    }
  }
  return (
    <Modal onClose={onClose}>
      <h2 className="font-serif text-xl font-semibold mb-4">{trabajador ? `Editar a ${trabajador.nombre}` : 'Nuevo trabajador'}</h2>
      <form onSubmit={submit}>
        <Field label="Nombre"><Input required value={nombre} onChange={(e) => setNombre(e.target.value)} /></Field>
        <div className="grid grid-cols-2 gap-3">
          <Field label="Cargo"><Input required value={cargo} onChange={(e) => setCargo(e.target.value)} /></Field>
          <Field label="Pago mensual (COP)"><Input required type="number" value={pago} onChange={(e) => setPago(e.target.value)} /></Field>
        </div>
        <Btn variant="primary" className="w-full justify-center" disabled={guardando}>
          {guardando ? 'Guardando…' : trabajador ? 'Guardar cambios' : 'Agregar trabajador'}
        </Btn>
      </form>
    </Modal>
  )
}
function PagoModal({ negocio, trabajador, onClose, onSaved }) {
  const [periodo, setPeriodo] = useState(new Date().toLocaleDateString('es-CO', { month: 'long', year: 'numeric' }))
  const [valor, setValor] = useState(trabajador.pago)
  async function submit(e) {
    e.preventDefault()
    await registrarPago(trabajador.id, negocio.id, { periodo, valor: parseFloat(valor) || 0 })
    onSaved()
  }
  return (
    <Modal onClose={onClose}>
      <h2 className="font-serif text-xl font-semibold mb-4">Registrar pago — {trabajador.nombre}</h2>
      <form onSubmit={submit}>
        <Field label="Periodo"><Input required value={periodo} onChange={(e) => setPeriodo(e.target.value)} /></Field>
        <Field label="Valor (COP)"><Input required type="number" value={valor} onChange={(e) => setValor(e.target.value)} /></Field>
        <Btn variant="primary" className="w-full justify-center">Confirmar pago</Btn>
      </form>
    </Modal>
  )
}

/* ---------------- Finanzas ---------------- */
export function TabFinanzas({ negocio, data, reload, notify, onNegocioUpdated }) {
  const [modal, setModal] = useState(null) // 'capital' | 'ingreso' | 'egreso'
  const capitalInicial = negocio.capital_inicial || 0

  const ingresosVentas = data.ventas.filter((v) => sameMonth(v.creado_en)).reduce((a, v) => a + v.total, 0)
  const ingresosExtra = data.ingresos.filter((i) => sameMonth(i.creado_en)).reduce((a, i) => a + i.valor, 0)
  const egresosCompras = data.compras.filter((c) => sameMonth(c.creado_en)).reduce((a, c) => a + c.valor, 0)
  const egresosPagos = data.trabajadores.flatMap((w) => w.pagos).filter((p) => sameMonth(p.creado_en)).reduce((a, p) => a + p.valor, 0)
  const egresosOtros = data.egresos.filter((e) => sameMonth(e.creado_en)).reduce((a, e) => a + e.valor, 0)

  // Saldo real del negocio: base inicial + TODO lo que ha entrado y salido
  // desde siempre (no solo este mes). Esto es lo que responde "¿cuánta plata
  // tiene el negocio hoy, contando con lo que arrancó?".
  const ventasTotal = data.ventas.reduce((a, v) => a + v.total, 0)
  const ingresosTotal = data.ingresos.reduce((a, i) => a + i.valor, 0)
  const comprasTotal = data.compras.reduce((a, c) => a + c.valor, 0)
  const pagosTotal = data.trabajadores.flatMap((w) => w.pagos).reduce((a, p) => a + p.valor, 0)
  const egresosOtrosTotal = data.egresos.reduce((a, e) => a + e.valor, 0)
  const saldoActual = capitalInicial + ventasTotal + ingresosTotal - comprasTotal - pagosTotal - egresosOtrosTotal

  return (
    <div>
      <SectionTitle title="Ingresos y egresos" sub="Compras, pagos y ventas se reflejan aquí automáticamente."
        action={<div className="flex gap-2">
          <Btn size="sm" variant="ghost" onClick={() => setModal('capital')}>💰 Base inicial</Btn>
          <Btn size="sm" variant="mustard" onClick={() => setModal('ingreso')}>➕ Ingreso</Btn>
          <Btn size="sm" variant="danger" onClick={() => setModal('egreso')}>➕ Egreso</Btn>
        </div>} />

      <div className="grid grid-cols-[repeat(auto-fit,minmax(180px,1fr))] gap-3.5 mb-3.5">
        <StatCard label="Base inicial" value={fmt$(capitalInicial)} />
        <StatCard label="Saldo actual del negocio" value={fmt$(saldoActual)} tone={saldoActual >= 0 ? 'sage' : 'wine'} />
      </div>

      <p className="text-creamsoft text-[11.5px] mb-5">Este mes ↓</p>
      <div className="grid grid-cols-[repeat(auto-fit,minmax(180px,1fr))] gap-3.5 mb-6">
        <StatCard label="Ingresos (ventas + otros)" value={fmt$(ingresosVentas + ingresosExtra)} tone="sage" />
        <StatCard label="Egresos (compras)" value={fmt$(egresosCompras)} tone="gold" />
        <StatCard label="Egresos (personal)" value={fmt$(egresosPagos)} tone="champagne" />
        <StatCard label="Otros egresos" value={fmt$(egresosOtros)} />
      </div>

      <div className="grid grid-cols-[1.3fr_.9fr] gap-4 max-[820px]:grid-cols-1 mb-6">
        <Card className="p-5">
          <h3 className="font-serif text-lg font-semibold mb-3">Ingresos extra registrados</h3>
          {data.ingresos.length === 0 ? <p className="text-creamsoft text-[13px]">Sin ingresos manuales aún.</p> :
            data.ingresos.map((i) => (
              <div key={i.id} className="flex justify-between border-b border-line py-2.5 text-[13px]">
                <span>{i.concepto}<div className="text-creamsoft text-[11.5px]">{fmtDate(i.creado_en)}</div></span>
                <b className="font-mono">{fmt$(i.valor)}</b>
              </div>
            ))}
        </Card>
        <Card className="p-5">
          <h3 className="font-serif text-lg font-semibold mb-3">Otros gastos</h3>
          {data.egresos.length === 0 ? <p className="text-creamsoft text-[13px]">Sin otros gastos aún.</p> :
            data.egresos.map((e) => (
              <div key={e.id} className="flex justify-between border-b border-line py-2.5 text-[13px]">
                <span>{e.concepto}<div className="text-creamsoft text-[11.5px]">{fmtDate(e.creado_en)}</div></span>
                <b className="font-mono">{fmt$(e.valor)}</b>
              </div>
            ))}
        </Card>
      </div>

      <ReportePeriodo negocio={negocio} data={data} />

      {modal === 'capital' && (
        <CapitalModal negocio={negocio} onClose={() => setModal(null)}
          onSaved={async (nuevoValor) => {
            setModal(null)
            notify('Base inicial guardada')
            if (onNegocioUpdated) await onNegocioUpdated({ capital_inicial: nuevoValor })
          }} />
      )}
      {(modal === 'ingreso' || modal === 'egreso') && (
        <MovimientoModal negocio={negocio} tipo={modal} onClose={() => setModal(null)}
          onSaved={() => { setModal(null); notify('Movimiento registrado'); reload() }} />
      )}
    </div>
  )
}

function CapitalModal({ negocio, onClose, onSaved }) {
  const [valor, setValor] = useState(negocio.capital_inicial || 0)
  const [guardando, setGuardando] = useState(false)
  async function submit(e) {
    e.preventDefault()
    setGuardando(true)
    try {
      const nuevoValor = parseFloat(valor) || 0
      await updateCapitalInicial(negocio.id, nuevoValor)
      onSaved(nuevoValor)
    } finally {
      setGuardando(false)
    }
  }
  return (
    <Modal onClose={onClose}>
      <h2 className="font-serif text-xl font-semibold mb-2">Base inicial del negocio</h2>
      <p className="text-creamsoft text-[13px] mb-4">
        Es el dinero con el que arrancó el negocio, antes de empezar a registrar ventas, compras y gastos en Fogón.
        Se suma a todos los movimientos para calcular el saldo actual real.
      </p>
      <form onSubmit={submit}>
        <Field label="Base inicial (COP)">
          <Input required type="number" value={valor} onChange={(e) => setValor(e.target.value)} />
        </Field>
        <Btn variant="primary" className="w-full justify-center" disabled={guardando}>
          {guardando ? 'Guardando…' : 'Guardar base inicial'}
        </Btn>
      </form>
    </Modal>
  )
}

function MovimientoModal({ negocio, tipo, onClose, onSaved }) {
  const [concepto, setConcepto] = useState('')
  const [valor, setValor] = useState('')
  async function submit(e) {
    e.preventDefault()
    const payload = { concepto, valor: parseFloat(valor) || 0 }
    if (tipo === 'ingreso') await createIngreso(negocio.id, payload)
    else await createEgreso(negocio.id, payload)
    onSaved()
  }
  return (
    <Modal onClose={onClose}>
      <h2 className="font-serif text-xl font-semibold mb-4">{tipo === 'ingreso' ? 'Nuevo ingreso' : 'Nuevo egreso'}</h2>
      <form onSubmit={submit}>
        <Field label="Concepto"><Input required value={concepto} onChange={(e) => setConcepto(e.target.value)} placeholder={tipo === 'ingreso' ? 'Ej: venta de excedente' : 'Ej: transporte, servicios'} /></Field>
        <Field label="Valor (COP)"><Input required type="number" value={valor} onChange={(e) => setValor(e.target.value)} /></Field>
        <Btn variant="primary" className="w-full justify-center">Guardar</Btn>
      </form>
    </Modal>
  )
}

/* ---------------- Reporte por día / mes (para imprimir o guardar como PDF) ----------------
   El usuario escoge un día o un mes, ve el resumen de ese periodo y le da "Imprimir".
   El diálogo de impresión del navegador siempre trae la opción "Guardar como PDF",
   así que con este mismo botón se cubre imprimir en papel o generar el PDF para el banco. */
function ReportePeriodo({ negocio, data }) {
  const [tipoRango, setTipoRango] = useState('mes') // 'dia' | 'mes'
  const [fecha, setFecha] = useState(todayStr())
  const [mes, setMes] = useState(monthStr(new Date()))

  const enRango = (d) => (tipoRango === 'dia' ? dateStr(d) === fecha : monthStr(d) === mes)

  const ventas = data.ventas.filter((v) => enRango(v.creado_en))
  const ingresos = data.ingresos.filter((i) => enRango(i.creado_en))
  const compras = data.compras.filter((c) => enRango(c.creado_en))
  const pagos = data.trabajadores.flatMap((w) => w.pagos.map((p) => ({ ...p, trabajador: w.nombre }))).filter((p) => enRango(p.creado_en))
  const egresos = data.egresos.filter((e) => enRango(e.creado_en))

  const totalVentas = ventas.reduce((a, v) => a + v.total, 0)
  const totalIngresos = ingresos.reduce((a, i) => a + i.valor, 0)
  const totalCompras = compras.reduce((a, c) => a + c.valor, 0)
  const totalPagos = pagos.reduce((a, p) => a + p.valor, 0)
  const totalEgresos = egresos.reduce((a, e) => a + e.valor, 0)
  const resultado = (totalVentas + totalIngresos) - (totalCompras + totalPagos + totalEgresos)

  const movimientos = [
    ...ventas.map((v) => ({ fecha: v.creado_en, tipo: 'Venta', concepto: 'Pedido de clientes', valor: v.total, signo: 1 })),
    ...ingresos.map((i) => ({ fecha: i.creado_en, tipo: 'Ingreso', concepto: i.concepto, valor: i.valor, signo: 1 })),
    ...compras.map((c) => ({ fecha: c.creado_en, tipo: 'Compra', concepto: c.ingredientes?.nombre || 'Insumo', valor: c.valor, signo: -1 })),
    ...pagos.map((p) => ({ fecha: p.creado_en, tipo: 'Pago personal', concepto: p.trabajador, valor: p.valor, signo: -1 })),
    ...egresos.map((e) => ({ fecha: e.creado_en, tipo: 'Egreso', concepto: e.concepto, valor: e.valor, signo: -1 })),
  ].sort((a, b) => new Date(a.fecha) - new Date(b.fecha))

  const etiquetaPeriodo = tipoRango === 'dia' ? fmtDateLong(fecha + 'T12:00:00') : fmtMonthLabel(mes)

  return (
    <Card className="p-5">
      <div className="flex items-center justify-between flex-wrap gap-3 mb-4 no-print">
        <div>
          <h3 className="font-serif text-lg font-semibold">Reporte por día o mes</h3>
          <p className="text-creamsoft text-[12.5px]">Para llevar al banco o para tu control — imprime o guarda como PDF.</p>
        </div>
        <div className="flex items-center gap-2">
          <Select value={tipoRango} onChange={(e) => setTipoRango(e.target.value)} className="!w-auto">
            <option value="dia">Por día</option>
            <option value="mes">Por mes</option>
          </Select>
          {tipoRango === 'dia' ? (
            <Input type="date" value={fecha} onChange={(e) => setFecha(e.target.value)} className="!w-auto" />
          ) : (
            <Input type="month" value={mes} onChange={(e) => setMes(e.target.value)} className="!w-auto" />
          )}
          <Btn size="sm" variant="primary" onClick={() => window.print()}>🖨️ Imprimir / PDF</Btn>
        </div>
      </div>

      <div id="finanzas-print-area">
        <div className="mb-4 hidden print:block">
          <h2 className="font-serif text-xl font-semibold">{negocio.nombre}</h2>
          <p className="text-[13px]">Reporte de ingresos y egresos — {etiquetaPeriodo}</p>
          <p className="text-[11px]">Generado el {fmtDateLong(new Date())}</p>
        </div>

        <p className="text-creamsoft text-[12px] mb-3 print:hidden">Periodo: <b className="text-cream">{etiquetaPeriodo}</b></p>

        <div className="grid grid-cols-[repeat(auto-fit,minmax(150px,1fr))] gap-3 mb-5">
          <StatCard label="Ventas" value={fmt$(totalVentas)} tone="sage" />
          <StatCard label="Otros ingresos" value={fmt$(totalIngresos)} tone="sage" />
          <StatCard label="Compras" value={fmt$(totalCompras)} tone="gold" />
          <StatCard label="Pagos personal" value={fmt$(totalPagos)} tone="champagne" />
          <StatCard label="Otros egresos" value={fmt$(totalEgresos)} />
          <StatCard label="Resultado del periodo" value={fmt$(resultado)} tone={resultado >= 0 ? 'sage' : 'wine'} />
        </div>

        {movimientos.length === 0 ? (
          <Empty>No hay movimientos registrados en este periodo.</Empty>
        ) : (
          <Table
            head={['Fecha', 'Tipo', 'Concepto', 'Valor']}
            rows={movimientos.map((m) => [
              <span className="font-mono">{fmtDate(m.fecha)}</span>,
              m.tipo,
              m.concepto,
              <span className="font-mono">{m.signo > 0 ? '+' : '−'} {fmt$(m.valor)}</span>,
            ])}
          />
        )}
      </div>
    </Card>
  )
}

/* ---------------- Estadísticas ---------------- */
export function TabEstadisticas({ negocio, data }) {
  const conteo = {}
  data.pedidos.forEach((p) => p.pedido_items.forEach((it) => { conteo[it.nombre] = (conteo[it.nombre] || 0) + it.cantidad }))
  const ranking = Object.entries(conteo).sort((a, b) => b[1] - a[1])
  const max = ranking.length ? ranking[0][1] : 1
  const agotados = data.productos.filter((p) => !p.disponible).length

  return (
    <div>
      <SectionTitle title="Estadísticas" sub={`Lo que más se mueve en ${negocio.nombre}.`} />
      <div className="grid grid-cols-[1.3fr_.9fr] gap-4 max-[820px]:grid-cols-1">
        <Card className="p-5">
          <h3 className="font-serif text-lg font-semibold mb-3">Productos más vendidos</h3>
          {ranking.length === 0 ? <Empty icon="📉">Aún no hay ventas para graficar.</Empty> : (
            ranking.slice(0, 8).map(([nom, c]) => (
              <div key={nom} className="flex items-center gap-2.5 mb-2.5 text-[12.5px]">
                <span className="w-[150px] font-semibold text-creamsoft">{nom}</span>
                <div className="flex-1 bg-paper border border-line rounded-full h-2 overflow-hidden">
                  <div className="h-full bg-gold rounded-full" style={{ width: `${(c / max) * 100}%` }} />
                </div>
                <span className="w-[60px] text-right font-mono text-creamsoft">{c} und</span>
              </div>
            ))
          )}
        </Card>
        <Card className="p-5">
          <h3 className="font-serif text-lg font-semibold mb-3">Panorama general</h3>
          {[
            ['Productos activos', data.productos.length - agotados],
            ['Productos agotados', agotados],
            ['Ingredientes con bajo stock', data.ingredientes.filter((i) => i.stock <= i.minimo).length],
            ['Trabajadores activos', data.trabajadores.filter((w) => w.estado === 'Activo').length],
            ['Pedidos totales', data.pedidos.length],
            ['Total histórico vendido', fmt$(data.ventas.reduce((a, v) => a + v.total, 0))],
          ].map(([label, val], i) => (
            <div key={i} className="flex justify-between border-b border-line py-2.5 text-[13px] last:border-none">
              <span>{label}</span><b className="font-mono">{val}</b>
            </div>
          ))}
        </Card>
      </div>
    </div>
  )
}

/* ---------------- shared bits ---------------- */
function SectionTitle({ title, sub, action }) {
  return (
    <div className="flex items-center justify-between flex-wrap gap-2.5 mb-4">
      <div>
        <h2 className="font-serif text-xl font-semibold">{title}</h2>
        {sub && <p className="text-creamsoft text-[13px] mt-0.5">{sub}</p>}
      </div>
      {action}
    </div>
  )
}
function Table({ head, rows }) {
  return (
    <table className="w-full border-collapse text-[13px]">
      <thead>
        <tr>{head.map((h, i) => <th key={i} className="text-left py-2.5 px-2.5 text-[10.5px] uppercase tracking-wide text-creamsoft border-b border-line font-semibold">{h}</th>)}</tr>
      </thead>
      <tbody>
        {rows.map((r, i) => (
          <tr key={i} className="hover:bg-gold/5">
            {r.map((c, j) => <td key={j} className="py-2.5 px-2.5 border-b border-line">{c}</td>)}
          </tr>
        ))}
      </tbody>
    </table>
  )
}
