import { useCallback } from 'react'

export function useLanguage() {
  const { language, setLanguage } = useTranslation()

  const changeLanguage = useCallback(
    (lang: string) => {
      setLanguage(lang as 'en' | 'ru')
      localStorage.setItem('language', lang)
    },
    [setLanguage]
  )

  return {
    currentLanguage: language,
    changeLanguage,
    availableLanguages: ['en', 'ru'],
    languageNames: {
      en: 'English',
      ru: 'Русский',
    },
  }
}

import { useTranslation } from '@/i18n/I18nContext'