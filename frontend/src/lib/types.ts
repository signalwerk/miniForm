export type BlockType = "content" | "text" | "single_choice" | "multiple_choice";

export type NavigationMode = "next" | "section" | "submit";
export type TranslationId = string;
export type LanguageId = string;

export interface NavigationRule {
  mode: NavigationMode;
  targetSectionId: string | null;
}

export interface FormLanguage {
  id: LanguageId;
  label: string;
}

export interface FormI18nSettings {
  languages: FormLanguage[];
  defaultLanguage: LanguageId;
}

export interface EmailHandlerSettings {
  id: string;
  type: "email";
  to: string;
  subject: string;
  message: string;
}

export type FormHandlerSettings = EmailHandlerSettings;

export interface FormSettings {
  handlers: FormHandlerSettings[];
}

export type FormTranslations = Record<TranslationId, Record<LanguageId, string>>;

export interface FormOption {
  id: string;
  label: TranslationId;
  navigation: NavigationRule;
}

interface CollapsibleBlock {
  id: string;
  isCollapsed: boolean;
}

export interface ContentBlock extends CollapsibleBlock {
  type: "content";
  content: TranslationId;
}

interface PromptBlock extends CollapsibleBlock {
  title: TranslationId;
  description: TranslationId;
}

export interface TextBlock extends PromptBlock {
  type: "text";
  required: boolean;
  shortText: boolean;
  placeholder: TranslationId;
}

interface BaseChoiceBlock extends PromptBlock {
  required: boolean;
  options: FormOption[];
  allowOther: boolean;
  otherOptionLabel: TranslationId | null;
}

export interface SingleChoiceBlock extends BaseChoiceBlock {
  type: "single_choice";
  showAsDropdown: boolean;
  routeByAnswer: boolean;
  otherOptionNavigation: NavigationRule;
}

export interface MultipleChoiceBlock extends BaseChoiceBlock {
  type: "multiple_choice";
}

export type ChoiceBlock = SingleChoiceBlock | MultipleChoiceBlock;

export type FormBlock = ContentBlock | TextBlock | SingleChoiceBlock | MultipleChoiceBlock;

export interface FormSection {
  id: string;
  blocks: FormBlock[];
  afterSection: NavigationRule;
  isCollapsed: boolean;
}

export interface PersistedFormOption {
  id: string;
  label: TranslationId;
  navigation?: NavigationRule;
}

interface PersistedBlockBase {
  id: string;
}

export interface PersistedContentBlock extends PersistedBlockBase {
  type: "content";
  content: TranslationId;
}

interface PersistedPromptBlock extends PersistedBlockBase {
  title: TranslationId;
  description: TranslationId;
}

export interface PersistedTextBlock extends PersistedPromptBlock {
  type: "text";
  required: boolean;
  shortText: boolean;
  placeholder: TranslationId;
}

interface BasePersistedChoiceBlock extends PersistedPromptBlock {
  required: boolean;
  options: PersistedFormOption[];
  allowOther: boolean;
  otherOptionLabel?: TranslationId;
}

export interface PersistedSingleChoiceBlock extends BasePersistedChoiceBlock {
  type: "single_choice";
  showAsDropdown: boolean;
  routeByAnswer: boolean;
  otherOptionNavigation?: NavigationRule;
}

export interface PersistedMultipleChoiceBlock extends BasePersistedChoiceBlock {
  type: "multiple_choice";
}

export type PersistedFormBlock =
  | PersistedContentBlock
  | PersistedTextBlock
  | PersistedSingleChoiceBlock
  | PersistedMultipleChoiceBlock;

export interface PersistedFormSection {
  id: string;
  blocks: PersistedFormBlock[];
  afterSection: NavigationRule;
}

export interface FormDefinition {
  title: string;
  description: string;
  published: boolean;
  settings: FormSettings;
  i18n: FormI18nSettings;
  translations: FormTranslations;
  sections: FormSection[];
}

export interface PersistedFormDefinition {
  i18n: FormI18nSettings;
  translations: FormTranslations;
  sections: PersistedFormSection[];
}

export interface FormSummary {
  recordId: string;
  title: string;
  updated: string;
}
