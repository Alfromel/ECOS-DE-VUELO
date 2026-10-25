import { useEffect, useState } from 'react'
import { useAuth } from '../hooks/useAuth'
import { supabase } from '../lib/supabase'
import useMapaDatos from '../hooks/useMapaDatos'
import AdminDashboard from './AdminDashboard'
import AdminUsuarios from './AdminUsuarios'
import AdminRutas from './AdminRutas'
import AdminHides from './AdminHides'
import AdminAvistamientos from './AdminAvistamientos'
import AdminAve from './AdminAve'
import AdminReportes from './AdminReportes'
import AdminRecomendaciones from './AdminRecomendaciones'
import AdminRoles from './AdminRoles'

const MODULOS = [
  ['dashboard', 'fa-pie-chart', 'Dashboard'],
  ['usuarios', 'fa-user-circle-o', 'Usuarios'],
  ['rutas', 'fa-road', 'Rutas y paradas'],
  ['hides', 'fa-eye', 'Hide'],
  ['avistamientos', 'fa-binoculars', 'Avistamientos'],
  ['ave', 'fa-info-circle', 'Ficha técnica'],
  ['reportes', 'fa-file-text-o', 'Reportes'],
  ['recomendaciones', 'fa-lightbulb-o', 'Recomendaciones'],
  ['roles', 'fa-users', 'Roles y permisos'],
]

export default function AdminPanel() {
  const { perfil, salir } = useAuth()
  const datos = useMapaDatos()
  const [mod, setMod] = useState('dashboard')
  const [colapsado, setColapsado] = useState(false)
  const [claro, setClaro] = useState(() => localStorage.getItem('adm_tema') === 'claro')
  const alternarTema = () => setClaro(c => { localStorage.setItem('adm_tema', c ? 'oscuro' : 'claro'); return !c })
  const [movil, setMovil] = useState(false)
  const [pendientes, setPendientes] = useState(0)
  const [conectado, setConectado] = useState(() => navigator.onLine)

  useEffect(() => {
    supabase.from('avistamientos').select('id', { count: 'exact', head: true }).eq('estado', 'pendiente')
      .then(({ count }) => setPendientes(count || 0))
  }, [mod])

  useEffect(() => {
    const actualizarConexion = () => setConectado(navigator.onLine)
    window.addEventListener('online', actualizarConexion)
    window.addEventListener('offline', actualizarConexion)
    return () => {
      window.removeEventListener('online', actualizarConexion)
      window.removeEventListener('offline', actualizarConexion)
    }
  }, [])

  const vista = {
    dashboard: <AdminDashboard datos={datos} ir={setMod} />,
    usuarios: <AdminUsuarios />,
    rutas: <AdminRutas datos={datos} />, hides: <AdminHides datos={datos} />, avistamientos: <AdminAvistamientos datos={datos} />,
    ave: <AdminAve />, reportes: <AdminReportes />, recomendaciones: <AdminRecomendaciones datos={datos} />, roles: <AdminRoles />,
  }[mod]
  const actual = MODULOS.find(m => m[0] === mod)

  return (
    <div className={'adm-app' + (claro ? ' claro' : '')}>
      <aside className={'adm-sidebar' + (colapsado ? ' colapsado' : '') + (movil ? ' abierto' : '')}>
        <div className="adm-marca"><i className="fa fa-dot-circle-o"></i><span>Ecos de <b>Vuelo Rojo</b></span></div>
        <nav>
          {MODULOS.map(([k, ic, t]) => (
            <button key={k} className={'nav-item' + (mod === k ? ' activa' : '')} title={t} onClick={() => { setMod(k); setMovil(false) }}>
              <i className={'fa ' + ic}></i><span>{t}</span>
              {k === 'avistamientos' && pendientes > 0 && <em className="pill">{pendientes}</em>}
            </button>
          ))}
        </nav>
        <div className="adm-pie">
          <div className="adm-user"><span>{(perfil?.nombre_completo || perfil?.email || 'A')[0].toUpperCase()}</span>
            <div className="adm-user-txt">{perfil?.nombre_completo || 'Administrador'}<small>{perfil?.email}</small></div></div>
          <a href="/" title="Ver sitio"><i className="fa fa-external-link"></i><span>Ver sitio</span></a>
          <button onClick={salir} title="Cerrar sesión"><i className="fa fa-sign-out"></i><span>Cerrar sesión</span></button>
        </div>
      </aside>
      <main className="adm-main">
        <div className="adm-topbar">
          <div className="adm-top-izq">
            <button className="adm-toggle" onClick={() => (window.innerWidth <= 800 ? setMovil(!movil) : setColapsado(!colapsado))}><i className="fa fa-bars"></i></button>
            <h1><i className={'fa ' + actual[1]}></i> {actual[2]}</h1>
          </div>
          <div className="adm-top-der">
            <button className="adm-tema" onClick={alternarTema} title={claro ? 'Tema oscuro' : 'Tema claro'}><span>{claro ? 'Claro' : 'Oscuro'}</span><span className="sw"><i className={'fa ' + (claro ? 'fa-sun-o' : 'fa-moon-o')}></i></span></button>
            <span className={'adm-badge ' + (conectado ? 'conectado' : 'desconectado')} title={conectado ? 'Conexión disponible' : 'Sin conexión a internet'} aria-label={conectado ? 'Conectado' : 'Desconectado'} role="status">
              <i className="fa fa-circle"></i>
            </span>
          </div>
        </div>
        <section className="adm-contenido">
          {datos.cargando ? <p className="p-6 text-gray-500">Cargando…</p> : vista}
        </section>
      </main>
    </div>
  )
}
