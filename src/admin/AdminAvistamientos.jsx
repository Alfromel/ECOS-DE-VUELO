import { useCallback, useEffect, useState } from 'react'
import { supabase } from '../lib/supabase'
import { useAuth } from '../hooks/useAuth'

export default function AdminAvistamientos({ datos }) {
  const { perfil } = useAuth()
  const [lista, setLista] = useState([])
  const [usuarios, setUsuarios] = useState({})
  const [filtro, setFiltro] = useState('todos')
  const [usuarioSel, setUsuarioSel] = useState('')
  const [hideSel, setHideSel] = useState('')
  const [coment, setComent] = useState({})
  const [cargando, setCargando] = useState(true)
  const [ocupado, setOcupado] = useState(null)

  const cargar = useCallback(async () => {
    const [a, u] = await Promise.all([
      supabase.from('avistamientos').select('*').order('creado_en', { ascending: false }),
      supabase.from('profiles').select('id, nombre_completo, email'),
    ])
    setLista(a.data || [])
    setUsuarios(Object.fromEntries((u.data || []).map(x => [x.id, x.nombre_completo || x.email])))
    setCargando(false)
  }, [])
  useEffect(() => { cargar() }, [cargar])

  const evaluar = async (a, estado) => {
    if (ocupado) return
    setOcupado(a.id + estado)
    await supabase.from('avistamientos').update({
      estado, evaluado_por: perfil.id, evaluado_en: new Date().toISOString(), comentario_admin: coment[a.id] || null,
    }).eq('id', a.id)
    await cargar()
    setOcupado(null)
  }

  const eliminar = async a => {
    if (ocupado || !confirm(`¿Eliminar el avistamiento de "${a.especie}"? Esta acción no se puede deshacer.`)) return
    setOcupado(a.id + 'del')
    const { error } = await supabase.from('avistamientos').delete().eq('id', a.id)
    if (error) { setOcupado(null); alert('No se pudo eliminar: ' + error.message); return }
    await cargar()
    setOcupado(null)
  }

  const nom = (arr, id) => arr.find(x => x.id === id)?.nombre
  const base = lista.filter(a => (!usuarioSel || a.usuario_id === usuarioSel) && (!hideSel || a.hide_id === hideSel))
  const vistos = base.filter(a => filtro === 'todos' || a.estado === filtro)
  const porUsuario = lista.filter(a => !usuarioSel || a.usuario_id === usuarioSel)
  const usuariosConAv = Object.keys(usuarios).filter(id => lista.some(a => a.usuario_id === id))

  return (
    <div className="adm-pagina">
      <h3 className="adm-h">Avistamientos</h3>
      <div className="hide-filtro mb-3">
        {(datos.hides || []).map(h => (
          <button key={h.id} className={'hide-chip ' + (hideSel === h.id ? 'activa' : '')} onClick={() => setHideSel(hideSel === h.id ? '' : h.id)}>
            <i className="fa fa-binoculars"></i> {h.nombre} <span>{porUsuario.filter(a => a.hide_id === h.id).length}</span>
          </button>
        ))}
      </div>
      <div className="flex flex-wrap items-center gap-1 mb-3 text-sm">
        {['todos', 'pendiente', 'aprobado', 'rechazado'].map(f => (
          <button key={f} className={'adm-tab ' + (filtro === f ? 'activa' : '')} onClick={() => setFiltro(f)}>
            {f[0].toUpperCase() + f.slice(1)}{f === 'pendiente' && ` (${base.filter(a => a.estado === 'pendiente').length})`}
          </button>
        ))}
        <select className="campo" style={{ width: 'auto', marginBottom: 0, marginLeft: 'auto' }} value={usuarioSel} onChange={e => setUsuarioSel(e.target.value)}>
          <option value="">Todos los usuarios</option>
          {[...usuariosConAv].sort((x, y) => (usuarios[x] || '').localeCompare(usuarios[y] || '')).map(id => <option key={id} value={id}>{usuarios[id]}</option>)}
        </select>
      </div>
      <div className="space-y-3">
        {cargando && <p className="adm-cargando"><i className="fa fa-spinner fa-spin"></i> Cargando…</p>}
        {!cargando && !vistos.length && <p className="text-gray-400">Sin avistamientos.</p>}
        {vistos.map(a => (
          <div key={a.id} className="adm-caja">
            <div className="flex justify-between"><b>{a.especie}</b><span className="text-xs">{a.estado}</span></div>
            <small className="text-gray-500">
              {usuarios[a.usuario_id]} · {[nom(datos.hides || [], a.hide_id), nom(datos.rutas || [], a.ruta_id), nom(datos.paradas || [], a.parada_id)].filter(Boolean).join(' · ')} · {new Date(a.creado_en).toLocaleString()}
            </small>
            {a.descripcion && <p className="text-sm mt-1">{a.descripcion}</p>}
            {a.fotos?.length > 0 && <div className="flex gap-1 mt-2">{a.fotos.map(u => <a key={u} href={u} target="_blank" rel="noreferrer"><img src={u} alt="" className="w-20 h-20 object-cover rounded" /></a>)}</div>}
            <div className="flex gap-2 mt-2">
              <input className="campo mb-0 flex-1" placeholder="Comentario (opcional)" defaultValue={a.comentario_admin || ''} onChange={e => setComent({ ...coment, [a.id]: e.target.value })} />
              {a.estado !== 'aprobado' && <button className="btn-rojo" disabled={!!ocupado} onClick={() => evaluar(a, 'aprobado')}>{ocupado === a.id + 'aprobado' ? <i className="fa fa-spinner fa-spin"></i> : 'Aprobar'}</button>}
              {a.estado !== 'rechazado' && <button className="btn-sec" disabled={!!ocupado} onClick={() => evaluar(a, 'rechazado')}>{ocupado === a.id + 'rechazado' ? <i className="fa fa-spinner fa-spin"></i> : 'Rechazar'}</button>}
              <button className="btn-sec text-primary" disabled={!!ocupado} title="Eliminar avistamiento" aria-label="Eliminar avistamiento" onClick={() => eliminar(a)}><i className={ocupado === a.id + 'del' ? 'fa fa-spinner fa-spin' : 'fa fa-trash'}></i></button>
            </div>
          </div>
        ))}
      </div>
    </div>
  )
}
