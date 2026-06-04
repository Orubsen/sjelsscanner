import React from 'react'
import ReactDOM from 'react-dom/client'
import './theme.css'
import App from './App.jsx'
import AdminScreen from './AdminScreen.jsx'
import PersonvernPage from './PersonvernPage.jsx'

const path = window.location.pathname.replace(/\/$/, '') || '/'

function Root() {
  if (path === '/admin') return <AdminScreen />
  if (path === '/personvern') return <PersonvernPage />
  return <App />
}

ReactDOM.createRoot(document.getElementById('root')).render(
  <React.StrictMode>
    <Root />
  </React.StrictMode>,
)