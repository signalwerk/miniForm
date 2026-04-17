import { QUESTION_TYPE_OPTIONS, supportsOptions } from "../lib/form-model";
import type { FormQuestion, NavigationRule, QuestionType } from "../lib/types";
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
  onTitleChange: (value: string) => void;
  onDescriptionChange: (value: string) => void;
  onTypeChange: (value: QuestionType) => void;
  onToggle: (field: "required" | "allowOther", value: boolean) => void;
  onDuplicate: () => void;
  onDelete: () => void;
  onCollapse: () => void;
  onMove: (fromIndex: number, toIndex: number) => void;
  onDragStart: () => void;
  onDrop: () => void;
  onDragOver: () => void;
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
  onTitleChange,
  onDescriptionChange,
  onTypeChange,
  onToggle,
  onDuplicate,
  onDelete,
  onCollapse,
  onMove,
  onDragStart,
  onDrop,
  onDragOver,
  onAddOption,
  onUpdateOption,
  onDeleteOption,
  onMoveOption,
  onSetOptionRule,
}: QuestionCardProps) {
  return (
    <article
      className="question-card"
      draggable
      onDragStart={onDragStart}
      onDragOver={(event) => {
        event.preventDefault();
        onDragOver();
      }}
      onDrop={(event) => {
        event.preventDefault();
        onDrop();
      }}
    >
      <header className="question-card__header">
        <div>
          <p className="eyebrow">Question {index + 1}</p>
          <h3>{question.title || "Untitled question"}</h3>
        </div>

        <div className="card-actions">
          <button
            type="button"
            className="button button--ghost"
            onClick={() => onMove(index, index - 1)}
            disabled={index === 0}
          >
            Move up
          </button>
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
      </header>

      {!question.isCollapsed ? (
        <div className="question-card__body">
          <div className="field-grid">
            <div>
              <label htmlFor={`question-title-${question.id}`}>Prompt</label>
              <input
                id={`question-title-${question.id}`}
                type="text"
                value={question.title}
                placeholder="Ask your question"
                onChange={(event) => onTitleChange(event.target.value)}
              />
            </div>

            <div>
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
          </div>

          <div>
            <label htmlFor={`question-description-${question.id}`}>Help text</label>
            <textarea
              id={`question-description-${question.id}`}
              value={question.description}
              placeholder="Optional description for the respondent"
              rows={3}
              onChange={(event) => onDescriptionChange(event.target.value)}
            />
          </div>

          <div className="toggle-row">
            <label className="checkbox">
              <input
                type="checkbox"
                checked={question.required}
                onChange={(event) => onToggle("required", event.target.checked)}
              />
              <span>Required</span>
            </label>

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

            <p className="helper-text">
              Drag this card to reorder it inside block {blockId.slice(0, 4).toUpperCase()}.
            </p>
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
        </div>
      ) : null}
    </article>
  );
}
