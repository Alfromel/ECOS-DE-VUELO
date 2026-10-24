import { createClient } from '@supabase/supabase-js'

const url = import.meta.env.VITE_SUPABASE_URL
const clave = import.meta.env.VITE_SUPABASE_ANON_KEY

export const faltaConfig = !url || !clave

export const supabase = createClient(url || 'https://sin-configurar.supabase.co', clave || 'sin-configurar')
