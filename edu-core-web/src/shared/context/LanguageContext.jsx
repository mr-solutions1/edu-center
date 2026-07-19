import React, { createContext, useContext, useState, useEffect } from 'react';
import arErrors from '../../i18n/errors/ar';
import enErrors from '../../i18n/errors/en';

const LanguageContext = createContext(null);

export const LanguageProvider = ({ children }) => {
  const [locale, setLocale] = useState(() => {
    if (typeof window !== 'undefined' && window.localStorage) {
      return window.localStorage.getItem('edu_locale') || 'ar';
    }
    return 'ar';
  });

  const toggleLanguage = () => {
    const nextLocale = locale === 'ar' ? 'en' : 'ar';
    setLocale(nextLocale);
    if (typeof window !== 'undefined' && window.localStorage) {
      window.localStorage.setItem('edu_locale', nextLocale);
    }
  };

  useEffect(() => {
    if (typeof document !== 'undefined') {
      const html = document.documentElement;
      html.setAttribute('lang', locale);
      html.setAttribute('dir', locale === 'ar' ? 'rtl' : 'ltr');
    }
  }, [locale]);

  const t = (key) => {
    const dicts = {
      ar: arErrors,
      en: enErrors,
    };

    const localeDict = dicts[locale] || dicts.ar;
    const translation = localeDict[key];

    if (translation) {
      return translation;
    }

    return {
      title: locale === 'ar' ? 'حدث خطأ ما' : 'An error occurred',
      message: key || (locale === 'ar' ? 'تعذر معالجة الطلب حالياً.' : 'Could not process request.'),
    };
  };

  const value = {
    locale,
    setLocale,
    toggleLanguage,
    t,
    isRtl: locale === 'ar',
  };

  return (
    <LanguageContext.Provider value={value}>
      <div dir={locale === 'ar' ? 'rtl' : 'ltr'} className="contents">
        {children}
      </div>
    </LanguageContext.Provider>
  );
};

export const useLanguage = () => {
  const context = useContext(LanguageContext);
  if (!context) {
    throw new Error('useLanguage must be used within a LanguageProvider');
  }
  return context;
};
