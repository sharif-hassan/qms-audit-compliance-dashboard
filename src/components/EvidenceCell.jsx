import InlineEdit from "./ui/InlineEdit";
import Icon from "./ui/Icon";
import { IconButton } from "./ui/primitives";
import { useToast } from "../state/context";

// Evaluator notes plus the evidence files linked to one clause. Each file link
// can carry its own comment, and editors can unlink a file from the clause
// (the file itself stays on the Files page).
export default function EvidenceCell({ clauseId, notes, onSaveNotes, files, canEdit, boxed }) {
  const toast = useToast();
  const links = files.linksByClause.get(clauseId) || [];

  const saveComment = (file) => async (comment) => {
    try {
      await files.updateComment(file.id, clauseId, comment);
    } catch (err) {
      toast.error(`Couldn't save comment: ${err.message}`);
      throw err;
    }
  };

  const unlink = async (file) => {
    if (!window.confirm(`Remove "${file.name}" from this clause? The file stays available on the Files page.`)) return;
    try {
      await files.detachClause(file.id, clauseId);
      toast.success(`Removed ${file.name}`);
    } catch (err) {
      toast.error(`Couldn't remove file: ${err.message}`);
    }
  };

  return (
    <div className="evidence">
      {/* Read-only viewers only see the notes block when there are notes. */}
      {((canEdit && onSaveNotes) || notes) && (
        <InlineEdit
          value={notes}
          onSave={onSaveNotes}
          canEdit={canEdit && Boolean(onSaveNotes)}
          label="evaluator notes"
          placeholder="Add evaluator notes"
          emptyText=""
          boxed={boxed}
        />
      )}
      {links.map(({ file, comment }) => (
        <div key={file.id} className="evidence-file">
          <div className="evidence-file__row">
            <Icon name="file" size={13} className="faint" />
            <a className="evidence-file__link" href={file.url} target="_blank" rel="noopener noreferrer" title={file.name}>
              {file.name}
            </a>
            {canEdit && <IconButton icon="x" size={13} label={`Remove ${file.name} from this clause`} onClick={() => unlink(file)} />}
          </div>
          {(comment || canEdit) && (
            <InlineEdit
              value={comment}
              onSave={saveComment(file)}
              canEdit={canEdit}
              label={`comment for ${file.name}`}
              placeholder="Add comment"
              rows={2}
            />
          )}
        </div>
      ))}
      {!canEdit && !notes && links.length === 0 && <span className="faint">—</span>}
    </div>
  );
}
