// ============================================================================
// App.jsx — Solar Feasibility Studio shell (SPEC-UPGRADE.md Phase 3, §5).
// Sidebar + top bar + routed pages. The legacy single-page calculator UI
// (components/…) was replaced by this shell; the legacy engine remains in
// lib/calculations.js until every page runs on the new engine.
// ============================================================================

import { Routes, Route } from "react-router-dom";
import { AppProvider } from "./state/AppContext.jsx";
import Sidebar from "./shell/Sidebar.jsx";
import TopBar from "./shell/TopBar.jsx";
import OverviewPage from "./pages/OverviewPage.jsx";
import ProjectSystemPage from "./pages/ProjectSystemPage.jsx";
import FinancePage from "./pages/FinancePage.jsx";
import ComingSoonPage from "./pages/ComingSoonPage.jsx";

export default function App() {
  return (
    <AppProvider>
      <div className="min-h-screen bg-surface text-ink flex">
        <Sidebar />
        <div className="flex-1 min-w-0 flex flex-col">
          <TopBar />
          <main className="flex-1 p-6">
            <Routes>
              <Route path="/" element={<OverviewPage />} />
              <Route path="/project" element={<ProjectSystemPage />} />
              <Route path="/finance" element={<FinancePage />} />
              <Route
                path="/costs"
                element={<ComingSoonPage titleKey="costs" phase={4} />}
              />
              <Route
                path="/energy"
                element={<ComingSoonPage titleKey="energy" phase={4} />}
              />
              <Route
                path="/cashflow"
                element={<ComingSoonPage titleKey="cashflow" phase={5} />}
              />
              <Route
                path="/sensitivity"
                element={<ComingSoonPage titleKey="sensitivity" phase={6} />}
              />
              <Route
                path="/comparison"
                element={<ComingSoonPage titleKey="comparison" phase={6} />}
              />
              <Route
                path="/portfolio"
                element={<ComingSoonPage titleKey="portfolio" phase={6} />}
              />
              <Route
                path="/methodology"
                element={<ComingSoonPage titleKey="methodology" phase={6} />}
              />
              <Route path="*" element={<OverviewPage />} />
            </Routes>
          </main>
        </div>
      </div>
    </AppProvider>
  );
}
