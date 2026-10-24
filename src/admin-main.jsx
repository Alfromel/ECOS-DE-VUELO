import { StrictMode } from 'react'
import { createRoot } from 'react-dom/client'
import 'leaflet/dist/leaflet.css'
import './app-extra.css'
import { AuthProvider } from './hooks/useAuth.jsx'
import AdminApp from './admin/AdminApp.jsx'
import { faltaConfig } from './lib/supabase'
import FaltaConfig from './components/FaltaConfig.jsx'

createRoot(document.getElementById('root')).render(
  <StrictMode>
    {faltaConfig ? <FaltaConfig /> : <AuthProvider><AdminApp /></AuthProvider>}
  </StrictMode>,
)
