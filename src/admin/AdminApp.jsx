import { useState } from 'react'
import { useAuth } from '../hooks/useAuth'
import AdminPanel from './AdminPanel'

export default function AdminApp() {
  const { rol, cargando, ingresar, salir } = useAuth()
  const [f, setF] = useState({ email: '', password: '' })
  const [error, setError] = useState(null)
  const [enviando, setEnviando] = useState(false)

  if (cargando) return <p className="p-6">Cargando…</p>
  if (rol === 'admin') return <AdminPanel />

  const enviar = async e => {
    e.preventDefault()
    setEnviando(true); setError(null)
    const r = await ingresar(f.email.trim(), f.password)
    setEnviando(false)
    if (r.error) setError(r.error.message)
    else if (r.data.perfil.rol !== 'admin_guia') { setError('Esta cuenta no es de administrador.'); salir() }
  }

  return (
    <div className="adm-login">
      <form className="modal-caja" onSubmit={enviar}>
        <div className="adm-marca mb-4 rounded-lg">Ecos de Vuelo Rojo<small>Panel de administración</small></div>
        <h3 className="font-bold text-xl mb-3">Ingreso de administrador</h3>
        <input className="campo" type="email" placeholder="Correo" autoComplete="username" value={f.email} onChange={e => setF({ ...f, email: e.target.value })} required />
        <input className="campo" type="password" placeholder="Contraseña" autoComplete="current-password" value={f.password} onChange={e => setF({ ...f, password: e.target.value })} required />
        {error && <p className="text-sm text-red-600 mb-2">{error}</p>}
        <button className="btn-rojo w-full" disabled={enviando}>{enviando ? 'Procesando…' : 'Entrar'}</button>
        {rol === 'turista' && <button type="button" className="text-sm text-gray-500 mt-3 block" onClick={salir}>Cerrar sesión de turista</button>}
        <a href="/" className="text-sm text-gray-500 mt-2 block">← Volver al sitio</a>
      </form>
    </div>
  )
}
