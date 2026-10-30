import { useState } from 'react'
import NidoIco from './NidoIco'

export default function NidosCard({ activa, datos }) {
  const nidos = (datos?.nidos || []).map(n => ({ id: n.id, nombre: n.nombre, dms: n.descripcion }))
  const [abierto, setAbierto] = useState(null)
  const nidoAbierto = nidos.find(n => n.id === abierto)

  return (
    <div className={'bg-white rounded-xl shadow-md p-5 nidos-modulo' + (activa ? '' : ' vista-oculta')} id="nidos" data-vista="nidos">
      <h3 className="font-bold text-lg mb-1"><NidoIco size={22} /> Nidos · Sitios de anidación</h3>
      <p className="text-gray-500 text-sm mb-4">Lugares donde la Paraba Frente Roja anida. Obsérvalos sin molestarla.</p>
      {!nidos.length && <p className="text-sm text-gray-400 mb-2">Aún no hay Nidos registrados.</p>}
      <div className="nidos-lista">
        {nidos.map((n, i) => (
          <button type="button" className="nido-cuadro" key={n.id} onClick={() => setAbierto(n.id)}>
            <span className="nido-huevos" aria-hidden="true"><i></i><i></i></span>
            <span className="nido-cesta">{i + 1}</span>
            <strong>{n.nombre}</strong>
            <small>{n.dms}</small>
          </button>
        ))}
      </div>

      {nidoAbierto && (
        <div className="modal-fondo" onMouseDown={e => e.target === e.currentTarget && setAbierto(null)}>
          <div className="modal-caja hide-detalle">
            <button type="button" className="modal-x" onClick={() => setAbierto(null)}>×</button>
            <div className="hide-detalle-cab">
              <span className="nido-mini grande"><NidoIco size={34} /></span>
              <div><h3 className="font-bold text-lg">{nidoAbierto.nombre}</h3><small className="text-gray-500">{nidoAbierto.dms}</small></div>
            </div>
          </div>
        </div>
      )}
    </div>
  )
}
