import type { FormBlock, NavigationRule, QuestionType } from "../lib/types";
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
  onUpdateBlock: (patch: Partial<FormBlock>) => void;
  onDeleteBlock: () => void;
  onDuplicateBlock: () => void;
  onToggleBlock: () => void;
  onMoveBlock: (fromIndex: number, toIndex: number) => void;
  onBlockDragStart: () => void;
  onBlockDrop: () => void;
  onQuestionMove: (fromIndex: number, toIndex: number) => void;
  onQuestionDragStart: (questionId: string) => void;
  onQuestionDrop: (questionId: string) => void;
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
  onUpdateBlock,
  onDeleteBlock,
  onDuplicateBlock,
  onToggleBlock,
  onMoveBlock,
  onBlockDragStart,
  onBlockDrop,
  onQuestionMove,
  onQuestionDragStart,
  onQuestionDrop,
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

  return (
    <section
      className="block-card"
      draggable
      onDragStart={onBlockDragStart}
      onDragOver={(event) => event.preventDefault()}
      onDrop={(event) => {
        event.preventDefault();
        onBlockDrop();
      }}
    >
      <header className="block-card__header">
        <div>
          <p className="eyebrow">Block {index + 1}</p>
          <h2>{block.title || "Untitled block"}</h2>
        </div>

        <div className="card-actions">
          <button
            type="button"
            className="button button--ghost"
            onClick={() => onMoveBlock(index, index - 1)}
            disabled={index === 0}
          >
            Move up
          </button>
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

          <div className="block-card__questions">
            {block.questions.map((question, questionIndex) => (
              <QuestionCard
                key={question.id}
                blockId={block.id}
                question={question}
                index={questionIndex}
                blockTargets={availableTargets}
                onTitleChange={(value) => onQuestionFieldChange(question.id, "title", value)}
                onDescriptionChange={(value) => onQuestionFieldChange(question.id, "description", value)}
                onTypeChange={(value) => onQuestionTypeChange(question.id, value)}
                onToggle={(field, value) => onQuestionToggle(question.id, field, value)}
                onDuplicate={() => onDuplicateQuestion(question.id)}
                onDelete={() => onDeleteQuestion(question.id)}
                onCollapse={() => onToggleQuestion(question.id)}
                onMove={onQuestionMove}
                onDragStart={() => onQuestionDragStart(question.id)}
                onDragOver={() => undefined}
                onDrop={() => onQuestionDrop(question.id)}
                onAddOption={() => onAddOption(question.id)}
                onUpdateOption={(optionId, value) => onUpdateOption(question.id, optionId, value)}
                onDeleteOption={(optionId) => onDeleteOption(question.id, optionId)}
                onMoveOption={(fromIndex, toIndex) => onMoveOption(question.id, fromIndex, toIndex)}
                onSetOptionRule={(optionId, rule) => onSetOptionRule(question.id, optionId, rule)}
              />
            ))}
          </div>

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
