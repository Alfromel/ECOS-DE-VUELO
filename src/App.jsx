import { useEffect, useState } from 'react'
import useVista from './hooks/useVista'
import useUbicacion from './hooks/useUbicacion'
import useClima from './hooks/useClima'
import useEfectosPagina from './hooks/useEfectosPagina'
import useMapaDatos from './hooks/useMapaDatos'
import { useAuth } from './hooks/useAuth'
import Header from './components/Header'
import Inicio from './components/Inicio'
import Nosotros from './components/Nosotros'
import MapaRutas from './components/MapaRutas'
import ClimaCard from './components/ClimaCard'
import Recomendaciones from './components/Recomendaciones'
import HideCard from './components/HideCard'
import Reportes from './components/Reportes'
import FichaAve from './components/FichaAve'
import TabBar from './components/TabBar'
import AuthModal from './components/AuthModal'
import Bloqueado from './components/Bloqueado'

export default function App() {
  const { vista } = useVista()
  const { pos, posClima } = useUbicacion()
  const { clima, lugar } = useClima(posClima)
  const { rol, puede } = useAuth()
  const datos = useMapaDatos()
  const [login, setLogin] = useState(false)
  useEfectosPagina()

  const registrado = rol !== 'invitado'

  // Los datos de Hide dependen de la sesión: recargar al cambiar de rol
  useEffect(() => { datos.recargar() }, [rol]) // eslint-disable-line react-hooks/exhaustive-deps

  useEffect(() => {
    const fijar = () => {
      const h = document.querySelector('header')
      if (h) document.documentElement.style.setProperty('--hh', h.offsetHeight + 'px')
    }
    fijar()
    window.addEventListener('resize', fijar)
    return () => window.removeEventListener('resize', fijar)
  }, [vista])

  const grid1 = vista === 'mapa' || vista === 'clima'
  const grid2 = ['recomendaciones', 'hide', 'reportes', 'ave'].includes(vista)
  const oculto = visible => (visible ? '' : ' vista-oculta')
  const abrirLogin = () => setLogin(true)

  return (
    <>
      <Header vista={vista} onLogin={abrirLogin} />
      <Inicio activa={vista === 'inicio'} clima={clima} lugar={lugar} />
      <Nosotros activa={vista === 'nosotros'} />

      <main className="container mx-auto px-4 py-12">
        <div className={'grid grid-cols-1 md:grid-cols-3 gap-6 mb-12' + oculto(grid1)}>
          <MapaRutas activa={vista === 'mapa'} pos={pos} datos={datos} />
          <ClimaCard activa={vista === 'clima'} clima={clima} lugar={lugar} />
        </div>

        <div className={'grid grid-cols-1 md:grid-cols-3 gap-6' + oculto(grid2)}>
          <Recomendaciones activa={vista === 'recomendaciones'} />
          {registrado ? <HideCard activa={vista === 'hide'} datos={datos} /> : <Bloqueado activa={vista === 'hide'} titulo="Hide" abrirLogin={abrirLogin} />}
          {registrado && puede('ver_reportes') !== false ? <Reportes activa={vista === 'reportes'} /> : <Bloqueado activa={vista === 'reportes'} titulo="Reportes" abrirLogin={abrirLogin} />}
          <FichaAve activa={vista === 'ave'} />
        </div>
      </main>

      <TabBar vista={vista} />
      <AuthModal abierto={login} onCerrar={() => setLogin(false)} />
    </>
  )
}
