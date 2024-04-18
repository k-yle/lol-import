import { StrictMode } from 'react';
import { AppShell, MantineProvider, createTheme } from '@mantine/core';
import { BrowserRouter, Route, Routes } from 'react-router-dom';
import { TimeAgoProvider } from 'react-timeago-i18n';
import { DataWrapper } from './context/DataContext';
import { Navbar } from './components/Navbar';
import { HomePage } from './pages/HomePage';
import { LightPage } from './pages/LightPage';
import { CountryPage } from './pages/CountryPage/CountryPage';
import { locale } from './i18n';
import '@mantine/core/styles.css';
import './main.css';
import { AuthWrapper } from './context/AuthContext';

const theme = createTheme({});

export const App = () => (
  <StrictMode>
    <MantineProvider theme={theme}>
      <BrowserRouter>
        <TimeAgoProvider locale={locale}>
          <AuthWrapper>
            <DataWrapper>
              <AppShell header={{ height: 50 }} padding="md">
                <AppShell.Header>
                  <Navbar />
                </AppShell.Header>
                <AppShell.Main>
                  <Routes>
                    <Route path="/" element={<HomePage />} />
                    <Route path="/:country" element={<CountryPage />} />
                    <Route path="/:country/:ref" element={<LightPage />} />
                  </Routes>
                </AppShell.Main>
              </AppShell>
            </DataWrapper>
          </AuthWrapper>
        </TimeAgoProvider>
      </BrowserRouter>
    </MantineProvider>
  </StrictMode>
);
