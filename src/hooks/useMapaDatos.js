import { useCallback, useEffect, useState } from 'react'
import { supabase } from '../lib/supabase'

// Rutas, paradas, enlaces y hides (los hides solo llegan si hay sesión por RLS)
export default function useMapaDatos() {
  const [d, setD] = useState({ rutas: [], paradas: [], enlaces: [], hides: [] })
  const [cargando, setCargando] = useState(true)

  const recargar = useCallback(async () => {
    const [r, p, e, h] = await Promise.all([
      supabase.from('rutas').select('*').eq('activo', true).order('creado_en'),
      supabase.from('paradas').select('*').order('orden'),
      supabase.from('rutas_enlaces').select('*'),
      supabase.from('hides').select('*').eq('activo', true).order('nombre'),
    ])
    setD({ rutas: r.data || [], paradas: p.data || [], enlaces: e.data || [], hides: h.data || [] })
    setCargando(false)
  }, [])

  useEffect(() => { recargar() }, [recargar])

  useEffect(() => {
    const canal = supabase.channel('mapa-rutas-cambios')
      .on('postgres_changes', { event: '*', schema: 'public', table: 'rutas' }, recargar)
      .on('postgres_changes', { event: '*', schema: 'public', table: 'paradas' }, recargar)
      .on('postgres_changes', { event: '*', schema: 'public', table: 'rutas_enlaces' }, recargar)
      .subscribe(estado => {
        if (estado === 'CHANNEL_ERROR' || estado === 'TIMED_OUT') {
          console.error(`No se pudo sincronizar el mapa en tiempo real: ${estado}`)
        }
      })

    return () => { supabase.removeChannel(canal) }
  }, [recargar])

  return { ...d, cargando, recargar }
}
