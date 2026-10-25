import { useEffect, useMemo, useRef, useState } from 'react'
import L from 'leaflet'
import { capturarMapa } from '../lib/capturaMapa'
import { CENTRO } from '../hooks/useUbicacion'
import { useAuth } from '../hooks/useAuth'
import { coordenadasTramo, distanciaKm, distanciaTramoKm, fmtKm, pos as pt, segmentosRuta } from '../lib/geo'
import { pdfMapa } from '../lib/exportar'
import ExportarMapa from './ExportarMapa'
import AvistamientoModal from './AvistamientoModal'

export const svgPin = (color, texto) => L.divIcon({
  className: 'svg-pin', iconSize: [30, 40], iconAnchor: [15, 40], popupAnchor: [0, -36],
  html: `<svg width="30" height="40" viewBox="0 0 30 40" xmlns="http://www.w3.org/2000/svg">
    <path d="M15 0C6.7 0 0 6.7 0 15c0 11 15 25 15 25s15-14 15-25C30 6.7 23.3 0 15 0z" fill="${color}"/>
    <circle cx="15" cy="15" r="9" fill="#fff"/>${texto ? `<text x="15" y="19" font-size="11" font-weight="700" text-anchor="middle" fill="${color}">${texto}</text>` : `<circle cx="15" cy="15" r="3.5" fill="${color}"/>`}</svg>`,
})
export const pinYo = svgPin('#7B1FA2')
export const pinHide = L.divIcon({
  className: 'hide-mirador-pin',
  iconSize: [38, 46],
  iconAnchor: [19, 44],
  popupAnchor: [0, -40],
  html: `<svg width="38" height="46" viewBox="0 0 38 46" xmlns="http://www.w3.org/2000/svg" aria-hidden="true">
    <path d="M19 1C9 1 1 9 1 19c0 12 18 26 18 26s18-14 18-26C37 9 29 1 19 1z" fill="#D32F2F" stroke="#fff" stroke-width="2"/>
    <circle cx="19" cy="18" r="12" fill="#fff"/>
    <path d="M9 16l10-7 10 7h-3v8h-3v-6h-8v6h-3v-8z" fill="#7F1D1D"/>
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
})

// Un solo botón (arriba a la derecha) que alterna entre mapa normal y satélite
export function agregarSelectorCapa(m, bases) {
  const Ctl = L.Control.extend({
    onAdd() {
      const div = L.DomUtil.create('div', 'mapa-modo')
      const btn = L.DomUtil.create('button', '', div)
      btn.type = 'button'
      let actual = 'Híbrido'
      const pintar = () => {
        btn.innerHTML = actual === 'Híbrido' ? '<i class="fa fa-map-o" aria-hidden="true"></i>' : '<i class="fa fa-globe" aria-hidden="true"></i>'
        btn.title = actual === 'Híbrido' ? 'Cambiar a mapa de calles' : 'Cambiar a satélite'
        btn.setAttribute('aria-label', btn.title)
        btn.setAttribute('aria-pressed', String(actual !== 'Híbrido'))
      }
      L.DomEvent.disableClickPropagation(div)
      btn.onclick = () => {
        const sig = actual === 'Híbrido' ? 'Calles' : 'Híbrido'
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
export function dibujarRutas(grupo, { rutas, paradas, enlaces }, { verParadas = true, verDist = true, ocultas = new Set(), sinParadas = new Set() } = {}) {
  grupo.clearLayers()
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
        L.marker(pt(p), { icon: iconoParada(p.color || r.color, i + 1) }).addTo(grupo).bindPopup(
          `<b>${esc(p.nombre)}</b><br><small style="color:${r.color}">● ${esc(r.nombre)} · parada ${i + 1} de ${ps.length}</small>` +
          (p.descripcion ? `<br>${esc(p.descripcion)}` : '') +
          `<br><small>${p.latitud.toFixed(5)}, ${p.longitud.toFixed(5)}</small>` +
          (ant ? `<br><small>Desde ${esc(ant.nombre)}: ${fmtKm(distanciaKm(pt(ant), pt(p)))}</small>` : ''))
      })
    }
  })
}

export default function MapaRutas({ activa, pos, datos }) {
  const { rol, puede } = useAuth()
  const { rutas, paradas, enlaces, hides } = datos
  const registrado = rol !== 'invitado'
  const puedeAvistar = rol === 'turista' && puede('crear_avistamiento') !== false
  const [hideAvistar, setHideAvistar] = useState(null)
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
  const [panel, setPanel] = useState(false)

  useEffect(() => {
    const m = L.map(contenedor.current, { zoomControl: false, preferCanvas: true }).setView(CENTRO, 7)
    const bases = capasBase()
    bases.Híbrido.addTo(m)
    agregarBuscador(m)
    agregarSelectorCapa(m, bases)
    capa.current = L.layerGroup().addTo(m)
    mapa.current = m
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
    if (!encuadrado.current && (paradas.length || hides.length)) {
      const puntos = [...paradas.map(pt), ...(registrado ? hides.map(pt) : [])]
      if (puntos.length) { m.fitBounds(L.latLngBounds(puntos), { padding: [60, 60], animate: false }); encuadrado.current = true }
    }
  }, [datos, ocultas, verHides, verParadas, verDist, registrado, hides, paradas, puedeAvistar])

  useEffect(() => {
    const cont = mapa.current?.getContainer()
    if (!cont) return
    const alClick = e => {
      const b = e.target.closest?.('[data-avistar]')
      if (!b) return
      mapa.current.closePopup()
      setHideAvistar(b.dataset.avistar)
    }
    cont.addEventListener('click', alClick)
    return () => cont.removeEventListener('click', alClick)
  }, [])

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

      <button className="mapa-fab" onClick={() => setPanel(p => !p)} aria-label="Rutas y leyenda">`n        <i className={'fa ' + (panel ? 'fa-times' : 'fa-list-ul')}></i> {panel ? 'Cerrar' : 'Rutas y leyenda'}`n      </button>`n`n      <div className={'mapa-panel' + (panel ? ' abierto' : '')}>
        <div className="flex items-center justify-between gap-2">
          <b>Rutas</b>
          <span className="text-xs text-gray-500">{paradas.length} paradas totales</span>
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
          <button className="btn-rojo w-full mt-2" onClick={() => setModalExp(true)}><i className="fa fa-download"></i> Descargar / compartir</button>
        )}
        {!registrado && <p className="text-xs text-primary mt-1">Mapa informativo. Regístrate para ver Hide, distancias y exportar.</p>}
      </div>

      {hideAvistar && <AvistamientoModal datos={datos} hideInicial={hideAvistar} onCerrar={() => setHideAvistar(null)} onCreado={() => setHideAvistar(null)} />}
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
