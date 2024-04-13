import { Progress, Tooltip } from '@mantine/core';
import type { Stats } from '../../../parser/src/helpers/types';
import { locale, t } from '../i18n';

const SECTIONS: Partial<Record<keyof Stats, [colour: string, label: string]>> =
  {
    existsAndPerfect: ['green', t('StatsBar.existsAndPerfect')],
    existsButNeedsUpdate: ['yellow', t('StatsBar.existsButNeedsUpdate')],
    missing: ['red', t('StatsBar.missing')],
  };

export const getTotal = (stats: Stats) =>
  stats.existsAndPerfect + stats.existsButNeedsUpdate + stats.missing;

export const StatsBar: React.FC<{
  stats: Stats;
  hidden?: Record<string, boolean>;
  onClick?(section: string): void;
}> = ({ stats, hidden, onClick }) => {
  const total = getTotal(stats);

  return (
    <Progress.Root size={20}>
      {Object.entries(SECTIONS).map(([_section, [colour, label]]) => {
        const section = _section as keyof Stats;
        const fullLabel = `${label} (${stats[section].toLocaleString(locale)})`;
        return (
          <Tooltip key={section} label={fullLabel}>
            <Progress.Section
              value={(+stats[section] / total) * 100}
              color={hidden?.[section] ? 'grey' : colour}
              onClick={() => onClick?.(section)}
              style={onClick ? { cursor: 'pointer' } : {}}
            >
              <Progress.Label
                style={
                  hidden?.[section] ? { textDecoration: 'line-through' } : {}
                }
              >
                {fullLabel}
              </Progress.Label>
            </Progress.Section>
          </Tooltip>
        );
      })}
    </Progress.Root>
  );
};
