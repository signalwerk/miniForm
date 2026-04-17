import { useEffect, useState } from "react";
import { useNavigate } from "react-router-dom";
import { FormsLibrary } from "./FormsLibrary";
import { listForms } from "../lib/pocketbase";
import type { FormSummary } from "../lib/types";

export function FormsOverviewPage() {
  const navigate = useNavigate();
  const [forms, setForms] = useState<FormSummary[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [loadError, setLoadError] = useState("");

  const refreshForms = async () => {
    setIsLoading(true);
    setLoadError("");

    try {
      const nextForms = await listForms();
      setForms(nextForms);
    } catch (error) {
      const message = error instanceof Error ? error.message : "Could not load forms.";
      setLoadError(message);
    } finally {
      setIsLoading(false);
    }
  };

  useEffect(() => {
    void refreshForms();
  }, []);

  return (
    <main className="route-page route-page--forms">
      <section className="route-page__intro">
        <p className="eyebrow">Step 2</p>
        <h2>Choose a form to edit</h2>
        <p>Create a new form or open an existing one. The editor is on its own route now.</p>
        {loadError ? <p className="status-pill status-pill--error">{loadError}</p> : null}
      </section>

      <FormsLibrary
        forms={forms}
        activeRecordId={null}
        isLoading={isLoading}
        onNewForm={() => navigate("/forms/new")}
        onRefresh={() => void refreshForms()}
        onLoad={(recordId) => navigate(`/forms/${recordId}`)}
      />
    </main>
  );
}
