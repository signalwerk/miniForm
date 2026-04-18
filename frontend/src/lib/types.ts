export type QuestionType =
  | "title_description"
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
  labelKey: TranslationKey;
  navigation: NavigationRule;
}

export interface FormQuestion {
  id: string;
  type: QuestionType;
  titleKey: TranslationKey;
  descriptionKey: TranslationKey;
  required: boolean;
  multilineText: boolean;
  showAsDropdown: boolean;
  allowOther: boolean;
  otherOptionLabelKey: TranslationKey | null;
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
  i18n: FormI18nSettings;
  translations: FormTranslations;
  blocks: FormBlock[];
}

export interface FormSummary {
  recordId: string;
  title: string;
  updated: string;
}
