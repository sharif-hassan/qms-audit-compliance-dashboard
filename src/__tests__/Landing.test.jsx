import { screen } from "@testing-library/react";
import { describe, expect, it } from "vitest";
import Landing from "../pages/Landing";
import { GUEST, makeGlobal, renderWithProviders } from "./testUtils";

const customStandards = [
  { slug: "custom_alpha", name: "Custom Alpha" },
  { slug: "custom_beta", name: "Custom Beta" },
];

describe("Landing", () => {
  it("links to every built-in and custom standard", () => {
    renderWithProviders(<Landing />, { global: makeGlobal({ customStandards }) });

    expect(screen.getByRole("link", { name: "ISO 9001" })).toHaveAttribute("href", "/iso9001");
    expect(screen.getByRole("link", { name: "ISO 27001" })).toHaveAttribute("href", "/iso27001");
    expect(screen.getByRole("link", { name: "ISO 42001" })).toHaveAttribute("href", "/iso42001");
    expect(screen.getByRole("link", { name: "Custom Alpha" })).toHaveAttribute("href", "/custom/custom_alpha");
    expect(screen.getByRole("link", { name: "Custom Beta" })).toHaveAttribute("href", "/custom/custom_beta");
    expect(screen.getByRole("link", { name: "Upload Custom Standard" })).toHaveAttribute("href", "/custom-upload");
    expect(screen.getByRole("link", { name: "Users" })).toBeInTheDocument();
  });

  it("hides editing and admin links from guests", () => {
    renderWithProviders(<Landing />, { global: makeGlobal({ user: GUEST }) });

    expect(screen.getByRole("link", { name: "ISO 9001" })).toBeInTheDocument();
    expect(screen.queryByRole("link", { name: "Upload Custom Standard" })).not.toBeInTheDocument();
    expect(screen.queryByRole("link", { name: "Evidence" })).not.toBeInTheDocument();
    expect(screen.queryByRole("link", { name: "Users" })).not.toBeInTheDocument();
  });
});
