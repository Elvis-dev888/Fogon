import { useState, useEffect, useCallback } from 'react'
import { Btn, StatCard, Pill, NegocioLogo, Card, Empty, Select, Modal } from './ui'
import { fmt$, fmtDateLong } from '../lib/helpers'
import { toggleNegocioEstado, eliminarNegocio, fetchSugerencias, actualizarEstadoSugerencia, eliminarSugerencia } from '../lib/api'
import { useLanguage } from '../lib/i18n.jsx'

export default function SuperadminView({ negocios, onChanged, notify }) {
  const { t } = useLanguage()
  const [seccion, setSeccion] = useState('negocios') // 'negocios' | 'sugerencias'
  const [sugerencias, setSugerencias] = useState([])
  const [cargandoSugerencias, setCargandoSugerencias] = useState(false)
  const [negocioAEliminar, setNegocioAEliminar] = useState(null)
  const [eliminando, setEliminando] = useState(false)

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
      <div className="mb-6 pb-6 border-b border-line">
        <h2 className="font-serif text-3xl font-semibold mb-2">Panel del Superadministrador</h2>
        <p className="text-creamsoft text-sm max-w-xl leading-relaxed">
          Centro de control global de la plataforma. Supervisa negocios en producción y revisa las ideas y sugerencias enviadas directamente por los propietarios.
        </p>

        {/* Pestañas de navegación de Superadmin */}
        <div className="flex gap-2 mt-5">
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
            📬 {t.feedback.inboxTitle}
            {pendientesCount > 0 && (
              <span className="bg-wine text-paper text-[10px] font-bold px-2 py-0.5 rounded-full">
                {pendientesCount} nuevas
              </span>
            )}
          </button>
        </div>
      </div>

      {seccion === 'negocios' && (
        <div>
          <div className="grid grid-cols-[repeat(auto-fit,minmax(180px,1fr))] gap-3.5 mb-8">
            <StatCard label="Negocios activos" value={negocios.filter((n) => n.estado === 'Activo').length} />
            <StatCard label="Ventas del mes (todas)" value={fmt$(totalVentasMes)} tone="gold" />
            <StatCard label="Pedidos totales" value={totalPedidos} tone="champagne" />
            <StatCard label="Sugerencias recibidas" value={sugerencias.length} tone="sage" />
          </div>

          <h3 className="font-serif text-xl mb-3">Negocios registrados</h3>
          {negocios.length === 0 ? (
            <p className="text-creamsoft text-sm">Todavía no hay negocios — aparecerán aquí en cuanto alguien registre el suyo.</p>
          ) : (
            <div className="grid grid-cols-[repeat(auto-fill,minmax(270px,1fr))] gap-4">
              {negocios.map((n) => (
                <NegocioCard
                  key={n.id}
                  n={n}
                  onToggle={() => handleToggle(n)}
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

function NegocioCard({ n, onToggle, onDelete }) {
  return (
    <div className="rounded border border-line bg-paper2 overflow-hidden flex flex-col justify-between">
      <div>
        <div className="h-[74px] bg-gradient-to-br from-paper3 to-paper2 border-b border-line relative overflow-hidden">
          {n.logo_url
            ? <img src={n.logo_url} alt={n.nombre} className="w-full h-full object-cover" />
            : <div className="absolute inset-0 bg-[radial-gradient(circle_at_85%_30%,rgba(199,154,60,.18)_0%,transparent_60%)]" />}
        </div>
        <div className="p-5 pb-3">
          <div className="mb-2.5">
            <Pill tone={n.estado === 'Activo' ? 'activo' : 'pausado'}>{n.estado}</Pill>
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
        </div>
      </div>
      <div className="p-5 pt-0">
        <div className="flex items-center justify-between gap-2 pt-3 border-t border-line">
          <Btn size="sm" variant="ghost" onClick={onToggle}>
            {n.estado === 'Activo' ? 'Pausar' : 'Activar'}
          </Btn>
          <Btn size="sm" variant="danger" onClick={onDelete} title="Eliminar negocio de la plataforma">
            🗑️ Eliminar
          </Btn>
        </div>
      </div>
    </div>
  )
}