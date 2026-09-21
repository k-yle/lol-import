import { Code } from '@mantine/core';
import { MessageFormat } from 'messageformat';
import { type MarkupHandlers, formatToJsx } from 'react-mf2';
import { type TranslationKey, translations } from './translations';

const MARKUP: MarkupHandlers = {
  b: 'b',
  i: 'i',
  em: 'em',
  br: 'br',
  code: Code,
};

export type SupportedLanguage = keyof typeof translations;
export function getDefaultLanguage(): SupportedLanguage {
  // if the user chose a language last time, use it
  if (localStorage.lang) return localStorage.lang;

  // otherwise, find the first supported language
  return (
    navigator.languages
      // strip out the country code to get just the language
      .map((fullLocale) => fullLocale.split('-', 1)[0])
      // if the user has multiple system languages, find the first one we support
      .find((lang): lang is SupportedLanguage => lang in translations) || 'en'
  );
}

export const locale = getDefaultLanguage();

document.querySelector('html')!.setAttribute('lang', locale);

let messages: Record<TranslationKey, string>;
const cache: Partial<Record<TranslationKey, MessageFormat>> = {};

export const i18nReady = (async () => {
  ({ default: messages } = await translations[locale]());
})();

function getMessage(key: TranslationKey) {
  const value = messages[key];

  if (!value) return '❓';

  // MessageFormat() is expensive, avoid it for trivial strings
  if (!value.includes('{')) return value;

  cache[key] ||= new MessageFormat(locale, value);
  return cache[key];
}

export const t = (key: TranslationKey, params?: Record<string, unknown>) => {
  const message = getMessage(key);
  if (typeof message === 'string') return message;
  return message.format(params);
};

t.jsx = (
  key: TranslationKey,
  params?: Record<string, unknown>,
  markup?: MarkupHandlers,
): React.ReactNode => {
  const message = getMessage(key);
  if (typeof message === 'string') return message;
  return formatToJsx(message, params, { ...MARKUP, ...markup });
};

const COUNTRY_NAMES = new Intl.DisplayNames(locale, {
  type: 'region',
});

export const getCountryName = (countryCode: string) => {
  try {
    return COUNTRY_NAMES.of(countryCode);
  } catch {
    return undefined;
  }
};
