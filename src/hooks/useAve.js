import { useEffect, useState } from 'react'
import { supabase } from '../lib/supabase'

// Primera ave de la tabla `aves` (ficha técnica). `listo` indica que la consulta terminó.
export default function useAve() {
  const [ave, setAve] = useState(null)
  const [listo, setListo] = useState(false)
  useEffect(() => {
    supabase.from('aves').select('*').order('creado_en').limit(1).maybeSingle()
      .then(({ data }) => { setAve(data); setListo(true) })
  }, [])
  return { ave, listo }
}
