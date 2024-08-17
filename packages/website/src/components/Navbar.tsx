import { memo, useContext, useState } from 'react';
import {
  Autocomplete,
  Button,
  Flex,
  Modal,
  Title,
  rem,
  useMantineTheme,
} from '@mantine/core';
import '@mantine/core/styles.css';
import { Link, useNavigate } from 'react-router-dom';
import { useDisclosure } from '@mantine/hooks';
import { DataContext } from '../context/DataContext';
import { APP_NAME } from '../helpers/constants';
import { t } from '../i18n';
import { LoginStatus } from './LoginStatus';

const b = (str: string) => <b key={0}>{str}</b>;

export const Navbar = memo(() => {
  const theme = useMantineTheme();
  const navigate = useNavigate();
  const { idLookup } = useContext(DataContext);
  const [search, setSearch] = useState('');
  const [opened, { open, close }] = useDisclosure(false);

  return (
    <Flex
      justify="space-between"
      align="center"
      px={16}
      h={50}
      bg={theme.colors.gray[0]}
      style={{
        borderBottom: `${rem(1)} solid ${theme.colors.gray[2]}`,
      }}
    >
      <Modal
        opened={opened}
        onClose={close}
        title={<strong>{t('disclaimer.title')}</strong>}
      >
        {t('disclaimer.long', { b })}
      </Modal>

      <Flex direction="column" align="flex-start">
        <Title order={5} fw={500} size="1.25rem">
          <Link
            to="/"
            style={{
              textDecoration: 'none',
              color: 'inherit',
              cursor: 'inherit',
            }}
          >
            {APP_NAME}
          </Link>
        </Title>
        <Button variant="transparent" onClick={open} size="0.5rem" pl={0}>
          {t('disclaimer.short')}
        </Button>
      </Flex>
      <Autocomplete
        placeholder={t('Navbar.search-placeholder')}
        limit={5}
        data={Object.keys(idLookup || {})}
        disabled={!idLookup}
        value={search}
        onChange={(newValue) => setSearch(newValue.replaceAll(' ', ''))}
        onOptionSubmit={(finalValue) => {
          navigate(`/${idLookup![finalValue][1]}/${finalValue}`);
          setTimeout(() => setSearch(''), 0);
        }}
      />
      <Flex align="center">
        <LoginStatus />
      </Flex>
    </Flex>
  );
});
Navbar.displayName = 'Navbar';
