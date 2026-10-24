import { useEffect } from 'react'

const SELECTOR_TILT = '.tarjeta-3d, .dato-3d, .clima-item'

// Inclinación 3D con el cursor (delegada: también sirve para elementos creados después)
// y aparición de elementos .reveal al hacer scroll.
export default function useEfectosPagina() {
  useEffect(() => {
    let actual = null
    const reset = () => { if (actual) actual.style.transform = ''; actual = null }
    const onMove = e => {
      const el = e.target.closest?.(SELECTOR_TILT)
      if (el !== actual) reset()
      if (!el) return
      actual = el
      const r = el.getBoundingClientRect()
      el.style.transform = `perspective(600px) rotateX(${(0.5 - (e.clientY - r.top) / r.height) * 14}deg) rotateY(${((e.clientX - r.left) / r.width - 0.5) * 14}deg) translateZ(6px)`
    }
    document.addEventListener('pointermove', onMove)
    document.documentElement.addEventListener('pointerleave', reset)

    const obs = new IntersectionObserver(es => es.forEach(en => {
      if (en.isIntersecting) { en.target.classList.add('visible'); obs.unobserve(en.target) }
    }), { threshold: 0.15 })
    document.querySelectorAll('.reveal').forEach(el => obs.observe(el))

    return () => {
      document.removeEventListener('pointermove', onMove)
      document.documentElement.removeEventListener('pointerleave', reset)
      obs.disconnect()
    }
  }, [])
}
