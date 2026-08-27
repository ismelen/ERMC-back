import i18n from 'i18next';
import { initReactI18next } from 'react-i18next';
import * as Localization from 'expo-localization';
import en from './locales/en.json';
import es from './locales/es.json';

const resources = {
  en: { translation: en },
  es: { translation: es },
};

const SUPPORTED_LANGUAGES = ['en', 'es'] as const;
export type SupportedLanguage = (typeof SUPPORTED_LANGUAGES)[number];

const deviceLanguage = Localization.getLocales()[0]?.languageCode ?? 'en';
const defaultLanguage: SupportedLanguage = SUPPORTED_LANGUAGES.includes(
  deviceLanguage as SupportedLanguage
)
  ? (deviceLanguage as SupportedLanguage)
  : 'en';

i18n.use(initReactI18next).init({
  resources,
  lng: defaultLanguage,
  fallbackLng: 'en',
  interpolation: {
    escapeValue: false,
  },
  compatibilityJSON: 'v4',
});

export default i18n;
