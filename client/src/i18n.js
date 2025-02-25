import i18n from "i18next";
import { initReactI18next } from "react-i18next";

// Import the translation files
import enTranslation from "../public/locales/$LOCALE/translation.json/i18n/en/translation.json";
import esTranslation from "../public/locales/$LOCALE/translation.json/i18n/es/translation.json";
import frTranslation from "../public/locales/$LOCALE/translation.json/i18n/fr/translation.json";

i18n.use(initReactI18next).init({
  resources: {
    en: {
      translation: enTranslation,
    },
    es: {
      translation: esTranslation,
    },
    fr: {
      translation: frTranslation,
    },
  },
  lng: "en", // default language
  fallbackLng: "en",
  interpolation: {
    escapeValue: false,
  },
});

export default i18n;
