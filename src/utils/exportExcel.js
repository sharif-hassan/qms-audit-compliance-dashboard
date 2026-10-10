import * as XLSX from "xlsx";
import { saveAs } from "file-saver";
import { absoluteUrl } from "../api";

const XLSX_MIME = "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet";

const safeFileName = (name) => name.replace(/[^\w.-]+/g, "_");

// Builds a sheet where each record can expand into several rows, one per
// linked evidence file, with the file name hyperlinked to the upload.
function buildSheet(headers, records, fileColumn) {
  const data = [headers];
  const links = [];

  for (const { cells, files = [] } of records) {
    const [first, ...rest] = files;
    const row = [...cells];
    if (fileColumn !== undefined) row.splice(fileColumn, 0, first?.name ?? "");
    data.push(row);
    if (first) links.push({ r: data.length - 1, file: first });

    for (const file of rest) {
      const extra = new Array(row.length).fill("");
      extra[fileColumn] = file.name;
      data.push(extra);
      links.push({ r: data.length - 1, file });
    }
  }

  const sheet = XLSX.utils.aoa_to_sheet(data);
  for (const { r, file } of links) {
    const ref = XLSX.utils.encode_cell({ r, c: fileColumn });
    if (sheet[ref]) sheet[ref].l = { Target: absoluteUrl(file.url), Tooltip: file.name };
  }
  return sheet;
}

function download(sheet, sheetName, fileName, widths) {
  sheet["!cols"] = widths.map((wch) => ({ wch }));
  const workbook = XLSX.utils.book_new();
  XLSX.utils.book_append_sheet(workbook, sheet, sheetName.replace(/[\\/?*[\]:]/g, "").slice(0, 31));
  const buffer = XLSX.write(workbook, { bookType: "xlsx", type: "array" });
  saveAs(new Blob([buffer], { type: XLSX_MIME }), safeFileName(fileName));
}

const comments = (links) => links.map((l) => l.comment).filter(Boolean).join(" | ");

export function exportChecklist(standard, rows, linksByClause) {
  const records = rows.map((row) => {
    if (row.type === "section" || row.type === "subsection") {
      return { cells: [row.clause, row.isoClause || "", "", "", "", "", "", ""] };
    }
    const links = linksByClause.get(row.dbId) || [];
    return {
      cells: [
        row.clause, row.isoClause || "", row.auditQuestion || "", row.std || "", row.cycle || "",
        row.evaluatorNotes || "", comments(links), row.responsibleParty || "",
      ],
      files: links.map((l) => l.file),
    };
  });

  const headers = ["Clause", "Requirement", "Audit Question", "Std", "Cycle", "Evaluator Notes", "Evidence Comment", "Evidence File", "Responsible Party"];
  const sheet = buildSheet(headers, records, 7);
  download(sheet, standard.name, `${standard.name}_audit.xlsx`, [14, 55, 55, 14, 12, 35, 35, 40, 22]);
}

export function exportControls(standard, rows, linksByClause) {
  const records = rows.map((row) => {
    const links = linksByClause.get(row.dbId) || [];
    return {
      cells: [
        row.id, row.category || "", row.title || "", row.description || "", row.reference || "",
        row.evaluatorNotes || "", comments(links), row.responsible || "",
      ],
      files: links.map((l) => l.file),
    };
  });

  const headers = ["Control", "Category", "Title", "Description", "Reference", "Evaluator Notes", "Evidence Comment", "Evidence File", "Responsible"];
  const sheet = buildSheet(headers, records, 7);
  download(sheet, standard.name, `${standard.name}_audit.xlsx`, [16, 18, 40, 55, 20, 35, 35, 40, 20]);
}
