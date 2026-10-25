import { useEffect, useRef, useState } from 'react'
import L from 'leaflet'
import { supabase } from '../lib/supabase'
import { useAuth } from '../hooks/useAuth'
import { CENTRO } from '../hooks/useUbicacion'
import { agregarBuscador, agregarSelectorCapa, capasBase, dibujarRutas, pinHide } from '../components/MapaRutas'
import { fmtKm, pos as pt, paradaCercana } from '../lib/geo'
import { agregarControlRotacion, opcionesRotacionAdmin } from '../lib/rotacionMapa'

const vacio = { id: null, nombre: '', descripcion: '', latitud: '', longitud: '', ruta_id: '', parada_id: '' }

export default function AdminHides({ datos }) {
  const { perfil } = useAuth()
  const { rutas, paradas, hides, recargar } = datos
  const [f, setF] = useState(null) // formulario (nuevo o edición)
  const [sugerido, setSugerido] = useState(null)
  const [error, setError] = useState(null)
  const el = useRef(null)
  const mapa = useRef(null)
  const capa = useRef(null)
  const borrador = useRef(null)
  const paradasRef = useRef(paradas)
  const ajustado = useRef(false)

  useEffect(() => { paradasRef.current = paradas }, [paradas])

  const sugerir = (lat, lon, aplicar) => {
    const c = paradaCercana([lat, lon], paradasRef.current)
    if (!c) { setSugerido(null); return }
    setSugerido({ parada: c.parada, d: c.d })
    if (aplicar) setF(v => ({ ...v, ruta_id: c.parada.ruta_id, parada_id: c.parada.id }))
  }

  const colocar = (lat, lon) => {
    lat = +(+lat).toFixed(6); lon = +(+lon).toFixed(6)
    setF(v => ({ ...(v || vacio), latitud: lat, longitud: lon }))
    sugerir(lat, lon, true)
  }

  const editar = h => {
    setF({ id: h.id, nombre: h.nombre, descripcion: h.descripcion || '', latitud: h.latitud, longitud: h.longitud, ruta_id: h.ruta_id || '', parada_id: h.parada_id || '' })
    sugerir(h.latitud, h.longitud, false)
    mapa.current?.panTo(pt(h))
  }

  useEffect(() => {
    const m = L.map(el.current, { zoomControl: false, ...opcionesRotacionAdmin }).setView(CENTRO, 7)
    const bases = capasBase()
    bases.Híbrido.addTo(m)
    agregarBuscador(m)
    agregarSelectorCapa(m, bases)
    agregarControlRotacion(m)
    capa.current = L.layerGroup().addTo(m)
    mapa.current = m
    m.on('click', e => colocar(e.latlng.lat, e.latlng.lng))
    setTimeout(() => m.invalidateSize(), 50)
    return () => { m.remove(); mapa.current = null }
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [])

  useEffect(() => {
    dibujarRutas(capa.current, datos, { verDist: false })
    hides.forEach(h => {
      if (f?.id === h.id) return
      L.marker(pt(h), { icon: pinHide }).addTo(capa.current).bindTooltip(h.nombre).on('click', () => editar(h))
    })
    if (!ajustado.current && (hides.length || paradas.length)) {
      mapa.current.fitBounds(L.latLngBounds([...hides.map(pt), ...paradas.map(pt)]), { padding: [50, 50], animate: false })
      ajustado.current = true
    }
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [datos, f?.id])

  // Pin arrastrable del hide en edición / creación
  useEffect(() => {
    borrador.current?.remove(); borrador.current = null
    if (!f || f.latitud === '' || f.longitud === '') return
    const mk = L.marker([+f.latitud, +f.longitud], { icon: pinHide, draggable: true, zIndexOffset: 1000 }).addTo(mapa.current)
    mk.on('dragend', () => { const ll = mk.getLatLng(); colocar(ll.lat, ll.lng) })
    borrador.current = mk
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [f?.id, f?.latitud, f?.longitud, f === null])

  const set = k => e => setF({ ...f, [k]: e.target.value })
  const cambioCoord = k => e => {
    const v = { ...f, [k]: e.target.value }
    setF(v)
    if (v.latitud !== '' && v.longitud !== '' && !isNaN(+v.latitud) && !isNaN(+v.longitud)) sugerir(+v.latitud, +v.longitud, true)
  }

  const guardar = async e => {
    e.preventDefault()
    if (isNaN(+f.latitud) || isNaN(+f.longitud) || f.latitud === '' || f.longitud === '') return setError('Indica coordenadas o haz clic en el mapa')
    const fila = {
      nombre: f.nombre, descripcion: f.descripcion, latitud: +f.latitud, longitud: +f.longitud,
      ruta_id: f.ruta_id || null, parada_id: f.parada_id || null, actualizado_en: new Date().toISOString(),
    }
    const r = f.id
      ? await supabase.from('hides').update(fila).eq('id', f.id)
      : await supabase.from('hides').insert({ ...fila, creado_por: perfil.id })
    if (r.error) return setError(r.error.message)
    setError(null); setF(null); setSugerido(null); recargar()
  }

  const eliminar = async () => {
    if (!confirm(`¿Eliminar "${f.nombre}"?`)) return
    const r = await supabase.from('hides').delete().eq('id', f.id)
    if (r.error) return setError(r.error.message)
    setF(null); recargar()
  }

  const paradasRuta = paradas.filter(p => p.ruta_id === f?.ruta_id)
  const nombreRuta = id => rutas.find(r => r.id === id)?.nombre
  const nombreParada = id => paradas.find(p => p.id === id)?.nombre

  return (
    <div className="adm-split">
      <div className="adm-lado">
        <div className="flex items-center justify-between">
          <h3 className="adm-h">Hide</h3>
          <button className="btn-rojo" onClick={() => { setF({ ...vacio }); setSugerido(null) }}><i className="fa fa-plus"></i> Nuevo</button>
        </div>
        <div className="space-y-1 mb-3">
          {hides.map(h => (
            <button key={h.id} onClick={() => editar(h)} className={'adm-fila ' + (f?.id === h.id ? 'activa' : '')}>
              <span className="hide-mini-mirador" aria-hidden="true"><i className="fa fa-binoculars"></i></span>
              <span className="flex-1 text-left">{h.nombre}<small className="block text-gray-500">{[nombreRuta(h.ruta_id), nombreParada(h.parada_id)].filter(Boolean).join(' · ') || 'Sin ruta'}</small></span>
            </button>
          ))}
        </div>
        {f && (
          <form className="adm-caja" onSubmit={guardar}>
            <b className="text-sm">{f.id ? 'Editar Hide' : 'Nuevo Hide'}</b>
            <p className="text-xs text-gray-500 mb-2">Haz clic en el mapa, arrastra el pin o escribe las coordenadas.</p>
            <input className="campo" placeholder="Nombre" value={f.nombre} onChange={set('nombre')} required />
            <textarea className="campo" rows={2} placeholder="Descripción" value={f.descripcion} onChange={set('descripcion')} />
            <div className="flex gap-1">
              <input className="campo" placeholder="Latitud" value={f.latitud} onChange={cambioCoord('latitud')} />
              <input className="campo" placeholder="Longitud" value={f.longitud} onChange={cambioCoord('longitud')} />
            </div>
            {sugerido && (
              <p className="text-xs text-secondary mb-2">
                <i className="fa fa-lightbulb-o"></i> Sugerencia: ruta <b>{nombreRuta(sugerido.parada.ruta_id)}</b>, parada <b>{sugerido.parada.nombre}</b> ({fmtKm(sugerido.d)})
              </p>
            )}
            <select className="campo" value={f.ruta_id} onChange={e => setF({ ...f, ruta_id: e.target.value, parada_id: '' })}>
              <option value="">Sin ruta</option>
              {rutas.map(r => <option key={r.id} value={r.id}>{r.nombre}</option>)}
            </select>
            <select className="campo" value={f.parada_id} onChange={set('parada_id')} disabled={!f.ruta_id}>
              <option value="">Sin parada</option>
              {paradasRuta.map(p => <option key={p.id} value={p.id}>{p.nombre}</option>)}
            </select>
            {error && <p className="text-sm text-red-600 mb-2">{error}</p>}
            <div className="flex gap-2">
              <button className="btn-rojo flex-1">Guardar</button>
              <button type="button" className="btn-sec" onClick={() => setF(null)}>Cancelar</button>
              {f.id && <button type="button" className="btn-sec" onClick={eliminar}><i className="fa fa-trash"></i></button>}
            </div>
          </form>
        )}
      </div>
      <div className="adm-mapa" ref={el}></div>
    </div>
  )
}
