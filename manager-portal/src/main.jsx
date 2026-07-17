import React from 'react'
import ReactDOM from 'react-dom/client'
import App from './App.jsx'
import './index.css'

const root = document.getElementById('root')

if (!root) {
  console.error('[Manager] #root element not found!')
} else {
  try {
    ReactDOM.createRoot(root).render(
      <React.StrictMode>
        <App />
      </React.StrictMode>,
    )
  } catch (e) {
    console.error('[Manager] Mount error:', e)
    root.innerHTML = `<div style="color:white;padding:40px;font-family:sans-serif"><h2>Startup error</h2><pre>${e}</pre></div>`
  }
}
