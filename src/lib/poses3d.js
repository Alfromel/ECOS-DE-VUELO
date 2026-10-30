export const POSES = [
  { id: 'vuelo', icono: 'fa-send', titulo: 'Volando' },
]

export function aplicarPose(el) {
  if (!el) return
  el.orientation = '0deg 0deg 0deg'
  el.autoRotate = false
  el.cameraOrbit = '40deg 78deg 150%'
  el.timeScale = 1
  try { el.play({ repetitions: Infinity }) } catch { /* el modelo aún no carga; se reaplica en el evento load */ }
}
