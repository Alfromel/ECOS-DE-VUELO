import { useEffect, useState } from 'react'
import { useAuth } from '../hooks/useAuth'
import { supabase } from '../lib/supabase'
import useMapaDatos from '../hooks/useMapaDatos'
import AdminDashboard from './AdminDashboard'
import AdminUsuarios from './AdminUsuarios'
import AdminRutas from './AdminRutas'
import AdminHides from './AdminHides'
import AdminVideos from './AdminVideos'
import AdminManual from './AdminManual'
import AdminTour from './AdminTour'
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
  ['nidos', 'fa-leaf', 'Nidos'],
  ['videos', 'fa-youtube-play', 'Videos'],
  ['avistamientos', 'fa-binoculars', 'Avistamientos'],
  ['ave', 'fa-info-circle', 'Ficha técnica'],
  ['reportes', 'fa-file-text-o', 'Reportes'],
  ['recomendaciones', 'fa-lightbulb-o', 'Recomendaciones'],
  ['roles', 'fa-users', 'Roles y permisos'],
]

const hexRgb = h => [1, 3, 5].map(i => parseInt(h.slice(i, i + 2), 16))
const mezcla = (a, b, t) => '#' + a.map((v, i) => Math.round(v + (b[i] - v) * t).toString(16).padStart(2, '0')).join('')
const luz = ([r, g, b]) => [r, g, b].map(v => { v /= 255; return v <= .03928 ? v / 12.92 : ((v + .055) / 1.055) ** 2.4 }).reduce((s, v, i) => s + v * [.2126, .7152, .0722][i], 0)

// Genera variables del tema a partir de un color, garantizando texto legible
function variablesTema(hex) {
  const base = hexRgb(hex)
  const oscuro = luz(base) < .4
  const N = [0, 0, 0], B = [255, 255, 255]
  const f1 = oscuro ? mezcla(base, N, .55) : mezcla(base, B, .9)
  const paso = t => oscuro ? mezcla(base, B, t) : mezcla(base, N, t)
  return {
    '--f1': f1, '--f2': oscuro ? mezcla(base, N, .4) : mezcla(base, B, .94), '--f3': oscuro ? mezcla(base, N, .25) : '#ffffff',
    '--f4': oscuro ? mezcla(base, N, .1) : mezcla(base, B, .8), '--f5': oscuro ? paso(.12) : mezcla(base, B, .7),
    '--f6': oscuro ? mezcla(base, N, .5) : mezcla(base, B, .92), '--bd': oscuro ? paso(.2) : mezcla(base, B, .6),
    '--tx': oscuro ? '#ffffff' : '#111111', '--tx2': oscuro ? '#eeeeee' : '#222222', '--h': oscuro ? '#ffffff' : '#000000',
    '--mu': oscuro ? mezcla(base, B, .75) : mezcla(base, N, .65), '--sel': oscuro ? paso(.18) : mezcla(base, B, .75),
    '--ac': luz(base) > .6 || luz(base) < .08 ? '#D32F2F' : hex, '--ac2': '#b71c1c',
  }
}

export default function AdminPanel() {
  const { perfil, salir } = useAuth()
  const datos = useMapaDatos()
  const [mod, setMod] = useState('dashboard')
  const [colapsado, setColapsado] = useState(false)
  const [tema, setTema] = useState(() => localStorage.getItem('adm_tema') || 'oscuro')
  const [manual, setManual] = useState(false)
  const [tour, setTour] = useState(false)
  const [color, setColor] = useState(() => localStorage.getItem('adm_color') || '#2563eb')
  const elegirColor = c => { setColor(c); setTema('personal'); localStorage.setItem('adm_color', c); localStorage.setItem('adm_tema', 'personal') }
  const estiloPersonal = tema === 'personal' ? variablesTema(color) : undefined
  const alternarTema = () => setTema(t => { const sig = t === 'oscuro' ? 'verde' : t === 'verde' ? 'claro' : 'oscuro'; localStorage.setItem('adm_tema', sig); return sig })
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
    rutas: <AdminRutas datos={datos} />, hides: <AdminHides datos={datos} />,
    nidos: <AdminHides key="nidos" datos={datos} tabla="nidos" titulo="Nido" articulo="un nido" />, videos: <AdminVideos />, avistamientos: <AdminAvistamientos datos={datos} />,
    ave: <AdminAve />, reportes: <AdminReportes />, recomendaciones: <AdminRecomendaciones datos={datos} />, roles: <AdminRoles />,
  }[mod]
  const actual = MODULOS.find(m => m[0] === mod)

  const claseTema = tema === 'claro' ? ' claro' : tema === 'verde' ? ' verde' : tema === 'personal' ? ' personal' : ''
  return (
    <div className={'adm-app' + claseTema} style={estiloPersonal}>
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
            <button className="adm-manual" onClick={() => setManual(true)} title="Manual de uso"><i className="fa fa-book"></i></button>
            <button className="adm-tema" onClick={alternarTema} title={'Tema: ' + (tema === 'verde' ? 'Verde' : tema === 'claro' ? 'Blanco' : 'Negro') + ' (clic para cambiar)'}><span>{tema === 'verde' ? 'Verde' : tema === 'claro' ? 'Blanco' : tema === 'personal' ? 'Mi color' : 'Negro'}</span><span className="sw"><i className={'fa ' + (tema === 'verde' ? 'fa-leaf' : tema === 'claro' ? 'fa-sun-o' : tema === 'personal' ? 'fa-paint-brush' : 'fa-moon-o')}></i></span></button>
            <label className="adm-color" title="Elegir color del tema" style={{ background: color }}>
              <i className="fa fa-paint-brush"></i>
              <input type="color" value={color} onChange={e => elegirColor(e.target.value)} />
            </label>
            <span className={'adm-badge ' + (conectado ? 'conectado' : 'desconectado')} title={conectado ? 'Conexión disponible' : 'Sin conexión a internet'} aria-label={conectado ? 'Conectado' : 'Desconectado'} role="status">
              <i className="fa fa-circle"></i>
            </span>
          </div>
        </div>
        <section className="adm-contenido">
          {datos.cargando ? <p className="adm-cargando"><i className="fa fa-spinner fa-spin"></i> Cargando…</p> : vista}
        </section>
      </main>
      {manual && <AdminManual cerrar={() => setManual(false)} iniciarTour={() => { setManual(false); setTour(true) }} />}
      {tour && <AdminTour ir={setMod} cerrar={() => { setTour(false); setMod('dashboard') }} />}
    </div>
  )
}
