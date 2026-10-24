import { useEffect, useRef, useState } from 'react'
import L from 'leaflet'
import { supabase } from '../lib/supabase'
import { useAuth } from '../hooks/useAuth'
import { CENTRO } from '../hooks/useUbicacion'
import { agregarBuscador, agregarSelectorCapa, capasBase, dibujarRutas, svgPin } from '../components/MapaRutas'
import { distanciaKm, fmtKm, pos as pt, segmentosRuta } from '../lib/geo'

const COLORES = ['#2E86AB', '#D32F2F', '#1B5E20', '#F59E0B', '#7B1FA2', '#0F766E', '#DB2777']

export default function AdminRutas({ datos }) {
  const { perfil } = useAuth()
  const { rutas, paradas, enlaces, recargar } = datos
  const [selId, setSelId] = useState(null)
  const [modo, setModo] = useState('ver') // ver | agregar | enlazar
  const [origen, setOrigen] = useState(null)
  const [nueva, setNueva] = useState({ nombre: '', color: COLORES[0] })
  const [error, setError] = useState(null)

  const el = useRef(null)
  const mapa = useRef(null)
  const capa = useRef(null)
  const edit = useRef(null)
  const estado = useRef({})
  const ajustado = useRef(false)

  const sel = rutas.find(r => r.id === selId) || null
  const { paradas: ps, segs } = sel ? segmentosRuta(sel, paradas, enlaces) : { paradas: [], segs: [] }
  estado.current = { sel, modo, origen, ps, datos }

  const fallo = r => { if (r.error) setError(r.error.message); else setError(null); return r }

  useEffect(() => {
    const m = L.map(el.current).setView(CENTRO, 7)
    const bases = capasBase()
    bases.Híbrido.addTo(m)
    agregarBuscador(m)
    agregarSelectorCapa(m, bases)
    capa.current = L.layerGroup().addTo(m)
    edit.current = L.layerGroup().addTo(m)
    mapa.current = m
    m.on('click', async e => {
      const { sel: s, modo: md, ps: lista } = estado.current
      if (md !== 'agregar' || !s) return
      const orden = lista.length ? Math.max(...lista.map(p => p.orden)) + 1 : 1
      const r = await supabase.from('paradas').insert({
        ruta_id: s.id, nombre: 'Parada ' + (lista.length + 1), latitud: +e.latlng.lat.toFixed(6), longitud: +e.latlng.lng.toFixed(6), orden, color: s.color,
      })
      if (r.error) setError(r.error.message); else recargar()
    })
    return () => { m.remove(); mapa.current = null }
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [])

  useEffect(() => {
    const m = mapa.current
    dibujarRutas(capa.current, datos, { verDist: true, sinParadas: new Set(selId ? [selId] : []) })
    edit.current.clearLayers()
    ps.forEach((p, i) => {
      const mk = L.marker(pt(p), { icon: svgPin(sel.color, i + 1), draggable: true }).addTo(edit.current)
      mk.bindTooltip(p.nombre)
      mk.on('dragend', async () => {
        const ll = mk.getLatLng()
        fallo(await supabase.from('paradas').update({ latitud: +ll.lat.toFixed(6), longitud: +ll.lng.toFixed(6), actualizado_en: new Date().toISOString() }).eq('id', p.id))
        recargar()
      })
      mk.on('click', async () => {
        const { modo: md, origen: o } = estado.current
        if (md !== 'enlazar') return
        if (!o) { setOrigen(p); return }
        if (o.id !== p.id) {
          fallo(await supabase.from('rutas_enlaces').insert({ ruta_id: sel.id, desde_parada: o.id, hasta_parada: p.id }))
          recargar()
        }
        setOrigen(null)
      })
    })
    if (!ajustado.current && paradas.length) {
      m.fitBounds(L.latLngBounds(paradas.map(pt)), { padding: [50, 50], animate: false })
      ajustado.current = true
    }
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [datos, selId, origen])

  useEffect(() => { mapa.current.getContainer().style.cursor = modo === 'agregar' ? 'crosshair' : '' }, [modo])
  useEffect(() => { setTimeout(() => mapa.current?.invalidateSize(), 50) }, [])

  const crearRuta = async e => {
    e.preventDefault()
    const r = fallo(await supabase.from('rutas').insert({ nombre: nueva.nombre, color: nueva.color, creado_por: perfil.id }).select().single())
    if (!r.error) { setNueva({ nombre: '', color: COLORES[(rutas.length + 1) % COLORES.length] }); await recargar(); setSelId(r.data.id); setModo('agregar') }
  }

  const actualizarRuta = async cambios => {
    fallo(await supabase.from('rutas').update({ ...cambios, actualizado_en: new Date().toISOString() }).eq('id', sel.id))
    if (cambios.color) await supabase.from('paradas').update({ color: cambios.color }).eq('ruta_id', sel.id) // las paradas se tiñen del color de la ruta
    recargar()
  }

  const eliminarRuta = async () => {
    if (!confirm(`¿Eliminar la ruta "${sel.nombre}" con sus paradas?`)) return
    fallo(await supabase.from('rutas').delete().eq('id', sel.id)); setSelId(null); recargar()
  }

  const actualizarParada = async (p, c) => { fallo(await supabase.from('paradas').update({ ...c, actualizado_en: new Date().toISOString() }).eq('id', p.id)); recargar() }
  const eliminarParada = async p => { if (confirm(`¿Eliminar "${p.nombre}"?`)) { fallo(await supabase.from('paradas').delete().eq('id', p.id)); recargar() } }
  const mover = async (i, d) => {
    const a = ps[i], b = ps[i + d]
    if (!b) return
    await Promise.all([supabase.from('paradas').update({ orden: b.orden }).eq('id', a.id), supabase.from('paradas').update({ orden: a.orden }).eq('id', b.id)])
    recargar()
  }
  const quitarEnlace = async id => { await supabase.from('rutas_enlaces').delete().eq('id', id); recargar() }

  const total = segs.reduce((s, [a, b]) => s + distanciaKm(pt(a), pt(b)), 0)

  return (
    <div className="adm-split">
      <div className="adm-lado">
        <h3 className="adm-h">Rutas</h3>
        <form onSubmit={crearRuta} className="adm-caja">
          <b className="text-sm">Nueva ruta</b>
          <input className="campo" placeholder="Nombre de la ruta" value={nueva.nombre} onChange={e => setNueva({ ...nueva, nombre: e.target.value })} required />
          <div className="flex items-center gap-2 mb-2">
            <input type="color" value={nueva.color} onChange={e => setNueva({ ...nueva, color: e.target.value })} />
            <button className="btn-rojo flex-1">Crear ruta</button>
          </div>
        </form>
        <div className="space-y-1 mb-3">
          {rutas.map(r => (
            <button key={r.id} onClick={() => { setSelId(r.id); setModo('ver') }} className={'adm-fila ' + (r.id === selId ? 'activa' : '')}>
              <i className="leyenda-color" style={{ background: r.color }}></i>
              <span className="flex-1 text-left">{r.nombre}</span>
              <small>{paradas.filter(p => p.ruta_id === r.id).length} paradas</small>
            </button>
          ))}
        </div>
        <p className="text-xs text-gray-500">Paradas totales: <b>{paradas.length}</b></p>
        {error && <p className="text-sm text-red-600 mt-2">{error}</p>}

        {sel && (
          <div className="adm-caja mt-3">
            <div className="flex gap-2 items-center mb-2">
              <input className="campo mb-0 flex-1" defaultValue={sel.nombre} key={sel.id + 'n'} onBlur={e => e.target.value !== sel.nombre && actualizarRuta({ nombre: e.target.value })} />
              <input type="color" value={sel.color} onChange={e => actualizarRuta({ color: e.target.value })} title="Color de la ruta y sus paradas" />
              <button className="btn-sec" onClick={eliminarRuta} title="Eliminar ruta"><i className="fa fa-trash"></i></button>
            </div>
            <div className="flex gap-1 mb-2 text-xs">
              {[['ver', 'Ver'], ['agregar', 'Agregar paradas'], ['enlazar', 'Enlazar']].map(([k, t]) => (
                <button key={k} className={'adm-tab ' + (modo === k ? 'activa' : '')} onClick={() => { setModo(k); setOrigen(null) }}>{t}</button>
              ))}
            </div>
            <p className="text-xs text-gray-500 mb-2">
              {modo === 'agregar' && 'Haz clic en el mapa para crear una parada. Arrastra los pines para moverlas.'}
              {modo === 'enlazar' && (origen ? `Origen: ${origen.nombre}. Elige la parada destino.` : 'Elige una parada de origen y luego otra de destino (ej. C → A).')}
              {modo === 'ver' && 'Arrastra los pines para mover paradas, o edita sus coordenadas.'}
            </p>
            <p className="text-xs mb-2">{ps.length} paradas · distancia total {fmtKm(total)}</p>
            {ps.map((p, i) => (
              <div key={p.id} className="adm-parada">
                <b style={{ color: sel.color }}>{i + 1}</b>
                <div className="flex-1">
                  <input className="campo mb-1" defaultValue={p.nombre} key={p.id + p.nombre} onBlur={e => e.target.value !== p.nombre && actualizarParada(p, { nombre: e.target.value })} />
                  <div className="flex gap-1">
                    <input className="campo mb-0" defaultValue={p.latitud} key={p.id + 'la' + p.latitud} onBlur={e => +e.target.value !== p.latitud && !isNaN(+e.target.value) && actualizarParada(p, { latitud: +e.target.value })} />
                    <input className="campo mb-0" defaultValue={p.longitud} key={p.id + 'lo' + p.longitud} onBlur={e => +e.target.value !== p.longitud && !isNaN(+e.target.value) && actualizarParada(p, { longitud: +e.target.value })} />
                  </div>
                  <input className="campo mt-1 mb-0" placeholder="Descripción" defaultValue={p.descripcion || ''} key={p.id + 'd' + p.descripcion} onBlur={e => e.target.value !== (p.descripcion || '') && actualizarParada(p, { descripcion: e.target.value })} />
                </div>
                <div className="flex flex-col gap-1">
                  <button onClick={() => mover(i, -1)} disabled={i === 0}>▲</button>
                  <button onClick={() => mover(i, 1)} disabled={i === ps.length - 1}>▼</button>
                  <button onClick={() => eliminarParada(p)} className="text-primary"><i className="fa fa-trash"></i></button>
                </div>
              </div>
            ))}
            {segs.filter(s => s[2]).length > 0 && <b className="text-xs">Enlaces adicionales</b>}
            {segs.filter(s => s[2]).map(([a, b, id]) => (
              <div key={id} className="flex justify-between text-sm py-1">
                <span>{a.nombre} → {b.nombre} ({fmtKm(distanciaKm(pt(a), pt(b)))})</span>
                <button onClick={() => quitarEnlace(id)} className="text-primary"><i className="fa fa-times"></i></button>
              </div>
            ))}
          </div>
        )}
      </div>
      <div className="adm-mapa" ref={el}></div>
    </div>
  )
}
