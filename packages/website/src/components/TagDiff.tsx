import { useMemo } from 'react';
import Diff from 'react-diff-viewer-continued';
import type { FELight } from '@lol-import/parser';

export type Tags = Record<string, string | null>;

export const tagsToString = (tags: Tags) =>
  Object.entries(tags)
    .toSorted(([a], [b]) => b.localeCompare(a))
    .filter(([, v]) => !!v)
    .map(([k, v]) => `${k}=${v!.replaceAll('\n', String.raw`\n`)}`)
    .join('\n');

export const TagDiff: React.FC<{ light: FELight }> = ({ light }) => {
  const newTags = useMemo(() => {
    const out = { ...light.osm!.currentTags };
    for (const [key, value] of Object.entries(light.osm!.diff)) {
      if (value === '🗑️') delete out[key];
      out[key] = value;
    }
    return out;
  }, [light]);

  return (
    <div style={{ width: '100%', overflowX: 'auto' }}>
      <Diff
        hideLineNumbers
        oldValue={tagsToString(light.osm!.currentTags)}
        newValue={tagsToString(newTags)}
      />
    </div>
  );
};
