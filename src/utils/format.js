export const plural = (count, word, pluralWord = `${word}s`) =>
  `${count} ${count === 1 ? word : pluralWord}`;

export function formatDate(value, { withTime = false } = {}) {
  if (!value) return "—";
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) return "—";
  return withTime ? date.toLocaleString() : date.toLocaleDateString();
}

export function formatBytes(bytes) {
  if (bytes == null) return "";
  if (bytes < 1024) return `${bytes} B`;
  if (bytes < 1024 * 1024) return `${(bytes / 1024).toFixed(1)} KB`;
  return `${(bytes / (1024 * 1024)).toFixed(1)} MB`;
}

export function initials(nameOrEmail) {
  const parts = String(nameOrEmail || "").trim().split(/\s+/).filter(Boolean);
  if (parts.length === 0) return "U";
  if (parts.length === 1) return parts[0][0].toUpperCase();
  return (parts[0][0] + parts[1][0]).toUpperCase();
}

export const splitList = (value) =>
  String(value || "").split(",").map((s) => s.trim()).filter(Boolean);

export function matchesSearch(term, ...values) {
  if (!term) return true;
  const needle = term.toLowerCase();
  return values.some((v) => v != null && String(v).toLowerCase().includes(needle));
}

// ISO requirement text often packs a list into one sentence:
//   "The organization shall: a) determine… b) apply… c) ensure…"
// Split it into the intro and the list items.
const ITEM_SPLIT = /(?<=\s)(?=(?:[a-z]|\d+)\)\s)/;
const ITEM_MATCH = /^((?:[a-z]|\d+)\))\s*(.*)$/s;

export function splitListItems(text) {
  const parts = String(text || "").split(ITEM_SPLIT);
  const intro = parts[0].trim();
  const items = parts
    .slice(1)
    .map((p) => p.trim().match(ITEM_MATCH))
    .filter(Boolean)
    .map(([, marker, body]) => ({ marker, body }));
  return { intro, items };
}
