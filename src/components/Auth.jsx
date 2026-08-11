import { useState, useEffect } from 'react'
import { Btn, Card, Field, Input, Select, Textarea } from './ui'
import { signUp, signIn, signOut, crearNegocioPropio, unirseComoEmpleado, reclamarSuperadmin, fetchNegociosSinAdmin, reclamarNegocioExistente } from '../lib/auth'

/* ---------------- Login / registro para Admin de negocio ---------------- */
export function AdminAuth({ onDone, notify, modoInicial, onVolver }) {
  const [modo, setModo] = useState(modoInicial || 'login') // login | registro
  const [email, setEmail] = useState('')
  const [password, setPassword] = useState('')
  const [error, setError] = useState('')
  const [aviso, setAviso] = useState('')
  const [loading, setLoading] = useState(false)

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
          setAviso('Te enviamos un correo de confirmación a ' + email + '. Ábrelo, confirma tu cuenta, y vuelve aquí a iniciar sesión.')
          setModo('login')
          setLoading(false)
          return
        }
        notify('Cuenta creada. Ahora vamos a registrar tu negocio.')
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
        {modo === 'login' ? 'Panel de negocios' : 'Registra tu negocio en Fogón'}
      </h2>
      <p className="text-creamsoft text-sm text-center mb-6">
        {modo === 'login' ? '¿Tu negocio ya está en Fogón? Ingresa con tu cuenta.' : 'Crea tu cuenta — en el siguiente paso configuras (o reclamas) tu negocio.'}
      </p>

      {/* Elección explícita: entrar a un negocio existente, o registrar uno nuevo */}
      <div className="grid grid-cols-2 gap-2 mb-5 p-1 bg-paper2 border border-line rounded-full">
        <button
          onClick={() => { setModo('login'); setError(''); setAviso('') }}
          className={`py-2.5 rounded-full text-[12.5px] font-semibold transition-colors ${modo === 'login' ? 'bg-gold text-paper' : 'text-creamsoft hover:text-cream'}`}
        >
          Iniciar sesión
        </button>
        <button
          onClick={() => { setModo('registro'); setError(''); setAviso('') }}
          className={`py-2.5 rounded-full text-[12.5px] font-semibold transition-colors ${modo === 'registro' ? 'bg-gold text-paper' : 'text-creamsoft hover:text-cream'}`}
        >
          ➕ Registrar otro negocio
        </button>
      </div>

      {aviso && <div className="mb-4 border border-gold bg-gold/10 text-champagne text-[12.5px] rounded p-3">{aviso}</div>}

      <Card className="p-6">
        <form onSubmit={submit}>
          <Field label="Correo"><Input required type="email" value={email} onChange={(e) => setEmail(e.target.value)} /></Field>
          <Field label="Contraseña"><Input required type="password" minLength={6} value={password} onChange={(e) => setPassword(e.target.value)} /></Field>
          {error && <p className="text-wine text-[12.5px] mb-3">{error}</p>}
          <Btn variant="primary" className="w-full justify-center" disabled={loading}>
            {loading ? 'Un momento…' : modo === 'login' ? 'Ingresar' : 'Crear cuenta y continuar'}
          </Btn>
        </form>
      </Card>
      {onVolver && (
        <button onClick={onVolver} className="w-full text-center text-[12.5px] text-creamsoft hover:text-gold mt-4">
          ← Volver a elegir negocio
        </button>
      )}
    </div>
  )
}

/* ---------------- Login / registro para Empleado (el que atiende) ---------------- */
export function EmpleadoAuth({ onDone, notify }) {
  const [modo, setModo] = useState('login') // login | registro
  const [email, setEmail] = useState('')
  const [password, setPassword] = useState('')
  const [error, setError] = useState('')
  const [aviso, setAviso] = useState('')
  const [loading, setLoading] = useState(false)

  async function submit(e) {
    e.preventDefault()
    setError('')
    setAviso('')
    setLoading(true)
    try {
      if (modo === 'registro') {
        const result = await signUp(email, password)
        if (!result.session) {
          setAviso('Te enviamos un correo de confirmación a ' + email + '. Ábrelo, confirma tu cuenta, y vuelve aquí a iniciar sesión.')
          setModo('login')
          setLoading(false)
          return
        }
        notify('Cuenta creada. Ahora pon el código que te dio el dueño del negocio.')
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
        {modo === 'login' ? 'Ingresa a atender pedidos' : 'Crea tu cuenta de empleado'}
      </h2>
      <p className="text-creamsoft text-sm text-center mb-6">
        {modo === 'login' ? 'Con tu propio correo — no necesitas el usuario del dueño.' : 'Después te pediremos el código de tu negocio.'}
      </p>
      {aviso && <div className="mb-4 border border-gold bg-gold/10 text-champagne text-[12.5px] rounded p-3">{aviso}</div>}
      <Card className="p-6">
        <form onSubmit={submit}>
          <Field label="Correo"><Input required type="email" value={email} onChange={(e) => setEmail(e.target.value)} /></Field>
          <Field label="Contraseña"><Input required type="password" minLength={6} value={password} onChange={(e) => setPassword(e.target.value)} /></Field>
          {error && <p className="text-wine text-[12.5px] mb-3">{error}</p>}
          <Btn variant="primary" className="w-full justify-center" disabled={loading}>
            {loading ? 'Un momento…' : modo === 'login' ? 'Ingresar' : 'Crear cuenta'}
          </Btn>
        </form>
        <button
          onClick={() => { setModo(modo === 'login' ? 'registro' : 'login'); setError(''); setAviso('') }}
          className="w-full text-center text-[12.5px] text-creamsoft hover:text-gold mt-4"
        >
          {modo === 'login' ? '¿Todavía no tienes cuenta? Créala aquí' : '¿Ya tienes cuenta? Inicia sesión'}
        </button>
      </Card>
    </div>
  )
}

/* ---------------- Paso único del empleado: unirse a su negocio con el código ---------------- */
export function UnirseNegocioForm({ onJoined, notify }) {
  const [codigo, setCodigo] = useState('')
  const [error, setError] = useState('')
  const [loading, setLoading] = useState(false)

  async function submit(e) {
    e.preventDefault()
    setError('')
    setLoading(true)
    try {
      const negocio = await unirseComoEmpleado(codigo.trim())
      notify(`Listo — ya puedes atender pedidos de ${negocio.nombre}`)
      onJoined(negocio)
    } catch (err) {
      setError(err.message || String(err))
    } finally {
      setLoading(false)
    }
  }

  return (
    <div className="max-w-[420px] mx-auto mt-10">
      <h2 className="font-serif text-2xl font-semibold mb-1 text-center">Código de tu negocio</h2>
      <p className="text-creamsoft text-sm text-center mb-6">Pídeselo al dueño — son 6 caracteres. Solo lo pones una vez.</p>
      <Card className="p-6">
        <form onSubmit={submit}>
          <Field label="Código de acceso">
            <Input required value={codigo} onChange={(e) => setCodigo(e.target.value.toUpperCase())} maxLength={6} placeholder="EJ: A1B2C3" className="tracking-[0.3em] text-center font-mono uppercase" />
          </Field>
          {error && <p className="text-wine text-[12.5px] mb-3">{error}</p>}
          <Btn variant="primary" className="w-full justify-center" disabled={loading}>{loading ? 'Verificando…' : 'Entrar a atender'}</Btn>
        </form>
      </Card>
      <button onClick={() => signOut().then(() => window.location.reload())} className="w-full text-center text-[12px] text-creamsoft hover:text-gold mt-4">
        Cerrar sesión
      </button>
    </div>
  )
}

/* ---------------- Login para Superadmin (sin registro público) ---------------- */
export function SuperadminAuth({ onDone }) {
  const [modo, setModo] = useState('login') // login | registro (registro solo sirve si nadie es superadmin todavía)
  const [email, setEmail] = useState('')
  const [password, setPassword] = useState('')
  const [error, setError] = useState('')
  const [aviso, setAviso] = useState('')
  const [loading, setLoading] = useState(false)

  async function submit(e) {
    e.preventDefault()
    setError('')
    setAviso('')
    setLoading(true)
    try {
      if (modo === 'registro') {
        const result = await signUp(email, password)
        if (!result.session) {
          setAviso('Te enviamos un correo de confirmación a ' + email + '. Confírmalo y vuelve aquí a iniciar sesión — ahí sí quedará como superadmin.')
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
      <h2 className="font-serif text-2xl font-semibold mb-1 text-center">Acceso de Superadministrador</h2>
      <p className="text-creamsoft text-sm text-center mb-6">
        {modo === 'login' ? 'Este acceso es exclusivo.' : 'Este registro solo funciona una vez, para la primera persona que lo use — si ya existe un superadmin, se rechaza.'}
      </p>
      {aviso && <div className="mb-4 border border-gold bg-gold/10 text-champagne text-[12.5px] rounded p-3">{aviso}</div>}
      <Card className="p-6">
        <form onSubmit={submit}>
          <Field label="Correo"><Input required type="email" value={email} onChange={(e) => setEmail(e.target.value)} /></Field>
          <Field label="Contraseña"><Input required type="password" minLength={6} value={password} onChange={(e) => setPassword(e.target.value)} /></Field>
          {error && <p className="text-wine text-[12.5px] mb-3">{error}</p>}
          <Btn variant="primary" className="w-full justify-center" disabled={loading}>
            {loading ? 'Un momento…' : modo === 'login' ? 'Ingresar' : 'Reclamar acceso de superadmin'}
          </Btn>
        </form>
        <button
          onClick={() => { setModo(modo === 'login' ? 'registro' : 'login'); setError(''); setAviso('') }}
          className="w-full text-center text-[12px] text-creamsoft hover:text-gold mt-4"
        >
          {modo === 'login' ? '¿Eres tú configurando la plataforma por primera vez?' : '¿Ya tienes cuenta? Inicia sesión'}
        </button>
      </Card>
    </div>
  )
}

/* ---------------- Paso único: reclamar un negocio existente, o crear uno nuevo ---------------- */
export function CrearNegocioForm({ onCreated, notify }) {
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
      notify(`Listo — ya administras ${actualizado.nombre}`)
      onCreated(actualizado)
    } catch (err) {
      notify(err.message || String(err))
      setReclamando(null)
    }
  }

  const hayDisponibles = disponibles && disponibles.length > 0

  if (disponibles === null) {
    return <p className="text-creamsoft text-sm text-center mt-10">Cargando…</p>
  }

  if (hayDisponibles && !mostrarFormNuevo) {
    return (
      <div className="max-w-[460px] mx-auto mt-10">
        <h2 className="font-serif text-2xl font-semibold mb-1 text-center">¿Uno de estos es tu negocio?</h2>
        <p className="text-creamsoft text-sm text-center mb-6">Estos negocios ya están en Fogón pero todavía no tienen administrador. Si alguno es tuyo, reclámalo — quedará vinculado a tu cuenta.</p>
        <div className="space-y-3">
          {disponibles.map((n) => (
            <Card key={n.id} className="p-4 flex items-center justify-between">
              <div>
                <p className="font-serif font-semibold">{n.emoji} {n.nombre}</p>
                <p className="text-creamsoft text-[12.5px]">{n.slogan}</p>
              </div>
              <Btn size="sm" variant="primary" disabled={reclamando === n.id} onClick={() => reclamar(n)}>
                {reclamando === n.id ? 'Reclamando…' : 'Es mío'}
              </Btn>
            </Card>
          ))}
        </div>
        <button onClick={() => setMostrarFormNuevo(true)} className="w-full text-center text-[12.5px] text-creamsoft hover:text-gold mt-5">
          Ninguno de estos — mi negocio es nuevo
        </button>
        <button onClick={() => signOut().then(() => window.location.reload())} className="w-full text-center text-[12px] text-creamsoft hover:text-gold mt-3">
          Cerrar sesión
        </button>
      </div>
    )
  }

  return <FormNegocioNuevo onCreated={onCreated} notify={notify} onVolver={hayDisponibles ? () => setMostrarFormNuevo(false) : null} />
}

function FormNegocioNuevo({ onCreated, notify, onVolver }) {
  const [nombre, setNombre] = useState('')
  const [tipo, setTipo] = useState('Comidas rápidas')
  const [descripcion, setDescripcion] = useState('')
  const [slogan, setSlogan] = useState('')
  const [emoji, setEmoji] = useState('🍴')
  const [error, setError] = useState('')
  const [loading, setLoading] = useState(false)

  async function submit(e) {
    e.preventDefault()
    setError('')
    setLoading(true)
    try {
      const negocio = await crearNegocioPropio({
        nombre: nombre.trim(),
        slogan: slogan.trim() || 'Recién llegado a Fogón',
        emoji,
        tipo,
        descripcion: descripcion.trim(),
      })
      notify(`${negocio.nombre} quedó registrado — ya puedes administrarlo`)
      onCreated(negocio)
    } catch (err) {
      setError(err.message || String(err))
    } finally {
      setLoading(false)
    }
  }

  return (
    <div className="max-w-[460px] mx-auto mt-10">
      <h2 className="font-serif text-2xl font-semibold mb-1 text-center">Cuéntanos de tu negocio</h2>
      <p className="text-creamsoft text-sm text-center mb-6">Esto solo se hace una vez. Después entras directo a tu panel.</p>
      <Card className="p-6">
        <form onSubmit={submit}>
          <Field label="Nombre del negocio"><Input required value={nombre} onChange={(e) => setNombre(e.target.value)} placeholder="Ej: Fritanga La 15" /></Field>
          <Field label="¿A qué se dedica?">
            <Select value={tipo} onChange={(e) => setTipo(e.target.value)}>
              <option>Comidas rápidas</option>
              <option>Fritanga</option>
              <option>Pizzería</option>
              <option>Arepas y asados</option>
              <option>Restaurante</option>
              <option>Postres y panadería</option>
              <option>Otro</option>
            </Select>
          </Field>
          <Field label="Cuéntanos qué hace tu negocio">
            <Textarea rows={3} value={descripcion} onChange={(e) => setDescripcion(e.target.value)} placeholder="Ej: Vendemos hamburguesas, arepas y bebidas en el barrio..." />
          </Field>
          <Field label="Eslogan (opcional)"><Input value={slogan} onChange={(e) => setSlogan(e.target.value)} placeholder="Ej: Fritos con actitud" /></Field>
          <Field label="Emoji / ícono"><Input maxLength={2} value={emoji} onChange={(e) => setEmoji(e.target.value)} /></Field>
          {error && <p className="text-wine text-[12.5px] mb-3">{error}</p>}
          <Btn variant="primary" className="w-full justify-center" disabled={loading}>{loading ? 'Creando…' : 'Registrar mi negocio'}</Btn>
        </form>
      </Card>
      {onVolver && (
        <button onClick={onVolver} className="w-full text-center text-[12.5px] text-creamsoft hover:text-gold mt-4">
          ← Volver a la lista de negocios
        </button>
      )}
      <button onClick={() => signOut().then(() => window.location.reload())} className="w-full text-center text-[12px] text-creamsoft hover:text-gold mt-3">
        Cerrar sesión
      </button>
    </div>
  )
}

/* ---------------- Bloqueo: sesión válida pero sin el rol correcto ---------------- */
export function SinPermiso({ mensaje }) {
  return (
    <div className="max-w-[460px] mx-auto mt-10 text-center">
      <Card className="p-6">
        <div className="text-3xl mb-3">🔒</div>
        <h2 className="font-serif text-xl font-semibold mb-2">No tienes acceso a esta sección</h2>
        <p className="text-creamsoft text-sm mb-5">{mensaje}</p>
        <Btn onClick={() => signOut().then(() => window.location.reload())}>Cerrar sesión</Btn>
      </Card>
    </div>
  )
}