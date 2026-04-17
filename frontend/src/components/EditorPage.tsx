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
import { useEffect, useMemo, useReducer, useState } from "react";
import { Link, useNavigate, useParams } from "react-router-dom";
import { BlockCard } from "./BlockCard";
import { createForm, validateForm } from "../lib/form-model";
import { formReducer, getInitialFormState } from "../lib/form-reducer";
import { getDropIndicator } from "../lib/dnd";
import { createBlankFormRecord, getForm, saveForm } from "../lib/pocketbase";
import type { NavigationRule, QuestionType, StoredDraft } from "../lib/types";

const LOCAL_STORAGE_KEY = "mini-form-editor-draft";

const getErrorMessage = (error: unknown) => {
  if (error && typeof error === "object" && "message" in error) {
    return String((error as { message: string }).message);
  }

  return "Something went wrong.";
};

const buildDraftKey = (recordId: string) => `${LOCAL_STORAGE_KEY}:${recordId}`;

export function EditorPage() {
  const navigate = useNavigate();
  const { recordId } = useParams();
  const [form, dispatch] = useReducer(formReducer, undefined, getInitialFormState);
  const [activeRecordId, setActiveRecordId] = useState<string | null>(recordId ?? null);
  const [isReady, setIsReady] = useState(false);
  const [isLoading, setIsLoading] = useState(true);
  const [loadError, setLoadError] = useState("");
  const [saveState, setSaveState] = useState<"idle" | "saving" | "saved" | "error">("idle");
  const [saveMessage, setSaveMessage] = useState("Local autosave is active.");
  const [activeBlockId, setActiveBlockId] = useState<UniqueIdentifier | null>(null);
  const [overBlockId, setOverBlockId] = useState<UniqueIdentifier | null>(null);

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
        label: `${index + 1}. ${block.title || "Untitled block"}`,
      })),
    [form.blocks],
  );

  const validationIssues = useMemo(() => validateForm(form), [form]);

  useEffect(() => {
    let isCancelled = false;

    const loadEditor = async () => {
      setIsReady(false);
      setLoadError("");
      setIsLoading(true);

      if (!recordId) {
        if (!isCancelled) {
          setLoadError("No form record was provided.");
          setIsLoading(false);
        }
        return;
      }

      try {
        const nextForm = await getForm(recordId);
        if (!isCancelled) {
          dispatch({
            type: "replace",
            payload: nextForm,
          });
          setActiveRecordId(recordId);
          setSaveState("idle");
          setSaveMessage("Loaded form from PocketBase.");
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

    const draftKey = buildDraftKey(activeRecordId ?? "new");
    window.localStorage.setItem(
      draftKey,
      JSON.stringify({
        recordId: activeRecordId,
        form,
      } satisfies StoredDraft),
    );
    setSaveMessage(`Saved locally at ${new Date().toLocaleTimeString()}`);
  }, [activeRecordId, form, isReady]);

  const handleSave = async () => {
    setSaveState("saving");
    setSaveMessage("Saving form to PocketBase...");

    try {
      const result = await saveForm(form, activeRecordId);
      setActiveRecordId(result.recordId);
      setSaveState("saved");
      setSaveMessage("Saved to PocketBase.");
    } catch (error) {
      setSaveState("error");
      setSaveMessage(getErrorMessage(error));
    }
  };

  const handleNewForm = async () => {
    setSaveState("saving");
    setSaveMessage("Creating a new form in PocketBase...");

    try {
      const created = await createBlankFormRecord(createForm());
      navigate(`/forms/${created.recordId}`);
    } catch (error) {
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
          <p>Edit one form at a time. Blocks, questions, and options can all be reordered with the drag handles.</p>
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
              <button type="button" onClick={() => void handleSave()}>
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
              {form.blocks.map((block, blockIndex) => (
                <BlockCard
                  key={block.id}
                  block={block}
                  index={blockIndex}
                  blockTargets={blockTargets}
                  dropIndicator={getDropIndicator(blockIds, block.id, activeBlockId, overBlockId)}
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
              onSetOtherOptionRule={(questionId, rule) =>
                dispatch({
                  type: "set_other_option_rule",
                  blockId: block.id,
                  questionId,
                  rule,
                })
              }
            />
          ))}
            </div>
          </SortableContext>
        </DndContext>

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
