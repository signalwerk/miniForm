import { useEffect, useState } from "react";
import { useNavigate } from "react-router-dom";
import { SurveysLibrary } from "./SurveysLibrary";
import { createSurvey } from "../lib/survey-model";
import { createBlankSurveyRecord, deleteSurvey, listSurveys } from "../lib/pocketbase";
import type { SurveySummary } from "../lib/types";

export function SurveysOverviewPage() {
  const navigate = useNavigate();
  const [surveys, setSurveys] = useState<SurveySummary[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [loadError, setLoadError] = useState("");
  const [isCreating, setIsCreating] = useState(false);
  const [deletingRecordId, setDeletingRecordId] = useState<string | null>(null);

  const refreshSurveys = async () => {
    setIsLoading(true);
    setLoadError("");

    try {
      const nextSurveys = await listSurveys();
      setSurveys(nextSurveys);
    } catch (error) {
      const message = error instanceof Error ? error.message : "Could not load surveys.";
      setLoadError(message);
    } finally {
      setIsLoading(false);
    }
  };

  useEffect(() => {
    void refreshSurveys();
  }, []);

  const handleNewSurvey = async () => {
    setIsCreating(true);
    setLoadError("");

    try {
      const created = await createBlankSurveyRecord(createSurvey());
      navigate(`/surveys/${created.recordId}`);
    } catch (error) {
      const message = error instanceof Error ? error.message : "Could not create a new survey.";
      setLoadError(message);
    } finally {
      setIsCreating(false);
    }
  };

  const handleDeleteSurvey = async (survey: SurveySummary) => {
    const shouldDelete = window.confirm(`Delete "${survey.title}"? This cannot be undone.`);

    if (!shouldDelete) {
      return;
    }

    setDeletingRecordId(survey.recordId);
    setLoadError("");

    try {
      await deleteSurvey(survey.recordId);
      setSurveys((currentSurveys) => currentSurveys.filter((entry) => entry.recordId !== survey.recordId));
    } catch (error) {
      const message = error instanceof Error ? error.message : "Could not delete the survey.";
      setLoadError(message);
    } finally {
      setDeletingRecordId(null);
    }
  };

  return (
    <main className="route-page route-page--surveys">
      <section className="route-page__intro">
        <p className="eyebrow">Step 2</p>
        <h2>Choose a survey to edit</h2>
        <p>Create a new survey or open an existing one. The editor is on its own route now.</p>
        {loadError ? <p className="status-pill status-pill--error">{loadError}</p> : null}
        {isCreating ? <p className="helper-text">Creating survey…</p> : null}
      </section>

      <SurveysLibrary
        surveys={surveys}
        activeRecordId={null}
        isLoading={isLoading}
        deletingRecordId={deletingRecordId}
        onNewSurvey={() => void handleNewSurvey()}
        onRefresh={() => void refreshSurveys()}
        onLoad={(recordId) => navigate(`/surveys/${recordId}`)}
        onDelete={(survey) => void handleDeleteSurvey(survey)}
      />
    </main>
  );
}
