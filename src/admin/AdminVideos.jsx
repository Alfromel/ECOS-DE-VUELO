import { useCallback, useEffect, useState } from 'react'
import { supabase } from '../lib/supabase'
import { idYoutube, miniatura, tituloYoutube } from '../lib/youtube'

export default function AdminVideos() {
  const [lista, setLista] = useState([])
  const [url, setUrl] = useState('')
  const [titulo, setTitulo] = useState('')
  const [error, setError] = useState(null)
  const [guardando, setGuardando] = useState(false)

  const cargar = useCallback(async () => {
    const { data } = await supabase.from('videos').select('*').order('orden').order('creado_en')
    setLista(data || [])
  }, [])
  useEffect(() => { cargar() }, [cargar])

  const idActual = idYoutube(url)

  const agregar = async e => {
    e.preventDefault()
    if (guardando) return
    if (!idActual) return setError('Pega un enlace válido de YouTube')
    setGuardando(true)
    const nombre = titulo.trim() || (await tituloYoutube(url)) || 'Video'
    const orden = lista.reduce((m, v) => Math.max(m, v.orden || 0), 0) + 1
    const r = await supabase.from('videos').insert({ titulo: nombre, url: `https://www.youtube.com/watch?v=${idActual}`, orden })
    setGuardando(false)
    if (r.error) return setError(r.error.message)
    setError(null); setUrl(''); setTitulo(''); cargar()
  }

  const alternar = async v => {
    await supabase.from('videos').update({ activo: !v.activo }).eq('id', v.id)
    cargar()
  }

  const eliminar = async v => {
    if (!confirm(`¿Eliminar "${v.titulo}"?`)) return
    const r = await supabase.from('videos').delete().eq('id', v.id)
    if (r.error) return setError(r.error.message)
    cargar()
  }

  return (
    <div className="adm-videos">
      <form className="adm-caja adm-videos-form" onSubmit={agregar}>
        <h3 className="adm-h"><i className="fa fa-youtube-play"></i> Agregar video</h3>
        <p className="text-xs text-gray-500 mb-2">Pega el enlace de YouTube; el video aparecerá en la página de Inicio.</p>
        <input className="campo" placeholder="https://www.youtube.com/watch?v=..." value={url} onChange={e => { setUrl(e.target.value); setError(null) }} required />
        <input className="campo" placeholder="Título (opcional, se toma de YouTube)" value={titulo} onChange={e => setTitulo(e.target.value)} />
        <div className="adm-videos-prev">
          {idActual
            ? <iframe src={`https://www.youtube.com/embed/${idActual}`} title="Vista previa" allowFullScreen></iframe>
            : <span><i className="fa fa-play-circle-o"></i>Vista previa</span>}
        </div>
        {error && <p className="text-sm text-red-600 mb-2">{error}</p>}
        <button className="btn-rojo w-full" disabled={guardando}>{guardando ? <><i className="fa fa-spinner fa-spin"></i> Guardando…</> : <><i className="fa fa-plus"></i> Agregar video</>}</button>
      </form>

      <div>
        <h3 className="adm-h">Videos publicados ({lista.length})</h3>
        {!lista.length && <p className="text-sm text-gray-500">Aún no hay videos.</p>}
        <div className="adm-videos-grid">
          {lista.map(v => (
            <article key={v.id} className={'adm-video' + (v.activo ? '' : ' oculto')}>
              <div className="adm-video-img">
                <img src={miniatura(v.url)} alt="" loading="lazy" />
                {!v.activo && <em>Oculto</em>}
              </div>
              <div className="adm-video-pie">
                <span title={v.titulo}>{v.titulo}</span>
                <button type="button" className="adm-ico-btn" onClick={() => alternar(v)} title={v.activo ? 'Ocultar' : 'Mostrar'}><i className={'fa ' + (v.activo ? 'fa-eye' : 'fa-eye-slash')}></i></button>
                <button type="button" className="adm-ico-btn" onClick={() => eliminar(v)} title="Eliminar"><i className="fa fa-trash"></i></button>
              </div>
            </article>
          ))}
        </div>
      </div>
    </div>
  )
}
