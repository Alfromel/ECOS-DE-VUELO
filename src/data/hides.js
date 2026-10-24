// Hide 3: el decimal enviado repetía el Hide 1, se usan las coordenadas en grados (18°06'18.8"S 64°54'57.7"W).
export const HIDES = [
  { id: 1, nombre: 'Hide 1', dms: `18°05'56.8"S 64°55'15.7"W`, pos: [-18.099103, -64.921034] },
  { id: 2, nombre: 'Hide 2', dms: `18°06'04.5"S 64°55'07.0"W`, pos: [-18.101244, -64.918622] },
  { id: 3, nombre: 'Hide 3', dms: `18°06'18.8"S 64°54'57.7"W`, pos: [-18.105222, -64.916028] },
  { id: 4, nombre: 'Hide 4', dms: `18°07'58.4"S 64°49'55.1"W`, pos: [-18.132889, -64.831972] },
  { id: 5, nombre: 'Hide 5', dms: `18°07'45.8"S 64°49'24.0"W`, pos: [-18.129389, -64.823333] },
]

export const urlRuta = pos => `https://www.google.com/maps/dir/?api=1&destination=${pos[0]},${pos[1]}`
