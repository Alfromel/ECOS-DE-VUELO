export default function ClimaMini({ clima, lugar }) {
  const ciudad = lugar.split(',')[0]
  return (
    <div className="clima-mini" aria-label="Clima de hoy">
      <i className={'fa ' + clima.icono}></i>
      <div>
        <b>{clima.temp}</b>
        <small>{clima.desc}</small>
        <small>{ciudad}</small>
      </div>
    </div>
  )
}
