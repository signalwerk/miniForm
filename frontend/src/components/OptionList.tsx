import { supportsOptionNavigation } from "../lib/form-model";
import type { FormQuestion, NavigationRule } from "../lib/types";
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

export function OptionList({
  question,
  blockTargets,
  onAddOption,
  onUpdateOption,
  onDeleteOption,
  onMoveOption,
  onSetOptionRule,
}: OptionListProps) {
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

      {question.options.map((option, index) => (
        <article className="option-list__item" key={option.id}>
          <div className="option-list__main">
            <label htmlFor={`option-${option.id}`}>Option {index + 1}</label>
            <input
              id={`option-${option.id}`}
              type="text"
              value={option.label}
              placeholder={`Option ${index + 1}`}
              onChange={(event) => onUpdateOption(option.id, event.target.value)}
            />
          </div>

          <div className="option-list__actions">
            <button
              type="button"
              className="button button--ghost"
              onClick={() => onMoveOption(index, index - 1)}
              disabled={index === 0}
            >
              Move up
            </button>
            <button
              type="button"
              className="button button--ghost"
              onClick={() => onMoveOption(index, index + 1)}
              disabled={index === question.options.length - 1}
            >
              Move down
            </button>
            <button
              type="button"
              className="button button--ghost button--danger"
              onClick={() => onDeleteOption(option.id)}
              disabled={question.options.length === 1}
            >
              Delete
            </button>
          </div>

          {supportsOptionNavigation(question.type) ? (
            <FlowRuleFields
              idPrefix={`option-rule-${option.id}`}
              label="When this option is chosen"
              rule={option.navigation}
              targets={blockTargets}
              onChange={(rule) => onSetOptionRule(option.id, rule)}
            />
          ) : null}
        </article>
      ))}

      {question.allowOther ? (
        <p className="helper-text">“Other” is enabled. Respondents will be able to type a custom answer.</p>
      ) : null}
    </div>
  );
}
