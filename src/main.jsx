import React from 'react';
import ReactDOM from 'react-dom/client';
import { BrowserRouter } from 'react-router-dom';
import App from './App.jsx';
import PWAInstallPrompt from './components/PWAInstallPrompt.jsx';
import './index.css';

ReactDOM.createRoot(document.getElementById('root')).render(
    <BrowserRouter>
      <App />
      <PWAInstallPrompt />
    </BrowserRouter>
);
