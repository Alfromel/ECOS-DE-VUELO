const VIDEOS = [
  {
    titulo: 'Videos de la Paraba Roja',
    src: 'https://www.youtube.com/embed/U2veayfNHLw',
  },
  {
    titulo: 'Estado Plurinacional de Bolivia',
    texto: 'Hogar único de la Paraba Roja, especie endémica de los valles secos interandinos.',
    src: 'https://www.youtube.com/embed?listType=search&list=Estado+Plurinacional+de+Bolivia+naturaleza+biodiversidad',
  },
]

import ClimaMini from './ClimaMini'

export default function Inicio({ activa, clima, lugar }) {
  const oculta = activa ? '' : ' vista-oculta'
  return (
    <>
      <section data-vista="inicio" className={'relative h-[80vh] flex items-center overflow-hidden' + oculta}>
        <div className="absolute inset-0 z-0">
          <img src="/portada-paraba.jpg" alt="Paraba Roja en su hábitat" className="w-full h-full object-cover" />
          <div className="absolute inset-0 hero-gradient"></div>
        </div>

        <ClimaMini clima={clima} lugar={lugar} />

        <div className="container mx-auto px-4 z-10 text-white">
          <div className="grid grid-cols-1 lg:grid-cols-3 gap-8 items-center">
            <div className="lg:col-span-2">
              <h2 className="text-[clamp(2rem,5vw,3.5rem)] font-bold leading-tight mb-4">
                <span className="hero-largo">Descubre y protege <br />
                  <span className="text-primary">a la Paraba Roja</span> en su hábitat natural</span>
                <span className="hero-corto"><span className="text-primary">Paraba</span> Frente Roja</span>
              </h2>
              <p className="text-lg md:text-xl text-gray-200 mb-8 max-w-2xl">
                Explora los mejores lugares para observar a esta majestuosa especie endémica de Bolivia y contribuye a su conservación.
              </p>
              <div className="flex flex-wrap gap-4">
                <button data-ir="mapa" className="bg-primary hover:bg-primary/90 text-white px-6 py-3 rounded-md font-medium flex items-center gap-2 transition">
                  <i className="fa fa-map-marker"></i> Explorar mapa
                </button>
                <button data-ir="ficha" className="bg-white/20 hover:bg-white/30 text-white px-6 py-3 rounded-md font-medium flex items-center gap-2 backdrop-blur-sm transition">
                  <i className="fa fa-book"></i> Ficha técnica
                </button>
              </div>
            </div>

            <div className="bg-white/95 text-gray-800 rounded-lg p-6 shadow-xl backdrop-blur-sm">
              <h3 className="font-bold text-lg mb-3">¿Sabías qué?</h3>
              <p className="text-gray-600 mb-5 text-sm">
                La Paraba Roja (<em>Ara rubrogenys</em>) es una especie endémica de Bolivia, catalogada como <strong>En Peligro Crítico</strong> por la UICN. Se estima una población de apenas 670–1,200 individuos maduros.
              </p>
              <button data-ir="ficha" className="w-full bg-primary hover:bg-primary/90 text-white py-2 rounded-md transition">
                Conoce más
              </button>
            </div>
          </div>
        </div>
      </section>

      <section data-vista="inicio" className={'container mx-auto px-4 py-12' + oculta}>
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-8">
          {VIDEOS.map(v => (
            <div className="bg-white rounded-xl shadow-md p-5" key={v.titulo}>
              <h3 className="font-bold text-lg mb-3">{v.titulo}</h3>
              {v.texto && <p className="text-gray-500 text-sm mb-4">{v.texto}</p>}
              <div className="aspect-video rounded-lg overflow-hidden bg-black">
                {activa && (
                  <iframe className="w-full h-full" src={v.src} title={v.titulo} loading="lazy"
                    allow="accelerometer; encrypted-media; picture-in-picture; fullscreen" allowFullScreen></iframe>
                )}
              </div>
            </div>
          ))}
        </div>
      </section>
    </>
  )
}
