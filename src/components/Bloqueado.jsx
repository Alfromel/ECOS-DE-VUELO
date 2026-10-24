import { useAuth } from '../hooks/useAuth'

export default function Bloqueado({ activa, titulo, abrirLogin }) {
  const { rol } = useAuth()
  if (!activa) return null
  return (
    <div className="bg-white rounded-xl shadow-md p-8 text-center" style={{ minHeight: '60vh' }}>
      <i className="fa fa-lock text-4xl text-primary mb-3"></i>
      <h3 className="font-bold text-xl mb-2">{titulo} requiere una cuenta</h3>
      <p className="text-gray-500 mb-4">
        {rol === 'invitado' ? 'Regístrate o inicia sesión como turista para desbloquear esta sección.' : 'No tienes acceso a esta sección.'}
      </p>
      {rol === 'invitado' && <button className="btn-rojo" onClick={abrirLogin}>Iniciar sesión / Registrarme</button>}
    </div>
  )
}
