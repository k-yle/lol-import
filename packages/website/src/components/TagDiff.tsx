import { useContext, useMemo } from 'react';
import Diff, { type ReactDiffViewerProps } from 'react-diff-viewer-continued';
import { Group, Switch } from '@mantine/core';
import { useLocalStorage } from '@mantine/hooks';
import type { FELight } from '@lol-import/parser';
import { DataContext } from '../context/DataContext';
import { t } from '../i18n';

export type Tags = Record<string, string | null>;

export const tagsToString = (tags: Tags) =>
  Object.entries(tags)
    .toSorted(([a], [b]) => b.localeCompare(a))
    .filter(([, v]) => !!v)
    .map(([k, v]) => `${k}=${v!.replaceAll('\n', String.raw`\n`)}`)
    .join('\n');

export const TagDiff: React.FC<{
  light: FELight;
  renderContent?: ReactDiffViewerProps['renderContent'];
}> = ({ light, renderContent }) => {
  const { indexFile } = useContext(DataContext);
  const [showTrivialSuggestions, setShowTrivialSuggestions] = useLocalStorage({
    key: 'lol.showTrivialSuggestions',
    defaultValue: false,
  });

  const newTags = useMemo(() => {
    const out = { ...light.osm!.currentTags };
    for (const [key, value] of Object.entries(light.osm!.diff)) {
      if (!showTrivialSuggestions && indexFile?.TRIVIAL_KEYS.includes(key)) {
        continue;
      }

      if (value === '🗑️') delete out[key];
      out[key] = value;
    }
    return out;
  }, [light, showTrivialSuggestions, indexFile]);

  return (
    <div style={{ width: '100%', overflowX: 'auto' }}>
      <Group justify="flex-end" mb={4}>
        <Switch
          size="sm"
          checked={showTrivialSuggestions}
          onChange={(event) =>
            setShowTrivialSuggestions(event.currentTarget.checked)
          }
          label={t('TagDiff.show_trivial')}
        />
      </Group>
      <Diff
        hideLineNumbers
        renderContent={renderContent}
        oldValue={tagsToString(light.osm!.currentTags)}
        newValue={tagsToString(newTags)}
      />
    </div>
  );
};
