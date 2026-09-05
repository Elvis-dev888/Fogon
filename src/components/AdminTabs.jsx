 import { useState } from 'react'
import { Btn, Card, StatCard, Pill, Modal, Field, Input, Select, Textarea, Empty } from './ui'
import { fmt$, fmtDate, fmtDateLong, fmtMonthLabel, sameMonth, dateStr, monthStr, todayStr, ESTADOS, thumbFor } from '../lib/helpers'
import { getSubscriptionSummary, formatDaysLeft } from '../lib/subscription'
import {
  createCategoria, deleteCategoria, createProducto, updateProducto, deleteProducto, subirFotoProducto,
  createIngrediente, updateIngrediente, deleteIngrediente, setIngredienteStock, registrarCompra, deleteCompra, registrarVentaInventario,
  avanzarEstadoPedido, actualizarPedido, cancelarPedido,
  createTrabajador, updateTrabajador, deleteTrabajador, toggleTrabajadorEstado, registrarPago, deletePago,
  createIngreso, deleteIngreso, createEgreso, deleteEgreso,
  updateNegocio, subirLogoNegocio, updateCapitalInicial,
} from '../lib/api'
import { EditarPedidoModal, ConfirmCancelModal } from './PedidoCompartido'
import { useLanguage } from '../lib/i18n.jsx'

const estadoTone = (e) => (
  e === 'Pendiente' ? 'default' : e === 'En preparación' ? 'preparacion' : e === 'Listo' ? 'listo' : e === 'Cancelado' ? 'cancelado' : 'entregado'
)

/* ---------------- Mi negocio (logo + datos básicos) ---------------- */
export function TabMiNegocio({ negocio, notify, onNegocioUpdated, onOpenShareMenu }) {
  const [nombre, setNombre] = useState(negocio.nombre || '')
  const [slogan, setSlogan] = useState(negocio.slogan || '')
  const [descripcion, setDescripcion] = useState(negocio.descripcion || '')
  const [modoOperacion, setModoOperacion] = useState(negocio.modo_operacion || 'catalogo')
  const [preview, setPreview] = useState(negocio.logo_url || null)
  const [archivo, setArchivo] = useState(null)
  const [guardando, setGuardando] = useState(false)
  const [subiendo, setSubiendo] = useState(false)
  const esModoInventario = modoOperacion === 'inventario'

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
      const cambios = { nombre, slogan, descripcion, logo_url: logoUrl, modo_operacion: modoOperacion }
      await updateNegocio(negocio.id, cambios)
      notify('Datos del negocio actualizados')
      if (onNegocioUpdated) await onNegocioUpdated(cambios)
    } finally {
      setGuardando(false)
    }
  }

  return (
    <div>
      <SectionTitle title="Mi negocio" sub={modoOperacion === 'inventario' ? 'Datos y configuración de tu espacio de inventario.' : 'El logo y los datos que ven tus clientes en el catálogo.'} />

      {!esModoInventario && onOpenShareMenu && (
        <div className="mb-6 p-4 rounded bg-paper2 border border-gold/40 flex items-center justify-between gap-3 flex-wrap max-w-[520px]">
          <div>
            <span className="text-[11px] font-semibold uppercase tracking-wider text-gold flex items-center gap-1.5">
              🔗 Menú Digital & Código QR
            </span>
            <p className="text-xs text-cream mt-0.5 font-medium">
              Enlace público y código QR para tus clientes
            </p>
          </div>
          <Btn size="sm" variant="avocado" onClick={onOpenShareMenu}>
            📱 Abrir y Compartir
          </Btn>
        </div>
      )}

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
          <Field label="Modo de uso">
            <Select value={modoOperacion} onChange={(e) => setModoOperacion(e.target.value)}>
              <option value="catalogo">Catálogo y pedidos</option>
              <option value="inventario">Inventario y utilidades</option>
            </Select>
            <p className="mt-1.5 text-[11.5px] text-creamsoft">
              {modoOperacion === 'inventario'
                ? 'Oculta catálogo, productos, pedidos y ventas. Conserva inventario, compras, ingresos, gastos, trabajadores y estadísticas.'
                : 'Muestra el catálogo público y habilita la gestión de pedidos y ventas.'}
            </p>
          </Field>
          <Btn variant="primary" className="w-full justify-center" disabled={guardando}>
            {subiendo ? 'Subiendo logo…' : guardando ? 'Guardando…' : 'Guardar cambios'}
          </Btn>
        </form>
      </Card>
    </div>
  )
}

export function TabMiSuscripcion({ negocio }) {
  const summary = getSubscriptionSummary(negocio)
  const estadoTone = summary.isTrialActive ? 'activo' : summary.isTrialExpired ? 'pausado' : 'activo'

  return (
    <div>
      <SectionTitle
        title="Mi suscripción"
        sub="Período de prueba de 6 meses con acceso completo. Sin cobros automáticos ni tarjetas requeridas durante el trial."
      />
      <Card className="p-6">
        <div className="flex flex-col gap-4 md:flex-row md:items-center md:justify-between">
          <div>
            <p className="text-[11px] uppercase tracking-wider text-creamsoft mb-1">Plan actual</p>
            <h3 className="font-serif text-2xl text-gold">{summary.plan}</h3>
            <p className="text-sm text-creamsoft mt-1">Acceso {summary.accessGranted ? 'completo a todas las funciones' : 'pendiente de suscripción'}</p>
          </div>
          <Pill tone={estadoTone}>{summary.statusLabel}</Pill>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-3 gap-3 mt-6">
          <StatCard label="Estado" value={summary.statusLabel} tone={summary.isTrialActive ? 'sage' : 'wine'} />
          <StatCard label="Inicio del trial" value={summary.trialStartedAt ? fmtDate(summary.trialStartedAt) : '—'} tone="gold" />
          <StatCard label="Fin del trial" value={summary.trialEndsAt ? fmtDate(summary.trialEndsAt) : '—'} tone="champagne" />
        </div>

        <div className="mt-6 border border-line rounded p-4 bg-paper">
          {summary.isTrialActive ? (
            <>
              <p className="text-[11px] uppercase tracking-wider text-creamsoft mb-2">Período de prueba gratuito (6 meses)</p>
              <p className="font-semibold text-cream">🎉 Estás disfrutando de Kiosko Pro gratis con acceso total.</p>
              <p className="text-sm text-creamsoft mt-2">
                Tienes acceso completo a todas las funciones durante tu período de prueba de 180 días. Te quedan {formatDaysLeft(summary.remainingDays)}. No se aplican cargos automáticos.
              </p>
            </>
          ) : summary.isTrialExpired ? (
            <>
              <p className="text-[11px] uppercase tracking-wider text-creamsoft mb-2">Renovación de suscripción</p>
              <p className="font-semibold text-wine">🔴 Tu período gratuito de 6 meses ha finalizado.</p>
              <p className="text-sm text-creamsoft mt-2">
                Para continuar utilizando todas las herramientas avanzadas, puedes suscribirte a Kiosko Pro por $4.99 USD/mes.
              </p>
              <div className="mt-4">
                <Btn variant="primary" className="justify-center">Suscribirme a Kiosko Pro</Btn>
              </div>
            </>
          ) : (
            <>
              <p className="text-[11px] uppercase tracking-wider text-creamsoft mb-2">Suscripción activa</p>
              <p className="font-semibold text-cream">✅ Tu negocio tiene acceso completo a Kiosko Pro.</p>
              <p className="text-sm text-creamsoft mt-2">Próxima renovación: {summary.renewedAt ? fmtDate(summary.renewedAt) : 'Sin fecha registrada aún'}.</p>
            </>
          )}
        </div>
      </Card>
    </div>
  )
}

/* ---------------- Dashboard ---------------- */
export function TabDashboard({ negocio, data, onOpenShareMenu }) {
  const esModoInventario = negocio.modo_operacion === 'inventario'
  const ventasMes = data.ventas.filter((v) => sameMonth(v.creado_en)).reduce((a, v) => a + v.total, 0)
  const ingresosMes = data.ingresos.filter((i) => sameMonth(i.creado_en)).reduce((a, i) => a + i.valor, 0)
  const comprasMes = data.compras.filter((c) => sameMonth(c.creado_en)).reduce((a, c) => a + c.valor, 0)
  const pagosMes = data.trabajadores.flatMap((w) => w.pagos).filter((p) => sameMonth(p.creado_en)).reduce((a, p) => a + p.valor, 0)
  const otrosMes = data.egresos.filter((e) => sameMonth(e.creado_en)).reduce((a, e) => a + e.valor, 0)
  const entradasMes = esModoInventario ? ingresosMes : ventasMes
  const resultado = entradasMes - (comprasMes + pagosMes + otrosMes)
  const pendientes = data.pedidos.filter((p) => p.estado !== 'Entregado' && p.estado !== 'Cancelado').length
  const lowStock = data.ingredientes.filter((i) => i.stock <= i.minimo)

  return (
    <div>
      <SectionTitle title={esModoInventario ? 'Resumen de inventario' : 'Resumen del mes'} sub={new Date().toLocaleDateString('es-CO', { month: 'long', year: 'numeric' })} />

      {!esModoInventario && onOpenShareMenu && (
        <div className="mb-6 p-4 rounded bg-paper2 border border-gold/30 flex items-center justify-between gap-3 flex-wrap">
          <div className="flex items-center gap-3">
            <span className="text-2xl">📱</span>
            <div>
              <h4 className="font-serif text-sm font-semibold text-cream">Menú Digital & QR para tus clientes</h4>
              <p className="text-xs text-creamsoft">
                Tus clientes pueden ver tu catálogo en vivo y hacer pedidos desde su celular.
              </p>
            </div>
          </div>
          <Btn size="sm" variant="avocado" onClick={onOpenShareMenu}>
            🔗 Ver enlace y Código QR
          </Btn>
        </div>
      )}

      <div className="grid grid-cols-[repeat(auto-fit,minmax(180px,1fr))] gap-3.5 mb-6">
        <StatCard label={esModoInventario ? 'Ingresos registrados' : 'Ventas'} value={fmt$(entradasMes)} tone="gold" />
        <StatCard label="Compras" value={fmt$(comprasMes)} tone="champagne" />
        <StatCard label="Pagos a trabajadores" value={fmt$(pagosMes)} />
        <StatCard label="Otros gastos" value={fmt$(otrosMes)} />
        <StatCard label="Resultado aprox." value={fmt$(resultado)} tone="sage" />
      </div>
      <div className="grid grid-cols-[1.3fr_.9fr] gap-4 max-[820px]:grid-cols-1">
        {esModoInventario ? (
          <Card className="p-5">
            <h3 className="font-serif text-lg font-semibold mb-3">Operación de inventario</h3>
            <p className="text-creamsoft text-[13.5px] mb-3">Registra cada venta o entrada de dinero en “Ingresos / Egresos” para que la utilidad mensual sea precisa.</p>
            <div className="grid grid-cols-2 gap-3 text-[13px]">
              <div className="rounded border border-line bg-paper p-3"><span className="block text-creamsoft text-[11px]">Existencias</span><b className="font-mono text-gold">{data.ingredientes.length}</b></div>
              <div className="rounded border border-line bg-paper p-3"><span className="block text-creamsoft text-[11px]">Compras este mes</span><b className="font-mono text-gold">{fmt$(comprasMes)}</b></div>
            </div>
          </Card>
        ) : (
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
        )}
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
  const { t } = useLanguage()
  const [modal, setModal] = useState(null) // null | 'new' | 'new-adicion' | producto object
  const menu = data.productos.filter((p) => !p.es_adicion)
  const adicionales = data.productos.filter((p) => p.es_adicion)

  return (
    <div>
      <SectionTitle title={t.catalogAdmin.products} sub={t.catalogAdmin.catalogDescription.replace('{business}', negocio.nombre).replace('{count}', menu.length)}
        action={<Btn variant="primary" onClick={() => setModal('new')}>➕ {t.catalogAdmin.newProduct}</Btn>} />
      <div className="grid grid-cols-[repeat(auto-fill,minmax(240px,1fr))] gap-4">
        {menu.map((p) => (
          <ProductoCard key={p.id} p={p}
            onToggle={async () => { await updateProducto(p.id, { disponible: !p.disponible }); notify(`${p.nombre} ${p.disponible ? 'marcado como agotado' : 'disponible de nuevo'}`); reload() }}
            onEdit={() => setModal(p)}
            onDelete={async () => { await deleteProducto(p.id); notify(t.catalogAdmin.deleted); reload() }}
          />
        ))}
      </div>

      <div className="mt-10">
        <SectionTitle title={t.catalogAdmin.additionals} sub={t.catalogAdmin.additionsDescription}
          action={<Btn size="sm" variant="mustard" onClick={() => setModal('new-adicion')}>➕ {t.catalogAdmin.newAdditional}</Btn>} />
        {adicionales.length === 0 ? (
          <Empty icon="➕">{t.catalogAdmin.noAdditions}</Empty>
        ) : (
          <div className="grid grid-cols-[repeat(auto-fill,minmax(200px,1fr))] gap-3">
            {adicionales.map((a) => (
              <div key={a.id} className="border border-line rounded p-3.5 bg-paper2">
                <div className="flex justify-between items-start mb-1">
                  <h4 className="font-semibold text-[14px]">{a.nombre}</h4>
                  {!a.disponible && <Pill tone="cancelado">{t.catalogAdmin.inactive}</Pill>}
                </div>
                <div className="font-mono font-bold text-champagne text-[13px] mb-2.5">+ {fmt$(a.precio)}</div>
                <div className="flex gap-1.5 flex-wrap">
                  <Btn size="sm" variant="ghost" onClick={async () => { await updateProducto(a.id, { disponible: !a.disponible }); notify(`${a.nombre} ${a.disponible ? 'desactivado' : 'activado'}`); reload() }}>
                    {a.disponible ? 'Desactivar' : 'Activar'}
                  </Btn>
                  <Btn size="sm" variant="ghost" onClick={() => setModal(a)}>{t.catalogAdmin.edit}</Btn>
                  <Btn size="sm" variant="danger" onClick={async () => { await deleteProducto(a.id); notify(t.catalogAdmin.additionalDeleted); reload() }}>{t.catalogAdmin.remove}</Btn>
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
          onSaved={() => { setModal(null); notify(typeof modal === 'string' ? t.catalogAdmin.created : t.catalogAdmin.updated); reload() }}
        />
      )}
    </div>
  )
}

function ProductoCard({ p, onToggle, onEdit, onDelete }) {
  const { t } = useLanguage()
  return (
    <div className="group border border-line rounded overflow-hidden bg-paper2 hover:border-gold transition-colors relative">
      {!p.disponible && <span className="absolute top-2 right-2 text-[9.5px] font-bold px-2 py-1 rounded-full bg-paper text-creamsoft border border-line uppercase">{t.catalogAdmin.outOfStock}</span>}
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
            {p.stock === 0 ? t.catalogAdmin.noStock : t.catalogAdmin.remaining.replace('{count}', p.stock)}
          </div>
        )}
        <div className="flex gap-1.5 flex-wrap">
          <Btn size="sm" variant="ghost" onClick={onToggle}>{p.disponible ? t.catalogAdmin.markOut : t.catalogAdmin.reactivate}</Btn>
          <Btn size="sm" variant="ghost" onClick={onEdit}>{t.catalogAdmin.edit}</Btn>
          <Btn size="sm" variant="danger" onClick={onDelete}>{t.catalogAdmin.remove}</Btn>
        </div>
      </div>
    </div>
  )
}

function ProductoModal({ negocio, categorias, producto, esAdicionDefault, onClose, onSaved }) {
  const { t } = useLanguage()
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
        <h2 className="font-serif text-xl font-semibold mb-1">{producto ? t.catalogAdmin.editAdditional : t.catalogAdmin.newAdditional}</h2>
        <p className="text-creamsoft text-[13px] mb-4">{t.catalogAdmin.additionsDescription}</p>
        <form onSubmit={submit}>
          <Field label={t.catalogAdmin.product}><Input required value={nombre} onChange={(e) => setNombre(e.target.value)} placeholder="Ej: Queso, Jamón, Huevo" /></Field>
          <Field label={t.catalogAdmin.addPrice}><Input required type="number" value={precio} onChange={(e) => setPrecio(e.target.value)} /></Field>
          <Btn variant="primary" className="w-full justify-center" disabled={saving}>
            {saving ? t.catalogAdmin.saving : producto ? t.orderShared.save : t.catalogAdmin.createAdditional}
          </Btn>
        </form>
      </Modal>
    )
  }

  return (
    <Modal onClose={onClose}>
      <h2 className="font-serif text-xl font-semibold mb-4">{producto ? t.catalogAdmin.editProduct : t.catalogAdmin.newProduct}</h2>
      <form onSubmit={submit}>
        <Field label={t.catalogAdmin.photo}>
          <div className="flex items-center gap-3">
            <div className="w-16 h-16 rounded border border-line overflow-hidden flex items-center justify-center text-2xl bg-paper shrink-0">
              {preview ? <img src={preview} alt="" className="w-full h-full object-cover" /> : emoji}
            </div>
            <label className="text-[12.5px] text-gold cursor-pointer hover:text-champagne">
              {preview ? t.catalogAdmin.changePhoto : t.catalogAdmin.uploadPhoto}
              <input type="file" accept="image/*" className="hidden" onChange={onPickFile} />
            </label>
          </div>
        </Field>
        <Field label="Nombre"><Input required value={nombre} onChange={(e) => setNombre(e.target.value)} /></Field>
        <div className="grid grid-cols-2 gap-3">
          <Field label={t.catalogAdmin.category}>
            <Select value={categoria} onChange={(e) => setCategoria(e.target.value)}>
              {categorias.map((c) => <option key={c.id}>{c.nombre}</option>)}
            </Select>
          </Field>
          <Field label={t.catalogAdmin.price}><Input required type="number" value={precio} onChange={(e) => setPrecio(e.target.value)} /></Field>
        </div>
        <Field label={t.catalogAdmin.description}><Textarea rows={2} value={desc} onChange={(e) => setDesc(e.target.value)} /></Field>
        <Field label={t.catalogAdmin.icon}><Input maxLength={2} value={emoji} onChange={(e) => setEmoji(e.target.value)} /></Field>
        <Field label={t.catalogAdmin.stock}>
          <Input type="number" min="0" placeholder={t.catalogAdmin.unlimited} value={stock} onChange={(e) => setStock(e.target.value)} />
        </Field>
        <Btn variant="primary" className="w-full justify-center" disabled={saving}>
          {subiendo ? t.catalogAdmin.uploading : saving ? t.catalogAdmin.saving : producto ? t.orderShared.save : t.catalogAdmin.createProduct}
        </Btn>
      </form>
    </Modal>
  )
}

/* ---------------- Categorías ---------------- */
export function TabCategorias({ negocio, data, reload, notify }) {
  const { t } = useLanguage()
  const [nombre, setNombre] = useState('')

  async function add() {
    if (!nombre.trim()) return
    await createCategoria(negocio.id, nombre.trim())
    setNombre('')
    notify(t.inventory.categoryAdded)
    reload()
  }
  async function remove(cat) {
    if (data.productos.some((p) => p.categoria === cat.nombre)) {
      notify(t.inventory.cannotDelete)
      return
    }
    await deleteCategoria(cat.id)
    reload()
  }

  return (
    <div>
      <SectionTitle title={t.inventory.categories} sub={t.inventory.categoriesDescription.replace('{business}', negocio.nombre)} />
      <Card className="p-5 mb-4">
        <div className="flex gap-3 items-end">
          <div className="flex-1"><Field label={t.inventory.newCategory}><Input value={nombre} onChange={(e) => setNombre(e.target.value)} placeholder={t.inventory.categoryPlaceholder} /></Field></div>
          <Btn variant="mustard" onClick={add}>{t.inventory.add}</Btn>
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
  const { t } = useLanguage()
  const [modal, setModal] = useState(false)
  const [ajuste, setAjuste] = useState(null)
  const [editar, setEditar] = useState(null)
  const [venta, setVenta] = useState(null)
  const esModoInventario = negocio.modo_operacion === 'inventario'

  const totalArticulos = data.ingredientes.length
  const valorTotalInventario = data.ingredientes.reduce(
    (acc, i) => acc + ((Number(i.stock) || 0) * (Number(i.costo_unitario) || 0)),
    0
  )
  const articulosBajoStock = data.ingredientes.filter((i) => (Number(i.stock) || 0) <= (Number(i.minimo) || 0)).length

  return (
    <div>
      <SectionTitle
        title={esModoInventario ? t.inventory.warehouseInventory : t.inventory.inventory}
        sub={esModoInventario ? t.inventory.warehouseInventoryDescription : t.inventory.inventoryDescription}
        action={
          <div className="flex gap-2 flex-wrap">
            <Btn variant="primary" onClick={() => setModal(true)}>
              ➕ {esModoInventario ? t.inventory.newItem : t.inventory.newIngredient}
            </Btn>
            {data.ingredientes.length > 0 && (
              <Btn variant="mustard" onClick={() => setVenta(data.ingredientes[0])}>
                💸 {t.inventory.quickSale}
              </Btn>
            )}
          </div>
        }
      />

      <div className="grid grid-cols-[repeat(auto-fit,minmax(180px,1fr))] gap-3.5 mb-6">
        <StatCard label={t.inventory.totalItems} value={totalArticulos} />
        <StatCard label={t.inventory.totalInventoryValue} value={fmt$(valorTotalInventario)} tone="gold" />
        <StatCard
          label={t.inventory.lowStockItems}
          value={articulosBajoStock}
          tone={articulosBajoStock > 0 ? 'pausado' : 'listo'}
        />
      </div>

      <Card className="p-5">
        {data.ingredientes.length === 0 ? (
          <Empty icon="📦">
            {esModoInventario
              ? 'Aún no has registrado artículos en el inventario. Agrega el primero con el botón de arriba.'
              : 'Aún no hay ingredientes registrados.'}
          </Empty>
        ) : esModoInventario ? (
          <Table
            head={[
              t.inventory.item,
              t.inventory.supplies,
              t.inventory.cost,
              t.inventory.salePrice,
              t.inventory.margin,
              t.inventory.minimum,
              t.inventory.status,
              '',
            ]}
            rows={data.ingredientes.map((i) => {
              const costo = Number(i.costo_unitario) || 0
              const precio = Number(i.precio_venta) || 0
              const margen = precio - costo
              const margenPct = costo > 0 ? Math.round((margen / costo) * 100) : (precio > 0 ? 100 : 0)

              return [
                <div>
                  <b className="text-cream">{i.nombre}</b>
                  <span className="block text-[11px] text-creamsoft">{i.unidad}</span>
                </div>,
                <span className="font-mono font-semibold">{i.stock} {i.unidad}</span>,
                <span className="font-mono">{costo > 0 ? fmt$(costo) : '—'}</span>,
                <span className="font-mono">{precio > 0 ? fmt$(precio) : '—'}</span>,
                precio > 0 || costo > 0 ? (
                  <span className={`font-mono text-xs ${margen >= 0 ? 'text-gold' : 'text-wine'}`}>
                    {fmt$(margen)} {costo > 0 ? `(${margenPct}%)` : ''}
                  </span>
                ) : (
                  <span className="text-creamsoft">—</span>
                ),
                <span className="font-mono text-creamsoft">{i.minimo} {i.unidad}</span>,
                i.stock <= i.minimo ? <Pill tone="pausado">{t.inventory.low}</Pill> : <Pill tone="listo">OK</Pill>,
                <div className="flex items-center gap-1 justify-end">
                  <Btn size="sm" variant="ghost" title={t.inventory.adjustStock} onClick={() => setAjuste(i)}>⚡</Btn>
                  <Btn size="sm" variant="ghost" title={t.inventory.edit} onClick={() => setEditar(i)}>✏️</Btn>
                  <Btn size="sm" variant="mustard" title={t.inventory.quickSale} onClick={() => setVenta(i)}>💸</Btn>
                </div>,
              ]
            })}
          />
        ) : (
          <Table
            head={[t.inventory.ingredient, t.inventory.supplies, t.inventory.minimum, t.inventory.status, '']}
            rows={data.ingredientes.map((i) => [
              <b>{i.nombre}</b>,
              <span className="font-mono">{i.stock} {i.unidad}</span>,
              <span className="font-mono">{i.minimo} {i.unidad}</span>,
              i.stock <= i.minimo ? <Pill tone="pausado">{t.inventory.low}</Pill> : <Pill tone="listo">OK</Pill>,
              <div className="flex gap-1.5 justify-end">
                <Btn size="sm" variant="ghost" onClick={() => setAjuste(i)}>{t.inventory.adjust}</Btn>
                <Btn size="sm" variant="ghost" onClick={() => setEditar(i)}>✏️</Btn>
              </div>,
            ])}
          />
        )}
      </Card>

      {modal && (
        <IngredienteModal
          negocio={negocio}
          esModoInventario={esModoInventario}
          onClose={() => setModal(false)}
          onSaved={() => {
            setModal(false)
            notify(esModoInventario ? t.inventory.itemAdded : t.inventory.ingredientAdded)
            reload()
          }}
        />
      )}

      {editar && (
        <EditarIngredienteModal
          ingrediente={editar}
          esModoInventario={esModoInventario}
          onClose={() => setEditar(null)}
          onSaved={() => {
            setEditar(null)
            notify(t.inventory.itemUpdated)
            reload()
          }}
          onDeleted={() => {
            setEditar(null)
            notify(t.inventory.itemDeleted)
            reload()
          }}
        />
      )}

      {ajuste && (
        <AjusteModal
          ingrediente={ajuste}
          onClose={() => setAjuste(null)}
          onSaved={() => {
            setAjuste(null)
            notify(t.inventory.stockUpdated)
            reload()
          }}
        />
      )}

      {venta && (
        <VentaInventarioModal
          negocio={negocio}
          ingredienteInicial={venta}
          ingredientes={data.ingredientes}
          onClose={() => setVenta(null)}
          onSaved={() => {
            setVenta(null)
            notify(t.inventory.saleRegistered)
            reload()
          }}
        />
      )}
    </div>
  )
}

function IngredienteModal({ negocio, esModoInventario, onClose, onSaved }) {
  const { t } = useLanguage()
  const [nombre, setNombre] = useState('')
  const [unidad, setUnidad] = useState('und')
  const [stock, setStock] = useState(0)
  const [costoUnitario, setCostoUnitario] = useState('')
  const [precioVenta, setPrecioVenta] = useState('')
  const [minimo, setMinimo] = useState(1)
  const [guardando, setGuardando] = useState(false)

  async function submit(e) {
    e.preventDefault()
    setGuardando(true)
    try {
      await createIngrediente(negocio.id, {
        nombre: nombre.trim(),
        unidad: unidad.trim() || 'und',
        stock: parseFloat(stock) || 0,
        costo_unitario: parseFloat(costoUnitario) || 0,
        precio_venta: parseFloat(precioVenta) || 0,
        minimo: parseFloat(minimo) || 0,
      })
      onSaved()
    } finally {
      setGuardando(false)
    }
  }

  return (
    <Modal onClose={onClose}>
      <h2 className="font-serif text-xl font-semibold mb-4">
        {esModoInventario ? t.inventory.newItemTitle : t.inventory.newIngredientTitle}
      </h2>
      <form onSubmit={submit}>
        <Field label={esModoInventario ? t.inventory.item : t.catalogAdmin.product}>
          <Input
            required
            value={nombre}
            onChange={(e) => setNombre(e.target.value)}
            placeholder={esModoInventario ? 'Ej: Taladro percutor 1/2, Tornillo drywall 1 pulgada, Camisa Polo XL' : 'Ej: Carne de res, Gaseosa 400ml, Pan de hamburguesa'}
          />
        </Field>
        <div className="grid grid-cols-2 gap-3">
          <Field label={t.inventory.unit}>
            <Input list="unidades-sugeridas" required value={unidad} onChange={(e) => setUnidad(e.target.value)} placeholder="und" />
            <datalist id="unidades-sugeridas">
              <option value="und" /><option value="caja" /><option value="paquete" />
              <option value="display" /><option value="docena" /><option value="kg" />
              <option value="lb" /><option value="g" /><option value="l" /><option value="ml" />
            </datalist>
          </Field>
          <Field label={t.inventory.initialStock}>
            <Input required type="number" step="any" value={stock} onChange={(e) => setStock(e.target.value)} />
          </Field>
        </div>
        <div className="grid grid-cols-2 gap-3">
          <Field label={`${t.inventory.cost} (COP)`}>
            <Input type="number" step="any" placeholder="0" value={costoUnitario} onChange={(e) => setCostoUnitario(e.target.value)} />
          </Field>
          <Field label={`${t.inventory.salePrice} (COP)`}>
            <Input type="number" step="any" placeholder="0" value={precioVenta} onChange={(e) => setPrecioVenta(e.target.value)} />
          </Field>
        </div>
        <Field label={t.inventory.minimumAlert}>
          <Input required type="number" step="any" value={minimo} onChange={(e) => setMinimo(e.target.value)} />
        </Field>
        <Btn variant="primary" className="w-full justify-center" disabled={guardando}>
          {guardando ? 'Guardando…' : esModoInventario ? t.inventory.saveItem : t.inventory.saveIngredient}
        </Btn>
      </form>
    </Modal>
  )
}

function EditarIngredienteModal({ ingrediente, esModoInventario, onClose, onSaved, onDeleted }) {
  const { t } = useLanguage()
  const [nombre, setNombre] = useState(ingrediente.nombre || '')
  const [unidad, setUnidad] = useState(ingrediente.unidad || 'und')
  const [stock, setStock] = useState(ingrediente.stock || 0)
  const [costoUnitario, setCostoUnitario] = useState(ingrediente.costo_unitario || '')
  const [precioVenta, setPrecioVenta] = useState(ingrediente.precio_venta || '')
  const [minimo, setMinimo] = useState(ingrediente.minimo || 0)
  const [guardando, setGuardando] = useState(false)
  const [eliminando, setEliminando] = useState(false)

  async function submit(e) {
    e.preventDefault()
    setGuardando(true)
    try {
      await updateIngrediente(ingrediente.id, {
        nombre: nombre.trim(),
        unidad: unidad.trim() || 'und',
        stock: parseFloat(stock) || 0,
        costo_unitario: parseFloat(costoUnitario) || 0,
        precio_venta: parseFloat(precioVenta) || 0,
        minimo: parseFloat(minimo) || 0,
      })
      onSaved()
    } finally {
      setGuardando(false)
    }
  }

  async function handleDelete() {
    if (!window.confirm(`¿Seguro que deseas eliminar "${ingrediente.nombre}" del inventario?`)) return
    setEliminando(true)
    try {
      await deleteIngrediente(ingrediente.id)
      onDeleted()
    } finally {
      setEliminando(false)
    }
  }

  return (
    <Modal onClose={onClose}>
      <div className="flex items-center justify-between mb-4">
        <h2 className="font-serif text-xl font-semibold">{t.inventory.editItemTitle} — {ingrediente.nombre}</h2>
        <Btn size="sm" variant="danger" type="button" disabled={eliminando || guardando} onClick={handleDelete}>
          {eliminando ? 'Eliminando…' : t.inventory.delete}
        </Btn>
      </div>
      <form onSubmit={submit}>
        <Field label={esModoInventario ? t.inventory.item : t.catalogAdmin.product}>
          <Input required value={nombre} onChange={(e) => setNombre(e.target.value)} />
        </Field>
        <div className="grid grid-cols-2 gap-3">
          <Field label={t.inventory.unit}>
            <Input required value={unidad} onChange={(e) => setUnidad(e.target.value)} />
          </Field>
          <Field label={t.inventory.supplies}>
            <Input required type="number" step="any" value={stock} onChange={(e) => setStock(e.target.value)} />
          </Field>
        </div>
        <div className="grid grid-cols-2 gap-3">
          <Field label={`${t.inventory.cost} (COP)`}>
            <Input type="number" step="any" value={costoUnitario} onChange={(e) => setCostoUnitario(e.target.value)} />
          </Field>
          <Field label={`${t.inventory.salePrice} (COP)`}>
            <Input type="number" step="any" value={precioVenta} onChange={(e) => setPrecioVenta(e.target.value)} />
          </Field>
        </div>
        <Field label={t.inventory.minimumAlert}>
          <Input required type="number" step="any" value={minimo} onChange={(e) => setMinimo(e.target.value)} />
        </Field>
        <Btn variant="primary" className="w-full justify-center" disabled={guardando || eliminando}>
          {guardando ? 'Guardando…' : t.inventory.save}
        </Btn>
      </form>
    </Modal>
  )
}

function AjusteModal({ ingrediente, onClose, onSaved }) {
  const { t } = useLanguage()
  const [stock, setStock] = useState(ingrediente.stock)
  async function submit(e) {
    e.preventDefault()
    await setIngredienteStock(ingrediente.id, parseFloat(stock) || 0)
    onSaved()
  }
  return (
    <Modal onClose={onClose}>
      <h2 className="font-serif text-xl font-semibold mb-4">{t.inventory.adjustStock} — {ingrediente.nombre}</h2>
      <form onSubmit={submit}>
        <Field label={`${t.inventory.newAmount} (${ingrediente.unidad})`}><Input required type="number" step="any" value={stock} onChange={(e) => setStock(e.target.value)} /></Field>
        <Btn variant="primary" className="w-full justify-center">{t.inventory.save}</Btn>
      </form>
    </Modal>
  )
}

function VentaInventarioModal({ negocio, ingredienteInicial, ingredientes, onClose, onSaved }) {
  const { t } = useLanguage()
  const [ingId, setIngId] = useState(ingredienteInicial?.id || ingredientes[0]?.id || '')
  const [cantidad, setCantidad] = useState(1)
  const ing = ingredientes.find((i) => i.id === ingId) || ingredienteInicial
  const [precioUnitario, setPrecioUnitario] = useState(ing?.precio_venta || '')
  const [concepto, setConcepto] = useState('')
  const [guardando, setGuardando] = useState(false)

  function onSelectIng(id) {
    setIngId(id)
    const selected = ingredientes.find((i) => i.id === id)
    if (selected && selected.precio_venta > 0) {
      setPrecioUnitario(selected.precio_venta)
    }
  }

  const cantNum = parseFloat(cantidad) || 0
  const precioNum = parseFloat(precioUnitario) || 0
  const totalCobrar = cantNum * precioNum
  const costoTotal = cantNum * (Number(ing?.costo_unitario) || 0)
  const ganancia = totalCobrar - costoTotal

  async function submit(e) {
    e.preventDefault()
    if (!ing) return
    setGuardando(true)
    try {
      const desc = concepto.trim() || `Venta de ${cantNum} ${ing.unidad} de ${ing.nombre}`
      await registrarVentaInventario(negocio.id, {
        ingredienteId: ing.id,
        cantidad: cantNum,
        precioUnitario: precioNum,
        concepto: desc,
      }, ing.stock)
      onSaved()
    } finally {
      setGuardando(false)
    }
  }

  return (
    <Modal onClose={onClose}>
      <h2 className="font-serif text-xl font-semibold mb-1">{t.inventory.saleTitle}</h2>
      <p className="text-creamsoft text-[13px] mb-4">{t.inventory.saleDescription}</p>
      <form onSubmit={submit}>
        <Field label={t.inventory.item}>
          <Select value={ingId} onChange={(e) => onSelectIng(e.target.value)}>
            {ingredientes.map((i) => (
              <option key={i.id} value={i.id}>
                {i.nombre} (Stock: {i.stock} {i.unidad})
              </option>
            ))}
          </Select>
        </Field>

        {ing && (
          <div className="flex items-center justify-between text-xs text-creamsoft bg-paper p-2.5 rounded border border-line mb-3">
            <span>Stock disponible: <b className="font-mono text-cream">{ing.stock} {ing.unidad}</b></span>
            {ing.costo_unitario > 0 && <span>Costo compra: <b className="font-mono text-gold">{fmt$(ing.costo_unitario)}</b></span>}
          </div>
        )}

        <div className="grid grid-cols-2 gap-3">
          <Field label={`${t.inventory.saleQty}${ing ? ` (${ing.unidad})` : ''}`}>
            <Input required type="number" step="any" min="0.01" value={cantidad} onChange={(e) => setCantidad(e.target.value)} />
          </Field>
          <Field label={t.inventory.salePriceLabel}>
            <Input required type="number" step="any" value={precioUnitario} onChange={(e) => setPrecioUnitario(e.target.value)} />
          </Field>
        </div>

        <Field label="Concepto / Nota (opcional)">
          <Input value={concepto} onChange={(e) => setConcepto(e.target.value)} placeholder={`Ej: Venta ${ing?.nombre || ''}`} />
        </Field>

        <div className="rounded-lg border border-line bg-paper/60 p-3.5 mb-4 text-[13px] space-y-1.5">
          <div className="flex justify-between">
            <span className="text-creamsoft">{t.inventory.totalToCollect}:</span>
            <b className="font-mono text-gold text-base">{fmt$(totalCobrar)}</b>
          </div>
          {costoTotal > 0 && (
            <div className="flex justify-between text-xs text-creamsoft">
              <span>Utilidad / Margen estimado:</span>
              <span className={`font-mono ${ganancia >= 0 ? 'text-sage' : 'text-wine'}`}>{fmt$(ganancia)}</span>
            </div>
          )}
          {ing && (
            <div className="flex justify-between text-xs text-creamsoft">
              <span>Stock restante:</span>
              <span className="font-mono">{Math.max(0, ing.stock - cantNum)} {ing.unidad}</span>
            </div>
          )}
        </div>

        <Btn variant="primary" className="w-full justify-center" disabled={guardando || cantNum <= 0}>
          {guardando ? 'Registrando…' : t.inventory.confirmSale}
        </Btn>
      </form>
    </Modal>
  )
}

/* ---------------- Compras ---------------- */
export function TabCompras({ negocio, data, reload, notify }) {
  const { t } = useLanguage()
  const [modal, setModal] = useState(false)
  return (
    <div>
      <SectionTitle title={t.finance.purchases} sub={t.finance.purchasesDescription}
        action={<Btn variant="primary" onClick={() => setModal(true)}>➕ {t.finance.registerPurchase}</Btn>} />
      <Card className="p-5">
        {data.compras.length === 0 ? <Empty>{t.finance.noPurchases}</Empty> : (
          <Table
            head={[t.finance.date, t.finance.ingredient, t.finance.quantity, 'Costo unitario', t.finance.value]}
            rows={data.compras.map((c) => {
              const cant = Number(c.cantidad) || 0
              const val = Number(c.valor) || 0
              const costoUnit = cant > 0 ? val / cant : 0
              return [
                <span className="font-mono">{fmtDate(c.creado_en)}</span>,
                c.ingredientes?.nombre || '—',
                <span className="font-mono">{c.cantidad} {c.ingredientes?.unidad || ''}</span>,
                <span className="font-mono text-creamsoft">{fmt$(costoUnit)}</span>,
                <span className="font-mono font-semibold text-gold">{fmt$(val)}</span>,
              ]
            })}
          />
        )}
      </Card>
      {modal && (
        <CompraModal negocio={negocio} ingredientes={data.ingredientes} onClose={() => setModal(false)}
          onSaved={() => { setModal(false); notify(t.finance.purchaseRegistered); reload() }} />
      )}
    </div>
  )
}
function CompraModal({ negocio, ingredientes, onClose, onSaved }) {
  const { t } = useLanguage()
  const [ingId, setIngId] = useState(ingredientes[0]?.id || '')
  const [cantidad, setCantidad] = useState(1)
  const [valor, setValor] = useState('')
  const ing = ingredientes.find((i) => i.id === ingId)
  async function submit(e) {
    e.preventDefault()
    await registrarCompra(
      negocio.id,
      { ingredienteId: ingId, cantidad: parseFloat(cantidad) || 0, valor: parseFloat(valor) || 0 },
      ing?.stock || 0,
      ing?.costo_unitario || 0
    )
    onSaved()
  }
  return (
    <Modal onClose={onClose}>
      <h2 className="font-serif text-xl font-semibold mb-1">{t.finance.purchaseTitle}</h2>
      <p className="text-creamsoft text-[13px] mb-4">{t.finance.purchaseDescription}</p>
      <form onSubmit={submit}>
        <Field label={t.finance.ingredient}>
          <Select value={ingId} onChange={(e) => setIngId(e.target.value)}>
            {ingredientes.map((i) => <option key={i.id} value={i.id}>{i.nombre}</option>)}
          </Select>
        </Field>
        {ing && (
          <p className="text-creamsoft text-[12px] -mt-2 mb-3">
            {t.finance.currentStock}: <b className="font-mono">{ing.stock} {ing.unidad}</b>
            {ing.costo_unitario > 0 && <span className="ml-3">Costo actual: <b className="font-mono text-gold">{fmt$(ing.costo_unitario)}</b></span>}
          </p>
        )}
        <div className="grid grid-cols-2 gap-3">
          <Field label={`${t.finance.purchasedQuantity}${ing ? ` (${ing.unidad})` : ''}`}>
            <Input required type="number" step="any" value={cantidad} onChange={(e) => setCantidad(e.target.value)} />
          </Field>
          <Field label={t.finance.totalPaid}><Input required type="number" value={valor} onChange={(e) => setValor(e.target.value)} /></Field>
        </div>
        <p className="text-creamsoft text-[12px] -mt-2 mb-3.5">
          La cantidad va en la misma unidad del ingrediente o artículo. El costo unitario se actualizará automáticamente en el inventario.
        </p>
        <Btn variant="primary" className="w-full justify-center">{t.finance.register}</Btn>
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
                  <div className="flex items-center justify-between gap-1 mb-1">
                    <span className="font-semibold text-cream truncate">
                      <b className="font-mono text-gold">#{p.numero}</b> · {p.cliente}
                    </span>
                    <span className={`text-[10px] font-semibold px-1.5 py-0.5 rounded border shrink-0 ${
                      p.tipo_entrega === 'domicilio'
                        ? 'bg-gold/15 text-gold border-gold/30'
                        : 'bg-paper2 text-creamsoft border-line'
                    }`}>
                      {p.tipo_entrega === 'domicilio' ? '🛵 Domicilio' : '🍽️ Local'}
                    </span>
                  </div>

                  {p.tipo_entrega === 'domicilio' && (
                    <div className="my-1.5 p-2 bg-paper2/80 rounded border border-line text-[11px] text-creamsoft space-y-0.5">
                      {p.direccion && <div className="text-cream font-medium">📍 {p.direccion}</div>}
                      {p.telefono && (
                        <div>
                          📞 <a href={`https://wa.me/${p.telefono.replace(/\D/g, '')}`} target="_blank" rel="noreferrer" className="text-gold hover:underline font-mono">
                            {p.telefono}
                          </a>
                        </div>
                      )}
                      {p.notas_entrega && <div className="italic text-[10.5px]">"{p.notas_entrega}"</div>}
                    </div>
                  )}

                  <div className="my-1.5 text-creamsoft">{(p.pedido_items || []).map((it) => `${it.cantidad}× ${it.nombre}`).join(', ')}</div>
                  <div className="flex justify-between items-center mt-2">
                    <span className="font-mono text-gold font-semibold">{fmt$(p.total)}</span>
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
                  <div className="flex items-center justify-between gap-1 mb-1">
                    <span className="font-semibold text-cream truncate">
                      <b className="font-mono text-gold">#{p.numero}</b> · {p.cliente}
                    </span>
                    <span className={`text-[10px] font-semibold px-1.5 py-0.5 rounded border shrink-0 ${
                      p.tipo_entrega === 'domicilio'
                        ? 'bg-gold/15 text-gold border-gold/30'
                        : 'bg-paper2 text-creamsoft border-line'
                    }`}>
                      {p.tipo_entrega === 'domicilio' ? '🛵 Domicilio' : '🍽️ Local'}
                    </span>
                  </div>

                  {p.tipo_entrega === 'domicilio' && (
                    <div className="my-1.5 p-2 bg-paper2/80 rounded border border-line text-[11px] text-creamsoft space-y-0.5">
                      {p.direccion && <div className="text-cream font-medium">📍 {p.direccion}</div>}
                      {p.telefono && (
                        <div>
                          📞 <a href={`https://wa.me/${p.telefono.replace(/\D/g, '')}`} target="_blank" rel="noreferrer" className="text-gold hover:underline font-mono">
                            {p.telefono}
                          </a>
                        </div>
                      )}
                      {p.notas_entrega && <div className="italic text-[10.5px]">"{p.notas_entrega}"</div>}
                    </div>
                  )}

                  <div className="my-1.5 text-creamsoft">{(p.pedido_items || []).map((it) => `${it.cantidad}× ${it.nombre}`).join(', ')}</div>
                  <div className="flex justify-between items-center mt-2">
                    <span className="font-mono text-gold font-semibold">{fmt$(p.total)}</span>
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
            head={['Pedido', 'Cliente', 'Tipo / Dirección', 'Total', 'Cancelado el', 'Por']}
            rows={cancelados.map((p) => [
              <span className="font-mono">#{p.numero}</span>,
              p.cliente,
              <span className="text-[11.5px] text-creamsoft">
                {p.tipo_entrega === 'domicilio' ? `🛵 Domicilio (${p.direccion || 'Sin dir'})` : '🍽️ En local'}
              </span>,
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
  const [filtroPeriodo, setFiltroPeriodo] = useState('mes') // 'hoy' | '2dias' | 'semana' | 'mes' | 'mes_anterior' | 'personalizado' | 'todo'
  const [fechaInicio, setFechaInicio] = useState(todayStr())
  const [fechaFin, setFechaFin] = useState(todayStr())

  const todasVentas = data.ventas || []
  const hoyStr = todayStr()

  // Filtrado flexible por rango de fechas
  const dAyer = new Date()
  dAyer.setDate(dAyer.getDate() - 1)
  const ayerStr = dateStr(dAyer)

  const d7 = new Date()
  d7.setDate(d7.getDate() - 6)
  const hace7DiasStr = dateStr(d7)

  const dMesAnt = new Date()
  dMesAnt.setDate(1)
  dMesAnt.setMonth(dMesAnt.getMonth() - 1)
  const mesAnteriorStr = dateStr(dMesAnt).slice(0, 7)

  // Filtrado robusto por fechas calendario local
  const ventasFiltradas = todasVentas.filter((v) => {
    if (!v.creado_en) return true
    const fVentaStr = dateStr(v.creado_en)

    if (filtroPeriodo === 'hoy') {
      return fVentaStr === hoyStr
    }
    if (filtroPeriodo === '2dias') {
      return fVentaStr >= ayerStr && fVentaStr <= hoyStr
    }
    if (filtroPeriodo === 'semana') {
      return fVentaStr >= hace7DiasStr && fVentaStr <= hoyStr
    }
    if (filtroPeriodo === 'mes') {
      return fVentaStr.slice(0, 7) === hoyStr.slice(0, 7)
    }
    if (filtroPeriodo === 'mes_anterior') {
      return fVentaStr.slice(0, 7) === mesAnteriorStr
    }
    if (filtroPeriodo === 'personalizado') {
      if (fechaInicio && fVentaStr < fechaInicio) return false
      if (fechaFin && fVentaStr > fechaFin) return false
      return true
    }
    return true // 'todo'
  })

  const totalPeriodo = ventasFiltradas.reduce((a, v) => a + (v.total || 0), 0)
  const pedidosCount = ventasFiltradas.length
  const ticketPromedio = pedidosCount > 0 ? totalPeriodo / pedidosCount : 0
  const resumenProductos = resumirProductosVendidos(ventasFiltradas)
  const totalUnidades = resumenProductos.reduce((a, p) => a + (p.cantidad || 0), 0)

  const periodoLabel =
    filtroPeriodo === 'hoy' ? 'Hoy' :
    filtroPeriodo === '2dias' ? 'Últimos 2 días' :
    filtroPeriodo === 'semana' ? 'Última semana' :
    filtroPeriodo === 'mes' ? 'Este mes' :
    filtroPeriodo === 'mes_anterior' ? 'Mes anterior' :
    filtroPeriodo === 'personalizado' ? `${fechaInicio} al ${fechaFin}` : 'Todo el histórico'

  return (
    <div>
      <SectionTitle
        title="Ventas y Reportes"
        sub="Consulta y suma automáticamente los pedidos e ingresos por día, semana, mes o rango personalizado."
      />

      {/* Selector de periodo interactivo */}
      <div className="mb-6 bg-paper2 border border-line rounded-lg p-4 space-y-3 shadow-sm">
        <div className="flex items-center justify-between flex-wrap gap-2">
          <span className="text-xs font-semibold text-cream uppercase tracking-wider flex items-center gap-1.5">
            📅 Filtrar ventas por período: <span className="text-gold font-bold">{periodoLabel}</span>
          </span>
          <span className="text-[11.5px] text-creamsoft font-mono">
            {pedidosCount} pedido{pedidosCount === 1 ? '' : 's'} sumados
          </span>
        </div>

        {/* Botones de filtros rápidos */}
        <div className="flex items-center gap-1.5 flex-wrap">
          {[
            ['hoy', '☀️ Hoy'],
            ['2dias', '⏳ 2 días'],
            ['semana', '📅 Semana (7d)'],
            ['mes', '🗓️ Este mes'],
            ['mes_anterior', '⏮️ Mes anterior'],
            ['personalizado', '🔍 Personalizado'],
            ['todo', '🌐 Todo el histórico'],
          ].map(([k, label]) => (
            <button
              key={k}
              onClick={() => setFiltroPeriodo(k)}
              className={`px-3 py-1.5 rounded-full text-xs font-semibold transition-colors ${
                filtroPeriodo === k
                  ? 'bg-gold text-paper shadow-sm'
                  : 'bg-paper border border-line text-creamsoft hover:text-cream'
              }`}
            >
              {label}
            </button>
          ))}
        </div>

        {/* Selector de fechas personalizadas */}
        {filtroPeriodo === 'personalizado' && (
          <div className="pt-2 border-t border-line/60 flex items-center gap-3 flex-wrap animate-fadeIn">
            <div className="flex items-center gap-2">
              <label className="text-xs text-creamsoft font-semibold">Desde:</label>
              <input
                type="date"
                value={fechaInicio}
                onChange={(e) => setFechaInicio(e.target.value)}
                className="bg-paper border border-line rounded px-2.5 py-1 text-xs text-cream font-mono focus:border-gold focus:outline-none"
              />
            </div>
            <div className="flex items-center gap-2">
              <label className="text-xs text-creamsoft font-semibold">Hasta:</label>
              <input
                type="date"
                value={fechaFin}
                onChange={(e) => setFechaFin(e.target.value)}
                className="bg-paper border border-line rounded px-2.5 py-1 text-xs text-cream font-mono focus:border-gold focus:outline-none"
              />
            </div>
          </div>
        )}
      </div>

      {/* Tarjetas de estadísticas sumadas del período seleccionado */}
      <div className="grid grid-cols-[repeat(auto-fit,minmax(180px,1fr))] gap-3.5 mb-6">
        <StatCard label={`Ventas (${periodoLabel})`} value={fmt$(totalPeriodo)} tone="gold" />
        <StatCard label={`Pedidos (${periodoLabel})`} value={pedidosCount} tone="champagne" />
        <StatCard label="Ticket promedio" value={fmt$(ticketPromedio)} />
        <StatCard label="Platos / Productos vendidos" value={totalUnidades} tone="sage" />
      </div>

      {/* Tabla de ventas del período */}
      <Card className="p-5 mb-6">
        <div className="flex items-center justify-between mb-3 pb-2 border-b border-line/60">
          <h3 className="font-serif text-base font-semibold text-cream">
            Historial de Ventas — {periodoLabel} ({pedidosCount})
          </h3>
          <span className="font-mono text-gold font-bold text-sm">
            Total: {fmt$(totalPeriodo)}
          </span>
        </div>

        {ventasFiltradas.length === 0 ? (
          <Empty icon="💵">No hay ventas registradas en el período seleccionado ({periodoLabel}).</Empty>
        ) : (
          <Table
            head={['Fecha / Hora', 'Pedido', 'Cliente', 'Productos', 'Total', '']}
            rows={ventasFiltradas.map((v) => {
              const items = v.pedidos?.pedido_items || []
              const resumen = items.length
                ? items.map((it) => `${it.cantidad}× ${it.nombre}`).join(', ')
                : '—'
              return [
                <span className="font-mono text-xs">{v.creado_en ? fmtDateTime(v.creado_en) : '—'}</span>,
                <span className="font-mono text-gold font-bold">{v.pedidos?.numero ? `#${v.pedidos.numero}` : '—'}</span>,
                <span className="text-cream text-xs">{v.pedidos?.cliente || 'Cliente'}</span>,
                <span className="text-[12px] text-creamsoft truncate max-w-[200px] block" title={resumen}>
                  {resumen}
                </span>,
                <span className="font-mono font-bold text-gold">{fmt$(v.total)}</span>,
                <button
                  onClick={() => setDetalle(v)}
                  className="text-[12px] font-semibold text-gold hover:text-golddark whitespace-nowrap bg-paper2 px-2.5 py-1 rounded border border-line hover:border-gold transition-colors"
                >
                  Ver detalle →
                </button>,
              ]
            })}
          />
        )}
      </Card>

      {/* Resumen de productos vendidos en el período seleccionado */}
      <div className="flex items-center justify-between flex-wrap gap-3 mb-3">
        <div>
          <h3 className="font-serif text-lg font-semibold">Productos más vendidos ({periodoLabel})</h3>
          <p className="text-creamsoft text-[12.5px]">
            Suma exacta de cada plato o artículo vendido en este período para controlar la demanda y compras.
          </p>
        </div>
      </div>

      <Card className="p-5">
        {resumenProductos.length === 0 ? (
          <Empty icon="📦">No hay productos vendidos en este período ({periodoLabel}).</Empty>
        ) : (
          <Table
            head={['Producto', 'Cantidad vendida', 'Precio promedio', 'Total generado']}
            rows={resumenProductos.map((p) => [
              <span className="font-semibold text-cream">{p.nombre}</span>,
              <span className="font-mono font-bold text-gold">{p.cantidad}</span>,
              <span className="font-mono text-creamsoft">{fmt$(p.total / p.cantidad)}</span>,
              <span className="font-mono font-bold text-gold">{fmt$(p.total)}</span>,
            ])}
          />
        )}
      </Card>

      {detalle && <VentaDetalleModal venta={detalle} onClose={() => setDetalle(null)} />}
    </div>
  )
}

function VentaDetalleModal({ venta, onClose }) {
  const pedido = venta.pedidos
  const items = pedido?.pedido_items || []
  const tieneItems = items.length > 0

  return (
    <Modal title={`🧾 Detalle de Venta ${pedido?.numero ? `#${pedido.numero}` : ''}`} onClose={onClose}>
      <div className="space-y-4">
        {/* Cabecera con fecha y total */}
        <div className="bg-paper2 border border-line rounded-lg p-3.5 flex items-center justify-between flex-wrap gap-3">
          <div>
            <span className="text-[10.5px] uppercase tracking-wider text-creamsoft block">Fecha y Hora</span>
            <span className="text-xs font-mono text-cream font-medium">
              ⏰ {venta.creado_en ? fmtDateTime(venta.creado_en) : '—'}
            </span>
          </div>
          <div className="text-right">
            <span className="text-[10.5px] uppercase tracking-wider text-creamsoft block">Total Venta</span>
            <span className="font-mono text-gold font-bold text-lg">{fmt$(venta.total)}</span>
          </div>
        </div>

        {/* Información del cliente y entrega si proviene de un pedido */}
        {pedido ? (
          <div className="bg-paper2 border border-line rounded-lg p-3.5 space-y-2">
            <div className="flex items-center justify-between gap-2 flex-wrap pb-2 border-b border-line/60">
              <div className="flex items-center gap-2">
                <span className="text-xs font-semibold text-cream">👤 {pedido.cliente || 'Cliente'}</span>
              </div>
              <span className={`text-[10.5px] font-semibold px-2 py-0.5 rounded-full border ${
                pedido.tipo_entrega === 'domicilio'
                  ? 'bg-gold/15 text-gold border-gold/30'
                  : 'bg-paper text-creamsoft border-line'
              }`}>
                {pedido.tipo_entrega === 'domicilio' ? '🛵 Domicilio' : '🍽️ En local'}
              </span>
            </div>

            {pedido.tipo_entrega === 'domicilio' && (
              <div className="text-xs text-creamsoft space-y-1 pt-1">
                {pedido.direccion && (
                  <div className="text-cream font-medium flex items-center gap-1.5">
                    <span>📍</span> <span>{pedido.direccion}</span>
                  </div>
                )}
                {pedido.telefono && (
                  <div className="flex items-center gap-1.5">
                    <span>📞</span>
                    <a
                      href={`https://wa.me/${pedido.telefono.replace(/\D/g, '')}`}
                      target="_blank"
                      rel="noreferrer"
                      className="text-gold hover:underline font-mono font-medium"
                    >
                      {pedido.telefono} (WhatsApp)
                    </a>
                  </div>
                )}
              </div>
            )}

            {pedido.notas_entrega && (
              <div className="mt-2 p-2 bg-gold/10 rounded border border-gold/25 text-[11.5px] text-champagne space-y-1">
                <div className="font-semibold text-gold flex items-center gap-1.5">
                  <span>💰</span> <span>{pedido.notas_entrega.split(' · ')[0]}</span>
                </div>
                {pedido.notas_entrega.split(' · ').length > 1 && (
                  <div className="text-[10.5px] text-creamsoft italic border-t border-gold/15 pt-1 mt-1">
                    "{pedido.notas_entrega.split(' · ').slice(1).join(' · ')}"
                  </div>
                )}
              </div>
            )}
          </div>
        ) : (
          <div className="p-3 bg-paper2 border border-line rounded text-xs text-creamsoft">
            Venta directa registrada en caja / inventario.
          </div>
        )}

        {/* Tabla o lista de productos comprados */}
        <div>
          <h4 className="text-xs font-semibold uppercase tracking-wider text-creamsoft mb-2">
            Productos en esta venta ({items.length})
          </h4>
          {tieneItems ? (
            <div className="divide-y divide-line/70 border border-line rounded-lg overflow-hidden bg-paper">
              {items.map((it, idx) => (
                <div key={idx} className="p-3 flex items-start justify-between gap-3 text-xs">
                  <div>
                    <div className="font-semibold text-cream">
                      <span className="text-gold font-mono font-bold mr-1.5">{it.cantidad}×</span>
                      {it.nombre}
                    </div>
                    {it.adiciones && it.adiciones.length > 0 && (
                      <div className="text-[11px] text-creamsoft mt-0.5">
                        + {Array.isArray(it.adiciones) ? it.adiciones.join(', ') : it.adiciones}
                      </div>
                    )}
                    {it.observaciones && (
                      <div className="text-[10.5px] text-champagne/90 italic mt-0.5">
                        "{it.observaciones}"
                      </div>
                    )}
                  </div>
                  <div className="text-right font-mono font-semibold text-gold shrink-0">
                    {fmt$(it.subtotal || (it.precio ? it.precio * it.cantidad : 0))}
                  </div>
                </div>
              ))}
            </div>
          ) : (
            <p className="text-xs text-creamsoft bg-paper2 p-3 rounded border border-line">
              No hay productos desglosados en este registro de venta.
            </p>
          )}
        </div>

        <div className="flex justify-end pt-2">
          <Btn variant="primary" onClick={onClose} className="justify-center">
            Cerrar
          </Btn>
        </div>
      </div>
    </Modal>
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
  const { t } = useLanguage()
  const [modal, setModal] = useState(null) // null | 'new' | trabajador (para editar)
  const [pagoFor, setPagoFor] = useState(null)

  return (
    <div>
      <SectionTitle title={t.staff.title} sub={t.staff.description.replace('{business}', negocio.nombre)}
        action={<Btn variant="primary" onClick={() => setModal('new')}>➕ {t.staff.new}</Btn>} />
      <div className="grid grid-cols-[repeat(auto-fill,minmax(240px,1fr))] gap-4">
        {data.trabajadores.map((w) => {
          const ultimoPago = w.pagos.length ? w.pagos[w.pagos.length - 1] : null
          return (
            <Card key={w.id} className="p-5">
              <div className="flex items-center justify-between mb-1.5">
                <Pill tone={w.estado === 'Activo' ? 'activo' : 'pausado'}>{w.estado === 'Activo' ? t.staff.active : t.staff.paused}</Pill>
              </div>
              <h4 className="font-serif font-semibold text-base mb-0.5">{w.nombre}</h4>
              <p className="text-creamsoft text-[13px] mb-2">{w.cargo}</p>
              <p className="font-mono font-bold mb-3">{fmt$(w.pago)}/mes</p>
              <div className="flex gap-1.5 flex-wrap">
                <Btn size="sm" variant="ghost" onClick={() => setModal(w)}>✏️ {t.staff.editSalary}</Btn>
                <Btn size="sm" variant="mustard" onClick={() => setPagoFor(w)}>{t.staff.registerPayment}</Btn>
                <Btn size="sm" variant="ghost" onClick={async () => { await toggleTrabajadorEstado(w); reload() }}>
                  {w.estado === 'Activo' ? t.staff.deactivate : t.staff.activate}
                </Btn>
              </div>
              {ultimoPago && <p className="mt-2.5 text-[11.5px] text-creamsoft">{t.staff.lastPayment}: {fmtDate(ultimoPago.creado_en)} · {fmt$(ultimoPago.valor)}</p>}
            </Card>
          )
        })}
      </div>
      {modal && (
        <TrabajadorModal
          negocio={negocio}
          trabajador={modal === 'new' ? null : modal}
          onClose={() => setModal(null)}
          onSaved={() => { setModal(null); notify(modal === 'new' ? t.staff.added : t.staff.salaryUpdated); reload() }}
          onDeleted={() => { setModal(null); notify('Trabajador eliminado'); reload() }}
        />
      )}
      {pagoFor && (
        <PagoModal negocio={negocio} trabajador={pagoFor} onClose={() => setPagoFor(null)}
          onSaved={() => { setPagoFor(null); notify(t.staff.paymentRegistered.replace('{name}', pagoFor.nombre)); reload() }} />
      )}
    </div>
  )
}
function TrabajadorModal({ negocio, trabajador, onClose, onSaved, onDeleted }) {
  const { t } = useLanguage()
  const [nombre, setNombre] = useState(trabajador?.nombre || '')
  const [cargo, setCargo] = useState(trabajador?.cargo || '')
  const [pago, setPago] = useState(trabajador?.pago ?? '')
  const [guardando, setGuardando] = useState(false)
  const [eliminando, setEliminando] = useState(false)

  async function submit(e) {
    e.preventDefault()
    setGuardando(true)
    try {
      const payload = { nombre: nombre.trim(), cargo: cargo.trim(), pago: parseFloat(pago) || 0 }
      if (trabajador) await updateTrabajador(trabajador.id, payload)
      else await createTrabajador(negocio.id, payload)
      onSaved()
    } finally {
      setGuardando(false)
    }
  }

  async function handleDelete() {
    if (!trabajador) return
    if (!window.confirm(`¿Seguro que deseas eliminar a "${trabajador.nombre}"?`)) return
    setEliminando(true)
    try {
      await deleteTrabajador(trabajador.id)
      onDeleted()
    } finally {
      setEliminando(false)
    }
  }

  return (
    <Modal onClose={onClose}>
      <div className="flex items-center justify-between mb-4">
        <h2 className="font-serif text-xl font-semibold">{trabajador ? t.staff.edit.replace('{name}', trabajador.nombre) : t.staff.new}</h2>
        {trabajador && (
          <Btn size="sm" variant="danger" type="button" disabled={eliminando || guardando} onClick={handleDelete}>
            {eliminando ? 'Eliminando…' : 'Eliminar'}
          </Btn>
        )}
      </div>
      <form onSubmit={submit}>
        <Field label={t.staff.name}><Input required value={nombre} onChange={(e) => setNombre(e.target.value)} /></Field>
        <div className="grid grid-cols-2 gap-3">
          <Field label={t.staff.role}><Input required value={cargo} onChange={(e) => setCargo(e.target.value)} /></Field>
          <Field label={t.staff.monthlyPay}><Input required type="number" value={pago} onChange={(e) => setPago(e.target.value)} /></Field>
        </div>
        <Btn variant="primary" className="w-full justify-center" disabled={guardando || eliminando}>
          {guardando ? t.catalogAdmin.saving : trabajador ? t.orderShared.save : t.staff.add}
        </Btn>
      </form>
    </Modal>
  )
}
function PagoModal({ negocio, trabajador, onClose, onSaved }) {
  const { t } = useLanguage()
  const [periodo, setPeriodo] = useState(new Date().toLocaleDateString('es-CO', { month: 'long', year: 'numeric' }))
  const [valor, setValor] = useState(trabajador.pago)
  async function submit(e) {
    e.preventDefault()
    await registrarPago(trabajador.id, negocio.id, { periodo, valor: parseFloat(valor) || 0 })
    onSaved()
  }
  return (
    <Modal onClose={onClose}>
      <h2 className="font-serif text-xl font-semibold mb-4">{t.staff.payTitle} — {trabajador.nombre}</h2>
      <form onSubmit={submit}>
        <Field label={t.staff.period}><Input required value={periodo} onChange={(e) => setPeriodo(e.target.value)} /></Field>
        <Field label={t.staff.value}><Input required type="number" value={valor} onChange={(e) => setValor(e.target.value)} /></Field>
        <Btn variant="primary" className="w-full justify-center">{t.staff.confirmPayment}</Btn>
      </form>
    </Modal>
  )
}

/* ---------------- Finanzas ---------------- */
export function TabFinanzas({ negocio, data, reload, notify, onNegocioUpdated }) {
  const { t } = useLanguage()
  const [modal, setModal] = useState(null) // 'capital' | 'ingreso' | 'egreso'
  const capitalInicial = Number(negocio.capital_inicial) || 0
  const esModoInventario = negocio.modo_operacion === 'inventario'

  const ingresosVentas = data.ventas.filter((v) => sameMonth(v.creado_en)).reduce((a, v) => a + (Number(v.total) || 0), 0)
  const ingresosExtra = data.ingresos.filter((i) => sameMonth(i.creado_en)).reduce((a, i) => a + (Number(i.valor) || 0), 0)
  const egresosCompras = data.compras.filter((c) => sameMonth(c.creado_en)).reduce((a, c) => a + (Number(c.valor) || 0), 0)
  const egresosPagos = data.trabajadores.flatMap((w) => w.pagos).filter((p) => sameMonth(p.creado_en)).reduce((a, p) => a + (Number(p.valor) || 0), 0)
  const egresosOtros = data.egresos.filter((e) => sameMonth(e.creado_en)).reduce((a, e) => a + (Number(e.valor) || 0), 0)

  const ventasTotal = data.ventas.reduce((a, v) => a + (Number(v.total) || 0), 0)
  const ingresosTotal = data.ingresos.reduce((a, i) => a + (Number(i.valor) || 0), 0)
  const comprasTotal = data.compras.reduce((a, c) => a + (Number(c.valor) || 0), 0)
  const pagosTotal = data.trabajadores.flatMap((w) => w.pagos).reduce((a, p) => a + (Number(p.valor) || 0), 0)
  const egresosOtrosTotal = data.egresos.reduce((a, e) => a + (Number(e.valor) || 0), 0)
  const saldoActual = capitalInicial + ventasTotal + ingresosTotal - comprasTotal - pagosTotal - egresosOtrosTotal

  async function borrarIngreso(id) {
    if (!window.confirm('¿Deseas eliminar este registro de ingreso?')) return
    await deleteIngreso(id)
    notify('Ingreso eliminado')
    reload()
  }

  async function borrarEgreso(id) {
    if (!window.confirm('¿Deseas eliminar este registro de gasto?')) return
    await deleteEgreso(id)
    notify('Gasto eliminado')
    reload()
  }

  return (
    <div>
      <SectionTitle title={t.finance.finances} sub={t.finance.financesDescription}
        action={<div className="flex gap-2">
          <Btn size="sm" variant="ghost" onClick={() => setModal('capital')}>💰 {t.finance.initialCapital}</Btn>
          <Btn size="sm" variant="mustard" onClick={() => setModal('ingreso')}>➕ {t.finance.income}</Btn>
          <Btn size="sm" variant="danger" onClick={() => setModal('egreso')}>➕ {t.finance.expense}</Btn>
        </div>} />

      <div className="grid grid-cols-[repeat(auto-fit,minmax(180px,1fr))] gap-3.5 mb-3.5">
        <StatCard label={t.finance.initialCapital} value={fmt$(capitalInicial)} />
        <StatCard label={t.finance.currentBalance} value={fmt$(saldoActual)} tone={saldoActual >= 0 ? 'sage' : 'wine'} />
      </div>

      <p className="text-creamsoft text-[11.5px] mb-5">{t.finance.thisMonth} ↓</p>
      <div className="grid grid-cols-[repeat(auto-fit,minmax(180px,1fr))] gap-3.5 mb-6">
        <StatCard label={esModoInventario ? 'Ingresos totales' : 'Ingresos (ventas + otros)'} value={fmt$(ingresosVentas + ingresosExtra)} tone="sage" />
        <StatCard label="Egresos (compras)" value={fmt$(egresosCompras)} tone="gold" />
        <StatCard label="Egresos (personal)" value={fmt$(egresosPagos)} tone="champagne" />
        <StatCard label="Otros egresos" value={fmt$(egresosOtros)} />
      </div>

      <div className="grid grid-cols-[1.3fr_.9fr] gap-4 max-[820px]:grid-cols-1 mb-6">
        <Card className="p-5">
          <h3 className="font-serif text-lg font-semibold mb-3">Ingresos registrados</h3>
          {data.ingresos.length === 0 ? <p className="text-creamsoft text-[13px]">Sin ingresos registrados aún.</p> :
            data.ingresos.map((i) => (
              <div key={i.id} className="flex items-center justify-between border-b border-line py-2.5 text-[13px] last:border-none">
                <div>
                  <span className="font-medium text-cream">{i.concepto}</span>
                  <div className="text-creamsoft text-[11.5px]">{fmtDate(i.creado_en)}</div>
                </div>
                <div className="flex items-center gap-3">
                  <b className="font-mono text-sage">+{fmt$(i.valor)}</b>
                  <button onClick={() => borrarIngreso(i.id)} className="text-creamsoft hover:text-wine text-xs px-1" title="Eliminar ingreso">✕</button>
                </div>
              </div>
            ))}
        </Card>
        <Card className="p-5">
          <h3 className="font-serif text-lg font-semibold mb-3">Otros gastos</h3>
          {data.egresos.length === 0 ? <p className="text-creamsoft text-[13px]">Sin otros gastos aún.</p> :
            data.egresos.map((e) => (
              <div key={e.id} className="flex items-center justify-between border-b border-line py-2.5 text-[13px] last:border-none">
                <div>
                  <span className="font-medium text-cream">{e.concepto}</span>
                  <div className="text-creamsoft text-[11.5px]">{fmtDate(e.creado_en)}</div>
                </div>
                <div className="flex items-center gap-3">
                  <b className="font-mono text-wine">−{fmt$(e.valor)}</b>
                  <button onClick={() => borrarEgreso(e.id)} className="text-creamsoft hover:text-wine text-xs px-1" title="Eliminar gasto">✕</button>
                </div>
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
  const { t } = useLanguage()
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
      <h2 className="font-serif text-xl font-semibold mb-2">{t.finance.initialTitle}</h2>
      <p className="text-creamsoft text-[13px] mb-4">
        Es el dinero con el que arrancó el negocio, antes de empezar a registrar ventas, compras y gastos en Kiosko.
        Se suma a todos los movimientos para calcular el saldo actual real.
      </p>
      <form onSubmit={submit}>
        <Field label={`${t.finance.initialCapital} (COP)`}>
          <Input required type="number" value={valor} onChange={(e) => setValor(e.target.value)} />
        </Field>
        <Btn variant="primary" className="w-full justify-center" disabled={guardando}>
          {guardando ? t.catalogAdmin.saving : t.finance.saveInitial}
        </Btn>
      </form>
    </Modal>
  )
}

function MovimientoModal({ negocio, tipo, onClose, onSaved }) {
  const { t } = useLanguage()
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
      <h2 className="font-serif text-xl font-semibold mb-4">{tipo === 'ingreso' ? t.finance.newIncome : t.finance.newExpense}</h2>
      <form onSubmit={submit}>
        <Field label={t.finance.concept}><Input required value={concepto} onChange={(e) => setConcepto(e.target.value)} placeholder={tipo === 'ingreso' ? 'Ej: venta de excedente' : 'Ej: transporte, servicios'} /></Field>
        <Field label={`${t.finance.value} (COP)`}><Input required type="number" value={valor} onChange={(e) => setValor(e.target.value)} /></Field>
        <Btn variant="primary" className="w-full justify-center">{t.finance.save}</Btn>
      </form>
    </Modal>
  )
}

/* ---------------- Reporte por día / mes (para imprimir o guardar como PDF) ----------------
   El usuario escoge un día o un mes, ve el resumen de ese periodo y le da "Imprimir".
   El diálogo de impresión del navegador siempre trae la opción "Guardar como PDF",
   así que con este mismo botón se cubre imprimir en papel o generar el PDF para el banco. */
function ReportePeriodo({ negocio, data }) {
  const { t } = useLanguage()
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
          <h3 className="font-serif text-lg font-semibold">{t.report.title}</h3>
          <p className="text-creamsoft text-[12.5px]">{t.report.description}</p>
        </div>
        <div className="flex items-center gap-2">
          <Select value={tipoRango} onChange={(e) => setTipoRango(e.target.value)} className="!w-auto">
            <option value="dia">{t.report.byDay}</option>
            <option value="mes">{t.report.byMonth}</option>
          </Select>
          {tipoRango === 'dia' ? (
            <Input type="date" value={fecha} onChange={(e) => setFecha(e.target.value)} className="!w-auto" />
          ) : (
            <Input type="month" value={mes} onChange={(e) => setMes(e.target.value)} className="!w-auto" />
          )}
          <Btn size="sm" variant="primary" onClick={() => window.print()}>🖨️ {t.report.print}</Btn>
        </div>
      </div>

      <div id="finanzas-print-area">
        <div className="mb-4 hidden print:block">
          <h2 className="font-serif text-xl font-semibold">{negocio.nombre}</h2>
          <p className="text-[13px]">Reporte de ingresos y egresos — {etiquetaPeriodo}</p>
          <p className="text-[11px]">Generado el {fmtDateLong(new Date())}</p>
        </div>

        <p className="text-creamsoft text-[12px] mb-3 print:hidden">{t.report.period}: <b className="text-cream">{etiquetaPeriodo}</b></p>

        <div className="grid grid-cols-[repeat(auto-fit,minmax(150px,1fr))] gap-3 mb-5">
          <StatCard label="Ventas" value={fmt$(totalVentas)} tone="sage" />
          <StatCard label={t.report.otherIncome} value={fmt$(totalIngresos)} tone="sage" />
          <StatCard label="Compras" value={fmt$(totalCompras)} tone="gold" />
          <StatCard label={t.report.staffPayments} value={fmt$(totalPagos)} tone="champagne" />
          <StatCard label="Otros egresos" value={fmt$(totalEgresos)} />
          <StatCard label={t.report.result} value={fmt$(resultado)} tone={resultado >= 0 ? 'sage' : 'wine'} />
        </div>

        {movimientos.length === 0 ? (
          <Empty>{t.report.noMovements}</Empty>
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
  const { t } = useLanguage()
  const esModoInventario = negocio.modo_operacion === 'inventario'

  if (esModoInventario) {
    const valorTotal = data.ingredientes.reduce((a, i) => a + ((Number(i.stock) || 0) * (Number(i.costo_unitario) || 0)), 0)
    const rankingStock = [...data.ingredientes].sort((a, b) => ((b.stock || 0) * (b.costo_unitario || 0)) - ((a.stock || 0) * (a.costo_unitario || 0)))
    const maxVal = rankingStock.length ? Math.max(1, (rankingStock[0].stock || 0) * (rankingStock[0].costo_unitario || 0)) : 1
    const bajoStock = data.ingredientes.filter((i) => (Number(i.stock) || 0) <= (Number(i.minimo) || 0)).length
    const totalCompras = data.compras.reduce((a, c) => a + (Number(c.valor) || 0), 0)
    const totalIngresos = data.ingresos.reduce((a, i) => a + (Number(i.valor) || 0), 0)
    const totalEgresos = data.egresos.reduce((a, e) => a + (Number(e.valor) || 0), 0)

    return (
      <div>
        <SectionTitle title={t.stats.title} sub={t.stats.description.replace('{business}', negocio.nombre)} />
        <div className="grid grid-cols-[1.3fr_.9fr] gap-4 max-[820px]:grid-cols-1">
          <Card className="p-5">
            <h3 className="font-serif text-lg font-semibold mb-3">Artículos de mayor valor en stock</h3>
            {rankingStock.length === 0 ? (
              <Empty icon="📦">Aún no hay artículos registrados en el inventario.</Empty>
            ) : (
              rankingStock.slice(0, 8).map((art) => {
                const val = (Number(art.stock) || 0) * (Number(art.costo_unitario) || 0)
                return (
                  <div key={art.id} className="flex items-center gap-2.5 mb-2.5 text-[12.5px]">
                    <span className="w-[150px] font-semibold text-creamsoft truncate">{art.nombre}</span>
                    <div className="flex-1 bg-paper border border-line rounded-full h-2 overflow-hidden">
                      <div className="h-full bg-gold rounded-full" style={{ width: `${(val / maxVal) * 100}%` }} />
                    </div>
                    <span className="w-[110px] text-right font-mono text-gold">{fmt$(val)}</span>
                  </div>
                )
              })
            )}
          </Card>
          <Card className="p-5">
            <h3 className="font-serif text-lg font-semibold mb-3">{t.stats.overview}</h3>
            {[
              ['Artículos registrados', data.ingredientes.length],
              ['Artículos con bajo stock', bajoStock],
              ['Valor total en inventario', fmt$(valorTotal)],
              ['Compras registradas', data.compras.length],
              ['Trabajadores activos', data.trabajadores.filter((w) => w.estado === 'Activo').length],
              ['Total ingresos registrados', fmt$(totalIngresos)],
              ['Total egresos + compras', fmt$(totalEgresos + totalCompras)],
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

  const conteo = {}
  pedidosValidos.forEach((p) => (p.pedido_items || []).forEach((it) => { conteo[it.nombre] = (conteo[it.nombre] || 0) + it.cantidad }))
  const max = ranking.length ? ranking[0][1] : 1
  const agotados = data.productos.filter((p) => !p.disponible).length

  return (
    <div>
      <SectionTitle title={t.stats.title} sub={t.stats.description.replace('{business}', negocio.nombre)} />
      <div className="grid grid-cols-[1.3fr_.9fr] gap-4 max-[820px]:grid-cols-1">
        <Card className="p-5">
          <h3 className="font-serif text-lg font-semibold mb-3">{t.stats.bestSellers}</h3>
          {ranking.length === 0 ? <Empty icon="📉">{t.stats.noSales}</Empty> : (
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
          <h3 className="font-serif text-lg font-semibold mb-3">{t.stats.overview}</h3>
          {[
            ['Productos activos', data.productos.length - agotados],
            ['Productos agotados', agotados],
            ['Ingredientes con bajo stock', data.ingredientes.filter((i) => i.stock <= i.minimo).length],
            ['Trabajadores activos', data.trabajadores.filter((w) => w.estado === 'Activo').length],
            ['Pedidos activos / entregados', pedidosValidos.length],
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
