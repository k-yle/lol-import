//
// copy-pasted from https://github.com/k-yle/osm-simple-route-editor/blob/3882069/src/context/AuthGateway.tsx
//
import {
  type PropsWithChildren,
  createContext,
  useCallback,
  useEffect,
  useMemo,
  useState,
} from 'react';
import {
  type OsmOwnUser,
  login as apiLogin,
  logout as apiLogout,
  getUser,
  isLoggedIn,
} from 'osm-api';
import { LoadingOverlay } from '@mantine/core';
import { notifications } from '@mantine/notifications';
import { t } from '../i18n';

type IAuthContext = {
  user: OsmOwnUser | undefined;
  login(): void;
  logout(): void;
};
export const AuthContext = createContext({} as IAuthContext);
AuthContext.displayName = 'AuthContext';

export const AuthWrapper: React.FC<PropsWithChildren> = ({ children }) => {
  const [loading, setLoading] = useState(false);
  const [loggedIn, setLoggedIn] = useState(isLoggedIn());
  const [user, setUser] = useState<OsmOwnUser>();

  const login = useCallback(async () => {
    try {
      setLoading(true);
      await apiLogin({
        clientId:
          // the clientId is not confidential, it's alright to define it here
          window.location.hostname === '127.0.0.1'
            ? 'oPbyNuXQIEh8ZI3zbjVWVmVyIaNB2guU6uLP2gQ3sfs'
            : 'ktH9yyDip3l4Ms38wzRCNLQMX7ImJ4SFuoCP7HUfz1E',
        mode: 'popup',
        redirectUrl: `${window.location.origin}/land.html`,
        scopes: ['read_prefs', 'write_api'],
      });

      setLoggedIn(true);
      setLoading(false);
    } catch {
      notifications.show({
        title: t('AuthContext.error.title'),
        message: t('AuthContext.error.desc'),
        color: 'red',
      });
      setLoading(false);
    }
  }, []);

  const logout = useCallback(() => {
    apiLogout();
    setLoggedIn(false);
    setUser(undefined);
  }, []);

  useEffect(() => {
    if (loggedIn) {
      getUser('me').then(setUser).catch(logout);
    }
  }, [loggedIn, logout]);

  const context = useMemo(
    () => ({ user, login, logout }),
    [user, login, logout],
  );

  return (
    <AuthContext.Provider value={context}>
      <LoadingOverlay visible={loading} overlayProps={{ blur: 2 }} />
      {children}
    </AuthContext.Provider>
  );
};
