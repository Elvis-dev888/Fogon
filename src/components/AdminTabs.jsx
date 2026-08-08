import { useState } from 'react'
import { Btn, Card, StatCard, Pill, Modal, Field, Input, Select, Textarea, Empty } from './ui'
import { fmt$, fmtDate, sameMonth, ESTADOS, thumbFor } from '../lib/helpers'
import {
  createCategoria, deleteCategoria, createProducto, updateProducto, deleteProducto,
  createIngrediente, setIngredienteStock, registrarCompra, avanzarEstadoPedido,
  createTrabajador, toggleTrabajadorEstado, registrarPago, createIngreso, createEgreso,
} from '../lib/api'

const estadoTone = (e) => (e === 'Pendiente' ? 'default' : e === 'En preparación' ? 'preparacion' : e === 'Listo' ? 'listo' : 'entregado')

/* ---------------- Dashboard ---------------- */
export function TabDashboard({ negocio, data }) {
  const ventasMes = data.ventas.filter((v) => sameMonth(v.creado_en)).reduce((a, v) => a + v.total, 0)
  const comprasMes = data.compras.filter((c) => sameMonth(c.creado_en)).reduce((a, c) => a + c.valor, 0)
  const pagosMes = data.trabajadores.flatMap((w) => w.pagos).filter((p) => sameMonth(p.creado_en)).reduce((a, p) => a + p.valor, 0)
  const otrosMes = data.egresos.filter((e) => sameMonth(e.creado_en)).reduce((a, e) => a + e.valor, 0)
  const resultado = ventasMes - (comprasMes + pagosMes + otrosMes)
  const pendientes = data.pedidos.filter((p) => p.estado !== 'Entregado').length
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
  const [modal, setModal] = useState(null) // null | 'new' | producto object

  return (
    <div>
      <SectionTitle title="Productos" sub={`Catálogo configurable de ${negocio.nombre} — ${data.productos.length} productos.`}
        action={<Btn variant="primary" onClick={() => setModal('new')}>➕ Nuevo producto</Btn>} />
      <div className="grid grid-cols-[repeat(auto-fill,minmax(240px,1fr))] gap-4">
        {data.productos.map((p) => (
          <ProductoCard key={p.id} p={p}
            onToggle={async () => { await updateProducto(p.id, { disponible: !p.disponible }); notify(`${p.nombre} ${p.disponible ? 'marcado como agotado' : 'disponible de nuevo'}`); reload() }}
            onEdit={() => setModal(p)}
            onDelete={async () => { await deleteProducto(p.id); notify('Producto eliminado'); reload() }}
          />
        ))}
      </div>
      {modal && (
        <ProductoModal
          negocio={negocio} categorias={data.categorias} producto={modal === 'new' ? null : modal}
          onClose={() => setModal(null)}
          onSaved={() => { setModal(null); notify(modal === 'new' ? 'Producto creado' : 'Producto actualizado'); reload() }}
        />
      )}
    </div>
  )
}

function ProductoCard({ p, onToggle, onEdit, onDelete }) {
  return (
    <div className="group border border-line rounded overflow-hidden bg-paper2 hover:border-gold transition-colors relative">
      {!p.disponible && <span className="absolute top-2 right-2 text-[9.5px] font-bold px-2 py-1 rounded-full bg-paper text-creamsoft border border-line uppercase">Agotado</span>}
      <div className="h-24 flex items-center justify-center text-4xl relative border-b border-line" style={{ background: thumbFor(p.emoji) }}>
        {p.emoji}
        <div className="absolute inset-x-0 bottom-0 top-0 pointer-events-none">
          <span className="steam-span absolute bottom-[70%] left-[45%] w-[5px] h-5 rounded-full bg-cream/40 blur-[3px] opacity-0" />
        </div>
      </div>
      <div className="p-3.5">
        <span className="text-[10.5px] text-creamsoft font-semibold uppercase tracking-wide">{p.categoria}</span>
        <h4 className="font-serif font-semibold text-[15px] mb-0.5">{p.nombre}</h4>
        <div className="font-mono font-bold text-gold my-2">{fmt$(p.precio)}</div>
        <div className="flex gap-1.5 flex-wrap">
          <Btn size="sm" variant="ghost" onClick={onToggle}>{p.disponible ? 'Marcar agotado' : 'Reactivar'}</Btn>
          <Btn size="sm" variant="ghost" onClick={onEdit}>Editar</Btn>
          <Btn size="sm" variant="danger" onClick={onDelete}>Eliminar</Btn>
        </div>
      </div>
    </div>
  )
}

function ProductoModal({ negocio, categorias, producto, onClose, onSaved }) {
  const [nombre, setNombre] = useState(producto?.nombre || '')
  const [categoria, setCategoria] = useState(producto?.categoria || categorias[0]?.nombre || '')
  const [precio, setPrecio] = useState(producto?.precio || '')
  const [desc, setDesc] = useState(producto?.desc || '')
  const [emoji, setEmoji] = useState(producto?.emoji || '🍽️')
  const [saving, setSaving] = useState(false)

  async function submit(e) {
    e.preventDefault()
    setSaving(true)
    const payload = { nombre, categoria, precio: parseFloat(precio) || 0, desc, emoji }
    try {
      if (producto) await updateProducto(producto.id, payload)
      else await createProducto(negocio.id, { ...payload, disponible: true, adiciones: [] })
      onSaved()
    } finally {
      setSaving(false)
    }
  }

  return (
    <Modal onClose={onClose}>
      <h2 className="font-serif text-xl font-semibold mb-4">{producto ? 'Editar producto' : 'Nuevo producto'}</h2>
      <form onSubmit={submit}>
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
        <Field label="Emoji / ícono"><Input maxLength={2} value={emoji} onChange={(e) => setEmoji(e.target.value)} /></Field>
        <Btn variant="primary" className="w-full justify-center" disabled={saving}>{producto ? 'Guardar cambios' : 'Crear producto'}</Btn>
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
    await createIngrediente(negocio.id, { nombre, unidad, stock: parseFloat(stock) || 0, minimo: parseFloat(minimo) || 0 })
    onSaved()
  }
  return (
    <Modal onClose={onClose}>
      <h2 className="font-serif text-xl font-semibold mb-4">Nuevo ingrediente</h2>
      <form onSubmit={submit}>
        <Field label="Nombre"><Input required value={nombre} onChange={(e) => setNombre(e.target.value)} /></Field>
        <div className="grid grid-cols-2 gap-3">
          <Field label="Unidad">
            <Select value={unidad} onChange={(e) => setUnidad(e.target.value)}>
              <option>kg</option><option>und</option><option>l</option>
            </Select>
          </Field>
          <Field label="Existencias iniciales"><Input required type="number" value={stock} onChange={(e) => setStock(e.target.value)} /></Field>
        </div>
        <Field label="Nivel mínimo (alerta de reposición)"><Input required type="number" value={minimo} onChange={(e) => setMinimo(e.target.value)} /></Field>
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
  async function submit(e) {
    e.preventDefault()
    const ing = ingredientes.find((i) => i.id === ingId)
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
        <div className="grid grid-cols-2 gap-3">
          <Field label="Cantidad"><Input required type="number" value={cantidad} onChange={(e) => setCantidad(e.target.value)} /></Field>
          <Field label="Valor total (COP)"><Input required type="number" value={valor} onChange={(e) => setValor(e.target.value)} /></Field>
        </div>
        <Btn variant="primary" className="w-full justify-center">Registrar compra</Btn>
      </form>
    </Modal>
  )
}

/* ---------------- Pedidos (kanban) ---------------- */
export function TabPedidos({ data, reload, notify }) {
  async function advance(p) {
    const i = ESTADOS.indexOf(p.estado)
    await avanzarEstadoPedido(p.id, ESTADOS[i + 1])
    notify(`Pedido #${p.numero} → ${ESTADOS[i + 1]}`)
    reload()
  }
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
                </div>
              ))}
            </div>
          )
        })}
      </div>
    </div>
  )
}

/* ---------------- Ventas ---------------- */
export function TabVentas({ data }) {
  const total = data.ventas.reduce((a, v) => a + v.total, 0)
  const mes = data.ventas.filter((v) => sameMonth(v.creado_en)).reduce((a, v) => a + v.total, 0)
  const prom = data.ventas.length ? total / data.ventas.length : 0
  return (
    <div>
      <SectionTitle title="Ventas" sub="Cada pedido confirmado genera su registro de venta." />
      <div className="grid grid-cols-[repeat(auto-fit,minmax(180px,1fr))] gap-3.5 mb-6">
        <StatCard label="Ventas del mes" value={fmt$(mes)} tone="gold" />
        <StatCard label="Histórico total" value={fmt$(total)} />
        <StatCard label="Pedidos" value={data.ventas.length} tone="champagne" />
        <StatCard label="Ticket promedio" value={fmt$(prom)} />
      </div>
      <Card className="p-5">
        {data.ventas.length === 0 ? <Empty icon="💵">Aún no hay ventas registradas.</Empty> : (
          <Table head={['Fecha', 'Total']} rows={data.ventas.map((v) => [
            <span className="font-mono">{fmtDate(v.creado_en)}</span>,
            <span className="font-mono">{fmt$(v.total)}</span>,
          ])} />
        )}
      </Card>
    </div>
  )
}

/* ---------------- Trabajadores ---------------- */
export function TabTrabajadores({ negocio, data, reload, notify }) {
  const [modal, setModal] = useState(false)
  const [pagoFor, setPagoFor] = useState(null)

  return (
    <div>
      <SectionTitle title="Trabajadores" sub={`Equipo de ${negocio.nombre}.`}
        action={<Btn variant="primary" onClick={() => setModal(true)}>➕ Nuevo trabajador</Btn>} />
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
        <TrabajadorModal negocio={negocio} onClose={() => setModal(false)}
          onSaved={() => { setModal(false); notify('Trabajador agregado'); reload() }} />
      )}
      {pagoFor && (
        <PagoModal negocio={negocio} trabajador={pagoFor} onClose={() => setPagoFor(null)}
          onSaved={() => { setPagoFor(null); notify(`Pago registrado a ${pagoFor.nombre}`); reload() }} />
      )}
    </div>
  )
}
function TrabajadorModal({ negocio, onClose, onSaved }) {
  const [nombre, setNombre] = useState('')
  const [cargo, setCargo] = useState('')
  const [pago, setPago] = useState('')
  async function submit(e) {
    e.preventDefault()
    await createTrabajador(negocio.id, { nombre, cargo, pago: parseFloat(pago) || 0 })
    onSaved()
  }
  return (
    <Modal onClose={onClose}>
      <h2 className="font-serif text-xl font-semibold mb-4">Nuevo trabajador</h2>
      <form onSubmit={submit}>
        <Field label="Nombre"><Input required value={nombre} onChange={(e) => setNombre(e.target.value)} /></Field>
        <div className="grid grid-cols-2 gap-3">
          <Field label="Cargo"><Input required value={cargo} onChange={(e) => setCargo(e.target.value)} /></Field>
          <Field label="Pago mensual (COP)"><Input required type="number" value={pago} onChange={(e) => setPago(e.target.value)} /></Field>
        </div>
        <Btn variant="primary" className="w-full justify-center">Agregar trabajador</Btn>
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
export function TabFinanzas({ negocio, data, reload, notify }) {
  const [modal, setModal] = useState(null) // 'ingreso' | 'egreso'
  const ingresosVentas = data.ventas.filter((v) => sameMonth(v.creado_en)).reduce((a, v) => a + v.total, 0)
  const ingresosExtra = data.ingresos.filter((i) => sameMonth(i.creado_en)).reduce((a, i) => a + i.valor, 0)
  const egresosCompras = data.compras.filter((c) => sameMonth(c.creado_en)).reduce((a, c) => a + c.valor, 0)
  const egresosPagos = data.trabajadores.flatMap((w) => w.pagos).filter((p) => sameMonth(p.creado_en)).reduce((a, p) => a + p.valor, 0)
  const egresosOtros = data.egresos.filter((e) => sameMonth(e.creado_en)).reduce((a, e) => a + e.valor, 0)

  return (
    <div>
      <SectionTitle title="Ingresos y egresos" sub="Compras, pagos y ventas se reflejan aquí automáticamente."
        action={<div className="flex gap-2">
          <Btn size="sm" variant="mustard" onClick={() => setModal('ingreso')}>➕ Ingreso</Btn>
          <Btn size="sm" variant="danger" onClick={() => setModal('egreso')}>➕ Egreso</Btn>
        </div>} />
      <div className="grid grid-cols-[repeat(auto-fit,minmax(180px,1fr))] gap-3.5 mb-6">
        <StatCard label="Ingresos (ventas + otros)" value={fmt$(ingresosVentas + ingresosExtra)} tone="sage" />
        <StatCard label="Egresos (compras)" value={fmt$(egresosCompras)} tone="gold" />
        <StatCard label="Egresos (personal)" value={fmt$(egresosPagos)} tone="champagne" />
        <StatCard label="Otros egresos" value={fmt$(egresosOtros)} />
      </div>
      <div className="grid grid-cols-[1.3fr_.9fr] gap-4 max-[820px]:grid-cols-1">
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
      {modal && (
        <MovimientoModal negocio={negocio} tipo={modal} onClose={() => setModal(null)}
          onSaved={() => { setModal(null); notify('Movimiento registrado'); reload() }} />
      )}
    </div>
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
