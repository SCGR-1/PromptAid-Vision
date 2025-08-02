import { createBrowserRouter, RouterProvider } from 'react-router-dom';
import RootLayout from './layouts/RootLayout';
import UploadPage from './pages/UploadPage';
import AnalyticsPage from './pages/AnalyticsPage';
import ExplorePage from './pages/ExplorePage';
import HelpPage from './pages/HelpPage';
import MapDetailPage from './pages/MapDetailPage';

const router = createBrowserRouter([
  {
    element: <RootLayout />,   // header sticks here
    children: [
      { path: '/',          element: <UploadPage /> },
      { path: '/upload',    element: <UploadPage /> },
      { path: '/analytics', element: <AnalyticsPage /> },
      { path: '/explore',   element: <ExplorePage /> },
      { path: '/help',      element: <HelpPage /> },
      { path: '/map/:mapId', element: <MapDetailPage /> },
    ],
  },
]);

export default function App() {
  return <RouterProvider router={router} />;
}
