import type { FormSummary } from "../lib/types";

interface FormsLibraryProps {
  forms: FormSummary[];
  activeRecordId: string | null;
  isLoading: boolean;
  onNewForm: () => void;
  onRefresh: () => void;
  onLoad: (recordId: string) => void;
}

export function FormsLibrary({
  forms,
  activeRecordId,
  isLoading,
  onNewForm,
  onRefresh,
  onLoad,
}: FormsLibraryProps) {
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
              <button
                type="button"
                className={
                  form.recordId === activeRecordId ? "form-list__item form-list__item--active" : "form-list__item"
                }
                onClick={() => onLoad(form.recordId)}
              >
                <strong>{form.title}</strong>
                <span>{new Date(form.updated).toLocaleString()}</span>
              </button>
            </li>
          ))}
        </ul>
      )}
    </aside>
  );
}
