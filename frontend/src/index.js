import React from 'react';
import ReactDOM from 'react-dom/client';
import './index.css';
import App from './App';
import reportWebVitals from './reportWebVitals';
import { I18nProvider } from './i18n';

const root = ReactDOM.createRoot(document.getElementById('root'));
root.render(
  <React.StrictMode>
    <I18nProvider defaultLang={localStorage.getItem('lang') || 'fr'}>
      <App />
    </I18nProvider>
  </React.StrictMode>
);

reportWebVitals();
