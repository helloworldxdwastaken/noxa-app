import React, { createContext, useContext, useMemo, useState } from 'react';
import type { ReactNode } from 'react';
import { NativeModules, Platform } from 'react-native';

import { fallbackLanguage, SupportedLanguage, translate } from '../i18n/translations';

type LanguageContextValue = {
  language: SupportedLanguage;
  setLanguage: (lang: SupportedLanguage) => void;
  t: (key: string, vars?: Record<string, string | number>) => string;
};

const LanguageContext = createContext<LanguageContextValue | undefined>(undefined);

const detectDeviceLanguage = (): SupportedLanguage => {
  try {
    const locale =
      Platform.OS === 'ios'
        ? NativeModules.SettingsManager?.settings?.AppleLocale ||
          NativeModules.SettingsManager?.settings?.AppleLanguages?.[0]
        : NativeModules.I18nManager?.localeIdentifier;
    if (!locale) {
      return fallbackLanguage;
    }
    const code = locale.replace('_', '-').split('-')[0]?.toLowerCase();
    return (['en', 'es'] as SupportedLanguage[]).includes(code as SupportedLanguage)
      ? (code as SupportedLanguage)
      : fallbackLanguage;
  } catch {
    return fallbackLanguage;
  }
};

export const LanguageProvider = ({ children }: { children: ReactNode }) => {
  const [language, setLanguage] = useState<SupportedLanguage>(detectDeviceLanguage());

  const value = useMemo(
    () => ({
      language,
      setLanguage,
      t: (key: string, vars?: Record<string, string | number>) => translate(language, key, vars),
    }),
    [language],
  );

  return <LanguageContext.Provider value={value}>{children}</LanguageContext.Provider>;
};

export const useLanguage = () => {
  const context = useContext(LanguageContext);
  if (!context) {
    throw new Error('useLanguage must be used within LanguageProvider');
  }
  return context;
};
