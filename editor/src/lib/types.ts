export type BlockType = "content" | "text" | "single_choice" | "multiple_choice";

export type NavigationMode = "next" | "section" | "submit";
export type TranslationId = string;
export type LanguageId = string;
export type SurveyLocale = "en_US" | "de_CH" | "fr_CH" | "it_CH";

export interface NavigationRule {
  mode: NavigationMode;
  targetSectionId: string | null;
}

export interface SurveyLanguage {
  id: LanguageId;
  label: string;
  locale: SurveyLocale;
}

export interface SurveyI18nSettings {
  languages: SurveyLanguage[];
  defaultLanguage: LanguageId;
}

export interface EmailHandlerSettings {
  id: string;
  type: "email";
  to: string;
  subject: string;
  message: string;
}

export type SurveyHandlerSettings = EmailHandlerSettings;

export interface SurveySettings {
  handlers: SurveyHandlerSettings[];
}

export interface SurveyConfirmation {
  content: TranslationId;
}

export type SurveyTranslations = Record<TranslationId, Record<LanguageId, string>>;

export interface SurveyOption {
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
  options: SurveyOption[];
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

export type SurveyBlock = ContentBlock | TextBlock | SingleChoiceBlock | MultipleChoiceBlock;

export interface SurveySection {
  id: string;
  blocks: SurveyBlock[];
  afterSection: NavigationRule;
  isCollapsed: boolean;
}

export interface PersistedSurveyOption {
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
  options: PersistedSurveyOption[];
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

export type PersistedSurveyBlock =
  | PersistedContentBlock
  | PersistedTextBlock
  | PersistedSingleChoiceBlock
  | PersistedMultipleChoiceBlock;

export interface PersistedSurveySection {
  id: string;
  blocks: PersistedSurveyBlock[];
  afterSection: NavigationRule;
}

export interface SurveyDefinition {
  title: string;
  description: string;
  published: boolean;
  settings: SurveySettings;
  confirmation: SurveyConfirmation;
  i18n: SurveyI18nSettings;
  translations: SurveyTranslations;
  sections: SurveySection[];
}

export interface PersistedSurveyDefinition {
  confirmation: SurveyConfirmation;
  i18n: SurveyI18nSettings;
  translations: SurveyTranslations;
  sections: PersistedSurveySection[];
}

export interface SurveySummary {
  recordId: string;
  title: string;
  updated: string;
}
