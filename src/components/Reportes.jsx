import { useCallback, useEffect, useState } from 'react'
import { supabase } from '../lib/supabase'
import { useAuth } from '../hooks/useAuth'

export default function Reportes({ activa }) {
  const { perfil, rol, noLeidos, refrescarNoLeidos } = useAuth()
  const [lista, setLista] = useState([])
  const [leidos, setLeidos] = useState(new Set())

  const cargar = useCallback(async () => {
    if (rol !== 'turista') return
    const [r, d] = await Promise.all([
      supabase.from('reportes').select('*').order('creado_en', { ascending: false }),
      supabase.from('reportes_destinatarios').select('reporte_id').eq('usuario_id', perfil.id).eq('leido', true),
    ])
    setLista(r.data || [])
    setLeidos(new Set((d.data || []).map(x => x.reporte_id)))
  }, [rol, perfil?.id])
  useEffect(() => { cargar() }, [cargar, noLeidos])

  const marcarLeido = async rep => {
    if (leidos.has(rep.id)) return
    await supabase.from('reportes_destinatarios').upsert(
      { reporte_id: rep.id, usuario_id: perfil.id, leido: true, leido_en: new Date().toISOString() }, { onConflict: 'reporte_id,usuario_id' })
    setLeidos(s => new Set(s).add(rep.id))
    refrescarNoLeidos()
  }

  return (
    <div className={'bg-white rounded-xl shadow-md p-5' + (activa ? '' : ' vista-oculta')} id="reportes" data-vista="reportes">
      <div className="flex justify-between items-center mb-3">
        <h3 className="font-bold text-lg">Reportes importantes</h3>
        <a href="#" className="text-primary text-sm">Ver todos los reportes</a>
      </div>
      <p className="text-gray-500 text-sm mb-4">Mantente informado y viaja seguro</p>

      {lista.length > 0 && (
        <div className="space-y-3 mb-6">
          {lista.map(rep => {
            const nuevo = !leidos.has(rep.id)
            return (
              <div key={rep.id} className={'p-3 border rounded-lg cursor-pointer ' + (nuevo ? 'border-primary bg-red-50' : 'border-gray-200')} onClick={() => marcarLeido(rep)}>
                <div className="flex items-center gap-2">
                  {nuevo && <span className="punto-notif" style={{ position: 'static' }}></span>}
                  <b>{rep.titulo}</b>
                  {rep.tipo_reporte && <span className="text-xs bg-gray-100 px-2 rounded-full">{rep.tipo_reporte}</span>}
                </div>
                <p className="text-sm text-gray-600 mt-1">{rep.descripcion}</p>
                <small className="text-gray-400">{new Date(rep.creado_en).toLocaleString()}{nuevo ? ' · toca para marcar como leído' : ''}</small>
              </div>
            )
          })}
        </div>
      )}

      {lista.length === 0 && <p className="text-gray-500 text-sm text-center py-6">Aún no hay reportes.</p>}
    </div>
  )
}
