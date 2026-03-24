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
  it("disables Sign in button when username or password is empty", () => {
    const { container } = renderLogin();
    const submit = screen.getByRole("button", { name: /sign in/i });
    expect(submit).toBeDisabled();
  });

  it("enables Sign in button when username and password are filled", () => {
    const { container } = renderLogin();

    const usernameInput = container.querySelector('#username') as HTMLInputElement;
    const passwordInput = container.querySelector('#password') as HTMLInputElement;
    const submit = screen.getByRole("button", { name: /sign in/i });

    fireEvent.change(usernameInput, { target: { value: "user1" } });
    fireEvent.change(passwordInput, { target: { value: "password123" } });

    expect(submit).not.toBeDisabled();
  });
});

