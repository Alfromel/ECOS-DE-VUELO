import { createContext, useCallback, useContext, useEffect, useMemo, useState } from 'react'
import { supabase } from '../lib/supabase'

const Ctx = createContext(null)
export const useAuth = () => useContext(Ctx)

export const PERMISOS = [
  ['crear_avistamiento', 'Crear avistamientos'],
  ['ver_hide', 'Ver Hide'],
  ['descargar_ficha', 'Descargar ficha técnica'],
  ['exportar_mapa', 'Exportar mapa'],
  ['ver_reportes', 'Ver reportes'],
]

const CLAVE = 'sesion_perfil_id'
const COLS = 'id, nombre_completo, email, telefono, avatar_url, rol, activo'

// Sesión propia: solo se guarda el id del perfil; el perfil se lee de la tabla profiles.
export function AuthProvider({ children }) {
  const [uid, setUid] = useState(() => localStorage.getItem(CLAVE))
  const [perfil, setPerfil] = useState(null)
  const [cargado, setCargado] = useState(!localStorage.getItem(CLAVE))
  const [permisos, setPermisos] = useState({})
  const [noLeidos, setNoLeidos] = useState(0)

  const cargarPerfil = useCallback(async () => {
    if (!uid) { setPerfil(null); setPermisos({}); setCargado(true); return }
    const [p, pe] = await Promise.all([
      supabase.from('profiles').select(COLS).eq('id', uid).maybeSingle(),
      supabase.from('permisos_usuario').select('permiso, concedido').eq('usuario_id', uid),
    ])
    if (!p.data || p.data.activo === false) { localStorage.removeItem(CLAVE); setUid(null); setPerfil(null) }
    else setPerfil(p.data)
    setPermisos(Object.fromEntries((pe.data || []).map(x => [x.permiso, x.concedido])))
    setCargado(true)
  }, [uid])

  useEffect(() => { cargarPerfil() }, [cargarPerfil])

  const refrescarNoLeidos = useCallback(async () => {
    if (!uid || perfil?.rol !== 'turista') { setNoLeidos(0); return }
    const [r, d] = await Promise.all([
      supabase.from('reportes').select('id, destino, reportes_destinatarios(usuario_id)'),
      supabase.from('reportes_destinatarios').select('reporte_id').eq('usuario_id', uid).eq('leido', true),
    ])
    const leidos = new Set((d.data || []).map(x => x.reporte_id))
    const mios = (r.data || []).filter(x => x.destino === 'todos_turistas' || x.reportes_destinatarios?.some(y => y.usuario_id === uid))
    setNoLeidos(mios.filter(x => !leidos.has(x.id)).length)
  }, [uid, perfil?.rol])

  useEffect(() => { refrescarNoLeidos() }, [refrescarNoLeidos])

  const valor = useMemo(() => {
    const rol = !perfil ? 'invitado' : perfil.rol === 'admin_guia' ? 'admin' : 'turista'
    const iniciar = r => {
      if (r.error) return { error: { message: r.error.message } }
      localStorage.setItem(CLAVE, r.data.id)
      setPerfil(r.data); setUid(r.data.id)
      return { data: { perfil: r.data, session: true } }
    }
    return {
      cargando: !cargado, sesion: perfil, perfil, rol, noLeidos, refrescarNoLeidos, cargarPerfil,
      puede: p => rol === 'admin' || (rol === 'turista' && permisos[p] !== false),
      ingresar: async (email, password) => iniciar(await supabase.rpc('login_usuario', { p_email: email, p_password: password })),
      registrar: async (nombre, email, password, codigo, telefono) => {
        const r = await supabase.rpc('registrar_usuario', { p_nombre: nombre, p_email: email, p_password: password, p_codigo: codigo || null })
        if (!r.error && telefono && r.data?.id) {
          const u = await supabase.from('profiles').update({ telefono }).eq('id', r.data.id)
          if (!u.error) r.data = { ...r.data, telefono }
        }
        return iniciar(r)
      },
      salir: () => { localStorage.removeItem(CLAVE); setUid(null); setPerfil(null); setPermisos({}) },
    }
  }, [perfil, permisos, noLeidos, cargado, refrescarNoLeidos, cargarPerfil])

  return <Ctx.Provider value={valor}>{children}</Ctx.Provider>
}
