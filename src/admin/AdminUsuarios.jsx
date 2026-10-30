import { useEffect, useMemo, useState } from 'react'
import { supabase } from '../lib/supabase'
import { exportarPdf, exportarExcel } from '../lib/exportar'
import { useAuth } from '../hooks/useAuth'

const fecha = f => (f ? new Date(f).toLocaleDateString() : '—')
const fechaHora = f => (f ? new Date(f).toLocaleString() : '—')
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
  const [ver, setVer] = useState(null)
  const [avistamientos, setAvistamientos] = useState([])
  const [filtroAv, setFiltroAv] = useState('todos')
  const [cargandoAv, setCargandoAv] = useState(false)
  const [conteo, setConteo] = useState({})
  const [cargando, setCargando] = useState(true)
  const [cambiando, setCambiando] = useState(null)
  const { perfil } = useAuth()

  const cargar = async () => {
    const { data } = await supabase.from('profiles').select('id, nombre_completo, email, telefono, rol, activo, creado_en')
      .order('creado_en', { ascending: false })
    setTuristas(data || [])
    const { data: av } = await supabase.from('avistamientos').select('usuario_id')
    const c = {}
    ;(av || []).forEach(x => { c[x.usuario_id] = (c[x.usuario_id] || 0) + 1 })
    setConteo(c)
    setCargando(false)
  }
  useEffect(() => { cargar() }, [])

  const filtrados = useMemo(() => {
    const t = q.trim().toLowerCase()
    const base = filtroRol === 'todos' ? turistas : turistas.filter(u => u.rol === filtroRol)
    return t ? base.filter(u => (u.nombre_completo || '').toLowerCase().includes(t) || (u.email || '').toLowerCase().includes(t) || (u.telefono || '').includes(t)) : base
  }, [turistas, q, filtroRol])

  const tabla = () => ({
    titulo: 'Usuarios', hoja: 'Usuarios',
    columnas: ['Nombre', 'Correo', 'Teléfono', 'Rol',     'Estado', 'Avistamientos', 'Registro'],
        filas: filtrados.map(u => [u.nombre_completo || '—', u.email || '—', u.telefono || '—', ROLES[u.rol] || u.rol, u.activo === false ? 'Inactivo' : 'Activo', conteo[u.id] || 0, fecha(u.creado_en)]),
  })

  const abrirVer = async u => {
    setVer(u)
    setFiltroAv('todos')
    setAvistamientos([])
    setCargandoAv(true)
    const [av, hi, ru, pa] = await Promise.all([
      supabase.from('avistamientos')
        .select('id, especie, descripcion, fotos, hide_id, ruta_id, parada_id, latitud, longitud, estado, comentario_admin, creado_en')
        .eq('usuario_id', u.id)
        .order('creado_en', { ascending: false }),
      supabase.from('hides').select('id, nombre, latitud, longitud'),
      supabase.from('rutas').select('id, nombre'),
      supabase.from('paradas').select('id, nombre, latitud, longitud'),
    ])
    const buscar = (arr, id) => (arr || []).find(x => x.id === id)
    setAvistamientos((av.data || []).map(a => ({
      ...a,
      hide: buscar(hi.data, a.hide_id),
      ruta: buscar(ru.data, a.ruta_id),
      parada: buscar(pa.data, a.parada_id),
    })))
    setCargandoAv(false)
  }

  const avistamientosVisibles = filtroAv === 'todos' ? avistamientos : avistamientos.filter(a => a.estado === filtroAv)

  const crear = async e => {
    e.preventDefault()
      if (guardando) return
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
      if (guardando) return
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

  const cambiarEstado = async u => {
    if (cambiando) return
    const activar = u.activo === false
    if (!window.confirm((activar ? '¿Activar a ' : '¿Desactivar a ') + (u.nombre_completo || u.email) + '?')) return
    setCambiando(u.id)
    const { error: err } = await supabase.from('profiles').update({ activo: activar }).eq('id', u.id)
    if (err) { setCambiando(null); return window.alert('No se pudo cambiar el estado: ' + err.message) }
    await cargar()
    setCambiando(null)
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
          <thead><tr><th>Nombre</th><th>Correo</th><th>Teléfono</th><th>Rol</th><th>Estado</th><th>Avistamientos</th><th>Registro</th><th>Acciones</th></tr></thead>
          <tbody>
            {filtrados.map(u => (
              <tr key={u.id}>
                <td>{u.nombre_completo || '—'}</td><td>{u.email}</td><td>{u.telefono || '—'}</td>
                <td>{ROLES[u.rol] || u.rol}</td>
                <td>{u.activo === false ? 'Inactivo' : 'Activo'}</td><td><span>{conteo[u.id] || 0}</span>{' '}<button className="btn-sec" style={{ padding: '.3rem .6rem' }} title="Ver avistamientos" aria-label={`Ver avistamientos de ${u.nombre_completo || u.email}`} onClick={() => abrirVer(u)}><i className="fa fa-eye"></i></button></td><td>{fecha(u.creado_en)}</td>
                                <td style={{ whiteSpace: 'nowrap' }}>
                                  <button className="btn-sec" style={{ padding: '.3rem .6rem' }} title="Editar" onClick={() => { setError(null); setEdit({ ...u, telefono: u.telefono || '', nombre_completo: u.nombre_completo || '', activo: u.activo !== false }) }}><i className="fa fa-pencil"></i></button>{' '}
                                  {u.id !== perfil?.id && (u.activo === false
                                    ? <button className="btn-rojo" style={{ padding: '.3rem .6rem' }}                                     title="Activar" disabled={!!cambiando} onClick={() => cambiarEstado(u)}><i className={cambiando === u.id ? 'fa fa-spinner fa-spin' : 'fa fa-toggle-off'}></i> Activar</button>
                                                                        : <button className="btn-sec" style={{ padding: '.3rem .6rem' }} title="Desactivar" disabled={!!cambiando} onClick={() => cambiarEstado(u)}><i className={cambiando === u.id ? 'fa fa-spinner fa-spin' : 'fa fa-toggle-on'}></i> Desactivar</button>)}
                                </td>
                              </tr>
                            ))}
                            {cargando ? <tr><td colSpan="8" className="adm-cargando"><i className="fa fa-spinner fa-spin"></i> Cargando…</td></tr> : !filtrados.length && <tr><td colSpan="8">Aún no hay usuarios.</td></tr>}
          </tbody>
        </table>
      </div>

      {ver && (
        <div className="modal-fondo" onClick={() => setVer(null)}>
          <div className="modal-caja adm-usuario-modal" role="dialog" aria-modal="true" onClick={e => e.stopPropagation()}>
            <header className="adm-usuario-cabecera">
              <div>
                <p className="adm-usuario-eyebrow">REGISTRO DE AVISTAMIENTOS</p>
                <h3>{ver.nombre_completo || ver.email || 'Usuario'}</h3>
              </div>
              <button type="button" className="btn-sec" title="Cerrar" aria-label="Cerrar" onClick={() => setVer(null)}><i className="fa fa-times"></i></button>
            </header>

            {!cargandoAv && <div className="adm-usuario-resumen" aria-label="Filtrar avistamientos">
              {[
                ['Todos', avistamientos.length, 'fa-binoculars', 'todos'],
                ['Pendientes', avistamientos.filter(a => a.estado === 'pendiente').length, 'fa-clock-o', 'pendiente'],
                ['Aprobados', avistamientos.filter(a => a.estado === 'aprobado').length, 'fa-check-circle', 'aprobado'],
                ['Rechazados', avistamientos.filter(a => a.estado === 'rechazado').length, 'fa-times-circle', 'rechazado'],
              ].map(([label, total, icon, estado]) => (
                <button type="button" className={`adm-usuario-indicador ${estado}${filtroAv === estado ? ' seleccionado' : ''}`} key={estado} aria-pressed={filtroAv === estado} onClick={() => setFiltroAv(estado)}>
                  <i className={`fa ${icon}`} aria-hidden="true"></i>
                  <span>{label}</span>
                  <strong>{total}</strong>
                </button>
              ))}
            </div>}

            <h4 className="adm-usuario-subtitulo">Avistamientos registrados</h4>
            {cargandoAv ? (
              <p className="adm-cargando"><i className="fa fa-spinner fa-spin"></i> Cargando avistamientos…</p>
            ) : avistamientosVisibles.length === 0 ? (
              <p className="adm-usuario-vacio">{avistamientos.length ? 'No hay avistamientos con este estado.' : 'Este usuario aún no ha registrado avistamientos.'}</p>
            ) : (
              <div className="adm-usuario-lista">
                {avistamientosVisibles.map(a => {
                  const punto = a.latitud != null && a.longitud != null
                    ? { latitud: a.latitud, longitud: a.longitud }
                    : a.hide?.latitud != null && a.hide?.longitud != null ? a.hide
                      : a.parada?.latitud != null && a.parada?.longitud != null ? a.parada : null
                  const lugar = [a.hide?.nombre, a.ruta?.nombre, a.parada?.nombre].filter(Boolean).join(' · ')
                  const estado = a.estado || 'pendiente'
                  const numero = avistamientos.findIndex(item => item.id === a.id) + 1
                  return (
                    <article key={a.id} className={`adm-usuario-avistamiento ${estado}`}>
                      <div className="adm-usuario-avistamiento-top">
                        <div>
                          <span className="adm-usuario-numero">AVISTAMIENTO #{numero}</span>
                          <h5>{a.especie || 'Especie sin especificar'}</h5>
                        </div>
                        <span className={`adm-usuario-estado ${estado}`}>{estado}</span>
                      </div>
                      <p className="adm-usuario-fecha"><i className="fa fa-clock-o" aria-hidden="true"></i> {fechaHora(a.creado_en)}</p>
                      {a.descripcion && <p className="adm-usuario-descripcion">{a.descripcion}</p>}
                      <div className="adm-usuario-ubicacion">
                        <div><i className={`fa ${a.hide_id ? 'fa-binoculars' : 'fa-map-signs'}`} aria-hidden="true"></i><span><b>Ubicación</b>{lugar || (a.hide_id ? 'Hide no especificado' : 'En ruta')}</span></div>
                        <div><i className="fa fa-map-marker" aria-hidden="true"></i><span><b>Coordenadas</b>{punto ? `${Number(punto.latitud).toFixed(6)}, ${Number(punto.longitud).toFixed(6)}` : 'No disponibles'}</span></div>
                      </div>
                      {a.comentario_admin && <p className="adm-usuario-comentario"><b>Comentario administrativo:</b> {a.comentario_admin}</p>}
                      <div className="adm-usuario-pie">
                        {a.fotos?.length > 0 ? (
                          <div className="adm-usuario-fotos" aria-label={`${a.fotos.length} fotos`}>
                            {a.fotos.map((url, i) => <a key={`${a.id}-${i}`} href={url} target="_blank" rel="noreferrer" title={`Abrir foto ${i + 1}`}><img src={url} alt={`Foto ${i + 1} de ${a.especie || 'avistamiento'}`} /></a>)}
                          </div>
                        ) : <span className="adm-usuario-sin-fotos">Sin fotografías</span>}
                      </div>
                    </article>
                  )
                })}
              </div>
            )}

            <div className="adm-usuario-acciones">
              <button type="button" className="btn-sec" onClick={() => setVer(null)}>Cerrar</button>
            </div>
          </div>
        </div>
      )}

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
              <button className="btn-rojo" disabled={guardando}>{guardando ? <><i className="fa fa-spinner fa-spin"></i> Guardando…</> : 'Guardar'}</button>
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
              <button className="btn-rojo" disabled={guardando}>{guardando ? <><i className="fa fa-spinner fa-spin"></i> Guardando…</> : 'Registrar'}</button>
            </div>
          </form>
        </div>
      )}
    </div>
  )
}
