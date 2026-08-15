import { useEffect, useState } from 'react'
import { Btn, Modal, Field, Input, Empty } from './ui'
import { fmt$, ESTADOS, thumbFor } from '../lib/helpers'
import { fetchCategorias, fetchProductos, crearPedido, suscribirsePedido } from '../lib/api'

export default function ClienteView({ negocio, onExit, notify }) {
  const [categorias, setCategorias] = useState([])
  const [productos, setProductos] = useState([])
  const [catActiva, setCatActiva] = useState('Todas')
  const [detalle, setDetalle] = useState(null) // producto abierto
  const [cart, setCart] = useState([])
  const [drawer, setDrawer] = useState(false)
  const [pedido, setPedido] = useState(null) // pedido confirmado, para seguimiento

  useEffect(() => {
    fetchCategorias(negocio.id).then(setCategorias)
    fetchProductos(negocio.id).then(setProductos)
  }, [negocio.id])

  useEffect(() => {
    if (!pedido) return
    const unsub = suscribirsePedido(pedido.id, (nuevo) => setPedido((p) => ({ ...p, estado: nuevo.estado })))
    return unsub
  }, [pedido?.id])

  if (pedido) return <Tracking negocio={negocio} pedido={pedido} onNuevo={() => { setPedido(null); setCart([]) }} />

  const catalogo = productos.filter((p) => !p.es_adicion)
  const adicionesGlobales = productos.filter((p) => p.es_adicion && p.disponible)
  const prods = catActiva === 'Todas' ? catalogo : catalogo.filter((p) => p.categoria === catActiva)

  return (
    <div>
      <div className="rounded p-9 mb-6 relative overflow-hidden border border-line bg-gradient-to-br from-paper3 to-paper2">
        <div className="absolute inset-0 bg-[radial-gradient(circle_at_88%_20%,rgba(199,154,60,.16),transparent_55%)] pointer-events-none" />
        <h2 className="font-serif text-3xl font-semibold mb-2">{negocio.emoji} {negocio.nombre}</h2>
        <p className="text-creamsoft max-w-md leading-relaxed">{negocio.slogan}. Arma tu pedido, personalízalo con adiciones y síguelo hasta que llegue a tu mesa.</p>
        <Btn className="mt-4 bg-paper2" onClick={onExit}>↩ Ver otros negocios</Btn>
      </div>

      <div className="flex gap-2 overflow-x-auto pb-4">
        {['Todas', ...categorias.map((c) => c.nombre)].map((c) => (
          <button key={c} onClick={() => setCatActiva(c)}
            className={`shrink-0 border rounded-full px-4 py-2 text-[12.5px] font-semibold ${catActiva === c ? 'bg-gold text-paper border-gold' : 'border-line text-creamsoft'}`}>
            {c}
          </button>
        ))}
      </div>

      <div className="grid grid-cols-[repeat(auto-fill,minmax(240px,1fr))] gap-4">
        {prods.map((p) => (
          <button key={p.id} disabled={!p.disponible} onClick={() => setDetalle(p)}
            className={`text-left border border-line rounded overflow-hidden bg-paper2 hover:border-gold transition-colors relative ${!p.disponible ? 'opacity-50' : ''}`}>
            {!p.disponible && <span className="absolute top-2 right-2 text-[9.5px] font-bold px-2 py-1 rounded-full bg-paper text-creamsoft border border-line uppercase">Agotado</span>}
            <div className="h-24 flex items-center justify-center text-4xl border-b border-line overflow-hidden" style={{ background: thumbFor(p.emoji) }}>
              {p.imagen_url ? <img src={p.imagen_url} alt={p.nombre} className="w-full h-full object-cover" /> : p.emoji}
            </div>
            <div className="p-3.5">
              <span className="text-[10.5px] text-creamsoft font-semibold uppercase tracking-wide">{p.categoria}</span>
              <h4 className="font-serif font-semibold text-[15px] mb-0.5">{p.nombre}</h4>
              {p.desc && <p className="text-[12px] text-creamsoft mb-1.5">{p.desc}</p>}
              <div className="font-mono font-bold text-gold my-1.5">{fmt$(p.precio)}</div>
              {p.disponible && <span className="text-[12px] font-semibold text-gold">Agregar →</span>}
            </div>
          </button>
        ))}
        {prods.length === 0 && (
          <div className="col-span-full"><Empty icon="🍽️">No hay productos en esta categoría.</Empty></div>
        )}
      </div>

      {cart.length > 0 && (
        <button onClick={() => setDrawer(true)}
          className="fixed right-6 bottom-6 z-50 bg-gold text-paper rounded-full px-5 py-3.5 flex items-center gap-2.5 font-bold text-sm shadow-xl">
          🧺 Ver pedido <span className="bg-paper text-gold rounded-full px-2.5 text-[11.5px]">{cart.reduce((a, c) => a + c.cantidad, 0)}</span>
        </button>
      )}

      {detalle && (
        <ProductoDetalleModal producto={detalle} adicionesGlobales={adicionesGlobales} onClose={() => setDetalle(null)}
          onAdd={(item) => { setCart((c) => [...c, item]); setDetalle(null); notify(`${detalle.nombre} agregado al pedido`) }} />
      )}

      {drawer && (
        <CartDrawer negocio={negocio} cart={cart} onClose={() => setDrawer(false)}
          onRemove={(i) => setCart((c) => c.filter((_, idx) => idx !== i))}
          onConfirmed={(p) => { setPedido(p); setDrawer(false) }} />
      )}
    </div>
  )
}

function ProductoDetalleModal({ producto, adicionesGlobales, onClose, onAdd }) {
  // Se combinan las adiciones propias de este producto (las que el admin le
  // puso solo a él) con las adiciones generales del negocio (bebidas, extras
  // que aplican a cualquier plato) — el cliente las ve todas juntas, en una
  // sola lista, sin necesidad de saber cuál es cuál.
  const opciones = [
    ...(producto.adiciones || []).map((a) => ({ nombre: a.nombre, precio: a.precio })),
    ...(adicionesGlobales || []).map((p) => ({ nombre: p.nombre, precio: p.precio })),
  ]
  const [selected, setSelected] = useState(new Set())
  const [qty, setQty] = useState(1)
  const [obs, setObs] = useState('')

  const adTotal = [...selected].reduce((a, i) => a + opciones[i].precio, 0)
  const total = (producto.precio + adTotal) * qty

  function toggle(i) {
    setSelected((s) => {
      const next = new Set(s)
      next.has(i) ? next.delete(i) : next.add(i)
      return next
    })
  }

  function submit(e) {
    e.preventDefault()
    onAdd({
      productId: producto.id,
      nombre: producto.nombre,
      cantidad: qty,
      adiciones: [...selected].map((i) => opciones[i].nombre),
      obs: obs.trim(),
      subtotal: total,
    })
  }

  return (
    <Modal onClose={onClose}>
      {producto.imagen_url
        ? <img src={producto.imagen_url} alt={producto.nombre} className="w-full h-40 object-cover rounded mb-3" />
        : <div className="text-5xl text-center mb-1.5">{producto.emoji}</div>}
      <h2 className="font-serif text-xl font-semibold text-center mb-0.5">{producto.nombre}</h2>
      <p className="text-creamsoft text-center text-sm mb-3.5">{producto.desc}</p>
      <p className="font-mono font-bold text-gold text-center text-lg mb-4">{fmt$(producto.precio)}</p>
      <form onSubmit={submit}>
        {opciones.length > 0 && (
          <Field label="Adiciones">
            <div className="border border-line rounded-sm divide-y divide-line">
              {opciones.map((a, i) => (
                <label key={i} className="flex items-center justify-between px-3 py-2.5 cursor-pointer">
                  <span className="flex items-center gap-2.5 text-[13.5px]">
                    <span className={`w-4 h-4 rounded-sm border flex items-center justify-center text-[10px] shrink-0 ${selected.has(i) ? 'bg-gold border-gold text-paper' : 'border-creamsoft'}`}>
                      {selected.has(i) ? '✓' : ''}
                    </span>
                    {a.nombre}
                  </span>
                  <span className="font-mono text-champagne text-[12.5px]">+ {fmt$(a.precio)}</span>
                  <input type="checkbox" className="hidden" checked={selected.has(i)} onChange={() => toggle(i)} />
                </label>
              ))}
            </div>
          </Field>
        )}
        <div className="grid grid-cols-2 gap-3">
          <Field label="Cantidad"><Input type="number" min="1" value={qty} onChange={(e) => setQty(parseInt(e.target.value) || 1)} /></Field>
          <Field label="Observaciones"><Input value={obs} onChange={(e) => setObs(e.target.value)} placeholder="Ej: sin cebolla" /></Field>
        </div>
        <Btn variant="primary" className="w-full justify-center">Agregar al carrito — <span className="font-mono">{fmt$(total)}</span></Btn>
      </form>
    </Modal>
  )
}

function CartDrawer({ negocio, cart, onClose, onRemove, onConfirmed }) {
  const [nombre, setNombre] = useState('')
  const [saving, setSaving] = useState(false)
  const total = cart.reduce((a, c) => a + c.subtotal, 0)

  async function confirmar() {
    setSaving(true)
    try {
      const pedido = await crearPedido(negocio.id, { cliente: nombre.trim() || 'Cliente', items: cart, total })
      onConfirmed(pedido)
    } finally {
      setSaving(false)
    }
  }

  return (
    <div className="fixed inset-0 bg-black/70 z-[60] flex justify-end" onClick={(e) => e.target === e.currentTarget && onClose()}>
      <div className="w-full max-w-[420px] bg-paper border-l border-line h-full p-6 overflow-y-auto animate-slidein">
        <button className="float-right text-creamsoft hover:text-gold text-lg" onClick={onClose}>✕</button>
        <h2 className="font-serif text-xl font-semibold mb-4">Tu pedido</h2>
        {cart.length === 0 ? <Empty icon="🧺">Tu carrito está vacío.</Empty> : (
          <>
            {cart.map((c, i) => (
              <div key={i} className="flex justify-between gap-2.5 py-2.5 border-b border-line text-[13px]">
                <span>
                  <span className="font-semibold">{c.cantidad}× {c.nombre}</span>
                  {c.adiciones.length > 0 && <div className="text-creamsoft text-[11.5px]">+ {c.adiciones.join(', ')}</div>}
                  {c.obs && <div className="text-creamsoft text-[11.5px]">"{c.obs}"</div>}
                </span>
                <span className="flex flex-col items-end gap-1">
                  <b className="font-mono">{fmt$(c.subtotal)}</b>
                  <button onClick={() => onRemove(i)} className="text-[11px] text-creamsoft hover:text-wine">Quitar</button>
                </span>
              </div>
            ))}
            <div className="flex justify-between my-4 font-bold text-lg">
              <span>Total</span><span className="font-mono">{fmt$(total)}</span>
            </div>
            <Field label="Tu nombre"><Input value={nombre} onChange={(e) => setNombre(e.target.value)} placeholder="¿Cómo te llamas?" /></Field>
            <Btn variant="primary" className="w-full justify-center" disabled={saving} onClick={confirmar}>
              {saving ? 'Confirmando…' : 'Confirmar pedido'}
            </Btn>
          </>
        )}
      </div>
    </div>
  )
}

function Tracking({ negocio, pedido, onNuevo }) {
  const idx = ESTADOS.indexOf(pedido.estado)
  return (
    <div className="bg-paper2 border border-line rounded p-6 max-w-[560px] mx-auto text-center">
      <div className="inline-block text-gold font-serif italic font-semibold text-lg pb-1.5 border-b border-gold animate-stampin">
        ¡Pedido confirmado!
      </div>
      <h2 className="font-serif text-2xl font-semibold mt-4 mb-1">Pedido #{pedido.numero || '—'}</h2>
      <p className="text-creamsoft mb-1.5">{negocio.nombre} · <b className="font-mono">{fmt$(pedido.total)}</b></p>
      <div className="flex justify-between my-6">
        {ESTADOS.map((e, i) => (
          <div key={e} className={`flex-1 text-center relative text-[10.5px] font-semibold ${i <= idx ? 'text-gold' : 'text-creamsoft'}`}>
            <div className={`w-3.5 h-3.5 rounded-full mx-auto mb-2 border ${i <= idx ? 'bg-gold border-gold' : 'bg-paper border-line'}`} />
            {e}
          </div>
        ))}
      </div>
      <p className="text-creamsoft text-[12px] mb-4">El estado se actualiza solo cuando la cocina lo cambie — no necesitas recargar la página.</p>
      <Btn variant="primary" className="w-full justify-center" onClick={onNuevo}>Hacer otro pedido</Btn>
    </div>
  )
}
