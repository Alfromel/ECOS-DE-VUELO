export default function FaltaConfig() {
  return (
    <div style={{ maxWidth: 520, margin: '15vh auto', padding: 24, fontFamily: 'sans-serif', textAlign: 'center' }}>
      <h2 style={{ color: '#D32F2F', fontSize: 22, fontWeight: 700, marginBottom: 12 }}>Falta configurar Supabase</h2>
      <p style={{ color: '#475569', lineHeight: 1.5 }}>
        Agrega las variables de entorno <b>VITE_SUPABASE_URL</b> y <b>VITE_SUPABASE_ANON_KEY</b> en el hosting
        y vuelve a desplegar el sitio.
      </p>
    </div>
  )
}
