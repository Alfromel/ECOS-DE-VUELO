// Forma (esquinas/curvas) de cada tramo. Se guarda solo en este navegador: no toca la base de datos.
const CLAVE = 'ecos.formaTramos'

const leer = () => {
  try { return JSON.parse(localStorage.getItem(CLAVE)) || {} } catch { return {} }
}

export const claveTramo = (rutaId, desdeId, hastaId) => `${rutaId}:${desdeId}:${hastaId}`

export const formaDeTramo = (rutaId, desdeId, hastaId) => leer()[claveTramo(rutaId, desdeId, hastaId)] || null

export function guardarFormaTramo(rutaId, desdeId, hastaId, forma) {
  const todas = leer()
  const k = claveTramo(rutaId, desdeId, hastaId)
  if (forma && forma.puntos?.length) todas[k] = forma
  else delete todas[k]
  try { localStorage.setItem(CLAVE, JSON.stringify(todas)) } catch { /* almacenamiento no disponible */ }
}
