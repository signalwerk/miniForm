import { useSortable } from "@dnd-kit/sortable";
import { CSS } from "@dnd-kit/utilities";
import {
  QUESTION_TYPE_OPTIONS,
  getTranslationValue,
  isChoiceQuestion,
  isSingleChoiceQuestion,
  isTextQuestion,
  isTitleDescriptionQuestion,
} from "../lib/form-model";
import type { DropIndicatorPosition } from "../lib/dnd";
import type {
  FormLanguage,
  FormQuestion,
  FormTranslations,
  NavigationRule,
  QuestionType,
  TranslationKey,
} from "../lib/types";
import { DragHandle } from "./DragHandle";
import { OptionList } from "./OptionList";
import { TranslationInput } from "./TranslationInput";

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
  languages: FormLanguage[];
  defaultLanguage: string;
  translations: FormTranslations;
  onUpdateTranslation: (translationKey: TranslationKey, languageId: string, value: string) => void;
  onTypeChange: (value: QuestionType) => void;
  onToggle: (
    field: "required" | "multilineText" | "showAsDropdown" | "allowOther" | "routeByAnswer",
    value: boolean,
  ) => void;
  onDuplicate: () => void;
  onDelete: () => void;
  onCollapse: () => void;
  onAddOption: () => void;
  onDeleteOption: (optionId: string) => void;
  onMoveOption: (fromIndex: number, toIndex: number) => void;
  onSetOptionRule: (optionId: string, rule: NavigationRule) => void;
  onSetOtherOptionRule: (rule: NavigationRule) => void;
}

export function QuestionCard({
  blockId,
  question,
  index,
  blockTargets,
  dropIndicator,
  languages,
  defaultLanguage,
  translations,
  onUpdateTranslation,
  onTypeChange,
  onToggle,
  onDuplicate,
  onDelete,
  onCollapse,
  onAddOption,
  onDeleteOption,
  onMoveOption,
  onSetOptionRule,
  onSetOtherOptionRule,
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

  const isInformational = isTitleDescriptionQuestion(question);
  const canRouteByAnswer = isSingleChoiceQuestion(question);
  const isText = isTextQuestion(question);
  const isSingleChoice = isSingleChoiceQuestion(question);
  const questionTitle = getTranslationValue(translations, question.title, defaultLanguage);

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
            <h3>{questionTitle || (isInformational ? "Untitled title" : "Untitled question")}</h3>
          </div>
        </div>

        <div className="question-card__controls">
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
        </div>
      </header>

      {!question.isCollapsed ? (
        <div className="question-card__body">
          <TranslationInput
            id={`question-title-${question.id}`}
            label={isInformational ? "Title" : "Prompt"}
            translationKey={question.title}
            translations={translations}
            languages={languages}
            defaultLanguage={defaultLanguage}
            placeholder={isInformational ? "Add a title" : "Ask your question"}
            onChange={onUpdateTranslation}
          />

          {isInformational ? (
            <TranslationInput
              id={`question-description-${question.id}`}
              label="Description"
              translationKey={question.description}
              translations={translations}
              languages={languages}
              defaultLanguage={defaultLanguage}
              placeholder="Add explanatory text inside this block"
              multiline
              rows={4}
              onChange={onUpdateTranslation}
            />
          ) : null}

          {isText ? (
            <TranslationInput
              id={`question-placeholder-${question.id}`}
              label="Placeholder"
              translationKey={question.placeholder}
              translations={translations}
              languages={languages}
              defaultLanguage={defaultLanguage}
              placeholder={question.multilineText ? "Placeholder text for the textarea" : "Placeholder text for the input"}
              onChange={onUpdateTranslation}
            />
          ) : null}

          {isChoiceQuestion(question) ? (
            <OptionList
              question={question}
              blockTargets={blockTargets}
              languages={languages}
              defaultLanguage={defaultLanguage}
              translations={translations}
              onAddOption={onAddOption}
              onUpdateTranslation={onUpdateTranslation}
              onToggleOther={(value) => onToggle("allowOther", value)}
              onDeleteOption={onDeleteOption}
              onMoveOption={onMoveOption}
              onSetOptionRule={onSetOptionRule}
              onSetOtherOptionRule={onSetOtherOptionRule}
            />
          ) : null}

          <footer className="question-card__footer">
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

              {isText ? (
                <label className="checkbox">
                  <input
                    type="checkbox"
                    checked={question.multilineText}
                    onChange={(event) => onToggle("multilineText", event.target.checked)}
                  />
                  <span>Multiline text</span>
                </label>
              ) : null}

              {isSingleChoice ? (
                <label className="checkbox">
                  <input
                    type="checkbox"
                    checked={question.showAsDropdown}
                    onChange={(event) => onToggle("showAsDropdown", event.target.checked)}
                  />
                  <span>Show as dropdown</span>
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
