// @vitest-environment jsdom
import { describe, it, expect, beforeEach } from "vitest";
import { render, screen, fireEvent, cleanup } from "@testing-library/react";
import { HashRouter } from "react-router-dom";
import App from "./App.jsx";
import { STORAGE_KEY } from "./lib/persistence.js";

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

describe("app shell (Phase 3)", () => {
  it("first open is clean: empty state with a create-project CTA, no fake data", () => {
    renderApp();
    expect(screen.getByText("เริ่มต้นด้วยการสร้างโครงการแรก")).toBeTruthy();
    expect(screen.getByText("ยังไม่มีโครงการ")).toBeTruthy();
    // no project → export-this / reset disabled
    expect(screen.getByText("Export โครงการนี้").closest("button").disabled).toBe(true);
    expect(screen.getByText("รีเซ็ตโครงการ").closest("button").disabled).toBe(true);
  });

  it("creating a project from the empty state activates it", () => {
    renderApp();
    fireEvent.click(screen.getByText("สร้างโครงการ"));
    // sidebar list + topbar title both show the new project
    expect(screen.getAllByText("โครงการใหม่").length).toBeGreaterThanOrEqual(1);
    expect(screen.queryByText("ยังไม่มีโครงการ")).toBeNull();
  });

  it("renders the full menu per spec §5", () => {
    renderApp();
    for (const label of [
      "ภาพรวม",
      "Comparison ราคาเสนอ",
      "เปรียบเทียบโปรเจกต์",
      "โครงการและระบบ",
      "ต้นทุน",
      "พลังงานและค่าไฟ",
      "การเงิน",
      "Sensitivity",
      "Cash Flow",
      "วิธีคำนวณ",
    ]) {
      // some labels appear in both the nav and a page heading
      expect(screen.getAllByText(label).length).toBeGreaterThanOrEqual(1);
    }
  });

  it("autosaves the created project to localStorage", async () => {
    renderApp();
    fireEvent.click(screen.getByText("สร้างโครงการ"));
    // autosave debounce is 800ms
    await new Promise((r) => setTimeout(r, 1000));
    const saved = JSON.parse(window.localStorage.getItem(STORAGE_KEY));
    expect(saved.projects).toHaveLength(1);
    expect(saved.projects[0].name).toBe("โครงการใหม่");
    expect(saved.activeProjectId).toBe(saved.projects[0].id);
  });

  it("restores state from localStorage on reload", () => {
    const { unmount } = renderApp();
    fireEvent.click(screen.getByText("สร้างโครงการ"));
    unmount(); // triggers autosave flush on cleanup
    renderApp();
    expect(screen.queryByText("ยังไม่มีโครงการ")).toBeNull();
    expect(screen.getAllByText("โครงการใหม่").length).toBeGreaterThanOrEqual(1);
  });
});
