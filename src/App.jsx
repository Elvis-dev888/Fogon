import { useEffect, useState, useCallback } from 'react'
import { Capacitor } from '@capacitor/core'
import { AdMob, BannerAdPosition, BannerAdSize } from '@capacitor-community/admob'
import { Toast, Btn, NegocioLogo, NegocioBanner, BrandMark } from './components/ui'
import SuperadminView from './components/SuperadminView'
import AdminView from './components/AdminView'
import EmpleadoView from './components/EmpleadoView'
import ClienteView from './components/ClienteView'
import { AdminAuth, SuperadminAuth, EmpleadoAuth, UnirseNegocioForm, CrearNegocioForm, SinPermiso } from './components/Auth'
import { PrivacyModal } from './components/PrivacyModal'
import { supabase } from './lib/supabaseClient'
import { fetchPerfil, fetchNegocioPorId, signOut } from './lib/auth'
import { fetchNegocios } from './lib/api'
import { DOWNLOAD_LINKS } from './lib/downloads'
import { LANGUAGES, useLanguage } from './lib/i18n.jsx'

const ROLES = [
  ['super', '🛠️', 'admin'],
  ['admin', '👑', 'business'],
  ['empleado', '🛎️', 'team'],
  ['cliente', '🛒', 'customerRole'],
]

const APP_ROLES = ROLES.filter(([role]) => role !== 'cliente')

export default function App() {
  const { language, setLanguage, t } = useLanguage()
  const isDesktopApp = typeof window !== 'undefined' && (window.location.search.includes('desktop=1') || !!window.process?.versions?.electron)
  const isNativeApp = Capacitor.isNativePlatform() || isDesktopApp // app nativa: Android + desktop Windows
  const [role, setRole] = useState(isNativeApp ? 'admin' : 'cliente')
  const isDesktopShell = isNativeApp && isDesktopApp
  const [negocioId, setNegocioId] = useState(null) // solo lo usa el flujo de Cliente
  const [mostrarPrivacidad, setMostrarPrivacidad] = useState(false)
  const [adminIntent, setAdminIntent] = useState(null) // null | 'entrar' | 'registrar' — solo lo usa el flujo de Admin
  const [negocios, setNegocios] = useState([])
  const [toast, setToast] = useState(null)
  const [loadError, setLoadError] = useState(null)

  const [session, setSession] = useState(undefined) // undefined = todavía no se sabe
  const [perfil, setPerfil] = useState(null)
  const [miNegocio, setMiNegocio] = useState(null)
  const [online, setOnline] = useState(navigator.onLine)
  const [menuAbierto, setMenuAbierto] = useState(false)

  // Inicialización de Google AdMob Banner en dispositivos móviles nativos
  useEffect(() => {
    if (!Capacitor.isNativePlatform() || isDesktopApp) return

    async function initAdMobBanner() {
      try {
        await AdMob.initialize({
          requestTrackingAuthorization: true,
          initializeForTesting: false,
        })

        await AdMob.showBanner({
          adId: 'ca-app-pub-8313905774163042/7995054363',
          adSize: BannerAdSize.ADAPTIVE_BANNER,
          position: BannerAdPosition.BOTTOM_CENTER,
          margin: 0,
          isTesting: false,
        })
      } catch (error) {
        console.warn('[AdMob] Error al inicializar banner:', error)
      }
    }

    initAdMobBanner()

    return () => {
      if (Capacitor.isNativePlatform() && !isDesktopApp) {
        AdMob.hideBanner().catch(() => {})
      }
    }
  }, [isDesktopApp])

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
      console.error('[Kiosko] Error cargando negocios:', err)
      setLoadError(err.message || String(err))
    }
  }, [])

  useEffect(() => {
    loadNegocios()
  }, [loadNegocios])

  // Detección de enlace directo a negocio (ej: https://administraciondenegocios.netlify.app/?negocio=ID o ?n=ID)
  useEffect(() => {
    if (typeof window === 'undefined') return
    const params = new URLSearchParams(window.location.search)
    const directNegocio = params.get('negocio') || params.get('n')
    if (directNegocio) {
      setNegocioId(directNegocio)
      setRole('cliente')
    }
  }, [])

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
    setRole(isNativeApp ? 'admin' : 'cliente')
    setAdminIntent(null)
    setMenuAbierto(false)
  }

  function exitNegocioCliente() {
    setNegocioId(null)
    loadNegocios()
  }

  const negocioCliente = negocios.find((n) => n.id === negocioId && n.modo_operacion !== 'inventario') || null

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
          <h2 className="font-serif text-2xl font-semibold mb-2">{t.noConnection}</h2>
          <p className="text-creamsoft text-sm max-w-xs mx-auto">{t.connectionDescription}</p>
        </div>
      </div>
    )
  }
  return (
    <div className={`relative min-h-screen ${isDesktopShell ? 'desktop-shell' : ''}`}>
      {isNativeApp && (
        <div className="native-brand-background fixed pointer-events-none z-0 inset-0" aria-hidden="true">
          <img src="/Kiosko.jpg" alt="" className="native-brand-image absolute left-1/2 top-1/2 w-[min(86vw,860px)] aspect-square -translate-x-1/2 -translate-y-1/2 rounded-full object-cover" />
        </div>
      )}
      {!isDesktopShell && (
        <div className="relative z-10 bg-paper text-creamsoft overflow-hidden whitespace-nowrap border-b border-line">
          <div className="inline-block pl-full animate-ticker font-serif italic text-[13px] py-1.5 tracking-wide">
            {negocios.map((n) => `${n.nombre} — ${n.slogan}`).join('     ·     ')}
            {'     ·     '}
            {negocios.map((n) => `${n.nombre} — ${n.slogan}`).join('     ·     ')}
          </div>
        </div>
      )}

      <header className={`sticky top-0 z-40 border-b ${isDesktopShell ? 'desktop-app-header' : 'bg-paper/90 backdrop-blur border-line'}`}>
        <div className={`max-w-[1200px] mx-auto px-5 py-4 flex items-center gap-3 ${!isNativeApp ? 'justify-between flex-wrap' : ''}`}>
          <div className="flex items-center gap-3">
            <BrandMark size={isDesktopShell ? 42 : 46} />
              <h1 className="font-serif text-xl font-semibold m-0 leading-tight">Kiosko</h1>
              <span className="block text-[10.5px] text-creamsoft uppercase tracking-wider font-medium">Catálogos y gestión de negocios</span>
            </div>
          {/* En la web se conserva la navegación original de arriba (pestañas + cerrar sesión).
              En la app, esto se reemplaza por la barra inferior de más abajo. */}
          {!isNativeApp && (
            <div className="flex items-center gap-3">
              <div className="flex gap-1 bg-paper2 border border-line rounded-full p-1">
                {ROLES.filter(([r]) => r === 'cliente').map(([r, icon, label]) => (
                  <button key={r} onClick={() => { setRole(r); setAdminIntent(null) }}
                    className={`px-4 py-2 rounded-full text-[12.5px] font-semibold ${role === r ? 'bg-gold text-paper' : 'text-creamsoft hover:text-cream'}`}>
                    {icon} {t[label]}
                  </button>
                ))}
              </div>
              {session && <Btn size="sm" variant="ghost" onClick={handleSignOut}>{t.signOut}</Btn>}
            </div>
          )}
          <label className="inline-flex items-center gap-2 text-[11px] text-creamsoft ml-auto">
            <span className="sr-only">{t.language}</span>
            <select value={language} onChange={(event) => setLanguage(event.target.value)} aria-label={t.language}
              className="bg-paper2 border border-line rounded px-2 py-1.5 text-cream focus:outline-none focus:border-gold">
              {LANGUAGES.map((item) => <option key={item.code} value={item.code}>{item.label}</option>)}
            </select>
          </label>
        </div>
      </header>
      <div className="h-[2px] bg-gradient-to-r from-transparent via-gold to-transparent opacity-70" />

      <main className={`relative z-10 max-w-[1200px] mx-auto px-5 py-8 ${isNativeApp ? 'pb-28' : 'pb-8'} ${isDesktopShell ? 'desktop-app-main' : ''}`}>
        {loadError && (
          <div className="mb-6 border border-wine bg-wine/10 text-wine text-sm rounded p-4">
            <b>No se pudo cargar la información de Supabase:</b> {loadError}
          </div>
        )}

        {/* ---------------- SUPERADMIN ---------------- */}
        {role === 'super' && (
          session === undefined ? <p className="text-creamsoft text-sm text-center mt-10">{t.loading}</p> :
          !session ? <SuperadminAuth onDone={loadPerfil} /> :
          !perfil ? <p className="text-creamsoft text-sm text-center mt-10">{t.loadingProfile}</p> :
          perfil.rol !== 'superadmin' ? <SinPermiso mensaje="Esta cuenta no tiene permisos de superadministrador. Ese rol se asigna a mano, no se puede obtener desde la app." /> :
          <SuperadminView negocios={negocios} onChanged={loadNegocios} notify={notify} />
        )}

        {/* ---------------- ADMIN DE NEGOCIO ---------------- */}
        {role === 'admin' && (
          session === undefined ? <p className="text-creamsoft text-sm text-center mt-10">{t.loading}</p> :
          !session ? (
            adminIntent === null
              ? <PickNegocioAdmin negocios={negocios} onEntrar={() => setAdminIntent('entrar')} onRegistrar={() => setAdminIntent('registrar')} />
              : <AdminAuth modoInicial={adminIntent === 'registrar' ? 'registro' : 'login'} onDone={loadPerfil} notify={notify} onVolver={() => setAdminIntent(null)} />
          ) :
          !perfil ? <p className="text-creamsoft text-sm text-center mt-10">{t.loadingProfile}</p> :
          perfil.rol === 'pendiente' ? <CrearNegocioForm notify={notify} onCreated={() => { loadPerfil(); loadNegocios() }} /> :
          perfil.rol === 'superadmin' ? <SinPermiso mensaje="Esta cuenta es de superadministrador, no administra un negocio individual." /> :
          perfil.rol !== 'admin' ? <SinPermiso mensaje="Esta cuenta no está registrada como administradora de un negocio." /> :
          !miNegocio ? <p className="text-creamsoft text-sm text-center mt-10">{t.loading}</p> :
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
          session === undefined ? <p className="text-creamsoft text-sm text-center mt-10">{t.loading}</p> :
          !session ? <EmpleadoAuth onDone={loadPerfil} notify={notify} /> :
          !perfil ? <p className="text-creamsoft text-sm text-center mt-10">{t.loadingProfile}</p> :
          perfil.rol === 'pendiente' ? <UnirseNegocioForm notify={notify} onJoined={() => loadPerfil()} /> :
          perfil.rol !== 'empleado' ? <SinPermiso mensaje="Esta cuenta no está registrada como empleado." /> :
          !miNegocio ? <p className="text-creamsoft text-sm text-center mt-10">{t.loading}</p> :
          <EmpleadoView negocio={miNegocio} onExit={handleSignOut} notify={notify} />
        )}

        {/* ---------------- CLIENTE (público, sin cuenta) ---------------- */}
        {role === 'cliente' && (negocioCliente
          ? <ClienteView negocio={negocioCliente} onExit={exitNegocioCliente} notify={notify} />
          : <PickNegocio negocios={negocios.filter((n) => n.modo_operacion !== 'inventario')} onEnter={(id) => setNegocioId(id)} showWelcome={isNativeApp} showDownloads={!isNativeApp} />)}

        <footer className="mt-16 pt-6 border-t border-line text-center text-xs text-creamsoft flex flex-col sm:flex-row items-center justify-between gap-2">
          <span>&copy; {new Date().getFullYear()} Kiosko — Todos los derechos reservados.</span>
          <button
            type="button"
            onClick={() => setMostrarPrivacidad(true)}
            className="text-gold hover:underline cursor-pointer bg-transparent border-none p-0 text-xs font-semibold"
          >
            Política de Privacidad
          </button>
        </footer>
      </main>

      {mostrarPrivacidad && (
        <PrivacyModal onClose={() => setMostrarPrivacidad(false)} />
      )}

      {isNativeApp && (
        <nav
          className={`fixed bottom-0 inset-x-0 z-40 bg-paper2/95 backdrop-blur border-t border-line flex items-stretch ${isDesktopShell ? 'desktop-app-nav' : ''}`}
          style={{ paddingBottom: 'env(safe-area-inset-bottom)' }}
        >
          {APP_ROLES.map(([r, icon, label]) => (
            <button
              key={r}
              onClick={() => { setRole(r); setAdminIntent(null); setMenuAbierto(false) }}
              className={`flex-1 flex flex-col items-center justify-center gap-0.5 py-2.5 text-[10.5px] font-semibold ${role === r ? 'text-gold' : 'text-creamsoft'}`}
            >
              <span className={`text-lg leading-none ${role === r ? 'opacity-100' : 'opacity-70'}`}>{icon}</span>
              {t[label]}
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
  const { t } = useLanguage()

  return (
    <div>
      <section className="relative overflow-hidden rounded border border-line bg-paper2 px-6 py-9 md:px-10 md:py-11 mb-8">
        <div className="absolute -right-10 -top-16 opacity-20"><BrandMark size={230} /></div>
        <div className="relative max-w-3xl">
          <div className="flex items-center gap-4 mb-5">
            <BrandMark size={84} />
            <div>
              <p className="text-[11px] uppercase tracking-[0.22em] text-gold font-semibold">Kiosko Negocios</p>
              <p className="text-xs text-creamsoft">{t.businessPanelDescription || 'Centro de gestión para tu negocio'}</p>
            </div>
          </div>
          <h2 className="font-serif text-3xl md:text-4xl font-semibold mb-3 leading-tight">{t.heroAdminTitle}</h2>
          <p className="text-creamsoft text-sm md:text-base leading-relaxed max-w-2xl">{t.heroAdminDescription}</p>
        </div>
      </section>
      <div className="mb-7 flex items-start justify-between gap-4 flex-wrap">
        <div>
          <h2 className="font-serif text-3xl font-semibold mb-2">{t.businessPanel}</h2>
          <p className="text-creamsoft text-sm max-w-lg leading-relaxed">Elige tu negocio para entrar con tu correo, o registra uno nuevo si vas a usar Kiosko por primera vez.</p>
        </div>
        <button onClick={onRegistrar} className="bg-gold text-paper font-semibold text-[13px] rounded-full px-5 py-3 hover:bg-golddark whitespace-nowrap">
          ➕ {t.authAdmin.register}
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

function PickNegocio({ negocios, onEnter, showWelcome = false, showDownloads = false }) {
  const { t } = useLanguage()

  return (
    <div>
      {showWelcome && <section className="relative overflow-hidden rounded border border-line bg-paper2 px-6 py-10 md:px-12 md:py-14 mb-10">
        <div className="absolute -right-16 -top-20 opacity-20"><BrandMark size={270} /></div>
        <div className="relative max-w-2xl">
          <div className="flex items-center gap-3 mb-6">
            <BrandMark size={84} />
            <div>
              <p className="text-[11px] uppercase tracking-[0.22em] text-gold font-semibold">Kiosko</p>
              <p className="text-xs text-creamsoft">{t.platform}</p>
            </div>
          </div>
          <h2 className="font-serif text-4xl md:text-5xl font-semibold mb-4 leading-tight">{t.heroClientTitle}</h2>
          <p className="text-creamsoft text-sm md:text-base max-w-xl leading-relaxed">{t.heroClientDescription}</p>
        </div>
      </section>}

      {showDownloads && <section className="mb-8 rounded border border-line bg-paper2 p-5 md:p-6">
        <div className="flex flex-col gap-4 md:flex-row md:items-center md:justify-between">
          <div>
            <p className="text-[11px] uppercase tracking-[0.2em] text-gold mb-2">¿Tienes un negocio?</p>
            <h3 className="font-serif text-2xl font-semibold mb-1">{t.manageBusiness}</h3>
            <p className="text-creamsoft text-sm max-w-xl leading-relaxed">{t.manageBusinessDescription}</p>
          </div>
          <div className="flex flex-wrap gap-2.5">
            <a href={DOWNLOAD_LINKS.android} target="_blank" rel="noreferrer" className="inline-flex items-center justify-center rounded-full bg-gold text-paper font-semibold text-[12.5px] px-4 py-2.5 hover:bg-golddark">📱 {t.android}</a>
            <a href={DOWNLOAD_LINKS.ios} target="_blank" rel="noreferrer" className="inline-flex items-center justify-center rounded-full border border-line text-cream font-semibold text-[12.5px] px-4 py-2.5 hover:border-gold hover:text-gold">🍎 {t.iphone}</a>
            <a href={DOWNLOAD_LINKS.windows} className="inline-flex items-center justify-center rounded-full border border-line text-cream font-semibold text-[12.5px] px-4 py-2.5 hover:border-gold hover:text-gold">💻 {t.windows}</a>
          </div>
        </div>
      </section>}

      <div className="mb-7">
        <h2 className="font-serif text-3xl font-semibold mb-2">{t.chooseOrder}</h2>
        <p className="text-creamsoft text-sm max-w-lg leading-relaxed">{t.chooseOrderDescription}</p>
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
