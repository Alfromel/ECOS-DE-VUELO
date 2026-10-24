import { useState } from 'react'
import { useAuth } from '../hooks/useAuth'

export default function AuthModal({ abierto, onCerrar }) {
  const { ingresar, registrar } = useAuth()
  const [modo, setModo] = useState('login')
  const [f, setF] = useState({ nombre: '', email: '', telefono: '', password: '', admin: false, codigo: '' })
  const [msg, setMsg] = useState(null)
  const [cargando, setCargando] = useState(false)

  if (!abierto) return null
  const set = k => e => setF({ ...f, [k]: e.target.type === 'checkbox' ? e.target.checked : e.target.value })

  const enviar = async e => {
    e.preventDefault()
    setCargando(true); setMsg(null)
    const r = modo === 'login'
      ? await ingresar(f.email, f.password)
      : await registrar(f.nombre, f.email, f.password, '', f.telefono.trim())
    setCargando(false)
    if (r.error) { setMsg({ t: 'err', m: r.error.message }); return }
    if (r.data.perfil.rol === 'admin_guia') { location.href = '/admin.html'; return }
    onCerrar()
  }

  return (
    <div className="modal-fondo" onMouseDown={e => e.target === e.currentTarget && onCerrar()}>
      <form className="modal-caja" onSubmit={enviar}>
        <button type="button" className="modal-x" onClick={onCerrar} aria-label="Cerrar">×</button>
        <h3 className="font-bold text-xl mb-1">{modo === 'login' ? 'Iniciar sesión' : 'Crear cuenta'}</h3>
        <p className="text-gray-500 text-sm mb-4">
          {modo === 'login' ? 'Accede para desbloquear rutas, Hide y reportes.' : 'Regístrate como turista o como administrador/guía.'}
        </p>
        {modo === 'registro' && <input className="campo" placeholder="Nombre completo" value={f.nombre} onChange={set('nombre')} required />}
        <input className="campo" type="email" placeholder="Correo" value={f.email} onChange={set('email')} required />
        {modo === 'registro' && <input className="campo" type="tel" inputMode="tel" placeholder="Celular (ej. 70000000)" pattern="[0-9+\s\-]{7,15}" title="Ingresa un número de celular válido" value={f.telefono} onChange={set('telefono')} required />}
        <input className="campo" type="password" placeholder="Contraseña" minLength={1} value={f.password} onChange={set('password')} required />
        {msg && <p className={'text-sm mb-2 ' + (msg.t === 'err' ? 'text-red-600' : 'text-green-700')}>{msg.m}</p>}
        <button className="btn-rojo w-full" disabled={cargando}>{cargando ? 'Procesando…' : modo === 'login' ? 'Entrar' : 'Registrarme'}</button>
        <button type="button" className="text-sm text-primary mt-3" onClick={() => { setModo(modo === 'login' ? 'registro' : 'login'); setMsg(null) }}>
          {modo === 'login' ? '¿No tienes cuenta? Regístrate' : '¿Ya tienes cuenta? Inicia sesión'}
        </button>
      </form>
    </div>
  )
}
