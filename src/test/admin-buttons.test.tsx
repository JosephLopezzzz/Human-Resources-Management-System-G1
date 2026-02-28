import { describe, it, expect, vi, beforeEach } from "vitest";
import React from "react";
import { render, screen } from "@testing-library/react";
import { AuthContext, type AuthContextValue } from "@/auth/AuthContext";

vi.mock("@/hooks/useEmployees", () => ({
  useEmployees: () => ({
    employees: [],
    isLoading: false,
    error: null,
    createEmployee: vi.fn(),
    creating: false,
  }),
}));

vi.mock("@/hooks/useDepartments", () => ({
  useDepartments: () => ({
    departments: [],
    isLoading: false,
    error: null,
    createDepartment: vi.fn(),
    creating: false,
  }),
}));

vi.mock("@/hooks/usePerformance", () => ({
  useReviewCycles: () => ({ data: [], isLoading: false, error: null }),
  useKpis: () => ({ data: [], isLoading: false, error: null }),
  usePerformanceMutations: () => ({ createCycle: vi.fn(), creatingCycle: false }),
}));

vi.mock("@/hooks/usePayroll", () => ({
  usePayroll: () => ({
    run: null,
    runLoading: false,
    runError: null,
    items: [],
    itemsLoading: false,
    itemsError: null,
    generateRun: vi.fn(),
    generating: false,
    lockRun: vi.fn(),
    locking: false,
  }),
}));

import Employees from "@/pages/Employees";
import Departments from "@/pages/Departments";
import Performance from "@/pages/Performance";
import Payroll from "@/pages/Payroll";

function renderWithRole(role: string, ui: React.ReactElement) {
  const value: AuthContextValue = {
    session: null,
    user: {
      id: "u1",
      email: "user@example.com",
      user_metadata: { role },
    } as any,
    loading: false,
    needsMfa: false,
    signOut: async () => {},
  };

  return render(<AuthContext.Provider value={value}>{ui}</AuthContext.Provider>);
}

describe("admin/manager buttons visibility", () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it("shows Add Employee button for admin", () => {
    renderWithRole("admin", <Employees />);
    expect(screen.getByText("Add Employee")).toBeInTheDocument();
  });

  it("hides Add Employee button for regular employee", () => {
    renderWithRole("employee", <Employees />);
    expect(screen.queryByText("Add Employee")).toBeNull();
  });

  it("shows Add Department for admin", () => {
    renderWithRole("admin", <Departments />);
    expect(screen.getByText("Add Department")).toBeInTheDocument();
  });

  it("hides Add Department for regular employee", () => {
    renderWithRole("employee", <Departments />);
    expect(screen.queryByText("Add Department")).toBeNull();
  });

  it("shows New Review Cycle for admin", () => {
    renderWithRole("admin", <Performance />);
    expect(screen.getByText("New Review Cycle")).toBeInTheDocument();
  });

  it("hides New Review Cycle for regular employee", () => {
    renderWithRole("employee", <Performance />);
    expect(screen.queryByText("New Review Cycle")).toBeNull();
  });

  it("shows payroll actions for payroll role", () => {
    renderWithRole("payroll", <Payroll />);
    expect(screen.getByText("Generate Payroll")).toBeInTheDocument();
    expect(screen.getByText("Lock Payroll")).toBeInTheDocument();
  });

  it("hides payroll actions for regular employee", () => {
    renderWithRole("employee", <Payroll />);
    expect(screen.queryByText("Generate Payroll")).toBeNull();
    expect(screen.queryByText("Lock Payroll")).toBeNull();
  });
});

