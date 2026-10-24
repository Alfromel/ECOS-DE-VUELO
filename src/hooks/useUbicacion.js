import { useEffect, useState } from 'react'

export const CENTRO = [-18.0, -65.5]
const INICIAL_CLIMA = [-16.97, -65.42]

// pos: posición continua (marcador). posClima: solo cambia al moverse lo suficiente.
export default function useUbicacion() {
  const [pos, setPos] = useState(null)
  const [posClima, setPosClima] = useState(INICIAL_CLIMA)

  useEffect(() => {
    if (!navigator.geolocation) return
    let ultima = null
    const id = navigator.geolocation.watchPosition(p => {
      const { latitude: lat, longitude: lon } = p.coords
      setPos([lat, lon])
      if (!ultima || Math.abs(ultima[0] - lat) + Math.abs(ultima[1] - lon) > 0.01) {
        ultima = [lat, lon]
        setPosClima([lat, lon])
      }
    }, () => { if (!ultima) setPosClima(CENTRO) }, { enableHighAccuracy: true, maximumAge: 10000 })
    return () => navigator.geolocation.clearWatch(id)
  }, [])

  return { pos, posClima }
}
