import { useCallback, useEffect, useState } from 'react'
import { Btn, NegocioLogo } from './ui'
import { TabPedidos } from './AdminTabs'
import { fetchPedidos } from '../lib/api'
import { supabase } from '../lib/supabaseClient'
import { playPedidoNuevo, fmt$ } from '../lib/helpers'

export default function EmpleadoView({ negocio, onExit, notify }) {
  const [pedidos, setPedidos] = useState([])
  const [loading, setLoading] = useState(true)

  const reload = useCallback(async () => {
    setLoading(true)
    const data = await fetchPedidos(negocio.id)
    setPedidos(data)
    setLoading(false)
  }, [negocio.id])

  useEffect(() => { reload() }, [reload])

  useEffect(() => {
    const channel = supabase
      .channel(`empleado-pedidos-${negocio.id}`)
      .on(
        'postgres_changes',
        { event: 'INSERT', schema: 'public', table: 'pedidos', filter: `negocio_id=eq.${negocio.id}` },
        (payload) => {
          playPedidoNuevo()
          notify(`🔔 Pedido nuevo de ${payload.new.cliente} — ${fmt$(payload.new.total)}`)
          reload()
        }
      )
      .on('postgres_changes', { event: 'UPDATE', schema: 'public', table: 'pedidos', filter: `negocio_id=eq.${negocio.id}` }, () => reload())
      .subscribe()
    return () => supabase.removeChannel(channel)
  }, [negocio.id, reload, notify])

  return (
    <div>
      <div className="flex items-center justify-between mb-6 pb-4 border-b border-line">
        <div>
          <h2 className="font-serif text-2xl font-semibold flex items-center gap-2"><NegocioLogo negocio={negocio} size={30} /> {negocio.nombre}</h2>
          <p className="text-creamsoft text-sm">Estás atendiendo pedidos — se actualizan solos.</p>
        </div>
        <Btn variant="ghost" onClick={onExit}>⏻ Cerrar sesión</Btn>
      </div>

      {loading ? <p className="text-creamsoft text-sm">Cargando pedidos…</p> : <TabPedidos data={{ pedidos }} reload={reload} notify={notify} />}
    </div>
  )
}