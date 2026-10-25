import L from 'leaflet'
import '@tomickigrzegorz/leaflet-rotate'
import '@tomickigrzegorz/leaflet-rotate/css'

export const opcionesRotacionAdmin = {
  rotate: true,
  touchRotate: true,
  dragRotate: false,
}

export function agregarControlRotacion(mapa) {
  const Control = L.Control.extend({
    onAdd() {
      const contenedor = L.DomUtil.create('div', 'adm-brujula-control')
      const boton = L.DomUtil.create('button', 'adm-brujula', contenedor)
      boton.type = 'button'
      boton.title = 'Arrastra para girar el mapa. Toca para volver al norte.'
      boton.setAttribute('aria-label', boton.title)
      boton.innerHTML = `
        <span class="adm-brujula-norte">N</span>
        <svg viewBox="0 0 48 48" aria-hidden="true">
          <circle class="adm-brujula-anillo" cx="24" cy="24" r="20"/>
          <g class="adm-brujula-aguja">
            <path d="M24 7 31 27 24 23 17 27Z" fill="#D32F2F"/>
            <path d="M24 41 17 21 24 25 31 21Z" fill="#94A3B8"/>
            <circle cx="24" cy="24" r="3" fill="currentColor"/>
          </g>
        </svg>`

      L.DomEvent.disableClickPropagation(contenedor)
      L.DomEvent.disableScrollPropagation(contenedor)

      let arrastrando = false
      let movido = false
      let inicio = null
      const actualizar = () => {
        const aguja = boton.querySelector('.adm-brujula-aguja')
        if (aguja) aguja.style.transform = `rotate(${mapa.getBearing()}deg)`
        boton.setAttribute('aria-label', `Orientación del mapa: ${Math.round(mapa.getBearing())} grados. Arrastra para girar o toca para volver al norte.`)
      }
      const girarDesdePuntero = e => {
        const caja = boton.getBoundingClientRect()
        const dx = e.clientX - (caja.left + caja.width / 2)
        const dy = e.clientY - (caja.top + caja.height / 2)
        mapa.setBearing((Math.atan2(dx, -dy) * 180) / Math.PI)
      }
      const iniciar = e => {
        e.preventDefault()
        arrastrando = true
        movido = false
        inicio = { x: e.clientX, y: e.clientY }
        boton.setPointerCapture(e.pointerId)
        girarDesdePuntero(e)
      }
      const mover = e => {
        if (!arrastrando) return
        if (Math.hypot(e.clientX - inicio.x, e.clientY - inicio.y) > 4) movido = true
        girarDesdePuntero(e)
      }
      const soltar = () => { arrastrando = false }
      const pulsar = () => {
        if (movido) { movido = false; return }
        mapa.setBearing(0)
      }

      boton.addEventListener('pointerdown', iniciar)
      boton.addEventListener('pointermove', mover)
      boton.addEventListener('pointerup', soltar)
      boton.addEventListener('pointercancel', soltar)
      boton.addEventListener('click', pulsar)
      mapa.on('rotate', actualizar)
      actualizar()

      this._limpiar = () => {
        boton.removeEventListener('pointerdown', iniciar)
        boton.removeEventListener('pointermove', mover)
        boton.removeEventListener('pointerup', soltar)
        boton.removeEventListener('pointercancel', soltar)
        boton.removeEventListener('click', pulsar)
        mapa.off('rotate', actualizar)
      }
      return contenedor
    },
    onRemove() { this._limpiar?.() },
  })
  return new Control({ position: 'bottomleft' }).addTo(mapa)
}
