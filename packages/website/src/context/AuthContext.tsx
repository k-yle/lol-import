import { createContext } from 'react';
import type { OsmOwnUser } from 'osm-api';

type IAuthContext = {
  user: OsmOwnUser | undefined;
  login(): void;
  logout(): void;
};
export const AuthContext = createContext({} as IAuthContext);
AuthContext.displayName = 'AuthContext';
