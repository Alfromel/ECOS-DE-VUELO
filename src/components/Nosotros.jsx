export default function Nosotros({ activa }) {
  return (
    <section data-vista="nosotros" className={'container mx-auto px-4 py-12' + (activa ? '' : ' vista-oculta')}>
      <div className="bg-white rounded-xl shadow-md p-8 max-w-3xl mx-auto">
        <h2 className="font-bold text-2xl mb-4">Nosotros</h2>
        <p className="text-gray-600">Ecos de Vuelo Rojo es un proyecto de grado dedicado a difundir y proteger a la Paraba Roja (Ara rubrogenys), ave endémica del Estado Plurinacional de Bolivia.</p>
      </div>
    </section>
  )
}
