import { createBrowserRouter, RouterProvider } from 'react-router-dom';
import { AlertContext, type AlertContextProps, type AlertParams, LanguageContext, type LanguageContextProps } from '@ifrc-go/ui/contexts';
import { useCallback, useMemo, useState, lazy, Suspense, useEffect } from 'react';
import { unique } from '@togglecorp/fujs';
import RootLayout from './layouts/RootLayout';
import UploadPage from './pages/UploadPage';
import HelpPage from './pages/HelpPage';

// Lazy load heavy pages with prefetching
const AnalyticsPage = lazy(() => import('./pages/AnalyticsPage'));
const ExplorePage = lazy(() => import('./pages/ExplorePage'));
const AdminPage = lazy(() => import('./pages/AdminPage/AdminPage'));
const MapDetailPage = lazy(() => import('./pages/MapDetailsPage'));

import { FilterProvider } from './contexts/FilterContext';
import { AdminProvider } from './contexts/AdminContext';

// Prefetch function for better performance
const prefetchPage = (importFn: () => Promise<any>) => {
  // Start prefetching immediately
  const prefetchPromise = importFn();
  
  // Store the promise so we can reuse it
  prefetchPromise.catch(() => {
    // Silently handle prefetch errors
  });
  
  return prefetchPromise;
};

// Prefetch all pages on idle
const prefetchAllPages = () => {
  if ('requestIdleCallback' in window) {
    requestIdleCallback(() => {
      prefetchPage(() => import('./pages/AnalyticsPage'));
      prefetchPage(() => import('./pages/ExplorePage'));
      prefetchPage(() => import('./pages/AdminPage/AdminPage'));
      prefetchPage(() => import('./pages/MapDetailsPage'));
    });
  } else {
    // Fallback for browsers without requestIdleCallback
    setTimeout(() => {
      prefetchPage(() => import('./pages/AnalyticsPage'));
      prefetchPage(() => import('./pages/ExplorePage'));
      prefetchPage(() => import('./pages/AdminPage/AdminPage'));
      prefetchPage(() => import('./pages/MapDetailsPage'));
    }, 1000);
  }
};

const router = createBrowserRouter([
  {
    element: <RootLayout />,
    children: [
      { path: '/',          element: <UploadPage /> },
      { path: '/upload',    element: <UploadPage /> },
      { 
        path: '/analytics', 
        element: (
          <Suspense fallback={<div>Loading Analytics...</div>}>
            <AnalyticsPage />
          </Suspense>
        ) 
      },
      { 
        path: '/explore', 
        element: (
          <Suspense fallback={<div>Loading Explore...</div>}>
            <ExplorePage />
          </Suspense>
        ) 
      },
      { path: '/help',      element: <HelpPage /> },
      
      { 
        path: '/admin', 
        element: (
          <Suspense fallback={<div>Loading Admin...</div>}>
            <AdminPage />
          </Suspense>
        ) 
      },
      { 
        path: '/map/:mapId', 
        element: (
          <Suspense fallback={<div>Loading Map Details...</div>}>
            <MapDetailPage />
          </Suspense>
        ) 
      },
    ],
  },
], {
  basename: import.meta.env.BASE_URL, // This will be '/app/' from Vite
});

function Application() {
  const [alerts, setAlerts] = useState<AlertParams[]>([]);

  // Prefetch pages on mount
  useEffect(() => {
    prefetchAllPages();
  }, []);

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
        <AdminProvider>
          <FilterProvider>
            <RouterProvider router={router} />
          </FilterProvider>
        </AdminProvider>
      </LanguageContext.Provider>
    </AlertContext.Provider>
  );
}

export default function App() {
  return <Application />;
}
