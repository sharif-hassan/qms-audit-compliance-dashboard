import { screen, within } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { beforeEach, describe, expect, it, vi } from "vitest";
import { saveAs } from "file-saver";
import ChecklistPage from "../pages/ChecklistPage";
import { GUEST, makeGlobal, renderWithProviders } from "./testUtils";

vi.mock("file-saver", () => ({ saveAs: vi.fn() }));

const fileLinks = new Map([[3, [{ file: { id: 7, name: "policy.pdf", url: "/uploads/1__policy.pdf" }, comment: "Signed copy" }]]]);
vi.mock("../hooks/useFiles", () => ({
  useFiles: () => ({ linksByClause: fileLinks, loading: false, updateComment: vi.fn(), detachClause: vi.fn() }),
}));

const rows = [
  { dbId: 1, type: "section", clause: "4", isoClause: "Context" },
  { dbId: 2, type: "subsection", clause: "4.1", isoClause: "Understanding the org" },
  { dbId: 3, type: "question", clause: "4.1 q1", isoClause: "The org shall determine", auditQuestion: "What issues exist?",
    std: "9001, 27001", cycle: "Annual", responsibleParty: "VP Tech", evaluatorNotes: "Reviewed" },
  { dbId: 4, type: "question", clause: "4.1 q2", isoClause: "The org shall monitor", auditQuestion: "How are they tracked?",
    std: "9001", cycle: "Annual", responsibleParty: "QA Lead" },
];

const renderPage = (overrides) => renderWithProviders(
  <ChecklistPage standardId="custom:test_standard" />,
  { global: makeGlobal({
    customStandards: [{ slug: "test_standard", name: "Test Standard" }],
    rowsByStandard: { "custom:test_standard": rows },
    ...overrides,
  }) },
);

describe("ChecklistPage", () => {
  beforeEach(() => vi.clearAllMocks());

  it("loads the standard and shows its sections, questions and evidence", () => {
    const { global } = renderPage();

    expect(global.loadStandard).toHaveBeenCalledWith("custom:test_standard");
    expect(screen.getByRole("heading", { name: "Test Standard" })).toBeInTheDocument();
    expect(screen.getByRole("button", { name: /Context/ })).toHaveAttribute("aria-expanded", "true");
    expect(screen.getByText("What issues exist?")).toBeInTheDocument();
    expect(screen.getByRole("link", { name: "policy.pdf" })).toHaveAttribute("href", "/uploads/1__policy.pdf");
    expect(screen.getByText("Signed copy")).toBeInTheDocument();
    expect(screen.getByText("2 questions", { selector: ".count-pill" })).toBeInTheDocument();
  });

  it("filters questions by search", async () => {
    renderPage();
    await userEvent.type(screen.getByRole("searchbox"), "tracked");

    expect(screen.getByText("How are they tracked?")).toBeInTheDocument();
    expect(screen.queryByText("What issues exist?")).not.toBeInTheDocument();
    expect(screen.getByText("1 result")).toBeInTheDocument();
  });

  it("collapses a section", async () => {
    renderPage();
    await userEvent.click(screen.getByRole("button", { name: /Context/ }));
    expect(screen.queryByText("What issues exist?")).not.toBeInTheDocument();
  });

  it("saves inline edits through updateRow", async () => {
    const { global } = renderPage();
    const row = screen.getByText("What issues exist?").closest("tr");

    await userEvent.click(within(row).getByRole("button", { name: "Edit cycle" }));
    const box = within(row).getByRole("textbox", { name: "cycle" });
    await userEvent.clear(box);
    await userEvent.type(box, "Quarterly");
    await userEvent.click(within(row).getByRole("button", { name: "Save" }));

    expect(global.updateRow).toHaveBeenCalledWith("custom:test_standard", rows[2], "cycle", "Quarterly");
  });

  it("exports to Excel", async () => {
    renderPage();
    await userEvent.click(screen.getByRole("button", { name: /Export to Excel/ }));
    expect(saveAs).toHaveBeenCalledWith(expect.any(Blob), "Test_Standard_audit.xlsx");
  });

  it("is read-only for guests", () => {
    renderPage({ user: GUEST });
    expect(screen.queryAllByRole("button", { name: /^Edit / })).toHaveLength(0);
    expect(screen.queryAllByRole("button", { name: /Delete clause/ })).toHaveLength(0);
  });
});

describe("ChecklistPage evidence for guests", () => {
  it("doesn't leave an empty notes block above evidence files", () => {
    renderPage({
      user: GUEST,
      rowsByStandard: { "custom:test_standard": rows.map((r) => ({ ...r, evaluatorNotes: null })) },
    });
    const cell = screen.getByRole("link", { name: "policy.pdf" }).closest(".evidence");
    expect(cell.querySelector(".inline-edit:not(.evidence-file .inline-edit)")).toBeNull();
  });
});
