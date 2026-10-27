import { useEffect, useRef, useState } from 'react'
import L from 'leaflet'
import { supabase } from '../lib/supabase'
import { useAuth } from '../hooks/useAuth'
import { CENTRO } from '../hooks/useUbicacion'
import { agregarBuscador, agregarSelectorCapa, capasBase, dibujarRutas, svgPin } from '../components/MapaRutas'
import { coordenadasTramo, distanciaTramoKm, fmtKm, pos as pt, segmentosRuta } from '../lib/geo'
import { eliminarFormasLocales, guardarFormaTramo, leerFormasLocales } from '../lib/formaTramos'
import { agregarControlRotacion, opcionesRotacionAdmin } from '../lib/rotacionMapa'
import { leerCoordenadas } from '../lib/coordenadas'

const COLORES = ['#2E86AB', '#D32F2F', '#1B5E20', '#F59E0B', '#7B1FA2', '#0F766E', '#DB2777']

export default function AdminRutas({ datos }) {
  const { perfil, rol } = useAuth()
  const { rutas, paradas, enlaces, recargar } = datos
  const [selId, setSelId] = useState(null)
  const [modo, setModo] = useState('ver') // ver | agregar | enlazar
  const [origen, setOrigen] = useState(null)
  const [nueva, setNueva] = useState({ nombre: '', color: COLORES[0] })
  const [error, setError] = useState(null)
  const [abiertoRutas, setAbiertoRutas] = useState(true)
  const [abiertoParadas, setAbiertoParadas] = useState(true)
  const [paradaPendiente, setParadaPendiente] = useState(null)
  const [guardandoParada, setGuardandoParada] = useState(false)
  const [ocupado, setOcupado] = useState(null)
  const [coord, setCoord] = useState('')
  const [lineaSel, setLineaSel] = useState(null)
  const [vForma, setVForma] = useState(0)

  const el = useRef(null)
  const mapa = useRef(null)
  const capa = useRef(null)
  const edit = useRef(null)
  const estado = useRef({})
  const ajustado = useRef(false)
  const migracionFormasHecha = useRef(false)

  const sel = rutas.find(r => r.id === selId) || null
  const { paradas: ps, segs } = sel ? segmentosRuta(sel, paradas, enlaces) : { paradas: [], segs: [] }

  useEffect(() => {
    estado.current = { sel, modo, origen, ps, datos }
  }, [sel, modo, origen, ps, datos])

  const fallo = r => { if (r.error) setError(r.error.message); else setError(null); return r }

  const guardarForma = async (rutaId, a, b, forma) => {
    const r = fallo(await guardarFormaTramo(rutaId, a.id, b.id, forma))
    if (!r.error) {
      await recargar()
      setVForma(v => v + 1)
    }
  }

  useEffect(() => {
    if (rol !== 'admin' || !rutas.length || migracionFormasHecha.current) return
    migracionFormasHecha.current = true
    const locales = leerFormasLocales()
    const pendientes = Object.entries(locales)
    if (!pendientes.length) return

    const migrar = async () => {
      const migradas = []
      for (const [clave, forma] of pendientes) {
        const [rutaId, desdeId, hastaId] = clave.split(':')
        if (!rutaId || !desdeId || !hastaId) {
          setError('No se pudo migrar una deformación local porque su identificador no es válido.')
          return
        }
        const ruta = rutas.find(r => String(r.id) === rutaId)
        if (!ruta || ruta.formas_tramos?.[clave]) {
          migradas.push(clave)
          continue
        }
        const r = fallo(await guardarFormaTramo(rutaId, desdeId, hastaId, forma))
        if (r.error) return
        migradas.push(clave)
      }
      eliminarFormasLocales(migradas)
      await recargar()
    }
    migrar()
  }, [rol, rutas, recargar])

  useEffect(() => {
    const m = L.map(el.current, { zoomControl: false, ...opcionesRotacionAdmin }).setView(CENTRO, 7)
    const bases = capasBase()
    bases.Híbrido.addTo(m)
    agregarBuscador(m)
    agregarSelectorCapa(m, bases)
    agregarControlRotacion(m)
    capa.current = L.layerGroup().addTo(m)
    edit.current = L.layerGroup().addTo(m)
    mapa.current = m
    m.on('click', e => {
      const { sel: s, modo: md, ps: lista } = estado.current
      if (md !== 'agregar' || !s) return
      const latitud = +e.latlng.lat.toFixed(6)
      const longitud = +e.latlng.lng.toFixed(6)
      const orden = lista.length ? Math.max(...lista.map(p => p.orden)) + 1 : 1
      setError(null)
      setParadaPendiente({
        rutaId: s.id,
        nombre: 'Parada ' + lista.length,
        latitud,
        longitud,
        orden,
        color: s.color,
      })
    })
    return () => { m.remove(); mapa.current = null }
  }, [])

  useEffect(() => {
    const m = mapa.current
    dibujarRutas(capa.current, datos, { verDist: true, sinParadas: new Set(selId ? [selId] : []) })
    edit.current.clearLayers()
    ps.forEach((p, i) => {
      const mk = L.marker(pt(p), { icon: svgPin(sel.color, i), draggable: true }).addTo(edit.current)
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
          const actual = estado.current.sel
          fallo(await supabase.from('rutas_enlaces').insert({ ruta_id: actual.id, desde_parada: o.id, hasta_parada: p.id }))
          recargar()
        }
        setOrigen(null)
      })
    })
    if (sel && modo === 'deformar') {
      const icono = (cls, color) => L.divIcon({ className: cls, html: `<span style="--c:${color}"></span>`, iconSize: [26, 26] })
      segs.forEach(([a, b, , forma]) => {
        const clave = a.id + ':' + b.id
        const activa = lineaSel === clave
        const medios = forma?.puntos || []
        const curva = forma ? forma.curva !== false : true
        const cs = [pt(a), ...medios, pt(b)]
        const vista = L.polyline(coordenadasTramo(a, b, forma), { color: sel.color, weight: activa ? 9 : 6, opacity: 1, lineCap: 'round', lineJoin: 'round', className: activa ? 'adm-linea-activa' : '' }).addTo(edit.current)
        const previa = pts => vista.setLatLngs(coordenadasTramo(a, b, { puntos: pts, curva }))
        const toque = L.polyline(cs, { color: '#000', weight: 26, opacity: 0, lineCap: 'round' }).addTo(edit.current)
        toque.on('click', ev => { L.DomEvent.stopPropagation(ev); setLineaSel(clave) })
        const redondear = ll => [+ll.lat.toFixed(6), +ll.lng.toFixed(6)]
        medios.forEach((p, i) => {
          const v = L.marker(p, { draggable: true, icon: icono('adm-vertice', sel.color), zIndexOffset: 500 }).addTo(edit.current)
          v.bindTooltip('Arrastra para mover · toca para quitar', { direction: 'top', offset: [0, -10] })
          v.on('drag', () => previa(medios.map((q, j) => j === i ? redondear(v.getLatLng()) : q)))
          v.on('dragend', () => guardarForma(sel.id, a, b, { puntos: medios.map((q, j) => j === i ? redondear(v.getLatLng()) : q), curva }))
          v.on('click', () => { setLineaSel(clave); guardarForma(sel.id, a, b, { puntos: medios.filter((_, j) => j !== i), curva }) })
        })
        cs.slice(0, -1).forEach((p, i) => {
          const q = cs[i + 1]
          const h = L.marker([(p[0] + q[0]) / 2, (p[1] + q[1]) / 2], { draggable: true, icon: icono('adm-asa', sel.color), zIndexOffset: 400 }).addTo(edit.current)
          h.bindTooltip('Arrastra para deformar', { direction: 'top', offset: [0, -10] })
          h.on('dragstart', () => setLineaSel(clave))
          h.on('drag', () => previa([...medios.slice(0, i), redondear(h.getLatLng()), ...medios.slice(i)]))
          h.on('dragend', () => guardarForma(sel.id, a, b, { puntos: [...medios.slice(0, i), redondear(h.getLatLng()), ...medios.slice(i)], curva }))
        })
      })
    }
    if (!ajustado.current && paradas.length) {
      if (paradas.length > 1) m.fitBounds(L.latLngBounds(paradas.map(pt)), { padding: [50, 50], animate: false })
      ajustado.current = true
    }
  // eslint-disable-next-line react-hooks/exhaustive-deps
  },   [datos, selId, origen, modo, lineaSel, vForma])

    useEffect(() => { mapa.current.getContainer().style.cursor = modo === 'agregar' ? 'crosshair' : '' }, [modo])
  useEffect(() => {
    const m = mapa.current
    const ro = new ResizeObserver(() => m.invalidateSize())
    ro.observe(m.getContainer())
    return () => ro.disconnect()
  }, [])
  useEffect(() => {
    const m = mapa.current
    if (!m || !selId) return
    const puntos = paradas.filter(p => p.ruta_id === selId).map(pt)
    if (puntos.length < 2) return
    setTimeout(() => {
      m.invalidateSize()
      m.fitBounds(L.latLngBounds(puntos), { padding: [50, 50], maxZoom: 13 })
    }, 80)
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [selId, abiertoParadas, abiertoRutas])
  useEffect(() => { setTimeout(() => mapa.current?.invalidateSize(), 50) }, [abiertoRutas, abiertoParadas, selId])

  const crearRuta = async e => {
    e.preventDefault()
    if (ocupado) return
    setOcupado('crear')
    const r = fallo(await supabase.from('rutas').insert({ nombre: nueva.nombre, color: nueva.color, creado_por: perfil.id }).select().single())
    if (!r.error) { setNueva({ nombre: '', color: COLORES[(rutas.length + 1) % COLORES.length] }); await recargar(); setSelId(r.data.id); setModo('agregar') }
    setOcupado(null)
  }

  const actualizarRuta = async cambios => {
    fallo(await supabase.from('rutas').update({ ...cambios, actualizado_en: new Date().toISOString() }).eq('id', sel.id))
    if (cambios.color) await supabase.from('paradas').update({ color: cambios.color }).eq('ruta_id', sel.id) // las paradas se tiñen del color de la ruta
    recargar()
  }

  const eliminarRuta = async () => {
    if (ocupado || !confirm(`¿Eliminar la ruta "${sel.nombre}" con sus paradas?`)) return
    setOcupado('eliminar')
    fallo(await supabase.from('rutas').delete().eq('id', sel.id)); setSelId(null); await recargar()
    setOcupado(null)
  }

  const actualizarParada = async (p, c) => { fallo(await supabase.from('paradas').update({ ...c, actualizado_en: new Date().toISOString() }).eq('id', p.id)); recargar() }
  const eliminarParada = async p => {
    if (ocupado || !confirm(`¿Eliminar "${p.nombre}"?`)) return
    setOcupado('p' + p.id)
    fallo(await supabase.from('paradas').delete().eq('id', p.id)); await recargar()
    setOcupado(null)
  }
  const mover = async (i, d) => {
    const a = ps[i], b = ps[i + d]
    if (!b || ocupado) return
    setOcupado('mover')
    await Promise.all([supabase.from('paradas').update({ orden: b.orden }).eq('id', a.id), supabase.from('paradas').update({ orden: a.orden }).eq('id', b.id)])
    await recargar()
    setOcupado(null)
  }
  const quitarEnlace = async id => {
    if (ocupado) return
    setOcupado('enlace')
    fallo(await supabase.from('rutas_enlaces').delete().eq('id', id))
    await recargar()
    setOcupado(null)
  }

  const segSel = segs.find(([a, b]) => a.id + ':' + b.id === lineaSel)
  const formaSel = segSel?.[3]
  const estiloSel = formaSel && formaSel.curva === false ? 'esquina' : 'curva'
  const cambiarEstilo = curva => {
    if (!segSel) return
    guardarForma(sel.id, segSel[0], segSel[1], { puntos: formaSel?.puntos || [], curva })
  }
  const dejarRecta = () => {
    if (segSel) guardarForma(sel.id, segSel[0], segSel[1], null)
  }

  const confirmarParada = async () => {
    if (!paradaPendiente || guardandoParada) return
    setGuardandoParada(true)
    const r = fallo(await supabase.from('paradas').insert({
      ruta_id: paradaPendiente.rutaId,
      nombre: paradaPendiente.nombre,
      latitud: paradaPendiente.latitud,
      longitud: paradaPendiente.longitud,
      orden: paradaPendiente.orden,
      color: paradaPendiente.color,
    }))
    setGuardandoParada(false)
    if (r.error) return
    setParadaPendiente(null)
    await recargar()
  }

  const total = segs.reduce((s, [a, b, , forma]) => s + distanciaTramoKm(a, b, forma), 0)

  return (
    <div className="adm-split">
      <div className="adm-lado">
        <div className="adm-rutas-titulo">
          <h3 className="adm-h">Rutas y paradas</h3>
          <p>Organiza recorridos y edita sus puntos en el mapa.</p>
        </div>
        <section className="adm-rutas-bloque">
          <button type="button" className="adm-rutas-seccion-titulo adm-desplegable" aria-expanded={abiertoRutas} onClick={() => setAbiertoRutas(v => !v)}>
            <span className="adm-rutas-numero">1</span>
            <div><h4>Rutas</h4><small>{rutas.length} recorridos disponibles</small></div>
            <i className={'fa fa-chevron-down adm-flecha ' + (abiertoRutas ? 'abierta' : '')} aria-hidden="true"></i>
          </button>
          {abiertoRutas && <>
          <form onSubmit={crearRuta} className="adm-caja adm-ruta-nueva">
            <b className="text-sm">Crear una ruta</b>
            <input className="campo" placeholder="Nombre de la ruta" value={nueva.nombre} onChange={e => setNueva({ ...nueva, nombre: e.target.value })} required />
            <div className="flex items-center gap-2 mb-2">
              <input type="color" value={nueva.color} onChange={e => setNueva({ ...nueva, color: e.target.value })} aria-label="Color de la ruta" />
              <button className="btn-rojo flex-1" disabled={!!ocupado}>{ocupado === 'crear' ? <><i className="fa fa-spinner fa-spin"></i> Creando…</> : 'Crear ruta'}</button>
            </div>
          </form>
          <div className="adm-rutas-lista">
            {rutas.map(r => (
              <button key={r.id} onClick={() => { setSelId(r.id); setModo('ver'); setParadaPendiente(null) }} className={'adm-fila ' + (r.id === selId ? 'activa' : '')}>
                <i className="leyenda-color" style={{ background: r.color }}></i>
                <span className="flex-1 text-left">{r.nombre}</span>
                <small>{paradas.filter(p => p.ruta_id === r.id).length} paradas</small>
              </button>
            ))}
            {!rutas.length && <p className="adm-rutas-vacio">Todavía no hay rutas creadas.</p>}
          </div>
          <p className="adm-rutas-total">Paradas en total <b>{paradas.length}</b></p>
                    </>}
                  </section>
        {error && <p className="text-sm text-red-600 mt-2">{error}</p>}

        {sel && (
          <section className="adm-rutas-bloque adm-paradas-bloque">
            <button type="button" className="adm-rutas-seccion-titulo adm-desplegable" aria-expanded={abiertoParadas} onClick={() => setAbiertoParadas(v => !v)}>
              <span className="adm-rutas-numero">2</span>
              <div><h4>Paradas</h4><small>Ruta seleccionada: <b>{sel.nombre}</b></small></div>
              <i className={'fa fa-chevron-down adm-flecha ' + (abiertoParadas ? 'abierta' : '')} aria-hidden="true"></i>
            </button>
            {abiertoParadas && <div className="adm-caja">
            <div className="flex gap-2 items-center mb-2">
              <input className="campo mb-0 flex-1" defaultValue={sel.nombre} key={sel.id + 'n'} onBlur={e => e.target.value !== sel.nombre && actualizarRuta({ nombre: e.target.value })} />
              <input type="color" value={sel.color} onChange={e => actualizarRuta({ color: e.target.value })} title="Color de la ruta y sus paradas" />
              <button className="btn-sec" disabled={!!ocupado} onClick={eliminarRuta} title="Eliminar ruta"><i className={ocupado === 'eliminar' ? 'fa fa-spinner fa-spin' : 'fa fa-trash'}></i></button>
            </div>
            <div className="flex gap-1 mb-2 text-xs">
              {[['ver', 'Ver'], ['agregar', 'Agregar'], ['deformar', 'Deformar']].map(([k, t]) => (
                <button key={k} className={'adm-tab ' + (modo === k ? 'activa' : '')} onClick={() => { setModo(k); setOrigen(null); setParadaPendiente(null); setLineaSel(null) }}>{t}</button>
              ))}
            </div>
            <p className="text-xs text-gray-500 mb-2">
              {modo === 'agregar' && 'Toca un punto del mapa o escribe las coordenadas para agregar una parada.'}
              {modo === 'enlazar' && (origen ? `Origen: ${origen.nombre}. Elige la parada destino.` : 'Elige una parada de origen y luego otra de destino (ej. C → A).')}
              {modo === 'deformar' && 'Modo deformar: dobla las líneas con tus dedos.'}
              {modo === 'ver' && 'Arrastra los pines para mover paradas, o edita sus coordenadas.'}
            </p>
            {modo === 'agregar' && (
              <form className="flex gap-2 items-end mb-2" onSubmit={e => {
                e.preventDefault()
                const c = mapa.current.getCenter()
                const ref = ps.length ? { lat: ps[ps.length - 1].latitud, lng: ps[ps.length - 1].longitud } : { lat: c.lat, lng: c.lng }
                const r = leerCoordenadas(coord, ref)
                if (!r) return setError('Coordenadas no válidas. Usa "lat, lng" o un código como V3VR+3QX')
                setError(null)
                setParadaPendiente({ rutaId: sel.id, nombre: 'Parada ' + ps.length, latitud: r.lat, longitud: r.lng, orden: ps.length ? Math.max(...ps.map(p => p.orden)) + 1 : 1, color: sel.color })
                setCoord('')
              }}>
                <label className="flex-1"><small>Coordenadas o código Plus</small>
                  <input className="campo mb-0" placeholder="-18.106872, -64.916535  ó  V3VR+3QX" value={coord} onChange={e => setCoord(e.target.value)} required /></label>
                <button className="btn-rojo">Agregar</button>
              </form>
            )}
            <p className="text-xs mb-2">{ps.length} paradas · distancia total {fmtKm(total)}</p>
            {modo === 'deformar' && (
              <div className="adm-deformar">
                {segSel ? (
                  <>
                    <b>{segSel[0].nombre} → {segSel[1].nombre}</b>
                    <div className="adm-deformar-chips">
                      <button type="button" className={estiloSel === 'curva' ? 'activa' : ''} onClick={() => cambiarEstilo(true)}><i className="fa fa-share" aria-hidden="true"></i> Curva</button>
                      <button type="button" className={estiloSel === 'esquina' ? 'activa' : ''} onClick={() => cambiarEstilo(false)}><i className="fa fa-location-arrow" aria-hidden="true"></i> Esquina</button>
                      <button type="button" disabled={!formaSel?.puntos?.length} onClick={dejarRecta}><i className="fa fa-minus" aria-hidden="true"></i> Recta</button>
                    </div>
                  </>
                ) : <span>Toca una línea para elegirla.</span>}
                <small>Arrastra el círculo del medio de una línea para doblarla. Toca un punto para quitarlo.</small>
              </div>
            )}
            {ps.map((p, i) => (
              <div key={p.id} className="adm-parada">
                <b style={{ color: sel.color }}>{i}</b>
                <div className="flex-1">
                  <input className="campo mb-1" defaultValue={p.nombre} key={p.id + p.nombre} onBlur={e => e.target.value !== p.nombre && actualizarParada(p, { nombre: e.target.value })} />
                  <div className="adm-coordenadas">
                    <label><small>Latitud</small>
                    <input className="campo mb-0" defaultValue={p.latitud} key={p.id + 'la' + p.latitud} onBlur={e => +e.target.value !== p.latitud && !isNaN(+e.target.value) && actualizarParada(p, { latitud: +e.target.value })} />
                    </label>
                    <label><small>Longitud</small>
                    <input className="campo mb-0" defaultValue={p.longitud} key={p.id + 'lo' + p.longitud} onBlur={e => +e.target.value !== p.longitud && !isNaN(+e.target.value) && actualizarParada(p, { longitud: +e.target.value })} />
                    </label>
                  </div>
                  <input className="campo mt-1 mb-0" placeholder="Descripción" defaultValue={p.descripcion || ''} key={p.id + 'd' + p.descripcion} onBlur={e => e.target.value !== (p.descripcion || '') && actualizarParada(p, { descripcion: e.target.value })} />
                </div>
                <div className="flex flex-col gap-1">
                  <button onClick={() => mover(i, -1)} disabled={i === 0 || !!ocupado}>▲</button>
                  <button onClick={() => mover(i, 1)} disabled={i === ps.length - 1 || !!ocupado}>▼</button>
                  <button onClick={() => eliminarParada(p)} disabled={!!ocupado} className="text-primary"><i className={ocupado === 'p' + p.id ? 'fa fa-spinner fa-spin' : 'fa fa-trash'}></i></button>
                </div>
              </div>
            ))}
            {segs.filter(s => s[2]).length > 0 && <b className="text-xs">Enlaces adicionales</b>}
            {segs.filter(s => s[2]).map(([a, b, id, forma]) => (
              <div key={id} className="adm-enlace-adicional">
                <span>{a.nombre} → {b.nombre} ({fmtKm(distanciaTramoKm(a, b, forma))})</span>
                <button type="button" onClick={() => quitarEnlace(id)} className="text-primary" title="Quitar enlace"><i className="fa fa-unlink" aria-hidden="true"></i></button>
              </div>
            ))}
            </div>}
          </section>
        )}
      </div>
      <div className="adm-mapa-wrap">
        <div className="adm-mapa" ref={el}></div>
        {paradaPendiente && (
          <div className="adm-parada-dialogo-fondo" onClick={() => !guardandoParada && setParadaPendiente(null)}>
            <section
              className="adm-parada-dialogo"
              role="dialog"
              aria-modal="true"
              aria-labelledby="adm-parada-dialogo-titulo"
              onClick={e => e.stopPropagation()}
            >
              <div className="adm-parada-dialogo-icono"><i className="fa fa-map-marker" aria-hidden="true"></i></div>
              <div className="adm-parada-dialogo-contenido">
                <h3 id="adm-parada-dialogo-titulo">¿Deseas agregar una parada aquí?</h3>
                <p>Se añadirá a <b>{sel?.nombre}</b> en esta ubicación:</p>
                <small>{paradaPendiente.latitud}, {paradaPendiente.longitud}</small>
              </div>
              <div className="adm-parada-dialogo-acciones">
                <button type="button" className="btn-sec" disabled={guardandoParada} onClick={() => setParadaPendiente(null)}>No, cancelar</button>
                <button type="button" className="btn-rojo" disabled={guardandoParada} onClick={confirmarParada}>
                  {guardandoParada ? <><i className="fa fa-spinner fa-spin"></i> Agregando…</> : 'Sí, agregar'}
                </button>
              </div>
            </section>
          </div>
        )}
      </div>
    </div>
  )
}
