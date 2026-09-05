import { useEffect, useState, useCallback } from 'react'
import {
  fetchCategorias, fetchProductos, fetchIngredientes, fetchCompras,
  fetchPedidos, fetchVentas, fetchTrabajadores, fetchIngresos, fetchEgresos,
} from '../lib/api'
import {
  TabDashboard, TabProductos, TabCategorias, TabInventario, TabCompras,
  TabPedidos, TabVentas, TabTrabajadores, TabFinanzas, TabEstadisticas, TabMiNegocio,
  TabMiSuscripcion,
} from './AdminTabs'
import { FeedbackModal } from './FeedbackModal'
import { ShareMenuModal } from './ShareMenuModal'
import { TabErrorBoundary } from './ui'
import { supabase } from '../lib/supabaseClient'
import { playPedidoNuevo, fmt$ } from '../lib/helpers'
import { fetchCodigoNegocio, regenerarCodigoNegocio } from '../lib/auth'
import { useLanguage } from '../lib/i18n.jsx'

const TABS = [
  ['dashboard', '📊'], ['suscripcion', '💳'], ['minegocio', '🏪'], ['productos', '🍔'],
  ['categorias', '🏷️'], ['inventario', '📦'], ['compras', '🧾'], ['pedidos', '🧑‍🍳'],
  ['ventas', '💰'], ['trabajadores', '👥'], ['finanzas', '📈'], ['estadisticas', '📉'],
]

export default function AdminView({ negocio, onExit, notify, onNegocioUpdated }) {
  const { t } = useLanguage()
  const [tab, setTab] = useState('dashboard')
  const [data, setData] = useState(null)
  const [loading, setLoading] = useState(true)
  const [mostrarFeedback, setMostrarFeedback] = useState(false)
  const [mostrarShareMenu, setMostrarShareMenu] = useState(false)
  const esModoInventario = negocio.modo_operacion === 'inventario'

  const reload = useCallback(async () => {
    setLoading(true)
    const [categorias, productos, ingredientes, compras, pedidos, ventas, trabajadores, ingresos, egresos] =
      await Promise.all([
        esModoInventario ? Promise.resolve([]) : fetchCategorias(negocio.id),
        esModoInventario ? Promise.resolve([]) : fetchProductos(negocio.id),
        fetchIngredientes(negocio.id),
        fetchCompras(negocio.id),
        esModoInventario ? Promise.resolve([]) : fetchPedidos(negocio.id),
        esModoInventario ? Promise.resolve([]) : fetchVentas(negocio.id),
        fetchTrabajadores(negocio.id),
        fetchIngresos(negocio.id),
        fetchEgresos(negocio.id),
      ])
    setData({ categorias, productos, ingredientes, compras, pedidos, ventas, trabajadores, ingresos, egresos })
    setLoading(false)
  }, [negocio.id, esModoInventario])

  useEffect(() => {
    reload()
  }, [reload])

  // Timbre + registro en vivo: cuando un cliente confirma un pedido, le suena
  // y le aparece de una vez al que esté administrando este negocio — sin
  // necesidad de recargar la página ni cambiar de pestaña.
  useEffect(() => {
    if (esModoInventario) return undefined
    const channel = supabase
      .channel(`admin-pedidos-${negocio.id}`)
      .on(
        'postgres_changes',
        { event: 'INSERT', schema: 'public', table: 'pedidos', filter: `negocio_id=eq.${negocio.id}` },
        (payload) => {
          playPedidoNuevo()
          notify(`🔔 Pedido nuevo de ${payload.new.cliente} — ${fmt$(payload.new.total)}`)
          reload()
        }
      )
      .on(
        'postgres_changes',
        { event: 'UPDATE', schema: 'public', table: 'pedidos', filter: `negocio_id=eq.${negocio.id}` },
        () => reload()
      )
      .subscribe()
    return () => supabase.removeChannel(channel)
  }, [negocio.id, reload, notify, esModoInventario])

  useEffect(() => {
    if (esModoInventario && ['productos', 'categorias', 'pedidos', 'ventas'].includes(tab)) setTab('dashboard')
  }, [esModoInventario, tab])

  if (loading || !data) {
    return <p className="text-creamsoft text-sm">{t.loading} {negocio.nombre}…</p>
  }

  const props = {
    negocio,
    data,
    reload,
    notify,
    onNegocioUpdated,
    onOpenShareMenu: () => setMostrarShareMenu(true),
  }
  const tabsVisibles = esModoInventario
    ? TABS.filter(([key]) => !['productos', 'categorias', 'pedidos', 'ventas'].includes(key))
    : TABS

  return (
    <div className="grid grid-cols-[220px_1fr] gap-5 items-start max-[820px]:grid-cols-1">
      <nav className="bg-paper2 border border-line rounded p-4 sticky top-[78px] flex flex-col gap-0.5 max-[820px]:static max-[820px]:flex-row max-[820px]:overflow-x-auto">
        <div className="flex items-center gap-2.5 pb-3.5 mb-2.5 border-b border-line max-[820px]:hidden">
          {negocio.logo_url ? (
            <img src={negocio.logo_url} alt={negocio.nombre} className="w-8 h-8 rounded-full object-cover border border-gold shrink-0" />
          ) : (
            <span className="text-lg shrink-0">{negocio.emoji}</span>
          )}
          <span className="text-gold font-serif font-semibold text-base truncate">{negocio.nombre}</span>
        </div>
        {!esModoInventario && (
          <>
            <button
              onClick={() => setMostrarShareMenu(true)}
              className="mb-2 text-left px-3 py-2 rounded-sm text-[12.5px] font-semibold text-gold bg-gold/10 hover:bg-gold/20 transition-colors flex items-center gap-2 border border-gold/30"
            >
              🔗 {t.digitalMenu?.button || 'Menú Digital / QR'}
            </button>
            <CodigoEmpleado negocioId={negocio.id} notify={notify} />
          </>
        )}
        {tabsVisibles.map(([k, icon]) => {
          const pendientesPedidos = k === 'pedidos' ? data.pedidos.filter((p) => p.estado !== 'Entregado' && p.estado !== 'Cancelado').length : 0
          return (
            <button
              key={k}
              onClick={() => setTab(k)}
              className={`text-left px-3 py-2.5 rounded-sm text-[13px] flex items-center gap-2.5 whitespace-nowrap transition-colors ${
                tab === k ? 'bg-gold/15 text-gold font-semibold' : 'text-creamsoft hover:bg-white/5 hover:text-cream'
              }`}
            >
              {icon} {t.tabs[k]}
              {pendientesPedidos > 0 && (
                <span className="ml-auto bg-gold text-paper text-[10px] font-bold rounded-full w-5 h-5 grid place-items-center animate-pulse">
                  {pendientesPedidos}
                </span>
              )}
            </button>
          )
        })}
        <button
          onClick={() => setMostrarFeedback(true)}
          className="mt-2 text-left px-3 py-2 rounded-sm text-[12.5px] text-gold hover:bg-gold/10 transition-colors flex items-center gap-2 border border-gold/20"
        >
          {t.feedback.button}
        </button>
        <button
          onClick={onExit}
          className="mt-2.5 pt-3 border-t border-line text-left px-3 py-2.5 text-[13px] text-creamsoft hover:text-cream"
        >
          ⏻ {t.signOut}
        </button>
      </nav>
      <TabErrorBoundary onReset={reload}>
        <div className="animate-fadein">
          {tab === 'dashboard' && <TabDashboard {...props} />}
          {tab === 'suscripcion' && <TabMiSuscripcion {...props} />}
          {tab === 'minegocio' && <TabMiNegocio {...props} />}
          {tab === 'productos' && <TabProductos {...props} />}
          {tab === 'categorias' && <TabCategorias {...props} />}
          {tab === 'inventario' && <TabInventario {...props} />}
          {tab === 'compras' && <TabCompras {...props} />}
          {tab === 'pedidos' && <TabPedidos {...props} simple />}
          {tab === 'ventas' && <TabVentas {...props} />}
          {tab === 'trabajadores' && <TabTrabajadores {...props} />}
          {tab === 'finanzas' && <TabFinanzas {...props} />}
          {tab === 'estadisticas' && <TabEstadisticas {...props} />}
        </div>
      </TabErrorBoundary>
      {mostrarFeedback && (
        <FeedbackModal negocio={negocio} onClose={() => setMostrarFeedback(false)} notify={notify} />
      )}
      {mostrarShareMenu && (
        <ShareMenuModal negocio={negocio} onClose={() => setMostrarShareMenu(false)} notify={notify} />
      )}
    </div>
  )
}

function CodigoEmpleado({ negocioId, notify }) {
  const { t } = useLanguage()
  const [codigo, setCodigo] = useState('')
  const [loading, setLoading] = useState(true)
  const [regenerando, setRegenerando] = useState(false)

  useEffect(() => {
    fetchCodigoNegocio(negocioId).then(setCodigo).finally(() => setLoading(false))
  }, [negocioId])

  async function copiar() {
    await navigator.clipboard.writeText(codigo)
    notify(t.copyCode)
  }

  async function regenerar() {
    setRegenerando(true)
    try {
      const nuevo = await regenerarCodigoNegocio()
      setCodigo(nuevo)
      notify(t.newCode)
    } finally {
      setRegenerando(false)
    }
  }

  if (loading) return null

  return (
    <div className="mb-3 pb-3 border-b border-line max-[820px]:hidden">
      <p className="text-[10px] uppercase tracking-wide text-creamsoft mb-1">{t.employeeCode}</p>
      <button onClick={copiar} className="font-mono text-sm tracking-[0.25em] text-cream bg-paper border border-line rounded-sm px-2.5 py-1.5 w-full text-center hover:border-gold">
        {codigo}
      </button>
      <button onClick={regenerar} disabled={regenerando} className="text-[11px] text-creamsoft hover:text-gold mt-1.5 w-full text-center">
        {regenerando ? t.generating : t.newCode}
      </button>
    </div>
  )
}
