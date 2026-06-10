import '@/lib/sentry';
import { lazy, Suspense } from 'react';
import { HashRouter, Routes, Route } from 'react-router-dom';
import { ActionsProvider } from '@/context/ActionsContext';
import { ErrorBoundary } from '@/components/ErrorBoundary';
import { ErrorBusProvider } from '@/components/ErrorBus';
import { Layout } from '@/components/Layout';
import DashboardOverview from '@/pages/DashboardOverview';
import AdminPage from '@/pages/AdminPage';
import WartungsplanPage from '@/pages/WartungsplanPage';
import WartungsplanDetailPage from '@/pages/WartungsplanDetailPage';
import MaschinenPage from '@/pages/MaschinenPage';
import MaschinenDetailPage from '@/pages/MaschinenDetailPage';
import PublicFormWartungsplan from '@/pages/public/PublicForm_Wartungsplan';
import PublicFormMaschinen from '@/pages/public/PublicForm_Maschinen';
// <public:imports>
// </public:imports>
// <custom:imports>
// </custom:imports>

export default function App() {
  return (
    <ErrorBoundary>
      <ErrorBusProvider>
        <HashRouter>
          <ActionsProvider>
            <Routes>
              <Route path="public/6a293dfb99d8252c0ae62355" element={<PublicFormWartungsplan />} />
              <Route path="public/6a293df9754668c0c39068b0" element={<PublicFormMaschinen />} />
              {/* <public:routes> */}
              {/* </public:routes> */}
              <Route element={<Layout />}>
                <Route index element={<DashboardOverview />} />
                <Route path="wartungsplan" element={<WartungsplanPage />} />
                <Route path="wartungsplan/:id" element={<WartungsplanDetailPage />} />
                <Route path="maschinen" element={<MaschinenPage />} />
                <Route path="maschinen/:id" element={<MaschinenDetailPage />} />
                <Route path="admin" element={<AdminPage />} />
                {/* <custom:routes> */}
                {/* </custom:routes> */}
              </Route>
            </Routes>
          </ActionsProvider>
        </HashRouter>
      </ErrorBusProvider>
    </ErrorBoundary>
  );
}
