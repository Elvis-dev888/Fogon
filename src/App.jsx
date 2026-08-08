import { useEffect, useState, useCallback } from 'react'
import { Toast } from './components/ui'
import SuperadminView from './components/SuperadminView'
import AdminView from './components/AdminView'
import ClienteView from './components/ClienteView'
import { fetchNegocios } from './lib/api'

const ROLES = [
  ['super', '🛠️ Superadmin'],
  ['admin', '🧑‍🍳 Admin negocio'],
  ['cliente', '🛒 Cliente'],
]

export default function App() {
  const [role, setRole] = useState('super')
  const [negocioId, setNegocioId] = useState(null)
  const [negocios, setNegocios] = useState([])
  const [toast, setToast] = useState(null)
  const [loadError, setLoadError] = useState(null)

  const notify = useCallback((msg) => setToast(msg), [])

  const loadNegocios = useCallback(async () => {
    try {
      const list = await fetchNegocios()
      setNegocios(list)
      setLoadError(null)
    } catch (err) {
      console.error('[Fogón] Error cargando negocios:', err)
      setLoadError(err.message || String(err))
    }
  }, [])

  useEffect(() => {
    loadNegocios()
  }, [loadNegocios])

  const negocio = negocios.find((n) => n.id === negocioId) || null

  function enter(nextRole, id) {
    setRole(nextRole)
    setNegocioId(id)
  }
  function exitNegocio() {
    setNegocioId(null)
    loadNegocios()
  }

  return (
    <div>
      <div className="bg-paper text-creamsoft overflow-hidden whitespace-nowrap border-b border-line">
        <div className="inline-block pl-full animate-ticker font-serif italic text-[13px] py-1.5 tracking-wide">
          {negocios.map((n) => `${n.nombre} — ${n.slogan}`).join('     ·     ')}
          {'     ·     '}
          {negocios.map((n) => `${n.nombre} — ${n.slogan}`).join('     ·     ')}
        </div>
      </div>

      <header className="sticky top-0 z-40 bg-paper/90 backdrop-blur border-b border-line">
        <div className="max-w-[1200px] mx-auto px-5 py-4 flex items-center justify-between gap-4 flex-wrap">
          <div className="flex items-center gap-3">
            <div className="w-[38px] h-[38px] grid place-items-center border border-gold rounded-full text-gold font-serif font-bold">F</div>
            <div>
              <h1 className="font-serif text-xl font-semibold m-0">Fogón</h1>
              <span className="block text-[10.5px] text-creamsoft uppercase tracking-wide">plataforma multiempresa para negocios de comida</span>
            </div>
          </div>
          <div className="flex gap-1 bg-paper2 border border-line rounded-full p-1">
            {ROLES.map(([r, label]) => (
              <button key={r} onClick={() => { setRole(r); setNegocioId(null) }}
                className={`px-4 py-2 rounded-full text-[12.5px] font-semibold ${role === r ? 'bg-gold text-paper' : 'text-creamsoft hover:text-cream'}`}>
                {label}
              </button>
            ))}
          </div>
        </div>
      </header>
      <div className="h-[2px] bg-gradient-to-r from-transparent via-gold to-transparent opacity-70" />

      <div className="bg-paper3 text-creamsoft text-center text-[12px] py-2 px-4 border-b border-line">
        🔎 <b className="text-gold">Modo demostración:</b> el botón de arriba cambia de rol para que explores las 3 vistas. En producción cada rol tiene su propio inicio de sesión (Supabase Auth) y el backend impide que un cliente o un admin entren donde no les corresponde.
      </div>

      <main className="max-w-[1200px] mx-auto px-5 py-8 pb-24">
        {loadError && (
          <div className="mb-6 border border-wine bg-wine/10 text-wine text-sm rounded p-4">
            <b>No se pudo cargar la información de Supabase:</b> {loadError}
          </div>
        )}
        {role === 'super' && <SuperadminView negocios={negocios} onEnter={enter} onChanged={loadNegocios} notify={notify} />}

        {role === 'admin' && (negocio
          ? <AdminView negocio={negocio} onExit={exitNegocio} notify={notify} />
          : <PickNegocio negocios={negocios} role="admin" onEnter={enter} />)}

        {role === 'cliente' && (negocio
          ? <ClienteView negocio={negocio} onExit={exitNegocio} notify={notify} />
          : <PickNegocio negocios={negocios} role="cliente" onEnter={enter} />)}
      </main>

      {toast && <Toast message={toast} onDone={() => setToast(null)} />}
    </div>
  )
}

function PickNegocio({ negocios, role, onEnter }) {
  return (
    <div>
      <div className="mb-7">
        <h2 className="font-serif text-3xl font-semibold mb-2">
          {role === 'admin' ? 'Elige el negocio que vas a administrar' : '¿Dónde quieres pedir hoy?'}
        </h2>
        <p className="text-creamsoft text-sm max-w-lg leading-relaxed">
          {role === 'admin'
            ? 'Cada negocio tiene su propio panel, catálogo, inventario y finanzas — completamente separados.'
            : 'Explora el catálogo, arma tu pedido y síguelo en tiempo real.'}
        </p>
      </div>
      <div className="grid grid-cols-[repeat(auto-fill,minmax(270px,1fr))] gap-4">
        {negocios.filter((n) => n.estado === 'Activo').map((n) => (
          <div key={n.id} className="rounded border border-line bg-paper2 overflow-hidden">
            <div className="h-[74px] bg-gradient-to-br from-paper3 to-paper2 border-b border-line" />
            <div className="p-5">
              <h3 className="font-serif text-lg font-semibold mb-0.5">{n.emoji} {n.nombre}</h3>
              <p className="text-[12.5px] text-creamsoft mb-3">{n.slogan}</p>
              <button onClick={() => onEnter(role, n.id)}
                className="w-full bg-gold text-paper font-semibold text-[13px] rounded py-2.5 hover:bg-golddark">
                {role === 'admin' ? 'Entrar al panel' : 'Ver catálogo'}
              </button>
            </div>
          </div>
        ))}
        {negocios.length === 0 && <p className="text-creamsoft text-sm">Todavía no hay negocios registrados en la plataforma.</p>}
      </div>
    </div>
  )
}
