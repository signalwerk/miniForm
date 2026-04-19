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
import type {
  BlockType,
  FormLanguage,
  FormSection,
  FormTranslations,
  NavigationRule,
  TranslationId,
} from "../lib/types";
import { DragHandle } from "./DragHandle";
import { FlowRuleFields } from "./FlowRuleFields";
import { BlockCard as BlockEditorCard } from "./QuestionCard";

interface SectionTarget {
  id: string;
  label: string;
}

interface SectionCardProps {
  section: FormSection;
  index: number;
  sectionTargets: SectionTarget[];
  dropIndicator: DropIndicatorPosition;
  languages: FormLanguage[];
  defaultLanguage: string;
  translations: FormTranslations;
  onDeleteSection: () => void;
  onDuplicateSection: () => void;
  onToggleSection: () => void;
  onBlockMove: (fromIndex: number, toIndex: number) => void;
  onAddBlock: (type?: BlockType) => void;
  onUpdateTranslation: (translationId: TranslationId, languageId: string, value: string) => void;
  onBlockTypeChange: (blockId: string, blockType: BlockType) => void;
  onBlockToggle: (
    blockId: string,
    field: "required" | "multilineText" | "showAsDropdown" | "allowOther" | "routeByAnswer",
    value: boolean,
  ) => void;
  onDeleteBlock: (blockId: string) => void;
  onDuplicateBlock: (blockId: string) => void;
  onToggleBlock: (blockId: string) => void;
  onSetSectionRule: (rule: NavigationRule) => void;
  onAddOption: (blockId: string) => void;
  onDeleteOption: (blockId: string, optionId: string) => void;
  onMoveOption: (blockId: string, fromIndex: number, toIndex: number) => void;
  onSetOptionRule: (blockId: string, optionId: string, rule: NavigationRule) => void;
  onSetOtherOptionRule: (blockId: string, rule: NavigationRule) => void;
}

export function SectionCard({
  section,
  index,
  sectionTargets,
  dropIndicator,
  languages,
  defaultLanguage,
  translations,
  onDeleteSection,
  onDuplicateSection,
  onToggleSection,
  onBlockMove,
  onAddBlock,
  onUpdateTranslation,
  onBlockTypeChange,
  onBlockToggle,
  onDeleteBlock,
  onDuplicateBlock,
  onToggleBlock,
  onSetSectionRule,
  onAddOption,
  onDeleteOption,
  onMoveOption,
  onSetOptionRule,
  onSetOtherOptionRule,
}: SectionCardProps) {
  const availableTargets = sectionTargets.filter((target) => target.id !== section.id);
  const blockIds = useMemo(() => section.blocks.map((block) => block.id), [section.blocks]);
  const [activeBlockId, setActiveBlockId] = useState<UniqueIdentifier | null>(null);
  const [overBlockId, setOverBlockId] = useState<UniqueIdentifier | null>(null);

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
    id: section.id,
  });

  const handleBlockDragEnd = ({ active, over }: DragEndEvent) => {
    setActiveBlockId(null);
    setOverBlockId(null);

    if (!over || active.id === over.id) {
      return;
    }

    onBlockMove(blockIds.indexOf(String(active.id)), blockIds.indexOf(String(over.id)));
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
            label={`Reorder section ${index + 1}`}
          />
          <div>
            <p className="eyebrow">Section {index + 1}</p>
            <h2>Section {index + 1}</h2>
          </div>
        </div>

        <div className="card-actions">
          <button type="button" className="button button--ghost" onClick={onDuplicateSection}>
            Duplicate
          </button>
          <button type="button" className="button button--ghost" onClick={onToggleSection}>
            {section.isCollapsed ? "Expand" : "Collapse"}
          </button>
          <button type="button" className="button button--ghost button--danger" onClick={onDeleteSection}>
            Delete
          </button>
        </div>
      </header>

      {!section.isCollapsed ? (
        <div className="block-card__body">
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
              <div className="block-card__questions">
                {section.blocks.length === 0 ? (
                  <div className="empty-state">
                    <p className="eyebrow">No blocks yet</p>
                    <p>Add a content block or input block inside this section.</p>
                  </div>
                ) : (
                  section.blocks.map((block, blockIndex) => (
                    <BlockEditorCard
                      key={block.id}
                      sectionId={section.id}
                      block={block}
                      index={blockIndex}
                      sectionTargets={availableTargets}
                      dropIndicator={getDropIndicator(blockIds, block.id, activeBlockId, overBlockId)}
                      languages={languages}
                      defaultLanguage={defaultLanguage}
                      translations={translations}
                      onUpdateTranslation={onUpdateTranslation}
                      onTypeChange={(value) => onBlockTypeChange(block.id, value)}
                      onToggle={(field, value) => onBlockToggle(block.id, field, value)}
                      onDuplicate={() => onDuplicateBlock(block.id)}
                      onDelete={() => onDeleteBlock(block.id)}
                      onCollapse={() => onToggleBlock(block.id)}
                      onAddOption={() => onAddOption(block.id)}
                      onDeleteOption={(optionId) => onDeleteOption(block.id, optionId)}
                      onMoveOption={(fromIndex, toIndex) => onMoveOption(block.id, fromIndex, toIndex)}
                      onSetOptionRule={(optionId, rule) => onSetOptionRule(block.id, optionId, rule)}
                      onSetOtherOptionRule={(rule) => onSetOtherOptionRule(block.id, rule)}
                    />
                  ))
                )}
              </div>
            </SortableContext>
          </DndContext>

          <div className="add-row">
            <span className="eyebrow">Add block</span>
            <div className="button-group">
              <button type="button" className="button button--secondary" onClick={() => onAddBlock("content")}>
                Content
              </button>
              <button type="button" className="button button--secondary" onClick={() => onAddBlock("text")}>
                Text
              </button>
              <button
                type="button"
                className="button button--secondary"
                onClick={() => onAddBlock("single_choice")}
              >
                Single choice
              </button>
              <button
                type="button"
                className="button button--secondary"
                onClick={() => onAddBlock("multiple_choice")}
              >
                Multiple choice
              </button>
            </div>
          </div>

          <div className="block-card__footer">
            <FlowRuleFields
              idPrefix={`section-rule-${section.id}`}
              label="After section"
              rule={section.afterSection}
              targets={availableTargets}
              onChange={onSetSectionRule}
            />
          </div>
        </div>
      ) : null}
    </section>
  );
}
