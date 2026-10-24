export const distanciaKm = (a, b) => {
  const R = 6371, rad = x => (x * Math.PI) / 180
  const dLat = rad(b[0] - a[0]), dLon = rad(b[1] - a[1])
  const h = Math.sin(dLat / 2) ** 2 + Math.cos(rad(a[0])) * Math.cos(rad(b[0])) * Math.sin(dLon / 2) ** 2
  return 2 * R * Math.asin(Math.sqrt(h))
}

export const fmtKm = km => (km < 1 ? Math.round(km * 1000) + ' m' : km.toFixed(2) + ' km')

export const pos = o => [o.latitud, o.longitud]

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
  const segs = []
  for (let i = 0; i < ps.length - 1; i++) segs.push([ps[i], ps[i + 1]])
  enlaces.filter(e => e.ruta_id === ruta.id).forEach(e => {
    const a = porId[e.desde_parada], b = porId[e.hasta_parada]
    if (a && b) segs.push([a, b, e.id])
  })
  return { paradas: ps, segs }
}
