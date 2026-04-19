export type QuestionType =
  | "content"
  | "text"
  | "single_choice"
  | "multiple_choice";

export type NavigationMode = "next" | "block" | "submit";
export type TranslationKey = string;
export type LanguageId = string;

export interface NavigationRule {
  mode: NavigationMode;
  targetBlockId: string | null;
}

export interface FormLanguage {
  id: LanguageId;
  label: string;
}

export interface FormI18nSettings {
  languages: FormLanguage[];
  defaultLanguage: LanguageId;
}

export type FormTranslations = Record<TranslationKey, Record<LanguageId, string>>;

export interface FormOption {
  id: string;
  label: TranslationKey;
  navigation: NavigationRule;
}

interface CollapsibleQuestion {
  id: string;
  isCollapsed: boolean;
}

export interface ContentQuestion extends CollapsibleQuestion {
  type: "content";
  content: TranslationKey;
}

interface PromptQuestion extends CollapsibleQuestion {
  title: TranslationKey;
  description: TranslationKey;
}

export interface TextQuestion extends PromptQuestion {
  type: "text";
  required: boolean;
  multilineText: boolean;
  placeholder: TranslationKey;
}

interface BaseChoiceQuestion extends PromptQuestion {
  required: boolean;
  options: FormOption[];
  allowOther: boolean;
  otherOptionLabel: TranslationKey | null;
}

export interface SingleChoiceQuestion extends BaseChoiceQuestion {
  type: "single_choice";
  showAsDropdown: boolean;
  routeByAnswer: boolean;
  otherOptionNavigation: NavigationRule;
}

export interface MultipleChoiceQuestion extends BaseChoiceQuestion {
  type: "multiple_choice";
}

export type ChoiceQuestion = SingleChoiceQuestion | MultipleChoiceQuestion;

export type FormQuestion =
  | ContentQuestion
  | TextQuestion
  | SingleChoiceQuestion
  | MultipleChoiceQuestion;

export interface FormBlock {
  id: string;
  questions: FormQuestion[];
  afterBlock: NavigationRule;
  isCollapsed: boolean;
}

export interface PersistedFormOption {
  id: string;
  label: TranslationKey;
  navigation?: NavigationRule;
}

interface PersistedQuestionBase {
  id: string;
}

export interface PersistedContentQuestion extends PersistedQuestionBase {
  type: "content";
  content: TranslationKey;
}

interface PersistedPromptQuestion extends PersistedQuestionBase {
  title: TranslationKey;
  description: TranslationKey;
}

export interface PersistedTextQuestion extends PersistedPromptQuestion {
  type: "text";
  required: boolean;
  multilineText: boolean;
  placeholder: TranslationKey;
}

interface BasePersistedChoiceQuestion extends PersistedPromptQuestion {
  required: boolean;
  options: PersistedFormOption[];
  allowOther: boolean;
  otherOptionLabel?: TranslationKey;
}

export interface PersistedSingleChoiceQuestion extends BasePersistedChoiceQuestion {
  type: "single_choice";
  showAsDropdown: boolean;
  routeByAnswer: boolean;
  otherOptionNavigation?: NavigationRule;
}

export interface PersistedMultipleChoiceQuestion extends BasePersistedChoiceQuestion {
  type: "multiple_choice";
}

export type PersistedFormQuestion =
  | PersistedContentQuestion
  | PersistedTextQuestion
  | PersistedSingleChoiceQuestion
  | PersistedMultipleChoiceQuestion;

export interface PersistedFormBlock {
  id: string;
  questions: PersistedFormQuestion[];
  afterBlock: NavigationRule;
}

export interface FormDefinition {
  title: string;
  description: string;
  i18n: FormI18nSettings;
  translations: FormTranslations;
  blocks: FormBlock[];
}

export interface PersistedFormDefinition {
  title: string;
  description: string;
  i18n: FormI18nSettings;
  translations: FormTranslations;
  blocks: PersistedFormBlock[];
}

export interface FormSummary {
  recordId: string;
  title: string;
  updated: string;
}
