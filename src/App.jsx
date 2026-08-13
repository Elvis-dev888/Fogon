import { useEffect, useState, useCallback } from 'react'
import { Toast, Btn, NegocioLogo, NegocioBanner } from './components/ui'
import SuperadminView from './components/SuperadminView'
import AdminView from './components/AdminView'
import EmpleadoView from './components/EmpleadoView'
import ClienteView from './components/ClienteView'
import { AdminAuth, SuperadminAuth, EmpleadoAuth, UnirseNegocioForm, CrearNegocioForm, SinPermiso } from './components/Auth'
import { supabase } from './lib/supabaseClient'
import { fetchPerfil, fetchNegocioPorId, signOut } from './lib/auth'
import { fetchNegocios } from './lib/api'

const ROLES = [
  ['super', '🛠️ Superadmin'],
  ['admin', '👑 Admin negocio'],
  ['empleado', '🛎️ Empleado'],
  ['cliente', '🛒 Cliente'],
]

export default function App() {
  const [role, setRole] = useState('cliente')
  const [negocioId, setNegocioId] = useState(null) // solo lo usa el flujo de Cliente
  const [adminIntent, setAdminIntent] = useState(null) // null | 'entrar' | 'registrar' — solo lo usa el flujo de Admin
  const [negocios, setNegocios] = useState([])
  const [toast, setToast] = useState(null)
  const [loadError, setLoadError] = useState(null)

  const [session, setSession] = useState(undefined) // undefined = todavía no se sabe
  const [perfil, setPerfil] = useState(null)
  const [miNegocio, setMiNegocio] = useState(null)

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

  // Sesión de Supabase Auth: se revisa al cargar y se escucha cualquier cambio (login/logout)
  useEffect(() => {
    supabase.auth.getSession().then(({ data }) => setSession(data.session))
    const { data: sub } = supabase.auth.onAuthStateChange((_event, s) => setSession(s))
    return () => sub.subscription.unsubscribe()
  }, [])

  // Cuando hay sesión, cargamos el perfil (rol + negocio_id) de esa cuenta
  const loadPerfil = useCallback(async () => {
    if (!session) {
      setPerfil(null)
      setMiNegocio(null)
      return
    }
    const p = await fetchPerfil(session.user.id)
    setPerfil(p)
    if ((p.rol === 'admin' || p.rol === 'empleado') && p.negocio_id) {
      const n = await fetchNegocioPorId(p.negocio_id)
      setMiNegocio(n)
    } else {
      setMiNegocio(null)
    }
  }, [session])

  useEffect(() => {
    loadPerfil()
  }, [loadPerfil])

  async function handleSignOut() {
    await signOut()
    setRole('cliente')
    setAdminIntent(null)
  }

  function exitNegocioCliente() {
    setNegocioId(null)
    loadNegocios()
  }

  const negocioCliente = negocios.find((n) => n.id === negocioId) || null

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
          <div className="flex items-center gap-3">
            <div className="flex gap-1 bg-paper2 border border-line rounded-full p-1">
              {ROLES.map(([r, label]) => (
                <button key={r} onClick={() => { setRole(r); setAdminIntent(null) }}
                  className={`px-4 py-2 rounded-full text-[12.5px] font-semibold ${role === r ? 'bg-gold text-paper' : 'text-creamsoft hover:text-cream'}`}>
                  {label}
                </button>
              ))}
            </div>
            {session && (
              <Btn size="sm" variant="ghost" onClick={handleSignOut}>Cerrar sesión</Btn>
            )}
          </div>
        </div>
      </header>
      <div className="h-[2px] bg-gradient-to-r from-transparent via-gold to-transparent opacity-70" />

      <main className="max-w-[1200px] mx-auto px-5 py-8 pb-24">
        {loadError && (
          <div className="mb-6 border border-wine bg-wine/10 text-wine text-sm rounded p-4">
            <b>No se pudo cargar la información de Supabase:</b> {loadError}
          </div>
        )}

        {/* ---------------- SUPERADMIN ---------------- */}
        {role === 'super' && (
          session === undefined ? <p className="text-creamsoft text-sm text-center mt-10">Cargando…</p> :
          !session ? <SuperadminAuth onDone={loadPerfil} /> :
          !perfil ? <p className="text-creamsoft text-sm text-center mt-10">Cargando tu perfil…</p> :
          perfil.rol !== 'superadmin' ? <SinPermiso mensaje="Esta cuenta no tiene permisos de superadministrador. Ese rol se asigna a mano, no se puede obtener desde la app." /> :
          <SuperadminView negocios={negocios} onChanged={loadNegocios} notify={notify} />
        )}

        {/* ---------------- ADMIN DE NEGOCIO ---------------- */}
        {role === 'admin' && (
          session === undefined ? <p className="text-creamsoft text-sm text-center mt-10">Cargando…</p> :
          !session ? (
            adminIntent === null
              ? <PickNegocioAdmin negocios={negocios} onEntrar={() => setAdminIntent('entrar')} onRegistrar={() => setAdminIntent('registrar')} />
              : <AdminAuth modoInicial={adminIntent === 'registrar' ? 'registro' : 'login'} onDone={loadPerfil} notify={notify} onVolver={() => setAdminIntent(null)} />
          ) :
          !perfil ? <p className="text-creamsoft text-sm text-center mt-10">Cargando tu perfil…</p> :
          perfil.rol === 'pendiente' ? <CrearNegocioForm notify={notify} onCreated={() => { loadPerfil(); loadNegocios() }} /> :
          perfil.rol === 'superadmin' ? <SinPermiso mensaje="Esta cuenta es de superadministrador, no administra un negocio individual." /> :
          perfil.rol !== 'admin' ? <SinPermiso mensaje="Esta cuenta no está registrada como administradora de un negocio." /> :
          !miNegocio ? <p className="text-creamsoft text-sm text-center mt-10">Cargando tu negocio…</p> :
          <AdminView
            negocio={miNegocio}
            onExit={handleSignOut}
            notify={notify}
            onNegocioUpdated={(logoUrl) => {
              setMiNegocio((prev) => (prev ? { ...prev, logo_url: logoUrl } : prev))
              loadNegocios() // así el logo también se refresca de una en la vista de Cliente
            }}
          />
        )}

        {/* ---------------- EMPLEADO (atiende pedidos) ---------------- */}
        {role === 'empleado' && (
          session === undefined ? <p className="text-creamsoft text-sm text-center mt-10">Cargando…</p> :
          !session ? <EmpleadoAuth onDone={loadPerfil} notify={notify} /> :
          !perfil ? <p className="text-creamsoft text-sm text-center mt-10">Cargando tu perfil…</p> :
          perfil.rol === 'pendiente' ? <UnirseNegocioForm notify={notify} onJoined={() => loadPerfil()} /> :
          perfil.rol !== 'empleado' ? <SinPermiso mensaje="Esta cuenta no está registrada como empleado." /> :
          !miNegocio ? <p className="text-creamsoft text-sm text-center mt-10">Cargando tu negocio…</p> :
          <EmpleadoView negocio={miNegocio} onExit={handleSignOut} notify={notify} />
        )}

        {/* ---------------- CLIENTE (público, sin cuenta) ---------------- */}
        {role === 'cliente' && (negocioCliente
          ? <ClienteView negocio={negocioCliente} onExit={exitNegocioCliente} notify={notify} />
          : <PickNegocio negocios={negocios} onEnter={(id) => setNegocioId(id)} />)}
      </main>

      {toast && <Toast message={toast} onDone={() => setToast(null)} />}
    </div>
  )
}

function PickNegocioAdmin({ negocios, onEntrar, onRegistrar }) {
  return (
    <div>
      <div className="mb-7 flex items-start justify-between gap-4 flex-wrap">
        <div>
          <h2 className="font-serif text-3xl font-semibold mb-2">Panel de negocios</h2>
          <p className="text-creamsoft text-sm max-w-lg leading-relaxed">Elige tu negocio para entrar con tu correo, o registra uno nuevo si vas a usar Fogón por primera vez.</p>
        </div>
        <button onClick={onRegistrar} className="bg-gold text-paper font-semibold text-[13px] rounded-full px-5 py-3 hover:bg-golddark whitespace-nowrap">
          ➕ Registrar mi propio negocio
        </button>
      </div>
      <div className="grid grid-cols-[repeat(auto-fill,minmax(270px,1fr))] gap-4">
        {negocios.map((n) => (
          <div key={n.id} className="rounded border border-line bg-paper2 overflow-hidden">
            <NegocioBanner negocio={n} />
            <div className="p-5">
              <h3 className="font-serif text-lg font-semibold mb-0.5 flex items-center gap-1.5"><NegocioLogo negocio={n} size={20} /> {n.nombre}</h3>
              <p className="text-[12.5px] text-creamsoft mb-3">{n.slogan}</p>
              <button onClick={onEntrar}
                className="w-full bg-paper3 border border-line text-cream font-semibold text-[13px] rounded py-2.5 hover:border-gold hover:text-gold">
                🔑 Ingresar como administrador
              </button>
            </div>
          </div>
        ))}
        {negocios.length === 0 && <p className="text-creamsoft text-sm">Todavía no hay negocios registrados en la plataforma. Sé el primero.</p>}
      </div>
    </div>
  )
}

function PickNegocio({ negocios, onEnter }) {
  return (
    <div>
      <div className="mb-7">
        <h2 className="font-serif text-3xl font-semibold mb-2">¿Dónde quieres pedir hoy?</h2>
        <p className="text-creamsoft text-sm max-w-lg leading-relaxed">Explora el catálogo, arma tu pedido y síguelo en tiempo real.</p>
      </div>
      <div className="grid grid-cols-[repeat(auto-fill,minmax(270px,1fr))] gap-4">
        {negocios.filter((n) => n.estado === 'Activo').map((n) => (
          <div key={n.id} className="rounded border border-line bg-paper2 overflow-hidden">
            <NegocioBanner negocio={n} />
            <div className="p-5">
              <h3 className="font-serif text-lg font-semibold mb-0.5 flex items-center gap-1.5"><NegocioLogo negocio={n} size={20} /> {n.nombre}</h3>
              <p className="text-[12.5px] text-creamsoft mb-3">{n.slogan}</p>
              <button onClick={() => onEnter(n.id)}
                className="w-full bg-gold text-paper font-semibold text-[13px] rounded py-2.5 hover:bg-golddark">
                Ver catálogo
              </button>
            </div>
          </div>
        ))}
        {negocios.length === 0 && <p className="text-creamsoft text-sm">Todavía no hay negocios registrados en la plataforma.</p>}
      </div>
    </div>
  )
}