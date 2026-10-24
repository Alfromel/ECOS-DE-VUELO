import { useEffect, useState } from 'react'
import { pedirClima, pedirLugar } from '../lib/clima'

const INICIAL = {
  temp: '28°C', desc: 'Parcialmente nublado', hum: '65% Humedad', lluvia: '30% Prob. de lluvia',
  viento: '12 km/h Viento', sens: '31°C Sensación', hora: 'Actualizado 8:30 am', icono: 'fa-sun-o', horas: [], dias: [],
}

export default function useClima(coords) {
  const [clima, setClima] = useState(INICIAL)
  const [lugar, setLugar] = useState('Villa Tunari, Cochabamba')

  useEffect(() => {
    const ctrl = new AbortController()
    const [lat, lon] = coords
    pedirClima(lat, lon, ctrl.signal).then(setClima).catch(() => {})
    pedirLugar(lat, lon, ctrl.signal).then(setLugar).catch(() => {})
    return () => ctrl.abort()
  }, [coords])

  return { clima, lugar }
}
