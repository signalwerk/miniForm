import type { SurveySummary } from "../lib/types";

interface SurveysLibraryProps {
  surveys: SurveySummary[];
  activeRecordId: string | null;
  isLoading: boolean;
  deletingRecordId: string | null;
  onNewSurvey: () => void;
  onRefresh: () => void;
  onLoad: (recordId: string) => void;
  onDelete: (survey: SurveySummary) => void;
}

export function SurveysLibrary({
  surveys,
  activeRecordId,
  isLoading,
  deletingRecordId,
  onNewSurvey,
  onRefresh,
  onLoad,
  onDelete,
}: SurveysLibraryProps) {
  const formatUpdated = (value: string) => {
    const parsed = Date.parse(value);
    return Number.isNaN(parsed) ? "Recently changed" : new Date(parsed).toLocaleString();
  };

  return (
    <aside className="panel">
      <div className="panel__header">
        <div>
          <p className="eyebrow">Library</p>
          <h2>My surveys</h2>
        </div>
        <div className="button-group">
          <button type="button" className="button button--ghost" onClick={onRefresh}>
            Refresh
          </button>
          <button type="button" className="button button--secondary" onClick={onNewSurvey}>
            New survey
          </button>
        </div>
      </div>

      {isLoading ? <p className="helper-text">Loading surveys…</p> : null}

      {surveys.length === 0 ? (
        <p className="helper-text">No saved surveys yet. Start editing and save one to PocketBase.</p>
      ) : (
        <ul className="survey-list">
          {surveys.map((survey) => (
            <li key={survey.recordId}>
              <div
                className={
                  survey.recordId === activeRecordId
                    ? "survey-list__row survey-list__row--active"
                    : "survey-list__row"
                }
              >
                <button
                  type="button"
                  className="survey-list__item"
                  onClick={() => onLoad(survey.recordId)}
                >
                  <strong>{survey.title}</strong>
                  <span>{formatUpdated(survey.updated)}</span>
                </button>

                <button
                  type="button"
                  className="button button--ghost button--danger survey-list__delete"
                  disabled={deletingRecordId === survey.recordId}
                  onClick={() => onDelete(survey)}
                >
                  {deletingRecordId === survey.recordId ? "Deleting…" : "Delete"}
                </button>
              </div>
            </li>
          ))}
        </ul>
      )}
    </aside>
  );
}
