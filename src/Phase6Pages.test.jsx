// @vitest-environment jsdom
import { describe, it, expect, beforeEach } from "vitest";
import { render, screen, fireEvent, cleanup, within } from "@testing-library/react";
import { HashRouter } from "react-router-dom";
import App from "./App.jsx";
import { createAppState, addProject, updateProject } from "./lib/state.js";
import { saveState } from "./lib/persistence.js";

// Reference project (NPV≈166,601, payback ≈4.58y) seeded into localStorage.
function seedReferenceProject({ withSecondProject = false } = {}) {
  let { state, project } = addProject(createAppState(), "โครงการอ้างอิง");
  const fill = (p) => ({
    ...p,
    projectLife: 25,
    location: "กรุงเทพฯ",
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
  });
  state = updateProject(state, project.id, fill);
  if (withSecondProject) {
    const added = addProject(state, "โครงการสอง");
    state = updateProject(added.state, added.project.id, fill);
    state = { ...state, activeProjectId: project.id };
  }
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

describe("sensitivity page (Phase 6)", () => {
  it("renders the 5x5 heatmap, break-even cards and scenarios", () => {
    seedReferenceProject();
    renderApp();
    fireEvent.click(screen.getByText("Sensitivity"));

    // heatmap: 5 rows × (1 label + 5 cells)
    const heatCells = document.querySelectorAll("tbody td[style]");
    expect(heatCells.length).toBe(25);

    expect(screen.getByText("จุดคุ้มทุน (Break-even)")).toBeTruthy();
    // profitable project -> tariff multiplier < 1, capex multiplier > 1
    expect(screen.getByText("Tariff multiplier ที่ NPV = 0")).toBeTruthy();
    expect(screen.getByText("CAPEX แพงสุดที่ยังคุ้ม")).toBeTruthy();

    expect(screen.getByText("Downside")).toBeTruthy();
    expect(screen.getByText("Base")).toBeTruthy();
    expect(screen.getByText("Upside")).toBeTruthy();
  });

  it("shows an empty prompt without cost/energy data", () => {
    renderApp();
    fireEvent.click(screen.getByText("สร้างโครงการ"));
    fireEvent.click(screen.getByText("Sensitivity"));
    expect(
      screen.getByText(
        "ต้องมีรายการต้นทุนและข้อมูลพลังงานก่อน จึงจะวิเคราะห์ sensitivity ได้"
      )
    ).toBeTruthy();
  });
});

describe("comparison page (Phase 6)", () => {
  it("adds packages, computes via the engine, and crowns the best NPV", () => {
    seedReferenceProject();
    renderApp();
    fireEvent.click(screen.getByText("Comparison ราคาเสนอ"));
    expect(
      screen.getByText("ยังไม่มีแพ็กเกจ — เพิ่มแพ็กเกจแรกจากใบเสนอราคาที่ได้รับ")
    ).toBeTruthy();

    // package A: same as the reference case (5kW / 150k)
    fireEvent.click(screen.getByText("+ เพิ่มแพ็กเกจ"));
    fireEvent.change(screen.getByLabelText("ชื่อแพ็กเกจ / ผู้เสนอ"), {
      target: { value: "A" },
    });
    fireEvent.change(screen.getByLabelText("ขนาด PV A"), { target: { value: "5" } });
    expect(screen.getByText(/กรอกขนาด \(kW\) และราคาเสนอ/)).toBeTruthy();
    fireEvent.change(screen.getByLabelText("ราคาเสนอรวม A"), {
      target: { value: "150000" },
    });

    // results appear once ready
    expect(screen.getByText("ผลการเปรียบเทียบ")).toBeTruthy();
    expect(screen.getByText("★ คุ้มที่สุด (NPV)")).toBeTruthy();
    expect(screen.getByText("⚡ เร็วสุด")).toBeTruthy();
    // a concrete payback number renders (no O&M entered -> faster than base)
    expect(
      screen.getByText((text) => /^\d+\.\d ปี$/.test(text.trim()))
    ).toBeTruthy();
    expect(screen.getByText("30,000 ฿/kW")).toBeTruthy();
  });
});

describe("portfolio page (Phase 6)", () => {
  it("lists every project with metrics, score and a totals row", () => {
    seedReferenceProject({ withSecondProject: true });
    renderApp();
    fireEvent.click(screen.getByText("เปรียบเทียบโปรเจกต์"));

    // project names also live in the sidebar — scope queries to the table
    const tbody = document.querySelector("tbody");
    expect(within(tbody).getByText("โครงการอ้างอิง")).toBeTruthy();
    expect(within(tbody).getByText("โครงการสอง")).toBeTruthy();
    expect(within(tbody).getByText("รวมทั้งพอร์ต")).toBeTruthy();

    const bodyRows = document.querySelectorAll("tbody tr");
    expect(bodyRows.length).toBe(3); // 2 projects + totals

    // totals: 2 × 5 kWp = 10, 2 × 150,000 = 300,000
    const totalCells = bodyRows[2].querySelectorAll("td");
    expect(totalCells[2].textContent).toBe("10.00");
    expect(totalCells[3].textContent).toBe("300,000");
  });

  it("clicking a project name activates it", () => {
    seedReferenceProject({ withSecondProject: true });
    renderApp();
    fireEvent.click(screen.getByText("เปรียบเทียบโปรเจกต์"));
    const tbody = document.querySelector("tbody");
    fireEvent.click(within(tbody).getByText("โครงการสอง"));
    // lands on the dashboard with the switched project in the top bar
    const header = document.querySelector("header h1");
    expect(header.textContent).toBe("โครงการสอง");
  });
});

describe("methodology page (Phase 6)", () => {
  it("renders every formula section and the disclaimer", () => {
    seedReferenceProject();
    renderApp();
    fireEvent.click(screen.getByText("วิธีคำนวณ"));

    expect(screen.getByText(/1\. พลังงาน/)).toBeTruthy();
    expect(screen.getByText(/2\. ต้นทุน/)).toBeTruthy();
    expect(screen.getByText(/3\. การเงินและภาษี/)).toBeTruthy();
    expect(screen.getByText(/4\. ตัวชี้วัด/)).toBeTruthy();
    expect(screen.getByText(/5\. Sensitivity/)).toBeTruthy();
    expect(screen.getByText(/6\. Screening Score/)).toBeTruthy();
    expect(screen.getByText("ข้อจำกัดความรับผิดชอบ")).toBeTruthy();
    // a couple of concrete formulas
    expect(screen.getByText(/grossYield_t = dcKwp × specificYield/)).toBeTruthy();
    expect(screen.getByText(/LCOE = \(CAPEX \+ PV\(OPEX\+Replacement\)\)/)).toBeTruthy();
  });
});
