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
import { SortableContext, useSortable, verticalListSortingStrategy } from "@dnd-kit/sortable";
import { CSS } from "@dnd-kit/utilities";
import { useMemo, useState } from "react";
import { getDropIndicator } from "../lib/dnd";
import { getTranslationValue, isSingleChoiceBlock } from "../lib/form-model";
import type {
  ChoiceBlock,
  FormLanguage,
  FormTranslations,
  NavigationRule,
  TranslationId,
} from "../lib/types";
import { DragHandle } from "./DragHandle";
import { FlowRuleFields } from "./FlowRuleFields";
import { TranslationInput } from "./TranslationInput";

interface SectionTarget {
  id: string;
  label: string;
}

interface OptionListProps {
  block: ChoiceBlock;
  sectionTargets: SectionTarget[];
  languages: FormLanguage[];
  defaultLanguage: string;
  translations: FormTranslations;
  onAddOption: () => void;
  onUpdateTranslation: (translationId: TranslationId, languageId: string, value: string) => void;
  onToggleOther: (value: boolean) => void;
  onDeleteOption: (optionId: string) => void;
  onMoveOption: (fromIndex: number, toIndex: number) => void;
  onSetOptionRule: (optionId: string, rule: NavigationRule) => void;
  onSetOtherOptionRule: (rule: NavigationRule) => void;
}

interface OptionItemProps {
  optionId: string;
  label: TranslationId;
  index: number;
  canDelete: boolean;
  blockType: ChoiceBlock["type"];
  navigation: NavigationRule;
  sectionTargets: SectionTarget[];
  languages: FormLanguage[];
  defaultLanguage: string;
  translations: FormTranslations;
  dropIndicator: "before" | "after" | null;
  onUpdateTranslation: (translationId: TranslationId, languageId: string, value: string) => void;
  onDeleteOption: (optionId: string) => void;
  onSetOptionRule: (optionId: string, rule: NavigationRule) => void;
}

function OptionItem({
  optionId,
  label,
  index,
  canDelete,
  blockType,
  navigation,
  sectionTargets,
  languages,
  defaultLanguage,
  translations,
  dropIndicator,
  onUpdateTranslation,
  onDeleteOption,
  onSetOptionRule,
}: OptionItemProps) {
  const {
    attributes,
    listeners,
    setActivatorNodeRef,
    setNodeRef,
    transform,
    transition,
    isDragging,
  } = useSortable({
    id: optionId,
  });

  return (
    <article
      ref={setNodeRef}
      style={{
        transform: CSS.Transform.toString(transform),
        transition,
      }}
      className={[
        "option-list__item",
        isDragging ? "option-list__item--dragging" : "",
        dropIndicator ? `option-list__item--drop-${dropIndicator}` : "",
      ]
        .filter(Boolean)
        .join(" ")}
    >
      <div className="option-list__row">
        <div className="card-title">
          <DragHandle
            attributes={attributes}
            listeners={listeners}
            setActivatorNodeRef={setActivatorNodeRef}
            label={`Reorder option ${index + 1}`}
          />
          <div className="option-list__main">
            <TranslationInput
              id={`option-${optionId}`}
              label={`Option ${index + 1}`}
              translationId={label}
              translations={translations}
              languages={languages}
              defaultLanguage={defaultLanguage}
              placeholder={`Option ${index + 1}`}
              variant="option"
              onChange={onUpdateTranslation}
            />
          </div>
        </div>

        {blockType === "single_choice" ? (
          <div className="option-list__route">
            <FlowRuleFields
              idPrefix={`option-rule-${optionId}`}
              label="After answer"
              rule={navigation}
              targets={sectionTargets}
              onChange={(rule) => onSetOptionRule(optionId, rule)}
            />
          </div>
        ) : null}

        <div className="option-list__actions">
          <button
            type="button"
            className="button button--ghost button--danger"
            onClick={() => onDeleteOption(optionId)}
            disabled={!canDelete}
          >
            Delete
          </button>
        </div>
      </div>
    </article>
  );
}

export function OptionList({
  block,
  sectionTargets,
  languages,
  defaultLanguage,
  translations,
  onAddOption,
  onUpdateTranslation,
  onToggleOther,
  onDeleteOption,
  onMoveOption,
  onSetOptionRule,
  onSetOtherOptionRule,
}: OptionListProps) {
  const optionIds = useMemo(() => block.options.map((option) => option.id), [block.options]);
  const [activeOptionId, setActiveOptionId] = useState<UniqueIdentifier | null>(null);
  const [overOptionId, setOverOptionId] = useState<UniqueIdentifier | null>(null);
  const sensors = useSensors(
    useSensor(PointerSensor, {
      activationConstraint: {
        distance: 6,
      },
    }),
  );
  const otherLabel = getTranslationValue(translations, block.otherOptionLabel, defaultLanguage);

  const handleDragEnd = ({ active, over }: DragEndEvent) => {
    setActiveOptionId(null);
    setOverOptionId(null);

    if (!over || active.id === over.id) {
      return;
    }

    onMoveOption(optionIds.indexOf(String(active.id)), optionIds.indexOf(String(over.id)));
  };

  return (
    <div className="option-list">
      <div className="option-list__header">
        <div>
          <p className="eyebrow">Choices</p>
          <h4>Options</h4>
        </div>
      </div>

      <DndContext
        sensors={sensors}
        collisionDetection={closestCenter}
        onDragStart={({ active }: DragStartEvent) => setActiveOptionId(active.id)}
        onDragOver={({ over }) => setOverOptionId(over?.id ?? null)}
        onDragCancel={() => {
          setActiveOptionId(null);
          setOverOptionId(null);
        }}
        onDragEnd={handleDragEnd}
      >
        <SortableContext items={optionIds} strategy={verticalListSortingStrategy}>
          {block.options.map((option, index) => (
            <OptionItem
              key={option.id}
              optionId={option.id}
              label={option.label}
              index={index}
              canDelete={block.options.length > 1}
              blockType={isSingleChoiceBlock(block) && block.routeByAnswer ? block.type : "multiple_choice"}
              navigation={option.navigation}
              sectionTargets={sectionTargets}
              languages={languages}
              defaultLanguage={defaultLanguage}
              translations={translations}
              dropIndicator={getDropIndicator(optionIds, option.id, activeOptionId, overOptionId)}
              onUpdateTranslation={onUpdateTranslation}
              onDeleteOption={onDeleteOption}
              onSetOptionRule={onSetOptionRule}
            />
          ))}
        </SortableContext>
      </DndContext>

      {block.options.length === 0 ? (
        <div className="empty-state empty-state--subtle">
          <p>Add options to let respondents choose an answer.</p>
        </div>
      ) : null}

      {!isSingleChoiceBlock(block) || !block.showAsDropdown ? (
        <label className="checkbox option-list__other-toggle">
          <input
            type="checkbox"
            checked={block.allowOther}
            onChange={(event) => onToggleOther(event.target.checked)}
          />
          <span>Show “Other” option</span>
        </label>
      ) : null}

      {block.allowOther && block.otherOptionLabel ? (
        <article className="option-list__item option-list__item--other">
          <div className="option-list__row">
            <div className="card-title">
              <div className="option-list__bullet" aria-hidden="true" />
              <div className="option-list__main">
                <TranslationInput
                  id={`other-option-${block.id}`}
                  label="Other label"
                  translationId={block.otherOptionLabel}
                  translations={translations}
                  languages={languages}
                  defaultLanguage={defaultLanguage}
                  placeholder="Other"
                  variant="option"
                  onChange={onUpdateTranslation}
                />
              </div>
            </div>

            {isSingleChoiceBlock(block) && block.routeByAnswer ? (
              <div className="option-list__route">
                <FlowRuleFields
                  idPrefix={`other-option-rule-${block.id}`}
                  label="After answer"
                  rule={block.otherOptionNavigation}
                  targets={sectionTargets}
                  onChange={onSetOtherOptionRule}
                />
              </div>
            ) : null}
          </div>
          {!otherLabel && defaultLanguage ? (
            <p className="helper-text option-list__missing-note">
              The default language value for “Other” is still empty.
            </p>
          ) : null}
        </article>
      ) : null}

      <div className="button-group">
        <button type="button" className="button button--secondary" onClick={onAddOption}>
          Add option
        </button>
      </div>
    </div>
  );
}
