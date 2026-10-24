export const URL_MODELO = 'https://threejs.org/examples/models/gltf/Parrot.glb'

const mezcla = (a, b, t) => { t = Math.min(1, Math.max(0, t)); return a.map((v, k) => v + (b[k] - v) * t) }

const VERDE_0 = [0.05, 0.50, 0.22], VERDE_OSC_0 = [0.03, 0.34, 0.15], OLIVA_0 = [0.45, 0.58, 0.16],
  TURQ_0 = [0.0, 0.62, 0.70], COBALTO_0 = [0.02, 0.12, 0.60], ROJO_0 = [0.88, 0.03, 0.03],
  BERMELLON_0 = [0.90, 0.28, 0.06], PIEL_0 = [0.96, 0.86, 0.80],
  PICO_OSC_0 = [0.02, 0.02, 0.02], PATA_0 = [0.22, 0.20, 0.19]

const aHex = c => '#' + c.map(v => Math.round(Math.min(1, Math.max(0, v)) * 255).toString(16).padStart(2, '0')).join('')
const aRgb = h => [1, 3, 5].map(i => parseInt(h.slice(i, i + 2), 16) / 255)

export const PARTES_COLOR = [
  ['rojo', 'Frente roja', ROJO_0], ['bermellon', 'Parche tras el ojo', BERMELLON_0], ['verde', 'Verde (cuerpo)', VERDE_0],
  ['verdeOsc', 'Verde oscuro (espalda/alas)', VERDE_OSC_0], ['oliva', 'Vientre oliva', OLIVA_0], ['turquesa', 'Turquesa (alas/cola)', TURQ_0],
  ['cobalto', 'Cobalto (puntas)', COBALTO_0], ['piel', 'Piel alrededor del ojo', PIEL_0], ['pico', 'Pico', PICO_OSC_0], ['pata', 'Patas', PATA_0],
]
export const HEX_DEFECTO = Object.fromEntries(PARTES_COLOR.map(([k, , c]) => [k, aHex(c)]))

// Recolorea el loro del glb a Paraba Frente Roja (Ara rubrogenys) y devuelve una URL de objeto.
// `colores` (opcional): { rojo: '#hex', ... } sobrescribe la paleta por defecto.
export async function colorearParaba(colores = {}) {
  const p = k => (colores[k] ? aRgb(colores[k]) : null)
  const VERDE = p('verde') || VERDE_0, VERDE_OSC = p('verdeOsc') || VERDE_OSC_0, OLIVA = p('oliva') || OLIVA_0,
    TURQ = p('turquesa') || TURQ_0, COBALTO = p('cobalto') || COBALTO_0, ROJO = p('rojo') || ROJO_0,
    BERMELLON = p('bermellon') || BERMELLON_0, PIEL = p('piel') || PIEL_0,
    PICO_OSC = p('pico') || PICO_OSC_0, PATA = p('pata') || PATA_0
  const buf = await (await fetch(URL_MODELO)).arrayBuffer()
  const dv = new DataView(buf)
  const jl = dv.getUint32(12, true)
  const j = JSON.parse(new TextDecoder().decode(new Uint8Array(buf, 20, jl)))
  const bin = 20 + jl + 8
  const prim = j.meshes[0].primitives[0]
  const pa = j.accessors[prim.attributes.POSITION], ca = j.accessors[prim.attributes.COLOR_0]
  const po = bin + (j.bufferViews[pa.bufferView].byteOffset || 0)
  const co = bin + (j.bufferViews[ca.bufferView].byteOffset || 0)

  for (let i = 0; i < pa.count; i++) {
    const x = dv.getFloat32(po + i * 12, true), y = dv.getFloat32(po + i * 12 + 4, true), z = dv.getFloat32(po + i * 12 + 8, true)
    const r = dv.getFloat32(co + i * 12, true), g = dv.getFloat32(co + i * 12 + 4, true), b = dv.getFloat32(co + i * 12 + 8, true)
    const ax = Math.abs(x)
    const negro = r < 0.05 && g < 0.05 && b < 0.05, claro = r > 0.9 && g > 0.6
    let n
    if (z < -28) {
      // cola: verde → turquesa → cobalto hacia la punta
      n = z > -48 ? mezcla(VERDE, TURQ, (-28 - z) / 20) : mezcla(TURQ, COBALTO, (-48 - z) / 26)
    } else if (ax > 11 && z < 12) {
      // alas: verde cerca del cuerpo, turquesa y cobalto hacia las puntas
      n = ax < 24 ? mezcla(VERDE_OSC, TURQ, (ax - 11) / 13) : mezcla(TURQ, COBALTO, (ax - 24) / 14)
    } else if (z >= 12) {
      // cabeza
      if (negro) n = z >= 19 && y <= 2 ? PICO_OSC : [0.03, 0.03, 0.03]
      else if (claro) n = z >= 19 ? PICO_OSC : PIEL // pico negro / piel alrededor del ojo
      else if (y >= 4) n = mezcla(VERDE, ROJO, (y - 3.5) / 2.5 + (z - 16) / 20) // frente roja con transición
      else if (y >= 3 && z <= 17) n = BERMELLON // parche tras el ojo
      else n = VERDE
    } else if (y < -6 && z > -16) {
      n = PATA
    } else if (y < -2) {
      n = OLIVA // vientre
    } else {
      n = y > 8 ? VERDE_OSC : VERDE // espalda / pecho
    }
    dv.setFloat32(co + i * 12, n[0], true)
    dv.setFloat32(co + i * 12 + 4, n[1], true)
    dv.setFloat32(co + i * 12 + 8, n[2], true)
  }
  return URL.createObjectURL(new Blob([buf], { type: 'model/gltf-binary' }))
}
