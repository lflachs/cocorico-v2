'use client';

import { createContext, useContext, useState, useEffect, type ReactNode } from 'react';
import { type Language, translations, type TranslationKey } from '@/lib/i18n';

/**
 * Language Context Provider
 * Handles internationalization (EN/FR) with localStorage persistence
 */

type LanguageContextType = {
  language: Language;
  setLanguage: (lang: Language) => void;
  t: (key: TranslationKey) => string;
};

const LanguageContext = createContext<LanguageContextType | undefined>(undefined);

export function LanguageProvider({ children }: { children: ReactNode }) {
  const [language, setLanguage] = useState<Language>('en');
  const [isInitialized, setIsInitialized] = useState(false);

  // Load from cookie first, then localStorage (run only once)
  useEffect(() => {
    // Try to get from cookie first (server-side preference)
    const getCookie = (name: string) => {
      const value = `; ${document.cookie}`;
      const parts = value.split(`; ${name}=`);
      if (parts.length === 2) return parts.pop()?.split(';').shift();
      return null;
    };

    const cookieLang = getCookie('language') as Language;
    const storedLang = localStorage.getItem('language') as Language;

    const preferredLang = cookieLang || storedLang;

    console.log('[LanguageProvider] Initial load - cookie:', cookieLang, 'localStorage:', storedLang, 'using:', preferredLang);

    if (preferredLang && (preferredLang === 'en' || preferredLang === 'fr')) {
      setLanguage(preferredLang);
    }
    setIsInitialized(true);
  }, []);

  // Save to localStorage and cookie (only after initialization)
  useEffect(() => {
    if (!isInitialized) return;

    console.log('[LanguageProvider] Saving language:', language);
    localStorage.setItem('language', language);
    // Also set cookie to sync with server
    document.cookie = `language=${language}; path=/; max-age=31536000`; // 1 year
  }, [language, isInitialized]);

  const t = (key: TranslationKey): string => {
    return translations[language][key] || translations.en[key] || key;
  };

  return (
    <LanguageContext.Provider value={{ language, setLanguage, t }}>
      {children}
    </LanguageContext.Provider>
  );
}

export function useLanguage(): LanguageContextType {
  const context = useContext(LanguageContext);
  if (context === undefined) {
    throw new Error('useLanguage must be used within a LanguageProvider');
  }
  return context;
}
