import { useContext } from 'react';
import {
  Avatar,
  Burger,
  Group,
  Menu,
  Text,
  UnstyledButton,
} from '@mantine/core';
import {
  IconBrandGithub,
  IconLanguage,
  IconLogin,
  IconLogout,
} from '@tabler/icons-react';
import { useDisclosure } from '@mantine/hooks';
import { AuthContext } from '../context/AuthContext';
import { t } from '../i18n';
import { GITHUB_URL } from '../helpers/constants';
import { ChangeLanguageInput } from './ChangeLanguageInput';

export const LoginStatus: React.FC = () => {
  const { user, login, logout } = useContext(AuthContext);
  const [isOpen, { open, close }] = useDisclosure();

  return (
    <Menu
      width={260}
      position="bottom-end"
      transitionProps={{ transition: 'pop-top-right' }}
      withinPortal
      zIndex={1001}
      onOpen={open}
      onClose={close}
    >
      <Menu.Target>
        {user ? (
          <UnstyledButton>
            <Group gap={7}>
              <Avatar
                src={user.img?.href}
                alt={user.display_name}
                radius="xl"
                size={20}
              />
              <Text fw={500} size="sm" mr={3}>
                {user.display_name}
              </Text>
            </Group>
          </UnstyledButton>
        ) : (
          <Burger opened={isOpen} size="sm" />
        )}
      </Menu.Target>
      <Menu.Dropdown>
        <Menu.Item
          leftSection={<IconLanguage size="0.9rem" stroke={1.5} />}
          closeMenuOnClick={false}
          py={0}
        >
          <ChangeLanguageInput />
        </Menu.Item>
        <Menu.Item
          leftSection={<IconBrandGithub size="0.9rem" stroke={1.5} />}
          closeMenuOnClick={false}
          component="a"
          target="_blank"
          href={GITHUB_URL}
        >
          {t('LoginStatus.github-link')}
        </Menu.Item>

        <Menu.Divider />

        {user ? (
          <Menu.Item
            color="red"
            leftSection={<IconLogout size="0.9rem" stroke={1.5} />}
            onClick={logout}
          >
            {t('LoginStatus.btn-logout')}
          </Menu.Item>
        ) : (
          <Menu.Item
            color="blue"
            leftSection={<IconLogin size="0.9rem" stroke={1.5} />}
            onClick={login}
          >
            {t('LoginStatus.btn-login')}
          </Menu.Item>
        )}
      </Menu.Dropdown>
    </Menu>
  );
};
