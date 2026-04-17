import { NAVIGATION_OPTIONS } from "../lib/form-model";
import type { NavigationRule } from "../lib/types";

interface BlockTarget {
  id: string;
  label: string;
}

interface FlowRuleFieldsProps {
  idPrefix: string;
  label: string;
  rule: NavigationRule;
  targets: BlockTarget[];
  onChange: (rule: NavigationRule) => void;
}

export function FlowRuleFields({
  idPrefix,
  label,
  rule,
  targets,
  onChange,
}: FlowRuleFieldsProps) {
  const navigationOptions =
    targets.length === 0 ? NAVIGATION_OPTIONS.filter((option) => option.value !== "block") : NAVIGATION_OPTIONS;

  return (
    <div className="flow-rule">
      <label htmlFor={`${idPrefix}-mode`}>{label}</label>
      <select
        id={`${idPrefix}-mode`}
        value={rule.mode}
        onChange={(event) => {
          const mode = event.target.value as NavigationRule["mode"];
          if (mode === "block" && targets.length === 0) {
            onChange({
              mode: "next",
              targetBlockId: null,
            });
            return;
          }

          onChange({
            mode,
            targetBlockId: mode === "block" ? targets[0]?.id ?? null : null,
          });
        }}
      >
        {navigationOptions.map((option) => (
          <option key={option.value} value={option.value}>
            {option.label}
          </option>
        ))}
      </select>

      {rule.mode === "block" ? (
        <select
          id={`${idPrefix}-target`}
          value={rule.targetBlockId ?? ""}
          onChange={(event) =>
            onChange({
              mode: "block",
              targetBlockId: event.target.value || null,
            })
          }
        >
          {targets.length === 0 ? (
            <option value="">No block available</option>
          ) : (
            targets.map((target) => (
              <option key={target.id} value={target.id}>
                {target.label}
              </option>
            ))
          )}
        </select>
      ) : null}
    </div>
  );
}
