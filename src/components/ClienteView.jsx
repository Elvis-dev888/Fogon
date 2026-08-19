import { useEffect, useState } from 'react'
import { Btn, Modal, Field, Input, Empty } from './ui'
import { fmt$, ESTADOS, thumbFor } from '../lib/helpers'
import { fetchCategorias, fetchProductos, crearPedido, suscribirsePedido, actualizarPedido, cancelarPedido } from '../lib/api'
import { ProductoDetalleModal, EditarPedidoModal, ConfirmCancelModal, QtyStepper } from './PedidoCompartido'

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
    const unsub = suscribirsePedido(pedido.id, (nuevo) =>
      setPedido((p) => ({ ...p, estado: nuevo.estado, total: nuevo.total, cancelado_en: nuevo.cancelado_en, cancelado_por: nuevo.cancelado_por }))
    )
    return unsub
  }, [pedido?.id])

  if (pedido) {
    return (
      <Tracking negocio={negocio} pedido={pedido} productos={productos}
        onPedidoActualizado={(cambios) => setPedido((p) => ({ ...p, ...cambios }))}
        onNuevo={() => { setPedido(null); setCart([]) }} />
    )
  }

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
          onQty={(i, q) => setCart((c) => c.map((it, idx) => idx === i ? { ...it, cantidad: q, subtotal: it.unitPrice * q } : it))}
          onConfirmed={(p) => { setPedido({ ...p, items: cart }); setDrawer(false) }} />
      )}
    </div>
  )
}

function CartDrawer({ negocio, cart, onClose, onRemove, onQty, onConfirmed }) {
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
                  <span className="font-semibold">{c.nombre}</span>
                  {c.adiciones.length > 0 && <div className="text-creamsoft text-[11.5px]">+ {c.adiciones.join(', ')}</div>}
                  {c.obs && <div className="text-creamsoft text-[11.5px]">"{c.obs}"</div>}
                </span>
                <span className="flex flex-col items-end gap-1.5">
                  <b className="font-mono">{fmt$(c.subtotal)}</b>
                  <div className="flex items-center gap-2">
                    <QtyStepper value={c.cantidad} onChange={(q) => onQty(i, q)} />
                    <button onClick={() => onRemove(i)} className="text-[11px] text-creamsoft hover:text-wine">Quitar</button>
                  </div>
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

function Tracking({ negocio, pedido, productos, onPedidoActualizado, onNuevo }) {
  const idx = ESTADOS.indexOf(pedido.estado)
  const cancelado = pedido.estado === 'Cancelado'
  const puedeModificar = pedido.estado === 'Pendiente'
  const [modal, setModal] = useState(null) // 'editar' | 'cancelar'
  const items = pedido.pedido_items || pedido.items || []

  return (
    <div className="bg-paper2 border border-line rounded p-6 max-w-[560px] mx-auto text-center">
      <div className={`inline-block font-serif italic font-semibold text-lg pb-1.5 border-b animate-stampin ${cancelado ? 'text-wine border-wine' : 'text-gold border-gold'}`}>
        {cancelado ? 'Pedido cancelado' : '¡Pedido confirmado!'}
      </div>
      <h2 className="font-serif text-2xl font-semibold mt-4 mb-1">Pedido #{pedido.numero || '—'}</h2>
      <p className="text-creamsoft mb-1.5">{negocio.nombre} · <b className="font-mono">{fmt$(pedido.total)}</b></p>

      {items.length > 0 && (
        <div className="text-left border border-line rounded-sm mb-5 mt-4 divide-y divide-line">
          {items.map((it, i) => (
            <div key={i} className="px-3.5 py-2.5 text-[13px] flex justify-between">
              <span>
                <span className="font-semibold">{it.cantidad}× {it.nombre}</span>
                {(it.adiciones || []).length > 0 && <div className="text-creamsoft text-[11.5px]">+ {it.adiciones.join(', ')}</div>}
              </span>
              <b className="font-mono">{fmt$(it.subtotal)}</b>
            </div>
          ))}
        </div>
      )}

      {!cancelado && (
        <div className="flex justify-between my-6">
          {ESTADOS.map((e, i) => (
            <div key={e} className={`flex-1 text-center relative text-[10.5px] font-semibold ${i <= idx ? 'text-gold' : 'text-creamsoft'}`}>
              <div className={`w-3.5 h-3.5 rounded-full mx-auto mb-2 border ${i <= idx ? 'bg-gold border-gold' : 'bg-paper border-line'}`} />
              {e}
            </div>
          ))}
        </div>
      )}

      {cancelado ? (
        <p className="text-creamsoft text-[12px] mb-4">Este pedido fue cancelado y no se va a preparar.</p>
      ) : (
        <p className="text-creamsoft text-[12px] mb-4">El estado se actualiza solo cuando la cocina lo cambie — no necesitas recargar la página.</p>
      )}

      {puedeModificar && (
        <div className="flex gap-2.5 mb-3">
          <Btn variant="ghost" className="flex-1 justify-center" onClick={() => setModal('editar')}>✏️ Editar pedido</Btn>
          <Btn variant="danger" className="flex-1 justify-center" onClick={() => setModal('cancelar')}>❌ Cancelar pedido</Btn>
        </div>
      )}

      <Btn variant="primary" className="w-full justify-center" onClick={onNuevo}>Hacer otro pedido</Btn>

      {modal === 'editar' && (
        <EditarPedidoModal pedido={pedido} productos={productos} onClose={() => setModal(null)}
          guardar={(p, prods, items) => actualizarPedido(p, prods, items)}
          onSaved={({ items, total }) => { setModal(null); onPedidoActualizado({ items, total }) }} />
      )}
      {modal === 'cancelar' && (
        <ConfirmCancelModal pedido={pedido} onClose={() => setModal(null)}
          cancelar={async () => {
            await cancelarPedido(pedido, productos, pedido.cliente || 'Cliente')
            setModal(null)
            onPedidoActualizado({ estado: 'Cancelado', cancelado_en: new Date().toISOString(), cancelado_por: pedido.cliente || 'Cliente' })
          }} />
      )}
    </div>
  )
}
