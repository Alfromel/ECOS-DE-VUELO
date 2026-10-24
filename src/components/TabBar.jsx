import { useAuth } from '../hooks/useAuth'

const TABS = [
  ['inicio', '#', 'fa-home', 'Inicio'],
  ['mapa', '#mapa', 'fa-map-marker', 'Mapa'],
  ['ave', '#ficha', 'fa-info-circle', 'Ficha'],
  ['reportes', '#reportes', 'fa-file-text-o', 'Reportes'],
  ['hide', '#hide', 'fa-eye', 'Hide'],
]

export default function TabBar({ vista }) {
  const { rol, noLeidos } = useAuth()
  const tabs = TABS.filter(([id]) => rol !== 'invitado' || (id !== 'hide' && id !== 'reportes'))
  return (
    <nav className="app-tabbar" id="appTabbar" aria-label="Navegación móvil"
      onClick={() => { if ('vibrate' in navigator) navigator.vibrate(8) }}>
      {tabs.map(([id, href, icono, texto]) => (
        <a key={id} href={href} className={vista === id ? 'active' : ''}>
          <i className={'fa ' + icono}></i>
          {id === 'reportes' && noLeidos > 0 && <span className="punto-notif"></span>}
          <span>{texto}</span>
        </a>
      ))}
    </nav>
  )
}
