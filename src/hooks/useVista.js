import { useCallback, useEffect, useState } from 'react'

export const RUTAS = {
  '': 'inicio', inicio: 'inicio', mapa: 'mapa', ficha: 'ave', ave: 'ave',
  clima: 'clima', reportes: 'reportes', alertas: 'reportes', hide: 'hide', admin: 'admin', recomendaciones: 'recomendaciones', nosotros: 'nosotros',
}

// Hash con parámetro opcional: #mapa/3 abre el mapa enfocando el Hide 3
const leer = hash => {
  const [base, param] = (hash || '').replace('#', '').split('/')
  return { vista: RUTAS[base] || 'inicio', param: param || null }
}

export default function useVista() {
  const [estado, setEstado] = useState(() => leer(location.hash))

  const ir = useCallback((hash, push) => {
    const e = leer(hash)
    if (push) {
      const base = e.vista === 'ave' ? 'ficha' : e.vista
      history.pushState(null, '', e.vista === 'inicio' ? location.pathname : '#' + base + (e.param ? '/' + e.param : ''))
    }
    setEstado(e)
  }, [])

  useEffect(() => {
    const onClick = e => {
      const a = e.target.closest('a[href^="#"], [data-ir]')
      if (!a) return
      e.preventDefault()
      e.stopPropagation()
      ir(a.dataset.ir ? '#' + a.dataset.ir : a.getAttribute('href'), true)
    }
    const onPop = () => ir(location.hash, false)
    window.addEventListener('hashchange', onPop)
    document.addEventListener('click', onClick, true)
    window.addEventListener('popstate', onPop)
    return () => {
      window.removeEventListener('hashchange', onPop)
      document.removeEventListener('click', onClick, true)
      window.removeEventListener('popstate', onPop)
    }
  }, [ir])

  useEffect(() => {
    document.body.dataset.vista = estado.vista
    window.scrollTo(0, 0)
  }, [estado])

  return estado
}
