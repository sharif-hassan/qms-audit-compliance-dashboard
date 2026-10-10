import { fireEvent, screen } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { beforeEach, describe, expect, it, vi } from "vitest";
import * as XLSX from "xlsx";
import CustomISO from "../pages/CustomISO";
import { makeGlobal, renderWithProviders } from "./testUtils";

const navigate = vi.fn();
vi.mock("react-router-dom", async (importOriginal) => ({
  ...(await importOriginal()),
  useNavigate: () => navigate,
}));
vi.mock("file-saver", () => ({ saveAs: vi.fn() }));

function workbookFile(rows, name = "nist_csf.xlsx") {
  const wb = XLSX.utils.book_new();
  XLSX.utils.book_append_sheet(wb, XLSX.utils.aoa_to_sheet(rows), "Sheet1");
  const buffer = XLSX.write(wb, { bookType: "xlsx", type: "array" });
  return new File([buffer], name);
}

const SAMPLE = [
  ["Clause No.", "Clause", "Audit Question", "Responsible Party"],
  ["ID", "IDENTIFY", "", ""],
  ["ID.AM-1", "Asset Inventory", "Are devices inventoried?", "IT Director"],
];

async function upload(file) {
  fireEvent.change(document.querySelector("input[type=file]"), { target: { files: [file] } });
  return screen.findByRole("button", { name: "Save as standard" });
}

describe("CustomISO", () => {
  beforeEach(() => vi.clearAllMocks());

  it("shows the format guide and drop zone", () => {
    renderWithProviders(<CustomISO />);
    expect(screen.getByRole("button", { name: /column guide/i })).toHaveAttribute("aria-expanded", "true");
    expect(screen.getByText(/drag & drop your excel file/i)).toBeInTheDocument();
  });

  it("rejects non-Excel files", () => {
    renderWithProviders(<CustomISO />);
    fireEvent.change(document.querySelector("input[type=file]"), { target: { files: [new File(["x"], "notes.txt")] } });
    expect(screen.getByRole("alert")).toHaveTextContent(/excel file/i);
  });

  it("parses an upload, previews it and saves it as a standard", async () => {
    const global = makeGlobal({ createCustomStandard: vi.fn().mockResolvedValue("nist_csf") });
    renderWithProviders(<CustomISO />, { global });

    const saveButton = await upload(workbookFile(SAMPLE));
    expect(screen.getByText("Are devices inventoried?")).toBeInTheDocument();
    expect(screen.getByText(/Found 1 question in 1 section/)).toBeInTheDocument();

    const name = screen.getByPlaceholderText(/ISO 31000/);
    expect(name).toHaveValue("nist csf");
    await userEvent.clear(name);
    await userEvent.type(name, "NIST CSF");
    await userEvent.click(saveButton);

    expect(global.createCustomStandard).toHaveBeenCalledWith("NIST CSF", [
      { type: "section", clause: "ID", isoClause: "IDENTIFY" },
      expect.objectContaining({ type: "question", clause: "ID.AM-1", responsibleParty: "IT Director" }),
    ]);
    expect(navigate).toHaveBeenCalledWith("/custom/nist_csf");
  });

  it("requires a name and shows server errors", async () => {
    const global = makeGlobal({ createCustomStandard: vi.fn().mockRejectedValue(new Error("A standard with this name already exists.")) });
    renderWithProviders(<CustomISO />, { global });
    const saveButton = await upload(workbookFile(SAMPLE));

    await userEvent.clear(screen.getByPlaceholderText(/ISO 31000/));
    await userEvent.click(saveButton);
    expect(screen.getByRole("alert")).toHaveTextContent(/enter a name/i);
    expect(global.createCustomStandard).not.toHaveBeenCalled();

    await userEvent.type(screen.getByPlaceholderText(/ISO 31000/), "Dup");
    await userEvent.click(saveButton);
    expect(await screen.findByText(/already exists/)).toBeInTheDocument();
    expect(navigate).not.toHaveBeenCalled();
  });
});
