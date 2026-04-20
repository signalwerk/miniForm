import { useEffect, useState } from "react";
import { useNavigate } from "react-router-dom";
import { FormsLibrary } from "./FormsLibrary";
import { createForm } from "../lib/form-model";
import { createBlankFormRecord, deleteForm, listForms } from "../lib/pocketbase";
import type { FormSummary } from "../lib/types";

export function FormsOverviewPage() {
  const navigate = useNavigate();
  const [forms, setForms] = useState<FormSummary[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [loadError, setLoadError] = useState("");
  const [isCreating, setIsCreating] = useState(false);
  const [deletingRecordId, setDeletingRecordId] = useState<string | null>(null);

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

  const handleNewForm = async () => {
    setIsCreating(true);
    setLoadError("");

    try {
      const created = await createBlankFormRecord(createForm());
      navigate(`/forms/${created.recordId}`);
    } catch (error) {
      const message = error instanceof Error ? error.message : "Could not create a new form.";
      setLoadError(message);
    } finally {
      setIsCreating(false);
    }
  };

  const handleDeleteForm = async (form: FormSummary) => {
    const shouldDelete = window.confirm(`Delete "${form.title}"? This cannot be undone.`);

    if (!shouldDelete) {
      return;
    }

    setDeletingRecordId(form.recordId);
    setLoadError("");

    try {
      await deleteForm(form.recordId);
      setForms((currentForms) => currentForms.filter((entry) => entry.recordId !== form.recordId));
    } catch (error) {
      const message = error instanceof Error ? error.message : "Could not delete the form.";
      setLoadError(message);
    } finally {
      setDeletingRecordId(null);
    }
  };

  return (
    <main className="route-page route-page--forms">
      <section className="route-page__intro">
        <p className="eyebrow">Step 2</p>
        <h2>Choose a form to edit</h2>
        <p>Create a new form or open an existing one. The editor is on its own route now.</p>
        {loadError ? <p className="status-pill status-pill--error">{loadError}</p> : null}
        {isCreating ? <p className="helper-text">Creating form…</p> : null}
      </section>

      <FormsLibrary
        forms={forms}
        activeRecordId={null}
        isLoading={isLoading}
        deletingRecordId={deletingRecordId}
        onNewForm={() => void handleNewForm()}
        onRefresh={() => void refreshForms()}
        onLoad={(recordId) => navigate(`/forms/${recordId}`)}
        onDelete={(form) => void handleDeleteForm(form)}
      />
    </main>
  );
}
