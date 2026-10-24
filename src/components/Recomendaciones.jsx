import { useEffect, useState } from 'react'
import { supabase } from '../lib/supabase'

export default function Recomendaciones({ activa }) {
  const [lista, setLista] = useState([])
  useEffect(() => {
    supabase.from('recomendaciones').select('*').eq('activo', true).order('importante', { ascending: false }).order('creado_en', { ascending: false })
      .then(({ data }) => setLista(data || []))
  }, [])
  return (
    <div className={'bg-white rounded-xl shadow-md p-5' + (activa ? '' : ' vista-oculta')} id="recomendaciones" data-vista="recomendaciones">
      <h3 className="font-bold text-lg mb-3">Recomendaciones rápidas</h3>
      <p className="text-gray-500 text-sm mb-5">Para una experiencia responsable</p>

      {lista.length === 0 && <p className="text-gray-500 text-sm text-center py-6">Aún no hay recomendaciones.</p>}

      {lista.length > 0 && (
        <div className="space-y-3 mb-6">
          {lista.map(r => (
            <div key={r.id} className={'p-3 border-l-4 rounded-r ' + (r.importante ? 'bg-red-50 border-red-500' : 'bg-green-50 border-green-500')}>
              <p className="font-medium">{r.importante && <i className="fa fa-exclamation-circle text-primary"></i>} {r.titulo}</p>
              {r.temporada_ideal && <p className="text-xs text-secondary"><i className="fa fa-calendar"></i> Temporada ideal: {r.temporada_ideal}</p>}
              <p className="text-xs text-gray-600">{r.contenido}</p>
            </div>
          ))}
        </div>
      )}
    </div>
  )
}
