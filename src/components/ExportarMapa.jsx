import { useState } from 'react'

export default function ExportarMapa({ rutas, hayHides, generando, onGenerar, onCerrar }) {
  const [sel, setSel] = useState(() => new Set(rutas.map(r => r.id)))
  const [hides, setHides] = useState(hayHides)
  const [paradas, setParadas] = useState(true)
  const [formato, setFormato] = useState('pdf')

  const alternar = id => setSel(s => { const n = new Set(s); n.has(id) ? n.delete(id) : n.add(id); return n })

  return (
    <div className="modal-fondo" onMouseDown={e => e.target === e.currentTarget && !generando && onCerrar()}>
      <div className="modal-caja">
        <button className="modal-x" onClick={onCerrar} disabled={generando}>×</button>
        <h3 className="font-bold text-lg mb-1">Exportar mapa</h3>
        <p className="text-sm text-gray-500 mb-3">Elige qué partes del mapa incluir.</p>
        <b className="text-sm">Rutas</b>
        {rutas.map(r => (
          <label key={r.id} className="flex items-center gap-2 text-sm my-1">
            <input type="checkbox" checked={sel.has(r.id)} onChange={() => alternar(r.id)} />
            <i className="leyenda-color" style={{ background: r.color }}></i>{r.nombre}
          </label>
        ))}
        <b className="text-sm block mt-3">Elementos</b>
        <label className="flex items-center gap-2 text-sm my-1"><input type="checkbox" checked={paradas} onChange={e => setParadas(e.target.checked)} /> Paradas</label>
        <label className="flex items-center gap-2 text-sm my-1"><input type="checkbox" checked={hides} onChange={e => setHides(e.target.checked)} /> Hide</label>
        <b className="text-sm block mt-3">Formato</b>
        <div className="flex gap-4 text-sm my-1">
          <label><input type="radio" checked={formato === 'pdf'} onChange={() => setFormato('pdf')} /> PDF</label>
          <label><input type="radio" checked={formato === 'png'} onChange={() => setFormato('png')} /> Imagen (PNG)</label>
        </div>
        <button className="btn-rojo w-full mt-4" disabled={generando || !sel.size} onClick={() => onGenerar({ rutasSel: sel, hides, paradas, formato })}>
          {generando ? 'Generando…' : 'Generar'}
        </button>
      </div>
    </div>
  )
}
