import {
  DndContext,
  PointerSensor,
  closestCenter,
  type DragEndEvent,
  type DragStartEvent,
  type UniqueIdentifier,
  useSensor,
  useSensors,
} from "@dnd-kit/core";
import { SortableContext, verticalListSortingStrategy } from "@dnd-kit/sortable";
import { useEffect, useMemo, useReducer, useRef, useState } from "react";
import { Link, useBeforeUnload, useBlocker, useNavigate, useParams } from "react-router-dom";
import { BlockCard } from "./BlockCard";
import { createForm, validateForm, validateI18nSettings } from "../lib/form-model";
import { formReducer, getInitialFormState } from "../lib/form-reducer";
import { getDropIndicator } from "../lib/dnd";
import { createBlankFormRecord, getForm, saveForm } from "../lib/pocketbase";
import type { FormDefinition, NavigationRule, QuestionType, TranslationKey } from "../lib/types";

const getErrorMessage = (error: unknown) => {
  if (error && typeof error === "object" && "message" in error) {
    return String((error as { message: string }).message);
  }

  return "Something went wrong.";
};

export function EditorPage() {
  const navigate = useNavigate();
  const { recordId } = useParams();
  const [form, dispatch] = useReducer(formReducer, undefined, getInitialFormState);
  const [activeRecordId, setActiveRecordId] = useState<string | null>(recordId ?? null);
  const [isReady, setIsReady] = useState(false);
  const [isLoading, setIsLoading] = useState(true);
  const [loadError, setLoadError] = useState("");
  const [saveState, setSaveState] = useState<"idle" | "dirty" | "saving" | "saved" | "error">("idle");
  const [saveMessage, setSaveMessage] = useState("Autosave to PocketBase is active.");
  const [hasPendingChanges, setHasPendingChanges] = useState(false);
  const [activeBlockId, setActiveBlockId] = useState<UniqueIdentifier | null>(null);
  const [overBlockId, setOverBlockId] = useState<UniqueIdentifier | null>(null);
  const saveTimeoutRef = useRef<number | null>(null);
  const latestFormRef = useRef<FormDefinition>(form);
  const latestSnapshotRef = useRef(JSON.stringify(form));
  const lastSavedSnapshotRef = useRef(JSON.stringify(form));
  const queuedSaveRef = useRef<{ form: FormDefinition; snapshot: string } | null>(null);
  const isSavingRef = useRef(false);
  const skipNavigationWarningRef = useRef(false);

  const sensors = useSensors(
    useSensor(PointerSensor, {
      activationConstraint: {
        distance: 6,
      },
    }),
  );

  const blockIds = useMemo(() => form.blocks.map((block) => block.id), [form.blocks]);
  const blockTargets = useMemo(
    () =>
      form.blocks.map((block, index) => ({
        id: block.id,
        label: `Block ${index + 1}`,
      })),
    [form.blocks],
  );

  const i18nIssues = useMemo(() => validateI18nSettings(form), [form]);
  const validationIssues = useMemo(() => validateForm(form), [form]);
  const blocker = useBlocker(() => hasPendingChanges && !skipNavigationWarningRef.current);

  const flushAutosave = async (formToSave: FormDefinition, snapshot: string) => {
    if (!activeRecordId) {
      return;
    }

    if (snapshot === lastSavedSnapshotRef.current) {
      setHasPendingChanges(false);
      setSaveState("saved");
      setSaveMessage("All changes saved to PocketBase.");
      return;
    }

    if (i18nIssues.length > 0) {
      setHasPendingChanges(true);
      setSaveState("error");
      setSaveMessage("Autosave paused. Fix the language settings before saving.");
      return;
    }

    if (isSavingRef.current) {
      queuedSaveRef.current = { form: formToSave, snapshot };
      return;
    }

    isSavingRef.current = true;
    setSaveState("saving");
    setSaveMessage("Autosaving to PocketBase...");

    try {
      const result = await saveForm(formToSave, activeRecordId);
      setActiveRecordId(result.recordId);
      lastSavedSnapshotRef.current = snapshot;

      if (queuedSaveRef.current && queuedSaveRef.current.snapshot !== snapshot) {
        const nextSave = queuedSaveRef.current;
        queuedSaveRef.current = null;
        isSavingRef.current = false;
        await flushAutosave(nextSave.form, nextSave.snapshot);
        return;
      }

      queuedSaveRef.current = null;
      isSavingRef.current = false;

      const stillDirty = latestSnapshotRef.current !== lastSavedSnapshotRef.current;
      setHasPendingChanges(stillDirty);
      setSaveState(stillDirty ? "dirty" : "saved");
      setSaveMessage(stillDirty ? "Changes pending autosave..." : "All changes saved to PocketBase.");
    } catch (error) {
      isSavingRef.current = false;
      setHasPendingChanges(true);
      setSaveState("error");
      setSaveMessage(`Autosave failed. ${getErrorMessage(error)}`);
    }
  };

  useEffect(() => {
    let isCancelled = false;

    const loadEditor = async () => {
      setIsReady(false);
      setLoadError("");
      setIsLoading(true);
      setHasPendingChanges(false);

      if (saveTimeoutRef.current !== null) {
        window.clearTimeout(saveTimeoutRef.current);
        saveTimeoutRef.current = null;
      }

      queuedSaveRef.current = null;
      isSavingRef.current = false;
      skipNavigationWarningRef.current = false;

      if (!recordId) {
        if (!isCancelled) {
          setLoadError("No form record was provided.");
          setIsLoading(false);
        }
        return;
      }

      try {
        const nextForm = await getForm(recordId);
        const snapshot = JSON.stringify(nextForm);

        if (!isCancelled) {
          dispatch({
            type: "replace",
            payload: nextForm,
          });
          latestFormRef.current = nextForm;
          latestSnapshotRef.current = snapshot;
          lastSavedSnapshotRef.current = snapshot;
          setActiveRecordId(recordId);
          setSaveState("saved");
          setSaveMessage("All changes saved to PocketBase.");
          setIsLoading(false);
          setIsReady(true);
        }
      } catch (error) {
        if (!isCancelled) {
          setLoadError(getErrorMessage(error));
          setIsLoading(false);
        }
      }
    };

    void loadEditor();

    return () => {
      isCancelled = true;
    };
  }, [recordId]);

  useEffect(() => {
    if (!isReady) {
      return;
    }

    const snapshot = JSON.stringify(form);
    latestFormRef.current = form;
    latestSnapshotRef.current = snapshot;

    if (snapshot === lastSavedSnapshotRef.current) {
      if (!isSavingRef.current && queuedSaveRef.current === null) {
        setHasPendingChanges(false);
        setSaveState("saved");
        setSaveMessage("All changes saved to PocketBase.");
      }

      return;
    }

    setHasPendingChanges(true);

    if (i18nIssues.length > 0) {
      if (saveTimeoutRef.current !== null) {
        window.clearTimeout(saveTimeoutRef.current);
        saveTimeoutRef.current = null;
      }

      setSaveState("error");
      setSaveMessage("Autosave paused. Fix the language settings before saving.");
      return;
    }

    setSaveState((current) => (current === "saving" ? current : "dirty"));
    setSaveMessage("Changes pending autosave...");

    if (saveTimeoutRef.current !== null) {
      window.clearTimeout(saveTimeoutRef.current);
    }

    saveTimeoutRef.current = window.setTimeout(() => {
      saveTimeoutRef.current = null;
      void flushAutosave(latestFormRef.current, latestSnapshotRef.current);
    }, 900);

    return () => {
      if (saveTimeoutRef.current !== null) {
        window.clearTimeout(saveTimeoutRef.current);
        saveTimeoutRef.current = null;
      }
    };
  }, [activeRecordId, form, i18nIssues, isReady]);

  useBeforeUnload((event) => {
    if (!hasPendingChanges) {
      return;
    }

    event.preventDefault();
    event.returnValue = "";
  });

  useEffect(() => {
    if (blocker.state !== "blocked") {
      return;
    }

    const shouldLeave = window.confirm(
      "This form still has changes that have not been saved to PocketBase. Leave the editor anyway?",
    );

    if (shouldLeave) {
      blocker.proceed();
      return;
    }

    blocker.reset();
  }, [blocker]);

  const handleNewForm = async () => {
    if (hasPendingChanges) {
      const shouldContinue = window.confirm(
        "This form still has changes that have not been saved to PocketBase. Create a new form and leave anyway?",
      );

      if (!shouldContinue) {
        return;
      }
    }

    skipNavigationWarningRef.current = true;
    setSaveState("saving");
    setSaveMessage("Creating a new form in PocketBase...");

    try {
      const created = await createBlankFormRecord(createForm());
      navigate(`/forms/${created.recordId}`);
    } catch (error) {
      skipNavigationWarningRef.current = false;
      setSaveState("error");
      setSaveMessage(getErrorMessage(error));
    }
  };

  const handleBlockDragEnd = ({ active, over }: DragEndEvent) => {
    setActiveBlockId(null);
    setOverBlockId(null);

    if (!over || active.id === over.id) {
      return;
    }

    const fromIndex = blockIds.indexOf(String(active.id));
    const toIndex = blockIds.indexOf(String(over.id));

    dispatch({
      type: "move_block",
      fromIndex,
      toIndex,
    });
  };

  const saveStateClassName =
    saveState === "error"
      ? "status-pill status-pill--error"
      : saveState === "saved"
        ? "status-pill status-pill--ok"
        : "status-pill";

  if (isLoading) {
    return (
      <main className="route-page">
        <section className="panel">
          <p className="eyebrow">Step 3</p>
          <h2>Loading editor</h2>
          <p>Fetching the form from PocketBase…</p>
        </section>
      </main>
    );
  }

  if (loadError) {
    return (
      <main className="route-page">
        <section className="panel">
          <p className="eyebrow">Step 3</p>
          <h2>Could not open the form</h2>
          <p className="status-pill status-pill--error">{loadError}</p>
          <p>
            <Link className="text-link" to="/forms">
              Back to forms overview
            </Link>
          </p>
        </section>
      </main>
    );
  }

  return (
    <main className="editor-layout">
      <aside className="editor-layout__sidebar">
        <section className="panel">
          <p className="eyebrow">Step 3</p>
          <h2>Form editor</h2>
          <p>Edit one form at a time. Question and option text now use per-field language switching.</p>
          <div className="button-group">
            <Link className="app-nav__link" to="/forms">
              Back to forms
            </Link>
            <button type="button" className="button button--secondary" onClick={() => void handleNewForm()}>
              New form
            </button>
          </div>
        </section>

        <section className="panel">
          <div className="panel__header">
            <div>
              <p className="eyebrow">Validation</p>
              <h2>Flow and languages</h2>
            </div>
          </div>
          {validationIssues.length === 0 ? (
            <p className="status-pill status-pill--ok">Everything is valid for autosave.</p>
          ) : (
            <ul className="issue-list">
              {validationIssues.map((issue) => (
                <li key={issue}>{issue}</li>
              ))}
            </ul>
          )}
        </section>
      </aside>

      <section className="editor-layout__main">
        <section className="panel panel--hero">
          <div className="panel__header">
            <div>
              <p className="eyebrow">Form settings</p>
              <h2>{form.title || "Untitled form"}</h2>
            </div>

            <div className="button-group">
              <button type="button" className="button button--secondary" onClick={() => void handleNewForm()}>
                New form
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
                placeholder="Form title"
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

          <section className="language-settings">
            <div className="panel__header">
              <div>
                <p className="eyebrow">Languages</p>
                <h3>Translations</h3>
                <p className="helper-text">Language ids are generated automatically. Only the label is editable.</p>
              </div>
              <button
                type="button"
                className="button button--secondary"
                onClick={() =>
                  dispatch({
                    type: "add_language",
                  })
                }
              >
                Add language
              </button>
            </div>

            <div className="language-settings__list">
              {form.i18n.languages.map((language) => (
                <div key={language.id} className="language-settings__row">
                  <div className="language-settings__field">
                    <label htmlFor={`language-label-${language.id}`}>Label</label>
                    <input
                      id={`language-label-${language.id}`}
                      type="text"
                      value={language.label}
                      placeholder="English"
                      onChange={(event) =>
                        dispatch({
                          type: "update_language_label",
                          languageId: language.id,
                          label: event.target.value,
                        })
                      }
                    />
                  </div>

                  <div className="language-settings__default">
                    <label className="checkbox">
                      <input
                        type="radio"
                        name="default-language"
                        checked={form.i18n.defaultLanguage === language.id}
                        onChange={() =>
                          dispatch({
                            type: "set_default_language",
                            languageId: language.id,
                          })
                        }
                      />
                      <span>Default</span>
                    </label>
                  </div>

                  <button
                    type="button"
                    className="button button--ghost button--danger"
                    disabled={form.i18n.languages.length <= 1}
                    onClick={() =>
                      dispatch({
                        type: "delete_language",
                        languageId: language.id,
                      })
                    }
                  >
                    Delete
                  </button>
                </div>
              ))}
            </div>
          </section>

          <div className="meta-row">
            <p className={saveStateClassName}>{saveMessage}</p>
            <p className="helper-text">
              Record ID <code>{activeRecordId ?? "Unavailable"}</code>
            </p>
          </div>
        </section>

        <DndContext
          sensors={sensors}
          collisionDetection={closestCenter}
          onDragStart={({ active }: DragStartEvent) => setActiveBlockId(active.id)}
          onDragOver={({ over }) => setOverBlockId(over?.id ?? null)}
          onDragCancel={() => {
            setActiveBlockId(null);
            setOverBlockId(null);
          }}
          onDragEnd={handleBlockDragEnd}
        >
          <SortableContext items={blockIds} strategy={verticalListSortingStrategy}>
            <div className="block-list">
              {form.blocks.length === 0 ? (
                <div className="empty-state">
                  <p className="eyebrow">No blocks yet</p>
                  <p>Add a block when you want to start structuring the form flow.</p>
                </div>
              ) : (
                form.blocks.map((block, blockIndex) => (
                  <BlockCard
                    key={block.id}
                    block={block}
                    index={blockIndex}
                    blockTargets={blockTargets}
                    dropIndicator={getDropIndicator(blockIds, block.id, activeBlockId, overBlockId)}
                    languages={form.i18n.languages}
                    defaultLanguage={form.i18n.defaultLanguage}
                    translations={form.translations}
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
                    onQuestionMove={(fromIndex, toIndex) =>
                      dispatch({
                        type: "move_question",
                        blockId: block.id,
                        fromIndex,
                        toIndex,
                      })
                    }
                    onAddQuestion={(questionType?: QuestionType) =>
                      dispatch({
                        type: "add_question",
                        blockId: block.id,
                        questionType,
                      })
                    }
                    onUpdateTranslation={(translationKey: TranslationKey, languageId: string, value: string) =>
                      dispatch({
                        type: "update_translation",
                        translationKey,
                        languageId,
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
                    onSetOtherOptionRule={(questionId, rule) =>
                      dispatch({
                        type: "set_other_option_rule",
                        blockId: block.id,
                        questionId,
                        rule,
                      })
                    }
                  />
                ))
              )}
            </div>
          </SortableContext>
        </DndContext>

        <button
          type="button"
          className="button button--secondary"
          onClick={() =>
            dispatch({
              type: "add_block",
            })
          }
        >
          Add block
        </button>
      </section>
    </main>
  );
}
