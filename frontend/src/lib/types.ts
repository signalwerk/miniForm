export type QuestionType =
  | "title_description"
  | "short_text"
  | "paragraph"
  | "single_choice"
  | "multiple_choice"
  | "dropdown";

export type NavigationMode = "next" | "block" | "submit";

export interface NavigationRule {
  mode: NavigationMode;
  targetBlockId: string | null;
}

export interface FormOption {
  id: string;
  label: string;
  navigation: NavigationRule;
}

export interface FormQuestion {
  id: string;
  type: QuestionType;
  title: string;
  description: string;
  required: boolean;
  allowOther: boolean;
  otherOptionLabel: string;
  otherOptionNavigation: NavigationRule;
  routeByAnswer: boolean;
  options: FormOption[];
  isCollapsed: boolean;
}

export interface FormBlock {
  id: string;
  title: string;
  description: string;
  questions: FormQuestion[];
  afterBlock: NavigationRule;
  isCollapsed: boolean;
}

export interface FormDefinition {
  id: string;
  title: string;
  description: string;
  blocks: FormBlock[];
}

export interface StoredDraft {
  recordId: string | null;
  form: FormDefinition;
}

export interface FormSummary {
  recordId: string;
  title: string;
  updated: string;
}
