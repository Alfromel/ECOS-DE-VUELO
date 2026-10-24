export const CODIGOS = {
  0: 'Despejado', 1: 'Mayormente despejado', 2: 'Parcialmente nublado', 3: 'Nublado',
  45: 'Niebla', 48: 'Niebla', 51: 'Llovizna', 53: 'Llovizna', 55: 'Llovizna', 61: 'Lluvia', 63: 'Lluvia',
  65: 'Lluvia fuerte', 80: 'Chubascos', 81: 'Chubascos', 82: 'Chubascos fuertes', 95: 'Tormenta',
}

export const iconoDe = k => (k >= 61 ? 'fa-tint' : k >= 2 ? 'fa-cloud' : 'fa-sun-o')

export async function pedirClima(lat, lon, signal) {
  const url = `https://api.open-meteo.com/v1/forecast?latitude=${lat}&longitude=${lon}` +
    '&current=temperature_2m,relative_humidity_2m,apparent_temperature,precipitation,weather_code,wind_speed_10m' +
    '&hourly=precipitation_probability,temperature_2m,weather_code&daily=weather_code,temperature_2m_max,temperature_2m_min,precipitation_probability_max&forecast_days=5&timezone=auto'
  const d = await (await fetch(url, { signal })).json()
  const c = d.current
  const hora = new Date(c.time).getHours()
  return {
    temp: Math.round(c.temperature_2m) + '°C',
    desc: CODIGOS[c.weather_code] || 'Variable',
    hum: c.relative_humidity_2m + '% Humedad',
    lluvia: (d.hourly.precipitation_probability[hora] ?? 0) + '% Prob. de lluvia',
    viento: Math.round(c.wind_speed_10m) + ' km/h Viento',
    sens: Math.round(c.apparent_temperature) + '°C Sensación',
    hora: 'Actualizado ' + new Date().toLocaleTimeString('es', { hour: '2-digit', minute: '2-digit' }),
    icono: iconoDe(c.weather_code),
    horas: d.hourly.time.slice(hora, hora + 12).map((t, i) => ({
      h: new Date(t).getHours() + 'h',
      icono: iconoDe(d.hourly.weather_code[hora + i]),
      temp: Math.round(d.hourly.temperature_2m[hora + i]) + '°',
      prob: d.hourly.precipitation_probability[hora + i] + '%',
    })),
    dias: d.daily.time.map((t, i) => ({
      dia: new Date(t + 'T12:00').toLocaleDateString('es', { weekday: 'short' }),
      icono: iconoDe(d.daily.weather_code[i]),
      temp: Math.round(d.daily.temperature_2m_max[i]) + '° / ' + Math.round(d.daily.temperature_2m_min[i]) + '°',
      prob: d.daily.precipitation_probability_max[i] + '% lluvia',
    })),
  }
}

export async function pedirLugar(lat, lon, signal) {
  const g = await (await fetch(`https://nominatim.openstreetmap.org/reverse?format=jsonv2&zoom=10&lat=${lat}&lon=${lon}`, { signal })).json()
  const a = g.address || {}
  return [a.city || a.town || a.village || a.county, a.state].filter(Boolean).join(', ') || 'Tu ubicación'
}
