// Convierte texto a { lat, lng }: "lat, lng" o Plus Code (completo o corto, ej. V3VR+3QX).
const ALFABETO = '23456789CFGHJMPQRVWX'
const RES = [20, 1, 0.05, 0.0025, 0.000125]
const PLUS = /^[23456789CFGHJMPQRVWX0]{2,8}\+[23456789CFGHJMPQRVWX]{0,7}$/i

const redondear = n => +n.toFixed(6)

function decodificar(codigo) {
  const c = codigo.toUpperCase().replace('+', '').replace(/0+$/, '')
  let lat = -90, lng = -180
  const pares = Math.min(c.length, 10)
  for (let i = 0; i < pares; i += 2) {
    lat += ALFABETO.indexOf(c[i]) * RES[i / 2]
    lng += ALFABETO.indexOf(c[i + 1] ?? c[i]) * RES[i / 2]
  }
  let alto = RES[Math.ceil(pares / 2) - 1], ancho = alto
  if (c.length > 10) {
    const n = ALFABETO.indexOf(c[10])
    alto = RES[4] / 5; ancho = RES[4] / 4
    lat += Math.floor(n / 4) * alto
    lng += (n % 4) * ancho
  }
  return { lat: lat + alto / 2, lng: lng + ancho / 2, alto, ancho }
}

function prefijo(lat, lng, digitos) {
  let la = Math.min(Math.max(lat, -90), 89.999999) + 90, lo = ((lng + 180) % 360 + 360) % 360
  let s = ''
  for (let i = 0; i < digitos / 2; i++) {
    const la_i = Math.min(Math.floor(la / RES[i]), 19), lo_i = Math.min(Math.floor(lo / RES[i]), 19)
    s += ALFABETO[la_i] + ALFABETO[lo_i]
    la -= la_i * RES[i]; lo -= lo_i * RES[i]
  }
  return s
}

function plusCode(codigo, ref) {
  const pos = codigo.indexOf('+')
  const faltan = 8 - pos
  let completo = codigo.toUpperCase()
  if (faltan > 0) {
    if (!ref) return null
    completo = prefijo(ref.lat, ref.lng, faltan) + completo
  }
  const d = decodificar(completo)
  if (faltan > 0) {
    const area = RES[(8 - faltan) / 2 - 1] ?? 20
    const mitad = area / 2
    if (d.lat > ref.lat + mitad) d.lat -= area
    else if (d.lat < ref.lat - mitad) d.lat += area
    if (d.lng > ref.lng + mitad) d.lng -= area
    else if (d.lng < ref.lng - mitad) d.lng += area
  }
  if (Math.abs(d.lat) > 90) return null
  return { lat: redondear(d.lat), lng: redondear(d.lng) }
}

// ref: punto cercano ({lat, lng}) necesario solo para códigos cortos
export function leerCoordenadas(texto, ref) {
  const t = (texto || '').trim()
  if (!t) return null
  const palabra = t.split(/\s+/).find(p => PLUS.test(p.replace(/,$/, '')))
  if (palabra && palabra.includes('+')) return plusCode(palabra.replace(/,$/, ''), ref)
  const sinEtiqueta = t.replace(/^\s*[A-Za-z]\w*\s*:\s*/, '')
  const nums = sinEtiqueta.match(/-?\d+(?:[.,]\d+)?/g)
  if (!nums || nums.length !== 2) return null
  const [lat, lng] = nums.map(p => parseFloat(p.replace(',', '.')))
  if (isNaN(lat) || isNaN(lng) || Math.abs(lat) > 90 || Math.abs(lng) > 180) return null
  return { lat: redondear(lat), lng: redondear(lng) }
}
