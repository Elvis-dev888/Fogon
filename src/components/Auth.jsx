import { useState, useEffect } from 'react'
import { Btn, Card, Field, Input, Select, Textarea, Modal } from './ui'
import { signUp, signIn, signOut, crearNegocioPropio, unirseComoEmpleado, reclamarSuperadmin, fetchNegociosSinAdmin, reclamarNegocioExistente, recuperarPassword, actualizarPassword } from '../lib/auth'
import { SUPPORT_EMAIL, getSecurityStatus, recordFailedAttempt, clearFailedAttempts, unlockAccountWithCode, formatRemainingTime } from '../lib/security'
import { useLanguage } from '../lib/i18n.jsx'

/* ---------------- Tarjeta de cuenta bloqueada por seguridad (6 horas) ---------------- */
export function SecurityLockCard({ email, status, onUnlocked, onMostrarRecuperar, notify }) {
  const { t } = useLanguage()
  const [remainingMs, setRemainingMs] = useState(status?.remainingMs || 0)
  const [codigoDesbloqueo, setCodigoDesbloqueo] = useState('')
  const [errorDesbloqueo, setErrorDesbloqueo] = useState('')
  const [copiado, setCopiado] = useState(false)

  useEffect(() => {
    const timer = setInterval(() => {
      const s = getSecurityStatus(email)
      if (!s.isLocked) {
        onUnlocked()
      } else {
        setRemainingMs(s.remainingMs)
      }
    }, 2000)
    return () => clearInterval(timer)
  }, [email, onUnlocked])

  function handleCopiarCorreo() {
    navigator.clipboard?.writeText(SUPPORT_EMAIL)
    setCopiado(true)
    if (notify) notify(t.security?.emailCopied || 'Correo oficial copiado al portapapeles')
    setTimeout(() => setCopiado(false), 3000)
  }

  function handleDesbloquear(e) {
    e.preventDefault()
    setErrorDesbloqueo('')
    if (!codigoDesbloqueo.trim()) {
      setErrorDesbloqueo(t.security?.unlockError || 'Ingresa un código')
      return
    }
    const ok = unlockAccountWithCode(email, codigoDesbloqueo)
    if (ok) {
      if (notify) notify(t.security?.unlockSuccess || '¡Acceso desbloqueado exitosamente!')
      onUnlocked()
    } else {
      setErrorDesbloqueo(t.security?.unlockError || 'Código incorrecto. Verifica el código o contacta a soporte.')
    }
  }

  const subject = encodeURIComponent(t.security?.supportEmailSubject || 'Solicitud de desbloqueo de cuenta Kiosko')
  const body = encodeURIComponent((t.security?.supportEmailBody || 'Hola Soporte Kiosko, mi cuenta con el correo {email} ha sido bloqueada por seguridad (6 intentos fallidos). Solicito asistencia para desbloquearla.').replace('{email}', email))
  const mailtoUrl = `mailto:${SUPPORT_EMAIL}?subject=${subject}&body=${body}`

  return (
    <Card className="p-6 border-wine bg-wine/10 space-y-4">
      <div className="text-center">
        <div className="text-3xl mb-1">🔒</div>
        <h3 className="font-serif text-lg font-semibold text-wine">
          {t.security?.accountLockedTitle || 'Acceso temporalmente bloqueado'}
        </h3>
        <p className="text-creamsoft text-xs mt-1 leading-relaxed">
          {t.security?.accountLockedDesc || 'Por seguridad, este acceso ha sido bloqueado durante 6 horas tras alcanzar el límite de 6 intentos fallidos.'}
        </p>
        <div className="inline-block mt-3 px-3 py-1.5 bg-paper border border-wine/40 rounded text-xs font-mono text-wine font-semibold">
          ⏳ {t.security?.timeRemaining?.replace('{time}', formatRemainingTime(remainingMs)) || `Tiempo de espera: ${formatRemainingTime(remainingMs)}`}
        </div>
      </div>

      <div className="pt-2 border-t border-line/60 space-y-2">
        <a
          href={mailtoUrl}
          className="w-full flex items-center justify-center gap-2 bg-paper2 border border-gold text-gold hover:bg-gold hover:text-paper font-semibold text-xs py-2.5 px-3 rounded transition-colors text-center"
        >
          {t.security?.contactSupportEmail?.replace('{email}', SUPPORT_EMAIL) || `✉️ Contactar a Soporte (${SUPPORT_EMAIL})`}
        </a>

        <div className="flex gap-2">
          <button
            type="button"
            onClick={handleCopiarCorreo}
            className="flex-1 text-[11px] text-creamsoft hover:text-gold py-1.5 text-center bg-transparent border border-line rounded transition-colors"
          >
            📋 {copiado ? '✓ Copiado' : (t.security?.copyEmail || 'Copiar correo')}
          </button>
          {onMostrarRecuperar && (
            <button
              type="button"
              onClick={onMostrarRecuperar}
              className="flex-1 text-[11px] text-creamsoft hover:text-gold py-1.5 text-center bg-transparent border border-line rounded transition-colors"
            >
              🔑 {t.authRecovery?.forgotPassword || 'Restablecer contraseña'}
            </button>
          )}
        </div>
      </div>

      <form onSubmit={handleDesbloquear} className="pt-2 border-t border-line/60">
        <p className="text-[11.5px] text-creamsoft mb-1.5 font-medium">
          {t.security?.haveUnlockCode || '¿Recibiste un código de desbloqueo de soporte?'}
        </p>
        <div className="flex gap-2">
          <Input
            value={codigoDesbloqueo}
            onChange={(e) => { setCodigoDesbloqueo(e.target.value); setErrorDesbloqueo('') }}
            placeholder={t.security?.unlockCodePlaceholder || 'Ej. KIO-123456'}
            className="text-xs uppercase font-mono flex-1"
          />
          <Btn type="submit" size="sm" variant="secondary">
            {t.security?.unlockButton || 'Desbloquear'}
          </Btn>
        </div>
        {errorDesbloqueo && <p className="text-wine text-[11px] mt-1">{errorDesbloqueo}</p>}
      </form>
    </Card>
  )
}

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
  const [securityStatus, setSecurityStatus] = useState(() => getSecurityStatus(email))

  function handleEmailChange(e) {
    const val = e.target.value
    setEmail(val)
    setSecurityStatus(getSecurityStatus(val))
    setError('')
  }

  async function submit(e) {
    e.preventDefault()
    setError('')
    setAviso('')

    if (modo === 'login') {
      const status = getSecurityStatus(email)
      if (status.isLocked) {
        setSecurityStatus(status)
        return
      }
    }

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
        clearFailedAttempts(email)
        setSecurityStatus(getSecurityStatus(email))
      }
      onDone()
    } catch (err) {
      if (modo === 'login') {
        const newStatus = recordFailedAttempt(email)
        setSecurityStatus(newStatus)
        if (newStatus.isLocked) {
          setError('')
        } else {
          const warning = (t.security?.attemptsWarning || 'Contraseña incorrecta. Te quedan {count} intentos antes del bloqueo temporal (6 horas).').replace('{count}', newStatus.attemptsLeft)
          setError(warning)
        }
      } else {
        setError(err.message || String(err))
      }
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

      {modo === 'login' && securityStatus.isLocked ? (
        <SecurityLockCard
          email={email}
          status={securityStatus}
          notify={notify}
          onUnlocked={() => {
            setSecurityStatus(getSecurityStatus(email))
            setError('')
          }}
          onMostrarRecuperar={() => setMostrarRecuperar(true)}
        />
      ) : (
        <Card className="p-6">
          <form onSubmit={submit}>
            <Field label={t.authAdmin.email}><Input required type="email" value={email} onChange={handleEmailChange} /></Field>
            <Field label={t.authAdmin.password}><Input required type="password" minLength={6} value={password} onChange={(e) => setPassword(e.target.value)} /></Field>
            {modo === 'login' && (
              <div className="text-right -mt-2 mb-3">
                <button
                  type="button"
                  onClick={() => setMostrarRecuperar(true)}
                  className="text-[11.5px] text-creamsoft hover:text-gold transition-colors"
                >
                  {t.authRecovery?.forgotPassword || '¿Olvidaste tu contraseña?'}
                </button>
              </div>
            )}
            {error && <p className="text-wine text-[12.5px] mb-3">{error}</p>}
            <Btn variant="primary" className="w-full justify-center" disabled={loading}>
              {loading ? t.authAdmin.wait : modo === 'login' ? t.authAdmin.enter : t.authAdmin.createContinue}
            </Btn>
          </form>
        </Card>
      )}

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
  const [securityStatus, setSecurityStatus] = useState(() => getSecurityStatus(email))

  function handleEmailChange(e) {
    const val = e.target.value
    setEmail(val)
    setSecurityStatus(getSecurityStatus(val))
    setError('')
  }

  async function submit(e) {
    e.preventDefault()
    setError('')
    setAviso('')

    if (modo === 'login') {
      const status = getSecurityStatus(email)
      if (status.isLocked) {
        setSecurityStatus(status)
        return
      }
    }

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
        clearFailedAttempts(email)
        setSecurityStatus(getSecurityStatus(email))
      }
      onDone()
    } catch (err) {
      if (modo === 'login') {
        const newStatus = recordFailedAttempt(email)
        setSecurityStatus(newStatus)
        if (newStatus.isLocked) {
          setError('')
        } else {
          const warning = (t.security?.attemptsWarning || 'Contraseña incorrecta. Te quedan {count} intentos antes del bloqueo temporal (6 horas).').replace('{count}', newStatus.attemptsLeft)
          setError(warning)
        }
      } else {
        setError(err.message || String(err))
      }
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

      {modo === 'login' && securityStatus.isLocked ? (
        <SecurityLockCard
          email={email}
          status={securityStatus}
          notify={notify}
          onUnlocked={() => {
            setSecurityStatus(getSecurityStatus(email))
            setError('')
          }}
          onMostrarRecuperar={() => setMostrarRecuperar(true)}
        />
      ) : (
        <Card className="p-6">
          <form onSubmit={submit}>
            <Field label={t.authEmployee.email}><Input required type="email" value={email} onChange={handleEmailChange} /></Field>
            <Field label={t.authEmployee.password}><Input required type="password" minLength={6} value={password} onChange={(e) => setPassword(e.target.value)} /></Field>
            {modo === 'login' && (
              <div className="text-right -mt-2 mb-3">
                <button
                  type="button"
                  onClick={() => setMostrarRecuperar(true)}
                  className="text-[11.5px] text-creamsoft hover:text-gold transition-colors"
                >
                  {t.authRecovery?.forgotPassword || '¿Olvidaste tu contraseña?'}
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
  const [securityStatus, setSecurityStatus] = useState(() => getSecurityStatus(email))

  function handleEmailChange(e) {
    const val = e.target.value
    setEmail(val)
    setSecurityStatus(getSecurityStatus(val))
    setError('')
  }

  async function submit(e) {
    e.preventDefault()
    setError('')
    setAviso('')

    if (modo === 'login') {
      const status = getSecurityStatus(email)
      if (status.isLocked) {
        setSecurityStatus(status)
        return
      }
    }

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
        clearFailedAttempts(email)
        setSecurityStatus(getSecurityStatus(email))
      }
      onDone()
    } catch (err) {
      if (modo === 'login') {
        const newStatus = recordFailedAttempt(email)
        setSecurityStatus(newStatus)
        if (newStatus.isLocked) {
          setError('')
        } else {
          const warning = (t.security?.attemptsWarning || 'Contraseña incorrecta. Te quedan {count} intentos antes del bloqueo temporal (6 horas).').replace('{count}', newStatus.attemptsLeft)
          setError(warning)
        }
      } else {
        setError(err.message || String(err))
      }
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

      {modo === 'login' && securityStatus.isLocked ? (
        <SecurityLockCard
          email={email}
          status={securityStatus}
          notify={notify}
          onUnlocked={() => {
            setSecurityStatus(getSecurityStatus(email))
            setError('')
          }}
          onMostrarRecuperar={() => setMostrarRecuperar(true)}
        />
      ) : (
        <Card className="p-6">
          <form onSubmit={submit}>
            <Field label={t.authSuper.email}><Input required type="email" value={email} onChange={handleEmailChange} /></Field>
            <Field label={t.authSuper.password}><Input required type="password" minLength={6} value={password} onChange={(e) => setPassword(e.target.value)} /></Field>
            {modo === 'login' && (
              <div className="text-right -mt-2 mb-3">
                <button
                  type="button"
                  onClick={() => setMostrarRecuperar(true)}
                  className="text-[11.5px] text-creamsoft hover:text-gold transition-colors"
                >
                  {t.authRecovery?.forgotPassword || '¿Olvidaste tu contraseña?'}
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
  const { t } = useLanguage()
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
      if (notify) notify(t.authRecovery?.linkSentToast || 'Enlace de recuperación enviado')
    } catch (err) {
      setError(err.message || String(err))
    } finally {
      setLoading(false)
    }
  }

  return (
    <Modal title={t.authRecovery?.modalTitle || "🔑 Recuperar contraseña"} onClose={onClose}>
      {enviado ? (
        <div className="text-center py-3 space-y-3">
          <div className="text-4xl">✉️</div>
          <h3 className="font-serif text-lg font-semibold text-gold">{t.authRecovery?.emailSentTitle || '¡Correo de recuperación enviado!'}</h3>
          <p className="text-creamsoft text-sm leading-relaxed max-w-sm mx-auto">
            {(t.authRecovery?.emailSentDescription || 'Hemos enviado un enlace seguro a {email}. Revisa tu bandeja de entrada (y la carpeta de spam o no deseados) para reestablecer tu contraseña.').replace('{email}', email)}
          </p>
          <div className="pt-2">
            <Btn variant="primary" onClick={onClose} className="justify-center mx-auto">
              {t.authRecovery?.understood || 'Entendido'}
            </Btn>
          </div>
        </div>
      ) : (
        <form onSubmit={submit} className="space-y-4">
          <p className="text-creamsoft text-sm leading-relaxed">
            {t.authRecovery?.modalDescription || 'Ingresa tu correo electrónico registrado y te enviaremos un enlace oficial para que puedas crear una nueva contraseña.'}
          </p>
          <Field label={t.authRecovery?.emailLabel || "Correo electrónico"}>
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
              {t.authRecovery?.cancel || 'Cancelar'}
            </Btn>
            <Btn variant="primary" disabled={loading}>
              {loading ? (t.authRecovery?.sending || 'Enviando…') : (t.authRecovery?.sendLink || 'Enviar enlace')}
            </Btn>
          </div>
        </form>
      )}
    </Modal>
  )
}

/* ---------------- Modal: Establecer nueva contraseña tras hacer clic en el correo ---------------- */
export function EstablecerNuevaPasswordModal({ onDone, notify }) {
  const { t } = useLanguage()
  const [password, setPassword] = useState('')
  const [confirmPassword, setConfirmPassword] = useState('')
  const [error, setError] = useState('')
  const [loading, setLoading] = useState(false)

  async function submit(e) {
    e.preventDefault()
    setError('')
    if (password.length < 6) {
      setError(t.authRecovery?.minCharsError || 'La contraseña debe tener al menos 6 caracteres')
      return
    }
    if (password !== confirmPassword) {
      setError(t.authRecovery?.mismatchError || 'Las contraseñas no coinciden')
      return
    }
    setLoading(true)
    try {
      await actualizarPassword(password)
      if (notify) notify(t.authRecovery?.successMessage || '¡Contraseña actualizada exitosamente!')
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
        <h2 className="font-serif text-2xl font-semibold mb-2 text-center text-gold">{t.authRecovery?.resetModalTitle || '🔐 Nueva Contraseña'}</h2>
        <p className="text-creamsoft text-sm text-center mb-6">
          {t.authRecovery?.resetModalDescription || 'Ingresa y confirma tu nueva contraseña para recuperar el acceso a tu cuenta.'}
        </p>
        <form onSubmit={submit} className="space-y-4">
          <Field label={t.authRecovery?.newPasswordLabel || "Nueva contraseña (mínimo 6 caracteres)"}>
            <Input
              required
              type="password"
              minLength={6}
              value={password}
              onChange={(e) => setPassword(e.target.value)}
            />
          </Field>
          <Field label={t.authRecovery?.confirmPasswordLabel || "Confirmar nueva contraseña"}>
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
            {loading ? (t.authRecovery?.saving || 'Guardando…') : (t.authRecovery?.saveButton || 'Guardar nueva contraseña')}
          </Btn>
        </form>
      </Card>
    </div>
  )
}
