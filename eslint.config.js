import config from 'eslint-config-kyle';

export { default } from 'eslint-config-kyle';

config.push({
  rules: {
    'no-console': 'off',
    '@eslint-react/no-use-context': 'off',
  },
});
