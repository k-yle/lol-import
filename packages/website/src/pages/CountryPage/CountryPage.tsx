import { useContext, useEffect, useMemo, useState } from 'react';
import { Link, useNavigate, useParams } from 'react-router-dom';
import {
  Alert,
  Anchor,
  Breadcrumbs,
  Code,
  List,
  Loader,
  Title,
} from '@mantine/core';
import { IconAlertHexagon } from '@tabler/icons-react';
import { DataContext } from '../../context/DataContext';
import { getCountryName, locale, t } from '../../i18n';
import { StatsBar, getTotal } from '../../components/StatsBar';
import type { Stats } from '../../../../parser/src/helpers/types';
import 'leaflet/dist/leaflet.css';
import { getListIcon } from '../../components/icons';
import { createBbox } from '../../helpers/geo';
import { APP_NAME } from '../../helpers/constants';
import { CountryPageMap } from './CountryPageMap';

const InnerCountryPage: React.FC<{
  stats: Stats;
  country: string;
  countryName: string;
}> = ({ stats, country, countryName }) => {
  const { dataByCountry } = useContext(DataContext);
  const [hidden, setHidden] = useState<Record<string, boolean>>({});

  const data = dataByCountry?.[country];

  useEffect(() => {
    document.title = `${countryName} – ${APP_NAME}`;
  }, [countryName]);

  const bbox = useMemo(() => {
    return data && createBbox(Object.values(data));
  }, [data]);

  if (!data || !bbox) return <Loader />;

  return (
    <div style={{ width: 'calc(50% - 24px)' }}>
      <Title order={3}>{countryName}</Title>
      {t('CountryPage.subtitle', { n: getTotal(stats).toLocaleString(locale) })}
      <StatsBar
        stats={stats}
        hidden={hidden}
        onClick={(section) =>
          setHidden((c) => ({ ...c, [section]: !c[section] }))
        }
      />
      <List spacing="xs" size="sm" center mt={32}>
        {Object.entries(data)
          .sort(([, a], [, b]) =>
            (a.tags['seamark:name'] || 'Z').localeCompare(
              b.tags['seamark:name'] || 'Z',
            ),
          )
          .filter(
            ([, light]) => hidden[light.osm?.verdict || 'missing'] !== true,
          )
          .map(([id, light]) => {
            return (
              <List.Item key={id} icon={getListIcon(light.osm?.verdict)}>
                <Anchor
                  component={Link}
                  to={`/${country}/${id.replaceAll(' ', '')}`}
                >
                  {light.tags['seamark:name'] || <em>{t('noname.light')}</em>}
                </Anchor>
              </List.Item>
            );
          })}
      </List>
      <CountryPageMap centre={bbox.centre} data={data} hidden={hidden} />
    </div>
  );
};

export const CountryPage: React.FC = () => {
  const { country } = useParams() as { country: string };
  const navigate = useNavigate();

  const { idLookup, indexFile, dataByCountry, loadCountry } =
    useContext(DataContext);

  // redirect short URLs to include the country
  useEffect(() => {
    const maybeRef = decodeURIComponent(country).replaceAll(' ', '');
    if (!idLookup) return;
    if (idLookup[maybeRef]) {
      const [, realCountry] = idLookup[maybeRef];
      navigate(`/${realCountry}/${maybeRef}`, { replace: true });
    } else {
      loadCountry(country);
    }
  }, [idLookup, country, navigate, loadCountry]);

  if (!indexFile || !dataByCountry) return <Loader />;

  const stats = indexFile.byCountry[country];
  const countryName = getCountryName(country) || t('noname.country');

  if (!stats) {
    if (countryName) {
      return (
        <Alert
          icon={<IconAlertHexagon size={16} />}
          title={t('CountryPage.country-not-found', { countryName })}
          color="red"
        />
      );
    }
    return (
      <Alert
        icon={<IconAlertHexagon size={16} />}
        title={t('CountryPage.not-found.title')}
        color="red"
      >
        {t('CountryPage.not-found.desc', {
          ref: <Code key={0}>{country}</Code>,
        })}
      </Alert>
    );
  }

  return (
    <div>
      <Breadcrumbs style={{ alignContent: 'center' }}>
        <Anchor component={Link} to="/">
          {t('Breadcrumbs.home')}
        </Anchor>
        <Anchor component={Link} to={`/${country}`}>
          {countryName}
        </Anchor>
      </Breadcrumbs>
      <InnerCountryPage
        stats={stats}
        country={country}
        countryName={countryName}
      />
    </div>
  );
};
