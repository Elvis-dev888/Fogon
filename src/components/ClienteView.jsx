import { useEffect, useState } from 'react'
import { Btn, Modal, Field, Input, Empty } from './ui'
import { fmt$, ESTADOS, thumbFor } from '../lib/helpers'
import { fetchCategorias, fetchProductos, crearPedido, suscribirsePedido, actualizarPedido, cancelarPedido } from '../lib/api'
import { ProductoDetalleModal, EditarPedidoModal, ConfirmCancelModal, QtyStepper } from './PedidoCompartido'
import { useLanguage } from '../lib/i18n.jsx'

export default function ClienteView({ negocio, onExit, notify }) {
  const { t } = useLanguage()
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
        <p className="text-creamsoft max-w-md leading-relaxed">{negocio.slogan}. {t.customer.trackingDescription}</p>
        <Btn className="mt-4 bg-paper2" onClick={onExit}>↩ {t.customer.otherBusinesses}</Btn>
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
            {!p.disponible && <span className="absolute top-2 right-2 text-[9.5px] font-bold px-2 py-1 rounded-full bg-paper text-creamsoft border border-line uppercase">{t.customer.outOfStock}</span>}
            <div className="h-24 flex items-center justify-center text-4xl border-b border-line overflow-hidden" style={{ background: thumbFor(p.emoji) }}>
              {p.imagen_url ? <img src={p.imagen_url} alt={p.nombre} className="w-full h-full object-cover" /> : p.emoji}
            </div>
            <div className="p-3.5">
              <span className="text-[10.5px] text-creamsoft font-semibold uppercase tracking-wide">{p.categoria}</span>
              <h4 className="font-serif font-semibold text-[15px] mb-0.5">{p.nombre}</h4>
              {p.desc && <p className="text-[12px] text-creamsoft mb-1.5">{p.desc}</p>}
              <div className="font-mono font-bold text-gold my-1.5">{fmt$(p.precio)}</div>
              {p.disponible && <span className="text-[12px] font-semibold text-gold">{t.customer.add}</span>}
            </div>
          </button>
        ))}
        {prods.length === 0 && (
          <div className="col-span-full"><Empty icon="🍽️">{t.customer.noProducts}</Empty></div>
        )}
      </div>

      {cart.length > 0 && (
        <button onClick={() => setDrawer(true)}
          className="fixed right-6 bottom-6 z-50 bg-gold text-paper rounded-full px-5 py-3.5 flex items-center gap-2.5 font-bold text-sm shadow-xl">
          🧺 {t.customer.viewOrder} <span className="bg-paper text-gold rounded-full px-2.5 text-[11.5px]">{cart.reduce((a, c) => a + c.cantidad, 0)}</span>
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
  const { t } = useLanguage()
  const [nombre, setNombre] = useState('')
  const [tipoEntrega, setTipoEntrega] = useState('local') // 'local' | 'domicilio'
  const [direccion, setDireccion] = useState('')
  const [telefono, setTelefono] = useState('')
  const [metodoPago, setMetodoPago] = useState('efectivo') // 'efectivo' | 'transferencia'
  const [pagaCon, setPagaCon] = useState('')
  const [pagoExacto, setPagoExacto] = useState(false)
  const [notasEntrega, setNotasEntrega] = useState('')
  const [errorValidacion, setErrorValidacion] = useState('')
  const [saving, setSaving] = useState(false)
  const total = cart.reduce((a, c) => a + c.subtotal, 0)

  // Cálculo de cambio si paga en efectivo
  const montoPagaCon = pagoExacto ? total : parseFloat(String(pagaCon).replace(/\D/g, '')) || 0
  const cambio = montoPagaCon > total ? montoPagaCon - total : 0
  const esInsuficiente = !pagoExacto && montoPagaCon > 0 && montoPagaCon < total

  async function confirmar() {
    setErrorValidacion('')
    if (tipoEntrega === 'domicilio') {
      if (!direccion.trim()) {
        setErrorValidacion(t.customer.addressRequired)
        return
      }
      if (!telefono.trim()) {
        setErrorValidacion(t.customer.phoneRequired)
        return
      }
      if (metodoPago === 'efectivo' && !pagoExacto && montoPagaCon > 0 && montoPagaCon < total) {
        setErrorValidacion(`El monto a pagar ($${montoPagaCon.toLocaleString('es-CO')}) debe ser igual o mayor al total ($${total.toLocaleString('es-CO')})`)
        return
      }
    }

    setSaving(true)
    try {
      let resumenPago = ''
      if (tipoEntrega === 'domicilio') {
        if (metodoPago === 'efectivo') {
          if (pagoExacto || montoPagaCon === total) {
            resumenPago = `💵 Efectivo (Pago exacto: ${fmt$(total)})`
          } else if (montoPagaCon > total) {
            resumenPago = `💵 Efectivo (Paga con: ${fmt$(montoPagaCon)} | 🔙 Llevar cambio: ${fmt$(cambio)})`
          } else {
            resumenPago = '💵 Pago en Efectivo'
          }
        } else {
          resumenPago = '📲 Pago por Transferencia'
        }
      }

      const fullNotas = [resumenPago, notasEntrega.trim()].filter(Boolean).join(' · ')

      const pedido = await crearPedido(negocio.id, {
        cliente: nombre.trim() || 'Cliente',
        items: cart,
        total,
        tipo_entrega: tipoEntrega,
        direccion,
        telefono,
        notas_entrega: fullNotas,
      })
      onConfirmed(pedido)
    } finally {
      setSaving(false)
    }
  }

  return (
    <div className="fixed inset-0 bg-black/70 z-[60] flex justify-end" onClick={(e) => e.target === e.currentTarget && onClose()}>
      <div className="w-full max-w-[420px] bg-paper border-l border-line h-full p-6 overflow-y-auto animate-slidein flex flex-col">
        <div className="flex items-center justify-between pb-3 border-b border-line mb-4">
          <h2 className="font-serif text-xl font-semibold">{t.customer.order}</h2>
          <button className="text-creamsoft hover:text-gold text-lg px-2" onClick={onClose}>✕</button>
        </div>

        {cart.length === 0 ? <Empty icon="🧺">{t.customer.emptyCart}</Empty> : (
          <>
            <div className="flex-1 divide-y divide-line overflow-y-auto mb-4">
              {cart.map((c, i) => (
                <div key={i} className="flex justify-between gap-2.5 py-3 text-[13px]">
                  <span>
                    <span className="font-semibold text-cream">{c.nombre}</span>
                    {c.adiciones.length > 0 && <div className="text-creamsoft text-[11.5px] mt-0.5">+ {c.adiciones.join(', ')}</div>}
                    {c.obs && <div className="text-creamsoft text-[11.5px] italic mt-0.5">"{c.obs}"</div>}
                  </span>
                  <span className="flex flex-col items-end gap-1.5 shrink-0">
                    <b className="font-mono text-gold">{fmt$(c.subtotal)}</b>
                    <div className="flex items-center gap-2">
                      <QtyStepper value={c.cantidad} onChange={(q) => onQty(i, q)} />
                      <button onClick={() => onRemove(i)} className="text-[11px] text-creamsoft hover:text-wine">{t.customer.remove}</button>
                    </div>
                  </span>
                </div>
              ))}
            </div>

            <div className="space-y-3.5 pt-2 border-t border-line">
              <div className="flex justify-between font-bold text-lg">
                <span>Total</span><span className="font-mono text-gold">{fmt$(total)}</span>
              </div>

              {/* Selector de entrega */}
              <div>
                <label className="block text-xs font-semibold uppercase tracking-wider text-creamsoft mb-1.5">
                  {t.customer.orderType}
                </label>
                <div className="grid grid-cols-2 gap-2">
                  <button
                    type="button"
                    onClick={() => { setTipoEntrega('local'); setErrorValidacion('') }}
                    className={`py-2 px-2.5 rounded text-center text-xs font-semibold border transition-colors ${
                      tipoEntrega === 'local'
                        ? 'border-gold bg-gold/15 text-gold'
                        : 'border-line bg-paper2 text-creamsoft hover:text-cream'
                    }`}
                  >
                    {t.customer.localOrder}
                  </button>
                  <button
                    type="button"
                    onClick={() => { setTipoEntrega('domicilio'); setErrorValidacion('') }}
                    className={`py-2 px-2.5 rounded text-center text-xs font-semibold border transition-colors ${
                      tipoEntrega === 'domicilio'
                        ? 'border-gold bg-gold/15 text-gold'
                        : 'border-line bg-paper2 text-creamsoft hover:text-cream'
                    }`}
                  >
                    {t.customer.deliveryOrder}
                  </button>
                </div>
              </div>

              <Field label={t.customer.name}>
                <Input value={nombre} onChange={(e) => setNombre(e.target.value)} placeholder={t.customer.namePlaceholder} />
              </Field>

              {tipoEntrega === 'domicilio' && (
                <div className="space-y-3 p-3.5 bg-paper2 border border-line rounded">
                  <p className="text-[11.5px] text-gold font-semibold flex items-center gap-1.5">
                    🛵 Datos para la entrega a domicilio
                  </p>
                  <Field label={t.customer.address + ' *'}>
                    <Input
                      required
                      value={direccion}
                      onChange={(e) => setDireccion(e.target.value)}
                      placeholder={t.customer.addressPlaceholder}
                    />
                  </Field>
                  <Field label={t.customer.phone + ' *'}>
                    <Input
                      required
                      type="tel"
                      value={telefono}
                      onChange={(e) => setTelefono(e.target.value)}
                      placeholder={t.customer.phonePlaceholder}
                    />
                  </Field>

                  {/* Método de Pago para Domicilio */}
                  <div className="pt-2 border-t border-line/60">
                    <label className="block text-[11px] font-semibold uppercase tracking-wider text-creamsoft mb-1.5">
                      💳 ¿Cómo vas a pagar?
                    </label>
                    <div className="grid grid-cols-2 gap-2 mb-2.5">
                      <button
                        type="button"
                        onClick={() => { setMetodoPago('efectivo'); setErrorValidacion('') }}
                        className={`py-2 px-2 rounded text-center text-xs font-semibold border transition-colors ${
                          metodoPago === 'efectivo'
                            ? 'border-gold bg-gold/15 text-gold'
                            : 'border-line bg-paper text-creamsoft hover:text-cream'
                        }`}
                      >
                        💵 Efectivo
                      </button>
                      <button
                        type="button"
                        onClick={() => { setMetodoPago('transferencia'); setErrorValidacion('') }}
                        className={`py-2 px-2 rounded text-center text-xs font-semibold border transition-colors ${
                          metodoPago === 'transferencia'
                            ? 'border-gold bg-gold/15 text-gold'
                            : 'border-line bg-paper text-creamsoft hover:text-cream'
                        }`}
                      >
                        📲 Transferencia
                      </button>
                    </div>

                    {/* Si paga en Efectivo: Preguntar con cuánto paga y calcular cambio */}
                    {metodoPago === 'efectivo' && (
                      <div className="bg-paper p-3 rounded border border-line/80 space-y-2">
                        <div className="flex items-center justify-between">
                          <label className="text-xs font-semibold text-cream">
                            ¿Con cuánto vas a pagar?
                          </label>
                          <button
                            type="button"
                            onClick={() => {
                              setPagoExacto(!pagoExacto)
                              if (!pagoExacto) setPagaCon('')
                            }}
                            className={`text-[11px] px-2 py-0.5 rounded font-semibold transition-colors ${
                              pagoExacto
                                ? 'bg-gold text-paper'
                                : 'bg-paper2 border border-line text-creamsoft hover:text-cream'
                            }`}
                          >
                            Pago exacto ({fmt$(total)})
                          </button>
                        </div>

                        {!pagoExacto && (
                          <>
                            <Input
                              type="number"
                              min={total}
                              step="1000"
                              placeholder={`Ej: ${Math.ceil(total / 10000) * 10000 || 50000}`}
                              value={pagaCon}
                              onChange={(e) => {
                                setPagaCon(e.target.value)
                                setPagoExacto(false)
                              }}
                              className="font-mono text-sm"
                            />

                            {/* Botones de sugerencia rápida de billetes */}
                            <div className="flex flex-wrap gap-1.5 pt-1">
                              {[20000, 50000, 100000].filter((b) => b >= total).map((billete) => (
                                <button
                                  key={billete}
                                  type="button"
                                  onClick={() => {
                                    setPagaCon(String(billete))
                                    setPagoExacto(false)
                                  }}
                                  className={`text-[10.5px] font-mono px-2 py-1 rounded border transition-colors ${
                                    montoPagaCon === billete
                                      ? 'bg-gold/20 text-gold border-gold'
                                      : 'bg-paper2 border-line text-creamsoft hover:text-cream'
                                  }`}
                                >
                                  Billete ${billete.toLocaleString('es-CO')}
                                </button>
                              ))}
                            </div>

                            {/* Resultado del cambio calculado */}
                            {cambio > 0 && (
                              <div className="p-2 bg-sage/10 border border-sage/30 rounded text-xs text-sage font-semibold flex items-center justify-between">
                                <span>🔙 Cambio que te llevamos:</span>
                                <span className="font-mono text-sm font-bold">{fmt$(cambio)}</span>
                              </div>
                            )}

                            {esInsuficiente && (
                              <p className="text-[11px] text-wine font-medium">
                                ⚠️ El valor debe ser al menos de {fmt$(total)}
                              </p>
                            )}
                          </>
                        )}
                      </div>
                    )}

                    {metodoPago === 'transferencia' && (
                      <div className="p-2.5 bg-gold/10 border border-gold/25 rounded text-[11.5px] text-champagne space-y-1">
                        <p className="font-semibold text-gold">📲 Transferencia / Pago móvil</p>
                        <p className="text-creamsoft leading-relaxed">
                          El negocio te confirmará el número de Nequi, Daviplata o cuenta bancaria al recibir tu orden.
                        </p>
                      </div>
                    )}
                  </div>

                  <Field label={t.customer.deliveryNotes}>
                    <Input
                      value={notasEntrega}
                      onChange={(e) => setNotasEntrega(e.target.value)}
                      placeholder="Ej: Apto 302, dejar en portería, sin cebolla..."
                    />
                  </Field>
                </div>
              )}

              {errorValidacion && (
                <p className="text-xs text-wine font-semibold bg-wine/10 border border-wine/30 rounded p-2 text-center">
                  ⚠️ {errorValidacion}
                </p>
              )}

              <Btn variant="primary" className="w-full justify-center py-3" disabled={saving} onClick={confirmar}>
                {saving ? t.customer.confirming : t.customer.confirm}
              </Btn>
            </div>
          </>
        )}
      </div>
    </div>
  )
}

function Tracking({ negocio, pedido, productos, onPedidoActualizado, onNuevo }) {
  const { t } = useLanguage()
  const idx = ESTADOS.indexOf(pedido.estado)
  const cancelado = pedido.estado === 'Cancelado'
  const puedeModificar = pedido.estado === 'Pendiente'
  const esDomicilio = pedido.tipo_entrega === 'domicilio'
  const [modal, setModal] = useState(null) // 'editar' | 'cancelar'
  const items = pedido.pedido_items || pedido.items || []

  return (
    <div className="bg-paper2 border border-line rounded p-6 max-w-[560px] mx-auto text-center">
      <div className={`inline-block font-serif italic font-semibold text-lg pb-1.5 border-b animate-stampin ${cancelado ? 'text-wine border-wine' : 'text-gold border-gold'}`}>
        {cancelado ? t.customer.cancelled : t.customer.confirmed}
      </div>
      <h2 className="font-serif text-2xl font-semibold mt-4 mb-1">Pedido #{pedido.numero || '—'}</h2>
      <p className="text-creamsoft mb-1.5">{negocio.nombre} · <b className="font-mono">{fmt$(pedido.total)}</b></p>

      {/* Resumen de entrega en tracking */}
      <div className="my-3 p-3 bg-paper border border-line rounded text-xs text-left">
        <div className="flex items-center gap-1.5 font-semibold text-cream">
          <span>{esDomicilio ? '🛵 Domicilio' : '🍽️ En local / Para llevar'}</span>
          <span className="text-creamsoft">· {pedido.cliente}</span>
        </div>
        {esDomicilio && (
          <div className="mt-1.5 text-creamsoft space-y-0.5">
            {pedido.direccion && <div>📍 <b>Dirección:</b> {pedido.direccion}</div>}
            {pedido.telefono && <div>📞 <b>Teléfono:</b> {pedido.telefono}</div>}
            {pedido.notas_entrega && <div className="italic">📝 <b>Indicaciones:</b> "{pedido.notas_entrega}"</div>}
          </div>
        )}
      </div>

      {items.length > 0 && (
        <div className="text-left border border-line rounded-sm mb-5 mt-3 divide-y divide-line">
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
        <p className="text-creamsoft text-[12px] mb-4">{t.customer.cancelledDescription}</p>
      ) : (
        <p className="text-creamsoft text-[12px] mb-4">{t.customer.trackingDescription}</p>
      )}

      {puedeModificar && (
        <div className="flex gap-2.5 mb-3">
          <Btn variant="ghost" className="flex-1 justify-center" onClick={() => setModal('editar')}>✏️ {t.customer.edit}</Btn>
          <Btn variant="danger" className="flex-1 justify-center" onClick={() => setModal('cancelar')}>❌ {t.customer.cancel}</Btn>
        </div>
      )}

      <Btn variant="primary" className="w-full justify-center" onClick={onNuevo}>{t.customer.newOrder}</Btn>

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
