/**
 * Helper function to parse segments of a string until there's
 * nothing left in the string that we understand

 */
export function tokeniser<T>(
  original: string,
  checker: (
    workingString: string,
  ) => { raw: string | string[]; parsed: T | T[] } | undefined,
) {
  /** we chop out parts of this string until there's nothing left that we understand */
  let workingString = original;

  function removeFromWorkingString(subString: string) {
    workingString = workingString
      .replace(subString, '')
      .replaceAll(/(^[\n ,.]+|[\n ,.]+$)/g, ''); // like String#trim, but includes punctuation
  }

  // no-op to trim existing whitespace
  removeFromWorkingString('----------');

  const output: T[] = [];

  let lastIteration: string | undefined;
  // eslint-disable-next-line no-constant-condition
  while (true) {
    // if nothing has changed in the last iteration, then we're done
    if (lastIteration === workingString) break;
    lastIteration = workingString;

    const checkerResult = checker(workingString);
    if (checkerResult) {
      if (Array.isArray(checkerResult.raw)) {
        for (const chunk of checkerResult.raw) {
          removeFromWorkingString(chunk);
        }
      } else {
        removeFromWorkingString(checkerResult.raw);
      }
      if (Array.isArray(checkerResult.parsed)) {
        output.push(...checkerResult.parsed);
      } else {
        output.push(checkerResult.parsed);
      }
    }
  }

  return { output, unparsable: workingString };
}
