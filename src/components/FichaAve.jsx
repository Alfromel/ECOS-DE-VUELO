import { useCallback, useEffect, useRef, useState } from 'react'
import '@google/model-viewer'
import { colorearParaba, URL_MODELO } from '../lib/colorearParaba'
import { useAuth } from '../hooks/useAuth'
import useAve from '../hooks/useAve'
import { exportarFicha } from '../lib/exportar'
import { aplicarPose } from '../lib/poses3d'
import BotonesAve3D from './BotonesAve3D'

const CARACTERISTICAS = [
  { pos: '0 6.5 20', t: 'Frente roja', d: 'Rojo intenso que da nombre a la especie.' },
  { pos: '0 1 23.5', t: 'Pico negro', d: 'Fuerte y curvo, abre semillas y frutos duros.' },
  { pos: '3 5 17', t: 'Ojo y piel clara', d: 'Iris dorado con piel crema rosada.' },
  { pos: '35 -2 2', t: 'Alas verde y azul', d: 'De verde a turquesa y cobalto en las puntas.' },
  { pos: '0 18.5 1.5', t: 'Espalda verde', d: 'Esmeralda oscuro, plumaje denso y sedoso.' },
  { pos: '0 -7 4', t: 'Vientre oliva', d: 'Verde amarillento, más cálido que el pecho.' },
  { pos: '4 -9 -12', t: 'Patas robustas', d: 'Grises, con garras negras para aferrarse.' },
  { pos: '0 0 -73', t: 'Cola en cuña', d: 'Larga y afilada, termina en azul cobalto.' },
]

// Si la columna existe en la BD se usa tal cual (aunque esté vacía); si no existe, valores por defecto
const lista = (ave, k, def) => (ave && Array.isArray(ave[k]) ? ave[k] : def)
const EST_DEF = [
  { icono: 'fa-arrows-h', valor: '~60 cm', etiqueta: 'Longitud' }, { icono: 'fa-balance-scale', valor: '~490 g', etiqueta: 'Peso' },
  { icono: 'fa-heart', valor: '30–50 años', etiqueta: 'Longevidad' }, { icono: 'fa-paw', valor: '~3 000', etiqueta: 'Individuos aprox.' },
]
const DATOS_DEF = ave => [
  { k: 'Hábitat:', v: ave?.habitat || 'Valles secos interandinos (Bolivia)' }, { k: 'Altitud:', v: '1 100 – 3 000 m s. n. m.' },
  { k: 'Alimentación:', v: ave?.alimentacion || 'Semillas, frutos y flores' }, { k: 'Nidificación:', v: 'Acantilados (nov – mar)' },
]
const TARJ_DEF = ave => [
  { icono: 'fa-map-o', titulo: 'Distribución', texto: ave?.distribucion || 'Cochabamba, Santa Cruz, Chuquisaca y Potosí, en los valles de los ríos Mizque, Grande y Caine.' },
  { icono: 'fa-comments', titulo: 'Comportamiento', texto: 'Vive en bandadas ruidosas, se desplaza al amanecer a comederos y regresa al acantilado al atardecer.' },
  { icono: 'fa-exclamation-triangle', titulo: 'Amenazas', texto: 'Pérdida de hábitat, tráfico ilegal, persecución en cultivos y envenenamiento.' },
  { icono: 'fa-shield', titulo: 'Conservación', texto: 'Reservas comunitarias, monitoreo de nidos y turismo responsable de observación.' },
]
const POB_DEF = [
  { etiqueta: 'Hábitat disponible', valor: 35 }, { etiqueta: 'Amenaza por tráfico', valor: 70, color: '#D32F2F' }, { etiqueta: 'Éxito de anidación', valor: 55, color: '#F59E0B' },
]
const CICLO_DEF = [
  { periodo: 'Jun – Oct', texto: 'Alimentación y reunión en comederos' }, { periodo: 'Nov – Dic', texto: 'Cortejo y elección de nido' },
  { periodo: 'Ene – Feb', texto: 'Incubación (2–3 huevos)' }, { periodo: 'Mar – May', texto: 'Cría y primeros vuelos' },
]
const N = CARACTERISTICAS.length
const ORBITA = window.matchMedia('(max-width: 768px)').matches ? '40deg 78deg 140%' : '40deg 78deg 150%'

export default function FichaAve({ activa }) {
  const { rol, puede } = useAuth()
  const { ave, listo } = useAve()
  const [src, setSrc] = useState(null)
  const [visibles, setVisibles] = useState(() => Array(N).fill(false))
  const [layout, setLayout] = useState(() => Array(N).fill({ lado: 'l', top: '0%' }))
  const [oculto, setOculto] = useState(true)
  const [pose, setPose] = useState('vuelo')
  const poseRef = useRef('vuelo')
  useEffect(() => { poseRef.current = pose }, [pose])

  const raiz = useRef(null)
  const caja = useRef(null)
  const mv = useRef(null)
  const dots = useRef([])
  const etqs = useRef([])
  const lineas = useRef([])
  const visRef = useRef(visibles)
  const layoutRef = useRef(layout)
  const ocultoRef = useRef(true)
  const timers = useRef([])

  useEffect(() => {
    visRef.current = visibles
    layoutRef.current = layout
  }, [visibles, layout])

  useEffect(() => {
    if (!listo) return
    let url, vivo = true
    colorearParaba(ave?.colores_modelo || {}).then(u => { url = u; if (vivo) setSrc(u) }).catch(() => setSrc(URL_MODELO))
    return () => { vivo = false; if (url) URL.revokeObjectURL(url) }
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [listo, JSON.stringify(ave?.colores_modelo || {})])

  const ocultarCaracteristicas = useCallback(() => {
    timers.current.forEach(clearTimeout)
    timers.current = []
    setVisibles(Array(N).fill(false))
  }, [])

  const asignarLados = useCallback(() => {
    const cr = caja.current.getBoundingClientRect()
    const pts = dots.current.map((d, i) => { const r = d.getBoundingClientRect(); return { i, x: r.x + 7 - cr.x, y: r.y + 7 - cr.y } })
    const lados = Array(N).fill('l')
    ;[...pts].sort((a, b) => a.x - b.x).forEach((p, k) => { lados[p.i] = k < 4 ? 'l' : 'r' })
    const nuevo = Array(N)
    ;['l', 'r'].forEach(l => {
      pts.filter(p => lados[p.i] === l).sort((a, b) => a.y - b.y).forEach((p, k) => {
        nuevo[p.i] = { lado: l, top: `calc(${(k + 0.5) * 25}% - 2rem)` }
      })
    })
    setLayout(nuevo)
    layoutRef.current = nuevo
  }, [])

  const mostrarCaracteristicas = useCallback(() => {
    ocultarCaracteristicas()
    if (!dots.current[0]) return // el modelo aún no se montó; se mostrará al cargar
    asignarLados()
    timers.current = CARACTERISTICAS.map((_, i) =>
      setTimeout(() => setVisibles(v => v.map((x, j) => (j === i ? true : x))), 500 + i * 1100))
  }, [ocultarCaracteristicas, asignarLados])

  // Flechas que siguen a cada punto
  useEffect(() => {
    let raf
    const dibujar = () => {
      if (!caja.current) return
      const cr = caja.current.getBoundingClientRect()
      for (let i = 0; i < N; i++) {
        const linea = lineas.current[i], on = visRef.current[i]
        if (!linea || !dots.current[i] || !etqs.current[i]) continue
        linea.style.opacity = on ? 1 : 0
        if (!on) continue
        const d = dots.current[i].getBoundingClientRect(), e = etqs.current[i].getBoundingClientRect()
        const ex = (layoutRef.current[i].lado === 'l' ? e.right : e.left) - cr.x, ey = e.top + e.height / 2 - cr.y
        const dx = d.x + 7 - cr.x, dy = d.y + 7 - cr.y
        const a = Math.atan2(dy - ey, dx - ex)
        linea.setAttribute('x1', ex); linea.setAttribute('y1', ey)
        linea.setAttribute('x2', dx - Math.cos(a) * 9); linea.setAttribute('y2', dy - Math.sin(a) * 9)
      }
      raf = requestAnimationFrame(dibujar)
    }
    raf = requestAnimationFrame(dibujar)
    return () => cancelAnimationFrame(raf)
  }, [])

  useEffect(() => {
    const el = mv.current
    if (!el) return
    let t
    const onLoad = () => { aplicarPose(el, poseRef.current); t = setTimeout(() => { if (!ocultoRef.current) mostrarCaracteristicas() }, 300) }
    el.addEventListener('load', onLoad)
    return () => { el.removeEventListener('load', onLoad); clearTimeout(t) }
  }, [src, mostrarCaracteristicas])

  useEffect(() => {
    const obs = new IntersectionObserver(es => es.forEach(en => {
      if (en.isIntersecting) { if (!ocultoRef.current) mostrarCaracteristicas() } else ocultarCaracteristicas()
    }), { threshold: 0.3 })
    obs.observe(raiz.current)
    return () => { obs.disconnect(); timers.current.forEach(clearTimeout) }
  }, [mostrarCaracteristicas, ocultarCaracteristicas])

  const alternar = () => {
    ocultoRef.current = !ocultoRef.current
    setOculto(ocultoRef.current)
    if (ocultoRef.current) ocultarCaracteristicas(); else mostrarCaracteristicas()
  }

  const cambiarPose = p => { setPose(p); aplicarPose(mv.current, p) }

  return (
    <div ref={raiz} className={'bg-white rounded-xl shadow-md p-5' + (activa ? '' : ' vista-oculta')} id="ficha" data-vista="ave">
      <div className="ficha-titulo">
        <span className="inline-block bg-red-100 text-red-700 text-xs font-semibold px-3 py-1 rounded-full mb-3">{ave ? ave.estado_conservacion : 'En Peligro Crítico · UICN'}</span>
        <h2 className="text-4xl font-bold text-dark">{ave ? ave.nombre_comun : 'Paraba Frente Roja'}</h2>
        <p className="italic text-gray-500 mb-2">{ave ? [ave.nombre_cientifico, ave.familia].filter(Boolean).join(' · ') : 'Ara rubrogenys · Paraba frente roja'}</p>
      </div>
      <div className="ficha-hero">
        <div className="ficha-visor">
          <div className="visor-caja" ref={caja}>
            <div className="escena" id="escena">
              <img src="/fondo-paraba.jpg" alt="Bosque vista aérea" decoding="async" />
            </div>
            {src && (
              <model-viewer ref={mv} id="mv-ave" src={src} alt="Paraba Frente Roja en 3D" camera-controls
                shadow-intensity="0" exposure="1.1" environment-image="neutral" interaction-prompt="none"
                camera-orbit={ORBITA} min-camera-orbit="auto auto 40%" max-camera-orbit="auto auto 220%" loading="eager">
                {CARACTERISTICAS.map((c, i) => (
                  <button key={i} slot={'hotspot-c' + i} data-position={c.pos}
                    ref={el => { dots.current[i] = el }} className={'hs' + (visibles[i] ? ' on' : '')}></button>
                ))}
              </model-viewer>
            )}
            <div className="hs-capa">
              <svg className="hs-svg">
                <defs>
                  <marker id="flecha" viewBox="0 0 10 10" refX="9" refY="5" markerWidth="7" markerHeight="7" orient="auto-start-reverse">
                    <path d="M0 0L10 5L0 10z" fill="#fff" />
                  </marker>
                </defs>
                {CARACTERISTICAS.map((_, i) => (
                  <line key={i} className="hs-linea" markerEnd="url(#flecha)" ref={el => { lineas.current[i] = el }} />
                ))}
              </svg>
              {CARACTERISTICAS.map((c, i) => (
                <div key={i} ref={el => { etqs.current[i] = el }} className={'hs-etq' + (visibles[i] ? ' on' : '')}
                  data-lado={layout[i].lado} style={{ top: layout[i].top }}>
                  <b>{c.t}</b><small>{c.d}</small>
                </div>
              ))}
            </div>
            <BotonesAve3D pose={pose} onPose={cambiarPose} caract={!oculto} onCaract={alternar} />
          </div>
        </div>
        <div className="ficha-datos">
          <p className="text-gray-600 mb-4">{ave ? ave.descripcion : 'Ave endémica de los valles secos interandinos de Bolivia. Su plumaje verde oliva contrasta con la frente y las mejillas rojas, y los hombros naranja-rojizos. Anida en acantilados de roca y es una de las pocas guacamayas con distribución restringida a un solo país.'}</p>
          {rol !== 'invitado' && puede('descargar_ficha') && ave && (
            <div className="flex gap-2 mb-5">
              <button className="btn-rojo" onClick={() => exportarFicha(ave, 'pdf')}><i className="fa fa-file-pdf-o"></i> Descargar PDF</button>
              <button className="btn-sec" onClick={() => exportarFicha(ave, 'excel')}><i className="fa fa-file-excel-o"></i> Descargar Excel</button>
            </div>
          )}          <div className="grid grid-cols-2 gap-3 mb-6">
            {lista(ave, 'estadisticas', EST_DEF).map((e, i) => (
              <div className="dato-3d" key={i}><i className={'fa ' + (e.icono || 'fa-info-circle')}></i><b>{e.valor}</b><span>{e.etiqueta}</span></div>
            ))}
          </div>
          <ul className="w-full text-sm space-y-2">
            {lista(ave, 'datos', DATOS_DEF(ave)).map(d => [d.k, d.v]).map(([k, v]) => (
              <li className="flex justify-between border-b pb-2" key={k}><span className="font-medium">{k}</span> <span className="text-gray-600">{v}</span></li>
            ))}
          </ul>
        </div>
      </div>

      <div className="ficha-secciones">
        {lista(ave, 'tarjetas', TARJ_DEF(ave)).map(t => [t.icono || 'fa-info-circle', t.titulo, t.texto]).map(([icono, t, p]) => (
          <div className="tarjeta-3d reveal" key={t}><i className={'fa text-2xl text-primary ' + icono}></i><h4>{t}</h4><p>{p}</p></div>
        ))}
      </div>

      {lista(ave, 'poblacion', POB_DEF).length > 0 && <>
        <h3 className="font-bold text-2xl mt-10 mb-4">Estado de población</h3>
        <div className="barras reveal">
          {lista(ave, 'poblacion', POB_DEF).map((p, i) => (
            <div key={i}><span>{p.etiqueta}</span><div className="barra"><i style={{ '--w': (Number(p.valor) || 0) + '%', background: p.color || undefined }}></i></div></div>
          ))}
        </div>
      </>}

      {lista(ave, 'ciclo', CICLO_DEF).length > 0 && <>
        <h3 className="font-bold text-2xl mt-10 mb-4">Ciclo anual</h3>
        <div className="ciclo reveal">
          {lista(ave, 'ciclo', CICLO_DEF).map((c, i) => <div key={i}><b>{c.periodo}</b><span>{c.texto}</span></div>)}
        </div>
      </>}
    </div>
  )
}
