// @vitest-environment jsdom
import { describe, it, expect, beforeEach } from "vitest";
import { render, screen, fireEvent, cleanup } from "@testing-library/react";
import { HashRouter } from "react-router-dom";
import App from "./App.jsx";

function renderAppWithProject() {
  const utils = render(
    <HashRouter>
      <App />
    </HashRouter>
  );
  fireEvent.click(screen.getByText("สร้างโครงการ"));
  return utils;
}

beforeEach(() => {
  cleanup();
  window.localStorage.clear();
  window.location.hash = "";
});

describe("costs page (Phase 4)", () => {
  it("adds a CAPEX row inline and shows the gross total", () => {
    renderAppWithProject();
    fireEvent.click(screen.getByText("ต้นทุน"));
    expect(
      screen.getByText("ยังไม่มีรายการ CAPEX — เพิ่มรายการแรก หรืออัปโหลดจากไฟล์")
    ).toBeTruthy();

    // add a row in the CAPEX panel and fill qty/price
    fireEvent.click(screen.getAllByText("+ เพิ่มรายการ")[0]);
    const numberCells = document.querySelectorAll("tbody input[type=number]");
    fireEvent.change(numberCells[0], { target: { value: "2" } }); // qty
    fireEvent.change(numberCells[1], { target: { value: "50000" } }); // unit price

    expect(screen.getByText("Gross CAPEX รวม")).toBeTruthy();
    expect(screen.getAllByText("100,000 ฿").length).toBeGreaterThanOrEqual(1);
  });

  it("moves a line CAPEX -> OPEX", () => {
    renderAppWithProject();
    fireEvent.click(screen.getByText("ต้นทุน"));
    fireEvent.click(screen.getAllByText("+ เพิ่มรายการ")[0]);
    fireEvent.click(screen.getByText("ย้ายไป OPEX"));
    expect(
      screen.getByText("ยังไม่มีรายการ CAPEX — เพิ่มรายการแรก หรืออัปโหลดจากไฟล์")
    ).toBeTruthy();
    expect(screen.getByText("ย้ายไป CAPEX")).toBeTruthy();
  });

  it("saves a CAPEX line to the shared price list (badge count)", () => {
    renderAppWithProject();
    fireEvent.click(screen.getByText("ต้นทุน"));
    expect(screen.getByText("Price List: 0 รายการ")).toBeTruthy();
    fireEvent.click(screen.getAllByText("+ เพิ่มรายการ")[0]);
    fireEvent.click(screen.getByText("PL"));
    expect(screen.getByText("Price List: 1 รายการ")).toBeTruthy();
  });
});

describe("energy page (Phase 4)", () => {
  it("applies the MEA 2569 preset into editable fields", () => {
    renderAppWithProject();
    fireEvent.click(screen.getByText("พลังงานและค่าไฟ"));
    fireEvent.click(screen.getByText("ใช้ preset: บ้านอยู่อาศัย กฟน. 2569"));

    const exportRate = screen.getByLabelText("ราคาขายไฟส่วนเกิน");
    expect(exportRate.value).toBe("2.2");
    const term = screen.getByLabelText("ระยะเวลารับซื้อ");
    expect(term.value).toBe("10");
    const cap = screen.getByLabelText("เพดานส่งออก");
    expect(cap.value).toBe("5");
    // preset fields stay editable (Hard Rule 2)
    fireEvent.change(exportRate, { target: { value: "1.5" } });
    expect(exportRate.value).toBe("1.5");
  });

  it("switching to interval mode shows the 12-month profile table", () => {
    renderAppWithProject();
    fireEvent.click(screen.getByText("พลังงานและค่าไฟ"));
    fireEvent.click(screen.getByText("Interval profile"));
    expect(screen.getByText("โปรไฟล์ 12 เดือน")).toBeTruthy();
    // 12 rows × 2 editable cells
    const rows = document.querySelectorAll("tbody tr");
    expect(rows.length).toBe(12);
    expect(screen.getByText("ใช้ PV จากไฟล์")).toBeTruthy();
  });

  it("summary strip reflects entered assumptions", () => {
    renderAppWithProject();
    // creating a project lands on /project — fill the system size there
    fireEvent.change(screen.getByLabelText("กำลังแผงต่อแผ่น"), {
      target: { value: "500" },
    });
    fireEvent.change(screen.getByLabelText("จำนวนแผง"), { target: { value: "10" } });

    fireEvent.click(screen.getByText("พลังงานและค่าไฟ"));
    fireEvent.change(screen.getByLabelText("Specific yield"), {
      target: { value: "1400" },
    });
    // 5 kWp × 1400 = 7,000 kWh year-1 gross
    expect(screen.getByText("7,000 kWh")).toBeTruthy();
  });
});
