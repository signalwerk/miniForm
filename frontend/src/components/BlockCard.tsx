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
import { getDropIndicator, type DropIndicatorPosition } from "../lib/dnd";
import type { FormBlock, NavigationRule, QuestionType } from "../lib/types";
import { DragHandle } from "./DragHandle";
import { FlowRuleFields } from "./FlowRuleFields";
import { QuestionCard } from "./QuestionCard";

interface BlockTarget {
  id: string;
  label: string;
}

interface BlockCardProps {
  block: FormBlock;
  index: number;
  blockTargets: BlockTarget[];
  dropIndicator: DropIndicatorPosition;
  onUpdateBlock: (patch: Partial<FormBlock>) => void;
  onDeleteBlock: () => void;
  onDuplicateBlock: () => void;
  onToggleBlock: () => void;
  onQuestionMove: (fromIndex: number, toIndex: number) => void;
  onAddQuestion: (type?: QuestionType) => void;
  onQuestionFieldChange: (
    questionId: string,
    field: "title" | "description",
    value: string,
  ) => void;
  onQuestionTypeChange: (questionId: string, questionType: QuestionType) => void;
  onQuestionToggle: (
    questionId: string,
    field: "required" | "allowOther",
    value: boolean,
  ) => void;
  onDeleteQuestion: (questionId: string) => void;
  onDuplicateQuestion: (questionId: string) => void;
  onToggleQuestion: (questionId: string) => void;
  onSetBlockRule: (rule: NavigationRule) => void;
  onAddOption: (questionId: string) => void;
  onUpdateOption: (questionId: string, optionId: string, value: string) => void;
  onDeleteOption: (questionId: string, optionId: string) => void;
  onMoveOption: (questionId: string, fromIndex: number, toIndex: number) => void;
  onSetOptionRule: (questionId: string, optionId: string, rule: NavigationRule) => void;
}

export function BlockCard({
  block,
  index,
  blockTargets,
  dropIndicator,
  onUpdateBlock,
  onDeleteBlock,
  onDuplicateBlock,
  onToggleBlock,
  onQuestionMove,
  onAddQuestion,
  onQuestionFieldChange,
  onQuestionTypeChange,
  onQuestionToggle,
  onDeleteQuestion,
  onDuplicateQuestion,
  onToggleQuestion,
  onSetBlockRule,
  onAddOption,
  onUpdateOption,
  onDeleteOption,
  onMoveOption,
  onSetOptionRule,
}: BlockCardProps) {
  const availableTargets = blockTargets.filter((target) => target.id !== block.id);
  const questionIds = useMemo(() => block.questions.map((question) => question.id), [block.questions]);
  const [activeQuestionId, setActiveQuestionId] = useState<UniqueIdentifier | null>(null);
  const [overQuestionId, setOverQuestionId] = useState<UniqueIdentifier | null>(null);

  const sensors = useSensors(
    useSensor(PointerSensor, {
      activationConstraint: {
        distance: 6,
      },
    }),
  );

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

  const handleQuestionDragEnd = ({ active, over }: DragEndEvent) => {
    setActiveQuestionId(null);
    setOverQuestionId(null);

    if (!over || active.id === over.id) {
      return;
    }

    onQuestionMove(questionIds.indexOf(String(active.id)), questionIds.indexOf(String(over.id)));
  };

  return (
    <section
      ref={setNodeRef}
      style={{
        transform: CSS.Transform.toString(transform),
        transition,
      }}
      className={[
        "block-card",
        isDragging ? "block-card--dragging" : "",
        dropIndicator ? `block-card--drop-${dropIndicator}` : "",
      ]
        .filter(Boolean)
        .join(" ")}
    >
      <header className="block-card__header">
        <div className="card-title">
          <DragHandle
            attributes={attributes}
            listeners={listeners}
            setActivatorNodeRef={setActivatorNodeRef}
            label={`Reorder block ${index + 1}`}
          />
          <div>
            <p className="eyebrow">Block {index + 1}</p>
            <h2>{block.title || "Untitled block"}</h2>
          </div>
        </div>

        <div className="card-actions">
          <button type="button" className="button button--ghost" onClick={onDuplicateBlock}>
            Duplicate
          </button>
          <button type="button" className="button button--ghost" onClick={onToggleBlock}>
            {block.isCollapsed ? "Expand" : "Collapse"}
          </button>
          <button type="button" className="button button--ghost button--danger" onClick={onDeleteBlock}>
            Delete
          </button>
        </div>
      </header>

      {!block.isCollapsed ? (
        <div className="block-card__body">
          <div className="field-grid">
            <div>
              <label htmlFor={`block-title-${block.id}`}>Block title</label>
              <input
                id={`block-title-${block.id}`}
                type="text"
                value={block.title}
                onChange={(event) => onUpdateBlock({ title: event.target.value })}
              />
            </div>
          </div>

          <div>
            <label htmlFor={`block-description-${block.id}`}>Description</label>
            <textarea
              id={`block-description-${block.id}`}
              rows={3}
              value={block.description}
              placeholder="Optional instructions for this block"
              onChange={(event) => onUpdateBlock({ description: event.target.value })}
            />
          </div>

          <DndContext
            sensors={sensors}
            collisionDetection={closestCenter}
            onDragStart={({ active }: DragStartEvent) => setActiveQuestionId(active.id)}
            onDragOver={({ over }) => setOverQuestionId(over?.id ?? null)}
            onDragCancel={() => {
              setActiveQuestionId(null);
              setOverQuestionId(null);
            }}
            onDragEnd={handleQuestionDragEnd}
          >
            <SortableContext items={questionIds} strategy={verticalListSortingStrategy}>
              <div className="block-card__questions">
                {block.questions.map((question, questionIndex) => (
                  <QuestionCard
                    key={question.id}
                    blockId={block.id}
                    question={question}
                    index={questionIndex}
                    blockTargets={availableTargets}
                    dropIndicator={getDropIndicator(
                      questionIds,
                      question.id,
                      activeQuestionId,
                      overQuestionId,
                    )}
                    onTitleChange={(value) => onQuestionFieldChange(question.id, "title", value)}
                    onDescriptionChange={(value) => onQuestionFieldChange(question.id, "description", value)}
                    onTypeChange={(value) => onQuestionTypeChange(question.id, value)}
                    onToggle={(field, value) => onQuestionToggle(question.id, field, value)}
                    onDuplicate={() => onDuplicateQuestion(question.id)}
                    onDelete={() => onDeleteQuestion(question.id)}
                    onCollapse={() => onToggleQuestion(question.id)}
                    onAddOption={() => onAddOption(question.id)}
                    onUpdateOption={(optionId, value) => onUpdateOption(question.id, optionId, value)}
                    onDeleteOption={(optionId) => onDeleteOption(question.id, optionId)}
                    onMoveOption={(fromIndex, toIndex) => onMoveOption(question.id, fromIndex, toIndex)}
                    onSetOptionRule={(optionId, rule) => onSetOptionRule(question.id, optionId, rule)}
                  />
                ))}
              </div>
            </SortableContext>
          </DndContext>

          <div className="add-row">
            <span className="eyebrow">Add question</span>
            <div className="button-group">
              <button type="button" className="button button--secondary" onClick={() => onAddQuestion("short_text")}>
                Short text
              </button>
              <button type="button" className="button button--secondary" onClick={() => onAddQuestion("paragraph")}>
                Paragraph
              </button>
              <button
                type="button"
                className="button button--secondary"
                onClick={() => onAddQuestion("single_choice")}
              >
                Single choice
              </button>
              <button
                type="button"
                className="button button--secondary"
                onClick={() => onAddQuestion("multiple_choice")}
              >
                Multiple choice
              </button>
              <button type="button" className="button button--secondary" onClick={() => onAddQuestion("dropdown")}>
                Dropdown
              </button>
            </div>
          </div>

          <div className="block-card__footer">
            <FlowRuleFields
              idPrefix={`block-rule-${block.id}`}
              label="After block"
              rule={block.afterBlock}
              targets={availableTargets}
              onChange={onSetBlockRule}
            />
          </div>
        </div>
      ) : null}
    </section>
  );
}
