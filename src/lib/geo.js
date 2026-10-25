import { formaDeTramo } from './formaTramos'

export const distanciaKm = (a, b) => {
  const R = 6371, rad = x => (x * Math.PI) / 180
  const dLat = rad(b[0] - a[0]), dLon = rad(b[1] - a[1])
  const h = Math.sin(dLat / 2) ** 2 + Math.cos(rad(a[0])) * Math.cos(rad(b[0])) * Math.sin(dLon / 2) ** 2
  return 2 * R * Math.asin(Math.sqrt(h))
}

export const fmtKm = km => (km < 1 ? Math.round(km * 1000) + ' m' : km.toFixed(2) + ' km')

export const pos = o => [o.latitud, o.longitud]

// Suaviza esquinas (Chaikin) para lograr curvas
const suavizar = (pts, vueltas = 3) => {
  let r = pts
  for (let n = 0; n < vueltas; n++) {
    const s = [r[0]]
    for (let i = 0; i < r.length - 1; i++) {
      const p = r[i], q = r[i + 1]
      s.push([p[0] * 0.75 + q[0] * 0.25, p[1] * 0.75 + q[1] * 0.25], [p[0] * 0.25 + q[0] * 0.75, p[1] * 0.25 + q[1] * 0.75])
    }
    s.push(r[r.length - 1])
    r = s
  }
  return r
}

// forma = { puntos: [[lat, lng]...], curva: boolean }
export const coordenadasTramo = (a, b, forma) => {
  const medios = Array.isArray(forma?.puntos)
    ? forma.puntos.filter(p => Array.isArray(p) && p.length === 2 && p.every(Number.isFinite))
    : []
  const base = [pos(a), ...medios, pos(b)]
  return forma?.curva && medios.length ? suavizar(base) : base
}

export const distanciaTramoKm = (a, b, enlace) => {
  const coords = coordenadasTramo(a, b, enlace)
  return coords.slice(1).reduce((total, punto, i) => total + distanciaKm(coords[i], punto), 0)
}

// Parada más cercana (sugerencia de ruta/parada para un punto)
export const paradaCercana = (punto, paradas) => {
  let mejor = null
  for (const p of paradas) {
    const d = distanciaKm(punto, pos(p))
    if (!mejor || d < mejor.d) mejor = { parada: p, d }
  }
  return mejor
}

// Segmentos de una ruta: A-B, B-C por orden + enlaces extra (C-A)
export const segmentosRuta = (ruta, paradas, enlaces) => {
  const ps = paradas.filter(p => p.ruta_id === ruta.id).sort((a, b) => a.orden - b.orden)
  const porId = Object.fromEntries(ps.map(p => [p.id, p]))
  const enlacesRuta = enlaces.filter(e => e.ruta_id === ruta.id)
  const esConsecutivo = (desde, hasta) => ps.some((p, i) => p.id === desde && ps[i + 1]?.id === hasta)
  const segs = []
  for (let i = 0; i < ps.length - 1; i++) {
    const a = ps[i], b = ps[i + 1]
    segs.push([a, b, null, formaDeTramo(ruta.id, a.id, b.id)])
  }
  enlacesRuta.forEach(e => {
    const a = porId[e.desde_parada], b = porId[e.hasta_parada]
    if (a && b && !esConsecutivo(a.id, b.id)) segs.push([a, b, e.id, formaDeTramo(ruta.id, a.id, b.id)])
  })
  return { paradas: ps, segs }
}
