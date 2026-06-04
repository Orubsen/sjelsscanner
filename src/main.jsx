import React from 'react'
import ReactDOM from 'react-dom/client'
import './theme.css'
import App from './App.jsx'
import AdminScreen from './AdminScreen.jsx'
import PersonvernPage from './PersonvernPage.jsx'
import { I18nProvider } from './i18n/I18nContext.jsx'

const path = window.location.pathname.replace(/\/$/, '') || '/'

function Root() {
  if (path === '/admin') return <AdminScreen />
  if (path === '/personvern') return <PersonvernPage />
  return <App />
}

ReactDOM.createRoot(document.getElementById('root')).render(
  <React.StrictMode>
    <I18nProvider>
      <Root />
    </I18nProvider>
  </React.StrictMode>,
)