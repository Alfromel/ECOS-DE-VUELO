import { useCallback, useEffect, useState } from 'react'
import { supabase } from '../lib/supabase'
import { useAuth } from '../hooks/useAuth'
import AvistamientoModal from './AvistamientoModal'

const ETQ = { pendiente: ['bg-yellow-100 text-yellow-800', 'Pendiente de revisión'], aprobado: ['bg-green-100 text-green-800', 'Aprobado'], rechazado: ['bg-red-100 text-red-700', 'Rechazado'] }

// Observatorio de madera: techo, listones, ventana al bosque, puertas que se abren y ventanitas
function CasaHide({ num }) {
  return (
    <span className="obs-casa" aria-hidden="true">
      <span className="obs-techo"></span>
      <span className="obs-cuerpo">
        <span className="obs-ventana"></span>
        <span className="obs-puerta izq"></span>
        <span className="obs-puerta der"></span>
        <span className="obs-vent-peq"><i></i><i></i><i></i></span>
      </span>
      {num !== undefined && <b className="obs-num">{num}</b>}
    </span>
  )
}

export default function HideCard({ activa, datos }) {
  const { perfil, rol, puede } = useAuth()
  const [avist, setAvist] = useState([])
  const [modal, setModal] = useState(false)
  const [hideElegido, setHideElegido] = useState('')
  const puedeAvistar = rol === 'turista' && puede('crear_avistamiento') !== false

  const [autores, setAutores] = useState({})
  const cargar = useCallback(async () => {
    if (rol !== 'turista') return
    const { data } = await supabase.from('avistamientos').select('*').order('creado_en', { ascending: false }).limit(60)
    setAvist(data || [])
    const ids = [...new Set((data || []).map(a => a.usuario_id))]
    if (ids.length) {
      const { data: perfiles } = await supabase.from('profiles').select('id, nombre_completo').in('id', ids)
      setAutores(Object.fromEntries((perfiles || []).map(p => [p.id, p.nombre_completo])))
    }
  }, [rol])
  useEffect(() => { cargar() }, [cargar])

  const hides = (datos?.hides || []).map(h => ({ id: h.id, nombre: h.nombre, dms: h.descripcion, pos: [h.latitud, h.longitud] }))
  const avistar = id => { setHideElegido(id); setModal(true) }
  const nombreHide = id => datos?.hides?.find(h => h.id === id)?.nombre
  const nombreRuta = id => datos?.rutas?.find(r => r.id === id)?.nombre
  const [abierto, setAbierto] = useState(null)
  const visibles = avist.filter(a => a.estado === 'aprobado' || a.usuario_id === perfil?.id)
  const deHide = id => visibles.filter(a => a.hide_id === id)
  const hideAbierto = hides.find(h => h.id === abierto)
  const autorDe = a => (a.usuario_id === perfil?.id ? (perfil?.nombre_completo || 'Tú') + ' (tú)' : autores[a.usuario_id] || 'Turista')

  const tarjeta = (a, propio) => (
    <div className="border rounded-lg p-3 text-sm" key={a.id}>
      <div className="flex justify-between gap-2">
        <b>{a.especie}</b>
        {propio && <span className={'text-xs px-2 py-0.5 rounded-full ' + ETQ[a.estado][0]}>{ETQ[a.estado][1]}</span>}
      </div>
      <small className="text-primary block"><i className="fa fa-user"></i> {autorDe(a)}</small>
      <small className="text-gray-500 block">
        {[nombreHide(a.hide_id), nombreRuta(a.ruta_id)].filter(Boolean).join(' · ') || 'Sin ubicación'} · {new Date(a.creado_en).toLocaleDateString()}
      </small>
      {a.descripcion && <p className="text-gray-600 mt-1">{a.descripcion}</p>}
      {a.comentario_admin && <p className="text-xs text-primary mt-1">Admin: {a.comentario_admin}</p>}
      {a.fotos?.length > 0 && <div className="flex gap-1 mt-2">{a.fotos.map(u => <a key={u} href={u} target="_blank" rel="noreferrer"><img src={u} alt="" className="w-16 h-16 object-cover rounded" /></a>)}</div>}
    </div>
  )

  return (
    <div className={'bg-white rounded-xl shadow-md p-5 hide-modulo' + (activa ? '' : ' vista-oculta')} id="hide" data-vista="hide">
      <a href="#mapa" className="hide-ver-mapa" title="Ver todos en el mapa" aria-label="Ver todos en el mapa"><i className="fa fa-map" aria-hidden="true"></i></a>
      <h3 className="font-bold text-lg mb-1"><i className="fa fa-eye text-primary"></i> Hide · Miradores de observación</h3>
      <p className="text-gray-500 text-sm mb-4">Escondites para observar a la Paraba Frente Roja sin molestarla.</p>
      {!hides.length && <p className="text-sm text-gray-400 mb-2">Aún no hay Hides registrados.</p>}
      <div className="hide-lista hide-cuadros">
        {hides.map((h, i) => {
          const lista = deHide(h.id)
          return (
            <button type="button" className="obs-cuadro" key={h.id} onClick={() => setAbierto(h.id)}>
              <CasaHide num={i + 1} />
              <strong>{h.nombre}</strong>
              <small>{h.dms}</small>
              {rol === 'turista' && <em><i className="fa fa-eye"></i> {lista.length} {lista.length === 1 ? 'avistamiento' : 'avistamientos'}</em>}
            </button>
          )
        })}
      </div>

      {hideAbierto && (
        <div className="modal-fondo" onMouseDown={e => e.target === e.currentTarget && setAbierto(null)}>
          <div className="modal-caja hide-detalle">
            <button type="button" className="modal-x" onClick={() => setAbierto(null)}>×</button>
            <div className="hide-detalle-cab">
              <span className="obs-detalle"><CasaHide /></span>
              <div><h3 className="font-bold text-lg">{hideAbierto.nombre}</h3><small className="text-gray-500">{hideAbierto.dms}</small></div>
            </div>
            <div className="hide-acciones">
              {puedeAvistar && <button type="button" onClick={() => { setAbierto(null); avistar(hideAbierto.id) }}><i className="fa fa-plus"></i> Hacer avistamiento</button>}
            </div>
            {rol === 'turista' && (
              <>
                <h4 className="font-bold mt-4 mb-2">Avistamientos en este Hide</h4>
                <div className="space-y-2">
                  {deHide(hideAbierto.id).length
                    ? deHide(hideAbierto.id).map(a => tarjeta(a, a.usuario_id === perfil?.id))
                    : <p className="text-sm text-gray-400">Aún no hay avistamientos aprobados aquí.</p>}
                </div>
              </>
            )}
          </div>
        </div>
      )}
      {modal && <AvistamientoModal datos={datos} hideInicial={hideElegido} onCerrar={() => setModal(false)} onCreado={() => { setModal(false); cargar() }} />}
    </div>
  )
}



