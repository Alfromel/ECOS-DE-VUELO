import { useCallback, useEffect, useState } from 'react'
import { urlRuta } from '../data/hides'
import { supabase } from '../lib/supabase'
import { useAuth } from '../hooks/useAuth'
import AvistamientoModal from './AvistamientoModal'

const ETQ = { pendiente: ['bg-yellow-100 text-yellow-800', 'Pendiente de revisión'], aprobado: ['bg-green-100 text-green-800', 'Aprobado'], rechazado: ['bg-red-100 text-red-700', 'Rechazado'] }

export default function HideCard({ activa, datos }) {
  const { perfil, rol, puede } = useAuth()
  const [avist, setAvist] = useState([])
  const [modal, setModal] = useState(false)

  const cargar = useCallback(async () => {
    if (rol !== 'turista') return
    const { data } = await supabase.from('avistamientos').select('*').order('creado_en', { ascending: false }).limit(60)
    setAvist(data || [])
  }, [rol])
  useEffect(() => { cargar() }, [cargar])

  const hides = (datos?.hides || []).map(h => ({ id: h.id, nombre: h.nombre, dms: h.descripcion, pos: [h.latitud, h.longitud] }))
  const nombreHide = id => datos?.hides?.find(h => h.id === id)?.nombre
  const nombreRuta = id => datos?.rutas?.find(r => r.id === id)?.nombre
  const mios = avist.filter(a => a.usuario_id === perfil?.id)
  const otros = avist.filter(a => a.usuario_id !== perfil?.id && a.estado === 'aprobado')

  const tarjeta = (a, propio) => (
    <div className="border rounded-lg p-3 text-sm" key={a.id}>
      <div className="flex justify-between gap-2">
        <b>{a.especie}</b>
        {propio && <span className={'text-xs px-2 py-0.5 rounded-full ' + ETQ[a.estado][0]}>{ETQ[a.estado][1]}</span>}
      </div>
      <small className="text-gray-500 block">
        {[nombreHide(a.hide_id), nombreRuta(a.ruta_id)].filter(Boolean).join(' · ') || 'Sin ubicación'} · {new Date(a.creado_en).toLocaleDateString()}
      </small>
      {a.descripcion && <p className="text-gray-600 mt-1">{a.descripcion}</p>}
      {a.comentario_admin && <p className="text-xs text-primary mt-1">Admin: {a.comentario_admin}</p>}
      {a.fotos?.length > 0 && <div className="flex gap-1 mt-2">{a.fotos.map(u => <a key={u} href={u} target="_blank" rel="noreferrer"><img src={u} alt="" className="w-16 h-16 object-cover rounded" /></a>)}</div>}
    </div>
  )

  return (
    <div className={'bg-white rounded-xl shadow-md p-5' + (activa ? '' : ' vista-oculta')} id="hide" data-vista="hide">
      <h3 className="font-bold text-lg mb-1"><i className="fa fa-eye text-primary"></i> Hide · Miradores de observación</h3>
      <p className="text-gray-500 text-sm mb-4">Escondites para observar a la Paraba Frente Roja sin molestarla.</p>
      {!hides.length && <p className="text-sm text-gray-400 mb-2">Aún no hay Hides registrados.</p>}
      <div className="hide-lista">
        {hides.map((h, i) => (
          <div className="hide-item" key={h.id}>
            <span className="hide-ico"><b>{i + 1}</b></span>
            <div><b>{h.nombre}</b><small>{h.dms}</small><small>{h.pos[0]}, {h.pos[1]}</small></div>
            <div className="hide-acciones">
              <a href={urlRuta(h.pos)} target="_blank" rel="noreferrer"><i className="fa fa-location-arrow"></i> Cómo llegar</a>
            </div>
          </div>
        ))}
      </div>

      {rol === 'turista' && (
        <>
          <div className="flex items-center justify-between mt-6 mb-2">
            <h4 className="font-bold">Avistamientos</h4>
            {puede('crear_avistamiento')
              ? <button className="btn-rojo" onClick={() => setModal(true)}><i className="fa fa-plus"></i> Crear avistamiento</button>
              : <small className="text-gray-500">Tu cuenta no tiene permiso para crear avistamientos.</small>}
          </div>
          {mios.length > 0 && <><p className="text-xs text-gray-500 mb-1">Mis avistamientos</p><div className="space-y-2 mb-3">{mios.map(a => tarjeta(a, true))}</div></>}
          <p className="text-xs text-gray-500 mb-1">Registros de otros turistas</p>
          <div className="space-y-2">{otros.length ? otros.map(a => tarjeta(a, false)) : <p className="text-sm text-gray-400">Aún no hay registros aprobados.</p>}</div>
        </>
      )}

      <h4 className="font-bold mt-6 mb-2">Consejos para observar desde el Hide</h4>
      <ul className="text-sm text-gray-600 space-y-1 list-disc pl-5">
        <li>Llega antes del amanecer y guarda silencio.</li>
        <li>Usa binoculares y vístete con colores neutros.</li>
        <li>No uses flash ni drones cerca de los nidos.</li>
      </ul>
      <a href="#mapa" className="inline-block mt-5 bg-primary text-white px-5 py-2 rounded-md text-sm">Ver todos en el mapa</a>
      {modal && <AvistamientoModal datos={datos} onCerrar={() => setModal(false)} onCreado={() => { setModal(false); cargar() }} />}
    </div>
  )
}
