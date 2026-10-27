import { useEffect, useState } from 'react'
import { supabase } from '../lib/supabase'
import { useAuth } from '../hooks/useAuth'
import { exportarExcel, exportarPdf } from '../lib/exportar'

const vacio = { titulo: '', descripcion: '', tipo_reporte: 'Información', destino: 'todos_turistas', usuarios: [] }
const TIPOS = ['Información', 'Alerta', 'Zona cerrada', 'Precaución', 'Ruta habilitada']

export default function AdminReportes() {
  const { perfil } = useAuth()
  const [reportes, setReportes] = useState([])
  const [turistas, setTuristas] = useState([])
  const [dest, setDest] = useState([])
  const [f, setF] = useState(vacio)
  const [abierto, setAbierto] = useState(null)
  const [error, setError] = useState(null)
  const [cargando, setCargando] = useState(true)
  const [guardando, setGuardando] = useState(false)

  const cargar = async () => {
    const [r, t, d] = await Promise.all([
      supabase.from('reportes').select('*').order('creado_en', { ascending: false }),
      supabase.from('profiles').select('id, nombre_completo, email').eq('rol', 'turista').order('nombre_completo'),
      supabase.from('reportes_destinatarios').select('*'),
    ])
    setReportes(r.data || []); setTuristas(t.data || []); setDest(d.data || [])
    setCargando(false)
  }
  useEffect(() => { cargar() }, [])

  const nombre = id => { const t = turistas.find(x => x.id === id); return t ? t.nombre_completo || t.email : id }

  const alternarUsuario = id => setF(v => ({ ...v, usuarios: v.usuarios.includes(id) ? v.usuarios.filter(x => x !== id) : [...v.usuarios, id] }))

  const crear = async e => {
    e.preventDefault()
    if (guardando) return
    if (f.destino === 'usuarios_especificos' && !f.usuarios.length) return setError('Elige al menos un usuario')
    setGuardando(true)
    const { data, error: er } = await supabase.from('reportes')
      .insert({ titulo: f.titulo, descripcion: f.descripcion, tipo_reporte: f.tipo_reporte, destino: f.destino, creado_por: perfil.id }).select().single()
    if (er) { setGuardando(false); return setError(er.message) }
    if (f.destino === 'usuarios_especificos') {
      const r = await supabase.from('reportes_destinatarios').insert(f.usuarios.map(id => ({ reporte_id: data.id, usuario_id: id })))
      if (r.error) { setGuardando(false); cargar(); return setError(r.error.message) }
    }
    setError(null); setF(vacio); await cargar()
    setGuardando(false)
  }

  const eliminar = async id => {
    if (guardando || !confirm('¿Eliminar reporte?')) return
    setGuardando(true)
    await supabase.from('reportes').delete().eq('id', id)
    await cargar()
    setGuardando(false)
  }

  const detalle = rep => {
    const lista = dest.filter(d => d.reporte_id === rep.id)
    if (rep.destino === 'todos_turistas') {
      const leidos = lista.filter(d => d.leido).map(d => d.usuario_id)
      return { leyeron: leidos, pendientes: turistas.map(t => t.id).filter(id => !leidos.includes(id)) }
    }
    return { leyeron: lista.filter(d => d.leido).map(d => d.usuario_id), pendientes: lista.filter(d => !d.leido).map(d => d.usuario_id) }
  }

  const exportar = formato => {
    const cfg = {
      titulo: 'Reportes · Ecos de Vuelo Rojo', hoja: 'Reportes',
      columnas: ['Título', 'Tipo', 'Destino', 'Fecha', 'Leídos', 'Sin leer'],
      filas: reportes.map(r => { const d = detalle(r); return [r.titulo, r.tipo_reporte || '', r.destino === 'todos_turistas' ? 'Todos los turistas' : 'Usuarios específicos', new Date(r.creado_en).toLocaleDateString(), d.leyeron.length, d.pendientes.length] }),
    }
    formato === 'pdf' ? exportarPdf(cfg, 'reportes') : exportarExcel(cfg, 'reportes')
  }

  return (
    <div className="adm-pagina">
      <div className="flex items-center justify-between">
        <h3 className="adm-h">Reportes</h3>
        <div className="flex gap-2">
          <button className="btn-rojo" onClick={() => exportar('pdf')}>PDF</button>
          <button className="btn-sec" onClick={() => exportar('excel')}>Excel</button>
        </div>
      </div>
      <form className="adm-caja mb-4" onSubmit={crear}>
        <b className="text-sm">Nuevo reporte</b>
        <input className="campo" placeholder="Título" value={f.titulo} onChange={e => setF({ ...f, titulo: e.target.value })} required />
        <textarea className="campo" rows={3} placeholder="Descripción" value={f.descripcion} onChange={e => setF({ ...f, descripcion: e.target.value })} required />
        <select className="campo" value={f.tipo_reporte} onChange={e => setF({ ...f, tipo_reporte: e.target.value })}>
          {TIPOS.map(t => <option key={t}>{t}</option>)}
        </select>
        <div className="flex gap-4 text-sm mb-2">
          <label><input type="radio" checked={f.destino === 'todos_turistas'} onChange={() => setF({ ...f, destino: 'todos_turistas' })} /> Todos los turistas</label>
          <label><input type="radio" checked={f.destino === 'usuarios_especificos'} onChange={() => setF({ ...f, destino: 'usuarios_especificos' })} /> Usuarios específicos</label>
        </div>
        {f.destino === 'usuarios_especificos' && (
          <div className="max-h-40 overflow-y-auto border rounded p-2 mb-2">
            {turistas.map(t => (
              <label key={t.id} className="flex items-center gap-2 text-sm"><input type="checkbox" checked={f.usuarios.includes(t.id)} onChange={() => alternarUsuario(t.id)} /> {t.nombre_completo || t.email}</label>
            ))}
            {!turistas.length && <small className="text-gray-400">No hay turistas registrados.</small>}
          </div>
        )}
        {error && <p className="text-sm text-red-600 mb-2">{error}</p>}
        <button className="btn-rojo" disabled={guardando}>{guardando ? <><i className="fa fa-spinner fa-spin"></i> Publicando…</> : 'Publicar reporte'}</button>
      </form>

      <div className="space-y-2">
        {cargando && <p className="adm-cargando"><i className="fa fa-spinner fa-spin"></i> Cargando…</p>}
        {reportes.map(r => {
          const d = detalle(r)
          return (
            <div key={r.id} className="adm-caja">
              <div className="flex justify-between gap-2">
                <button className="text-left flex-1" onClick={() => setAbierto(abierto === r.id ? null : r.id)}>
                  <b>{r.titulo}</b> <span className="text-xs bg-gray-100 px-2 rounded-full">{r.tipo_reporte}</span>
                  <small className="block text-gray-500">{r.destino === 'todos_turistas' ? 'Todos los turistas' : 'Usuarios específicos'} · {d.leyeron.length} leídos · {d.pendientes.length} sin leer</small>
                </button>
                <button disabled={guardando} onClick={() => eliminar(r.id)} className="text-primary"><i className="fa fa-trash"></i></button>
              </div>
              {abierto === r.id && (
                <div className="mt-2 text-sm grid grid-cols-2 gap-3">
                  <div><b className="text-green-700">Leyeron</b>{d.leyeron.map(id => <div key={id}>✓ {nombre(id)}</div>)}</div>
                  <div><b className="text-red-600">No han leído</b>{d.pendientes.map(id => <div key={id}>○ {nombre(id)}</div>)}</div>
                </div>
              )}
            </div>
          )
        })}
      </div>
    </div>
  )
}
