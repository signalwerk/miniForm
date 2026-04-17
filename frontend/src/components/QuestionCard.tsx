import { useSortable } from "@dnd-kit/sortable";
import { CSS } from "@dnd-kit/utilities";
import { QUESTION_TYPE_OPTIONS, supportsOptionNavigation, supportsOptions } from "../lib/form-model";
import type { DropIndicatorPosition } from "../lib/dnd";
import type { FormQuestion, NavigationRule, QuestionType } from "../lib/types";
import { DragHandle } from "./DragHandle";
import { OptionList } from "./OptionList";

interface BlockTarget {
  id: string;
  label: string;
}

interface QuestionCardProps {
  blockId: string;
  question: FormQuestion;
  index: number;
  blockTargets: BlockTarget[];
  dropIndicator: DropIndicatorPosition;
  onTitleChange: (value: string) => void;
  onDescriptionChange: (value: string) => void;
  onTypeChange: (value: QuestionType) => void;
  onToggle: (field: "required" | "allowOther" | "routeByAnswer", value: boolean) => void;
  onDuplicate: () => void;
  onDelete: () => void;
  onCollapse: () => void;
  onAddOption: () => void;
  onUpdateOption: (optionId: string, value: string) => void;
  onDeleteOption: (optionId: string) => void;
  onMoveOption: (fromIndex: number, toIndex: number) => void;
  onSetOptionRule: (optionId: string, rule: NavigationRule) => void;
}

export function QuestionCard({
  blockId,
  question,
  index,
  blockTargets,
  dropIndicator,
  onTitleChange,
  onDescriptionChange,
  onTypeChange,
  onToggle,
  onDuplicate,
  onDelete,
  onCollapse,
  onAddOption,
  onUpdateOption,
  onDeleteOption,
  onMoveOption,
  onSetOptionRule,
}: QuestionCardProps) {
  const {
    attributes,
    listeners,
    setActivatorNodeRef,
    setNodeRef,
    transform,
    transition,
    isDragging,
  } = useSortable({
    id: question.id,
  });

  const isInformational = question.type === "title_description";
  const canRouteByAnswer = supportsOptionNavigation(question.type);

  return (
    <article
      ref={setNodeRef}
      style={{
        transform: CSS.Transform.toString(transform),
        transition,
      }}
      className={[
        "question-card",
        isDragging ? "question-card--dragging" : "",
        dropIndicator ? `question-card--drop-${dropIndicator}` : "",
      ]
        .filter(Boolean)
        .join(" ")}
    >
      <header className="question-card__header">
        <div className="card-title">
          <DragHandle
            attributes={attributes}
            listeners={listeners}
            setActivatorNodeRef={setActivatorNodeRef}
            label={`Reorder question ${index + 1}`}
          />
          <div>
            <p className="eyebrow">Question {index + 1}</p>
            <h3>{question.title || (isInformational ? "Untitled title" : "Untitled question")}</h3>
          </div>
        </div>

        <div className="question-card__type">
          <label htmlFor={`question-type-${question.id}`}>Type</label>
          <select
            id={`question-type-${question.id}`}
            value={question.type}
            onChange={(event) => onTypeChange(event.target.value as QuestionType)}
          >
            {QUESTION_TYPE_OPTIONS.map((option) => (
              <option key={option.value} value={option.value}>
                {option.label}
              </option>
            ))}
          </select>
        </div>
      </header>

      {!question.isCollapsed ? (
        <div className="question-card__body">
          <div>
            <label htmlFor={`question-title-${question.id}`}>{isInformational ? "Title" : "Prompt"}</label>
            <input
              id={`question-title-${question.id}`}
              type="text"
              value={question.title}
              placeholder={isInformational ? "Add a title" : "Ask your question"}
              onChange={(event) => onTitleChange(event.target.value)}
            />
          </div>

          <div>
            <label htmlFor={`question-description-${question.id}`}>
              {isInformational ? "Description" : "Help text"}
            </label>
            <textarea
              id={`question-description-${question.id}`}
              value={question.description}
              placeholder={
                isInformational
                  ? "Add explanatory text inside this block"
                  : "Optional description for the respondent"
              }
              rows={isInformational ? 4 : 3}
              onChange={(event) => onDescriptionChange(event.target.value)}
            />
          </div>

          {supportsOptions(question.type) ? (
            <OptionList
              question={question}
              blockTargets={blockTargets}
              onAddOption={onAddOption}
              onUpdateOption={onUpdateOption}
              onDeleteOption={onDeleteOption}
              onMoveOption={onMoveOption}
              onSetOptionRule={onSetOptionRule}
            />
          ) : null}

          <footer className="question-card__footer">
            <div className="card-actions">
              <button type="button" className="button button--ghost" onClick={onDuplicate}>
                Duplicate
              </button>
              <button type="button" className="button button--ghost" onClick={onCollapse}>
                {question.isCollapsed ? "Expand" : "Collapse"}
              </button>
              <button type="button" className="button button--ghost button--danger" onClick={onDelete}>
                Delete
              </button>
            </div>

            <div className="toggle-row">
              {!isInformational ? (
                <label className="checkbox">
                  <input
                    type="checkbox"
                    checked={question.required}
                    onChange={(event) => onToggle("required", event.target.checked)}
                  />
                  <span>Required</span>
                </label>
              ) : null}

              {supportsOptions(question.type) ? (
                <label className="checkbox">
                  <input
                    type="checkbox"
                    checked={question.allowOther}
                    onChange={(event) => onToggle("allowOther", event.target.checked)}
                    disabled={question.type === "dropdown"}
                  />
                  <span>Allow “Other”</span>
                </label>
              ) : null}

              {canRouteByAnswer ? (
                <label className="checkbox">
                  <input
                    type="checkbox"
                    checked={question.routeByAnswer}
                    onChange={(event) => onToggle("routeByAnswer", event.target.checked)}
                  />
                  <span>Go to block based on answer</span>
                </label>
              ) : null}

              <p className="helper-text">
                Use the drag handle to reorder questions inside block {blockId.slice(0, 4).toUpperCase()}.
              </p>
            </div>
          </footer>
        </div>
      ) : null}
    </article>
  );
}
