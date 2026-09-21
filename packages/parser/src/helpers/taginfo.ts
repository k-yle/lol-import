import { EVERY_KEY } from './proxy.js';
import template from './taginfo_template.json' with { type: 'json' };

export function generateTagInfoFile() {
  template.data_updated = new Date()
    .toISOString()
    .replaceAll(/[:-]|(\.\d+)/g, '');

  (<unknown[]>template.tags) = Object.keys(EVERY_KEY)
    .toSorted((a, b) => a.localeCompare(b))
    .map((key) => {
      const values = Object.keys(EVERY_KEY[key]);
      return {
        key,
        value: values.length === 1 ? values[0] : undefined,
        object_types: ['node', 'area', 'relation'],
      };
    });

  return template;
}
