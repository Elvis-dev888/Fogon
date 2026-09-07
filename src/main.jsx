import React from 'react'
import ReactDOM from 'react-dom/client'
import App from './App.jsx'
import PrivacyPolicy from './components/PrivacyPolicy.jsx'
import DemoShowcase from './components/DemoShowcase.jsx'
import './index.css'
import { LanguageProvider } from './lib/i18n.jsx'

const isDemo = window.location.pathname === '/demo' || window.location.search.includes('demo=1')

ReactDOM.createRoot(document.getElementById('root')).render(
  <React.StrictMode>
    <LanguageProvider>
      {window.location.pathname === '/privacy-policy' ? (
        <PrivacyPolicy />
      ) : isDemo ? (
        <DemoShowcase />
      ) : (
        <App />
      )}
    </LanguageProvider>
  </React.StrictMode>,
)
