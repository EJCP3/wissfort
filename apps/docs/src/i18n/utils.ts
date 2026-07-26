import es from '../locales/es.json';
import en from '../locales/en.json';

export type Lang = 'es' | 'en';
export const defaultLang: Lang = 'en';

const ui = {
  es,
  en,
} as const;

export function useTranslations(lang: Lang) {
  return function t(key: string) {
    return key.split('.').reduce((obj: any, k: string) => (obj || {})[k], ui[lang]) || key;
  };
}

export function getTranslations(lang: Lang, key: string) {
  return key.split('.').reduce((obj: any, k: string) => (obj || {})[k], ui[lang]) || {};
}
