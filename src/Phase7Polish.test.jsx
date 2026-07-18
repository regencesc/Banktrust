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
  document.documentElement.lang = "";
});

describe("i18n (Phase 7)", () => {
  it("defaults to Thai and switches the whole UI to English", () => {
    renderApp();
    expect(screen.getAllByText("ภาพรวม").length).toBeGreaterThanOrEqual(1);
    expect(document.documentElement.lang).toBe("th");

    fireEvent.click(screen.getByRole("button", { name: "en" }));
    expect(screen.getAllByText("Overview").length).toBeGreaterThanOrEqual(1);
    expect(screen.getByText("Quote Comparison")).toBeTruthy();
    expect(screen.getByText("Start by creating your first project")).toBeTruthy();
    expect(document.documentElement.lang).toBe("en");

    // switch back
    fireEvent.click(screen.getByRole("button", { name: "th" }));
    expect(screen.getAllByText("ภาพรวม").length).toBeGreaterThanOrEqual(1);
  });

  it("persists the chosen language across reloads", async () => {
    const { unmount } = renderApp();
    fireEvent.click(screen.getByRole("button", { name: "en" }));
    unmount(); // flush autosave
    renderApp();
    expect(screen.getAllByText("Overview").length).toBeGreaterThanOrEqual(1);
    const saved = JSON.parse(window.localStorage.getItem(STORAGE_KEY));
    expect(saved.language).toBe("en");
  });
});

describe("mobile drawer (Phase 7)", () => {
  it("hamburger opens the drawer sidebar and nav click closes it", () => {
    renderApp();
    // desktop sidebar + no drawer yet -> one nav
    expect(document.querySelectorAll("aside").length).toBe(1);

    fireEvent.click(screen.getByRole("button", { name: "เปิดเมนู" }));
    expect(document.querySelectorAll("aside").length).toBe(2); // drawer added

    // clicking a nav link inside the drawer closes it
    const drawerAside = document.querySelectorAll("aside")[1];
    const link = drawerAside.querySelector('a[href="#/methodology"]');
    fireEvent.click(link);
    expect(document.querySelectorAll("aside").length).toBe(1);
  });

  it("backdrop click closes the drawer", () => {
    renderApp();
    fireEvent.click(screen.getByRole("button", { name: "เปิดเมนู" }));
    const backdrop = document.querySelector(".fixed.inset-0 > div[aria-hidden]");
    fireEvent.click(backdrop);
    expect(document.querySelectorAll("aside").length).toBe(1);
  });
});

describe("disclaimers everywhere (Phase 7, Hard Rule 3)", () => {
  it("dashboard shows the short disclaimer once a project exists", () => {
    renderApp();
    fireEvent.click(screen.getByText("สร้างโครงการ"));
    fireEvent.click(screen.getAllByText("ภาพรวม")[0]);
    expect(
      screen.getByText(/ไม่ใช่การรับประกันผลตอบแทน โปรดตรวจสอบประกาศ/)
    ).toBeTruthy();
  });
});
