import { useEffect } from 'react';
import { createHashRouter, RouterProvider } from 'react-router';
import { Layout } from './components/Layout';
import { useMeta } from './db/hooks';
import { CatalogPage } from './pages/CatalogPage';
import { DataPage } from './pages/DataPage';
import { ExerciseProgressPage } from './pages/ExerciseProgressPage';
import { InstallPage } from './pages/InstallPage';
import { MorePage } from './pages/MorePage';
import { NutritionPage } from './pages/NutritionPage';
import { ProgressPage } from './pages/ProgressPage';
import { ProfilePage } from './pages/ProfilePage';
import { RoutinePage } from './pages/RoutinePage';
import { SessionPage } from './pages/SessionPage';
import { SwimPage } from './pages/SwimPage';
import { SummaryPage } from './pages/SummaryPage';
import { TrainPage } from './pages/TrainPage';
import { FoodPage } from './pages/FoodPage';
import { ReviewPage } from './pages/ReviewPage';
import { TodayPage } from './pages/TodayPage';
import { WeekPlanPage } from './pages/WeekPlanPage';
import { ImportPage } from './pages/ImportPage';
import { MonthlyPage } from './pages/MonthlyPage';
import { ShortcutsPage } from './pages/ShortcutsPage';
import { WeightPage } from './pages/WeightPage';

const router = createHashRouter([
  {
    element: <Layout />,
    children: [
      { path: '/', element: <TodayPage /> },
      { path: '/pes', element: <WeightPage /> },
      { path: '/entrenar', element: <TrainPage /> },
      { path: '/entrenar/sessio', element: <SessionPage /> },
      { path: '/entrenar/resum/:id', element: <SummaryPage /> },
      { path: '/natacio', element: <SwimPage /> },
      { path: '/progres', element: <ProgressPage /> },
      { path: '/progres/sessio/:id', element: <SummaryPage fromHistory /> },
      { path: '/progres/exercici/:id', element: <ExerciseProgressPage /> },
      { path: '/revisio', element: <ReviewPage /> },
      { path: '/resum', element: <MonthlyPage /> },
      { path: '/importar', element: <ImportPage /> },
      { path: '/mes/dreceres', element: <ShortcutsPage /> },
      { path: '/mes', element: <MorePage /> },
      { path: '/mes/setmana', element: <WeekPlanPage /> },
      { path: '/mes/alimentacio', element: <FoodPage /> },
      { path: '/mes/perfil', element: <ProfilePage /> },
      { path: '/mes/calories', element: <NutritionPage /> },
      { path: '/mes/maquines', element: <CatalogPage /> },
      { path: '/mes/rutina', element: <RoutinePage /> },
      { path: '/mes/dades', element: <DataPage /> },
      { path: '/mes/installar', element: <InstallPage /> },
      { path: '*', element: <TodayPage /> },
    ],
  },
]);

export function App() {
  const theme = useMeta<'dark' | 'light'>('theme');
  useEffect(() => {
    const light = theme === 'light';
    document.documentElement.classList.toggle('light', light);
    document.querySelector('meta[name="theme-color"]')?.setAttribute('content', light ? '#eef0f7' : '#090b13');
  }, [theme]);
  return <RouterProvider router={router} />;
}
