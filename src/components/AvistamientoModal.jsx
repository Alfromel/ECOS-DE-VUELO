import { useState } from 'react'
import { supabase } from '../lib/supabase'
import { useAuth } from '../hooks/useAuth'

const vacio = { tipo: 'hide', hide_id: '', ruta_id: '', parada_id: '', especie: 'Paraba Frente Roja', descripcion: '', lat: '', lon: '' }

export default function AvistamientoModal({ datos, onCerrar, onCreado, hideInicial = '' }) {
  const { perfil } = useAuth()
  const [f, setF] = useState({ ...vacio, hide_id: hideInicial })
  const [fotos, setFotos] = useState([])
  const [error, setError] = useState(null)
  const [enviando, setEnviando] = useState(false)
  const set = k => e => setF({ ...f, [k]: e.target.value })
  const paradasRuta = datos.paradas.filter(p => p.ruta_id === f.ruta_id)

  const [ubicando, setUbicando] = useState(false)
  const miUbicacion = () => {
    if (!navigator.geolocation) return setError('Tu dispositivo no permite obtener la ubicación')
    setError(null); setUbicando(true)
    navigator.geolocation.getCurrentPosition(
      p => { setUbicando(false); setF(v => ({ ...v, lat: p.coords.latitude.toFixed(6), lon: p.coords.longitude.toFixed(6) })) },
      er => {
        setUbicando(false)
        setError(er.code === 1 ? 'Permiso de ubicación denegado. Actívalo en los ajustes del navegador.' : er.code === 3 ? 'Se agotó el tiempo esperando el GPS. Inténtalo de nuevo al aire libre.' : 'No se pudo obtener tu ubicación')
      },
      { enableHighAccuracy: true, timeout: 20000, maximumAge: 0 })
  }

  const enviar = async e => {
    e.preventDefault()
    setError(null)
    if (f.tipo === 'hide' && !f.hide_id) return setError('Elige un Hide')
    if (f.tipo === 'ruta' && !f.ruta_id) return setError('Elige una ruta')
    setEnviando(true)
    try {
      const urls = []
      for (const file of fotos.slice(0, 3)) {
        const ruta = `${perfil.id}/${Date.now()}-${file.name.replace(/[^\w.-]/g, '_')}`
        const { error: eu } = await supabase.storage.from('avistamientos').upload(ruta, file)
        if (eu) throw eu
        urls.push(supabase.storage.from('avistamientos').getPublicUrl(ruta).data.publicUrl)
      }
      const hide = datos.hides.find(h => h.id === f.hide_id)
      const { error: ei } = await supabase.from('avistamientos').insert({
        usuario_id: perfil.id,
        hide_id: f.tipo === 'hide' ? f.hide_id : null,
        ruta_id: f.tipo === 'ruta' ? f.ruta_id : hide?.ruta_id || null,
        parada_id: f.tipo === 'ruta' ? f.parada_id || null : hide?.parada_id || null,
        especie: f.especie, descripcion: f.descripcion, fotos: urls,
        latitud: f.lat ? Number(f.lat) : hide?.latitud ?? null,
        longitud: f.lon ? Number(f.lon) : hide?.longitud ?? null,
      })
      if (ei) throw ei
      onCreado()
    } catch (er) {
      setError(er.message)
      setEnviando(false)
    }
  }

  return (
    <div className="modal-fondo" onMouseDown={e => e.target === e.currentTarget && onCerrar()}>
      <form className="modal-caja" onSubmit={enviar}>
        <button type="button" className="modal-x" onClick={onCerrar}>×</button>
        <h3 className="font-bold text-lg mb-1">Crear avistamiento</h3>
        <p className="text-xs text-gray-500 mb-3">Un administrador lo evaluará antes de que sea visible para los demás turistas.</p>
        <div className="flex gap-4 text-sm mb-2">
          <label><input type="radio" checked={f.tipo === 'hide'} onChange={() => setF({ ...f, tipo: 'hide' })} /> En un Hide</label>
          <label><input type="radio" checked={f.tipo === 'ruta'} onChange={() => setF({ ...f, tipo: 'ruta' })} /> En una ruta</label>
        </div>
        {f.tipo === 'hide' ? (
          <select className="campo" value={f.hide_id} onChange={set('hide_id')}>
            <option value="">Selecciona un Hide</option>
            {datos.hides.map(h => <option key={h.id} value={h.id}>{h.nombre}</option>)}
          </select>
        ) : (
          <>
            <select className="campo" value={f.ruta_id} onChange={e => setF({ ...f, ruta_id: e.target.value, parada_id: '' })}>
              <option value="">Selecciona una ruta</option>
              {datos.rutas.map(r => <option key={r.id} value={r.id}>{r.nombre}</option>)}
            </select>
            <select className="campo" value={f.parada_id} onChange={set('parada_id')} disabled={!f.ruta_id}>
              <option value="">Parada (opcional)</option>
              {paradasRuta.map(p => <option key={p.id} value={p.id}>{p.nombre}</option>)}
            </select>
          </>
        )}
        <input className="campo" placeholder="Especie" value={f.especie} onChange={set('especie')} required />
        <textarea className="campo" rows={3} placeholder="Descripción (cantidad, comportamiento…)" value={f.descripcion} onChange={set('descripcion')} />
        <div className="flex gap-2">
          <input className="campo" placeholder="Latitud" value={f.lat} onChange={set('lat')} />
          <input className="campo" placeholder="Longitud" value={f.lon} onChange={set('lon')} />
        </div>
        <button type="button" className="text-sm text-primary mb-2" onClick={miUbicacion} disabled={ubicando}>
          <i className={'fa ' + (ubicando ? 'fa-spinner fa-spin' : 'fa-crosshairs')}></i> {ubicando ? 'Obteniendo ubicación…' : 'Usar mi ubicación'}
        </button>
        <label className="block text-sm mb-2">Fotos (máx. 3)
          <input type="file" accept="image/*" multiple className="block mt-1" onChange={e => setFotos([...e.target.files].slice(0, 3))} />
        </label>
        {error && <p className="text-sm text-red-600 mb-2">{error}</p>}
        <button className="btn-rojo w-full" disabled={enviando}>{enviando ? 'Enviando…' : 'Enviar avistamiento'}</button>
      </form>
    </div>
  )
}
