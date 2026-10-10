import { useEffect, useState } from "react";
import { useGlobal, useToast } from "../state/context";
import { describeStandard } from "../standards";

// Loads one standard's rows and wraps edit/delete with error toasts.
export function useStandard(standardId) {
  const { customStandards, rowsByStandard, loadStandard, updateRow, deleteRow } = useGlobal();
  const toast = useToast();
  const [error, setError] = useState(null);

  const standard = describeStandard(standardId, customStandards);
  const rows = rowsByStandard[standardId];

  useEffect(() => {
    let cancelled = false;
    loadStandard(standardId)
      .then(() => { if (!cancelled) setError(null); })
      .catch((err) => { if (!cancelled) setError(err.message); });
    return () => { cancelled = true; };
  }, [standardId, loadStandard]);

  // Returns an onSave handler for <InlineEdit>.
  const saveField = (row, field) => async (value) => {
    try {
      await updateRow(standardId, row, field, value);
    } catch (err) {
      toast.error(`Couldn't save: ${err.message}`);
      throw err;
    }
  };

  const removeRow = async (row, label) => {
    if (!window.confirm(`Delete ${label}? Its evidence links will be removed. This cannot be undone.`)) return;
    try {
      await deleteRow(standardId, row);
      toast.success(`Deleted ${label}`);
    } catch (err) {
      toast.error(`Couldn't delete: ${err.message}`);
    }
  };

  return { standard, rows, loading: rows === undefined && !error, error, saveField, removeRow };
}
