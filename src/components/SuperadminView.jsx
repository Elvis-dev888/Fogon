import { useState, useEffect, useCallback } from 'react'
import { Btn, StatCard, Pill, NegocioLogo, Card, Empty, Select, Modal, Input } from './ui'
import { fmt$, fmtDateLong } from '../lib/helpers'
import { toggleNegocioEstado, toggleNegocioVip, eliminarNegocio, fetchSugerencias, actualizarEstadoSugerencia, eliminarSugerencia } from '../lib/api'
import { getTierForProductCount } from '../lib/subscription'
import { SUPPORT_EMAIL, MASTER_UNLOCK_CODE, getUnlockCodeForEmail } from '../lib/security'
import { useLanguage } from '../lib/i18n.jsx'

export default function SuperadminView({ negocios, onChanged, notify, onExit }) {
  const { t } = useLanguage()
  const [seccion, setSeccion] = useState('negocios') // 'negocios' | 'sugerencias' | 'seguridad'
  const [busquedaNegocio, setBusquedaNegocio] = useState('')
  const [sugerencias, setSugerencias] = useState([])
  const [cargandoSugerencias, setCargandoSugerencias] = useState(false)
  const [negocioAEliminar, setNegocioAEliminar] = useState(null)
  const [eliminando, setEliminando] = useState(false)
  const [emailClienteDesbloqueo, setEmailClienteDesbloqueo] = useState('')
  const [copiadoCod, setCopiadoCod] = useState(false)

  const negociosFiltrados = negocios.filter((n) => {
    if (!busquedaNegocio.trim()) return true
    const q = busquedaNegocio.toLowerCase()
    return (
      n.nombre?.toLowerCase().includes(q) ||
      n.slogan?.toLowerCase().includes(q) ||
      n.dueno_email?.toLowerCase().includes(q)
    )
  })

  const totalVentasMes = negocios.reduce((s, n) => s + (n.ventasMes || 0), 0)
  const totalPedidos = negocios.reduce((s, n) => s + (n.pedidosCount || 0), 0)

  const cargarSugerencias = useCallback(async () => {
    setCargandoSugerencias(true)
    try {
      const data = await fetchSugerencias()
      setSugerencias(data)
    } catch (err) {
      console.error('[Kiosko] Error cargando sugerencias:', err)
    } finally {
      setCargandoSugerencias(false)
    }
  }, [])

  useEffect(() => {
    cargarSugerencias()
  }, [cargarSugerencias])

  async function handleToggle(n) {
    await toggleNegocioEstado(n)
    notify(`${n.nombre} ahora está ${n.estado === 'Activo' ? 'pausado' : 'activo'}`)
    onChanged()
  }

  async function handleToggleVip(n) {
    try {
      await toggleNegocioVip(n)
      const isNowVip = !(n.is_vip || n.subscription_status === 'vip' || n.plan === 'VIP / Cortesía')
      notify(`Negocio "${n.nombre}" ahora tiene ${isNowVip ? '👑 Cortesía VIP permanente' : 'plan normal'}`)
      onChanged()
    } catch (err) {
      notify('Error al cambiar VIP: ' + (err.message || String(err)))
    }
  }

  async function handleConfirmarEliminacion() {
    if (!negocioAEliminar) return
    setEliminando(true)
    try {
      await eliminarNegocio(negocioAEliminar.id)
      notify(`Negocio "${negocioAEliminar.nombre}" eliminado exitosamente`)
      setNegocioAEliminar(null)
      onChanged()
    } catch (err) {
      notify('Error al eliminar negocio: ' + (err.message || String(err)))
    } finally {
      setEliminando(false)
    }
  }

  async function handleCambiarEstadoSugerencia(id, nuevoEstado) {
    try {
      await actualizarEstadoSugerencia(id, nuevoEstado)
      notify(`Estado actualizado a: ${nuevoEstado}`)
      cargarSugerencias()
    } catch (err) {
      notify('Error actualizando estado: ' + (err.message || String(err)))
    }
  }

  async function handleEliminarSugerencia(id) {
    if (!window.confirm('¿Deseas eliminar este registro del buzón?')) return
    try {
      await eliminarSugerencia(id)
      notify('Sugerencia eliminada')
      cargarSugerencias()
    } catch (err) {
      notify('Error eliminando sugerencia: ' + (err.message || String(err)))
    }
  }

  const pendientesCount = sugerencias.filter((s) => s.estado === 'Pendiente').length

  return (
    <div>
      <div className="mb-6 pb-6 border-b border-line flex flex-col md:flex-row md:items-start md:justify-between gap-4">
        <div>
          <h2 className="font-serif text-3xl font-semibold mb-2">Panel del Superadministrador</h2>
          <p className="text-creamsoft text-sm max-w-xl leading-relaxed">
            Centro de control global de la plataforma. Supervisa negocios en producción, revisa ideas y sugerencias, y gestiona la seguridad y desbloqueos.
          </p>
        </div>
        {onExit && (
          <Btn size="sm" variant="ghost" onClick={onExit} className="self-start">
            {t.signOut || 'Cerrar sesión'}
          </Btn>
        )}
      </div>

      {/* Pestañas de navegación de Superadmin */}
      <div className="flex gap-2 mb-6 flex-wrap">
        <button
          onClick={() => setSeccion('negocios')}
          className={`px-4 py-2 rounded-full text-xs font-semibold transition-colors flex items-center gap-2 ${
            seccion === 'negocios' ? 'bg-gold text-paper' : 'bg-paper2 border border-line text-creamsoft hover:text-cream'
          }`}
        >
          🏢 Negocios registrados ({negocios.length})
        </button>
        <button
          onClick={() => setSeccion('sugerencias')}
          className={`px-4 py-2 rounded-full text-xs font-semibold transition-colors flex items-center gap-2 ${
            seccion === 'sugerencias' ? 'bg-gold text-paper' : 'bg-paper2 border border-line text-creamsoft hover:text-cream'
          }`}
        >
          📬 {t.feedback?.inboxTitle || 'Sugerencias'}
          {pendientesCount > 0 && (
            <span className="bg-wine text-paper text-[10px] font-bold px-2 py-0.5 rounded-full">
              {pendientesCount} nuevas
            </span>
          )}
        </button>
        <button
          onClick={() => setSeccion('seguridad')}
          className={`px-4 py-2 rounded-full text-xs font-semibold transition-colors flex items-center gap-2 ${
            seccion === 'seguridad' ? 'bg-gold text-paper' : 'bg-paper2 border border-line text-creamsoft hover:text-cream'
          }`}
        >
          🛡️ {t.security?.superSecurityTitle || 'Seguridad y Desbloqueos'}
        </button>
      </div>

      {seccion === 'negocios' && (
        <div>
          <div className="grid grid-cols-[repeat(auto-fit,minmax(180px,1fr))] gap-3.5 mb-8">
            <StatCard label="Negocios activos" value={negocios.filter((n) => n.estado === 'Activo').length} />
            <StatCard label="Ventas del mes (todas)" value={fmt$(totalVentasMes)} tone="gold" />
            <StatCard label="Pedidos totales" value={totalPedidos} tone="champagne" />
            <StatCard label="Sugerencias recibidas" value={sugerencias.length} tone="sage" />
          </div>

          <div className="flex items-center justify-between gap-4 mb-4 flex-wrap">
            <div>
              <h3 className="font-serif text-xl font-semibold">
                Negocios registrados ({negociosFiltrados.length}{negociosFiltrados.length !== negocios.length ? ` de ${negocios.length}` : ''})
              </h3>
              <p className="text-xs text-creamsoft">
                Supervisa todos los negocios en la plataforma y el correo de cada dueño.
              </p>
            </div>
            {negocios.length > 0 && (
              <div className="w-full sm:w-72">
                <Input
                  value={busquedaNegocio}
                  onChange={(e) => setBusquedaNegocio(e.target.value)}
                  placeholder="🔍 Buscar por nombre o correo…"
                  className="text-xs py-1.5"
                />
              </div>
            )}
          </div>

          {negocios.length === 0 ? (
            <p className="text-creamsoft text-sm">Todavía no hay negocios — aparecerán aquí en cuanto alguien registre el suyo.</p>
          ) : negociosFiltrados.length === 0 ? (
            <p className="text-creamsoft text-sm py-8 text-center bg-paper2 rounded border border-line">
              No se encontraron negocios que coincidan con «{busquedaNegocio}».
            </p>
          ) : (
            <div className="grid grid-cols-[repeat(auto-fill,minmax(280px,1fr))] gap-4">
              {negociosFiltrados.map((n) => (
                <NegocioCard
                  key={n.id}
                  n={n}
                  onToggle={() => handleToggle(n)}
                  onToggleVip={() => handleToggleVip(n)}
                  onDelete={() => setNegocioAEliminar(n)}
                />
              ))}
            </div>
          )}
        </div>
      )}

      {seccion === 'sugerencias' && (
        <div>
          <div className="grid grid-cols-[repeat(auto-fit,minmax(180px,1fr))] gap-3.5 mb-6">
            <StatCard label="Total ideas y feedback" value={sugerencias.length} />
            <StatCard label="Pendientes de revisión" value={pendientesCount} tone={pendientesCount > 0 ? 'wine' : 'default'} />
            <StatCard label="En revisión / Planeadas" value={sugerencias.filter((s) => s.estado === 'En revisión' || s.estado === 'Planeada').length} tone="champagne" />
            <StatCard label="Implementadas" value={sugerencias.filter((s) => s.estado === 'Implementada').length} tone="sage" />
          </div>

          <div className="flex items-center justify-between mb-4">
            <h3 className="font-serif text-xl">Buzón de ideas recibidas</h3>
            <Btn size="sm" variant="ghost" onClick={cargarSugerencias} disabled={cargandoSugerencias}>
              🔄 {cargandoSugerencias ? 'Actualizando…' : 'Refrescar'}
            </Btn>
          </div>

          {sugerencias.length === 0 ? (
            <Card className="p-8 text-center">
              <Empty icon="💡">{t.feedback.noSuggestions}</Empty>
              <p className="text-xs text-creamsoft mt-2">
                Cuando los dueños de negocios presionen el botón de sugerencias en su panel, sus mensajes llegarán aquí de inmediato.
              </p>
            </Card>
          ) : (
            <div className="space-y-4">
              {sugerencias.map((s) => (
                <Card key={s.id} className="p-5">
                  <div className="flex items-start justify-between gap-3 flex-wrap border-b border-line pb-3 mb-3">
                    <div className="flex items-center gap-2.5 flex-wrap">
                      <span className="text-xs font-semibold px-2.5 py-1 rounded bg-gold/15 text-gold border border-gold/30">
                        {s.tipo === 'idea' && '💡 Idea / Función'}
                        {s.tipo === 'mejora' && '⚡ Mejora'}
                        {s.tipo === 'error' && '🐞 Reporte de error'}
                        {s.tipo === 'otro' && '💬 Comentario'}
                      </span>
                      <h4 className="font-serif text-base font-semibold text-cream">{s.titulo}</h4>
                    </div>

                    <div className="flex items-center gap-2">
                      <Select
                        value={s.estado}
                        onChange={(e) => handleCambiarEstadoSugerencia(s.id, e.target.value)}
                        className="text-xs py-1 px-2 font-semibold"
                      >
                        <option value="Pendiente">⏳ Pendiente</option>
                        <option value="En revisión">🔍 En revisión</option>
                        <option value="Planeada">📝 Planeada</option>
                        <option value="Implementada">✅ Implementada</option>
                      </Select>
                      <button
                        onClick={() => handleEliminarSugerencia(s.id)}
                        className="text-creamsoft hover:text-wine text-sm p-1 transition-colors"
                        title="Eliminar sugerencia"
                      >
                        🗑️
                      </button>
                    </div>
                  </div>

                  <p className="text-creamsoft text-[13px] leading-relaxed mb-3 whitespace-pre-wrap">
                    {s.mensaje}
                  </p>

                  <div className="flex items-center justify-between gap-2 text-[11.5px] text-creamsoft pt-2 border-t border-line/60 flex-wrap">
                    <div>
                      De: <b className="text-cream">{s.negocio_nombre || 'Negocio'}</b> {s.usuario_email && `(${s.usuario_email})`}
                    </div>
                    <div>
                      {fmtDateLong(s.creado_en)}
                    </div>
                  </div>
                </Card>
              ))}
            </div>
          )}
        </div>
      )}

      {seccion === 'seguridad' && (
        <div className="space-y-6 max-w-2xl">
          <Card className="p-6">
            <h3 className="font-serif text-xl font-semibold mb-2 flex items-center gap-2">
              🛡️ {t.security?.superSecurityTitle || 'Seguridad y Control de Accesos'}
            </h3>
            <p className="text-creamsoft text-sm leading-relaxed mb-4">
              {t.security?.superSecurityDesc || 'Sistema de protección anti-fuerza bruta: tras 6 intentos fallidos, el acceso se bloquea durante 6 horas. Aquí puedes generar códigos de desbloqueo para clientes que lo soliciten a kkiosko440@gmail.com.'}
            </p>
            <div className="bg-paper2 p-4 rounded border border-line/60 space-y-2 text-xs text-creamsoft">
              <p><strong className="text-cream">• Límite de intentos:</strong> 6 intentos consecutivos con contraseña incorrecta.</p>
              <p><strong className="text-cream">• Duración del bloqueo:</strong> 6 horas automáticas desde el último intento fallido.</p>
              <p><strong className="text-cream">• Correo oficial de soporte:</strong> <span className="text-gold font-mono">{SUPPORT_EMAIL}</span></p>
            </div>
          </Card>

          <Card className="p-6">
            <h4 className="font-serif text-lg font-semibold mb-1 flex items-center gap-2">
              🔑 {t.security?.clientEmailLabel || 'Generador de Código de Desbloqueo'}
            </h4>
            <p className="text-creamsoft text-xs mb-4">
              Ingresa el correo del cliente que te ha escrito solicitando el desbloqueo para obtener su código único instantáneo.
            </p>
            <div className="space-y-3">
              <input
                type="email"
                value={emailClienteDesbloqueo}
                onChange={(e) => setEmailClienteDesbloqueo(e.target.value)}
                placeholder={t.security?.clientEmailPlaceholder || 'ejemplo@correo.com'}
                className="w-full bg-paper border border-line rounded px-3 py-2.5 text-sm text-cream focus:outline-none focus:border-gold"
              />

              {emailClienteDesbloqueo.trim() && (
                <div className="p-4 bg-paper2 border border-gold/40 rounded space-y-3">
                  <div>
                    <p className="text-xs text-creamsoft mb-1">{t.security?.generatedUnlockCode || 'Código de desbloqueo para este cliente:'}</p>
                    <p className="text-2xl font-mono font-bold text-gold tracking-wider">
                      {getUnlockCodeForEmail(emailClienteDesbloqueo)}
                    </p>
                  </div>
                  <div className="flex gap-2 flex-wrap">
                    <button
                      type="button"
                      onClick={() => {
                        navigator.clipboard?.writeText(getUnlockCodeForEmail(emailClienteDesbloqueo))
                        setCopiadoCod(true)
                        notify(t.security?.emailCopied ? 'Código copiado al portapapeles' : 'Código copiado')
                        setTimeout(() => setCopiadoCod(false), 3000)
                      }}
                      className="bg-gold text-paper font-semibold text-xs py-2 px-3.5 rounded hover:bg-golddark transition-colors"
                    >
                      {copiadoCod ? '✓ Copiado' : '📋 Copiar código'}
                    </button>
                    <a
                      href={`mailto:${emailClienteDesbloqueo.trim()}?subject=${encodeURIComponent('Tu código de desbloqueo de Kiosko')}&body=${encodeURIComponent(`Hola,\n\nHemos recibido tu solicitud de soporte. Tu código oficial de desbloqueo para volver a ingresar a tu cuenta de Kiosko es:\n\n${getUnlockCodeForEmail(emailClienteDesbloqueo)}\n\nIngrésalo en la casilla de desbloqueo en la app.\n\nSaludos,\nEquipo de Soporte Kiosko (${SUPPORT_EMAIL})`)}`}
                      className="bg-paper border border-line text-cream hover:border-gold font-semibold text-xs py-2 px-3.5 rounded transition-colors"
                    >
                      {t.security?.sendEmailToClient || '✉️ Enviar correo al cliente'}
                    </a>
                  </div>
                </div>
              )}
            </div>
          </Card>

          <Card className="p-6">
            <h4 className="font-serif text-lg font-semibold mb-2 flex items-center gap-2">
              {t.security?.masterUnlockTitle || '🔑 Clave Maestra de Desbloqueo'}
            </h4>
            <p className="text-creamsoft text-xs mb-3">
              {t.security?.masterUnlockDesc || 'Esta clave maestra desbloquea cualquier bloqueo en cualquier dispositivo:'}
            </p>
            <div className="inline-block p-3 bg-paper border border-wine/40 rounded font-mono font-bold text-base text-gold">
              {MASTER_UNLOCK_CODE}
            </div>

            <div className="mt-5 pt-4 border-t border-line/60">
              <button
                type="button"
                onClick={() => {
                  if (typeof window !== 'undefined' && window.localStorage) {
                    const keys = []
                    for (let i = 0; i < window.localStorage.length; i++) {
                      const k = window.localStorage.key(i)
                      if (k && k.startsWith('kiosko_sec_lock_')) keys.push(k)
                    }
                    keys.forEach((k) => window.localStorage.removeItem(k))
                    notify(t.security?.localLocksCleared || 'Bloqueos locales eliminados en este dispositivo')
                  }
                }}
                className="text-xs text-creamsoft hover:text-wine bg-transparent border border-line rounded px-3 py-1.5 transition-colors"
              >
                🧹 {t.security?.clearLocalLocks || 'Limpiar bloqueos locales de este dispositivo'}
              </button>
            </div>
          </Card>
        </div>
      )}

      {/* Modal de confirmación de eliminación de negocio */}
      {negocioAEliminar && (
        <Modal onClose={() => !eliminando && setNegocioAEliminar(null)}>
          <div className="space-y-4 text-left">
            <div className="border-b border-line pb-3">
              <span className="text-xs font-semibold uppercase tracking-wider text-wine">⚠️ Acción irreversible</span>
              <h3 className="font-serif text-xl font-semibold text-cream mt-1">
                ¿Eliminar negocio "{negocioAEliminar.nombre}"?
              </h3>
            </div>

            <p className="text-creamsoft text-sm leading-relaxed">
              Esta acción borrará permanentemente el negocio <b className="text-cream">{negocioAEliminar.nombre}</b> de la plataforma Kiosko, junto con:
            </p>

            <ul className="text-xs text-creamsoft space-y-1.5 list-disc list-inside bg-paper2 p-3 rounded border border-line">
              <li>Todos sus productos y categorías ({negocioAEliminar.productosCount || 0} productos).</li>
              <li>Todo su inventario y registro de compras.</li>
              <li>Historial de pedidos y ventas registradas ({negocioAEliminar.pedidosCount || 0} pedidos).</li>
              <li>Movimientos de finanzas y cuentas de trabajadores vinculados.</li>
            </ul>

            <div className="flex items-center justify-end gap-3 pt-3 border-t border-line">
              <Btn variant="ghost" disabled={eliminando} onClick={() => setNegocioAEliminar(null)}>
                Cancelar
              </Btn>
              <Btn variant="danger" disabled={eliminando} onClick={handleConfirmarEliminacion}>
                {eliminando ? 'Eliminando negocio…' : '🗑️ Sí, eliminar permanentemente'}
              </Btn>
            </div>
          </div>
        </Modal>
      )}
    </div>
  )
}

function NegocioCard({ n, onToggle, onToggleVip, onDelete }) {
  const isVip = Boolean(n.is_vip || n.subscription_status === 'vip' || n.plan === 'VIP / Cortesía')
  const tier = getTierForProductCount(n.productosCount ?? 0)
  const esBodega = n.modo_operacion === 'inventario'

  return (
    <div className="rounded border border-line bg-paper2 overflow-hidden flex flex-col justify-between">
      <div>
        <div className="h-[74px] bg-gradient-to-br from-paper3 to-paper2 border-b border-line relative overflow-hidden">
          {n.logo_url
            ? <img src={n.logo_url} alt={n.nombre} className="w-full h-full object-cover" />
            : <div className="absolute inset-0 bg-[radial-gradient(circle_at_85%_30%,rgba(199,154,60,.18)_0%,transparent_60%)]" />}
        </div>
        <div className="p-5 pb-3">
          <div className="mb-2.5 flex items-center gap-1.5 flex-wrap">
            <Pill tone={n.estado === 'Activo' ? 'activo' : 'pausado'}>{n.estado}</Pill>
            {isVip ? (
              <span className="text-[10.5px] font-bold px-2 py-0.5 rounded bg-gold/20 text-gold border border-gold/40">
                👑 Cortesía VIP
              </span>
            ) : (
              <span className="text-[10.5px] font-semibold px-2 py-0.5 rounded bg-paper border border-line text-cream">
                {tier.name}
              </span>
            )}
            <span className="text-[10.5px] px-2 py-0.5 rounded bg-paper border border-line text-creamsoft">
              {esBodega ? '📦 Bodega' : '🍽️ Catálogo'}
            </span>
          </div>
          <h3 className="font-serif text-lg font-semibold mb-0.5 flex items-center gap-1.5">
            <NegocioLogo negocio={n} size={20} /> {n.nombre}
          </h3>
          <p className="text-[12.5px] text-creamsoft mb-3">{n.slogan}</p>
          <div className="flex gap-4 mb-2 font-mono text-[11.5px] text-creamsoft">
            <div>
              <b className="block font-serif text-base text-cream font-semibold">{n.productosCount ?? 0}</b>productos
            </div>
            <div>
              <b className="block font-serif text-base text-cream font-semibold">{fmt$(n.ventasMes || 0)}</b>ventas/mes
            </div>
          </div>

          {/* Correo del dueño */}
          <div className="mt-3 p-2.5 rounded bg-paper3/60 border border-line flex items-center justify-between gap-2 text-xs">
            <div className="min-w-0 flex-1">
              <span className="text-[10.5px] text-creamsoft block">👤 Correo del dueño:</span>
              <span className="font-mono text-gold font-medium truncate block select-all text-[12px]" title={n.dueno_email || 'Sin correo vinculado'}>
                {n.dueno_email || 'Sin correo vinculado'}
              </span>
            </div>
            {n.dueno_email && n.dueno_email !== 'Sin correo vinculado' && (
              <a
                href={`mailto:${n.dueno_email}?subject=${encodeURIComponent(`Contacto oficial Kiosko — ${n.nombre}`)}`}
                className="text-creamsoft hover:text-gold p-1 text-sm shrink-0 transition-colors"
                title={`Enviar correo a ${n.dueno_email}`}
              >
                ✉️
              </a>
            )}
          </div>
        </div>
      </div>
      <div className="p-5 pt-0">
        <div className="flex items-center justify-between gap-1.5 pt-3 border-t border-line flex-wrap">
          <Btn size="sm" variant={isVip ? 'mustard' : 'ghost'} onClick={onToggleVip} title="Otorgar o revocar acceso gratuito VIP permanente">
            {isVip ? '👑 Quitar VIP' : '👑 Dar VIP'}
          </Btn>
          <Btn size="sm" variant="ghost" onClick={onToggle}>
            {n.estado === 'Activo' ? 'Pausar' : 'Activar'}
          </Btn>
          <Btn size="sm" variant="danger" onClick={onDelete} title="Eliminar negocio de la plataforma">
            🗑️
          </Btn>
        </div>
      </div>
    </div>
  )
}