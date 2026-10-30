import { useEffect, useMemo, useRef, useState } from 'react'
import L from 'leaflet'
import { capturarMapa } from '../lib/capturaMapa'
import { CENTRO } from '../hooks/useUbicacion'
import { useAuth } from '../hooks/useAuth'
import { coordenadasTramo, distanciaKm, distanciaTramoKm, fmtKm, paradaCercana, pos as pt, segmentosRuta } from '../lib/geo'
import { pdfMapa } from '../lib/exportar'
import ExportarMapa from './ExportarMapa'
import AvistamientoModal from './AvistamientoModal'
import NidoIco from './NidoIco'

export const svgPin = (color, texto) => L.divIcon({
  className: 'svg-pin', iconSize: [30, 40], iconAnchor: [15, 40], popupAnchor: [0, -36],
  html: `<svg width="30" height="40" viewBox="0 0 30 40" xmlns="http://www.w3.org/2000/svg">
    <path d="M15 0C6.7 0 0 6.7 0 15c0 11 15 25 15 25s15-14 15-25C30 6.7 23.3 0 15 0z" fill="${color}"/>
    <circle cx="15" cy="15" r="9" fill="#fff"/>${texto !== undefined && texto !== null ? `<text x="15" y="19" font-size="11" font-weight="700" text-anchor="middle" fill="${color}">${texto}</text>` : `<circle cx="15" cy="15" r="3.5" fill="${color}"/>`}</svg>`,
})
export const pinYo = svgPin('#7B1FA2')
export const pinNido = L.divIcon({
  className: 'hide-mirador-pin',
  iconSize: [38, 46],
  iconAnchor: [19, 44],
  popupAnchor: [0, -40],
  html: `<svg width="38" height="46" viewBox="0 0 38 46" xmlns="http://www.w3.org/2000/svg" aria-hidden="true">
    <path d="M19 1C9 1 1 9 1 19c0 12 18 26 18 26s18-14 18-26C37 9 29 1 19 1z" fill="#166534" stroke="#fff" stroke-width="2"/>
    <circle cx="19" cy="18" r="12" fill="#fff"/>
    <ellipse cx="15.500" cy="15" rx="3" ry="3.800" fill="#FDE68A" stroke="#166534" stroke-width="1"/>
    <ellipse cx="22.500" cy="15" rx="3" ry="3.800" fill="#FDE68A" stroke="#166534" stroke-width="1"/>
    <path d="M7 18c0 7 5 12 12 12s12-5 12-12z" fill="#16A34A"/>
    <path d="M9 21l20 3M10 25l18-2M13 28l12-3" stroke="#14532D" stroke-width="1.200" stroke-linecap="round"/>
  </svg>`,
})
export const pinHide = L.divIcon({
  className: 'hide-mirador-pin',
  iconSize: [38, 46],
  iconAnchor: [19, 44],
  popupAnchor: [0, -40],
  html: `<svg width="38" height="46" viewBox="0 0 38 46" xmlns="http://www.w3.org/2000/svg" aria-hidden="true">
    <path d="M19 1C9 1 1 9 1 19c0 12 18 26 18 26s18-14 18-26C37 9 29 1 19 1z" fill="#7A4F2A" stroke="#fff" stroke-width="2"/>
    <circle cx="19" cy="18" r="12" fill="#fff"/>
    <path d="M9 16l10-7 10 7h-3v8h-3v-6h-8v6h-3v-8z" fill="#4E2A10"/>
    <path d="M17 19h4v5h-4z" fill="#F59E0B"/>
    <path d="M8 26h22M12 26v4m14-4v4" fill="none" stroke="#fff" stroke-width="2" stroke-linecap="round"/>
  </svg>`,
})
export const iconoParada = (color, n) => L.divIcon({
  className: 'parada-ico', iconSize: [26, 26], iconAnchor: [13, 13], popupAnchor: [0, -12],
  html: `<div style="background:${color};color:#fff;width:26px;height:26px;border-radius:50%;border:3px solid #fff;box-shadow:0 1px 4px rgba(0,0,0,.5);display:flex;align-items:center;justify-content:center;font:700 11px Inter,sans-serif">${n}</div>`,
})

export const capasBase = () => ({
  Híbrido: L.layerGroup([
    L.tileLayer('https://server.arcgisonline.com/ArcGIS/rest/services/World_Imagery/MapServer/tile/{z}/{y}/{x}', { maxZoom: 19, crossOrigin: 'anonymous', attribution: 'Tiles &copy; Esri' }),
    L.tileLayer('https://server.arcgisonline.com/ArcGIS/rest/services/Reference/World_Boundaries_and_Places/MapServer/tile/{z}/{y}/{x}', { maxZoom: 19, crossOrigin: 'anonymous' }),
  ]),
  Satélite: L.tileLayer('https://server.arcgisonline.com/ArcGIS/rest/services/World_Imagery/MapServer/tile/{z}/{y}/{x}', { maxZoom: 19, crossOrigin: 'anonymous', attribution: 'Tiles &copy; Esri' }),
  Calles: L.tileLayer('https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png', { maxZoom: 19, crossOrigin: 'anonymous', attribution: '&copy; OpenStreetMap' }),
  Oscuro: L.tileLayer('https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png', { maxZoom: 19, crossOrigin: 'anonymous', className: 'tiles-oscuros', attribution: '&copy; OpenStreetMap' }),
})

// Un solo botón (arriba a la derecha) que rota entre normal (claro), satélite y oscuro
const ORDEN_MODOS = ['Calles', 'Híbrido', 'Oscuro']
const ICONOS_MODO = { Calles: 'fa-map-o', Híbrido: 'fa-globe', Oscuro: 'fa-moon-o' }
const NOMBRES_MODO = { Calles: 'mapa normal', Híbrido: 'satélite', Oscuro: 'mapa oscuro' }
export function agregarSelectorCapa(m, bases) {
  const Ctl = L.Control.extend({
    onAdd() {
      const div = L.DomUtil.create('div', 'mapa-modo')
      const btn = L.DomUtil.create('button', '', div)
      btn.type = 'button'
      let actual = ORDEN_MODOS.find(k => m.hasLayer(bases[k])) || 'Calles'
      const siguiente = () => ORDEN_MODOS[(ORDEN_MODOS.indexOf(actual) + 1) % ORDEN_MODOS.length]
      const pintar = () => {
        const sig = siguiente()
        btn.innerHTML = `<i class="fa ${ICONOS_MODO[sig]}" aria-hidden="true"></i>`
        btn.title = 'Cambiar a ' + NOMBRES_MODO[sig]
        btn.setAttribute('aria-label', btn.title)
      }
      L.DomEvent.disableClickPropagation(div)
      btn.onclick = () => {
        const sig = siguiente()
        m.removeLayer(bases[actual]); bases[sig].addTo(m); bases[sig].bringToBack?.()
        actual = sig; pintar()
      }
      pintar()
      return div
    },
  })
  new Ctl({ position: 'topright' }).addTo(m)
}
// Buscador de lugares (Nominatim) como control flotante del mapa
export function agregarBuscador(m) {
  const Ctl = L.Control.extend({
    onAdd() {
      const div = L.DomUtil.create('div', 'mapa-buscador')
      div.innerHTML = '<div class="mb-caja"><i class="fa fa-search"></i><input type="text" placeholder="Buscar lugar, ciudad o coordenadas…" /><button type="button" class="mb-x" hidden>&times;</button></div><ul class="mb-lista" hidden></ul>'
      L.DomEvent.disableClickPropagation(div)
      L.DomEvent.disableScrollPropagation(div)
      const inp = div.querySelector('input'), lista = div.querySelector('ul'), x = div.querySelector('.mb-x')
      let t
      const ir = (lat, lon, nombre) => {
        m.flyTo([lat, lon], 16, { duration: 1.2 })
        L.popup({ closeButton: false }).setLatLng([lat, lon]).setContent(`<b>${esc(nombre)}</b>`).openOn(m)
        lista.hidden = true
      }
      const buscar = async () => {
        const q = inp.value.trim()
        x.hidden = !q
        if (q.length < 3) { lista.hidden = true; return }
        const c = q.match(/^(-?\d+(?:\.\d+)?)\s*[,; ]\s*(-?\d+(?:\.\d+)?)$/)
        if (c) { ir(+c[1], +c[2], `${c[1]}, ${c[2]}`); return }
        try {
          const r = await fetch('https://nominatim.openstreetmap.org/search?format=json&limit=6&accept-language=es&q=' + encodeURIComponent(q))
          const d = await r.json()
          lista.innerHTML = d.length ? d.map((p, i) => `<li data-i="${i}"><i class="fa fa-map-marker"></i>${esc(p.display_name)}</li>`).join('') : '<li class="mb-vacio">Sin resultados</li>'
          lista.hidden = false
          lista.onclick = e => { const li = e.target.closest('li[data-i]'); if (li) { const p = d[+li.dataset.i]; ir(+p.lat, +p.lon, p.display_name) } }
        } catch { lista.innerHTML = '<li class="mb-vacio">No se pudo buscar</li>'; lista.hidden = false }
      }
      inp.addEventListener('input', () => { clearTimeout(t); t = setTimeout(buscar, 450) })
      inp.addEventListener('keydown', e => { if (e.key === 'Enter') { clearTimeout(t); buscar() } })
      x.onclick = () => { inp.value = ''; x.hidden = true; lista.hidden = true }
      return div
    },
  })
  new Ctl({ position: 'topright' }).addTo(m)
}

const esc = s => String(s ?? '').replace(/[&<>"]/g, c => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;' }[c]))

// Dibuja rutas (líneas + distancias + paradas) en un grupo de capas. Reutilizado por el editor admin.
export function dibujarRutas(grupo, { rutas, paradas, enlaces }, { verParadas = true, verDist = true, ocultas = new Set(), sinParadas = new Set(), referencias = [], refInteractivas = false } = {}) {
  grupo.clearLayers()
  // Marcadores de solo consulta (hides / nidos) para ubicarse al editar otro módulo
  referencias.forEach(({ lista, icono }) => lista.forEach(h => {
    const mk = L.marker(pt(h), { icon: icono, opacity: 0.8, interactive: refInteractivas, keyboard: false }).addTo(grupo)
    if (refInteractivas) mk.bindTooltip(h.nombre)
  }))
  rutas.filter(r => !ocultas.has(r.id)).forEach(r => {
    const { paradas: ps, segs } = segmentosRuta(r, paradas, enlaces)
    segs.forEach(([a, b, , forma]) => {
      const coords = coordenadasTramo(a, b, forma)
      L.polyline(coords, { color: r.color, weight: 5, opacity: 0.85, lineJoin: 'round', lineCap: 'round' }).addTo(grupo)
      if (verDist) {
        const m = coords[Math.floor(coords.length / 2)]
        L.marker(m, { interactive: false, icon: L.divIcon({ className: 'dist-tip', html: `<span style="border-color:${r.color}">${fmtKm(distanciaTramoKm(a, b, forma))}</span>`, iconSize: [0, 0] }) }).addTo(grupo)
      }
    })
    if (verParadas && !sinParadas.has(r.id)) {
      ps.forEach((p, i) => {
        const ant = ps[i - 1]
        L.marker(pt(p), { icon: iconoParada(p.color || r.color, i) }).addTo(grupo).bindPopup(
          `<b>${esc(p.nombre)}</b><br><small style="color:${r.color}">● ${esc(r.nombre)} · parada ${i} de ${ps.length - 1}</small>` +
          (p.descripcion ? `<br>${esc(p.descripcion)}` : '') +
          `<br><small>${p.latitud.toFixed(5)}, ${p.longitud.toFixed(5)}</small>` +
          (ant ? `<br><small>Desde ${esc(ant.nombre)}: ${fmtKm(distanciaKm(pt(ant), pt(p)))}</small>` : ''))
      })
    }
  })
}

const TRAZOS = {
  ruta: <><circle cx="6" cy="19" r="2.5" /><circle cx="18" cy="5" r="2.5" /><path d="M8.5 19H15a3.5 3.5 0 0 0 0-7H9a3.5 3.5 0 0 1 0-7h6.5" /></>,
  hide: <><path d="M3 11l9-7 9 7" /><path d="M5 10v9h14v-9" /><circle cx="9.5" cy="14.5" r="2" /><circle cx="14.5" cy="14.5" r="2" /></>,
  capas: <><path d="M12 3l9 5-9 5-9-5 9-5z" /><path d="M3 12.5l9 5 9-5" /><path d="M3 16.5l9 5 9-5" /></>,
  ir: <><path d="M4 12h15" /><path d="M13 6l6 6-6 6" /></>,
  x: <><path d="M6 6l12 12M18 6L6 18" /></>,
  mas: <><path d="M12 5v14M5 12h14" /></>,
  descargar: <><path d="M12 4v11" /><path d="M7 11l5 5 5-5" /><path d="M5 20h14" /></>,
}
const Ico = ({ n }) => (
  <svg viewBox="0 0 24 24" width="22" height="22" fill="none" stroke="currentColor" strokeWidth="1.9" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">{TRAZOS[n]}</svg>
)

export default function MapaRutas({ activa, pos, datos }) {
  const { rol, puede } = useAuth()
  const { rutas, paradas, enlaces, hides } = datos
  const nidos = datos.nidos
  const registrado = rol !== 'invitado'
  const puedeAvistar = rol === 'turista' && puede('crear_avistamiento') !== false
  const [hideAvistar, setHideAvistar] = useState(null)
  const [puntoAvistar, setPuntoAvistar] = useState(null)
  const avistarRef = useRef(false)
  useEffect(() => { avistarRef.current = puedeAvistar }, [puedeAvistar])
  const mostrarNidosEnMapa = registrado
  const contenedor = useRef(null)
  const mapa = useRef(null)
  const capa = useRef(null)
  const marcadorYo = useRef(null)
  const [ocultas, setOcultas] = useState(() => new Set())
  const [verHides, setVerHides] = useState(true)
  const [verParadas, setVerParadas] = useState(true)
  const [verDist, setVerDist] = useState(true)
  const [modalExp, setModalExp] = useState(false)
  const [resultado, setResultado] = useState(null)
  const [generando, setGenerando] = useState(false)
  const [panel, setPanel] = useState(null)
  const alternarPanel = nombre => setPanel(p => (p === nombre ? null : nombre))
  const irARuta = r => {
    const pts = paradas.filter(p => p.ruta_id === r.id).map(pt)
    setOcultas(o => { const n = new Set(o); n.delete(r.id); return n })
    setPanel(null)
    if (pts.length > 1) mapa.current?.flyToBounds(L.latLngBounds(pts), { padding: [50, 50], duration: 1.2 })
    else if (pts.length) mapa.current?.flyTo(pts[0], 15, { duration: 1.2 })
  }
  const irAHide = h => {
    setVerHides(true)
    setPanel(null)
    mapa.current?.flyTo(pt(h), Math.max(mapa.current.getZoom(), 17), { duration: 1.2 })
  }

  const irANido = n => {
    setPanel(null)
    mapa.current?.flyTo(pt(n), Math.max(mapa.current.getZoom(), 17), { duration: 1.2 })
  }

  useEffect(() => {
    const m = L.map(contenedor.current, { zoomControl: false, preferCanvas: true }).setView(CENTRO, 7)
    const bases = capasBase()
    bases.Calles.addTo(m)
    agregarBuscador(m)
    agregarSelectorCapa(m, bases)
    capa.current = L.layerGroup().addTo(m)
    mapa.current = m
    // Tocar el mapa (cerca de una parada, hide o ruta) permite marcar un avistamiento ahí
    m.on('click', e => {
      if (!avistarRef.current) return
      const lat = +e.latlng.lat.toFixed(6), lon = +e.latlng.lng.toFixed(6)
      L.popup({ closeButton: false }).setLatLng(e.latlng)
        .setContent(`<div class="hide-popup"><small>${lat}, ${lon}</small><button type="button" class="hide-popup-btn" data-punto="${lat},${lon}"><i class="fa fa-binoculars"></i> Avistamiento aquí</button></div>`).openOn(m)
    })
    const onResize = () => m.invalidateSize()
    window.addEventListener('resize', onResize)
    return () => { window.removeEventListener('resize', onResize); marcadorYo.current = null; m.remove(); mapa.current = null }
  }, [])

  useEffect(() => {
    const m = mapa.current
    if (!m || !pos) return
    if (!marcadorYo.current) {
      marcadorYo.current = L.marker(pos, { icon: pinYo }).addTo(m).bindPopup('Tu ubicación')
      if (!datos.paradas.length) { if (activa) m.flyTo(pos, 12, { duration: 1 }); else m.setView(pos, 12, { animate: false }) }
    } else marcadorYo.current.setLatLng(pos)
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [pos])

  const encuadrado = useRef(false)
  useEffect(() => {
    const m = mapa.current
    if (!m) return
    dibujarRutas(capa.current, datos, { verParadas, verDist: verDist && registrado, ocultas })
    if (registrado && verHides) {
      hides.forEach(h => L.marker(pt(h), { icon: pinHide }).addTo(capa.current)
        .bindPopup(`<div class="hide-popup"><b>${esc(h.nombre)}</b>${h.descripcion ? '<small>' + esc(h.descripcion) + '</small>' : ''}${puedeAvistar
          ? `<button type="button" class="hide-popup-btn" data-avistar="${esc(h.id)}"><i class="fa fa-binoculars"></i> Hacer avistamiento</button>`
          : ''}</div>`))
    }
    if (mostrarNidosEnMapa) {
      nidos.forEach(n => L.marker(pt(n), { icon: pinNido }).addTo(capa.current)
        .bindPopup(`<div class="hide-popup"><b>${esc(n.nombre)}</b>${n.descripcion ? '<small>' + esc(n.descripcion) + '</small>' : ''}</div>`))
    }
    if (!datos.cargando && !encuadrado.current && (paradas.length || hides.length || (mostrarNidosEnMapa && nidos.length))) {
      const puntos = [...paradas.map(pt), ...(registrado ? hides.map(pt) : []), ...(mostrarNidosEnMapa ? nidos.map(pt) : [])]
      if (puntos.length) { m.fitBounds(L.latLngBounds(puntos), { padding: [60, 60], animate: false }); encuadrado.current = true }
    }
  }, [datos, ocultas, verHides, verParadas, verDist, registrado, mostrarNidosEnMapa, hides, nidos, paradas, puedeAvistar])

  useEffect(() => {
    const cont = mapa.current?.getContainer()
    if (!cont) return
    const alClick = e => {
      const p = e.target.closest?.('[data-punto]')
      if (p) {
        const [lat, lon] = p.dataset.punto.split(',').map(Number)
        const c = paradaCercana([lat, lon], datos.paradas)
        mapa.current.closePopup()
        setPuntoAvistar({ lat, lon, ruta_id: c?.parada.ruta_id, parada_id: c?.parada.id })
        return
      }
      const b = e.target.closest?.('[data-avistar]')
      if (!b) return
      mapa.current.closePopup()
      setHideAvistar(b.dataset.avistar)
    }
    cont.addEventListener('click', alClick)
    return () => cont.removeEventListener('click', alClick)
  }, [datos.paradas])

  useEffect(() => {
    if (!activa) { mapa.current?.stop(); return }
    const t = setTimeout(() => mapa.current?.invalidateSize(), 50)
    return () => { clearTimeout(t); mapa.current?.stop() }
  }, [activa])

  const resumen = useMemo(() => rutas.map(r => {
    const { paradas: ps, segs } = segmentosRuta(r, paradas, enlaces)
    return { ...r, n: ps.length, km: segs.reduce((s, [a, b]) => s + distanciaKm(pt(a), pt(b)), 0) }
  }), [rutas, paradas, enlaces])

  const alternarRuta = id => setOcultas(o => { const n = new Set(o); n.has(id) ? n.delete(id) : n.add(id); return n })

  const generar = async ({ rutasSel, hides: incH, paradas: incP, formato }) => {
    const prev = { ocultas, verHides, verParadas }
    setGenerando(true)
    setOcultas(new Set(rutas.filter(r => !rutasSel.has(r.id)).map(r => r.id)))
    setVerHides(incH); setVerParadas(incP)
    await new Promise(r => setTimeout(r, 1500))
    try {
      const canvas = await capturarMapa(contenedor.current, 2)
      const ley = resumen.filter(r => rutasSel.has(r.id))
      let blob, nombre
      if (formato === 'pdf') { blob = pdfMapa(canvas, ley, incH, incP); nombre = 'mapa-rutas.pdf' }
      else { blob = await new Promise(ok => canvas.toBlob(ok, 'image/png')); nombre = 'mapa-rutas.png' }
      setModalExp(false)
      setResultado({ blob, nombre })
    } catch (e) {
      alert('No se pudo generar el mapa: ' + e.message)
    } finally {
      setOcultas(prev.ocultas); setVerHides(prev.verHides); setVerParadas(prev.verParadas); setGenerando(false)
    }
  }

  return (
    <div className={'bg-white rounded-xl shadow-md p-5' + (activa ? '' : ' vista-oculta')} id="mapa-card" data-vista="mapa">
      <div id="mapa" ref={contenedor} className="relative w-full h-64 bg-green-50 overflow-hidden z-0"></div>

      <div className="mapa-fabs">
        <button type="button" className={'mapa-fab' + (panel === 'rutas' ? ' on' : '')} onClick={() => alternarPanel('rutas')} aria-label="Rutas" title="Rutas">
          <Ico n="ruta" />
        </button>
        {registrado && (
          <button type="button" className={'mapa-fab mapa-fab-hide' + (panel === 'hides' ? ' on' : '')} onClick={() => alternarPanel('hides')} aria-label="Hides" title="Hides">
            <Ico n="hide" />
          </button>
        )}
        {registrado && (
          <button type="button" className={'mapa-fab' + (panel === 'nidos' ? ' on' : '')} onClick={() => alternarPanel('nidos')} aria-label="Nidos" title="Nidos">
            <NidoIco size={19} />
          </button>
        )}
        <button type="button" className={'mapa-fab' + (panel === 'capas' ? ' on' : '')} onClick={() => alternarPanel('capas')} aria-label="Capas y leyenda" title="Capas y leyenda">
          <Ico n="capas" />
        </button>
      </div>

      {panel === 'rutas' && (
        <div className="mapa-panel abierto">
          <div className="mapa-panel-cab"><b>Rutas</b><button type="button" className="mapa-x" onClick={() => setPanel(null)} aria-label="Cerrar"><Ico n="x" /></button></div>
          {!resumen.length && <p className="text-xs text-gray-500">Aún no hay rutas publicadas.</p>}
          {resumen.map(r => (
            <div key={r.id} className="mapa-hide-fila">
              <i className="leyenda-color" style={{ background: r.color }}></i>
              <span className="flex-1 min-w-0"><b className="block truncate">{r.nombre}</b><small className="block text-gray-500">{r.n} paradas{registrado ? ' · ' + fmtKm(r.km) : ''}</small></span>
              <button type="button" className="mapa-ico-btn" onClick={() => irARuta(r)} aria-label={'Ir a ' + r.nombre} title="Ir a la ruta"><Ico n="ir" /></button>
            </div>
          ))}
        </div>
      )}

      {panel === 'hides' && registrado && (
        <div className="mapa-panel abierto">
          <div className="mapa-panel-cab"><b>Hides</b><button type="button" className="mapa-x" onClick={() => setPanel(null)} aria-label="Cerrar"><Ico n="x" /></button></div>
          {!hides.length && <p className="text-xs text-gray-500">Aún no hay Hides registrados.</p>}
          {hides.map(h => (
            <div key={h.id} className="mapa-hide-fila">
              <span className="mapa-hide-ico"><Ico n="hide" /></span>
              <span className="flex-1 min-w-0"><b className="block truncate">{h.nombre}</b>{h.descripcion && <small className="block truncate text-gray-500">{h.descripcion}</small>}</span>
              <button type="button" className="mapa-ico-btn" onClick={() => irAHide(h)} aria-label={'Ir a ' + h.nombre} title="Ir al Hide"><Ico n="ir" /></button>
            </div>
          ))}
        </div>
      )}

      {panel === 'nidos' && registrado && (
        <div className="mapa-panel abierto">
          <div className="mapa-panel-cab"><b>Nidos</b><button type="button" className="mapa-x" onClick={() => setPanel(null)} aria-label="Cerrar"><Ico n="x" /></button></div>
          {!nidos.length && <p className="text-xs text-gray-500">Aún no hay Nidos registrados.</p>}
          {nidos.map(n => (
            <div key={n.id} className="mapa-hide-fila">
              <span className="mapa-hide-ico"><NidoIco size={20} /></span>
              <span className="flex-1 min-w-0"><b className="block truncate">{n.nombre}</b>{n.descripcion && <small className="block truncate text-gray-500">{n.descripcion}</small>}</span>
              <button type="button" className="mapa-ico-btn" onClick={() => irANido(n)} aria-label={'Ir al nido ' + n.nombre} title="Ir al nido"><Ico n="ir" /></button>
            </div>
          ))}
        </div>
      )}

      <div className={'mapa-panel' + (panel === 'capas' ? ' abierto' : '')}>
        <div className="mapa-panel-cab">
          <b>Capas y leyenda</b>
          <button type="button" className="mapa-x" onClick={() => setPanel(null)} aria-label="Cerrar"><Ico n="x" /></button>
        </div>
        {!resumen.length && <p className="text-xs text-gray-500">Aún no hay rutas publicadas.</p>}
        {resumen.map(r => (
          <label key={r.id} className="flex items-center gap-2 text-sm">
            <input type="checkbox" checked={!ocultas.has(r.id)} onChange={() => alternarRuta(r.id)} />
            <i className="leyenda-color" style={{ background: r.color }}></i>
            <span className="flex-1">{r.nombre}</span>
            <small className="text-gray-500">{r.n} paradas{registrado ? ' · ' + fmtKm(r.km) : ''}</small>
          </label>
        ))}
        <hr />
        <label className="flex items-center gap-2 text-sm"><input type="checkbox" checked={verParadas} onChange={e => setVerParadas(e.target.checked)} /> Paradas</label>
        {registrado && <>
          <label className="flex items-center gap-2 text-sm"><input type="checkbox" checked={verDist} onChange={e => setVerDist(e.target.checked)} /> Distancia entre paradas</label>
          <label className="flex items-center gap-2 text-sm"><input type="checkbox" checked={verHides} onChange={e => setVerHides(e.target.checked)} /> Hide</label>
        </>}
        <hr />
        <b className="text-xs">Leyenda</b>
        <div className="text-xs space-y-1">
          <div><i className="leyenda-color" style={{ background: '#7B1FA2' }}></i> Tu ubicación</div>
          <div><i className="leyenda-color" style={{ background: '#64748b', borderRadius: '50%' }}></i> Parada (número = orden)</div>
          {registrado && <div><i className="leyenda-color" style={{ background: '#D32F2F' }}></i> Hide</div>}
          <div>Mapa / Satélite: botón superior izquierdo</div>
        </div>
        {registrado && puede('exportar_mapa') && (
          <button type="button" className="mapa-ico-btn mapa-ico-exp"           onClick={() => { setPanel(null); setModalExp(true) }} aria-label="Descargar o compartir" title="Descargar o compartir">
                     <Ico n="descargar" />
          </button>
        )}
        {!registrado && <p className="text-xs text-primary mt-1">Mapa informativo. Regístrate para ver Hide, distancias y exportar.</p>}
      </div>

      {hideAvistar && <AvistamientoModal datos={datos} hideInicial={hideAvistar} onCerrar={() => setHideAvistar(null)} onCreado={() => setHideAvistar(null)} />}
      {puntoAvistar && <AvistamientoModal datos={datos} puntoInicial={puntoAvistar} onCerrar={() => setPuntoAvistar(null)} onCreado={() => setPuntoAvistar(null)} />}
      {modalExp && <ExportarMapa rutas={resumen} hayHides={hides.length > 0} generando={generando} onGenerar={generar} onCerrar={() => setModalExp(false)} />}
      {resultado && (
        <div className="modal-fondo" onMouseDown={e => e.target === e.currentTarget && setResultado(null)}>
          <div className="modal-caja">
            <button className="modal-x" onClick={() => setResultado(null)}>×</button>
            <h3 className="font-bold text-lg mb-2">Mapa generado</h3>
            <p className="text-sm text-gray-600 mb-4">¿Quieres compartirlo o solo descargarlo?</p>
            <div className="flex gap-2">
              <button className="btn-rojo flex-1" onClick={() => {
                const f = new File([resultado.blob], resultado.nombre, { type: resultado.blob.type })
                if (navigator.canShare?.({ files: [f] })) navigator.share({ files: [f], title: 'Mapa de rutas · Ecos de Vuelo Rojo' }).catch(() => {})
                else { alert('Tu navegador no permite compartir archivos; se descargará.'); descargarBlob(resultado) }
              }}><i className="fa fa-share-alt"></i> Compartir</button>
              <button className="btn-sec flex-1" onClick={() => descargarBlob(resultado)}><i className="fa fa-download"></i> Descargar</button>
            </div>
          </div>
        </div>
      )}
    </div>
  )
}

const descargarBlob = ({ blob, nombre }) => {
  const a = document.createElement('a')
  a.href = URL.createObjectURL(blob); a.download = nombre; a.click()
  setTimeout(() => URL.revokeObjectURL(a.href), 2000)
}
