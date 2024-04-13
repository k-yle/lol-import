import { useMemo } from 'react';
// @ts-expect-error -- no typedefs
import { diffLines, formatLines } from 'unidiff';
import { Hunk, Diff as RawDiff, parseDiff } from 'react-diff-view';
import 'react-diff-view/style/index.css';

export const Diff: React.FC<{ oldValue: string; newValue: string }> = ({
  oldValue,
  newValue,
}) => {
  const diffFile = useMemo(() => {
    const diffText = formatLines(diffLines(oldValue, newValue), {
      context: 3,
    });
    return parseDiff(diffText, { nearbySequences: 'zip' })[0];
  }, [oldValue, newValue]);

  return (
    <div style={{ background: '#fff' }}>
      <RawDiff viewType="split" diffType={diffFile.type} hunks={diffFile.hunks}>
        {(hunks) =>
          hunks.map((hunk) => <Hunk key={hunk.content} hunk={hunk} />)
        }
      </RawDiff>
    </div>
  );
};
