import type {
  ChoiceQuestion,
  ContentQuestion,
  FormBlock,
  FormDefinition,
  FormLanguage,
  FormOption,
  PersistedContentQuestion,
  PersistedFormBlock,
  PersistedFormDefinition,
  PersistedFormQuestion,
  FormQuestion,
  FormTranslations,
  MultipleChoiceQuestion,
  NavigationMode,
  NavigationRule,
  QuestionType,
  SingleChoiceQuestion,
  TextQuestion,
  TranslationKey,
} from "./types";

const createId = () => {
  const alphabet = "abcdefghijklmnopqrstuvwxyz0123456789";

  if (typeof crypto !== "undefined" && "getRandomValues" in crypto) {
    const bytes = crypto.getRandomValues(new Uint8Array(15));
    return Array.from(bytes, (byte) => alphabet[byte % alphabet.length]).join("");
  }

  return Array.from({ length: 15 }, () => alphabet[Math.floor(Math.random() * alphabet.length)]).join("");
};

export const createTranslationKey = () => createId();
export const createLanguageId = () => createId();

export const QUESTION_TYPE_OPTIONS: Array<{ value: QuestionType; label: string }> = [
  { value: "content", label: "Content" },
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
  label: createTranslationKey(),
  navigation: createNavigationRule(),
});

export const isContentQuestion = (
  question: FormQuestion | PersistedFormQuestion,
): question is ContentQuestion | PersistedContentQuestion => question.type === "content";

export const isTextQuestion = (
  question: FormQuestion | PersistedFormQuestion,
): question is TextQuestion => question.type === "text";

export const isSingleChoiceQuestion = (
  question: FormQuestion | PersistedFormQuestion,
): question is SingleChoiceQuestion => question.type === "single_choice";

export const isMultipleChoiceQuestion = (
  question: FormQuestion | PersistedFormQuestion,
): question is MultipleChoiceQuestion => question.type === "multiple_choice";

export const isChoiceQuestion = (
  question: FormQuestion | PersistedFormQuestion,
): question is ChoiceQuestion => isSingleChoiceQuestion(question) || isMultipleChoiceQuestion(question);

export const createContentQuestion = (): ContentQuestion => ({
  id: createId(),
  type: "content",
  content: createTranslationKey(),
  isCollapsed: false,
});

export const createTextQuestion = (): TextQuestion => ({
  id: createId(),
  type: "text",
  title: createTranslationKey(),
  required: false,
  multilineText: false,
  placeholder: createTranslationKey(),
  isCollapsed: false,
});

export const createSingleChoiceQuestion = (): SingleChoiceQuestion => ({
  id: createId(),
  type: "single_choice",
  title: createTranslationKey(),
  required: false,
  showAsDropdown: false,
  allowOther: false,
  otherOptionLabel: null,
  otherOptionNavigation: createNavigationRule(),
  routeByAnswer: false,
  options: [createOption(), createOption()],
  isCollapsed: false,
});

export const createMultipleChoiceQuestion = (): MultipleChoiceQuestion => ({
  id: createId(),
  type: "multiple_choice",
  title: createTranslationKey(),
  required: false,
  allowOther: false,
  otherOptionLabel: null,
  options: [createOption(), createOption()],
  isCollapsed: false,
});

export const createQuestion = (type: QuestionType = "text"): FormQuestion => {
  switch (type) {
    case "content":
      return createContentQuestion();
    case "single_choice":
      return createSingleChoiceQuestion();
    case "multiple_choice":
      return createMultipleChoiceQuestion();
    case "text":
    default:
      return createTextQuestion();
  }
};

export const createBlock = (): FormBlock => ({
  id: createId(),
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
    blocks: [],
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
  const label = createTranslationKey();

  return {
    option: {
      ...option,
      id: createId(),
      label,
    },
    translations: {
      [label]: copyTranslationEntry(translations, option.label),
    },
  };
};

export const duplicateQuestion = (question: FormQuestion, translations: FormTranslations) => {
  const content = isContentQuestion(question) ? createTranslationKey() : null;
  const title = !isContentQuestion(question) ? createTranslationKey() : null;
  const placeholder = isTextQuestion(question) ? createTranslationKey() : null;
  const contentTranslation =
    content && isContentQuestion(question)
      ? copyTranslationEntry(translations, question.content)
      : null;
  const titleTranslation =
    title && !isContentQuestion(question)
      ? copyTranslationEntry(translations, question.title)
      : null;
  const placeholderTranslation =
    placeholder && isTextQuestion(question)
      ? copyTranslationEntry(translations, question.placeholder)
      : null;
  const duplicatedOptions = isChoiceQuestion(question)
    ? question.options.map((option) => duplicateOption(option, translations))
    : [];
  const otherOptionLabel = isChoiceQuestion(question) && question.otherOptionLabel ? createTranslationKey() : null;

  return {
    question:
      question.type === "content"
        ? ({
            id: createId(),
            type: "content",
            content: content!,
            isCollapsed: false,
          } satisfies ContentQuestion)
        : question.type === "text"
          ? ({
              id: createId(),
              type: "text",
              title: title!,
              required: question.required,
              multilineText: question.multilineText,
              placeholder: placeholder!,
              isCollapsed: false,
            } satisfies TextQuestion)
          : question.type === "single_choice"
            ? ({
                id: createId(),
                type: "single_choice",
                title: title!,
                required: question.required,
                showAsDropdown: question.showAsDropdown,
                allowOther: question.allowOther,
                otherOptionLabel,
                otherOptionNavigation: question.otherOptionNavigation,
                routeByAnswer: question.routeByAnswer,
                options: duplicatedOptions.map((entry) => entry.option),
                isCollapsed: false,
              } satisfies SingleChoiceQuestion)
            : ({
                id: createId(),
                type: "multiple_choice",
                title: title!,
                required: question.required,
                allowOther: question.allowOther,
                otherOptionLabel,
                options: duplicatedOptions.map((entry) => entry.option),
                isCollapsed: false,
              } satisfies MultipleChoiceQuestion),
    translations: {
      ...(content && contentTranslation
        ? {
            [content]: contentTranslation,
          }
        : {}),
      ...(title && titleTranslation
        ? {
            [title]: titleTranslation,
          }
        : {}),
      ...(placeholder && placeholderTranslation
        ? {
            [placeholder]: placeholderTranslation,
          }
        : {}),
      ...(otherOptionLabel && isChoiceQuestion(question) && question.otherOptionLabel
        ? {
            [otherOptionLabel]: copyTranslationEntry(translations, question.otherOptionLabel),
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
      if (isContentQuestion(question)) {
        keys.add(question.content);
      } else {
        keys.add(question.title);
      }
      if (isTextQuestion(question)) {
        keys.add(question.placeholder);
      }

      if (isChoiceQuestion(question)) {
        question.options.forEach((option) => {
          keys.add(option.label);
        });
      }

      if (isChoiceQuestion(question) && question.allowOther && question.otherOptionLabel) {
        keys.add(question.otherOptionLabel);
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
  const promptKey = isContentQuestion(question) ? question.content : question.title;
  const base = {
    id: question.id,
    isCollapsed: question.isCollapsed,
  };
  const required = !isContentQuestion(question) ? question.required : false;
  const options =
    isChoiceQuestion(question) && question.options.length > 0 ? question.options : [createOption(), createOption()];
  const allowOther = isChoiceQuestion(question) ? question.allowOther : false;
  const otherOptionLabel = isChoiceQuestion(question) ? question.otherOptionLabel : null;

  switch (nextType) {
    case "content":
      return {
        ...base,
        type: "content",
        content: isContentQuestion(question) ? question.content : promptKey,
      };

    case "text":
      return {
        ...base,
        type: "text",
        title: isTextQuestion(question) || isChoiceQuestion(question) ? question.title : promptKey,
        required,
        multilineText: isTextQuestion(question) ? question.multilineText : false,
        placeholder: isTextQuestion(question) ? question.placeholder : createTranslationKey(),
      };

    case "single_choice":
      return {
        ...base,
        type: "single_choice",
        title: isTextQuestion(question) || isChoiceQuestion(question) ? question.title : promptKey,
        required,
        showAsDropdown: isSingleChoiceQuestion(question) ? question.showAsDropdown : false,
        routeByAnswer: isSingleChoiceQuestion(question) ? question.routeByAnswer : false,
        allowOther: isSingleChoiceQuestion(question) ? question.showAsDropdown ? false : question.allowOther : allowOther,
        otherOptionLabel: isSingleChoiceQuestion(question) ? question.showAsDropdown ? null : question.otherOptionLabel : otherOptionLabel,
        otherOptionNavigation: isSingleChoiceQuestion(question)
          ? question.otherOptionNavigation
          : createNavigationRule(),
        options,
      };

    case "multiple_choice":
      return {
        ...base,
        type: "multiple_choice",
        title: isTextQuestion(question) || isChoiceQuestion(question) ? question.title : promptKey,
        required,
        allowOther,
        otherOptionLabel,
        options,
      };

    default:
      return question;
  }
};

export const normalizeForm = (form: FormDefinition): FormDefinition => {
  const blocks = form.blocks;
  const validBlockIds = new Set(blocks.map((block) => block.id));
  const validLanguageIds = new Set(form.i18n.languages.map((language) => language.id));

  const normalizedBlocks = blocks.map((block) => ({
    ...block,
    isCollapsed: block.isCollapsed ?? false,
    afterBlock: normalizeNavigationRule(block.afterBlock, validBlockIds),
    questions: block.questions.map((question) => {
      const normalizedQuestion = normalizeQuestionType(question, question.type);

      if (isSingleChoiceQuestion(normalizedQuestion)) {
        return {
          ...normalizedQuestion,
          isCollapsed: normalizedQuestion.isCollapsed ?? false,
          otherOptionNavigation: normalizedQuestion.routeByAnswer
            ? normalizeNavigationRule(normalizedQuestion.otherOptionNavigation, validBlockIds)
            : createNavigationRule(),
          options: normalizedQuestion.options.map((option) => ({
            ...option,
            navigation: normalizedQuestion.routeByAnswer
              ? normalizeNavigationRule(option.navigation, validBlockIds)
              : createNavigationRule(),
          })),
        };
      }

      if (isMultipleChoiceQuestion(normalizedQuestion)) {
        return {
          ...normalizedQuestion,
          isCollapsed: normalizedQuestion.isCollapsed ?? false,
          options: normalizedQuestion.options.map((option) => ({
            ...option,
            navigation: createNavigationRule(),
          })),
        };
      }

      return {
        ...normalizedQuestion,
        isCollapsed: normalizedQuestion.isCollapsed ?? false,
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

export const serializeFormDefinition = (form: FormDefinition): PersistedFormDefinition => ({
  title: form.title,
  description: form.description,
  i18n: form.i18n,
  translations: form.translations,
  blocks: form.blocks.map(
    (block): PersistedFormBlock => ({
      id: block.id,
      afterBlock: block.afterBlock,
      questions: block.questions.map(
        (question): PersistedFormQuestion => {
          switch (question.type) {
            case "content":
              return {
                id: question.id,
                type: "content",
                content: question.content,
              };
            case "text":
              return {
                id: question.id,
                type: "text",
                title: question.title,
                required: question.required,
                multilineText: question.multilineText,
                placeholder: question.placeholder,
              };
            case "single_choice":
              return {
                id: question.id,
                type: "single_choice",
                title: question.title,
                required: question.required,
                showAsDropdown: question.showAsDropdown,
                routeByAnswer: question.routeByAnswer,
                allowOther: question.allowOther,
                ...(question.allowOther && question.otherOptionLabel
                  ? {
                      otherOptionLabel: question.otherOptionLabel,
                    }
                  : {}),
                ...(question.allowOther && question.routeByAnswer
                  ? {
                      otherOptionNavigation: question.otherOptionNavigation,
                    }
                  : {}),
                options: question.options.map((option) => ({
                  id: option.id,
                  label: option.label,
                  ...(question.routeByAnswer ? { navigation: option.navigation } : {}),
                })),
              };
            case "multiple_choice":
              return {
                id: question.id,
                type: "multiple_choice",
                title: question.title,
                required: question.required,
                allowOther: question.allowOther,
                ...(question.allowOther && question.otherOptionLabel
                  ? {
                      otherOptionLabel: question.otherOptionLabel,
                    }
                  : {}),
                options: question.options.map((option) => ({
                  id: option.id,
                  label: option.label,
                })),
              };
          }
        },
      ),
    }),
  ),
});

export const hydrateFormDefinition = (form: PersistedFormDefinition): FormDefinition =>
  normalizeForm({
    title: form.title,
    description: form.description,
    i18n: form.i18n,
    translations: form.translations,
    blocks: form.blocks.map((block) => ({
      id: block.id,
      afterBlock: block.afterBlock,
      isCollapsed: false,
      questions: block.questions.map((question) => {
        switch (question.type) {
          case "content":
            return {
              ...question,
              isCollapsed: false,
            };
          case "text":
            return {
              ...question,
              isCollapsed: false,
            };
          case "single_choice":
            return {
              ...question,
              otherOptionLabel: question.otherOptionLabel ?? null,
              otherOptionNavigation: question.otherOptionNavigation ?? createNavigationRule(),
              options: question.options.map((option) => ({
                id: option.id,
                label: option.label,
                navigation: option.navigation ?? createNavigationRule(),
              })),
              isCollapsed: false,
            };
          case "multiple_choice":
            return {
              ...question,
              otherOptionLabel: question.otherOptionLabel ?? null,
              options: question.options.map((option) => ({
                id: option.id,
                label: option.label,
                navigation: option.navigation ?? createNavigationRule(),
              })),
              isCollapsed: false,
            };
        }
      }),
    })),
  });

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

  form.blocks.forEach((block, blockIndex) => {
    if (block.afterBlock.mode === "block" && !block.afterBlock.targetBlockId) {
      issues.push(`Block ${blockIndex + 1} is missing an "After block" target.`);
    }

    block.questions.forEach((question) => {
      const questionTitle = getTranslationValue(
        form.translations,
        isContentQuestion(question) ? question.content : question.title,
        previewLanguage,
      );

      if (isChoiceQuestion(question) && question.options.length === 0) {
        issues.push(`Question "${questionTitle || "Untitled question"}" needs at least one option.`);
      }

      if (isSingleChoiceQuestion(question) && question.routeByAnswer) {
        question.options.forEach((option) => {
          const optionLabel = getTranslationValue(form.translations, option.label, previewLanguage);

          if (option.navigation.mode === "block" && !option.navigation.targetBlockId) {
            issues.push(
              `Option "${optionLabel || "Untitled option"}" in "${questionTitle || "Untitled question"}" is missing a target block.`,
            );
          }
        });

        if (question.allowOther && question.otherOptionNavigation.mode === "block" && !question.otherOptionNavigation.targetBlockId) {
          const otherLabel = getTranslationValue(
            form.translations,
            question.otherOptionLabel,
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

export const isSupportedFormDefinition = (value: unknown): value is PersistedFormDefinition => {
  if (!value || typeof value !== "object") {
    return false;
  }

  const candidate = value as Partial<FormDefinition>;
  const supportedQuestionTypes = new Set<QuestionType>([
    "content",
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
        typeof (option as FormOption).label === "string" &&
        ((option as FormOption).navigation === undefined || hasNavigationRule((option as FormOption).navigation)),
    );

  const hasQuestionShape = (question: unknown) =>
    Boolean(question && typeof question === "object" && typeof (question as FormQuestion).id === "string") &&
    (() => {
      const candidateQuestion = question as PersistedFormQuestion;

      if (
        !supportedQuestionTypes.has(candidateQuestion.type)
      ) {
        return false;
      }

      switch (candidateQuestion.type) {
        case "content":
          return typeof candidateQuestion.content === "string";
        case "text":
          return (
            typeof candidateQuestion.title === "string" &&
            typeof candidateQuestion.placeholder === "string" &&
            typeof candidateQuestion.required === "boolean" &&
            typeof candidateQuestion.multilineText === "boolean"
          );
        case "single_choice":
          return (
            typeof candidateQuestion.title === "string" &&
            typeof candidateQuestion.required === "boolean" &&
            typeof candidateQuestion.showAsDropdown === "boolean" &&
            typeof candidateQuestion.routeByAnswer === "boolean" &&
            typeof candidateQuestion.allowOther === "boolean" &&
            Array.isArray(candidateQuestion.options) &&
            candidateQuestion.options.every(hasOptionShape) &&
            (candidateQuestion.otherOptionLabel === undefined ||
              typeof candidateQuestion.otherOptionLabel === "string") &&
            (candidateQuestion.otherOptionNavigation === undefined ||
              hasNavigationRule(candidateQuestion.otherOptionNavigation))
          );
        case "multiple_choice":
          return (
            typeof candidateQuestion.title === "string" &&
            typeof candidateQuestion.required === "boolean" &&
            typeof candidateQuestion.allowOther === "boolean" &&
            Array.isArray(candidateQuestion.options) &&
            candidateQuestion.options.every(hasOptionShape) &&
            (candidateQuestion.otherOptionLabel === undefined ||
              typeof candidateQuestion.otherOptionLabel === "string")
          );
        default:
          return false;
      }
    })();

  const hasBlockShape = (block: unknown) =>
    Boolean(
      block &&
        typeof block === "object" &&
        typeof (block as FormBlock).id === "string" &&
        Array.isArray((block as FormBlock).questions) &&
        (block as FormBlock).questions.every(hasQuestionShape) &&
        hasNavigationRule((block as FormBlock).afterBlock),
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
