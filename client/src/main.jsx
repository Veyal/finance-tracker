import React from 'react'
import ReactDOM from 'react-dom/client'
import App from './App.jsx'
import { PrivacyProvider } from './context/PrivacyContext';
import './styles/index.css'

ReactDOM.createRoot(document.getElementById('root')).render(
    <React.StrictMode>
        <PrivacyProvider>
            <App />
        </PrivacyProvider>
    </React.StrictMode>,
)
