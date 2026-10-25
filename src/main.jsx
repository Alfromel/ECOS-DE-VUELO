import { registerSW } from 'virtual:pwa-register';
registerSW({ immediate: true });

import { StrictMode } from 'react'
import { createRoot } from 'react-dom/client'
import 'leaflet/dist/leaflet.css'
import './utilidades.css'
import './styles.css'
import './app-extra.css'
import App from './App.jsx'
import { AuthProvider } from './hooks/useAuth.jsx'
import { faltaConfig } from './lib/supabase'
import FaltaConfig from './components/FaltaConfig.jsx'

createRoot(document.getElementById('root')).render(
  <StrictMode>
    {faltaConfig ? <FaltaConfig /> : <AuthProvider><App /></AuthProvider>}
  </StrictMode>,
)