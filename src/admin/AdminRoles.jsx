import { useEffect, useState } from 'react'
import { supabase } from '../lib/supabase'
import { PERMISOS } from '../hooks/useAuth'

// El admin puede ver y modificar permisos (crear/actualizar); no elimina ni edita usuarios.
export default function AdminRoles() {
  const [usuarios, setUsuarios] = useState([])
  const [permisos, setPermisos] = useState({})
  const [error, setError] = useState(null)
  const [cargando, setCargando] = useState(true)
  const [ocupado, setOcupado] = useState(null)

  const cargar = async () => {
    const [u, p] = await Promise.all([
      supabase.from('profiles').select('id, nombre_completo, email, rol, creado_en').order('creado_en'),
      supabase.from('permisos_usuario').select('*'),
    ])
    setUsuarios(u.data || [])
    setPermisos(Object.fromEntries((p.data || []).map(x => [x.usuario_id + ':' + x.permiso, x.concedido])))
    setCargando(false)
  }
  useEffect(() => { cargar() }, [])

  const concedido = (id, p) => permisos[id + ':' + p] !== false

  const alternar = async (u, p) => {
    if (ocupado) return
    setOcupado(u.id + ':' + p)
    const nuevo = !concedido(u.id, p)
    const r = await supabase.from('permisos_usuario').upsert(
      { usuario_id: u.id, permiso: p, concedido: nuevo, actualizado_en: new Date().toISOString() }, { onConflict: 'usuario_id,permiso' })
    setOcupado(null)
    if (r.error) return setError(r.error.message)
    setError(null)
    setPermisos(s => ({ ...s, [u.id + ':' + p]: nuevo }))
  }

  return (
    <div className="adm-pagina">
      <h3 className="adm-h">Roles y permisos</h3>
      {error && <p className="text-sm text-red-600">{error}</p>}
      {cargando && <p className="adm-cargando"><i className="fa fa-spinner fa-spin"></i> Cargando…</p>}
      <div className="overflow-x-auto">
        <table className="adm-tabla">
          <thead>
            <tr><th>Usuario</th><th>Rol</th>{PERMISOS.map(([k, t]) => <th key={k}>{t}</th>)}</tr>
          </thead>
          <tbody>
            {usuarios.map(u => (
              <tr key={u.id}>
                <td>{u.nombre_completo || '—'}<small className="block text-gray-500">{u.email}</small></td>
                <td>{u.rol === 'admin_guia' ? 'Admin / Guía' : 'Turista'}</td>
                {PERMISOS.map(([k]) => (
                  <td key={k} className="text-center">
                    {u.rol === 'admin_guia' ? <span className="text-gray-400">todos</span>
                      : <input type="checkbox" checked={concedido(u.id, k)} disabled={!!ocupado} onChange={() => alternar(u, k)} />}
                  </td>
                ))}
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  )
}
