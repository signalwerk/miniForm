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
import { SectionCard } from "./BlockCard";
import { TranslationInput } from "./TranslationInput";
import { FORM_LOCALE_OPTIONS, createForm, validateForm, validateI18nSettings } from "../lib/form-model";
import { formReducer, getInitialFormState } from "../lib/form-reducer";
import { getDropIndicator } from "../lib/dnd";
import { createBlankFormRecord, getForm, saveForm } from "../lib/pocketbase";
import type { BlockType, FormDefinition, NavigationRule, TranslationId } from "../lib/types";

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
  const [activeSectionId, setActiveSectionId] = useState<UniqueIdentifier | null>(null);
  const [overSectionId, setOverSectionId] = useState<UniqueIdentifier | null>(null);
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

  const sectionIds = useMemo(() => form.sections.map((section) => section.id), [form.sections]);
  const sectionTargets = useMemo(
    () =>
      form.sections.map((section, index) => ({
        id: section.id,
        label: `Section ${index + 1}`,
      })),
    [form.sections],
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

  const handleSectionDragEnd = ({ active, over }: DragEndEvent) => {
    setActiveSectionId(null);
    setOverSectionId(null);

    if (!over || active.id === over.id) {
      return;
    }

    const fromIndex = sectionIds.indexOf(String(active.id));
    const toIndex = sectionIds.indexOf(String(over.id));

    dispatch({
      type: "move_section",
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
          <p>Edit one form at a time. Block and option text use per-field language switching.</p>
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
              placeholder="Introduce the form and explain how sections should be used."
              onChange={(event) =>
                dispatch({
                  type: "set_form_field",
                  field: "description",
                  value: event.target.value,
                })
              }
            />
          </div>

          <div>
            <label className="checkbox" htmlFor="form-published">
              <input
                id="form-published"
                type="checkbox"
                checked={form.published}
                onChange={(event) =>
                  dispatch({
                    type: "set_form_published",
                    value: event.target.checked,
                  })
                }
              />
              <span>Published</span>
            </label>
            <p className="helper-text">Published forms can be exposed in the viewer later on.</p>
          </div>

          <section className="handler-settings">
            <div className="panel__header">
              <div>
                <p className="eyebrow">Handlers</p>
                <h3>Form handling</h3>
                <p className="helper-text">Configure what should happen after a submission. Only email is available for now.</p>
              </div>
              <button
                type="button"
                className="button button--secondary"
                onClick={() =>
                  dispatch({
                    type: "add_email_handler",
                  })
                }
              >
                Add email handler
              </button>
            </div>

            {form.settings.handlers.length === 0 ? (
              <div className="empty-state empty-state--subtle">
                <p>No handlers configured yet.</p>
              </div>
            ) : (
              <div className="handler-settings__list">
                {form.settings.handlers.map((handler, index) => (
                  <article key={handler.id} className="handler-settings__card">
                    <div className="handler-settings__header">
                      <div>
                        <p className="eyebrow">Handler {index + 1}</p>
                        <h4>Email</h4>
                      </div>
                      <button
                        type="button"
                        className="button button--ghost button--danger"
                        onClick={() =>
                          dispatch({
                            type: "delete_handler",
                            handlerId: handler.id,
                          })
                        }
                      >
                        Delete
                      </button>
                    </div>

                    <div className="field-grid">
                      <div>
                        <label htmlFor={`handler-to-${handler.id}`}>To</label>
                        <input
                          id={`handler-to-${handler.id}`}
                          type="text"
                          value={handler.to}
                          placeholder="team@example.com"
                          onChange={(event) =>
                            dispatch({
                              type: "update_email_handler",
                              handlerId: handler.id,
                              field: "to",
                              value: event.target.value,
                            })
                          }
                        />
                      </div>

                      <div>
                        <label htmlFor={`handler-subject-${handler.id}`}>Subject</label>
                        <input
                          id={`handler-subject-${handler.id}`}
                          type="text"
                          value={handler.subject}
                          placeholder="New form submission"
                          onChange={(event) =>
                            dispatch({
                              type: "update_email_handler",
                              handlerId: handler.id,
                              field: "subject",
                              value: event.target.value,
                            })
                          }
                        />
                      </div>
                    </div>

                    <div>
                      <label htmlFor={`handler-message-${handler.id}`}>Message</label>
                      <textarea
                        id={`handler-message-${handler.id}`}
                        rows={4}
                        value={handler.message}
                        placeholder="Write the email body that should be used later during form handling."
                        onChange={(event) =>
                          dispatch({
                            type: "update_email_handler",
                            handlerId: handler.id,
                            field: "message",
                            value: event.target.value,
                          })
                        }
                      />
                    </div>
                  </article>
                ))}
              </div>
            )}
          </section>

          <section className="language-settings">
            <div className="panel__header">
              <div>
                <p className="eyebrow">Languages</p>
                <h3>Translations</h3>
                <p className="helper-text">Language ids are generated automatically. Set a label and choose a locale.</p>
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

                  <div className="language-settings__field">
                    <label htmlFor={`language-locale-${language.id}`}>Locale</label>
                    <select
                      id={`language-locale-${language.id}`}
                      value={language.locale}
                      onChange={(event) =>
                        dispatch({
                          type: "update_language_locale",
                          languageId: language.id,
                          locale: event.target.value as (typeof FORM_LOCALE_OPTIONS)[number]["value"],
                        })
                      }
                    >
                      {FORM_LOCALE_OPTIONS.map((locale) => (
                        <option key={locale.value} value={locale.value}>
                          {locale.label}
                        </option>
                      ))}
                    </select>
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
          onDragStart={({ active }: DragStartEvent) => setActiveSectionId(active.id)}
          onDragOver={({ over }) => setOverSectionId(over?.id ?? null)}
          onDragCancel={() => {
            setActiveSectionId(null);
            setOverSectionId(null);
          }}
          onDragEnd={handleSectionDragEnd}
        >
          <SortableContext items={sectionIds} strategy={verticalListSortingStrategy}>
            <div className="block-list">
              {form.sections.length === 0 ? (
                <div className="empty-state">
                  <p className="eyebrow">No sections yet</p>
                  <p>Add a section when you want to start structuring the form flow.</p>
                </div>
              ) : (
                form.sections.map((section, sectionIndex) => (
                  <SectionCard
                    key={section.id}
                    section={section}
                    index={sectionIndex}
                    sectionTargets={sectionTargets}
                    dropIndicator={getDropIndicator(sectionIds, section.id, activeSectionId, overSectionId)}
                    languages={form.i18n.languages}
                    defaultLanguage={form.i18n.defaultLanguage}
                    translations={form.translations}
                    onDeleteSection={() =>
                      dispatch({
                        type: "delete_section",
                        sectionId: section.id,
                      })
                    }
                    onDuplicateSection={() =>
                      dispatch({
                        type: "duplicate_section",
                        sectionId: section.id,
                      })
                    }
                    onToggleSection={() =>
                      dispatch({
                        type: "toggle_section",
                        sectionId: section.id,
                      })
                    }
                    onBlockMove={(fromIndex, toIndex) =>
                      dispatch({
                        type: "move_block",
                        sectionId: section.id,
                        fromIndex,
                        toIndex,
                      })
                    }
                    onAddBlock={(blockType?: BlockType) =>
                      dispatch({
                        type: "add_block",
                        sectionId: section.id,
                        blockType,
                      })
                    }
                    onUpdateTranslation={(translationId: TranslationId, languageId: string, value: string) =>
                      dispatch({
                        type: "update_translation",
                        translationId,
                        languageId,
                        value,
                      })
                    }
                    onBlockTypeChange={(blockId, blockType) =>
                      dispatch({
                        type: "set_block_type",
                        sectionId: section.id,
                        blockId,
                        blockType,
                      })
                    }
                    onBlockToggle={(blockId, field, value) =>
                      dispatch({
                        type: "set_block_toggle",
                        sectionId: section.id,
                        blockId,
                        field,
                        value,
                      })
                    }
                    onDeleteBlock={(blockId) =>
                      dispatch({
                        type: "delete_block",
                        sectionId: section.id,
                        blockId,
                      })
                    }
                    onDuplicateBlock={(blockId) =>
                      dispatch({
                        type: "duplicate_block",
                        sectionId: section.id,
                        blockId,
                      })
                    }
                    onToggleBlock={(blockId) =>
                      dispatch({
                        type: "toggle_block",
                        sectionId: section.id,
                        blockId,
                      })
                    }
                    onSetSectionRule={(rule: NavigationRule) =>
                      dispatch({
                        type: "set_section_rule",
                        sectionId: section.id,
                        rule,
                      })
                    }
                    onAddOption={(blockId) =>
                      dispatch({
                        type: "add_option",
                        sectionId: section.id,
                        blockId,
                      })
                    }
                    onDeleteOption={(blockId, optionId) =>
                      dispatch({
                        type: "delete_option",
                        sectionId: section.id,
                        blockId,
                        optionId,
                      })
                    }
                    onMoveOption={(blockId, fromIndex, toIndex) =>
                      dispatch({
                        type: "move_option",
                        sectionId: section.id,
                        blockId,
                        fromIndex,
                        toIndex,
                      })
                    }
                    onSetOptionRule={(blockId, optionId, rule) =>
                      dispatch({
                        type: "set_option_rule",
                        sectionId: section.id,
                        blockId,
                        optionId,
                        rule,
                      })
                    }
                    onSetOtherOptionRule={(blockId, rule) =>
                      dispatch({
                        type: "set_other_option_rule",
                        sectionId: section.id,
                        blockId,
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
              type: "add_section",
            })
          }
        >
          Add section
        </button>

        <section className="panel">
          <div className="panel__header">
            <div>
              <p className="eyebrow">End</p>
              <h2>Thank you page</h2>
              <p className="helper-text">This confirmation step is always shown after the form has been submitted.</p>
            </div>
          </div>

          <TranslationInput
            id="form-confirmation-content"
            label="Confirmation content"
            translationId={form.confirmation.content}
            translations={form.translations}
            languages={form.i18n.languages}
            defaultLanguage={form.i18n.defaultLanguage}
            placeholder="Thank you for your submission."
            multiline
            rows={5}
            onChange={(translationId: TranslationId, languageId: string, value: string) =>
              dispatch({
                type: "update_translation",
                translationId,
                languageId,
                value,
              })
            }
          />
        </section>
      </section>
    </main>
  );
}
