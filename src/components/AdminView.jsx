import { useEffect, useState, useCallback } from 'react'
import {
  fetchCategorias, fetchProductos, fetchIngredientes, fetchCompras,
  fetchPedidos, fetchVentas, fetchTrabajadores, fetchIngresos, fetchEgresos,
  subirLogoNegocio, updateNegocioLogo,
} from '../lib/api'
import {
  TabDashboard, TabProductos, TabCategorias, TabInventario, TabCompras,
  TabPedidos, TabVentas, TabTrabajadores, TabFinanzas, TabEstadisticas,
} from './AdminTabs'
import { supabase } from '../lib/supabaseClient'
import { playPedidoNuevo, fmt$ } from '../lib/helpers'
import { fetchCodigoNegocio, regenerarCodigoNegocio } from '../lib/auth'
import { NegocioLogo } from './ui'

const TABS = [
  ['dashboard', '📊', 'Dashboard'],
  ['productos', '🍔', 'Productos'],
  ['categorias', '🏷️', 'Categorías'],
  ['inventario', '📦', 'Inventario'],
  ['compras', '🧾', 'Compras'],
  ['pedidos', '🧑‍🍳', 'Pedidos'],
  ['ventas', '💰', 'Ventas'],
  ['trabajadores', '👥', 'Trabajadores'],
  ['finanzas', '📈', 'Ingresos / Egresos'],
  ['estadisticas', '📉', 'Estadísticas'],
]

export default function AdminView({ negocio, onExit, notify, onNegocioUpdated }) {
  const [tab, setTab] = useState('dashboard')
  const [data, setData] = useState(null)
  const [loading, setLoading] = useState(true)

  const reload = useCallback(async () => {
    setLoading(true)
    const [categorias, productos, ingredientes, compras, pedidos, ventas, trabajadores, ingresos, egresos] =
      await Promise.all([
        fetchCategorias(negocio.id),
        fetchProductos(negocio.id),
        fetchIngredientes(negocio.id),
        fetchCompras(negocio.id),
        fetchPedidos(negocio.id),
        fetchVentas(negocio.id),
        fetchTrabajadores(negocio.id),
        fetchIngresos(negocio.id),
        fetchEgresos(negocio.id),
      ])
    setData({ categorias, productos, ingredientes, compras, pedidos, ventas, trabajadores, ingresos, egresos })
    setLoading(false)
  }, [negocio.id])

  useEffect(() => {
    reload()
  }, [reload])

  // Timbre + registro en vivo: cuando un cliente confirma un pedido, le suena
  // y le aparece de una vez al que esté administrando este negocio — sin
  // necesidad de recargar la página ni cambiar de pestaña.
  useEffect(() => {
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
  }, [negocio.id, reload, notify])

  if (loading || !data) {
    return <p className="text-creamsoft text-sm">Cargando información de {negocio.nombre}…</p>
  }

  const props = { negocio, data, reload, notify, onNegocioUpdated }

  return (
    <div className="grid grid-cols-[220px_1fr] gap-5 items-start max-[820px]:grid-cols-1">
      <nav className="bg-paper2 border border-line rounded p-4 sticky top-[78px] flex flex-col gap-0.5 max-[820px]:static max-[820px]:flex-row max-[820px]:overflow-x-auto">
        <div className="text-gold font-serif font-semibold text-base pb-3.5 mb-2.5 border-b border-line max-[820px]:hidden flex items-center gap-2">
          <LogoUploader negocio={negocio} notify={notify} onNegocioUpdated={onNegocioUpdated} />
          {negocio.nombre}
        </div>
        <CodigoEmpleado negocioId={negocio.id} notify={notify} />
        {TABS.map(([k, icon, label]) => {
          const pendientesPedidos = k === 'pedidos' ? data.pedidos.filter((p) => p.estado !== 'Entregado').length : 0
          return (
            <button
              key={k}
              onClick={() => setTab(k)}
              className={`text-left px-3 py-2.5 rounded-sm text-[13px] flex items-center gap-2.5 whitespace-nowrap transition-colors ${
                tab === k ? 'bg-gold/15 text-gold font-semibold' : 'text-creamsoft hover:bg-white/5 hover:text-cream'
              }`}
            >
              {icon} {label}
              {pendientesPedidos > 0 && (
                <span className="ml-auto bg-gold text-paper text-[10px] font-bold rounded-full w-5 h-5 grid place-items-center animate-pulse">
                  {pendientesPedidos}
                </span>
              )}
            </button>
          )
        })}
        <button
          onClick={onExit}
          className="mt-2.5 pt-3 border-t border-line text-left px-3 py-2.5 text-[13px] text-creamsoft hover:text-cream"
        >
          ⏻ Cerrar sesión
        </button>
      </nav>
      <div className="animate-fadein">
        {tab === 'dashboard' && <TabDashboard {...props} />}
        {tab === 'productos' && <TabProductos {...props} />}
        {tab === 'categorias' && <TabCategorias {...props} />}
        {tab === 'inventario' && <TabInventario {...props} />}
        {tab === 'compras' && <TabCompras {...props} />}
        {tab === 'pedidos' && <TabPedidos {...props} />}
        {tab === 'ventas' && <TabVentas {...props} />}
        {tab === 'trabajadores' && <TabTrabajadores {...props} />}
        {tab === 'finanzas' && <TabFinanzas {...props} />}
        {tab === 'estadisticas' && <TabEstadisticas {...props} />}
      </div>
    </div>
  )
}

// Logo del negocio, con un botón de texto siempre visible (no depende de
// hover, así que funciona igual en computador y en celular) para que el
// dueño suba o cambie su imagen. Se ve tanto en Admin negocio como en
// Cliente, porque ambos leen el mismo campo logo_url del negocio.
function LogoUploader({ negocio, notify, onNegocioUpdated }) {
  const [subiendo, setSubiendo] = useState(false)

  async function onPickFile(e) {
    const file = e.target.files?.[0]
    e.target.value = '' // permite volver a elegir el mismo archivo después
    if (!file) return
    setSubiendo(true)
    try {
      const url = await subirLogoNegocio(negocio.id, file)
      await updateNegocioLogo(negocio.id, url)
      onNegocioUpdated?.({ logo_url: url })
      notify('Logo actualizado')
    } catch (err) {
      console.error('[Fogón] Error subiendo el logo:', err)
      notify('No se pudo subir el logo — intenta de nuevo')
    } finally {
      setSubiendo(false)
    }
  }

  return (
    <div className="flex items-center gap-2">
      <NegocioLogo negocio={negocio} size={26} />
      <label className="text-[11px] font-normal text-gold hover:text-champagne cursor-pointer underline underline-offset-2 tracking-normal normal-case">
        {subiendo ? 'Subiendo…' : negocio?.logo_url ? 'Cambiar logo' : 'Subir logo'}
        <input type="file" accept="image/*" className="hidden" disabled={subiendo} onChange={onPickFile} />
      </label>
    </div>
  )
}

function CodigoEmpleado({ negocioId, notify }) {
  const [codigo, setCodigo] = useState('')
  const [loading, setLoading] = useState(true)
  const [regenerando, setRegenerando] = useState(false)

  useEffect(() => {
    fetchCodigoNegocio(negocioId).then(setCodigo).finally(() => setLoading(false))
  }, [negocioId])

  async function copiar() {
    await navigator.clipboard.writeText(codigo)
    notify('Código copiado — pásaselo a tu empleado')
  }

  async function regenerar() {
    setRegenerando(true)
    try {
      const nuevo = await regenerarCodigoNegocio()
      setCodigo(nuevo)
      notify('Código nuevo generado — el anterior ya no sirve')
    } finally {
      setRegenerando(false)
    }
  }

  if (loading) return null

  return (
    <div className="mb-3 pb-3 border-b border-line max-[820px]:hidden">
      <p className="text-[10px] uppercase tracking-wide text-creamsoft mb-1">Código para tu empleado</p>
      <button onClick={copiar} className="font-mono text-sm tracking-[0.25em] text-cream bg-paper border border-line rounded-sm px-2.5 py-1.5 w-full text-center hover:border-gold">
        {codigo}
      </button>
      <button onClick={regenerar} disabled={regenerando} className="text-[11px] text-creamsoft hover:text-gold mt-1.5 w-full text-center">
        {regenerando ? 'Generando…' : 'Generar uno nuevo'}
      </button>
    </div>
  )
}