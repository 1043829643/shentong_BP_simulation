import { Topbar } from './components/Topbar';
import { DraftPage } from './pages/DraftPage';
import { OverviewPage } from './pages/OverviewPage';
import { SetupPage } from './pages/SetupPage';
import { useDraftStore } from './store/useDraftStore';

export function App() {
  const page = useDraftStore((state) => state.page);
  return (
    <div className="app">
      <Topbar />
      <div className="shell">
        {page === 'setup' && <SetupPage />}
        {page === 'bp' && <DraftPage />}
        {page === 'overview' && <OverviewPage />}
      </div>
    </div>
  );
}
