import { useCallback, useEffect, useLayoutEffect, useState } from 'react'

const nav = t => `.adm-sidebar .nav-item[title="${t}"]`

export const PASOS = [
  { titulo: 'Bienvenido al panel', texto: 'Te voy a guiar por el panel con flechas. Usa "Siguiente" o las flechas del teclado. Puedes salir cuando quieras con Esc.' },
  { sel: '.adm-sidebar nav', pos: 'right', titulo: 'Menú de módulos', texto: 'Aquí están todos los módulos. Haz clic en uno para abrirlo. Yo los iré abriendo por ti.' },
  { sel: '.adm-toggle', pos: 'bottom', titulo: 'Contraer menú', texto: 'Este botón encoge o muestra el menú lateral. En el celular lo abre y lo cierra.' },
  { mod: 'dashboard', sel: nav('Dashboard'), pos: 'right', titulo: 'Dashboard', texto: 'Resumen general: totales, gráficas y últimas actividades. Las tarjetas son clicables y te llevan al módulo.' },
  { mod: 'usuarios', sel: nav('Usuarios'), pos: 'right', titulo: 'Usuarios', texto: 'Lista de personas registradas. Cambia roles y edita cuentas. El ojo en la columna de avistamientos abre los avistamientos de ese usuario.' },
  { mod: 'rutas', sel: nav('Rutas y paradas'), pos: 'right', titulo: 'Rutas y paradas', texto: 'Dibuja rutas haciendo clic en el mapa y agrega paradas con su descripción. Selecciona una ruta de la lista para editarla.' },
  { mod: 'hides', sel: nav('Hide'), pos: 'right', titulo: 'Hide', texto: 'Casetas de observación: nombre, descripción, ubicación en el mapa y si están activas para el público.' },
  { mod: 'nidos', sel: nav('Nidos'), pos: 'right', titulo: 'Nidos', texto: 'Funciona igual que Hide pero para administrar nidos. Sus ubicaciones aparecen en el mapa de turistas, sin mostrar la sección Nidos.' },
  { mod: 'videos', sel: nav('Videos'), pos: 'right', titulo: 'Videos', texto: 'Pega el enlace de YouTube, mira la vista previa y guarda. El video aparece en Inicio. Puedes ocultarlo, reordenarlo o borrarlo.' },
  { mod: 'avistamientos', sel: nav('Avistamientos'), pos: 'right', titulo: 'Avistamientos', texto: 'Aquí llegan los reportes de los usuarios. El número rojo indica cuántos esperan revisión.' },
  { mod: 'avistamientos', sel: '.adm-contenido .adm-tab', pos: 'bottom', titulo: 'Filtro por estado', texto: 'Filtra por Todos, Pendiente, Aprobado o Rechazado. Abre cada tarjeta para aprobar, rechazar o comentar.' },
  { mod: 'avistamientos', sel: '.adm-contenido input[type="search"]', pos: 'bottom', titulo: 'Buscador', texto: 'Escribe nombre, especie, hide, ruta, fecha o número y la lista se filtra al instante.' },
  { mod: 'ave', sel: nav('Ficha técnica'), pos: 'right', titulo: 'Ficha técnica', texto: 'Información de la Paraba Frente Roja. Edita y guarda; se refleja en el sitio público.' },
  { mod: 'reportes', sel: nav('Reportes'), pos: 'right', titulo: 'Reportes', texto: 'Genera informes y expórtalos a PDF (rojo) o Excel (verde).' },
  { mod: 'recomendaciones', sel: nav('Recomendaciones'), pos: 'right', titulo: 'Recomendaciones', texto: 'Consejos para los visitantes. Agrega, edita u oculta.' },
  { mod: 'roles', sel: nav('Roles y permisos'), pos: 'right', titulo: 'Roles y permisos', texto: 'Define qué puede hacer cada tipo de usuario. Cambia permisos con cuidado.' },
  { sel: '.adm-manual', pos: 'bottom', titulo: 'Manual', texto: 'Este botón abre el manual escrito y, desde ahí, puedes repetir este recorrido.' },
  { sel: '.adm-color', pos: 'bottom', titulo: 'Color del tema', texto: 'Elige cualquier color y todo el panel se adapta; las letras siempre se ajustan para leerse bien.' },
  { sel: '.adm-tema', pos: 'bottom', titulo: 'Tema', texto: 'Cambia entre Negro, Verde, Blanco y Mi color. Se recuerda tu elección.' },
  { sel: '.adm-badge', pos: 'bottom', titulo: 'Conexión', texto: 'Verde: hay internet. Rojo: sin conexión, no se podrá guardar.' },
  { sel: '.adm-pie', pos: 'right', titulo: 'Tu cuenta', texto: 'Aquí ves tu usuario, abres el sitio público con "Ver sitio" o cierras sesión.' },
  { titulo: '¡Listo!', texto: 'Ya conoces el panel. Puedes repetir el recorrido cuando quieras desde el botón del libro.' },
]

const ANCHO = 330

export default function AdminTour({ ir, cerrar }) {
  const [i, setI] = useState(0)
  const [rect, setRect] = useState(null)
  const paso = PASOS[i]

  useEffect(() => { if (paso.mod) ir(paso.mod) }, [i]) // eslint-disable-line react-hooks/exhaustive-deps

  const medir = useCallback(() => {
    const el = paso.sel && document.querySelector(paso.sel)
    if (!el) { setRect(null); return }
    el.scrollIntoView({ block: 'nearest', inline: 'nearest' })
    const r = el.getBoundingClientRect()
    setRect({ x: r.left, y: r.top, w: r.width, h: r.height })
  }, [paso])

  useLayoutEffect(() => {
    medir()
    const t1 = setTimeout(medir, 150), t2 = setTimeout(medir, 600)
    window.addEventListener('resize', medir)
    return () => { clearTimeout(t1); clearTimeout(t2); window.removeEventListener('resize', medir) }
  }, [medir])

  useEffect(() => {
    const tecla = e => {
      if (e.key === 'Escape') cerrar()
      else if (e.key === 'ArrowRight') setI(n => Math.min(n + 1, PASOS.length - 1))
      else if (e.key === 'ArrowLeft') setI(n => Math.max(n - 1, 0))
    }
    window.addEventListener('keydown', tecla)
    return () => window.removeEventListener('keydown', tecla)
  }, [cerrar])

  const vw = window.innerWidth, vh = window.innerHeight
  let estilo, flecha = {}, pos = 'centro'
  if (rect) {
    pos = paso.pos === 'right' && rect.x + rect.w + ANCHO + 24 < vw ? 'right' : 'bottom'
    if (pos === 'right') {
      estilo = { left: rect.x + rect.w + 16, top: Math.max(12, Math.min(rect.y, vh - 240)) }
      flecha = { top: Math.min(Math.max(rect.y + rect.h / 2 - estilo.top - 8, 14), 200) }
    } else {
      const left = Math.max(12, Math.min(rect.x + rect.w / 2 - ANCHO / 2, vw - ANCHO - 12))
      const top = rect.y + rect.h + 16
      estilo = { left, top: Math.min(top, vh - 240) }
      flecha = { left: Math.min(Math.max(rect.x + rect.w / 2 - left - 8, 14), ANCHO - 30) }
    }
  } else estilo = { left: vw / 2 - ANCHO / 2, top: vh / 2 - 100 }

  const ultimo = i === PASOS.length - 1
  return (
    <div className="tour-capa">
      {rect
        ? <div className="tour-foco" style={{ left: rect.x - 6, top: rect.y - 6, width: rect.w + 12, height: rect.h + 12 }} />
        : <div className="tour-oscuro" />}
      <div className={'tour-caja ' + pos} style={{ ...estilo, width: ANCHO }}>
        {rect && <span className="tour-flecha" style={flecha}></span>}
        <small>Paso {i + 1} de {PASOS.length}</small>
        <h4>{paso.titulo}</h4>
        <p>{paso.texto}</p>
        <div className="tour-barra"><i style={{ width: ((i + 1) / PASOS.length) * 100 + '%' }}></i></div>
        <div className="tour-acc">
          <button className="tour-salir" onClick={cerrar}>Salir</button>
          <span>
            {i > 0 && <button className="btn-sec" onClick={() => setI(i - 1)}><i className="fa fa-arrow-left"></i> Atrás</button>}
            <button className="btn-rojo" onClick={() => (ultimo ? cerrar() : setI(i + 1))}>{ultimo ? 'Terminar' : <>Siguiente <i className="fa fa-arrow-right"></i></>}</button>
          </span>
        </div>
      </div>
    </div>
  )
}
