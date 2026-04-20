import type { FormSummary } from "../lib/types";

interface FormsLibraryProps {
  forms: FormSummary[];
  activeRecordId: string | null;
  isLoading: boolean;
  deletingRecordId: string | null;
  onNewForm: () => void;
  onRefresh: () => void;
  onLoad: (recordId: string) => void;
  onDelete: (form: FormSummary) => void;
}

export function FormsLibrary({
  forms,
  activeRecordId,
  isLoading,
  deletingRecordId,
  onNewForm,
  onRefresh,
  onLoad,
  onDelete,
}: FormsLibraryProps) {
  const formatUpdated = (value: string) => {
    const parsed = Date.parse(value);
    return Number.isNaN(parsed) ? "Recently changed" : new Date(parsed).toLocaleString();
  };

  return (
    <aside className="panel">
      <div className="panel__header">
        <div>
          <p className="eyebrow">Library</p>
          <h2>My forms</h2>
        </div>
        <div className="button-group">
          <button type="button" className="button button--ghost" onClick={onRefresh}>
            Refresh
          </button>
          <button type="button" className="button button--secondary" onClick={onNewForm}>
            New form
          </button>
        </div>
      </div>

      {isLoading ? <p className="helper-text">Loading forms…</p> : null}

      {forms.length === 0 ? (
        <p className="helper-text">No saved forms yet. Start editing and save one to PocketBase.</p>
      ) : (
        <ul className="form-list">
          {forms.map((form) => (
            <li key={form.recordId}>
              <div
                className={
                  form.recordId === activeRecordId ? "form-list__row form-list__row--active" : "form-list__row"
                }
              >
                <button
                  type="button"
                  className="form-list__item"
                  onClick={() => onLoad(form.recordId)}
                >
                  <strong>{form.title}</strong>
                  <span>{formatUpdated(form.updated)}</span>
                </button>

                <button
                  type="button"
                  className="button button--ghost button--danger form-list__delete"
                  disabled={deletingRecordId === form.recordId}
                  onClick={() => onDelete(form)}
                >
                  {deletingRecordId === form.recordId ? "Deleting…" : "Delete"}
                </button>
              </div>
            </li>
          ))}
        </ul>
      )}
    </aside>
  );
}
