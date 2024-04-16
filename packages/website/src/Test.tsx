import { Fragment } from 'react/jsx-runtime';
import type { FELight } from '../../parser/src/helpers/types';
import type { Tags } from './components/TagDiff';
import { reëncodeLight } from './helpers/reëncodeLight';

function polarToCartesian(centerX, centerY, radius, angleInDegrees) {
  const angleInRadians = ((angleInDegrees - 90) * Math.PI) / 180;

  return {
    x: centerX + radius * Math.cos(angleInRadians),
    y: centerY + radius * Math.sin(angleInRadians),
  };
}

function describeArc(x, y, radius, startAngle, endAngle) {
  const start = polarToCartesian(x, y, radius, endAngle);
  const end = polarToCartesian(x, y, radius, startAngle);

  const d = [
    'M',
    start.x,
    start.y,
    'A',
    radius,
    radius,
    0,
    +!(endAngle - startAngle <= 180),
    0,
    end.x,
    end.y,
  ].join(' ');

  return d;
}

const SECTOR_KEY_REGEX = /seamark:light:(?<sector>\d+):/;

export const getHighestSector = (tags: Tags) =>
  Object.keys(tags)
    .map((key) => key.match(SECTOR_KEY_REGEX)?.groups?.sector)
    .filter(Boolean)
    .map(Number)
    .sort((a, b) => b - a)[0] || 0;

function renderArcs(tags: Tags, radius: number, showLabels?: boolean) {
  const [x, y] = [100, 100];
  return (
    <>
      <path
        stroke="black"
        fill="none"
        strokeWidth="4.5"
        d={describeArc(x, y, radius, 0, 359.9999)}
      />
      s
      {Array.from({ length: getHighestSector(tags) })
        .fill(0)
        .map((_, index) => {
          const key = index;
          const startAngle = +tags[`seamark:light:${index + 1}:sector_start`]!;
          const endAngle = +tags[`seamark:light:${index + 1}:sector_end`]!;
          const midpointAngle = startAngle + (endAngle - startAngle) / 2;

          const start = polarToCartesian(x, y, radius + 5, 180 + startAngle);
          const end = polarToCartesian(x, y, radius + 5, 180 + endAngle);
          const midpoint = polarToCartesian(x, y, radius + 20, midpointAngle);
          let colour = tags[`seamark:light:${index + 1}:colour`]!;
          if (colour === 'white') colour = 'yellow';

          return (
            <Fragment key={key}>
              <path
                stroke={colour}
                fill="none"
                strokeWidth="5"
                d={describeArc(x, y, radius, 180 + startAngle, 180 + endAngle)}
              />
              <text x={start.x} y={start.y} fontSize={4}>
                {startAngle}°
              </text>
              <text x={end.x} y={end.y} fontSize={4}>
                {endAngle}°
              </text>
              {showLabels && (
                <g
                  style={{
                    transform: `translate(${100 - midpoint.x}px, ${100 - midpoint.y}px)`,
                  }}
                >
                  <text
                    x={x}
                    y={y}
                    fontSize={4}
                    textAnchor="middle"
                    style={{
                      // prevent labels going upside down
                      transform: `rotate(${midpointAngle + 180 + (midpointAngle < 180 ? 90 : -90)}deg)`,
                      transformOrigin: 'center',
                    }}
                  >
                    {reëncodeLight(tags, `${index + 1}:`)}
                  </text>
                </g>
              )}
            </Fragment>
          );
        })}
    </>
  );
}

export const Test: React.FC<{ light: FELight }> = ({ light }) => {
  return (
    <svg
      viewBox="0 0 200 200"
      width="50vw"
      style={{ border: '1px solid #999' }}
    >
      <circle cx={100} cy={100} r={2} />
      {renderArcs(light.tags, 50, true)}
      {light.osm && renderArcs(light.osm.currentTags, 40)}
    </svg>
  );
};
