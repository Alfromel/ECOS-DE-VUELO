import { useEffect, useState } from 'react'
import { supabase } from '../lib/supabase'

const dia = d => d.toISOString().slice(0, 10)

function ultimosDias(n) {
  return Array.from({ length: n }, (_, i) => {
    const d = new Date()
    d.setDate(d.getDate() - (n - 1 - i))
    return dia(d)
  })
}

export default function AdminDashboard({ datos, ir }) {
  const [d, setD] = useState(null)

  useEffect(() => {
    let vivo = true
    Promise.all([
      supabase.from('profiles').select('id,nombre_completo,email,rol,creado_en'),
      supabase.from('avistamientos').select('id,especie,estado,creado_en,usuario_id').order('creado_en', { ascending: false }),
      supabase.from('reportes').select('id'),
      supabase.from('reportes_destinatarios').select('leido'),
      supabase.from('recomendaciones').select('id'),
    ]).then(([p, a, r, rd, rec]) => {
      if (vivo) setD({ perfiles: p.data || [], avs: a.data || [], reportes: r.data || [], dest: rd.data || [], recs: rec.data || [] })
    })
    return () => { vivo = false }
  }, [])

  if (!d) return <p className="p-6">Cargando estadísticas…</p>

  const turistas = d.perfiles.filter(p => p.rol === 'turista')
  const estado = e => d.avs.filter(a => a.estado === e).length
  const pend = estado('pendiente'), apr = estado('aprobado'), rech = estado('rechazado')
  const leidos = d.dest.filter(x => x.leido).length
  const paradas = datos?.paradas?.length ?? 0

  const kpis = [
    ['fa-road', 'Rutas', datos?.rutas?.length ?? 0, 'rutas'],
    ['fa-map-marker', 'Paradas', paradas, 'rutas'],
    ['fa-eye', 'Hides', datos?.hides?.length ?? 0, 'hides'],
    ['fa-users', 'Turistas', turistas.length, 'usuarios'],
    ['fa-binoculars', 'Avistamientos', d.avs.length, 'avistamientos'],
    ['fa-file-text-o', 'Reportes', d.reportes.length, 'reportes'],
  ]

  const dias = ultimosDias(14)
  const porDia = dias.map(f => d.avs.filter(a => (a.creado_en || '').slice(0, 10) === f).length)
  const max = Math.max(1, ...porDia)
  const W = 560, H = 160
  const pts = porDia.map((v, i) => [20 + (i * (W - 40)) / (dias.length - 1), H - 20 - (v / max) * (H - 40)])
  const linea = pts.map(p => p.join(',')).join(' ')
  const area = `20,${H - 20} ${linea} ${W - 20},${H - 20}`

  const total = Math.max(1, d.avs.length)
  const R = 52, C = 2 * Math.PI * R
  const segs = [[apr, '#D32F2F'], [pend, 'currentColor'], [rech, '#525252']]
  let acum = 0

  const porRuta = (datos?.rutas || []).map(r => ({
    n: r.nombre, c: r.color || '#D32F2F', v: (datos?.paradas || []).filter(p => p.ruta_id === r.id).length,
  }))
  const maxRuta = Math.max(1, ...porRuta.map(r => r.v))
  const nombre = id => { const u = d.perfiles.find(p => p.id === id); return u?.nombre_completo || u?.email || '—' }

  return (
    <div className="dash">
      <div className="dash-cab">
        <div>
          <h2>Dashboard</h2>
          <p>Resumen general de Ecos de Vuelo Rojo · {new Date().toLocaleDateString('es-BO', { dateStyle: 'long' })}</p>
        </div>
        {pend > 0 && <button className="dash-alerta" onClick={() => ir('avistamientos')}><i className="fa fa-bell"></i> {pend} avistamiento{pend > 1 ? 's' : ''} por evaluar</button>}
      </div>

      <div className="dash-kpis">
        {kpis.map(([ic, t, v, m]) => (
          <button key={t} className="dash-kpi" onClick={() => ir(m)}>
            <span className="ic"><i className={'fa ' + ic}></i></span>
            <small>{t}</small><b>{v}</b>
          </button>
        ))}
      </div>

      <div className="dash-grid">
        <div className="dash-card ancho">
          <h4>Avistamientos · últimos 14 días</h4>
          <svg viewBox={`0 0 ${W} ${H}`} className="dash-svg">
            {[0, 0.5, 1].map(t => <line key={t} x1="20" x2={W - 20} y1={H - 20 - t * (H - 40)} y2={H - 20 - t * (H - 40)} stroke="currentColor" strokeOpacity=".12" />)}
            <polygon points={area} fill="rgba(211,47,47,.12)" />
            <polyline points={linea} fill="none" stroke="#D32F2F" strokeWidth="2.5" />
            {pts.map((p, i) => <circle key={i} cx={p[0]} cy={p[1]} r="3.5" fill="currentColor"><title>{dias[i]}: {porDia[i]}</title></circle>)}
            <text x="20" y={H - 4} fontSize="10" fill="#6b7280">{dias[0].slice(5)}</text>
            <text x={W - 20} y={H - 4} fontSize="10" fill="#6b7280" textAnchor="end">{dias[dias.length - 1].slice(5)}</text>
          </svg>
        </div>

        <div className="dash-card">
          <h4>Estado de avistamientos</h4>
          <div className="dash-dona">
            <svg viewBox="0 0 140 140" width="140" height="140">
              <circle cx="70" cy="70" r={R} fill="none" stroke="currentColor" strokeOpacity=".1" strokeWidth="18" />
              {segs.map(([v, col], i) => {
                const len = (v / total) * C
                const el = <circle key={i} cx="70" cy="70" r={R} fill="none" stroke={col} strokeWidth="18"
                  strokeDasharray={`${len} ${C - len}`} strokeDashoffset={-acum} transform="rotate(-90 70 70)" />
                acum += len
                return el
              })}
              <text x="70" y="68" textAnchor="middle" fontSize="22" fontWeight="700" fill="currentColor">{d.avs.length}</text>
              <text x="70" y="84" textAnchor="middle" fontSize="9" fill="#6b7280">total</text>
            </svg>
            <ul>
              <li><i style={{ background: '#D32F2F' }}></i>Aprobados <b>{apr}</b></li>
              <li><i style={{ background: 'var(--h)' }}></i>Pendientes <b>{pend}</b></li>
              <li><i style={{ background: '#525252' }}></i>Rechazados <b>{rech}</b></li>
            </ul>
          </div>
        </div>

        <div className="dash-card">
          <h4>Paradas por ruta</h4>
          {porRuta.length ? porRuta.map(r => (
            <div className="dash-barra" key={r.n}>
              <span>{r.n}</span>
              <div><i style={{ width: (r.v / maxRuta) * 100 + '%', background: r.c }}></i></div>
              <b>{r.v}</b>
            </div>
          )) : <p className="vacio">Sin rutas</p>}
        </div>

        <div className="dash-card">
          <h4>Lectura de reportes</h4>
          <div className="dash-barra">
            <span>Leídos</span><div><i style={{ width: (d.dest.length ? (leidos / d.dest.length) * 100 : 0) + '%', background: '#D32F2F' }}></i></div><b>{leidos}</b>
          </div>
          <div className="dash-barra">
            <span>Sin leer</span><div><i style={{ width: (d.dest.length ? ((d.dest.length - leidos) / d.dest.length) * 100 : 0) + '%', background: 'var(--h)' }}></i></div><b>{d.dest.length - leidos}</b>
          </div>
          <p className="vacio">{d.recs.length} recomendación(es) publicadas</p>
        </div>

        <div className="dash-card ancho">
          <h4>Últimos avistamientos</h4>
          <table className="dash-tabla">
            <thead><tr><th>Especie</th><th>Turista</th><th>Fecha</th><th>Estado</th></tr></thead>
            <tbody>
              {d.avs.slice(0, 6).map(a => (
                <tr key={a.id}>
                  <td>{a.especie || '—'}</td><td>{nombre(a.usuario_id)}</td>
                  <td>{(a.creado_en || '').slice(0, 10)}</td>
                  <td><span className={'chip ' + a.estado}>{a.estado}</span></td>
                </tr>
              ))}
              {!d.avs.length && <tr><td colSpan="4" className="vacio">Aún no hay avistamientos</td></tr>}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  )
}
