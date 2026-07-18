// ============================================================================
// App.jsx — Solar Feasibility Studio shell (SPEC-UPGRADE.md Phase 3, §5).
// Sidebar + top bar + routed pages. The legacy single-page calculator UI
// (components/…) was replaced by this shell; the legacy engine remains in
// lib/calculations.js until every page runs on the new engine.
// ============================================================================

import { useState } from "react";
import { Routes, Route } from "react-router-dom";
import { AppProvider } from "./state/AppContext.jsx";
import Sidebar from "./shell/Sidebar.jsx";
import TopBar from "./shell/TopBar.jsx";
import OverviewPage from "./pages/OverviewPage.jsx";
import ProjectSystemPage from "./pages/ProjectSystemPage.jsx";
import FinancePage from "./pages/FinancePage.jsx";
import CostsPage from "./pages/CostsPage.jsx";
import EnergyPage from "./pages/EnergyPage.jsx";
import CashflowPage from "./pages/CashflowPage.jsx";
import SensitivityPage from "./pages/SensitivityPage.jsx";
import ComparisonPage from "./pages/ComparisonPage.jsx";
import PortfolioPage from "./pages/PortfolioPage.jsx";
import MethodologyPage from "./pages/MethodologyPage.jsx";

export default function App() {
  const [menuOpen, setMenuOpen] = useState(false);
  const closeMenu = () => setMenuOpen(false);

  return (
    <AppProvider>
      <div className="min-h-screen bg-surface text-ink flex">
        {/* desktop sidebar */}
        <div className="hidden lg:block">
          <Sidebar />
        </div>

        {/* mobile drawer */}
        {menuOpen && (
          <div className="fixed inset-0 z-40 lg:hidden">
            <div
              className="absolute inset-0 bg-ink/40"
              onClick={closeMenu}
              aria-hidden="true"
            />
            <div className="absolute inset-y-0 left-0 shadow-xl">
              <Sidebar onNavigate={closeMenu} />
            </div>
          </div>
        )}

        <div className="flex-1 min-w-0 flex flex-col">
          <TopBar onOpenMenu={() => setMenuOpen(true)} />
          <main className="flex-1 p-6">
            <Routes>
              <Route path="/" element={<OverviewPage />} />
              <Route path="/project" element={<ProjectSystemPage />} />
              <Route path="/finance" element={<FinancePage />} />
              <Route path="/costs" element={<CostsPage />} />
              <Route path="/energy" element={<EnergyPage />} />
              <Route path="/cashflow" element={<CashflowPage />} />
              <Route path="/sensitivity" element={<SensitivityPage />} />
              <Route path="/comparison" element={<ComparisonPage />} />
              <Route path="/portfolio" element={<PortfolioPage />} />
              <Route path="/methodology" element={<MethodologyPage />} />
              <Route path="*" element={<OverviewPage />} />
            </Routes>
          </main>
        </div>
      </div>
    </AppProvider>
  );
}
