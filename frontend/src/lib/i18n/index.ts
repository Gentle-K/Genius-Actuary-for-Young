import i18n from 'i18next'
import { initReactI18next } from 'react-i18next'

import { DEFAULT_LOCALE, SUPPORTED_LOCALES } from '@/lib/i18n/locale'
import { resources } from '@/lib/i18n/resources'

void i18n.use(initReactI18next).init({
  resources,
  lng: DEFAULT_LOCALE,
  fallbackLng: false,
  supportedLngs: [...SUPPORTED_LOCALES],
  nonExplicitSupportedLngs: false,
  returnNull: false,
  interpolation: {
    escapeValue: false,
  },
})

export { i18n }
