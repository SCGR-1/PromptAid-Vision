import { createBrowserRouter, RouterProvider } from 'react-router-dom';
import { AlertContext, type AlertContextProps, type AlertParams, LanguageContext, type LanguageContextProps } from '@ifrc-go/ui/contexts';
import { useCallback, useMemo, useState } from 'react';
import { unique } from '@togglecorp/fujs';
import RootLayout from './layouts/RootLayout';
import UploadPage from './pages/UploadPage';
import AnalyticsPage from './pages/AnalyticsPage';
import ExplorePage from './pages/ExplorePage';
import HelpPage from './pages/HelpPage';
import MapDetailPage from './pages/MapDetailPage';
import DemoPage from './pages/DemoPage';
import DevPage from './pages/DevPage';

const router = createBrowserRouter([
  {
    element: <RootLayout />,   // header sticks here
    children: [
      { path: '/',          element: <UploadPage /> },
      { path: '/upload',    element: <UploadPage /> },
      { path: '/analytics', element: <AnalyticsPage /> },
      { path: '/explore',   element: <ExplorePage /> },
      { path: '/help',      element: <HelpPage /> },
      { path: '/demo',      element: <DemoPage /> },
      { path: '/dev',       element: <DevPage /> },
      { path: '/map/:mapId', element: <MapDetailPage /> },
    ],
  },
]);

function Application() {
  // ALERTS
  const [alerts, setAlerts] = useState<AlertParams[]>([]);

  const addAlert = useCallback((alert: AlertParams) => {
    setAlerts((prevAlerts) => unique(
      [...prevAlerts, alert],
      (a) => a.name,
    ) ?? prevAlerts);
  }, [setAlerts]);

  const removeAlert = useCallback((name: AlertParams['name']) => {
    setAlerts((prevAlerts) => {
      const i = prevAlerts.findIndex((a) => a.name === name);
      if (i === -1) {
        return prevAlerts;
      }

      const newAlerts = [...prevAlerts];
      newAlerts.splice(i, 1);

      return newAlerts;
    });
  }, [setAlerts]);

  const updateAlert = useCallback((name: AlertParams['name'], paramsWithoutName: Omit<AlertParams, 'name'>) => {
    setAlerts((prevAlerts) => {
      const i = prevAlerts.findIndex((a) => a.name === name);
      if (i === -1) {
        return prevAlerts;
      }

      const newAlerts = [...prevAlerts];
      newAlerts[i] = {
        ...newAlerts[i],
        ...paramsWithoutName,
      };

      return newAlerts;
    });
  }, [setAlerts]);

  const alertContextValue = useMemo<AlertContextProps>(
    () => ({
      alerts,
      addAlert,
      removeAlert,
      updateAlert,
    }),
    [alerts, addAlert, removeAlert, updateAlert],
  );

  // LANGUAGE
  const languageContextValue = useMemo<LanguageContextProps>(
    () => ({
      languageNamespaceStatus: {},
      setLanguageNamespaceStatus: () => {},
      currentLanguage: 'en',
      setCurrentLanguage: () => {},
      strings: {},
      setStrings: () => {},
      registerNamespace: () => {},
    }),
    [],
  );

  return (
    <AlertContext.Provider value={alertContextValue}>
      <LanguageContext.Provider value={languageContextValue}>
        <RouterProvider router={router} />
      </LanguageContext.Provider>
    </AlertContext.Provider>
  );
}

export default function App() {
  return <Application />;
}
