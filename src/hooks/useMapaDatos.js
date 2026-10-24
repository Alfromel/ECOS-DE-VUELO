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

  return { ...d, cargando, recargar }
}
