import { Progress, Tooltip } from '@mantine/core';
import type { Stats, Verdict } from '@lol-import/parser';
import { locale, t } from '../i18n';

const SECTIONS: Partial<Record<Verdict, [colour: string, label: string]>> = {
  existsAndPerfect: ['green', t('StatsBar.existsAndPerfect')],
  existsButNeedsUpdate: ['yellow', t('StatsBar.existsButNeedsUpdate')],
  missing: ['red', t('StatsBar.missing')],
};

export const getTotal = (stats: Stats) =>
  stats.existsAndPerfect +
  stats.existsAndSuggestionsIgnored +
  stats.existsButNeedsUpdate +
  stats.missing;

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

        let count = +stats[section];
        if (section === 'existsAndPerfect') {
          // add perfect and SuggestionsIgnored into the same group
          count += stats.existsAndSuggestionsIgnored;
        }

        const fullLabel = `${label} (${count.toLocaleString(locale)})`;
        return (
          <Tooltip key={section} label={fullLabel}>
            <Progress.Section
              value={(count / total) * 100}
              color={hidden?.[section] ? 'grey' : colour}
              onClick={() => {
                onClick?.(section);
                if (section === 'existsAndPerfect') {
                  onClick?.('existsAndSuggestionsIgnored');
                }
              }}
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
