import { useEffect, useState } from 'react'
import '@google/model-viewer'
import { supabase } from '../lib/supabase'
import { colorearParaba, HEX_DEFECTO, PARTES_COLOR, URL_MODELO } from '../lib/colorearParaba'
import { exportarFicha } from '../lib/exportar'

const CAMPOS = [
  ['nombre_comun', 'Nombre común'], ['nombre_cientifico', 'Nombre científico'], ['familia', 'Familia'],
  ['estado_conservacion', 'Estado de conservación'], ['habitat', 'Hábitat'], ['alimentacion', 'Alimentación'],
]

const LISTAS = ['datos', 'tarjetas', 'estadisticas', 'poblacion', 'ciclo']
const normalizar = d => ({ ...d, ...Object.fromEntries(LISTAS.map(k => [k, Array.isArray(d[k]) ? d[k] : []])) })

export default function AdminAve() {
  const [ave, setAve] = useState(null)
  const [colores, setColores] = useState({})
  const [src, setSrc] = useState(null)
  const [msg, setMsg] = useState(null)
  const [cols, setCols] = useState([])

  useEffect(() => {
    supabase.from('aves').select('*').order('creado_en').limit(1).maybeSingle().then(({ data }) => {
      setAve(data ? normalizar(data) : null)
      setCols(data ? Object.keys(data) : [])
      setColores(data?.colores_modelo || {})
    })
  }, [])

  useEffect(() => {
    let url, vivo = true
    const t = setTimeout(() => colorearParaba(colores).then(u => { url = u; if (vivo) setSrc(u) }).catch(() => setSrc(URL_MODELO)), 300)
    return () => { vivo = false; clearTimeout(t); if (url) setTimeout(() => URL.revokeObjectURL(url), 2000) }
  }, [colores])

  if (!ave) return (
    <div className="adm-pagina">
      <h3 className="adm-h">Ficha técnica</h3>
      <p className="text-gray-500 mb-3">Aún no hay ficha registrada en la tabla <code>aves</code>.</p>
      <button className="btn-rojo" onClick={async () => {
        const r = await supabase.from('aves').insert({ nombre_comun: 'Paraba Frente Roja', nombre_cientifico: 'Ara rubrogenys' }).select().single()
        if (r.error) setMsg({ t: 'err', m: r.error.message }); else setAve(normalizar(r.data))
      }}>Crear ficha</button>
      {msg && <p className="text-sm text-red-600 mt-2">{msg.m}</p>}
    </div>
  )

  const set = (k, v) => setAve({ ...ave, [k]: v })
  const setLista = (k, i, c) => set(k, ave[k].map((x, j) => (j === i ? { ...x, ...c } : x)))
  const quitar = (k, i) => set(k, ave[k].filter((_, j) => j !== i))

  const guardar = async () => {
    const { id, creado_en, ...resto } = ave
    void creado_en
    const payload = Object.fromEntries(Object.entries({ ...resto, colores_modelo: colores }).filter(([k]) => cols.includes(k)))
    const r = await supabase.from('aves').update(payload).eq('id', id)
    const faltan = LISTAS.filter(k => !cols.includes(k))
    if (r.error) setMsg({ t: 'err', m: r.error.message })
    else if (faltan.length) setMsg({ t: 'err', m: 'Guardado parcial: faltan columnas en la tabla aves (' + faltan.join(', ') + ')' })
    else setMsg({ t: 'ok', m: 'Guardado' })
  }

  return (
    <div className="adm-pagina">
      <div className="flex items-center justify-between flex-wrap gap-2">
        <h3 className="adm-h">Ficha técnica</h3>
        <div className="flex gap-2">
          <button className="btn-rojo" onClick={() => exportarFicha({ ...ave, colores_modelo: colores }, 'pdf')}>Exportar PDF</button>
          <button className="btn-sec" onClick={() => exportarFicha(ave, 'excel')}>Exportar Excel</button>
          <button className="btn-rojo" onClick={guardar}>Guardar cambios</button>
        </div>
      </div>
      {msg && <p className={'text-sm ' + (msg.t === 'err' ? 'text-red-600' : 'text-green-700')}>{msg.m}</p>}

      <div className="grid md:grid-cols-2 gap-4 mt-3">
        <div className="adm-caja">
          <b className="text-sm">Modelo 3D · colores</b>
          <div style={{ height: 300 }}>
            {src && <model-viewer src={src} camera-controls autoplay exposure="1.1" environment-image="neutral" shadow-intensity="0"
              camera-orbit="40deg 78deg 150%" style={{ width: '100%', height: '100%' }} />}
          </div>
          <div className="grid grid-cols-2 gap-2 mt-2">
            {PARTES_COLOR.map(([k, t]) => (
              <label key={k} className="flex items-center gap-2 text-xs">
                <input type="color" value={colores[k] || HEX_DEFECTO[k]} onChange={e => setColores({ ...colores, [k]: e.target.value })} /> {t}
              </label>
            ))}
          </div>
          <button className="text-xs text-primary mt-2" onClick={() => setColores({})}>Restablecer colores</button>
        </div>

        <div className="adm-caja">
          <b className="text-sm">Información</b>
          {CAMPOS.map(([k, t]) => (
            <label key={k} className="block text-xs mt-1">{t}<input className="campo mb-0" value={ave[k] || ''} onChange={e => set(k, e.target.value)} /></label>
          ))}
          <label className="block text-xs mt-1">Descripción<textarea className="campo mb-0" rows={4} value={ave.descripcion || ''} onChange={e => set('descripcion', e.target.value)} /></label>
          <label className="block text-xs mt-1">Distribución<textarea className="campo mb-0" rows={2} value={ave.distribucion || ''} onChange={e => set('distribucion', e.target.value)} /></label>
        </div>
      </div>

      <div className="adm-caja mt-4">
        <div className="flex justify-between"><b className="text-sm">Cuadros destacados (longitud, peso…)</b>
          <button className="btn-sec" onClick={() => set('estadisticas', [...ave.estadisticas, { icono: 'fa-info-circle', valor: '', etiqueta: 'Nuevo' }])}>+ Agregar</button></div>
        {ave.estadisticas.map((e, i) => (
          <div key={i} className="flex gap-2 mt-1">
            <input className="campo mb-0" style={{ maxWidth: 150 }} placeholder="icono fa-…" value={e.icono || ''} onChange={x => setLista('estadisticas', i, { icono: x.target.value })} />
            <input className="campo mb-0" placeholder="Valor (~60 cm)" value={e.valor} onChange={x => setLista('estadisticas', i, { valor: x.target.value })} />
            <input className="campo mb-0" placeholder="Etiqueta (Longitud)" value={e.etiqueta} onChange={x => setLista('estadisticas', i, { etiqueta: x.target.value })} />
            <button onClick={() => quitar('estadisticas', i)} className="text-primary"><i className="fa fa-trash"></i></button>
          </div>
        ))}
      </div>

      <div className="adm-caja mt-4">
        <div className="flex justify-between"><b className="text-sm">Datos (lista)</b>
          <button className="btn-sec" onClick={() => set('datos', [...ave.datos, { k: 'Nuevo', v: '' }])}>+ Agregar</button></div>
        {ave.datos.map((d, i) => (
          <div key={i} className="flex gap-2 mt-1">
            <input className="campo mb-0" value={d.k} onChange={e => setLista('datos', i, { k: e.target.value })} />
            <input className="campo mb-0" value={d.v} onChange={e => setLista('datos', i, { v: e.target.value })} />
            <button onClick={() => quitar('datos', i)} className="text-primary"><i className="fa fa-trash"></i></button>
          </div>
        ))}
      </div>

      <div className="adm-caja mt-4">
        <div className="flex justify-between"><b className="text-sm">Tarjetas (cards)</b>
          <button className="btn-sec" onClick={() => set('tarjetas', [...ave.tarjetas, { icono: 'fa-info-circle', titulo: 'Nueva tarjeta', texto: '' }])}>+ Nueva card</button></div>
        {ave.tarjetas.map((t, i) => (
          <div key={i} className="flex gap-2 mt-2 items-start">
            <input className="campo mb-0" style={{ maxWidth: 140 }} placeholder="icono fa-…" value={t.icono || ''} onChange={e => setLista('tarjetas', i, { icono: e.target.value })} />
            <input className="campo mb-0" placeholder="Título" value={t.titulo} onChange={e => setLista('tarjetas', i, { titulo: e.target.value })} />
            <textarea className="campo mb-0" rows={2} placeholder="Texto" value={t.texto} onChange={e => setLista('tarjetas', i, { texto: e.target.value })} />
            <button onClick={() => quitar('tarjetas', i)} className="text-primary"><i className="fa fa-trash"></i></button>
          </div>
        ))}
        {!ave.tarjetas.length && <p className="text-xs text-gray-400 mt-1">Sin tarjetas.</p>}
      </div>

      <div className="adm-caja mt-4">
        <div className="flex justify-between"><b className="text-sm">Estado de población (barras 0-100)</b>
          <button className="btn-sec" onClick={() => set('poblacion', [...ave.poblacion, { etiqueta: 'Nueva barra', valor: 50, color: '#D32F2F' }])}>+ Agregar</button></div>
        {ave.poblacion.map((p, i) => (
          <div key={i} className="flex gap-2 mt-1 items-center">
            <input className="campo mb-0" placeholder="Etiqueta" value={p.etiqueta} onChange={x => setLista('poblacion', i, { etiqueta: x.target.value })} />
            <input className="campo mb-0" style={{ maxWidth: 90 }} type="number" min="0" max="100" value={p.valor} onChange={x => setLista('poblacion', i, { valor: x.target.value })} />
            <input type="color" value={p.color || '#D32F2F'} onChange={x => setLista('poblacion', i, { color: x.target.value })} />
            <button onClick={() => quitar('poblacion', i)} className="text-primary"><i className="fa fa-trash"></i></button>
          </div>
        ))}
      </div>

      <div className="adm-caja mt-4">
        <div className="flex justify-between"><b className="text-sm">Ciclo anual</b>
          <button className="btn-sec" onClick={() => set('ciclo', [...ave.ciclo, { periodo: 'Mes – Mes', texto: '' }])}>+ Agregar</button></div>
        {ave.ciclo.map((c, i) => (
          <div key={i} className="flex gap-2 mt-1">
            <input className="campo mb-0" style={{ maxWidth: 160 }} placeholder="Periodo" value={c.periodo} onChange={x => setLista('ciclo', i, { periodo: x.target.value })} />
            <input className="campo mb-0" placeholder="Descripción" value={c.texto} onChange={x => setLista('ciclo', i, { texto: x.target.value })} />
            <button onClick={() => quitar('ciclo', i)} className="text-primary"><i className="fa fa-trash"></i></button>
          </div>
        ))}
      </div>

      <div className="adm-caja mt-4">
        <b className="text-sm"><i className="fa fa-eye"></i> Previsualizar · así se ve la ficha técnica</b>
        <div className="grid md:grid-cols-2 gap-6 mt-3">
          <div style={{ height: 380 }} className="rounded-xl bg-gray-50">
            {src && <model-viewer src={src} camera-controls autoplay exposure="1.1" environment-image="neutral" shadow-intensity="0"
              camera-orbit="40deg 78deg 150%" style={{ width: '100%', height: '100%' }} />}
          </div>
          <div>
            <span className="inline-block bg-red-100 text-red-700 text-xs font-semibold px-3 py-1 rounded-full mb-3">{ave.estado_conservacion || '—'}</span>
            <h2 className="text-3xl font-bold">{ave.nombre_comun || 'Sin nombre'}</h2>
            <p className="italic text-gray-500 mb-3">{ave.nombre_cientifico} {ave.familia && `· ${ave.familia}`}</p>
            <p className="text-gray-600 mb-4">{ave.descripcion}</p>
            <div className="grid grid-cols-2 gap-2 mb-4">
              {ave.estadisticas.map((e, i) => <div key={i} className="border rounded-lg p-2 text-center"><i className={'fa text-primary ' + (e.icono || '')}></i><b className="block">{e.valor}</b><span className="text-xs text-gray-500">{e.etiqueta}</span></div>)}
            </div>
            <ul className="text-sm space-y-2">
              {ave.datos.map(d => [d.k, d.v])
                .filter(([, v]) => v).map(([k, v], i) => (
                  <li className="flex justify-between gap-3 border-b pb-2" key={i}><span className="font-medium">{k}</span><span className="text-gray-600 text-right">{v}</span></li>
                ))}
            </ul>
          </div>
        </div>
        <div className="grid sm:grid-cols-2 lg:grid-cols-4 gap-3 mt-5">
          {ave.tarjetas.map((t, i) => (
            <div key={i} className="border rounded-xl p-4 bg-white shadow-sm">
              <i className={'fa text-2xl text-primary ' + (t.icono || 'fa-info-circle')}></i>
              <h4 className="font-bold mt-2">{t.titulo}</h4>
              <p className="text-sm text-gray-600">{t.texto}</p>
            </div>
          ))}
        </div>
        {ave.poblacion.length > 0 && <div className="mt-5"><b>Estado de población</b>
          {ave.poblacion.map((p, i) => <div className="dash-barra" key={i}><span>{p.etiqueta}</span><div><i style={{ width: (Number(p.valor) || 0) + '%', background: p.color || '#D32F2F' }}></i></div><b>{p.valor}%</b></div>)}</div>}
        {ave.ciclo.length > 0 && <div className="mt-4"><b>Ciclo anual</b>
          <div className="grid sm:grid-cols-2 lg:grid-cols-4 gap-3 mt-2">{ave.ciclo.map((c, i) => <div key={i} className="border rounded-xl p-3"><b className="text-primary block">{c.periodo}</b><span className="text-sm text-gray-600">{c.texto}</span></div>)}</div></div>}
      </div>
    </div>
  )
}