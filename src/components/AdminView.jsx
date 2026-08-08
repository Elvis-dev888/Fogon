import { useEffect, useState, useCallback } from 'react'
import {
  fetchCategorias, fetchProductos, fetchIngredientes, fetchCompras,
  fetchPedidos, fetchVentas, fetchTrabajadores, fetchIngresos, fetchEgresos,
} from '../lib/api'
import {
  TabDashboard, TabProductos, TabCategorias, TabInventario, TabCompras,
  TabPedidos, TabVentas, TabTrabajadores, TabFinanzas, TabEstadisticas,
} from './AdminTabs'

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

export default function AdminView({ negocio, onExit, notify }) {
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

  if (loading || !data) {
    return <p className="text-creamsoft text-sm">Cargando información de {negocio.nombre}…</p>
  }

  const props = { negocio, data, reload, notify }

  return (
    <div className="grid grid-cols-[220px_1fr] gap-5 items-start max-[820px]:grid-cols-1">
      <nav className="bg-paper2 border border-line rounded p-4 sticky top-[78px] flex flex-col gap-0.5 max-[820px]:static max-[820px]:flex-row max-[820px]:overflow-x-auto">
        <div className="text-gold font-serif font-semibold text-base pb-3.5 mb-2.5 border-b border-line max-[820px]:hidden">
          {negocio.emoji} {negocio.nombre}
        </div>
        {TABS.map(([k, icon, label]) => (
          <button
            key={k}
            onClick={() => setTab(k)}
            className={`text-left px-3 py-2.5 rounded-sm text-[13px] flex items-center gap-2.5 whitespace-nowrap transition-colors ${
              tab === k ? 'bg-gold/15 text-gold font-semibold' : 'text-creamsoft hover:bg-white/5 hover:text-cream'
            }`}
          >
            {icon} {label}
          </button>
        ))}
        <button
          onClick={onExit}
          className="mt-2.5 pt-3 border-t border-line text-left px-3 py-2.5 text-[13px] text-creamsoft hover:text-cream"
        >
          ↩ Cambiar de negocio
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
