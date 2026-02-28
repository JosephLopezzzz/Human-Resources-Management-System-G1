import { describe, it, expect } from "vitest";
import React from "react";
import { render, screen, fireEvent } from "@testing-library/react";
import Login from "@/pages/Login";
import { AuthContext, type AuthContextValue } from "@/auth/AuthContext";
import { MemoryRouter } from "react-router-dom";

function renderLogin() {
  const value: AuthContextValue = {
    session: null,
    user: null,
    loading: false,
    needsMfa: false,
    signOut: async () => {},
  };

  return render(
    <AuthContext.Provider value={value}>
      <MemoryRouter>
        <Login />
      </MemoryRouter>
    </AuthContext.Provider>
  );
}

describe("Login form", () => {
  it("disables Sign in button when email or password is empty", () => {
    renderLogin();
    const submit = screen.getByRole("button", { name: /sign in/i });
    expect(submit).toBeDisabled();
  });

  it("enables Sign in button when email and password are filled", () => {
    renderLogin();

    const emailInput = screen.getByLabelText(/email/i);
    const passwordInput = screen.getByLabelText(/password/i);
    const submit = screen.getByRole("button", { name: /sign in/i });

    fireEvent.change(emailInput, { target: { value: "user@example.com" } });
    fireEvent.change(passwordInput, { target: { value: "password123" } });

    expect(submit).not.toBeDisabled();
  });
});

