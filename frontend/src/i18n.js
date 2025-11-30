import React, { createContext, useContext, useState } from 'react';
import en from './locales/en';
import fr from './locales/fr';

const resources = { en, fr };
const I18nContext = createContext();

export function I18nProvider({ children, defaultLang = 'fr' }) {
  const [lang, setLang] = useState(defaultLang);
  const t = (path) => {
    const parts = path.split('.');
    let cur = resources[lang];
    for (const p of parts) {
      if (!cur) return path;
      cur = cur[p];
    }
    return cur || path;
  };
  return (
    <I18nContext.Provider value={{ lang, setLang, t }}>
      {children}
    </I18nContext.Provider>
  );
}

export function useI18n() {
  return useContext(I18nContext);
}
