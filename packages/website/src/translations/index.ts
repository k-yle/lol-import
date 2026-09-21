import type en from './en.json';

export type TranslationFile = {
  default: {
    [key: string]: string;
  };
};

// these files are lazily imported, since we
// only ever need to load one language.
export const translations = {
  en: () => import('./en.json'),
  de: () => import('./de.json'),
} satisfies Record<string, () => Promise<TranslationFile>>;

export type TranslationKey = keyof typeof en;
