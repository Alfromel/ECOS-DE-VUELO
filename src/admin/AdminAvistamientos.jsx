import { useCallback, useEffect, useState } from 'react'
import { supabase } from '../lib/supabase'
import { useAuth } from '../hooks/useAuth'

export default function AdminAvistamientos({ datos }) {
  const { perfil } = useAuth()
  const [lista, setLista] = useState([])
  const [usuarios, setUsuarios] = useState({})
  const [filtro, setFiltro] = useState('pendiente')
  const [coment, setComent] = useState({})

  const cargar = useCallback(async () => {
    const [a, u] = await Promise.all([
      supabase.from('avistamientos').select('*').order('creado_en', { ascending: false }),
      supabase.from('profiles').select('id, nombre_completo, email'),
    ])
    setLista(a.data || [])
    setUsuarios(Object.fromEntries((u.data || []).map(x => [x.id, x.nombre_completo || x.email])))
  }, [])
  useEffect(() => { cargar() }, [cargar])

  const evaluar = async (a, estado) => {
    await supabase.from('avistamientos').update({
      estado, evaluado_por: perfil.id, evaluado_en: new Date().toISOString(), comentario_admin: coment[a.id] || null,
    }).eq('id', a.id)
    cargar()
  }

  const eliminar = async a => {
    if (!confirm(`¿Eliminar el avistamiento de "${a.especie}"? Esta acción no se puede deshacer.`)) return
    const { error } = await supabase.from('avistamientos').delete().eq('id', a.id)
    if (error) { alert('No se pudo eliminar: ' + error.message); return }
    cargar()
  }

  const nom = (arr, id) => arr.find(x => x.id === id)?.nombre
  const vistos = lista.filter(a => filtro === 'todos' || a.estado === filtro)

  return (
    <div className="adm-pagina">
      <h3 className="adm-h">Avistamientos</h3>
      <div className="flex gap-1 mb-3 text-sm">
        {['pendiente', 'aprobado', 'rechazado', 'todos'].map(f => (
          <button key={f} className={'adm-tab ' + (filtro === f ? 'activa' : '')} onClick={() => setFiltro(f)}>
            {f[0].toUpperCase() + f.slice(1)}{f === 'pendiente' && ` (${lista.filter(a => a.estado === 'pendiente').length})`}
          </button>
        ))}
      </div>
      <div className="space-y-3">
        {!vistos.length && <p className="text-gray-400">Sin avistamientos.</p>}
        {vistos.map(a => (
          <div key={a.id} className="adm-caja">
            <div className="flex justify-between"><b>{a.especie}</b><span className="text-xs">{a.estado}</span></div>
            <small className="text-gray-500">
              {usuarios[a.usuario_id]} · {[nom(datos.hides, a.hide_id), nom(datos.rutas, a.ruta_id), nom(datos.paradas, a.parada_id)].filter(Boolean).join(' · ')} · {new Date(a.creado_en).toLocaleString()}
            </small>
            {a.descripcion && <p className="text-sm mt-1">{a.descripcion}</p>}
            {a.fotos?.length > 0 && <div className="flex gap-1 mt-2">{a.fotos.map(u => <a key={u} href={u} target="_blank" rel="noreferrer"><img src={u} alt="" className="w-20 h-20 object-cover rounded" /></a>)}</div>}
            <div className="flex gap-2 mt-2">
              <input className="campo mb-0 flex-1" placeholder="Comentario (opcional)" defaultValue={a.comentario_admin || ''} onChange={e => setComent({ ...coment, [a.id]: e.target.value })} />
              {a.estado !== 'aprobado' && <button className="btn-rojo" onClick={() => evaluar(a, 'aprobado')}>Aprobar</button>}
              {a.estado !== 'rechazado' && <button className="btn-sec" onClick={() => evaluar(a, 'rechazado')}>Rechazar</button>}
              <button className="btn-sec text-primary" title="Eliminar avistamiento" aria-label="Eliminar avistamiento" onClick={() => eliminar(a)}><i className="fa fa-trash"></i></button>
            </div>
          </div>
        ))}
      </div>
    </div>
  )
}
