import { useEffect } from 'react';
import { createHashRouter, RouterProvider } from 'react-router';
import { Layout } from './components/Layout';
import { useMeta } from './db/hooks';
import { CatalogPage } from './pages/CatalogPage';
import { DataPage } from './pages/DataPage';
import { ExerciseProgressPage } from './pages/ExerciseProgressPage';
import { HomePage } from './pages/HomePage';
import { InstallPage } from './pages/InstallPage';
import { MorePage } from './pages/MorePage';
import { NutritionPage } from './pages/NutritionPage';
import { ProgressPage } from './pages/ProgressPage';
import { ProfilePage } from './pages/ProfilePage';
import { RoutinePage } from './pages/RoutinePage';
import { SessionPage } from './pages/SessionPage';
import { SummaryPage } from './pages/SummaryPage';
import { TrainPage } from './pages/TrainPage';
import { WeightPage } from './pages/WeightPage';

const router = createHashRouter([
  {
    element: <Layout />,
    children: [
      { path: '/', element: <HomePage /> },
      { path: '/pes', element: <WeightPage /> },
      { path: '/entrenar', element: <TrainPage /> },
      { path: '/entrenar/sessio', element: <SessionPage /> },
      { path: '/entrenar/resum/:id', element: <SummaryPage /> },
      { path: '/progres', element: <ProgressPage /> },
      { path: '/progres/sessio/:id', element: <SummaryPage fromHistory /> },
      { path: '/progres/exercici/:id', element: <ExerciseProgressPage /> },
      { path: '/mes', element: <MorePage /> },
      { path: '/mes/perfil', element: <ProfilePage /> },
      { path: '/mes/calories', element: <NutritionPage /> },
      { path: '/mes/maquines', element: <CatalogPage /> },
      { path: '/mes/rutina', element: <RoutinePage /> },
      { path: '/mes/dades', element: <DataPage /> },
      { path: '/mes/installar', element: <InstallPage /> },
      { path: '*', element: <HomePage /> },
    ],
  },
]);

export function App() {
  const theme = useMeta<'dark' | 'light'>('theme');
  useEffect(() => {
    const light = theme === 'light';
    document.documentElement.classList.toggle('light', light);
    document.querySelector('meta[name="theme-color"]')?.setAttribute('content', light ? '#f4f5f7' : '#0b0d10');
  }, [theme]);
  return <RouterProvider router={router} />;
}
