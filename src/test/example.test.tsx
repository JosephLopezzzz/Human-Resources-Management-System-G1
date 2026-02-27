import { describe, it, expect } from "vitest";
import React from "react";
import { MemoryRouter, Route, Routes } from "react-router-dom";
import { render, screen } from "@testing-library/react";
import { RequireRole } from "@/auth/RequireRole";
import { AuthContext, type AuthContextValue } from "@/auth/AuthContext";

function renderWithAuth(ctx: Partial<AuthContextValue>) {
  const value: AuthContextValue = {
    session: null,
    user: null,
    loading: false,
    needsMfa: false,
    signOut: async () => {},
    ...ctx,
  };

  return render(
    <AuthContext.Provider value={value}>
      <MemoryRouter initialEntries={["/protected"]}>
        <Routes>
          <Route element={<RequireRole allowed={["admin"]} />}>
            <Route path="/protected" element={<div>secret</div>} />
          </Route>
          <Route path="/" element={<div>home</div>} />
        </Routes>
      </MemoryRouter>
    </AuthContext.Provider>
  );
}

describe("RequireRole", () => {
  it("allows access for allowed role", () => {
    renderWithAuth({
      user: {
        id: "u1",
        email: "admin@example.com",
        user_metadata: { role: "admin" },
      } as any,
    });

    expect(screen.getByText("secret")).toBeInTheDocument();
  });

  it("redirects when role is not allowed", () => {
    renderWithAuth({
      user: {
        id: "u2",
        email: "user@example.com",
        user_metadata: { role: "employee" },
      } as any,
    });

    expect(screen.getByText("home")).toBeInTheDocument();
  });
}
);

