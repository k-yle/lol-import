import {
  type PropsWithChildren,
  createContext,
  useCallback,
  useEffect,
  useMemo,
  useState,
} from 'react';
import { Alert } from '@mantine/core';
import { IconAlertHexagon } from '@tabler/icons-react';
import type { FullFile, StatsFile } from '../../../parser/src/helpers/types';
import { useRefState } from '../hooks/useRefState';
import { t } from '../i18n';

type IDataContext = {
  indexFile: StatsFile | undefined;
  idLookup:
    | { [lightId: string]: [lightIdWithSpaces: string, countryCode: string] }
    | undefined;
  loadCountry(country: string): void;
  dataByCountry: FullFile | undefined;
};

const CDN_URL =
  localStorage.isDev && window.location.hostname === '127.0.0.1'
    ? 'http://localhost:3000'
    : 'https://cdn.list.lighting';

export const DataContext = createContext({} as IDataContext);

export const DataWrapper: React.FC<PropsWithChildren> = ({ children }) => {
  const [indexFile, setIndexFile] = useState<StatsFile>();
  const [dataByCountry, setDataByCountry, dataByCountryRef] =
    useRefState<FullFile>();
  const [error, setError] = useState<unknown>();

  useEffect(() => {
    fetch(`${CDN_URL}/stats.json`)
      .then((r) => r.json())
      .then(setIndexFile)
      .catch(setError);
  }, []);

  const idLookup = useMemo(() => {
    if (!indexFile) return undefined;

    const lookup: IDataContext['idLookup'] = {};
    for (const countryCode in indexFile.byCountry) {
      for (const ref of indexFile.byCountry[countryCode].ids) {
        lookup[ref.replaceAll(' ', '')] = [ref, countryCode];
      }
    }
    return lookup;
  }, [indexFile]);

  const loadCountry = useCallback(
    (country: string) => {
      if (country in dataByCountryRef) return; // abort, data already loaded

      fetch(`${CDN_URL}/full/${country}.json`)
        .then((r) => r.json())
        .then((data) => setDataByCountry((c) => ({ ...c, [country]: data })))
        .catch(setError);
    },
    [setDataByCountry, dataByCountryRef],
  );

  const context = useMemo(() => {
    return { indexFile, idLookup, loadCountry, dataByCountry };
  }, [indexFile, idLookup, loadCountry, dataByCountry]);

  if (error) {
    return (
      <Alert
        icon={<IconAlertHexagon size={16} />}
        title={t('error.fetch')}
        color="red"
        m={32}
      />
    );
  }

  return (
    <DataContext.Provider value={context}>{children}</DataContext.Provider>
  );
};
