import { RUTAS } from '../hooks/useVista'
import { useAuth } from '../hooks/useAuth'

const ENLACES = [
  ['#', 'Inicio'], ['#mapa', 'Mapa'], ['#ficha', 'Ficha técnica'], ['#clima', 'Clima'],
  ['#hide', 'Hide'], ['#reportes', 'Reportes'], ['#recomendaciones', 'Recomendaciones'], ['#nosotros', 'Nosotros'],
]

const SOLO_REGISTRADOS = ['#hide', '#reportes']
const SOLO_MOVIL = ['#clima']

export default function Header({ vista, onLogin }) {
  const { rol, perfil, noLeidos, salir } = useAuth()
  const enlaces = ENLACES.filter(([href]) => !SOLO_MOVIL.includes(href) && (rol !== 'invitado' || !SOLO_REGISTRADOS.includes(href)))
  return (
    <header className="sticky top-0 z-50 bg-white shadow-sm">
      <div className="container mx-auto px-4 py-3 flex items-center justify-between">
        <a href="#" className="logo-marca flex items-center gap-2">
          <span className="logo-ave" aria-hidden="true">
            <svg viewBox="0 0 48 48" width="30" height="30">
              <rect width="48" height="48" rx="12" fill="#166534" />
              <path d="M16 22C16 13 22 8 29 8c4.500 0 7.500 2.500 8 6l-.5 1c0 7-3.500 12-7 17l-1.500 11h-6l1.500-10C19 30 16 27 16 22z" fill="#fff" />
              <path d="M29 8c4.500 0 7.500 2.500 8 6l-6 2c-.5-3-1.500-5.500-2-8z" fill="#DC2626" />
              <path d="M36 14c5 0 8 3.500 6.500 7.500-.8 2-3 1.800-3.200-.2-.2-2-1.500-3.800-3.300-4z" fill="#111827" />
              <circle cx="31.500" cy="15.500" r="1.800" fill="#166534" />
              <path d="M21 22c4 1 7 5 6.500 12-4-2-7-6-6.500-12z" fill="#166534" opacity=".85" />
            </svg>
          </span>
          <div>
            <h1 className="font-bold text-lg text-dark leading-tight">Ecos de Vuelo Rojo</h1>
            <p className="logo-sub">Ara rubrogenys · Bolivia</p>
          </div>
        </a>

        <nav className="hidden md:flex items-center gap-8">
          {enlaces.map(([href, texto]) => {
            const activo = (RUTAS[href.slice(1)] || 'inicio') === vista
            return (
              <a key={href} href={href}
                className={'nav-link font-medium ' + (activo ? 'text-primary border-b-2 border-primary pb-1' : 'text-gray-600')}>
                {texto}
                {href === '#reportes' && noLeidos > 0 && <span className="punto-notif" title={noLeidos + ' sin leer'}></span>}
              </a>
            )
          })}
        </nav>

        {rol === 'invitado' ? (
          <button onClick={onLogin} className="bg-secondary hover:bg-secondary/90 text-white px-4 py-2 rounded-md transition">
            Iniciar sesión
          </button>
        ) : (
          <div className="flex items-center gap-3">
            {rol === 'admin' && <a href="/admin.html" className="bg-primary text-white px-3 py-2 rounded-md text-sm">Panel admin</a>}
            <span className="hidden sm:block text-sm text-gray-600">{perfil?.nombre_completo || perfil?.email}</span>
            <button onClick={salir} className="bg-secondary text-white px-4 py-2 rounded-md transition">Salir</button>
          </div>
        )}
      </div>
    </header>
  )
}
