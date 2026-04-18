import type {
  FormBlock,
  FormDefinition,
  FormLanguage,
  FormOption,
  FormQuestion,
  FormTranslations,
  NavigationMode,
  NavigationRule,
  QuestionType,
  TranslationKey,
} from "./types";

const createId = () => {
  if (typeof crypto !== "undefined" && "randomUUID" in crypto) {
    return crypto.randomUUID();
  }

  return `id-${Math.random().toString(36).slice(2, 11)}`;
};

export const createTranslationKey = () => `tr_${createId()}`;
export const createLanguageId = () => `lang_${createId()}`;

export const QUESTION_TYPE_OPTIONS: Array<{ value: QuestionType; label: string }> = [
  { value: "title_description", label: "Title & Description" },
  { value: "text", label: "Text" },
  { value: "single_choice", label: "Single choice" },
  { value: "multiple_choice", label: "Multiple choice" },
];

export const NAVIGATION_OPTIONS: Array<{ value: NavigationMode; label: string }> = [
  { value: "next", label: "Continue to next block" },
  { value: "block", label: "Go to a specific block" },
  { value: "submit", label: "Submit form" },
];

export const supportsOptions = (type: QuestionType) => type === "single_choice" || type === "multiple_choice";

export const supportsOptionNavigation = (type: QuestionType) => type === "single_choice";

export const createNavigationRule = (
  mode: NavigationMode = "next",
  targetBlockId: string | null = null,
): NavigationRule => ({
  mode,
  targetBlockId: mode === "block" ? targetBlockId : null,
});

export const createFormLanguage = (languages: FormLanguage[]): FormLanguage => {
  let index = languages.length + 1;
  let nextId = createLanguageId();

  while (languages.some((language) => language.id === nextId)) {
    nextId = createLanguageId();
  }

  return {
    id: nextId,
    label: `Language ${index}`,
  };
};

export const createTranslationEntries = (
  keys: Array<TranslationKey | null | undefined>,
): FormTranslations =>
  Object.fromEntries(keys.filter((key): key is TranslationKey => Boolean(key)).map((key) => [key, {}]));

export const createOption = (): FormOption => ({
  id: createId(),
  labelKey: createTranslationKey(),
  navigation: createNavigationRule(),
});

export const createQuestion = (type: QuestionType = "text"): FormQuestion => ({
  id: createId(),
  type,
  titleKey: createTranslationKey(),
  descriptionKey: createTranslationKey(),
  required: false,
  multilineText: false,
  showAsDropdown: false,
  allowOther: false,
  otherOptionLabelKey: null,
  otherOptionNavigation: createNavigationRule(),
  routeByAnswer: false,
  options: type === "single_choice" || type === "multiple_choice" ? [createOption(), createOption()] : [],
  isCollapsed: false,
});

export const createBlock = (): FormBlock => ({
  id: createId(),
  title: "",
  description: "",
  questions: [],
  afterBlock: createNavigationRule(),
  isCollapsed: false,
});

export const createForm = (): FormDefinition => {
  const defaultLanguageId = createLanguageId();

  return {
    title: "",
    description: "",
    i18n: {
      languages: [{ id: defaultLanguageId, label: "English" }],
      defaultLanguage: defaultLanguageId,
    },
    translations: {},
    blocks: [createBlock()],
  };
};

const copyTranslationEntry = (translations: FormTranslations, sourceKey: TranslationKey) => {
  const source = translations[sourceKey];

  if (!source) {
    return {};
  }

  return Object.fromEntries(Object.entries(source).map(([languageId, value]) => [languageId, value]));
};

export const duplicateOption = (option: FormOption, translations: FormTranslations) => {
  const labelKey = createTranslationKey();

  return {
    option: {
      ...option,
      id: createId(),
      labelKey,
    },
    translations: {
      [labelKey]: copyTranslationEntry(translations, option.labelKey),
    },
  };
};

export const duplicateQuestion = (question: FormQuestion, translations: FormTranslations) => {
  const titleKey = createTranslationKey();
  const descriptionKey = createTranslationKey();
  const duplicatedOptions = question.options.map((option) => duplicateOption(option, translations));
  const otherOptionLabelKey = question.otherOptionLabelKey ? createTranslationKey() : null;

  return {
    question: {
      ...question,
      id: createId(),
      titleKey,
      descriptionKey,
      otherOptionLabelKey,
      isCollapsed: false,
      options: duplicatedOptions.map((entry) => entry.option),
    },
    translations: {
      [titleKey]: copyTranslationEntry(translations, question.titleKey),
      [descriptionKey]: copyTranslationEntry(translations, question.descriptionKey),
      ...(otherOptionLabelKey && question.otherOptionLabelKey
        ? {
            [otherOptionLabelKey]: copyTranslationEntry(translations, question.otherOptionLabelKey),
          }
        : {}),
      ...Object.assign({}, ...duplicatedOptions.map((entry) => entry.translations)),
    },
  };
};

export const duplicateBlock = (block: FormBlock, translations: FormTranslations) => {
  const duplicatedQuestions = block.questions.map((question) => duplicateQuestion(question, translations));

  return {
    block: {
      ...block,
      id: createId(),
      isCollapsed: false,
      questions: duplicatedQuestions.map((entry) => entry.question),
    },
    translations: Object.assign({}, ...duplicatedQuestions.map((entry) => entry.translations)),
  };
};

export const moveItem = <T,>(items: T[], fromIndex: number, toIndex: number) => {
  if (
    fromIndex < 0 ||
    toIndex < 0 ||
    fromIndex >= items.length ||
    toIndex >= items.length ||
    fromIndex === toIndex
  ) {
    return items;
  }

  const next = [...items];
  const [item] = next.splice(fromIndex, 1);
  next.splice(toIndex, 0, item);
  return next;
};

export const getTranslationValue = (
  translations: FormTranslations,
  translationKey: TranslationKey | null,
  languageId: string,
) => {
  if (!translationKey) {
    return "";
  }

  return translations[translationKey]?.[languageId] ?? "";
};

const collectReferencedTranslationKeys = (form: FormDefinition) => {
  const keys = new Set<TranslationKey>();

  form.blocks.forEach((block) => {
    block.questions.forEach((question) => {
      keys.add(question.titleKey);
      keys.add(question.descriptionKey);

      question.options.forEach((option) => {
        keys.add(option.labelKey);
      });

      if (question.allowOther && question.otherOptionLabelKey) {
        keys.add(question.otherOptionLabelKey);
      }
    });
  });

  return keys;
};

export const normalizeNavigationRule = (
  rule: NavigationRule,
  validBlockIds: Set<string>,
): NavigationRule => {
  if (rule.mode === "block") {
    if (!rule.targetBlockId || !validBlockIds.has(rule.targetBlockId)) {
      return createNavigationRule("next");
    }

    return rule;
  }

  return {
    ...rule,
    targetBlockId: null,
  };
};

export const normalizeQuestionType = (
  question: FormQuestion,
  nextType: QuestionType,
): FormQuestion => {
  if (!supportsOptions(nextType)) {
    return {
      ...question,
      type: nextType,
      options: [],
      multilineText: nextType === "text" ? question.multilineText : false,
      showAsDropdown: false,
      allowOther: false,
      otherOptionLabelKey: null,
      otherOptionNavigation: createNavigationRule(),
      routeByAnswer: false,
      required: nextType === "title_description" ? false : question.required,
    };
  }

  return {
    ...question,
    type: nextType,
    multilineText: false,
    showAsDropdown: nextType === "single_choice" ? question.showAsDropdown : false,
    options: question.options.length > 0 ? question.options : [createOption(), createOption()],
    allowOther:
      nextType === "multiple_choice"
        ? question.allowOther
        : nextType === "single_choice"
          ? (question.showAsDropdown ? false : question.allowOther)
          : false,
    otherOptionNavigation: nextType === "single_choice" ? question.otherOptionNavigation : createNavigationRule(),
    routeByAnswer: nextType === "single_choice" ? question.routeByAnswer : false,
  };
};

export const normalizeForm = (form: FormDefinition): FormDefinition => {
  const blocks = form.blocks.length > 0 ? form.blocks : [createBlock()];
  const validBlockIds = new Set(blocks.map((block) => block.id));
  const validLanguageIds = new Set(form.i18n.languages.map((language) => language.id));

  const normalizedBlocks = blocks.map((block) => ({
    ...block,
    afterBlock: normalizeNavigationRule(block.afterBlock, validBlockIds),
    questions: block.questions.map((question) => {
      const normalizedQuestion = normalizeQuestionType(question, question.type);

      return {
        ...normalizedQuestion,
        otherOptionNavigation:
          supportsOptionNavigation(normalizedQuestion.type) && normalizedQuestion.routeByAnswer
            ? normalizeNavigationRule(
                normalizedQuestion.otherOptionNavigation ?? createNavigationRule(),
                validBlockIds,
              )
            : createNavigationRule(),
        options: normalizedQuestion.options.map((option) => ({
          ...option,
          navigation: supportsOptionNavigation(normalizedQuestion.type) && normalizedQuestion.routeByAnswer
            ? normalizeNavigationRule(option.navigation, validBlockIds)
            : createNavigationRule(),
        })),
      };
    }),
  }));

  const normalizedForm = {
    title: form.title ?? "",
    description: form.description ?? "",
    i18n: {
      languages: form.i18n.languages,
      defaultLanguage: form.i18n.defaultLanguage,
    },
    translations: form.translations,
    blocks: normalizedBlocks,
  };

  const referencedKeys = collectReferencedTranslationKeys(normalizedForm);
  const translations = Object.fromEntries(
    [...referencedKeys].map((translationKey) => [
      translationKey,
      Object.fromEntries(
        Object.entries(normalizedForm.translations[translationKey] ?? {}).filter(([languageId]) =>
          validLanguageIds.has(languageId),
        ),
      ),
    ]),
  );

  return {
    ...normalizedForm,
    translations,
  };
};

export const validateI18nSettings = (form: FormDefinition) => {
  const issues: string[] = [];
  const seenIds = new Set<string>();

  if (form.i18n.languages.length === 0) {
    issues.push("At least one language is required.");
  }

  form.i18n.languages.forEach((language) => {
    const id = language.id.trim();
    const label = language.label.trim();

    if (!id) {
      issues.push("Every language needs an ID.");
    } else if (seenIds.has(id)) {
      issues.push(`Language ID "${id}" is duplicated.`);
    } else {
      seenIds.add(id);
    }

    if (!label) {
      issues.push(`Language "${id || "Untitled"}" needs a label.`);
    }
  });

  if (!form.i18n.defaultLanguage || !seenIds.has(form.i18n.defaultLanguage)) {
    issues.push("The default language must match one of the configured languages.");
  }

  return issues;
};

export const validateForm = (form: FormDefinition) => {
  const issues: string[] = [...validateI18nSettings(form)];
  const blockIds = new Set(form.blocks.map((block) => block.id));
  const previewLanguage = form.i18n.defaultLanguage;

  form.blocks.forEach((block) => {
    if (block.afterBlock.mode === "block" && !block.afterBlock.targetBlockId) {
      issues.push(`Block "${block.title || "Untitled block"}" is missing an "After block" target.`);
    }

    block.questions.forEach((question) => {
      const questionTitle = getTranslationValue(form.translations, question.titleKey, previewLanguage);

      if (supportsOptions(question.type) && question.options.length === 0) {
        issues.push(`Question "${questionTitle || "Untitled question"}" needs at least one option.`);
      }

      if (supportsOptionNavigation(question.type) && question.routeByAnswer) {
        question.options.forEach((option) => {
          const optionLabel = getTranslationValue(form.translations, option.labelKey, previewLanguage);

          if (option.navigation.mode === "block" && !option.navigation.targetBlockId) {
            issues.push(
              `Option "${optionLabel || "Untitled option"}" in "${questionTitle || "Untitled question"}" is missing a target block.`,
            );
          }
        });

        if (
          question.allowOther &&
          question.otherOptionNavigation.mode === "block" &&
          !question.otherOptionNavigation.targetBlockId
        ) {
          const otherLabel = getTranslationValue(
            form.translations,
            question.otherOptionLabelKey,
            previewLanguage,
          );

          issues.push(
            `"${otherLabel || "Other"}" in "${questionTitle || "Untitled question"}" is missing a target block.`,
          );
        }
      }
    });
  });

  if (blockIds.size !== form.blocks.length) {
    issues.push("Some block IDs are duplicated.");
  }

  return issues;
};

export const isSupportedFormDefinition = (value: unknown): value is FormDefinition => {
  if (!value || typeof value !== "object") {
    return false;
  }

  const candidate = value as Partial<FormDefinition>;
  const supportedQuestionTypes = new Set<QuestionType>([
    "title_description",
    "text",
    "single_choice",
    "multiple_choice",
  ]);

  const hasStringMap = (entry: unknown) =>
    Boolean(
      entry &&
        typeof entry === "object" &&
        Object.values(entry).every((value) => typeof value === "string"),
    );

  const hasNavigationRule = (rule: unknown) =>
    Boolean(
      rule &&
        typeof rule === "object" &&
        ["next", "block", "submit"].includes((rule as NavigationRule).mode) &&
        (typeof (rule as NavigationRule).targetBlockId === "string" ||
          (rule as NavigationRule).targetBlockId === null),
    );

  const hasOptionShape = (option: unknown) =>
    Boolean(
      option &&
        typeof option === "object" &&
        typeof (option as FormOption).id === "string" &&
        typeof (option as FormOption).labelKey === "string" &&
        hasNavigationRule((option as FormOption).navigation),
    );

  const hasQuestionShape = (question: unknown) =>
    Boolean(
      question &&
        typeof question === "object" &&
        typeof (question as FormQuestion).id === "string" &&
        supportedQuestionTypes.has((question as FormQuestion).type) &&
        typeof (question as FormQuestion).titleKey === "string" &&
        typeof (question as FormQuestion).descriptionKey === "string" &&
        typeof (question as FormQuestion).required === "boolean" &&
        typeof (question as FormQuestion).multilineText === "boolean" &&
        typeof (question as FormQuestion).showAsDropdown === "boolean" &&
        typeof (question as FormQuestion).allowOther === "boolean" &&
        (typeof (question as FormQuestion).otherOptionLabelKey === "string" ||
          (question as FormQuestion).otherOptionLabelKey === null) &&
        hasNavigationRule((question as FormQuestion).otherOptionNavigation) &&
        typeof (question as FormQuestion).routeByAnswer === "boolean" &&
        Array.isArray((question as FormQuestion).options) &&
        (question as FormQuestion).options.every(hasOptionShape) &&
        typeof (question as FormQuestion).isCollapsed === "boolean",
    );

  const hasBlockShape = (block: unknown) =>
    Boolean(
      block &&
        typeof block === "object" &&
        typeof (block as FormBlock).id === "string" &&
        typeof (block as FormBlock).title === "string" &&
        typeof (block as FormBlock).description === "string" &&
        Array.isArray((block as FormBlock).questions) &&
        (block as FormBlock).questions.every(hasQuestionShape) &&
        hasNavigationRule((block as FormBlock).afterBlock) &&
        typeof (block as FormBlock).isCollapsed === "boolean",
    );

  return Boolean(
    typeof candidate.title === "string" &&
      typeof candidate.description === "string" &&
      candidate.i18n &&
      typeof candidate.i18n === "object" &&
      Array.isArray(candidate.i18n.languages) &&
      candidate.i18n.languages.every(
        (language) =>
          language &&
          typeof language === "object" &&
          typeof language.id === "string" &&
          typeof language.label === "string",
      ) &&
      typeof candidate.i18n.defaultLanguage === "string" &&
      candidate.translations &&
      typeof candidate.translations === "object" &&
      Object.values(candidate.translations).every(hasStringMap) &&
      Array.isArray(candidate.blocks) &&
      candidate.blocks.every(hasBlockShape),
  );
};
