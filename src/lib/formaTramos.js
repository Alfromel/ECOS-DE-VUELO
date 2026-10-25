import { supabase } from './supabase'

const CLAVE = 'ecos.formaTramos'

const leer = () => {
  try { return JSON.parse(localStorage.getItem(CLAVE)) || {} } catch { return {} }
}

export const claveTramo = (rutaId, desdeId, hastaId) => `${rutaId}:${desdeId}:${hastaId}`

export const formaDeTramo = (rutaId, desdeId, hastaId, formasCompartidas) => {
  const clave = claveTramo(rutaId, desdeId, hastaId)
  return formasCompartidas?.[clave] || null
}

export const leerFormasLocales = leer

export function eliminarFormasLocales(claves) {
  const todas = leer()
  claves.forEach(clave => delete todas[clave])
  try { localStorage.setItem(CLAVE, JSON.stringify(todas)) } catch { /* almacenamiento no disponible */ }
}

export function guardarFormaTramo(rutaId, desdeId, hastaId, forma) {
  return supabase.rpc('guardar_forma_tramo', {
    p_ruta_id: String(rutaId),
    p_desde_parada: String(desdeId),
    p_hasta_parada: String(hastaId),
    p_forma: forma?.puntos?.length ? forma : null,
  })
}
