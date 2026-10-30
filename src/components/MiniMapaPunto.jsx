import { useEffect, useRef, useState } from 'react'
import { createPortal } from 'react-dom'
import L from 'leaflet'
import { CENTRO } from '../hooks/useUbicacion'
import { capasBase, dibujarRutas, pinHide, pinYo } from './MapaRutas'
import { pos as pt } from '../lib/geo'

// Ventana con un mapa pequeño (rutas y hides visibles) para marcar el punto del avistamiento
export default function MiniMapaPunto({ datos, inicial, onElegir, onCerrar }) {
  const el = useRef(null)
  const [punto, setPunto] = useState(inicial)
  const puntoRef = useRef(inicial)

  useEffect(() => {
    const m = L.map(el.current, { zoomControl: true, preferCanvas: true }).setView(inicial || CENTRO, inicial ? 17 : 7)
    capasBase().Híbrido.addTo(m)
    const capa = L.layerGroup().addTo(m)
    dibujarRutas(capa, datos, { verDist: false, referencias: [{ lista: datos.hides || [], icono: pinHide }] })
    const marca = L.marker(inicial || CENTRO, { icon: pinYo, draggable: true, zIndexOffset: 1000 })
    const poner = ll => {
      const v = [+ll.lat.toFixed(6), +ll.lng.toFixed(6)]
      puntoRef.current = v; setPunto(v); marca.setLatLng(v)
      if (!m.hasLayer(marca)) marca.addTo(m)
    }
    if (inicial) marca.addTo(m)
    marca.on('dragend', () => poner(marca.getLatLng()))
    m.on('click', e => poner(e.latlng))
    if (!inicial) {
      const pts = [...(datos.paradas || []).map(pt), ...(datos.hides || []).map(pt)]
      if (pts.length) m.fitBounds(L.latLngBounds(pts), { padding: [30, 30], animate: false })
    }
    setTimeout(() => m.invalidateSize(), 80)
    return () => m.remove()
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [])

  return createPortal(
    <div className="modal-fondo" style={{ zIndex: 3000 }} onMouseDown={e => e.target === e.currentTarget && onCerrar()}>
      <div className="modal-caja">
        <button type="button" className="modal-x" onClick={onCerrar}>×</button>
        <h3 className="font-bold text-lg mb-1">Marca el punto del avistamiento</h3>
        <p className="text-xs text-gray-500 mb-2">Toca el mapa o arrastra el marcador morado.</p>
        <div ref={el} style={{ height: '55vh', minHeight: 260, borderRadius: 12, isolation: 'isolate' }}></div>
        <p className="text-xs text-gray-600 my-2">{punto ? `${punto[0]}, ${punto[1]}` : 'Aún no has marcado un punto'}</p>
        <div className="flex gap-2">
          <button type="button" className="btn-sec flex-1" onClick={onCerrar}>Cancelar</button>
          <button type="button" className="btn-rojo flex-1" disabled={!punto} onClick={() => onElegir(...puntoRef.current)}>Usar este punto</button>
        </div>
      </div>
    </div>, document.body)
}
