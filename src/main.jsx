import React from 'react'
import ReactDOM from 'react-dom/client'
import { BrowserRouter } from 'react-router-dom'
import { PowerSyncContext } from '@powersync/react'
import { db, initPowerSync } from './lib/powersync'
import App from './App'
import './index.css'

initPowerSync().catch((err) =>
  console.error('Error inicializando PowerSync:', err)
)

ReactDOM.createRoot(document.getElementById('root')).render(
  <React.StrictMode>
    <PowerSyncContext.Provider value={db}>
      <BrowserRouter>
        <App />
      </BrowserRouter>
    </PowerSyncContext.Provider>
  </React.StrictMode>
)
