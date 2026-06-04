import React from 'react'
import ReactDOM from 'react-dom/client'
import './theme.css'
import App from './App.jsx'
import AdminScreen from './AdminScreen.jsx'

const isAdminRoute = /^\/admin\/?$/.test(window.location.pathname)

ReactDOM.createRoot(document.getElementById('root')).render(
  <React.StrictMode>
    {isAdminRoute ? <AdminScreen /> : <App />}
  </React.StrictMode>,
)