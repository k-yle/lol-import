import { useContext, useEffect, useState } from 'react';
import { Accordion, Anchor, Card, Loader, Title } from '@mantine/core';
import { Link } from 'react-router-dom';
import type { MarkupHandlers } from 'react-mf2';
import TimeAgo from 'react-timeago-i18n';
import { DataContext } from '../context/DataContext';
import { getCountryName, locale, t } from '../i18n';
import { StatsBar, getTotal } from '../components/StatsBar';
import { APP_NAME, GITHUB_URL, NGA_URL, WIKI_URL } from '../helpers/constants';
import { getFlagEmoji } from '../helpers/geo';

const WELCOME_TEXT_LINKS: MarkupHandlers = {
  a1: ({ children }) => (
    <Anchor href={NGA_URL} target="_blank">
      {children}
    </Anchor>
  ),
  a2: ({ children }) => (
    <Anchor href={WIKI_URL} target="_blank">
      {children}
    </Anchor>
  ),
  a3: ({ children }) => (
    <Anchor href={GITHUB_URL} target="_blank">
      {children}
    </Anchor>
  ),
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
          {t.jsx(
            'HomePage.welcome',
            {},
            {
              ...WELCOME_TEXT_LINKS,
              lastUpdated: () => (
                <TimeAgo date={indexFile.timestamp} locale={locale} />
              ),
            },
          )}
        </div>
      </Card>
      <Title order={4}>Import Progress</Title>
      <StatsBar stats={indexFile.global} />
      <Accordion variant="contained" mt={16} value={tab} onChange={setTab}>
        {Object.entries(indexFile.continents)
          .toSorted()
          .map(([continent, countryList]) => {
            return (
              <Accordion.Item key={continent} value={continent}>
                <Accordion.Control>
                  {continent === '--' ? t('noname.country') : continent}
                </Accordion.Control>
                <Accordion.Panel>
                  {tab === continent &&
                    countryList
                      .map((country) => {
                        const stats = indexFile.byCountry[country];
                        return { country, stats, total: getTotal(stats) };
                      })
                      .toSorted((a, b) => b.total - a.total)
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
