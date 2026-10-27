import { useEffect, useState } from 'react'
import { supabase } from '../lib/supabase'
import { useAuth } from '../hooks/useAuth'

const vacia = { titulo: '', contenido: '', temporada_ideal: '', importante: false, ruta_id: '' }

export default function AdminRecomendaciones({ datos }) {
  const { perfil } = useAuth()
  const [lista, setLista] = useState([])
  const [f, setF] = useState(vacia)
  const [editId, setEditId] = useState(null)
  const [error, setError] = useState(null)
  const [cargando, setCargando] = useState(true)
  const [guardando, setGuardando] = useState(false)

  const cargar = async () => {
    const { data } = await supabase.from('recomendaciones').select('*').order('creado_en', { ascending: false })
    setLista(data || [])
  }
  useEffect(() => { supabase.from('recomendaciones').select('*').order('creado_en', { ascending: false }).then(({ data }) => { setLista(data || []); setCargando(false) }) }, [])

  const guardar = async e => {
    e.preventDefault()
    if (guardando) return
    setGuardando(true)
    const fila = { ...f, ruta_id: f.ruta_id || null }
    const r = editId
      ? await supabase.from('recomendaciones').update(fila).eq('id', editId)
      : await supabase.from('recomendaciones').insert({ ...fila, creado_por: perfil.id })
    if (r.error) { setGuardando(false); return setError(r.error.message) }
    setError(null); setF(vacia); setEditId(null); await cargar()
    setGuardando(false)
  }

  const eliminar = async id => {
    if (guardando || !confirm('¿Eliminar recomendación?')) return
    setGuardando(true)
    await supabase.from('recomendaciones').delete().eq('id', id)
    await cargar()
    setGuardando(false)
  }
  const editar = r => { setEditId(r.id); setF({ titulo: r.titulo, contenido: r.contenido || '', temporada_ideal: r.temporada_ideal || '', importante: r.importante, ruta_id: r.ruta_id || '' }) }

  return (
    <div className="adm-pagina">
      <h3 className="adm-h">Recomendaciones</h3>
      <form className="adm-caja mb-4" onSubmit={guardar}>
        <b className="text-sm">{editId ? 'Editar' : 'Nueva'} recomendación</b>
        <input className="campo" placeholder="Título" value={f.titulo} onChange={e => setF({ ...f, titulo: e.target.value })} required />
        <textarea className="campo" rows={3} placeholder="Contenido" value={f.contenido} onChange={e => setF({ ...f, contenido: e.target.value })} />
        <input className="campo" placeholder="Temporada ideal (ej. Nov – Mar)" value={f.temporada_ideal} onChange={e => setF({ ...f, temporada_ideal: e.target.value })} />
        <select className="campo" value={f.ruta_id} onChange={e => setF({ ...f, ruta_id: e.target.value })}>
          <option value="">Todas las rutas</option>
          {datos.rutas.map(r => <option key={r.id} value={r.id}>{r.nombre}</option>)}
        </select>
        <label className="flex items-center gap-2 text-sm mb-2"><input type="checkbox" checked={f.importante} onChange={e => setF({ ...f, importante: e.target.checked })} /> Importante</label>
        {error && <p className="text-sm text-red-600">{error}</p>}
        <div className="flex gap-2">
          <button className="btn-rojo" disabled={guardando}>{guardando ? <><i className="fa fa-spinner fa-spin"></i> Guardando…</> : 'Guardar'}</button>
          {editId && <button type="button" className="btn-sec" onClick={() => { setEditId(null); setF(vacia) }}>Cancelar</button>}
        </div>
      </form>
      <div className="space-y-2">
        {cargando && <p className="adm-cargando"><i className="fa fa-spinner fa-spin"></i> Cargando…</p>}
        {lista.map(r => (
          <div key={r.id} className="adm-caja flex justify-between gap-2">
            <div>
              <b>{r.importante && '⚠ '}{r.titulo}</b>
              {r.temporada_ideal && <small className="block text-secondary">Temporada: {r.temporada_ideal}</small>}
              <p className="text-sm text-gray-600">{r.contenido}</p>
            </div>
            <div className="flex gap-2 items-start">
              <button onClick={() => editar(r)}><i className="fa fa-pencil"></i></button>
              <button disabled={guardando} onClick={() => eliminar(r.id)} className="text-primary"><i className="fa fa-trash"></i></button>
            </div>
          </div>
        ))}
      </div>
    </div>
  )
}
