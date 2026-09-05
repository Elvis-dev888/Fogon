import { supabase } from './supabaseClient'

export async function signUp(email, password) {
  const { data, error } = await supabase.auth.signUp({ email, password })
  if (error) throw error
  return data
}

export async function signIn(email, password) {
  const { data, error } = await supabase.auth.signInWithPassword({ email, password })
  if (error) throw error
  return data
}

export async function signOut() {
  const { error } = await supabase.auth.signOut()
  if (error) throw error
}

export async function fetchPerfil(userId) {
  const { data, error } = await supabase.from('perfiles').select('*').eq('id', userId).single()
  if (error) throw error
  return data
}

// Solo funciona UNA vez por cuenta (lo controla la función en la base de datos)
export async function crearNegocioPropio({ nombre, slogan, emoji, tipo, descripcion, modoOperacion }) {
  const { data, error } = await supabase.rpc('crear_negocio_propio', {
    p_nombre: nombre,
    p_slogan: slogan,
    p_emoji: emoji,
    p_tipo: tipo || null,
    p_descripcion: descripcion || null,
    p_modo_operacion: modoOperacion || 'catalogo',
  })
  if (error) throw error
  return data
}

// Solo funciona la PRIMERA vez que alguien la llama en toda la plataforma
export async function reclamarSuperadmin() {
  const { error } = await supabase.rpc('reclamar_superadmin')
  if (error) throw error
}

// Negocios que ya están en Kiosko pero todavía no tienen ningún admin vinculado
export async function fetchNegociosSinAdmin() {
  const { data, error } = await supabase.rpc('negocios_sin_admin')
  if (error) throw error
  return data
}

// El dueño real de un negocio ya existente (creado por SQL o por el superadmin) lo reclama como suyo
export async function reclamarNegocioExistente(negocioId) {
  const { data, error } = await supabase.rpc('reclamar_negocio_existente', { p_negocio_id: negocioId })
  if (error) throw error
  return data
}

export async function fetchNegocioPorId(id) {
  const { data, error } = await supabase.from('negocios').select('*').eq('id', id).single()
  if (error) throw error
  return data
}

// Solo el empleado hace esto UNA vez: entra con el código que le dio el dueño
export async function unirseComoEmpleado(codigo) {
  const { data, error } = await supabase.rpc('unirse_como_empleado', { p_codigo: codigo })
  if (error) throw error
  return data
}

// El dueño consulta (o regenera) el código de su propio negocio para compartirlo
export async function fetchCodigoNegocio(negocioId) {
  const { data, error } = await supabase.from('negocio_codigos').select('codigo').eq('negocio_id', negocioId).single()
  if (error) throw error
  return data?.codigo
}

export async function regenerarCodigoNegocio() {
  const { data, error } = await supabase.rpc('regenerar_codigo_negocio')
  if (error) throw error
  return data
}

export async function recuperarPassword(email) {
  const redirectTo = typeof window !== 'undefined'
    ? `${window.location.origin}/?recovery=1`
    : 'https://administraciondenegocios.netlify.app/?recovery=1'
  const { data, error } = await supabase.auth.resetPasswordForEmail(email, {
    redirectTo,
  })
  if (error) throw error
  return data
}

export async function actualizarPassword(newPassword) {
  const { data, error } = await supabase.auth.updateUser({
    password: newPassword,
  })
  if (error) throw error
  return data
}
