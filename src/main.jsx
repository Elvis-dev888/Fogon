import React from 'react'
import ReactDOM from 'react-dom/client'
import App from './App.jsx'
import PrivacyPolicy from './components/PrivacyPolicy.jsx'
import './index.css'
import { LanguageProvider } from './lib/i18n.jsx'

ReactDOM.createRoot(document.getElementById('root')).render(
  <React.StrictMode>
    <LanguageProvider>
      {window.location.pathname === '/privacy-policy' ? <PrivacyPolicy /> : <App />}
    </LanguageProvider>
  </React.StrictMode>,
)
