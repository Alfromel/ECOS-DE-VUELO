import { POSES } from '../lib/poses3d'

// Botones con icono: 3 poses del ave y (opcional) mostrar / ocultar características
export default function BotonesAve3D({ pose, onPose, caract, onCaract }) {
  return (
    <div className="ficha-controles">
      {POSES.map(p => (
        <button key={p.id} type="button" className={'ficha-ico' + (pose === p.id ? ' on' : '')} onClick={() => onPose(p.id)} aria-label={p.titulo} title={p.titulo} aria-pressed={pose === p.id}>
          <i className={'fa ' + p.icono} aria-hidden="true"></i>
        </button>
      ))}
      {onCaract && (
        <button type="button" className={'ficha-ico' + (caract ? ' on' : '')} onClick={onCaract} aria-label={caract ? 'Ocultar características' : 'Mostrar características'} title={caract ? 'Ocultar características' : 'Mostrar características'} aria-pressed={caract}>
          <i className="fa fa-list-ul" aria-hidden="true"></i>
        </button>
      )}
    </div>
  )
}
