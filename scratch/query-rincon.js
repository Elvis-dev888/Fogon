import { createClient } from '@supabase/supabase-js'

const url = 'https://qzmqkwmliworpjzadouy.supabase.co'
const key = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6InF6bXFrd21saXdvcnBqemFkb3V5Iiwicm9sZSI6ImFub24iLCJpYXQiOjE3ODYyMTA3NjIsImV4cCI6MjEwMTc4Njc2Mn0.OIcw_5ol2xd65acNpNNu4J2tEtQuPHXefGOf6W9fp6w'

const supabase = createClient(url, key)

async function test() {
  const { data: negocios, error: eNeg } = await supabase.from('negocios').select('*')
  console.log('Negocios:', negocios?.map(n => ({ id: n.id, nombre: n.nombre })))
  
  const rincon = negocios?.find(n => n.nombre?.toLowerCase().includes('rincón') || n.nombre?.toLowerCase().includes('rincon'))
  if (!rincon) {
    console.log('No rincon found')
    return
  }
  console.log('Found rincon:', rincon.id, rincon.nombre)

  const { data: ventas, error: eVentas } = await supabase
    .from('ventas')
    .select('*, pedidos(*, pedido_items(*))')
    .eq('negocio_id', rincon.id)
    .order('creado_en', { ascending: false })
  
  console.log('Ventas count:', ventas?.length)
  console.log('Ventas raw:', JSON.stringify(ventas, null, 2))
}

test().catch(console.error)