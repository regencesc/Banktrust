// @vitest-environment jsdom
import { describe, it, expect, beforeEach } from "vitest";
import { render, screen, fireEvent, cleanup } from "@testing-library/react";
import { HashRouter } from "react-router-dom";
import App from "./App.jsx";
import { createAppState, addProject, updateProject } from "./lib/state.js";
import { saveState } from "./lib/persistence.js";

// Seed localStorage with the legacy reference project (NPV≈166,601,
// payback ≈ 4.58y) so the dashboard and cashflow render real numbers.
function seedReferenceProject() {
  let { state, project } = addProject(createAppState(), "โครงการอ้างอิง");
  state = updateProject(state, project.id, (p) => ({
    ...p,
    projectLife: 25,
    system: { ...p.system, panelWp: 500, panelCount: 10 },
    energy: {
      ...p.energy,
      mode: "annual",
      specificYield: 1489.2,
      availability: 1,
      systemLosses: 0,
      yieldIncludesLosses: true,
      degradation: 0.005,
      selfConsumptionPct: 0.9,
      loadYear1Kwh: 12000,
      importRate: 4.4,
      exportRate: 2.2,
      tariffEscalation: 0,
      exportTermYears: 10,
      exportCapKw: 5,
    },
    costs: {
      ...p.costs,
      capexItems: [
        {
          id: "c1",
          kind: "capex",
          name: "ระบบครบชุด",
          qty: 1,
          unitPrice: 150000,
          vatPct: 0,
          replacementYear: 12,
          replacementCycles: 1,
          replacementPct: 0.15,
        },
      ],
      opexItems: [
        { id: "o1", name: "O&M", costPerOccurrence: 3000, startYear: 1, endYear: 25 },
      ],
    },
    finance: {
      ...p.finance,
      discountRate: 0.07,
      taxMode: "personal",
      personalTaxBracket: 0.15,
      personalDeductionCap: 200000,
      loanEnabled: false,
    },
  }));
  saveState(state, window.localStorage);
}

function renderApp() {
  return render(
    <HashRouter>
      <App />
    </HashRouter>
  );
}

beforeEach(() => {
  cleanup();
  window.localStorage.clear();
  window.location.hash = "";
});

describe("dashboard (Phase 5)", () => {
  it("shows the six KPI cards with engine numbers", () => {
    seedReferenceProject();
    renderApp();
    // Equity NPV ≈ 166,601 (cash-only -> equity = project)
    expect(screen.getAllByText("166,601 ฿").length).toBeGreaterThanOrEqual(1);
    expect(screen.getByText("Equity IRR")).toBeTruthy();
    expect(screen.getByText("20.1%")).toBeTruthy();
    expect(screen.getByText("Simple Payback")).toBeTruthy();
    expect(screen.getByText("4.6 ปี")).toBeTruthy();
    expect(screen.getByText("LCOE")).toBeTruthy();
    expect(screen.getByText("2.34 ฿/kWh")).toBeTruthy();
    expect(screen.getByText("7,446 kWh")).toBeTruthy(); // year-1 generation
    expect(screen.getByText("Min DSCR")).toBeTruthy();
    expect(screen.getByText("ไม่มีเงินกู้")).toBeTruthy();
  });

  it("shows the investment summary with the equity split", () => {
    seedReferenceProject();
    renderApp();
    expect(screen.getByText("สรุปเงินลงทุน")).toBeTruthy();
    expect(screen.getAllByText("150,000 ฿").length).toBeGreaterThanOrEqual(1);
    // personal-mode year-1 benefit surfaces as the incentive line
    expect(screen.getByText("สิทธิประโยชน์ภาษีปี 1")).toBeTruthy();
    expect(screen.getByText("22,500 ฿")).toBeTruthy();
  });

  it("lists risk checks (screening-mode note for annual mode)", () => {
    seedReferenceProject();
    renderApp();
    expect(screen.getByText("Data & Risk Checks")).toBeTruthy();
    expect(
      screen.getByText(/annual screening/)
    ).toBeTruthy();
  });

  it("empty project shows chart placeholders, not blank charts", () => {
    renderApp();
    fireEvent.click(screen.getByText("สร้างโครงการ"));
    fireEvent.click(screen.getAllByText("ภาพรวม")[0]); // nav link back to overview
    // back on overview with an empty project: placeholder text on both charts
    expect(
      screen.getAllByText("กรอกข้อมูลระบบ ต้นทุน และค่าไฟก่อน กราฟจะแสดงที่นี่").length
    ).toBeGreaterThanOrEqual(1);
  });
});

describe("cashflow page (Phase 5)", () => {
  it("renders the full year-by-year table with payback highlighting", () => {
    seedReferenceProject();
    renderApp();
    fireEvent.click(screen.getByText("Cash Flow"));

    expect(screen.getByText("คืนทุนในปีที่ 5")).toBeTruthy();
    const bodyRows = document.querySelectorAll("tbody tr");
    expect(bodyRows.length).toBe(26); // year 0..25

    // cumulative colors: year 0 negative red, final year positive green
    const firstCumulative = bodyRows[0].querySelectorAll("td")[12];
    expect(firstCumulative.textContent).toBe("-150,000");
    expect(firstCumulative.className).toContain("text-danger");
    const lastCumulative = bodyRows[25].querySelectorAll("td")[12];
    expect(lastCumulative.className).toContain("text-ok");

    // payback year row (year 5) is highlighted
    expect(bodyRows[5].className).toContain("bg-brand-50");

    expect(screen.getByText("Export CSV")).toBeTruthy();
  });

  it("shows an empty prompt when the project has no data", () => {
    renderApp();
    fireEvent.click(screen.getByText("สร้างโครงการ"));
    fireEvent.click(screen.getByText("Cash Flow"));
    expect(
      screen.getByText("ยังไม่มีข้อมูลเพียงพอ — กรอกขนาดระบบ ต้นทุน และค่าไฟก่อน")
    ).toBeTruthy();
  });
});
