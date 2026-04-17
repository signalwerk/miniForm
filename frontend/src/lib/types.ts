export type QuestionType =
  | "title_description"
  | "text"
  | "single_choice"
  | "multiple_choice";

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
  multilineText: boolean;
  showAsDropdown: boolean;
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
  title: string;
  description: string;
  blocks: FormBlock[];
}

export interface FormSummary {
  recordId: string;
  title: string;
  updated: string;
}
