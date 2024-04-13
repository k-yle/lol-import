import { Select } from '@mantine/core';
import { locale } from '../i18n';
import { translations } from '../translations';

const supportedLanguages = Object.keys(translations);

const currentValue = localStorage.lang || 'en';

const languageNames = new Intl.DisplayNames([locale], { type: 'language' });

export const ChangeLanguageInput: React.FC = () => {
  return (
    <Select
      variant="unstyled"
      value={currentValue}
      onChange={(newValue) => {
        if (!newValue) return;

        localStorage.lang = newValue;
        window.location.reload();
      }}
      data={supportedLanguages.map((code) => ({
        value: code,
        label: languageNames.of(code) || code,
      }))}
    />
  );
};
