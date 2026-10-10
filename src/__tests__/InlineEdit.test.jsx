import { render, screen } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { describe, expect, it, vi } from "vitest";
import InlineEdit from "../components/ui/InlineEdit";

describe("InlineEdit", () => {
  it("saves the edited value", async () => {
    const onSave = vi.fn().mockResolvedValue();
    render(<InlineEdit value="Annual" onSave={onSave} label="cycle" />);

    await userEvent.click(screen.getByText("Annual"));
    const box = screen.getByRole("textbox", { name: "cycle" });
    await userEvent.clear(box);
    await userEvent.type(box, "Quarterly");
    await userEvent.click(screen.getByRole("button", { name: "Save" }));

    expect(onSave).toHaveBeenCalledWith("Quarterly");
    expect(screen.queryByRole("textbox")).not.toBeInTheDocument();
  });

  it("cancels with Escape without saving", async () => {
    const onSave = vi.fn();
    render(<InlineEdit value="Annual" onSave={onSave} label="cycle" />);

    await userEvent.click(screen.getByRole("button", { name: "Edit cycle" }));
    await userEvent.type(screen.getByRole("textbox"), "x{Escape}");

    expect(onSave).not.toHaveBeenCalled();
    expect(screen.getByText("Annual")).toBeInTheDocument();
  });

  it("keeps the editor open when saving fails", async () => {
    const onSave = vi.fn().mockRejectedValue(new Error("nope"));
    render(<InlineEdit value="" onSave={onSave} label="notes" />);

    await userEvent.click(screen.getByRole("button", { name: "Edit notes" }));
    await userEvent.type(screen.getByRole("textbox"), "draft");
    await userEvent.click(screen.getByRole("button", { name: "Save" }));

    expect(screen.getByRole("textbox")).toHaveValue("draft");
  });

  it("is read-only when canEdit is false", () => {
    render(<InlineEdit value="" onSave={vi.fn()} canEdit={false} emptyText="—" />);
    expect(screen.queryByRole("button")).not.toBeInTheDocument();
    expect(screen.getByText("—")).toBeInTheDocument();
  });
});
