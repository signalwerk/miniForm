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
import { supportsOptionNavigation } from "../lib/form-model";
import type { FormQuestion, NavigationRule } from "../lib/types";
import { DragHandle } from "./DragHandle";
import { FlowRuleFields } from "./FlowRuleFields";

interface BlockTarget {
  id: string;
  label: string;
}

interface OptionListProps {
  question: FormQuestion;
  blockTargets: BlockTarget[];
  onAddOption: () => void;
  onUpdateOption: (optionId: string, value: string) => void;
  onDeleteOption: (optionId: string) => void;
  onMoveOption: (fromIndex: number, toIndex: number) => void;
  onSetOptionRule: (optionId: string, rule: NavigationRule) => void;
}

interface OptionItemProps {
  optionId: string;
  index: number;
  label: string;
  canDelete: boolean;
  questionType: FormQuestion["type"];
  navigation: NavigationRule;
  blockTargets: BlockTarget[];
  dropIndicator: "before" | "after" | null;
  onUpdateOption: (optionId: string, value: string) => void;
  onDeleteOption: (optionId: string) => void;
  onSetOptionRule: (optionId: string, rule: NavigationRule) => void;
}

function OptionItem({
  optionId,
  index,
  label,
  canDelete,
  questionType,
  navigation,
  blockTargets,
  dropIndicator,
  onUpdateOption,
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
            <label htmlFor={`option-${optionId}`}>Option {index + 1}</label>
            <input
              id={`option-${optionId}`}
              type="text"
              value={label}
              placeholder={`Option ${index + 1}`}
              onChange={(event) => onUpdateOption(optionId, event.target.value)}
            />
          </div>
        </div>

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

      {supportsOptionNavigation(questionType) ? (
        <FlowRuleFields
          idPrefix={`option-rule-${optionId}`}
          label="When this option is chosen"
          rule={navigation}
          targets={blockTargets}
          onChange={(rule) => onSetOptionRule(optionId, rule)}
        />
      ) : null}
    </article>
  );
}

export function OptionList({
  question,
  blockTargets,
  onAddOption,
  onUpdateOption,
  onDeleteOption,
  onMoveOption,
  onSetOptionRule,
}: OptionListProps) {
  const optionIds = useMemo(() => question.options.map((option) => option.id), [question.options]);
  const [activeOptionId, setActiveOptionId] = useState<UniqueIdentifier | null>(null);
  const [overOptionId, setOverOptionId] = useState<UniqueIdentifier | null>(null);
  const sensors = useSensors(
    useSensor(PointerSensor, {
      activationConstraint: {
        distance: 6,
      },
    }),
  );

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
        <button type="button" className="button button--secondary" onClick={onAddOption}>
          Add option
        </button>
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
          {question.options.map((option, index) => (
            <OptionItem
              key={option.id}
              optionId={option.id}
              index={index}
              label={option.label}
              canDelete={question.options.length > 1}
              questionType={question.type}
              navigation={option.navigation}
              blockTargets={blockTargets}
              dropIndicator={getDropIndicator(optionIds, option.id, activeOptionId, overOptionId)}
              onUpdateOption={onUpdateOption}
              onDeleteOption={onDeleteOption}
              onSetOptionRule={onSetOptionRule}
            />
          ))}
        </SortableContext>
      </DndContext>

      {question.allowOther ? (
        <p className="helper-text">“Other” is enabled. Respondents will be able to type a custom answer.</p>
      ) : null}
    </div>
  );
}
