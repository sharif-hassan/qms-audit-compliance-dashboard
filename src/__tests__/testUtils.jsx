import { render } from "@testing-library/react";
import { MemoryRouter } from "react-router-dom";
import { vi } from "vitest";
import { GlobalContext, ToastContext } from "../state/context";

export const ADMIN = { id: 1, name: "Ada Admin", email: "admin@example.com", role: "ADMIN" };
export const GUEST = { id: 3, name: "Gus Guest", email: "guest@example.com", role: "GUEST" };

export function makeGlobal(overrides = {}) {
  return {
    user: ADMIN,
    token: "test-token",
    login: vi.fn(),
    logout: vi.fn(),
    request: vi.fn().mockResolvedValue([]),
    customStandards: [],
    rowsByStandard: {},
    loadStandard: vi.fn().mockResolvedValue([]),
    updateRow: vi.fn().mockResolvedValue(),
    deleteRow: vi.fn().mockResolvedValue(),
    createCustomStandard: vi.fn(),
    deleteCustomStandard: vi.fn(),
    ...overrides,
  };
}

export function renderWithProviders(ui, { global = makeGlobal(), route = "/" } = {}) {
  const toast = { success: vi.fn(), error: vi.fn() };
  const result = render(
    <ToastContext.Provider value={toast}>
      <GlobalContext.Provider value={global}>
        <MemoryRouter initialEntries={[route]}>{ui}</MemoryRouter>
      </GlobalContext.Provider>
    </ToastContext.Provider>,
  );
  return { ...result, global, toast };
}
