import { useEffect, useState, useCallback } from 'react'
import { Capacitor } from '@capacitor/core'
import { Toast, Btn, NegocioLogo, NegocioBanner, BrandMark } from './components/ui'
import SuperadminView from './components/SuperadminView'
import AdminView from './components/AdminView'
import EmpleadoView from './components/EmpleadoView'
import ClienteView from './components/ClienteView'
import { AdminAuth, SuperadminAuth, EmpleadoAuth, UnirseNegocioForm, CrearNegocioForm, SinPermiso } from './components/Auth'
import { supabase } from './lib/supabaseClient'
import { fetchPerfil, fetchNegocioPorId, signOut } from './lib/auth'
import { fetchNegocios } from './lib/api'

const ROLES = [
  ['super', '🛠️', 'Admin'],
  ['admin', '👑', 'Negocio'],
  ['empleado', '🛎️', 'Equipo'],
  ['cliente', '🛒', 'Cliente'],
]

export default function App() {
  const isNativeApp = Capacitor.isNativePlatform() // true = corriendo como app (Android); false = navegador/web
  const [role, setRole] = useState('cliente')
  const [negocioId, setNegocioId] = useState(null) // solo lo usa el flujo de Cliente
  const [adminIntent, setAdminIntent] = useState(null) // null | 'entrar' | 'registrar' — solo lo usa el flujo de Admin
  const [negocios, setNegocios] = useState([])
  const [toast, setToast] = useState(null)
  const [loadError, setLoadError] = useState(null)

  const [session, setSession] = useState(undefined) // undefined = todavía no se sabe
  const [perfil, setPerfil] = useState(null)
  const [miNegocio, setMiNegocio] = useState(null)
  const [online, setOnline] = useState(navigator.onLine)
  const [menuAbierto, setMenuAbierto] = useState(false)

  useEffect(() => {
    const goOnline = () => setOnline(true)
    const goOffline = () => setOnline(false)
    window.addEventListener('online', goOnline)
    window.addEventListener('offline', goOffline)
    return () => {
      window.removeEventListener('online', goOnline)
      window.removeEventListener('offline', goOffline)
    }
  }, [])

  const notify = useCallback((msg) => setToast(msg), [])

  const loadNegocios = useCallback(async () => {
    try {
      const list = await fetchNegocios()
      setNegocios(list)
      setLoadError(null)
    } catch (err) {
      console.error('[Kiosco] Error cargando negocios:', err)
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
    setMenuAbierto(false)
  }

  function exitNegocioCliente() {
    setNegocioId(null)
    loadNegocios()
  }

  const negocioCliente = negocios.find((n) => n.id === negocioId) || null

  // Botón físico "atrás" de Android: en vez de cerrar la app de golpe, primero
  // retrocede un nivel dentro de la navegación (como esperaría cualquier app nativa).
  // Solo aplica dentro de la app empacada — en la web no existe ese botón.
  useEffect(() => {
    if (!isNativeApp) return
    let listenerHandle
    let cancelled = false
    import('@capacitor/app').then(({ App: CapacitorApp }) => {
      if (cancelled) return
      CapacitorApp.addListener('backButton', () => {
        if (menuAbierto) { setMenuAbierto(false); return }
        if (role === 'cliente' && negocioCliente) { exitNegocioCliente(); return }
        if (role === 'admin' && !session && adminIntent) { setAdminIntent(null); return }
        if (role !== 'cliente') { setRole('cliente'); return }
        CapacitorApp.exitApp()
      }).then((h) => { listenerHandle = h })
    })
    return () => { cancelled = true; listenerHandle?.remove() }
  }, [isNativeApp, role, negocioCliente, session, adminIntent, menuAbierto])
 if (!online) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-paper text-center px-6">
        <div>
          <div className="w-16 h-16 mx-auto mb-4 rounded-full border border-gold grid place-items-center text-2xl">📡</div>
          <h2 className="font-serif text-2xl font-semibold mb-2">Sin conexión</h2>
          <p className="text-creamsoft text-sm max-w-xs mx-auto">Kiosco necesita internet para funcionar. Revisa tu wifi o datos móviles — se reconecta solo apenas vuelva la señal.</p>
        </div>
      </div>
    )
  }
  return (
    <div className="relative min-h-screen">
      <img src="/Kiosko.jpg" alt="" aria-hidden="true" className="fixed pointer-events-none z-0 left-1/2 top-1/2 w-[min(78vw,760px)] aspect-square -translate-x-1/2 -translate-y-1/2 rounded-full object-cover opacity-[0.10]" />
      <div className="relative z-10 bg-paper text-creamsoft overflow-hidden whitespace-nowrap border-b border-line">
        <div className="inline-block pl-full animate-ticker font-serif italic text-[13px] py-1.5 tracking-wide">
          {negocios.map((n) => `${n.nombre} — ${n.slogan}`).join('     ·     ')}
          {'     ·     '}
          {negocios.map((n) => `${n.nombre} — ${n.slogan}`).join('     ·     ')}
        </div>
      </div>

      <header className="sticky top-0 z-40 bg-paper/90 backdrop-blur border-b border-line">
        <div className={`max-w-[1200px] mx-auto px-5 py-4 flex items-center gap-3 ${!isNativeApp ? 'justify-between flex-wrap' : ''}`}>
          <div className="flex items-center gap-3">
            <BrandMark size={48} />
            <div>
              <h1 className="font-serif text-xl font-semibold m-0">Kiosco</h1>
              <span className="block text-[10.5px] text-creamsoft uppercase tracking-wide">plataforma multiempresa</span>
            </div>
          </div>

          {/* En la web se conserva la navegación original de arriba (pestañas + cerrar sesión).
              En la app, esto se reemplaza por la barra inferior de más abajo. */}
          {!isNativeApp && (
            <div className="flex items-center gap-3">
              <div className="flex gap-1 bg-paper2 border border-line rounded-full p-1">
                {ROLES.map(([r, icon, label]) => (
                  <button key={r} onClick={() => { setRole(r); setAdminIntent(null) }}
                    className={`px-4 py-2 rounded-full text-[12.5px] font-semibold ${role === r ? 'bg-gold text-paper' : 'text-creamsoft hover:text-cream'}`}>
                    {icon} {label}
                  </button>
                ))}
              </div>
              {session && (
                <Btn size="sm" variant="ghost" onClick={handleSignOut}>Cerrar sesión</Btn>
              )}
            </div>
          )}
        </div>
      </header>
      <div className="h-[2px] bg-gradient-to-r from-transparent via-gold to-transparent opacity-70" />

      <main className={`relative z-10 max-w-[1200px] mx-auto px-5 py-8 ${isNativeApp ? 'pb-28' : 'pb-8'}`}>
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
            onNegocioUpdated={(cambios) => {
              setMiNegocio((prev) => (prev ? { ...prev, ...cambios } : prev))
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
          : <PickNegocio negocios={negocios} onEnter={(id) => setNegocioId(id)} showWelcome={isNativeApp} />)}
      </main>

      {isNativeApp && (
        <nav
          className="fixed bottom-0 inset-x-0 z-40 bg-paper2/95 backdrop-blur border-t border-line flex items-stretch"
          style={{ paddingBottom: 'env(safe-area-inset-bottom)' }}
        >
          {ROLES.map(([r, icon, label]) => (
            <button
              key={r}
              onClick={() => { setRole(r); setAdminIntent(null); setMenuAbierto(false) }}
              className={`flex-1 flex flex-col items-center justify-center gap-0.5 py-2.5 text-[10.5px] font-semibold ${role === r ? 'text-gold' : 'text-creamsoft'}`}
            >
              <span className={`text-lg leading-none ${role === r ? 'opacity-100' : 'opacity-70'}`}>{icon}</span>
              {label}
            </button>
          ))}
          <div className="relative flex-1 flex flex-col items-center justify-center">
            <button
              onClick={() => setMenuAbierto((v) => !v)}
              className={`w-full flex flex-col items-center justify-center gap-0.5 py-2.5 text-[10.5px] font-semibold ${menuAbierto ? 'text-gold' : 'text-creamsoft'}`}
            >
              <span className={`text-lg leading-none ${menuAbierto ? 'opacity-100' : 'opacity-70'}`}>👤</span>
              Perfil
            </button>
            {menuAbierto && (
              <div className="absolute bottom-full right-2 mb-2 w-44 bg-paper2 border border-line rounded shadow-[0_10px_30px_rgba(0,0,0,0.5)] p-2 animate-popin">
                {session ? (
                  <>
                    {perfil?.rol && (
                      <p className="text-[11px] text-creamsoft px-2 pb-2 pt-1 uppercase tracking-wide">{perfil.rol}</p>
                    )}
                    <Btn size="sm" variant="danger" className="w-full justify-center" onClick={handleSignOut}>Cerrar sesión</Btn>
                  </>
                ) : (
                  <p className="text-[11.5px] text-creamsoft px-2 py-1.5">No has iniciado sesión</p>
                )}
              </div>
            )}
          </div>
        </nav>
      )}

      {toast && <Toast message={toast} onDone={() => setToast(null)} />}
    </div>
  )
}

function PickNegocioAdmin({ negocios, onEntrar, onRegistrar }) {
  return (
    <div>
      <section className="relative overflow-hidden rounded border border-line bg-paper2 px-6 py-9 md:px-10 md:py-11 mb-8">
        <div className="absolute -right-10 -top-16 opacity-20"><BrandMark size={230} /></div>
        <div className="relative max-w-3xl">
          <div className="flex items-center gap-4 mb-5">
            <BrandMark size={96} />
            <div>
              <p className="text-[11px] uppercase tracking-[0.22em] text-gold">Kiosco Negocios</p>
              <p className="text-xs text-creamsoft">Centro de gestión para tu negocio</p>
            </div>
          </div>
          <h2 className="font-serif text-3xl md:text-4xl font-semibold mb-3 leading-tight">El saber de cada negocio en un solo lugar.</h2>
          <p className="text-creamsoft text-sm md:text-base leading-relaxed max-w-2xl">Administra tu catálogo, pedidos, inventario, equipo, ventas y finanzas desde una plataforma organizada, pensada para que tengas toda la información de tu negocio al alcance.</p>
        </div>
      </section>
      <div className="mb-7 flex items-start justify-between gap-4 flex-wrap">
        <div>
          <h2 className="font-serif text-3xl font-semibold mb-2">Panel de negocios</h2>
          <p className="text-creamsoft text-sm max-w-lg leading-relaxed">Elige tu negocio para entrar con tu correo, o registra uno nuevo si vas a usar Kiosko por primera vez.</p>
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

function PickNegocio({ negocios, onEnter, showWelcome = false }) {
  return (
    <div>
      {showWelcome && <section className="relative overflow-hidden rounded border border-line bg-paper2 px-6 py-10 md:px-12 md:py-14 mb-10">
        <div className="absolute -right-16 -top-20 opacity-20"><BrandMark size={270} /></div>
        <div className="relative max-w-2xl">
          <div className="flex items-center gap-3 mb-6">
            <BrandMark size={96} />
            <div>
              <p className="text-[11px] uppercase tracking-[0.22em] text-gold">Kiosco</p>
              <p className="text-xs text-creamsoft">Plataforma multiempresa</p>
            </div>
          </div>
          <h2 className="font-serif text-4xl md:text-5xl font-semibold mb-4 leading-tight">El sabor de cada negocio, en un solo lugar.</h2>
          <p className="text-creamsoft text-sm md:text-base max-w-xl leading-relaxed">Kiosco conecta a tus clientes con sus negocios favoritos. Explora catálogos, arma pedidos y síguelos en tiempo real desde cualquier dispositivo.</p>
        </div>
      </section>}
      <div className="mb-7">
        <h2 className="font-serif text-3xl font-semibold mb-2">¿Dónde quieres pedir hoy?</h2>
        <p className="text-creamsoft text-sm max-w-lg leading-relaxed">Explora un negocio para conocer su catálogo y hacer tu pedido.</p>
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