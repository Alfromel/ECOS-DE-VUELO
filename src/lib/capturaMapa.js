import html2canvas from 'html2canvas'

const cargar = img => new Promise(ok => {
  if (img.complete && img.naturalWidth) return ok(true)
  img.onload = () => ok(true)
  img.onerror = () => ok(false)
})

// Captura el mapa Leaflet por capas: mosaicos y líneas se dibujan directo en un canvas
// (html2canvas los desplaza o los pierde) y solo los marcadores/etiquetas HTML usan html2canvas.
export async function capturarMapa(contenedor, escala = 2) {
  const cr = contenedor.getBoundingClientRect()
  const out = document.createElement('canvas')
  out.width = Math.round(cr.width * escala)
  out.height = Math.round(cr.height * escala)
  const ctx = out.getContext('2d')
  ctx.fillStyle = '#e5e7eb'
  ctx.fillRect(0, 0, out.width, out.height)

  const rel = el => { const r = el.getBoundingClientRect(); return [(r.left - cr.left) * escala, (r.top - cr.top) * escala, r.width * escala, r.height * escala] }

  const capas = contenedor.querySelectorAll('.leaflet-tile-pane .leaflet-layer')
  for (const capa of capas) {
    const op = parseFloat(getComputedStyle(capa).opacity || '1')
    const tiles = [...capa.querySelectorAll('img.leaflet-tile')].filter(t => t.closest('.leaflet-tile-container')?.style.display !== 'none')
    await Promise.all(tiles.map(cargar))
    ctx.globalAlpha = op
    tiles.forEach(t => {
      if (!t.naturalWidth) return
      const [x, y, w, h] = rel(t)
      try { ctx.drawImage(t, x, y, w + 0.6, h + 0.6) } catch { /* mosaico sin CORS */ }
    })
    ctx.globalAlpha = 1
  }

  // Líneas de las rutas (canvas o svg de Leaflet)
  contenedor.querySelectorAll('.leaflet-overlay-pane canvas').forEach(c => { const [x, y, w, h] = rel(c); ctx.drawImage(c, x, y, w, h) })
  for (const svg of contenedor.querySelectorAll('.leaflet-overlay-pane svg')) {
    const xml = new XMLSerializer().serializeToString(svg)
    const img = new Image()
    img.src = 'data:image/svg+xml;charset=utf-8,' + encodeURIComponent(xml)
    if (await cargar(img)) { const [x, y, w, h] = rel(svg); ctx.drawImage(img, x, y, w, h) }
  }

  // Marcadores, distancias y ubicación
  const marcas = await html2canvas(contenedor, {
    backgroundColor: null, scale: escala, useCORS: true, logging: false,
    ignoreElements: el => ['leaflet-tile-pane', 'leaflet-overlay-pane', 'leaflet-control-container'].some(c => el.classList?.contains(c)),
    onclone: (doc, el) => { el.style.background = 'transparent'; el.querySelectorAll('.leaflet-map-pane, .leaflet-pane').forEach(p => { p.style.background = 'transparent' }) },
  })
  ctx.drawImage(marcas, 0, 0, out.width, out.height)
  return out
}
