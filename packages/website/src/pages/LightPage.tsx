import { type PropsWithChildren, useContext, useEffect, useMemo } from 'react';
import {
  ActionIcon,
  Alert,
  Anchor,
  Breadcrumbs,
  Card,
  Code,
  ColorSwatch,
  Flex,
  Group,
  Loader,
  Mark,
  type MarkProps,
  Menu,
  Table,
  Text,
  Title,
  Tooltip,
  rem,
} from '@mantine/core';
import {
  IconAlertHexagon,
  IconAlertTriangle,
  IconCheck,
  IconCopy,
  IconDots,
  IconExternalLink,
} from '@tabler/icons-react';
import { Link, useNavigate, useParams } from 'react-router-dom';
import { LIGHT_CHARACTERISTICS } from 'light-characteristics';
import { useLocalStorage } from '@mantine/hooks';
import { DataContext } from '../context/DataContext';
import { getCountryName, t } from '../i18n';
import type { FELight } from '../../../parser/src/helpers/types';
import { TagDiff, tagsToString } from '../components/TagDiff';
import { reëncodeLight } from '../helpers/reëncodeLight';
import { APP_NAME } from '../helpers/constants';

const ERRORS = {
  UNPARSABLE: t('error.unparsable'),
  UNPARSABLE_INFO: t('error.unparsable_info'),
  GENERIC_BUOY_BEACON: (type: string) =>
    t('error.generic_buoy_beacon', {
      type: type === 'beacon' ? t('type.beacon') : t('type.buoy'),
      tag: <Code key={0}>{type}_special_purpose</Code>,
    }),
};

const createOsmLink = (id: string) => {
  const longType = { n: 'node', w: 'way', r: 'relation' }[id[0]];
  return `https://openstreetmap.org/${longType}/${id.slice(1)}`;
};

const JsxReplace: React.FC<{
  text: string;
  toReplace: string;
  Replacement(props: PropsWithChildren): React.ReactNode;
}> = ({ text, toReplace, Replacement }) => {
  if (!text.includes(toReplace)) return text;

  return text.split(toReplace).flatMap((part, index) => {
    if (!index) return part;
    const key = index + part;
    return [<Replacement key={key}>{toReplace}</Replacement>, part];
  });
};

const createMarkWithReason = (reason: React.ReactNode) =>
  Object.assign(
    (props: MarkProps) => (
      <Tooltip label={reason}>
        <Mark {...props} style={{ cursor: 'help' }} />
      </Tooltip>
    ),
    { displayName: 'MarkWithReason' },
  );

function highlightErrors(text: string | null, light: FELight) {
  if (!text) return text;

  const unparsableTokens = light.tags['seamark:information']?.split(';') || [];
  for (const token of unparsableTokens) {
    const index = text.toLowerCase().indexOf(token.toLowerCase());
    if (index !== -1) {
      // this ensure that we use the original capitalisation
      const toReplace = text.slice(index, index + token.length);
      return (
        <Code block>
          <JsxReplace
            text={text}
            toReplace={toReplace}
            Replacement={createMarkWithReason(ERRORS.UNPARSABLE)}
          />
        </Code>
      );
    }
  }

  // it's all good
  return <Code block>{text}</Code>;
}

function renderKey(key: string) {
  const SEGMENTS_TO_HIGHLIGHT = [':beacon:', ':buoy:'];
  for (const segment of SEGMENTS_TO_HIGHLIGHT) {
    if (key.includes(segment)) {
      return (
        <JsxReplace
          text={key}
          toReplace={segment}
          Replacement={createMarkWithReason(
            ERRORS.GENERIC_BUOY_BEACON(segment.replaceAll(':', '')),
          )}
        />
      );
    }
  }
  return key;
}

function renderValue(key: string, value: string) {
  if (key === 'seamark:information') {
    const Markk = createMarkWithReason(ERRORS.UNPARSABLE_INFO);
    return <Markk>{value}</Markk>;
  }
  if (key === 'seamark:type') {
    if (value === 'buoy' || value === 'beacon') {
      const Markk = createMarkWithReason(ERRORS.GENERIC_BUOY_BEACON(value));
      return <Markk>{value}</Markk>;
    } else {
      return (
        <Anchor href={`https://osm.wiki/Tag:${key}=${value}`} target="_blank">
          {value}
        </Anchor>
      );
    }
  }
  if (key.endsWith(':colour')) {
    return (
      <Flex align="center" gap={4}>
        {value.split(';').map((colour, index) => (
          <ColorSwatch
            // eslint-disable-next-line react/no-array-index-key
            key={colour + index}
            size={rem(14)}
            color={colour}
            display="inline-block"
          />
        ))}{' '}
        {value}
      </Flex>
    );
  }
  if (key === 'seamark:light:character' && value in LIGHT_CHARACTERISTICS) {
    const label = LIGHT_CHARACTERISTICS[value as never];
    return (
      <span style={{ textTransform: 'capitalize' }}>
        {label} (<Code>{value}</Code>)
      </span>
    );
  }
  return value;
}

const JsonCard: React.FC<{
  title: React.ReactNode;
  json?: Record<string, string | null>;
  children?: React.ReactNode;
  customOptions?: React.ReactNode;
}> = ({ title, json, children, customOptions }) => {
  return (
    <Card withBorder my={16}>
      <Card.Section withBorder inheritPadding py="xs">
        <Group justify="space-between">
          <Text fw={500}>{title}</Text>
          {json && (
            <Menu withinPortal position="bottom-end" shadow="sm">
              <Menu.Target>
                <ActionIcon variant="subtle" color="gray">
                  <IconDots style={{ width: rem(16), height: rem(16) }} />
                </ActionIcon>
              </Menu.Target>

              <Menu.Dropdown>
                <Menu.Item
                  onClick={() =>
                    navigator.clipboard.writeText(tagsToString(json))
                  }
                  leftSection={
                    <IconCopy style={{ width: rem(14), height: rem(14) }} />
                  }
                >
                  {t('LightPage.actions.copy-tags')}
                </Menu.Item>
                <Menu.Item
                  onClick={() =>
                    navigator.clipboard.writeText(JSON.stringify(json, null, 2))
                  }
                  leftSection={
                    <IconCopy style={{ width: rem(14), height: rem(14) }} />
                  }
                >
                  {t('LightPage.actions.copy-json')}
                </Menu.Item>
                {customOptions}
              </Menu.Dropdown>
            </Menu>
          )}
        </Group>
      </Card.Section>
      {children}
    </Card>
  );
};

export const InnerLightPage: React.FC<{
  id: string;
  country: string;
  countryFromUrl: string;
}> = ({ id, country, countryFromUrl }) => {
  const urlSafeId = id.replaceAll(' ', '');

  const navigate = useNavigate();
  const { dataByCountry, loadCountry } = useContext(DataContext);

  const [showDiff, setShowDiff] = useLocalStorage({
    key: 'lol.showDiff',
    defaultValue: false,
  });

  const countryName = getCountryName(country);
  const light = dataByCountry?.[country]?.[id];

  useEffect(() => loadCountry(country), [country, loadCountry]);
  useEffect(() => {
    document.title = `${id} – ${APP_NAME}`;
    return () => {
      document.title = APP_NAME;
    };
  }, [id]);

  useEffect(() => {
    if (countryFromUrl !== country) {
      navigate(`/${country}/${urlSafeId}`, { replace: true });
    }
  }, [countryFromUrl, country, urlSafeId, navigate]);

  const reëncodedLight = useMemo(() => light && reëncodeLight(light), [light]);

  if (!light) return <Loader />;

  const viewLink = (
    <Anchor key={0} href={createOsmLink(light.osm?.id || '')} target="_blank">
      {t('LightPage.view-on-osm')}
    </Anchor>
  );

  const status = {
    existsAndPerfect: (
      <Alert
        variant="light"
        color="green"
        title={t('LightPage.status.existsAndPerfect.title')}
        icon={<IconCheck />}
      >
        {t('LightPage.status.existsAndPerfect.desc', { viewLink })}
      </Alert>
    ),
    existsButNeedsUpdate: (
      <Alert
        variant="light"
        color="yellow"
        title={t('LightPage.status.existsButNeedsUpdate.title')}
        icon={<IconAlertTriangle />}
        styles={{ body: { width: '100%' } }}
      >
        {t('LightPage.status.existsButNeedsUpdate.desc', {
          viewLink,
          diffLink: (
            <Anchor
              key={1}
              component="button"
              onClick={() => setShowDiff((c) => !c)}
            >
              {showDiff
                ? t('LightPage.diff-link.hide')
                : t('LightPage.diff-link.show')}
            </Anchor>
          ),
        })}
        {showDiff && (
          <>
            <br />
            <TagDiff light={light} />
          </>
        )}
      </Alert>
    ),
    missing: (
      <Alert
        variant="light"
        color="red"
        title={t('LightPage.status.no.title')}
        icon={<IconAlertTriangle />}
      >
        {t('LightPage.status.no.desc', {
          tag: <Code key={0}>seamark:light:reference</Code>,
        })}
      </Alert>
    ),
    unexpected: null, // can never happen
  }[light.osm?.verdict || 'missing'];

  return (
    <div>
      <Breadcrumbs style={{ alignContent: 'center' }}>
        <Anchor component={Link} to="/">
          {t('Breadcrumbs.home')}
        </Anchor>
        <Anchor component={Link} to={`/${country}`}>
          {countryName || t('noname.country')}
        </Anchor>
        <Anchor component={Link} to={`/${country}/${urlSafeId}`}>
          {id}
        </Anchor>
      </Breadcrumbs>
      <Title order={3}>
        {light.tags['seamark:name'] || <em>{t('noname.light')}</em>}
      </Title>

      {status}

      <JsonCard
        title={t('LightPage.parsed-data')}
        json={light.tags}
        customOptions={
          reëncodedLight ? (
            <Menu.Item
              component="a"
              href={`https://kyle.kiwi/light-characteristics#${encodeURIComponent(
                reëncodedLight,
              )}`}
              target="_blank"
              leftSection={
                <IconExternalLink style={{ width: rem(14), height: rem(14) }} />
              }
            >
              {t('LightPage.actions.edit-character')}
            </Menu.Item>
          ) : null
        }
      >
        <Table>
          <Table.Tbody>
            {Object.entries(light.tags)
              .sort(([a], [b]) => b.localeCompare(a))
              .map(([key, value]) => (
                <Table.Tr key={key}>
                  <Table.Th>
                    <Anchor
                      href={`https://osm.wiki/Key:${key}`}
                      target="_blank"
                    >
                      {renderKey(key)}
                    </Anchor>
                  </Table.Th>
                  <Table.Td>
                    {/* hidden equals sign to save time when you copy-paste a row */}
                    <div style={{ width: 1, overflow: 'hidden' }}>=</div>
                  </Table.Td>
                  <Table.Td>{renderValue(key, value)}</Table.Td>
                </Table.Tr>
              ))}
          </Table.Tbody>
        </Table>
      </JsonCard>

      <JsonCard title={t('LightPage.original-data')} json={light.orig}>
        <Table style={{ tableLayout: 'fixed' }}>
          <Table.Tbody>
            <Table.Tr>
              <Table.Th style={{ width: 110 }}>
                {t('LightPage.orig.name')}
              </Table.Th>
              <Table.Td>
                <Code block>{light.orig.name}</Code>
              </Table.Td>
            </Table.Tr>
            <Table.Tr>
              <Table.Th>{t('LightPage.orig.characteristics')}</Table.Th>
              <Table.Td>
                {highlightErrors(light.orig.characteristic, light)}
              </Table.Td>
            </Table.Tr>
            <Table.Tr>
              <Table.Th>{t('LightPage.orig.structure')}</Table.Th>
              <Table.Td>
                {highlightErrors(light.orig.structure, light)}
              </Table.Td>
            </Table.Tr>
            <Table.Tr>
              <Table.Th>{t('LightPage.orig.remarks')}</Table.Th>
              <Table.Td>{highlightErrors(light.orig.remarks, light)}</Table.Td>
            </Table.Tr>
            <Table.Tr>
              <Table.Th>{t('LightPage.orig.range')}</Table.Th>
              <Table.Td>
                {light.orig.range && <Code block>{light.orig.range}</Code>}
              </Table.Td>
            </Table.Tr>
            <Table.Tr>
              <Table.Th>{t('LightPage.orig.height')}</Table.Th>
              <Table.Td>
                {light.orig.heightFeetMeters && (
                  <Code block>{light.orig.heightFeetMeters}</Code>
                )}
              </Table.Td>
            </Table.Tr>
          </Table.Tbody>
        </Table>
      </JsonCard>

      {light.warnings && (
        <JsonCard title={t('LightPage.warnings')}>
          <Table style={{ tableLayout: 'fixed' }}>
            <Table.Tbody>
              {light.warnings.map((warning) => (
                <Table.Tr key={warning.type + warning.value}>
                  <Table.Th style={{ width: 150 }}>
                    <Code>{warning.type}</Code>
                  </Table.Th>
                  <Table.Td>
                    <Code block>{warning.value}</Code>
                  </Table.Td>
                </Table.Tr>
              ))}
            </Table.Tbody>
          </Table>
        </JsonCard>
      )}
    </div>
  );
};

export const LightPage: React.FC = () => {
  const { country: countryFromUrl, ref } = useParams() as {
    ref: string;
    country: string;
  };

  const { idLookup } = useContext(DataContext);

  if (!idLookup) return <Loader />;

  if (!idLookup[ref]) {
    return (
      <Alert
        icon={<IconAlertHexagon size={16} />}
        title={t('CountryPage.not-found.title')}
        color="red"
      >
        {t('CountryPage.not-found.desc', {
          ref: <Code key={0}>{ref}</Code>,
        })}
      </Alert>
    );
  }

  const [fullId, expectedCountry] = idLookup[ref];

  return (
    <InnerLightPage
      id={fullId}
      country={expectedCountry}
      countryFromUrl={countryFromUrl}
    />
  );
};
