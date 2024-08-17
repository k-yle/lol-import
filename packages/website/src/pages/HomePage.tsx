import { useContext, useEffect, useState } from 'react';
import { Accordion, Anchor, Card, Loader, Title } from '@mantine/core';
import { Link } from 'react-router-dom';
import TimeAgo from 'react-timeago-i18n';
import { DataContext } from '../context/DataContext';
import { getCountryName, locale, t } from '../i18n';
import { StatsBar, getTotal } from '../components/StatsBar';
import {
  APP_NAME,
  CONTINENTS,
  GITHUB_URL,
  NGA_URL,
  WIKI_URL,
} from '../helpers/constants';
import { getFlagEmoji } from '../helpers/geo';

const WELCOME_TEXT_LINKS = {
  a1: (str: string) => (
    <Anchor key="a1" href={NGA_URL} target="_blank">
      {str}
    </Anchor>
  ),
  a2: (str: string) => (
    <Anchor key="a2" href={WIKI_URL} target="_blank">
      {str}
    </Anchor>
  ),
  a3: (str: string) => (
    <Anchor key="a3" href={GITHUB_URL} target="_blank">
      {str}
    </Anchor>
  ),
  br: () => <br key={Math.random()} />,
};

export const HomePage = () => {
  const [tab, setTab] = useState<string | null>(null);
  const { indexFile } = useContext(DataContext);

  useEffect(() => {
    document.title = APP_NAME;
  }, []);

  if (!indexFile) return <Loader />;

  return (
    <div>
      <Card withBorder px={12} py={6} mb={16}>
        <div>
          {t('HomePage.welcome', {
            ...WELCOME_TEXT_LINKS,
            lastUpdated: (
              <TimeAgo
                key="timeago"
                date={indexFile.timestamp}
                locale={locale}
              />
            ),
          })}
        </div>
      </Card>
      <Title order={4}>Import Progress</Title>
      <StatsBar stats={indexFile.global} />
      <Accordion variant="contained" mt={16} value={tab} onChange={setTab}>
        {Object.entries(CONTINENTS).map(([continent, continentName]) => {
          return (
            <Accordion.Item key={continent} value={continent}>
              <Accordion.Control>{continentName}</Accordion.Control>
              <Accordion.Panel>
                {tab === continent &&
                  indexFile.continents[continent]
                    .map((country) => {
                      const stats = indexFile.byCountry[country];
                      return { country, stats, total: getTotal(stats) };
                    })
                    .sort((a, b) => b.total - a.total)
                    .map(({ country, stats, total }) => {
                      return (
                        <div key={country}>
                          <Anchor component={Link} to={`/${country}`}>
                            {!navigator.platform.includes('Win') &&
                              getFlagEmoji(country)}{' '}
                            {getCountryName(country) || t('noname.country')}
                          </Anchor>{' '}
                          ({total.toLocaleString(locale)}
                          ):
                          <StatsBar stats={stats} />
                        </div>
                      );
                    })}
              </Accordion.Panel>
            </Accordion.Item>
          );
        })}
      </Accordion>
    </div>
  );
};
