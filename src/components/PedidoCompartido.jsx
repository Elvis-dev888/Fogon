import { useState } from 'react'
import { Btn, Modal, Field, Input, Empty } from './ui'
import { fmt$, thumbFor } from '../lib/helpers'
import { useLanguage } from '../lib/i18n.jsx'

/* ---------------------------------------------------------------
   Elegir cantidad y adicionales de UN producto (lo usa el cliente al
   armar su pedido, y el editor de pedidos del empleado/admin cuando
   agrega un producto nuevo a un pedido existente).
   --------------------------------------------------------------- */
export function ProductoDetalleModal({ producto, adicionesGlobales, onClose, onAdd }) {
  const { t } = useLanguage()
  // Se combinan las adiciones propias de este producto (las que el admin le
  // puso solo a él) con las adiciones generales del negocio (bebidas, extras
  // que aplican a cualquier plato) — el cliente las ve todas juntas.
  const opciones = [
    ...(producto.adiciones || []).map((a) => ({ nombre: a.nombre, precio: a.precio })),
    ...(adicionesGlobales || []).map((p) => ({ nombre: p.nombre, precio: p.precio })),
  ]
  const [selected, setSelected] = useState(new Set())
  const [qty, setQty] = useState(1)
  const [obs, setObs] = useState('')

  const adTotal = [...selected].reduce((a, i) => a + opciones[i].precio, 0)
  const unitPrice = producto.precio + adTotal
  const total = unitPrice * qty

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
      producto_id: producto.id,
      nombre: producto.nombre,
      cantidad: qty,
      adiciones: [...selected].map((i) => opciones[i].nombre),
      obs: obs.trim(),
      unitPrice,
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
          <Field label={t.orderShared.additions}>
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
          <Field label={t.orderShared.quantity}><QtyStepper value={qty} onChange={setQty} /></Field>
          <Field label={t.orderShared.notes}><Input value={obs} onChange={(e) => setObs(e.target.value)} placeholder={t.orderShared.notesPlaceholder} /></Field>
        </div>
        <Btn variant="primary" className="w-full justify-center">{t.orderShared.addToCart} — <span className="font-mono">{fmt$(total)}</span></Btn>
      </form>
    </Modal>
  )
}

// Control "− cantidad +" reutilizable.
export function QtyStepper({ value, onChange, min = 1 }) {
  return (
    <div className="flex items-center border border-line rounded-sm overflow-hidden w-fit">
      <button type="button" onClick={() => onChange(Math.max(min, value - 1))}
        className="w-9 h-9 grid place-items-center text-gold font-bold text-lg hover:bg-white/5">−</button>
      <span className="w-10 text-center font-mono text-sm">{value}</span>
      <button type="button" onClick={() => onChange(value + 1)}
        className="w-9 h-9 grid place-items-center text-gold font-bold text-lg hover:bg-white/5">+</button>
    </div>
  )
}

/* ---------------------------------------------------------------
   Editar un pedido ya confirmado: subir/bajar cantidades, quitar
   productos, agregar productos nuevos (con sus propias adiciones).
   Recalcula el total solo. Lo usa tanto el cliente (mientras su
   pedido esté Pendiente) como el empleado/admin (mientras no esté
   Entregado ni Cancelado).
   --------------------------------------------------------------- */
export function EditarPedidoModal({ pedido, productos, onClose, onSaved, guardar }) {
  const { t } = useLanguage()
  const original = (pedido.pedido_items || pedido.items || []).map((it) => ({
    producto_id: it.producto_id || it.productId || null,
    nombre: it.nombre,
    cantidad: it.cantidad,
    adiciones: it.adiciones || [],
    obs: it.obs || it.observaciones || '',
    unitPrice: it.cantidad ? (it.subtotal || 0) / it.cantidad : 0,
    subtotal: it.subtotal || 0,
  }))
  const [items, setItems] = useState(original)
  const [agregando, setAgregando] = useState(null) // producto elegido para agregar
  const [guardando, setGuardando] = useState(false)

  const catalogo = productos.filter((p) => !p.es_adicion)
  const adicionesGlobales = productos.filter((p) => p.es_adicion && p.disponible)
  const total = items.reduce((a, it) => a + it.subtotal, 0)

  function setQty(i, qty) {
    setItems((arr) => arr.map((it, idx) => idx === i ? { ...it, cantidad: qty, subtotal: it.unitPrice * qty } : it))
  }
  function quitar(i) {
    setItems((arr) => arr.filter((_, idx) => idx !== i))
  }

  async function submit() {
    if (items.length === 0) return
    setGuardando(true)
    try {
      const res = await guardar(pedido, productos, items)
      onSaved(res)
    } finally {
      setGuardando(false)
    }
  }

  return (
    <Modal onClose={onClose} width="max-w-[520px]">
      <h2 className="font-serif text-xl font-semibold mb-1">{t.orderShared.editTitle} #{pedido.numero}</h2>
      <p className="text-creamsoft text-[13px] mb-4">{t.orderShared.editDescription}</p>

      {items.length === 0 ? <Empty icon="🧺">{t.orderShared.empty}</Empty> : items.map((it, i) => (
        <div key={i} className="flex justify-between gap-2.5 py-2.5 border-b border-line text-[13px]">
          <span>
            <span className="font-semibold">{it.nombre}</span>
            {it.adiciones.length > 0 && <div className="text-creamsoft text-[11.5px]">+ {it.adiciones.join(', ')}</div>}
            {it.obs && <div className="text-creamsoft text-[11.5px]">"{it.obs}"</div>}
          </span>
          <span className="flex flex-col items-end gap-1.5">
            <b className="font-mono">{fmt$(it.subtotal)}</b>
            <div className="flex items-center gap-2">
              <QtyStepper value={it.cantidad} onChange={(q) => setQty(i, q)} />
              <button onClick={() => quitar(i)} className="text-[11px] text-creamsoft hover:text-wine">{t.customer.remove}</button>
            </div>
          </span>
        </div>
      ))}

      <div className="flex justify-between my-4 font-bold text-lg">
        <span>Total</span><span className="font-mono">{fmt$(total)}</span>
      </div>

      <Btn size="sm" variant="ghost" className="mb-4" onClick={() => setAgregando('catalogo')}>➕ {t.orderShared.addProduct}</Btn>

      <Btn variant="primary" className="w-full justify-center" disabled={guardando || items.length === 0} onClick={submit}>
        {guardando ? t.orderShared.saving : t.orderShared.save}
      </Btn>

      {agregando === 'catalogo' && (
        <Modal onClose={() => setAgregando(null)}>
          <h2 className="font-serif text-lg font-semibold mb-3">{t.orderShared.chooseProduct}</h2>
          <div className="grid grid-cols-2 gap-2.5">
            {catalogo.map((p) => (
              <button key={p.id} disabled={!p.disponible} onClick={() => setAgregando(p)}
                className={`text-left border border-line rounded p-2.5 hover:border-gold ${!p.disponible ? 'opacity-40' : ''}`}
                style={{ background: thumbFor(p.emoji) }}>
                <div className="text-2xl mb-1">{p.emoji}</div>
                <div className="text-[12.5px] font-semibold">{p.nombre}</div>
                <div className="font-mono text-gold text-[12px]">{fmt$(p.precio)}</div>
              </button>
            ))}
          </div>
        </Modal>
      )}
      {agregando && agregando !== 'catalogo' && (
        <ProductoDetalleModal producto={agregando} adicionesGlobales={adicionesGlobales} onClose={() => setAgregando(null)}
          onAdd={(item) => { setItems((arr) => [...arr, item]); setAgregando(null) }} />
      )}
    </Modal>
  )
}

/* ---------------------------------------------------------------
   Confirmación antes de cancelar un pedido — no se puede deshacer
   por accidente con un solo clic.
   --------------------------------------------------------------- */
export function ConfirmCancelModal({ pedido, onClose, cancelar }) {
  const { t } = useLanguage()
  const [cancelando, setCancelando] = useState(false)
  async function confirmar() {
    setCancelando(true)
    try {
      await cancelar()
    } finally {
      setCancelando(false)
    }
  }
  return (
    <Modal onClose={onClose} width="max-w-[400px]">
      <h2 className="font-serif text-lg font-semibold mb-2">{t.orderShared.cancelTitle}</h2>
      <p className="text-creamsoft text-[13px] mb-5">
        Pedido #{pedido.numero} — {fmt$(pedido.total)}. {t.orderShared.cancelDescription}
      </p>
      <div className="flex gap-2.5">
        <Btn variant="ghost" className="flex-1 justify-center" onClick={onClose}>{t.orderShared.back}</Btn>
        <Btn variant="danger" className="flex-1 justify-center" disabled={cancelando} onClick={confirmar}>
          {cancelando ? t.orderShared.cancelling : t.customer.cancel}
        </Btn>
      </div>
    </Modal>
  )
}
