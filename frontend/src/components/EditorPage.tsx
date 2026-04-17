import { useEffect, useMemo, useReducer, useState } from "react";
import type { ClientResponseError } from "pocketbase";
import { BlockCard } from "./BlockCard";
import { AuthPanel } from "./AuthPanel";
import { FormsLibrary } from "./FormsLibrary";
import { createForm, normalizeForm, validateForm } from "../lib/form-model";
import { formReducer, getInitialFormState } from "../lib/form-reducer";
import { getCurrentUser, getForm, listForms, loginUser, logoutUser, pb, registerUser, saveForm } from "../lib/pocketbase";
import type { FormSummary, NavigationRule, QuestionType, StoredDraft } from "../lib/types";

const LOCAL_STORAGE_KEY = "mini-form-editor-draft";

const readDraft = (): StoredDraft => {
  if (typeof window === "undefined") {
    return { recordId: null, form: getInitialFormState() };
  }

  const raw = window.localStorage.getItem(LOCAL_STORAGE_KEY);
  if (!raw) {
    return { recordId: null, form: getInitialFormState() };
  }

  try {
    return JSON.parse(raw) as StoredDraft;
  } catch {
    return { recordId: null, form: getInitialFormState() };
  }
};

const getErrorMessage = (error: unknown) => {
  if (error && typeof error === "object" && "message" in error) {
    return String((error as { message: string }).message);
  }

  return "Something went wrong.";
};

export function EditorPage() {
  const initialDraft = readDraft();
  const [form, dispatch] = useReducer(formReducer, initialDraft.form, normalizeForm);
  const [activeRecordId, setActiveRecordId] = useState<string | null>(initialDraft.recordId);
  const [forms, setForms] = useState<FormSummary[]>([]);
  const [isLibraryLoading, setIsLibraryLoading] = useState(false);
  const [authModel, setAuthModel] = useState(getCurrentUser());
  const [authBusy, setAuthBusy] = useState(false);
  const [authError, setAuthError] = useState("");
  const [saveState, setSaveState] = useState<"idle" | "saving" | "saved" | "error">("idle");
  const [saveMessage, setSaveMessage] = useState("Local autosave is active.");
  const [draggedBlockId, setDraggedBlockId] = useState<string | null>(null);
  const [draggedQuestionId, setDraggedQuestionId] = useState<string | null>(null);

  const blockTargets = useMemo(
    () =>
      form.blocks.map((block, index) => ({
        id: block.id,
        label: `${index + 1}. ${block.title || "Untitled block"}`,
      })),
    [form.blocks],
  );

  const validationIssues = useMemo(() => validateForm(form), [form]);

  useEffect(() => {
    window.localStorage.setItem(
      LOCAL_STORAGE_KEY,
      JSON.stringify({
        recordId: activeRecordId,
        form,
      } satisfies StoredDraft),
    );
    setSaveMessage(`Saved locally at ${new Date().toLocaleTimeString()}`);
  }, [activeRecordId, form]);

  useEffect(() => {
    const unsubscribe = pb.authStore.onChange(() => {
      setAuthModel(getCurrentUser());
    });

    return () => unsubscribe();
  }, []);

  useEffect(() => {
    if (!authModel) {
      setForms([]);
      return;
    }

    void refreshForms();
  }, [authModel]);

  const refreshForms = async () => {
    if (!getCurrentUser()) {
      return;
    }

    setIsLibraryLoading(true);
    try {
      const nextForms = await listForms();
      setForms(nextForms);
    } finally {
      setIsLibraryLoading(false);
    }
  };

  const handleSave = async () => {
    setSaveState("saving");
    setSaveMessage("Saving form to PocketBase...");

    try {
      const result = await saveForm(form, activeRecordId);
      setActiveRecordId(result.recordId);
      setSaveState("saved");
      setSaveMessage("Saved to PocketBase.");
      await refreshForms();
    } catch (error) {
      setSaveState("error");
      setSaveMessage(getErrorMessage(error));
    }
  };

  const handleNewForm = () => {
    dispatch({ type: "replace", payload: createForm() });
    setActiveRecordId(null);
    setSaveState("idle");
    setSaveMessage("Started a fresh local draft.");
  };

  const handleLoadForm = async (recordId: string) => {
    setSaveMessage("Loading form from PocketBase...");

    try {
      const nextForm = await getForm(recordId);
      dispatch({ type: "replace", payload: nextForm });
      setActiveRecordId(recordId);
      setSaveMessage("Loaded saved form.");
      setSaveState("idle");
    } catch (error) {
      setSaveState("error");
      setSaveMessage(getErrorMessage(error));
    }
  };

  const handleAuthAction = async (callback: () => Promise<void>) => {
    setAuthBusy(true);
    setAuthError("");

    try {
      await callback();
    } catch (error) {
      const responseError = error as ClientResponseError;
      setAuthError(responseError.response?.message || getErrorMessage(error));
    } finally {
      setAuthBusy(false);
    }
  };

  const saveStateClassName =
    saveState === "error"
      ? "status-pill status-pill--error"
      : saveState === "saved"
        ? "status-pill status-pill--ok"
        : "status-pill";

  return (
    <main className="editor-layout">
      <aside className="editor-layout__sidebar">
        <AuthPanel
          authModel={authModel}
          authBusy={authBusy}
          authError={authError}
          pocketbaseUrl={pb.baseURL}
          onLogin={(payload) => handleAuthAction(() => loginUser(payload))}
          onRegister={(payload) => handleAuthAction(() => registerUser(payload))}
          onLogout={() => {
            logoutUser();
            setActiveRecordId(null);
          }}
        />

        <FormsLibrary
          forms={forms}
          activeRecordId={activeRecordId}
          isLoading={isLibraryLoading}
          onNewForm={handleNewForm}
          onRefresh={() => void refreshForms()}
          onLoad={(recordId) => void handleLoadForm(recordId)}
        />

        <aside className="panel">
          <div className="panel__header">
            <div>
              <p className="eyebrow">Validation</p>
              <h2>Flow health</h2>
            </div>
          </div>
          {validationIssues.length === 0 ? (
            <p className="status-pill status-pill--ok">No broken block references.</p>
          ) : (
            <ul className="issue-list">
              {validationIssues.map((issue) => (
                <li key={issue}>{issue}</li>
              ))}
            </ul>
          )}
        </aside>
      </aside>

      <section className="editor-layout__main">
        <section className="panel panel--hero">
          <div className="panel__header">
            <div>
              <p className="eyebrow">Editor</p>
              <h2>Form settings</h2>
            </div>

            <div className="button-group">
              <button type="button" className="button button--secondary" onClick={handleNewForm}>
                New form
              </button>
              <button type="button" onClick={() => void handleSave()} disabled={!authModel}>
                Save to PocketBase
              </button>
            </div>
          </div>

          <div className="field-grid">
            <div>
              <label htmlFor="form-title">Form title</label>
              <input
                id="form-title"
                type="text"
                value={form.title}
                onChange={(event) =>
                  dispatch({
                    type: "set_form_field",
                    field: "title",
                    value: event.target.value,
                  })
                }
              />
            </div>
          </div>

          <div>
            <label htmlFor="form-description">Form description</label>
            <textarea
              id="form-description"
              rows={4}
              value={form.description}
              placeholder="Introduce the form and explain how blocks should be used."
              onChange={(event) =>
                dispatch({
                  type: "set_form_field",
                  field: "description",
                  value: event.target.value,
                })
              }
            />
          </div>

          <div className="meta-row">
            <p className={saveStateClassName}>{saveMessage}</p>
            <p className="helper-text">
              Form ID <code>{form.id}</code>
            </p>
          </div>
        </section>

        <div className="block-list">
          {form.blocks.map((block, blockIndex) => (
            <BlockCard
              key={block.id}
              block={block}
              index={blockIndex}
              blockTargets={blockTargets}
              onUpdateBlock={(patch) =>
                dispatch({
                  type: "update_block",
                  blockId: block.id,
                  patch,
                })
              }
              onDeleteBlock={() =>
                dispatch({
                  type: "delete_block",
                  blockId: block.id,
                })
              }
              onDuplicateBlock={() =>
                dispatch({
                  type: "duplicate_block",
                  blockId: block.id,
                })
              }
              onToggleBlock={() =>
                dispatch({
                  type: "toggle_block",
                  blockId: block.id,
                })
              }
              onMoveBlock={(fromIndex, toIndex) =>
                dispatch({
                  type: "move_block",
                  fromIndex,
                  toIndex,
                })
              }
              onBlockDragStart={() => setDraggedBlockId(block.id)}
              onBlockDrop={() => {
                if (!draggedBlockId || draggedBlockId === block.id) {
                  return;
                }

                const fromIndex = form.blocks.findIndex((item) => item.id === draggedBlockId);
                const toIndex = form.blocks.findIndex((item) => item.id === block.id);
                dispatch({ type: "move_block", fromIndex, toIndex });
                setDraggedBlockId(null);
              }}
              onQuestionMove={(fromIndex, toIndex) =>
                dispatch({
                  type: "move_question",
                  blockId: block.id,
                  fromIndex,
                  toIndex,
                })
              }
              onQuestionDragStart={(questionId) => setDraggedQuestionId(questionId)}
              onQuestionDrop={(questionId) => {
                if (!draggedQuestionId || draggedQuestionId === questionId) {
                  return;
                }

                const fromIndex = block.questions.findIndex((item) => item.id === draggedQuestionId);
                const toIndex = block.questions.findIndex((item) => item.id === questionId);
                dispatch({
                  type: "move_question",
                  blockId: block.id,
                  fromIndex,
                  toIndex,
                });
                setDraggedQuestionId(null);
              }}
              onAddQuestion={(questionType?: QuestionType) =>
                dispatch({
                  type: "add_question",
                  blockId: block.id,
                  questionType,
                })
              }
              onQuestionFieldChange={(questionId, field, value) =>
                dispatch({
                  type: "update_question_field",
                  blockId: block.id,
                  questionId,
                  field,
                  value,
                })
              }
              onQuestionTypeChange={(questionId, questionType) =>
                dispatch({
                  type: "set_question_type",
                  blockId: block.id,
                  questionId,
                  questionType,
                })
              }
              onQuestionToggle={(questionId, field, value) =>
                dispatch({
                  type: "set_question_toggle",
                  blockId: block.id,
                  questionId,
                  field,
                  value,
                })
              }
              onDeleteQuestion={(questionId) =>
                dispatch({
                  type: "delete_question",
                  blockId: block.id,
                  questionId,
                })
              }
              onDuplicateQuestion={(questionId) =>
                dispatch({
                  type: "duplicate_question",
                  blockId: block.id,
                  questionId,
                })
              }
              onToggleQuestion={(questionId) =>
                dispatch({
                  type: "toggle_question",
                  blockId: block.id,
                  questionId,
                })
              }
              onSetBlockRule={(rule: NavigationRule) =>
                dispatch({
                  type: "set_block_rule",
                  blockId: block.id,
                  rule,
                })
              }
              onAddOption={(questionId) =>
                dispatch({
                  type: "add_option",
                  blockId: block.id,
                  questionId,
                })
              }
              onUpdateOption={(questionId, optionId, value) =>
                dispatch({
                  type: "update_option",
                  blockId: block.id,
                  questionId,
                  optionId,
                  value,
                })
              }
              onDeleteOption={(questionId, optionId) =>
                dispatch({
                  type: "delete_option",
                  blockId: block.id,
                  questionId,
                  optionId,
                })
              }
              onMoveOption={(questionId, fromIndex, toIndex) =>
                dispatch({
                  type: "move_option",
                  blockId: block.id,
                  questionId,
                  fromIndex,
                  toIndex,
                })
              }
              onSetOptionRule={(questionId, optionId, rule) =>
                dispatch({
                  type: "set_option_rule",
                  blockId: block.id,
                  questionId,
                  optionId,
                  rule,
                })
              }
            />
          ))}
        </div>

        <div className="add-row">
          <span className="eyebrow">Form structure</span>
          <div className="button-group">
            <button
              type="button"
              className="button button--secondary"
              onClick={() => dispatch({ type: "add_block" })}
            >
              Add block
            </button>
          </div>
        </div>
      </section>
    </main>
  );
}
