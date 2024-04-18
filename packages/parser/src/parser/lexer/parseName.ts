const TOKENS = <const>[
  'RACON',
  'RAMARK',
  'LIGHTSHIP',
  'LIGHTFLOAT',
  'AVIATION LIGHT',
];
export type Token = (typeof TOKENS)[number];

const reTokens = new RegExp(`(${[...TOKENS].join('|')})`, 'g');

export function parseName(name: string) {
  const tokenFromName = new Set<Token>();
  for (const token of TOKENS) {
    if (name.includes(token)) tokenFromName.add(token);
  }

  const cleanedName = name
    .split(',')[0]
    .split('.')[0]
    // remove all known tokens
    .replaceAll(reTokens, '')
    // splitting at the comma and dot automatically
    // removes cruft like "RACON" from the name
    .replaceAll(/(^[ -]+|[ -]+$)/g, ''); // trim leading/trailing punctuation

  return { cleanedName, tokenFromName };
}
