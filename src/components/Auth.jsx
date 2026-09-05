import { useState, useEffect } from 'react'
import { Btn, Card, Field, Input, Select, Textarea, Modal } from './ui'
import { signUp, signIn, signOut, crearNegocioPropio, unirseComoEmpleado, reclamarSuperadmin, fetchNegociosSinAdmin, reclamarNegocioExistente, recuperarPassword, actualizarPassword } from '../lib/auth'
import { useLanguage } from '../lib/i18n.jsx'

/* ---------------- Login / registro para Admin de negocio ---------------- */
export function AdminAuth({ onDone, notify, modoInicial, onVolver }) {
  const { t } = useLanguage()
  const [modo, setModo] = useState(modoInicial || 'login') // login | registro
  const [email, setEmail] = useState('')
  const [password, setPassword] = useState('')
  const [error, setError] = useState('')
  const [aviso, setAviso] = useState('')
  const [loading, setLoading] = useState(false)
  const [mostrarRecuperar, setMostrarRecuperar] = useState(false)

  async function submit(e) {
    e.preventDefault()
    setError('')
    setAviso('')
    setLoading(true)
    try {
      if (modo === 'registro') {
        const result = await signUp(email, password)
        if (!result.session) {
          // El proyecto exige confirmar el correo: no hay sesión todavía, así que no seguimos al panel.
          setAviso(t.authAdmin.confirmation.replace('{email}', email))
          setModo('login')
          setLoading(false)
          return
        }
        notify(t.authAdmin.accountCreated)
      } else {
        await signIn(email, password)
      }
      onDone()
    } catch (err) {
      setError(err.message || String(err))
    } finally {
      setLoading(false)
    }
  }

  return (
    <div className="max-w-[420px] mx-auto mt-10">
      <h2 className="font-serif text-2xl font-semibold mb-1 text-center">
        {modo === 'login' ? t.authAdmin.loginTitle : t.authAdmin.registerTitle}
      </h2>
      <p className="text-creamsoft text-sm text-center mb-6">
        {modo === 'login' ? t.authAdmin.loginDescription : t.authAdmin.registerDescription}
      </p>

      {/* Elección explícita: entrar a un negocio existente, o registrar uno nuevo */}
      <div className="grid grid-cols-2 gap-2 mb-5 p-1 bg-paper2 border border-line rounded-full">
        <button
          onClick={() => { setModo('login'); setError(''); setAviso('') }}
          className={`py-2.5 rounded-full text-[12.5px] font-semibold transition-colors ${modo === 'login' ? 'bg-gold text-paper' : 'text-creamsoft hover:text-cream'}`}
        >
          {t.authAdmin.login}
        </button>
        <button
          onClick={() => { setModo('registro'); setError(''); setAviso('') }}
          className={`py-2.5 rounded-full text-[12.5px] font-semibold transition-colors ${modo === 'registro' ? 'bg-gold text-paper' : 'text-creamsoft hover:text-cream'}`}
        >
          ➕ {t.authAdmin.register}
        </button>
      </div>

      {aviso && <div className="mb-4 border border-gold bg-gold/10 text-champagne text-[12.5px] rounded p-3">{aviso}</div>}

      <Card className="p-6">
        <form onSubmit={submit}>
          <Field label={t.authAdmin.email}><Input required type="email" value={email} onChange={(e) => setEmail(e.target.value)} /></Field>
          <Field label={t.authAdmin.password}><Input required type="password" minLength={6} value={password} onChange={(e) => setPassword(e.target.value)} /></Field>
          {modo === 'login' && (
            <div className="text-right -mt-2 mb-3">
              <button
                type="button"
                onClick={() => setMostrarRecuperar(true)}
                className="text-[11.5px] text-creamsoft hover:text-gold transition-colors"
              >
                ¿Olvidaste tu contraseña?
              </button>
            </div>
          )}
          {error && <p className="text-wine text-[12.5px] mb-3">{error}</p>}
          <Btn variant="primary" className="w-full justify-center" disabled={loading}>
            {loading ? t.authAdmin.wait : modo === 'login' ? t.authAdmin.enter : t.authAdmin.createContinue}
          </Btn>
        </form>
      </Card>
      {onVolver && (
        <button onClick={onVolver} className="w-full text-center text-[12.5px] text-creamsoft hover:text-gold mt-4">
          ← {t.authAdmin.back}
        </button>
      )}

      {mostrarRecuperar && (
        <RecuperarPasswordModal
          initialEmail={email}
          onClose={() => setMostrarRecuperar(false)}
          notify={notify}
        />
      )}
    </div>
  )
}

/* ---------------- Login / registro para Empleado (el que atiende) ---------------- */
export function EmpleadoAuth({ onDone, notify }) {
  const { t } = useLanguage()
  const [modo, setModo] = useState('login') // login | registro
  const [email, setEmail] = useState('')
  const [password, setPassword] = useState('')
  const [error, setError] = useState('')
  const [aviso, setAviso] = useState('')
  const [loading, setLoading] = useState(false)
  const [mostrarRecuperar, setMostrarRecuperar] = useState(false)

  async function submit(e) {
    e.preventDefault()
    setError('')
    setAviso('')
    setLoading(true)
    try {
      if (modo === 'registro') {
        const result = await signUp(email, password)
        if (!result.session) {
          setAviso(t.authEmployee.confirmation.replace('{email}', email))
          setModo('login')
          setLoading(false)
          return
        }
        notify(t.authEmployee.accountCreated)
      } else {
        await signIn(email, password)
      }
      onDone()
    } catch (err) {
      setError(err.message || String(err))
    } finally {
      setLoading(false)
    }
  }

  return (
    <div className="max-w-[420px] mx-auto mt-10">
      <h2 className="font-serif text-2xl font-semibold mb-1 text-center">
        {modo === 'login' ? t.authEmployee.loginTitle : t.authEmployee.registerTitle}
      </h2>
      <p className="text-creamsoft text-sm text-center mb-6">
        {modo === 'login' ? t.authEmployee.loginDescription : t.authEmployee.registerDescription}
      </p>
      {aviso && <div className="mb-4 border border-gold bg-gold/10 text-champagne text-[12.5px] rounded p-3">{aviso}</div>}
      <Card className="p-6">
        <form onSubmit={submit}>
          <Field label={t.authEmployee.email}><Input required type="email" value={email} onChange={(e) => setEmail(e.target.value)} /></Field>
          <Field label={t.authEmployee.password}><Input required type="password" minLength={6} value={password} onChange={(e) => setPassword(e.target.value)} /></Field>
          {modo === 'login' && (
            <div className="text-right -mt-2 mb-3">
              <button
                type="button"
                onClick={() => setMostrarRecuperar(true)}
                className="text-[11.5px] text-creamsoft hover:text-gold transition-colors"
              >
                ¿Olvidaste tu contraseña?
              </button>
            </div>
          )}
          {error && <p className="text-wine text-[12.5px] mb-3">{error}</p>}
          <Btn variant="primary" className="w-full justify-center" disabled={loading}>
            {loading ? t.authEmployee.wait : modo === 'login' ? t.authEmployee.login : t.authEmployee.create}
          </Btn>
        </form>
        <button
          onClick={() => { setModo(modo === 'login' ? 'registro' : 'login'); setError(''); setAviso('') }}
          className="w-full text-center text-[12.5px] text-creamsoft hover:text-gold mt-4"
        >
          {modo === 'login' ? t.authEmployee.createQuestion : t.authEmployee.loginQuestion}
        </button>
      </Card>

      {mostrarRecuperar && (
        <RecuperarPasswordModal
          initialEmail={email}
          onClose={() => setMostrarRecuperar(false)}
          notify={notify}
        />
      )}
    </div>
  )
}

/* ---------------- Paso único del empleado: unirse a su negocio con el código ---------------- */
export function UnirseNegocioForm({ onJoined, notify }) {
  const { t } = useLanguage()
  const [codigo, setCodigo] = useState('')
  const [error, setError] = useState('')
  const [loading, setLoading] = useState(false)

  async function submit(e) {
    e.preventDefault()
    setError('')
    setLoading(true)
    try {
      const negocio = await unirseComoEmpleado(codigo.trim())
      notify(t.authEmployee.linked.replace('{business}', negocio.nombre))
      onJoined(negocio)
    } catch (err) {
      setError(err.message || String(err))
    } finally {
      setLoading(false)
    }
  }

  return (
    <div className="max-w-[420px] mx-auto mt-10">
      <h2 className="font-serif text-2xl font-semibold mb-1 text-center">{t.authEmployee.codeTitle}</h2>
      <p className="text-creamsoft text-sm text-center mb-6">{t.authEmployee.codeDescription}</p>
      <Card className="p-6">
        <form onSubmit={submit}>
          <Field label={t.authEmployee.codeLabel}>
            <Input required value={codigo} onChange={(e) => setCodigo(e.target.value.toUpperCase())} maxLength={6} placeholder="EJ: A1B2C3" className="tracking-[0.3em] text-center font-mono uppercase" />
          </Field>
          {error && <p className="text-wine text-[12.5px] mb-3">{error}</p>}
          <Btn variant="primary" className="w-full justify-center" disabled={loading}>{loading ? t.authEmployee.verify : t.authEmployee.enterOrders}</Btn>
        </form>
      </Card>
      <button onClick={() => signOut().then(() => window.location.reload())} className="w-full text-center text-[12px] text-creamsoft hover:text-gold mt-4">
        {t.authEmployee.signOut}
      </button>
    </div>
  )
}

/* ---------------- Login para Superadmin (sin registro público) ---------------- */
export function SuperadminAuth({ onDone, notify }) {
  const { t } = useLanguage()
  const [modo, setModo] = useState('login') // login | registro (registro solo sirve si nadie es superadmin todavía)
  const [email, setEmail] = useState('')
  const [password, setPassword] = useState('')
  const [error, setError] = useState('')
  const [aviso, setAviso] = useState('')
  const [loading, setLoading] = useState(false)
  const [mostrarRecuperar, setMostrarRecuperar] = useState(false)

  async function submit(e) {
    e.preventDefault()
    setError('')
    setAviso('')
    setLoading(true)
    try {
      if (modo === 'registro') {
        const result = await signUp(email, password)
        if (!result.session) {
          setAviso(t.authSuper.confirmation.replace('{email}', email))
          setModo('login')
          setLoading(false)
          return
        }
        await reclamarSuperadmin()
      } else {
        await signIn(email, password)
      }
      onDone()
    } catch (err) {
      setError(err.message || String(err))
    } finally {
      setLoading(false)
    }
  }

  return (
    <div className="max-w-[420px] mx-auto mt-10">
      <h2 className="font-serif text-2xl font-semibold mb-1 text-center">{t.authSuper.title}</h2>
      <p className="text-creamsoft text-sm text-center mb-6">
        {modo === 'login' ? t.authSuper.exclusive : t.authSuper.firstSetup}
      </p>
      {aviso && <div className="mb-4 border border-gold bg-gold/10 text-champagne text-[12.5px] rounded p-3">{aviso}</div>}
      <Card className="p-6">
        <form onSubmit={submit}>
          <Field label={t.authSuper.email}><Input required type="email" value={email} onChange={(e) => setEmail(e.target.value)} /></Field>
          <Field label={t.authSuper.password}><Input required type="password" minLength={6} value={password} onChange={(e) => setPassword(e.target.value)} /></Field>
          {modo === 'login' && (
            <div className="text-right -mt-2 mb-3">
              <button
                type="button"
                onClick={() => setMostrarRecuperar(true)}
                className="text-[11.5px] text-creamsoft hover:text-gold transition-colors"
              >
                ¿Olvidaste tu contraseña?
              </button>
            </div>
          )}
          {error && <p className="text-wine text-[12.5px] mb-3">{error}</p>}
          <Btn variant="primary" className="w-full justify-center" disabled={loading}>
            {loading ? t.authSuper.wait : modo === 'login' ? t.authSuper.enter : t.authSuper.claim}
          </Btn>
        </form>
        <button
          onClick={() => { setModo(modo === 'login' ? 'registro' : 'login'); setError(''); setAviso('') }}
          className="w-full text-center text-[12px] text-creamsoft hover:text-gold mt-4"
        >
          {modo === 'login' ? t.authSuper.firstQuestion : t.authSuper.loginQuestion}
        </button>
      </Card>

      {mostrarRecuperar && (
        <RecuperarPasswordModal
          initialEmail={email}
          onClose={() => setMostrarRecuperar(false)}
          notify={notify}
        />
      )}
    </div>
  )
}

/* ---------------- Paso único: reclamar un negocio existente, o crear uno nuevo ---------------- */
export function CrearNegocioForm({ onCreated, notify }) {
  const { t } = useLanguage()
  const [disponibles, setDisponibles] = useState(null) // null = cargando
  const [reclamando, setReclamando] = useState(null)
  const [mostrarFormNuevo, setMostrarFormNuevo] = useState(false)

  useEffect(() => {
    fetchNegociosSinAdmin().then(setDisponibles).catch(() => setDisponibles([]))
  }, [])

  async function reclamar(negocio) {
    setReclamando(negocio.id)
    try {
      const actualizado = await reclamarNegocioExistente(negocio.id)
      notify(t.businessSetup.claimed.replace('{business}', actualizado.nombre))
      onCreated(actualizado)
    } catch (err) {
      notify(err.message || String(err))
      setReclamando(null)
    }
  }

  const hayDisponibles = disponibles && disponibles.length > 0

  if (disponibles === null) {
    return <p className="text-creamsoft text-sm text-center mt-10">{t.loading}</p>
  }

  if (hayDisponibles && !mostrarFormNuevo) {
    return (
      <div className="max-w-[460px] mx-auto mt-10">
        <h2 className="font-serif text-2xl font-semibold mb-1 text-center">{t.businessSetup.chooseTitle}</h2>
        <p className="text-creamsoft text-sm text-center mb-6">{t.businessSetup.chooseDescription}</p>
        <div className="space-y-3">
          {disponibles.map((n) => (
            <Card key={n.id} className="p-4 flex items-center justify-between">
              <div>
                <p className="font-serif font-semibold">{n.emoji} {n.nombre}</p>
                <p className="text-creamsoft text-[12.5px]">{n.slogan}</p>
              </div>
              <Btn size="sm" variant="primary" disabled={reclamando === n.id} onClick={() => reclamar(n)}>
                {reclamando === n.id ? t.businessSetup.claiming : t.businessSetup.claim}
              </Btn>
            </Card>
          ))}
        </div>
        <button onClick={() => setMostrarFormNuevo(true)} className="w-full text-center text-[12.5px] text-creamsoft hover:text-gold mt-5">
          {t.businessSetup.newBusiness}
        </button>
        <button onClick={() => signOut().then(() => window.location.reload())} className="w-full text-center text-[12px] text-creamsoft hover:text-gold mt-3">
          {t.businessSetup.signOut}
        </button>
      </div>
    )
  }

  return <FormNegocioNuevo onCreated={onCreated} notify={notify} onVolver={hayDisponibles ? () => setMostrarFormNuevo(false) : null} />
}

function FormNegocioNuevo({ onCreated, notify, onVolver }) {
  const { t } = useLanguage()
  const [nombre, setNombre] = useState('')
  const [modoOperacion, setModoOperacion] = useState('catalogo')
  const [tipo, setTipo] = useState('Comidas rápidas')
  const [descripcion, setDescripcion] = useState('')
  const [slogan, setSlogan] = useState('')
  const [emoji, setEmoji] = useState('🍴')
  const [error, setError] = useState('')
  const [loading, setLoading] = useState(false)

  function seleccionarModo(modo) {
    setModoOperacion(modo)
    if (modo === 'inventario') {
      if (emoji === '🍴') setEmoji('📦')
      if (tipo === 'Comidas rápidas') setTipo('Tienda / Abarrotes')
    } else {
      if (emoji === '📦') setEmoji('🍴')
      if (tipo === 'Tienda / Abarrotes') setTipo('Comidas rápidas')
    }
  }

  async function submit(e) {
    e.preventDefault()
    setError('')
    setLoading(true)
    try {
      const negocio = await crearNegocioPropio({
        nombre: nombre.trim(),
        slogan: slogan.trim() || t.businessSetup.defaultSlogan,
        emoji,
        tipo,
        descripcion: descripcion.trim(),
        modoOperacion,
      })
      notify(t.businessSetup.businessCreated.replace('{business}', negocio.nombre))
      onCreated(negocio)
    } catch (err) {
      setError(err.message || String(err))
    } finally {
      setLoading(false)
    }
  }

  return (
    <div className="max-w-[500px] mx-auto mt-8">
      <h2 className="font-serif text-2xl font-semibold mb-1 text-center">{t.businessSetup.title}</h2>
      <p className="text-creamsoft text-sm text-center mb-5">{t.businessSetup.description}</p>
      <Card className="p-6">
        <form onSubmit={submit}>
          <div className="mb-5">
            <label className="block text-xs font-semibold uppercase tracking-wider text-creamsoft mb-2">
              ¿Qué tipo de negocio vas a registrar?
            </label>
            <div className="grid grid-cols-2 gap-3">
              <button
                type="button"
                onClick={() => seleccionarModo('catalogo')}
                className={`p-3.5 rounded-lg border text-left transition-all ${
                  modoOperacion === 'catalogo'
                    ? 'border-gold bg-gold/10 shadow-[0_0_15px_rgba(199,154,60,0.15)]'
                    : 'border-line bg-paper hover:border-creamsoft/50'
                }`}
              >
                <div className="text-2xl mb-1.5">🍔</div>
                <div className="font-serif font-bold text-[14px] text-cream">Menú y pedidos</div>
                <div className="text-[11px] text-creamsoft mt-1 leading-tight">
                  Para restaurantes, comidas y ventas con catálogo público.
                </div>
              </button>

              <button
                type="button"
                onClick={() => seleccionarModo('inventario')}
                className={`p-3.5 rounded-lg border text-left transition-all ${
                  modoOperacion === 'inventario'
                    ? 'border-gold bg-gold/10 shadow-[0_0_15px_rgba(199,154,60,0.15)]'
                    : 'border-line bg-paper hover:border-creamsoft/50'
                }`}
              >
                <div className="text-2xl mb-1.5">📦</div>
                <div className="font-serif font-bold text-[14px] text-cream">Solo inventario</div>
                <div className="text-[11px] text-creamsoft mt-1 leading-tight">
                  Para bodegas, tiendas, ferreterías y control interno.
                </div>
              </button>
            </div>
          </div>

          <Field label={t.businessSetup.name}>
            <Input
              required
              value={nombre}
              onChange={(e) => setNombre(e.target.value)}
              placeholder={modoOperacion === 'inventario' ? 'Ej: Distribuidora El Paisa, Ferretería Central' : 'Ej: Fritanga La 15, Burger House'}
            />
          </Field>

          <Field label={t.businessSetup.type}>
            <Select value={tipo} onChange={(e) => setTipo(e.target.value)}>
              {modoOperacion === 'inventario' ? (
                <>
                  <option>Tienda / Abarrotes</option>
                  <option>Bodega / Distribuidora</option>
                  <option>Ferretería</option>
                  <option>Ropa y calzado</option>
                  <option>Papelería y miscelánea</option>
                  <option>Repuestos y taller</option>
                  <option>Servicios / PyME</option>
                  <option>Otro</option>
                </>
              ) : (
                <>
                  <option>Comidas rápidas</option>
                  <option>Fritanga</option>
                  <option>Pizzería</option>
                  <option>Arepas y asados</option>
                  <option>Restaurante</option>
                  <option>Postres y panadería</option>
                  <option>Cafetería / Bar</option>
                  <option>Otro</option>
                </>
              )}
            </Select>
          </Field>

          <Field label={t.businessSetup.descriptionLabel}>
            <Textarea
              rows={3}
              value={descripcion}
              onChange={(e) => setDescripcion(e.target.value)}
              placeholder={
                modoOperacion === 'inventario'
                  ? 'Ej: Venta de artículos al por mayor y detal, existencias y distribución...'
                  : 'Ej: Vendemos hamburguesas, arepas y bebidas en el barrio...'
              }
            />
          </Field>

          <div className="grid grid-cols-[1fr_80px] gap-3">
            <Field label={t.businessSetup.slogan}>
              <Input
                value={slogan}
                onChange={(e) => setSlogan(e.target.value)}
                placeholder={modoOperacion === 'inventario' ? 'Ej: Variedad y economía' : 'Ej: Fritos con actitud'}
              />
            </Field>
            <Field label={t.businessSetup.icon}>
              <Input maxLength={2} value={emoji} onChange={(e) => setEmoji(e.target.value)} className="text-center text-lg" />
            </Field>
          </div>

          {error && <p className="text-wine text-[12.5px] mb-3">{error}</p>}
          <Btn variant="primary" className="w-full justify-center mt-2" disabled={loading}>
            {loading ? t.businessSetup.creating : t.businessSetup.create}
          </Btn>
        </form>
      </Card>
      {onVolver && (
        <button onClick={onVolver} className="w-full text-center text-[12.5px] text-creamsoft hover:text-gold mt-4">
          ← {t.businessSetup.back}
        </button>
      )}
      <button onClick={() => signOut().then(() => window.location.reload())} className="w-full text-center text-[12px] text-creamsoft hover:text-gold mt-3">
        {t.businessSetup.signOut}
      </button>
    </div>
  )
}

/* ---------------- Bloqueo: sesión válida pero sin el rol correcto ---------------- */
export function SinPermiso({ mensaje }) {
  const { t } = useLanguage()
  return (
    <div className="max-w-[460px] mx-auto mt-10 text-center">
      <Card className="p-6">
        <div className="text-3xl mb-3">🔒</div>
        <h2 className="font-serif text-xl font-semibold mb-2">{t.access.deniedTitle}</h2>
        <p className="text-creamsoft text-sm mb-5">{mensaje}</p>
        <Btn onClick={() => signOut().then(() => window.location.reload())}>{t.access.signOut}</Btn>
      </Card>
    </div>
  )
}

/* ---------------- Modal: Solicitar enlace de recuperación de contraseña ---------------- */
export function RecuperarPasswordModal({ onClose, notify, initialEmail = '' }) {
  const [email, setEmail] = useState(initialEmail)
  const [enviado, setEnviado] = useState(false)
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState('')

  async function submit(e) {
    e.preventDefault()
    setError('')
    setLoading(true)
    try {
      await recuperarPassword(email.trim())
      setEnviado(true)
      if (notify) notify('Enlace de recuperación enviado')
    } catch (err) {
      setError(err.message || String(err))
    } finally {
      setLoading(false)
    }
  }

  return (
    <Modal title="🔑 Recuperar contraseña" onClose={onClose}>
      {enviado ? (
        <div className="text-center py-3 space-y-3">
          <div className="text-4xl">✉️</div>
          <h3 className="font-serif text-lg font-semibold text-gold">¡Correo de recuperación enviado!</h3>
          <p className="text-creamsoft text-sm leading-relaxed max-w-sm mx-auto">
            Hemos enviado un enlace seguro a <b className="text-cream">{email}</b>. Revisa tu bandeja de entrada (y la carpeta de spam o no deseados) para reestablecer tu contraseña.
          </p>
          <div className="pt-2">
            <Btn variant="primary" onClick={onClose} className="justify-center mx-auto">
              Entendido
            </Btn>
          </div>
        </div>
      ) : (
        <form onSubmit={submit} className="space-y-4">
          <p className="text-creamsoft text-sm leading-relaxed">
            Ingresa tu correo electrónico registrado y te enviaremos un enlace oficial para que puedas crear una nueva contraseña.
          </p>
          <Field label="Correo electrónico">
            <Input
              required
              type="email"
              placeholder="ejemplo@correo.com"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
            />
          </Field>
          {error && <p className="text-wine text-xs">{error}</p>}
          <div className="flex justify-end gap-2 pt-2">
            <Btn variant="ghost" onClick={onClose} type="button">
              Cancelar
            </Btn>
            <Btn variant="primary" disabled={loading}>
              {loading ? 'Enviando…' : 'Enviar enlace'}
            </Btn>
          </div>
        </form>
      )}
    </Modal>
  )
}

/* ---------------- Modal: Establecer nueva contraseña tras hacer clic en el correo ---------------- */
export function EstablecerNuevaPasswordModal({ onDone, notify }) {
  const [password, setPassword] = useState('')
  const [confirmPassword, setConfirmPassword] = useState('')
  const [error, setError] = useState('')
  const [loading, setLoading] = useState(false)

  async function submit(e) {
    e.preventDefault()
    setError('')
    if (password.length < 6) {
      setError('La contraseña debe tener al menos 6 caracteres')
      return
    }
    if (password !== confirmPassword) {
      setError('Las contraseñas no coinciden')
      return
    }
    setLoading(true)
    try {
      await actualizarPassword(password)
      if (notify) notify('¡Contraseña actualizada exitosamente!')
      onDone()
    } catch (err) {
      setError(err.message || String(err))
    } finally {
      setLoading(false)
    }
  }

  return (
    <div className="fixed inset-0 bg-black/80 z-50 flex items-center justify-center p-4">
      <Card className="max-w-[420px] w-full p-6">
        <h2 className="font-serif text-2xl font-semibold mb-2 text-center text-gold">🔐 Nueva Contraseña</h2>
        <p className="text-creamsoft text-sm text-center mb-6">
          Ingresa y confirma tu nueva contraseña para recuperar el acceso a tu cuenta.
        </p>
        <form onSubmit={submit} className="space-y-4">
          <Field label="Nueva contraseña (mínimo 6 caracteres)">
            <Input
              required
              type="password"
              minLength={6}
              value={password}
              onChange={(e) => setPassword(e.target.value)}
            />
          </Field>
          <Field label="Confirmar nueva contraseña">
            <Input
              required
              type="password"
              minLength={6}
              value={confirmPassword}
              onChange={(e) => setConfirmPassword(e.target.value)}
            />
          </Field>
          {error && <p className="text-wine text-xs">{error}</p>}
          <Btn variant="primary" className="w-full justify-center mt-2" disabled={loading}>
            {loading ? 'Guardando…' : 'Guardar nueva contraseña'}
          </Btn>
        </form>
      </Card>
    </div>
  )
}
