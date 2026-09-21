import { useCallback, useEffect, useRef, useState } from 'react'
import { Btn, NegocioLogo } from './ui'
import { TabPedidos } from './AdminTabs'
import { fetchPedidos, fetchProductos } from '../lib/api'
import { supabase } from '../lib/supabaseClient'
import { notificarPedidoNuevoConVoz, playCampanaRestaurante, fmt$ } from '../lib/helpers'

// Cuánto tiempo suena/parpadea la alerta si nadie la reconoce (spec: 15–30s).
const ALERTA_DURACION_MS = 25000
const ALERTA_INTERVALO_MS = 2500

export default function EmpleadoView({ negocio, onExit, notify }) {
  const [pedidos, setPedidos] = useState([])
  const [productos, setProductos] = useState([])
  const [loading, setLoading] = useState(true)
  const [alertas, setAlertas] = useState([]) // pedidos nuevos sin reconocer: [{id, numero, cliente, total}]
  const timers = useRef({}) // pedidoId -> { interval, timeout }
  const [sonidoHabilitado, setSonidoHabilitado] = useState(() => {
    if (typeof window === 'undefined') return true
    return window.localStorage?.getItem('kiosko_sonido_habilitado') !== 'false'
  })

  function toggleSonido() {
    const nuevo = !sonidoHabilitado
    setSonidoHabilitado(nuevo)
    if (typeof window !== 'undefined') {
      window.localStorage?.setItem('kiosko_sonido_habilitado', String(nuevo))
    }
    notify?.(nuevo ? '🔔 Sonido y voz activados' : '🔕 Sonido silenciado')
  }

  function probarSonido() {
    notificarPedidoNuevoConVoz({
      cliente: 'Carlos Mesa 3',
      notas_entrega: '🍽️ Mesa 3 · 💵 Pago en Efectivo',
      total: 25000,
      tipo_entrega: 'local',
    }, true)
    notify?.('🔊 Probando campana y voz...')
  }

  const reload = useCallback(async () => {
    setLoading(true)
    const [p, prods] = await Promise.all([fetchPedidos(negocio.id), fetchProductos(negocio.id)])
    setPedidos(p)
    setProductos(prods)
    setLoading(false)
  }, [negocio.id])

  useEffect(() => { reload() }, [reload])

  function reconocer(pedidoId) {
    setAlertas((a) => a.filter((x) => x.id !== pedidoId))
    const t = timers.current[pedidoId]
    if (t) {
      clearInterval(t.interval)
      clearTimeout(t.timeout)
      delete timers.current[pedidoId]
    }
  }

  useEffect(() => {
    const channel = supabase
      .channel(`empleado-pedidos-${negocio.id}`)
      .on(
        'postgres_changes',
        { event: 'INSERT', schema: 'public', table: 'pedidos', filter: `negocio_id=eq.${negocio.id}` },
        (payload) => {
          const nuevo = payload.new
          notificarPedidoNuevoConVoz(nuevo)
          notify(`🔔 Pedido nuevo de ${nuevo.cliente} — ${fmt$(nuevo.total)}`)
          setAlertas((a) => [...a, { id: nuevo.id, numero: nuevo.numero, cliente: nuevo.cliente, total: nuevo.total }])

          // repite el timbre cada 2.5s hasta que lo reconozcan, o hasta ~25s
          const interval = setInterval(() => playCampanaRestaurante(), ALERTA_INTERVALO_MS)
          const timeout = setTimeout(() => {
            clearInterval(interval)
            setAlertas((a) => a.filter((x) => x.id !== nuevo.id))
            delete timers.current[nuevo.id]
          }, ALERTA_DURACION_MS)
          timers.current[nuevo.id] = { interval, timeout }

          reload()
        }
      )
      .on('postgres_changes', { event: 'UPDATE', schema: 'public', table: 'pedidos', filter: `negocio_id=eq.${negocio.id}` }, () => reload())
      .subscribe()
    return () => {
      supabase.removeChannel(channel)
      Object.values(timers.current).forEach((t) => { clearInterval(t.interval); clearTimeout(t.timeout) })
    }
  }, [negocio.id, reload, notify])

  return (
    <div>
      <div className="flex items-center justify-between mb-6 pb-4 border-b border-line">
        <div>
          <h2 className="font-serif text-2xl font-semibold flex items-center gap-2"><NegocioLogo negocio={negocio} size={30} /> {negocio.nombre}</h2>
          <p className="text-creamsoft text-sm">Estás atendiendo pedidos — se actualizan solos.</p>
        </div>
        <div className="flex items-center gap-2">
          <button
            type="button"
            onClick={toggleSonido}
            title={sonidoHabilitado ? 'Silenciar timbre y voz de pedidos' : 'Activar timbre y voz de pedidos'}
            className={`px-3 py-1.5 rounded-lg border text-sm font-medium transition-all flex items-center gap-1.5 ${
              sonidoHabilitado
                ? 'bg-wine/20 border-wine text-wine hover:bg-wine/30'
                : 'bg-cream/10 border-line text-creamsoft hover:text-cream'
            }`}
          >
            <span>{sonidoHabilitado ? '🔔' : '🔕'}</span>
            <span className="hidden sm:inline text-xs">{sonidoHabilitado ? 'Sonido activo' : 'Silenciado'}</span>
          </button>
          <button
            type="button"
            onClick={probarSonido}
            title="Probar timbre y voz"
            className="px-2.5 py-1.5 rounded-lg border border-line bg-surface/50 text-creamsoft hover:text-cream text-xs font-medium transition-all flex items-center gap-1"
          >
            <span>🔊</span>
            <span className="hidden sm:inline">Probar</span>
          </button>
          <Btn variant="ghost" onClick={onExit}>⏻ Cerrar sesión</Btn>
        </div>
      </div>

      {alertas.length > 0 && (
        <div className="fixed top-4 left-1/2 -translate-x-1/2 z-[80] flex flex-col gap-2 w-full max-w-[380px] px-4">
          {alertas.map((a) => (
            <div key={a.id} className="bg-wine border border-wine text-cream rounded px-4 py-3 shadow-xl flex items-center justify-between gap-3 animate-pulse">
              <span className="text-[13px] font-semibold">🔔 NUEVO PEDIDO #{a.numero} — {a.cliente} · {fmt$(a.total)}</span>
              <button onClick={() => reconocer(a.id)} className="text-[11px] font-bold bg-cream text-wine rounded-full px-2.5 py-1 shrink-0">Ya lo vi</button>
            </div>
          ))}
        </div>
      )}

      {loading ? <p className="text-creamsoft text-sm">Cargando pedidos…</p> : (
        <TabPedidos
          negocio={negocio}
          data={{ pedidos, productos }}
          reload={reload}
          notify={notify}
          simple
          onAvanzar={reconocer}
        />
      )}
    </div>
  )
}
