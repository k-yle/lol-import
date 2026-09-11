import { EVERY_KEY } from './proxy.js';
import template from './taginfo_template.json' with { type: 'json' };

export const BASE_URL = new URL(template.project.icon_url).origin;
export const API_BASE_URL = new URL(template.data_url).origin;

export function generateTagInfoFile() {
  // @ts-expect-error -- see https://github.com/taginfo/taginfo-projects/pull/109#issuecomment-831076209
  delete template.$schema;

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
