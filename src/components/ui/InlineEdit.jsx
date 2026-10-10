import { useState } from "react";
import { Button } from "./primitives";

// Click-to-edit text used for every editable cell and field in the app.
//
// Keeps its own draft state, so callers only supply the value and an onSave
// callback. onSave may return a promise; the editor stays open (and shows the
// draft) until it resolves, and closes again if it rejects.
export default function InlineEdit({
  value,
  onSave,
  canEdit = true,
  label,
  placeholder = "Click to edit",
  emptyText = "—",
  rows = 3,
  boxed,
  renderValue,
}) {
  const [draft, setDraft] = useState(null);
  const [saving, setSaving] = useState(false);
  const editing = draft !== null;

  const start = () => setDraft(value ?? "");
  const cancel = () => setDraft(null);

  const save = async () => {
    if (draft === (value ?? "")) return cancel();
    setSaving(true);
    try {
      await onSave(draft);
      setDraft(null);
    } catch {
      // The caller reports the error; keep the editor open so nothing is lost.
    } finally {
      setSaving(false);
    }
  };

  const onKeyDown = (e) => {
    if (e.key === "Escape") cancel();
    if (e.key === "Enter" && (e.metaKey || e.ctrlKey)) save();
  };

  if (editing) {
    return (
      <div className="inline-edit__form">
        <textarea
          className="textarea"
          value={draft}
          onChange={(e) => setDraft(e.target.value)}
          onKeyDown={onKeyDown}
          rows={rows}
          autoFocus
          aria-label={label}
          disabled={saving}
        />
        <div className="inline-edit__actions">
          <Button size="sm" onClick={save} disabled={saving}>{saving ? "Saving…" : "Save"}</Button>
          <Button size="sm" variant="secondary" onClick={cancel} disabled={saving}>Cancel</Button>
        </div>
      </div>
    );
  }

  const hasValue = value != null && String(value).trim() !== "";
  const content = hasValue
    ? (renderValue ? renderValue(value) : <span className="inline-edit__value">{value}</span>)
    : <span className="inline-edit__placeholder">{canEdit ? placeholder : emptyText}</span>;

  if (!canEdit) {
    return <div className={`inline-edit${boxed ? " inline-edit--boxed" : ""}`}>{content}</div>;
  }

  return (
    <div className={`inline-edit inline-edit--editable${boxed ? " inline-edit--boxed" : ""}`} onClick={start}>
      {content}
      <button
        type="button"
        className="inline-edit__trigger"
        onClick={(e) => { e.stopPropagation(); start(); }}
        aria-label={label ? `Edit ${label}` : "Edit"}
      >
        EDIT
      </button>
    </div>
  );
}
