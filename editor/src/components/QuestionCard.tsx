import { useSortable } from "@dnd-kit/sortable";
import { CSS } from "@dnd-kit/utilities";
import {
  BLOCK_TYPE_OPTIONS,
  getTranslationValue,
  isChoiceBlock,
  isContentBlock,
  isSingleChoiceBlock,
  isTextBlock,
} from "../lib/form-model";
import type { DropIndicatorPosition } from "../lib/dnd";
import type {
  BlockType,
  FormBlock,
  FormLanguage,
  FormTranslations,
  NavigationRule,
  TranslationId,
} from "../lib/types";
import { DragHandle } from "./DragHandle";
import { OptionList } from "./OptionList";
import { TranslationInput } from "./TranslationInput";

interface SectionTarget {
  id: string;
  label: string;
}

interface BlockCardProps {
  sectionId: string;
  block: FormBlock;
  index: number;
  sectionTargets: SectionTarget[];
  dropIndicator: DropIndicatorPosition;
  languages: FormLanguage[];
  defaultLanguage: string;
  translations: FormTranslations;
  onUpdateTranslation: (translationId: TranslationId, languageId: string, value: string) => void;
  onTypeChange: (value: BlockType) => void;
  onToggle: (
    field: "required" | "shortText" | "showAsDropdown" | "allowOther" | "routeByAnswer",
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

export function BlockCard({
  sectionId,
  block,
  index,
  sectionTargets,
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
}: BlockCardProps) {
  const {
    attributes,
    listeners,
    setActivatorNodeRef,
    setNodeRef,
    transform,
    transition,
    isDragging,
  } = useSortable({
    id: block.id,
  });

  const isContent = isContentBlock(block);
  const canRouteByAnswer = isSingleChoiceBlock(block);
  const isText = isTextBlock(block);
  const isSingleChoice = isSingleChoiceBlock(block);
  const blockTitle = getTranslationValue(
    translations,
    isContent ? block.content : block.title,
    defaultLanguage,
  );

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
            label={`Reorder block ${index + 1}`}
          />
          <div>
            <p className="eyebrow">Block {index + 1}</p>
            <h3>{blockTitle || (isContent ? "Untitled content" : "Untitled block")}</h3>
          </div>
        </div>

        <div className="question-card__controls">
          <div className="question-card__type">
            <label htmlFor={`block-type-${block.id}`}>Type</label>
            <select
              id={`block-type-${block.id}`}
              value={block.type}
              onChange={(event) => onTypeChange(event.target.value as BlockType)}
            >
              {BLOCK_TYPE_OPTIONS.map((option) => (
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
              {block.isCollapsed ? "Expand" : "Collapse"}
            </button>
            <button type="button" className="button button--ghost button--danger" onClick={onDelete}>
              Delete
            </button>
          </div>
        </div>
      </header>

      {!block.isCollapsed ? (
        <div className="question-card__body">
          {isContent ? (
            <TranslationInput
              id={`block-content-${block.id}`}
              label="Content"
              translationId={block.content}
              translations={translations}
              languages={languages}
              defaultLanguage={defaultLanguage}
              placeholder="Add content inside this block"
              multiline
              rows={4}
              onChange={onUpdateTranslation}
            />
          ) : (
            <>
              <TranslationInput
                id={`block-title-${block.id}`}
                label="Prompt"
                translationId={block.title}
                translations={translations}
                languages={languages}
                defaultLanguage={defaultLanguage}
                placeholder="Add the block prompt"
                onChange={onUpdateTranslation}
              />

              <TranslationInput
                id={`block-description-${block.id}`}
                label="Description"
                translationId={block.description}
                translations={translations}
                languages={languages}
                defaultLanguage={defaultLanguage}
                placeholder="Optional help text for the respondent"
                multiline
                rows={3}
                showMissingBadge={false}
                onChange={onUpdateTranslation}
              />
            </>
          )}

          {isText ? (
            <TranslationInput
              id={`block-placeholder-${block.id}`}
              label="Placeholder"
              translationId={block.placeholder}
              translations={translations}
              languages={languages}
              defaultLanguage={defaultLanguage}
              placeholder={block.shortText ? "Placeholder text for the input" : "Placeholder text for the textarea"}
              showMissingBadge={false}
              onChange={onUpdateTranslation}
            />
          ) : null}

          {isChoiceBlock(block) ? (
            <OptionList
              block={block}
              sectionTargets={sectionTargets}
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
              {!isContent ? (
                <label className="checkbox">
                  <input
                    type="checkbox"
                    checked={block.required}
                    onChange={(event) => onToggle("required", event.target.checked)}
                  />
                  <span>Required</span>
                </label>
              ) : null}

              {isText ? (
                <label className="checkbox">
                  <input
                    type="checkbox"
                    checked={block.shortText}
                    onChange={(event) => onToggle("shortText", event.target.checked)}
                  />
                  <span>Short text</span>
                </label>
              ) : null}

              {isSingleChoice ? (
                <label className="checkbox">
                  <input
                    type="checkbox"
                    checked={block.showAsDropdown}
                    onChange={(event) => onToggle("showAsDropdown", event.target.checked)}
                  />
                  <span>Show as dropdown</span>
                </label>
              ) : null}

              {canRouteByAnswer ? (
                <label className="checkbox">
                  <input
                    type="checkbox"
                    checked={block.routeByAnswer}
                    onChange={(event) => onToggle("routeByAnswer", event.target.checked)}
                  />
                  <span>Go to section based on answer</span>
                </label>
              ) : null}

              <p className="helper-text">
                Use the drag handle to reorder blocks inside section {sectionId.slice(0, 4).toUpperCase()}.
              </p>
            </div>
          </footer>
        </div>
      ) : null}
    </article>
  );
}
