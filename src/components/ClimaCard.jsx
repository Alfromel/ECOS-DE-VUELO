export default function ClimaCard({ activa, clima, lugar }) {
  return (
    <div className={'bg-white rounded-xl shadow-md p-5' + (activa ? '' : ' vista-oculta')} id="clima" data-vista="clima">
      <h3 className="font-bold text-lg mb-3">Clima actual</h3>
      <p id="clima-lugar" className="text-gray-500 text-sm mb-4">{lugar}</p>

      <div className="flex items-center justify-between mb-6">
        <div>
          <p id="clima-temp" className="text-4xl font-bold">{clima.temp}</p>
          <p id="clima-desc" className="text-sm text-gray-500">{clima.desc}</p>
          <p id="clima-hora" className="text-xs text-gray-400">{clima.hora}</p>
        </div>
        <div id="clima-icono" className="text-5xl text-yellow-400">
          <i className={'fa ' + clima.icono}></i>
        </div>
      </div>

      <div className="grid grid-cols-2 gap-3 text-sm mb-4">
        <div className="flex items-center gap-2"><i className="fa fa-tint text-blue-500"></i><span id="clima-hum">{clima.hum}</span></div>
        <div className="flex items-center gap-2"><i className="fa fa-umbrella text-blue-400"></i><span id="clima-lluvia">{clima.lluvia}</span></div>
        <div className="flex items-center gap-2"><i className="fa fa-flag text-gray-500"></i><span id="clima-viento">{clima.viento}</span></div>
        <div className="flex items-center gap-2"><i className="fa fa-thermometer-three-quarters text-red-500"></i><span id="clima-sens">{clima.sens}</span></div>
      </div>

      <h4 className="font-bold text-xl mt-8 mb-3">Próximas horas</h4>
      <div id="clima-horas" className="clima-fila">
        {clima.horas.map(h => (
          <div className="clima-item" key={h.h + h.temp + h.prob}>
            <span>{h.h}</span><i className={'fa ' + h.icono}></i><b>{h.temp}</b><small>{h.prob}</small>
          </div>
        ))}
      </div>
      <h4 className="font-bold text-xl mt-8 mb-3">Pronóstico de 5 días</h4>
      <div id="clima-dias" className="clima-fila">
        {clima.dias.map((d, i) => (
          <div className="clima-item" key={i}>
            <span>{d.dia}</span><i className={'fa ' + d.icono}></i><b>{d.temp}</b><small>{d.prob}</small>
          </div>
        ))}
      </div>
      <p className="mt-8 text-sm text-gray-600 reveal">
        <i className="fa fa-info-circle text-primary"></i> Las parabas son más activas al amanecer y al atardecer; con lluvia o viento fuerte permanecen en los acantilados.
      </p>
    </div>
  )
}
