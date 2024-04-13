import {
  type Dispatch,
  type RefObject,
  type SetStateAction,
  useEffect,
  useRef,
  useState,
} from 'react';

export function useRefState<T>(
  defaultValue?: T,
): [
  state: T | undefined,
  setState: Dispatch<SetStateAction<T | undefined>>,
  ref: RefObject<T | undefined>,
] {
  const [value, setValue] = useState<T | undefined>(defaultValue);
  const valueRef = useRef(defaultValue);

  useEffect(() => {
    valueRef.current = value;
  }, [value]);

  return [value, setValue, valueRef];
}
