import { useEffect, useMemo, useState } from 'react'
import { supabase } from '../lib/supabase'
import { exportarPdf, exportarExcel } from '../lib/exportar'
import { useAuth } from '../hooks/useAuth'

const fecha = f => (f ? new Date(f).toLocaleDateString() : '—')
const VACIO = { nombre: '', email: '', telefono: '', password: '', rol: 'turista' }
const ROLES = { turista: 'Turista', admin_guia: 'Administrador' }

export default function AdminUsuarios() {
  const [turistas, setTuristas] = useState([])
  const [q, setQ] = useState('')
  const [filtroRol, setFiltroRol] = useState('todos')
  const [modal, setModal] = useState(false)
  const [form, setForm] = useState(VACIO)
  const [error, setError] = useState(null)
  const [guardando, setGuardando] = useState(false)
  const [edit, setEdit] = useState(null)
  const { perfil } = useAuth()

  const cargar = async () => {
    const { data } = await supabase.from('profiles').select('id, nombre_completo, email, telefono, rol, activo, creado_en')
      .order('creado_en', { ascending: false })
    setTuristas(data || [])
  }
  useEffect(() => { cargar() }, [])

  const filtrados = useMemo(() => {
    const t = q.trim().toLowerCase()
    const base = filtroRol === 'todos' ? turistas : turistas.filter(u => u.rol === filtroRol)
    return t ? base.filter(u => (u.nombre_completo || '').toLowerCase().includes(t) || (u.email || '').toLowerCase().includes(t) || (u.telefono || '').includes(t)) : base
  }, [turistas, q, filtroRol])

  const tabla = () => ({
    titulo: 'Usuarios', hoja: 'Usuarios',
    columnas: ['Nombre', 'Correo', 'Teléfono', 'Rol', 'Estado', 'Registro'],
    filas: filtrados.map(u => [u.nombre_completo || '—', u.email || '—', u.telefono || '—', ROLES[u.rol] || u.rol, u.activo === false ? 'Inactivo' : 'Activo', fecha(u.creado_en)]),
  })

  const crear = async e => {
    e.preventDefault()
    setGuardando(true); setError(null)
    const { data: nuevo, error: err } = await supabase.rpc('registrar_usuario', {
      p_nombre: form.nombre, p_email: form.email.trim(), p_password: form.password, p_codigo: null,
    })
    const extra = {}
    if (form.telefono.trim()) extra.telefono = form.telefono.trim()
    if (form.rol !== 'turista') extra.rol = form.rol
    if (!err && nuevo?.id && Object.keys(extra).length) {
      const u = await supabase.from('profiles').update(extra).eq('id', nuevo.id)
      if (u.error) { setGuardando(false); cargar(); return setError(u.error.message) }
    }
    setGuardando(false)
    if (err) return setError(err.message)
    setModal(false); setForm(VACIO)
    cargar()
  }

  const guardarEdicion = async e => {
    e.preventDefault()
    setGuardando(true); setError(null)
    const email = edit.email.trim().toLowerCase()
    const dup = await supabase.from('profiles').select('id').ilike('email', email).neq('id', edit.id).limit(1)
    if (dup.data?.length) { setGuardando(false); return setError('Ese correo ya está registrado') }
    const { error: err } = await supabase.from('profiles').update({
      nombre_completo: edit.nombre_completo, email, telefono: edit.telefono || null, rol: edit.rol, activo: edit.activo,
    }).eq('id', edit.id)
    setGuardando(false)
    if (err) return setError(err.message)
    setEdit(null)
    cargar()
  }

  const eliminar = async u => {
    if (!window.confirm('¿Eliminar a ' + (u.nombre_completo || u.email) + '? Esta acción no se puede deshacer.')) return
    const { error: err } = await supabase.from('profiles').delete().eq('id', u.id)
    if (err) return window.alert('No se pudo eliminar: ' + err.message)
    cargar()
  }

  return (
    <div className="adm-pagina">
      <div className="flex flex-wrap items-center gap-2 mb-3">
        <h3 className="adm-h" style={{ margin: 0 }}>Usuarios ({filtrados.length})</h3>
        <select className="campo" style={{ width: 'auto', marginBottom: 0 }} value={filtroRol} onChange={e => setFiltroRol(e.target.value)}>
          <option value="todos">Todos los roles</option>
          <option value="turista">Turistas</option>
          <option value="admin_guia">Administradores</option>
        </select>
        <input className="campo" style={{ marginLeft: 'auto', maxWidth: '16rem', marginBottom: 0 }} placeholder="Buscar nombre, correo o teléfono…" value={q} onChange={e => setQ(e.target.value)} />
        <button className="btn-pdf" onClick={() => exportarPdf(tabla(), 'turistas')}><i className="fa fa-file-pdf-o"></i> PDF</button>
        <button className="btn-xls" onClick={() => exportarExcel(tabla(), 'turistas')}><i className="fa fa-file-excel-o"></i> Excel</button>
        <button className="btn-rojo" onClick={() => setModal(true)}><i className="fa fa-plus"></i> Nuevo usuario</button>
      </div>

      <div className="overflow-x-auto">
        <table className="adm-tabla">
          <thead><tr><th>Nombre</th><th>Correo</th><th>Teléfono</th><th>Rol</th><th>Estado</th><th>Registro</th><th>Acciones</th></tr></thead>
          <tbody>
            {filtrados.map(u => (
              <tr key={u.id}>
                <td>{u.nombre_completo || '—'}</td><td>{u.email}</td><td>{u.telefono || '—'}</td>
                <td>{ROLES[u.rol] || u.rol}</td>
                <td>{u.activo === false ? 'Inactivo' : 'Activo'}</td><td>{fecha(u.creado_en)}</td>
                                <td style={{ whiteSpace: 'nowrap' }}>
                                  <button className="btn-sec" style={{ padding: '.3rem .6rem' }} title="Editar" onClick={() => { setError(null); setEdit({ ...u, telefono: u.telefono || '', nombre_completo: u.nombre_completo || '', activo: u.activo !== false }) }}><i className="fa fa-pencil"></i></button>{' '}
                                  {u.id !== perfil?.id && <button className="btn-rojo" style={{ padding: '.3rem .6rem' }} title="Eliminar" onClick={() => eliminar(u)}><i className="fa fa-trash"></i></button>}
                                </td>
                              </tr>
                            ))}
                            {!filtrados.length && <tr><td colSpan="7">Aún no hay usuarios.</td></tr>}
          </tbody>
        </table>
      </div>

      {edit && (
        <div className="modal-fondo" onClick={() => setEdit(null)}>
          <form className="modal-caja" onClick={e => e.stopPropagation()} onSubmit={guardarEdicion}>
            <h3 className="font-bold text-lg mb-3">Editar usuario</h3>
            <input className="campo" placeholder="Nombre completo" required value={edit.nombre_completo} onChange={e => setEdit({ ...edit, nombre_completo: e.target.value })} />
            <input className="campo" type="email" placeholder="Correo" required value={edit.email || ''} onChange={e => setEdit({ ...edit, email: e.target.value })} />
            <input className="campo" type="tel" placeholder="Teléfono" value={edit.telefono} onChange={e => setEdit({ ...edit, telefono: e.target.value })} />
            <select className="campo" value={edit.rol} disabled={edit.id === perfil?.id} onChange={e => setEdit({ ...edit, rol: e.target.value })}>
              <option value="turista">Turista</option>
              <option value="admin_guia">Administrador</option>
            </select>
            <label className="flex items-center gap-2 text-sm mb-3">
              <input type="checkbox" checked={edit.activo} disabled={edit.id === perfil?.id} onChange={e => setEdit({ ...edit, activo: e.target.checked })} /> Cuenta activa
            </label>
            <p className="text-xs text-gray-500 mb-2">La contraseña no se puede modificar desde aquí.</p>
            {error && <p className="text-sm text-red-600 mb-2">{error}</p>}
            <div className="flex gap-2 justify-end">
              <button type="button" className="btn-sec" onClick={() => setEdit(null)}>Cancelar</button>
              <button className="btn-rojo" disabled={guardando}>{guardando ? 'Guardando…' : 'Guardar'}</button>
            </div>
          </form>
        </div>
      )}

      {modal && (
        <div className="modal-fondo" onClick={() => setModal(false)}>
          <form className="modal-caja" onClick={e => e.stopPropagation()} onSubmit={crear}>
            <h3 className="font-bold text-lg mb-3">Registrar usuario</h3>
            <select className="campo" value={form.rol} onChange={e => setForm({ ...form, rol: e.target.value })}>
              <option value="turista">Turista</option>
              <option value="admin_guia">Administrador</option>
            </select>
            <input className="campo" placeholder="Nombre completo" required value={form.nombre} onChange={e => setForm({ ...form, nombre: e.target.value })} />
            <input className="campo" type="email" placeholder="Correo" required value={form.email} onChange={e => setForm({ ...form, email: e.target.value })} />
            <input className="campo" type="tel" placeholder="Teléfono (ej. 70000000)" value={form.telefono} onChange={e => setForm({ ...form, telefono: e.target.value })} />
            <input className="campo" type="password" placeholder="Contraseña" required value={form.password} onChange={e => setForm({ ...form, password: e.target.value })} />
            {error && <p className="text-sm text-red-600 mb-2">{error}</p>}
            <div className="flex gap-2 justify-end">
              <button type="button" className="btn-sec" onClick={() => setModal(false)}>Cancelar</button>
              <button className="btn-rojo" disabled={guardando}>{guardando ? 'Guardando…' : 'Registrar'}</button>
            </div>
          </form>
        </div>
      )}
    </div>
  )
}
