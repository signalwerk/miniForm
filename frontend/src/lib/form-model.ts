import type {
  FormBlock,
  FormDefinition,
  FormOption,
  FormQuestion,
  NavigationMode,
  NavigationRule,
  QuestionType,
} from "./types";

const createId = () => {
  if (typeof crypto !== "undefined" && "randomUUID" in crypto) {
    return crypto.randomUUID();
  }

  return `id-${Math.random().toString(36).slice(2, 11)}`;
};

export const QUESTION_TYPE_OPTIONS: Array<{ value: QuestionType; label: string }> = [
  { value: "title_description", label: "Title & Description" },
  { value: "short_text", label: "Short text" },
  { value: "paragraph", label: "Paragraph" },
  { value: "single_choice", label: "Single choice" },
  { value: "multiple_choice", label: "Multiple choice" },
  { value: "dropdown", label: "Dropdown" },
];

export const NAVIGATION_OPTIONS: Array<{ value: NavigationMode; label: string }> = [
  { value: "next", label: "Continue to next block" },
  { value: "block", label: "Go to a specific block" },
  { value: "submit", label: "Submit form" },
];

export const supportsOptions = (type: QuestionType) =>
  type === "single_choice" || type === "multiple_choice" || type === "dropdown";

export const supportsOptionNavigation = (type: QuestionType) =>
  type === "single_choice" || type === "dropdown";

export const createNavigationRule = (
  mode: NavigationMode = "next",
  targetBlockId: string | null = null,
): NavigationRule => ({
  mode,
  targetBlockId: mode === "block" ? targetBlockId : null,
});

export const createOption = (label = ""): FormOption => ({
  id: createId(),
  label,
  navigation: createNavigationRule(),
});

export const createQuestion = (type: QuestionType = "short_text"): FormQuestion => ({
  id: createId(),
  type,
  title: "",
  description: "",
  required: false,
  allowOther: false,
  otherOptionLabel: "Other",
  otherOptionNavigation: createNavigationRule(),
  routeByAnswer: false,
  options:
    type === "single_choice" || type === "multiple_choice" || type === "dropdown"
      ? [createOption(), createOption()]
      : [],
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

export const createForm = (): FormDefinition => ({
  title: "",
  description: "",
  blocks: [createBlock()],
});

const duplicateOption = (option: FormOption): FormOption => ({
  ...option,
  id: createId(),
});

const duplicateQuestion = (question: FormQuestion): FormQuestion => ({
  ...question,
  id: createId(),
  isCollapsed: false,
  options: question.options.map(duplicateOption),
});

export const cloneBlock = (block: FormBlock): FormBlock => ({
  ...block,
  id: createId(),
  isCollapsed: false,
  questions: block.questions.map(duplicateQuestion),
});

export const cloneQuestion = duplicateQuestion;

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
      allowOther: false,
      otherOptionNavigation: createNavigationRule(),
      routeByAnswer: false,
      required: nextType === "title_description" ? false : (question.required ?? false),
    };
  }

  return {
    ...question,
    type: nextType,
    options: question.options.length > 0 ? question.options : [createOption(), createOption()],
    allowOther:
      nextType === "single_choice" || nextType === "multiple_choice" ? (question.allowOther ?? false) : false,
    otherOptionNavigation:
      nextType === "single_choice" || nextType === "dropdown"
        ? (question.otherOptionNavigation ?? createNavigationRule())
        : createNavigationRule(),
    routeByAnswer:
      nextType === "single_choice" || nextType === "dropdown" ? (question.routeByAnswer ?? false) : false,
  };
};

export const normalizeForm = (form: FormDefinition): FormDefinition => {
  const blocks = form.blocks.length > 0 ? form.blocks : [createBlock()];
  const validBlockIds = new Set(blocks.map((block) => block.id));

  return {
    title: form.title ?? "",
    description: form.description ?? "",
    blocks: blocks.map((block) => ({
      ...block,
      afterBlock: normalizeNavigationRule(block.afterBlock, validBlockIds),
      questions: block.questions.map((question) => {
        const normalizedQuestion = normalizeQuestionType(question, question.type);

        return {
          ...normalizedQuestion,
          otherOptionLabel: normalizedQuestion.otherOptionLabel || "Other",
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
    })),
  };
};

export const validateForm = (form: FormDefinition) => {
  const issues: string[] = [];
  const blockIds = new Set(form.blocks.map((block) => block.id));

  form.blocks.forEach((block) => {
    if (block.afterBlock.mode === "block" && !block.afterBlock.targetBlockId) {
      issues.push(`Block "${block.title || "Untitled block"}" is missing an "After block" target.`);
    }

    block.questions.forEach((question) => {
      if (supportsOptions(question.type) && question.options.length === 0) {
        issues.push(`Question "${question.title || "Untitled question"}" needs at least one option.`);
      }

      if (supportsOptionNavigation(question.type) && question.routeByAnswer) {
        question.options.forEach((option) => {
          if (option.navigation.mode === "block" && !option.navigation.targetBlockId) {
            issues.push(
              `Option "${option.label || "Untitled option"}" in "${question.title || "Untitled question"}" is missing a target block.`,
            );
          }
        });

        if (
          question.allowOther &&
          question.otherOptionNavigation.mode === "block" &&
          !question.otherOptionNavigation.targetBlockId
        ) {
          issues.push(
            `"${question.otherOptionLabel || "Other"}" in "${question.title || "Untitled question"}" is missing a target block.`,
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
