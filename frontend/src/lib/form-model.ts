import type {
  BlockType,
  ChoiceBlock,
  ContentBlock,
  FormDefinition,
  FormLanguage,
  FormBlock,
  FormOption,
  FormSection,
  FormTranslations,
  MultipleChoiceBlock,
  NavigationMode,
  NavigationRule,
  PersistedContentBlock,
  PersistedFormBlock,
  PersistedFormDefinition,
  PersistedFormSection,
  SingleChoiceBlock,
  TextBlock,
  TranslationId,
} from "./types";

const createId = () => {
  const alphabet = "abcdefghijklmnopqrstuvwxyz0123456789";

  if (typeof crypto !== "undefined" && "getRandomValues" in crypto) {
    const bytes = crypto.getRandomValues(new Uint8Array(15));
    return Array.from(bytes, (byte) => alphabet[byte % alphabet.length]).join("");
  }

  return Array.from({ length: 15 }, () => alphabet[Math.floor(Math.random() * alphabet.length)]).join("");
};

export const createTranslationId = () => createId();
export const createLanguageId = () => createId();

export const BLOCK_TYPE_OPTIONS: Array<{ value: BlockType; label: string }> = [
  { value: "content", label: "Content" },
  { value: "text", label: "Text" },
  { value: "single_choice", label: "Single choice" },
  { value: "multiple_choice", label: "Multiple choice" },
];

export const NAVIGATION_OPTIONS: Array<{ value: NavigationMode; label: string }> = [
  { value: "next", label: "Continue to next section" },
  { value: "section", label: "Go to a specific section" },
  { value: "submit", label: "Submit form" },
];

export const blockHasOptions = (type: BlockType) => type === "single_choice" || type === "multiple_choice";

export const blockHasOptionNavigation = (type: BlockType) => type === "single_choice";

export const createNavigationRule = (
  mode: NavigationMode = "next",
  targetSectionId: string | null = null,
): NavigationRule => ({
  mode,
  targetSectionId: mode === "section" ? targetSectionId : null,
});

export const createFormLanguage = (languages: FormLanguage[]): FormLanguage => {
  let nextId = createLanguageId();

  while (languages.some((language) => language.id === nextId)) {
    nextId = createLanguageId();
  }

  return {
    id: nextId,
    label: `Language ${languages.length + 1}`,
  };
};

export const createTranslationEntries = (
  keys: Array<TranslationId | null | undefined>,
): FormTranslations =>
  Object.fromEntries(keys.filter((key): key is TranslationId => Boolean(key)).map((key) => [key, {}]));

export const createOption = (): FormOption => ({
  id: createId(),
  label: createTranslationId(),
  navigation: createNavigationRule(),
});

export const isContentBlock = (
  block: FormBlock | PersistedFormBlock,
): block is ContentBlock | PersistedContentBlock => block.type === "content";

export const isTextBlock = (block: FormBlock | PersistedFormBlock): block is TextBlock => block.type === "text";

export const isSingleChoiceBlock = (
  block: FormBlock | PersistedFormBlock,
): block is SingleChoiceBlock => block.type === "single_choice";

export const isMultipleChoiceBlock = (
  block: FormBlock | PersistedFormBlock,
): block is MultipleChoiceBlock => block.type === "multiple_choice";

export const isChoiceBlock = (
  block: FormBlock | PersistedFormBlock,
): block is ChoiceBlock => isSingleChoiceBlock(block) || isMultipleChoiceBlock(block);

export const createContentBlock = (): ContentBlock => ({
  id: createId(),
  type: "content",
  content: createTranslationId(),
  isCollapsed: false,
});

export const createTextBlock = (): TextBlock => ({
  id: createId(),
  type: "text",
  title: createTranslationId(),
  description: createTranslationId(),
  required: false,
  shortText: false,
  placeholder: createTranslationId(),
  isCollapsed: false,
});

export const createSingleChoiceBlock = (): SingleChoiceBlock => ({
  id: createId(),
  type: "single_choice",
  title: createTranslationId(),
  description: createTranslationId(),
  required: false,
  showAsDropdown: false,
  routeByAnswer: false,
  allowOther: false,
  otherOptionLabel: null,
  otherOptionNavigation: createNavigationRule(),
  options: [createOption(), createOption()],
  isCollapsed: false,
});

export const createMultipleChoiceBlock = (): MultipleChoiceBlock => ({
  id: createId(),
  type: "multiple_choice",
  title: createTranslationId(),
  description: createTranslationId(),
  required: false,
  allowOther: false,
  otherOptionLabel: null,
  options: [createOption(), createOption()],
  isCollapsed: false,
});

export const createBlock = (type: BlockType = "text"): FormBlock => {
  switch (type) {
    case "content":
      return createContentBlock();
    case "single_choice":
      return createSingleChoiceBlock();
    case "multiple_choice":
      return createMultipleChoiceBlock();
    case "text":
    default:
      return createTextBlock();
  }
};

export const createSection = (): FormSection => ({
  id: createId(),
  blocks: [],
  afterSection: createNavigationRule(),
  isCollapsed: false,
});

export const createForm = (): FormDefinition => {
  const defaultLanguage = createLanguageId();

  return {
    title: "",
    description: "",
    i18n: {
      languages: [{ id: defaultLanguage, label: "English" }],
      defaultLanguage,
    },
    translations: {},
    sections: [],
  };
};

const copyTranslationEntry = (translations: FormTranslations, sourceId: TranslationId) => {
  const source = translations[sourceId];

  if (!source) {
    return {};
  }

  return Object.fromEntries(Object.entries(source).map(([languageId, value]) => [languageId, value]));
};

export const duplicateOption = (option: FormOption, translations: FormTranslations) => {
  const label = createTranslationId();

  return {
    option: {
      ...option,
      id: createId(),
      label,
      navigation: { ...option.navigation },
    },
    translations: {
      [label]: copyTranslationEntry(translations, option.label),
    },
  };
};

export const duplicateBlock = (block: FormBlock, translations: FormTranslations) => {
  const content = isContentBlock(block) ? createTranslationId() : null;
  const title = !isContentBlock(block) ? createTranslationId() : null;
  const description = !isContentBlock(block) ? createTranslationId() : null;
  const placeholder = isTextBlock(block) ? createTranslationId() : null;
  const duplicatedOptions = isChoiceBlock(block) ? block.options.map((option) => duplicateOption(option, translations)) : [];
  const otherOptionLabel = isChoiceBlock(block) && block.otherOptionLabel ? createTranslationId() : null;

  return {
    block:
      block.type === "content"
        ? ({
            id: createId(),
            type: "content",
            content: content!,
            isCollapsed: false,
          } satisfies ContentBlock)
        : block.type === "text"
          ? ({
              id: createId(),
              type: "text",
              title: title!,
              description: description!,
              required: block.required,
              shortText: block.shortText,
              placeholder: placeholder!,
              isCollapsed: false,
            } satisfies TextBlock)
          : block.type === "single_choice"
            ? ({
                id: createId(),
                type: "single_choice",
                title: title!,
                description: description!,
                required: block.required,
                showAsDropdown: block.showAsDropdown,
                routeByAnswer: block.routeByAnswer,
                allowOther: block.allowOther,
                otherOptionLabel,
                otherOptionNavigation: { ...block.otherOptionNavigation },
                options: duplicatedOptions.map((entry) => entry.option),
                isCollapsed: false,
              } satisfies SingleChoiceBlock)
            : ({
                id: createId(),
                type: "multiple_choice",
                title: title!,
                description: description!,
                required: block.required,
                allowOther: block.allowOther,
                otherOptionLabel,
                options: duplicatedOptions.map((entry) => entry.option),
                isCollapsed: false,
              } satisfies MultipleChoiceBlock),
    translations: {
      ...(content && isContentBlock(block)
        ? { [content]: copyTranslationEntry(translations, block.content) }
        : {}),
      ...(title && !isContentBlock(block) ? { [title]: copyTranslationEntry(translations, block.title) } : {}),
      ...(description && !isContentBlock(block)
        ? { [description]: copyTranslationEntry(translations, block.description) }
        : {}),
      ...(placeholder && isTextBlock(block)
        ? { [placeholder]: copyTranslationEntry(translations, block.placeholder) }
        : {}),
      ...(otherOptionLabel && isChoiceBlock(block) && block.otherOptionLabel
        ? { [otherOptionLabel]: copyTranslationEntry(translations, block.otherOptionLabel) }
        : {}),
      ...Object.assign({}, ...duplicatedOptions.map((entry) => entry.translations)),
    },
  };
};

export const duplicateSection = (section: FormSection, translations: FormTranslations) => {
  const duplicatedBlocks = section.blocks.map((block) => duplicateBlock(block, translations));

  return {
    section: {
      ...section,
      id: createId(),
      isCollapsed: false,
      afterSection: { ...section.afterSection },
      blocks: duplicatedBlocks.map((entry) => entry.block),
    },
    translations: Object.assign({}, ...duplicatedBlocks.map((entry) => entry.translations)),
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
  translationId: TranslationId | null,
  languageId: string,
) => {
  if (!translationId) {
    return "";
  }

  return translations[translationId]?.[languageId] ?? "";
};

const collectReferencedTranslationIds = (form: FormDefinition) => {
  const ids = new Set<TranslationId>();

  form.sections.forEach((section) => {
    section.blocks.forEach((block) => {
      if (isContentBlock(block)) {
        ids.add(block.content);
      } else {
        ids.add(block.title);
        ids.add(block.description);
      }

      if (isTextBlock(block)) {
        ids.add(block.placeholder);
      }

      if (isChoiceBlock(block)) {
        block.options.forEach((option) => {
          ids.add(option.label);
        });

        if (block.allowOther && block.otherOptionLabel) {
          ids.add(block.otherOptionLabel);
        }
      }
    });
  });

  return ids;
};

export const normalizeNavigationRule = (
  rule: NavigationRule,
  validSectionIds: Set<string>,
): NavigationRule => {
  if (rule.mode === "section") {
    if (!rule.targetSectionId || !validSectionIds.has(rule.targetSectionId)) {
      return createNavigationRule("next");
    }

    return {
      mode: "section",
      targetSectionId: rule.targetSectionId,
    };
  }

  return {
    mode: rule.mode,
    targetSectionId: null,
  };
};

export const normalizeBlockType = (block: FormBlock, nextType: BlockType): FormBlock => {
  const promptTranslation = isContentBlock(block) ? block.content : block.title;
  const descriptionTranslation = !isContentBlock(block) ? block.description : createTranslationId();
  const required = !isContentBlock(block) ? block.required : false;
  const options =
    isChoiceBlock(block) && block.options.length > 0 ? block.options : [createOption(), createOption()];
  const allowOther = isChoiceBlock(block) ? block.allowOther : false;
  const otherOptionLabel = isChoiceBlock(block) ? block.otherOptionLabel : null;

  switch (nextType) {
    case "content":
      return {
        id: block.id,
        type: "content",
        content: promptTranslation,
        isCollapsed: block.isCollapsed,
      };

    case "text":
      return {
        id: block.id,
        type: "text",
        title: isContentBlock(block) ? promptTranslation : block.title,
        description: descriptionTranslation,
        required,
        shortText: isTextBlock(block) ? block.shortText : false,
        placeholder: isTextBlock(block) ? block.placeholder : createTranslationId(),
        isCollapsed: block.isCollapsed,
      };

    case "single_choice": {
      const showAsDropdown = isSingleChoiceBlock(block) ? block.showAsDropdown : false;
      const nextAllowOther = showAsDropdown ? false : isChoiceBlock(block) ? allowOther : false;

      return {
        id: block.id,
        type: "single_choice",
        title: isContentBlock(block) ? promptTranslation : block.title,
        description: descriptionTranslation,
        required,
        showAsDropdown,
        routeByAnswer: isSingleChoiceBlock(block) ? block.routeByAnswer : false,
        allowOther: nextAllowOther,
        otherOptionLabel: nextAllowOther ? otherOptionLabel : null,
        otherOptionNavigation: isSingleChoiceBlock(block)
          ? { ...block.otherOptionNavigation }
          : createNavigationRule(),
        options,
        isCollapsed: block.isCollapsed,
      };
    }

    case "multiple_choice":
      return {
        id: block.id,
        type: "multiple_choice",
        title: isContentBlock(block) ? promptTranslation : block.title,
        description: descriptionTranslation,
        required,
        allowOther,
        otherOptionLabel,
        options,
        isCollapsed: block.isCollapsed,
      };

    default:
      return block;
  }
};

export const normalizeForm = (form: FormDefinition): FormDefinition => {
  const sections = form.sections ?? [];
  const validSectionIds = new Set(sections.map((section) => section.id));
  const validLanguageIds = new Set(form.i18n.languages.map((language) => language.id));

  const normalizedSections = sections.map((section) => ({
    ...section,
    isCollapsed: section.isCollapsed ?? false,
    afterSection: normalizeNavigationRule(section.afterSection, validSectionIds),
    blocks: section.blocks.map((block) => {
      const normalizedBlock = normalizeBlockType(block, block.type);

      if (isSingleChoiceBlock(normalizedBlock)) {
        const allowOther = normalizedBlock.showAsDropdown ? false : normalizedBlock.allowOther;

        return {
          ...normalizedBlock,
          isCollapsed: normalizedBlock.isCollapsed ?? false,
          allowOther,
          otherOptionLabel: allowOther ? normalizedBlock.otherOptionLabel : null,
          otherOptionNavigation:
            allowOther && normalizedBlock.routeByAnswer
              ? normalizeNavigationRule(normalizedBlock.otherOptionNavigation, validSectionIds)
              : createNavigationRule(),
          options: normalizedBlock.options.map((option) => ({
            ...option,
            navigation: normalizedBlock.routeByAnswer
              ? normalizeNavigationRule(option.navigation, validSectionIds)
              : createNavigationRule(),
          })),
        };
      }

      if (isMultipleChoiceBlock(normalizedBlock)) {
        return {
          ...normalizedBlock,
          isCollapsed: normalizedBlock.isCollapsed ?? false,
          options: normalizedBlock.options.map((option) => ({
            ...option,
            navigation: createNavigationRule(),
          })),
        };
      }

      return {
        ...normalizedBlock,
        isCollapsed: normalizedBlock.isCollapsed ?? false,
      };
    }),
  }));

  const normalizedForm: FormDefinition = {
    title: form.title ?? "",
    description: form.description ?? "",
    i18n: {
      languages: form.i18n.languages ?? [],
      defaultLanguage: form.i18n.defaultLanguage ?? "",
    },
    translations: form.translations ?? {},
    sections: normalizedSections,
  };

  const referencedTranslations = collectReferencedTranslationIds(normalizedForm);
  const translations = Object.fromEntries(
    [...referencedTranslations].map((translationId) => [
      translationId,
      Object.fromEntries(
        Object.entries(normalizedForm.translations[translationId] ?? {}).filter(([languageId]) =>
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
  sections: form.sections.map(
    (section): PersistedFormSection => ({
      id: section.id,
      afterSection: section.afterSection,
      blocks: section.blocks.map((block): PersistedFormBlock => {
        switch (block.type) {
          case "content":
            return {
              id: block.id,
              type: "content",
              content: block.content,
            };
          case "text":
            return {
              id: block.id,
              type: "text",
              title: block.title,
              description: block.description,
              required: block.required,
              shortText: block.shortText,
              placeholder: block.placeholder,
            };
          case "single_choice":
            return {
              id: block.id,
              type: "single_choice",
              title: block.title,
              description: block.description,
              required: block.required,
              showAsDropdown: block.showAsDropdown,
              routeByAnswer: block.routeByAnswer,
              allowOther: block.allowOther,
              ...(block.allowOther && block.otherOptionLabel
                ? {
                    otherOptionLabel: block.otherOptionLabel,
                  }
                : {}),
              ...(block.allowOther && block.routeByAnswer
                ? {
                    otherOptionNavigation: block.otherOptionNavigation,
                  }
                : {}),
              options: block.options.map((option) => ({
                id: option.id,
                label: option.label,
                ...(block.routeByAnswer ? { navigation: option.navigation } : {}),
              })),
            };
          case "multiple_choice":
            return {
              id: block.id,
              type: "multiple_choice",
              title: block.title,
              description: block.description,
              required: block.required,
              allowOther: block.allowOther,
              ...(block.allowOther && block.otherOptionLabel
                ? {
                    otherOptionLabel: block.otherOptionLabel,
                  }
                : {}),
              options: block.options.map((option) => ({
                id: option.id,
                label: option.label,
              })),
            };
        }
      }),
    }),
  ),
});

export const hydrateFormDefinition = (form: PersistedFormDefinition): FormDefinition =>
  normalizeForm({
    title: form.title,
    description: form.description,
    i18n: form.i18n,
    translations: form.translations,
    sections: form.sections.map((section) => ({
      id: section.id,
      afterSection: section.afterSection,
      isCollapsed: false,
      blocks: section.blocks.map((block) => {
        switch (block.type) {
          case "content":
            return {
              ...block,
              isCollapsed: false,
            };
          case "text":
            return {
              ...block,
              isCollapsed: false,
            };
          case "single_choice":
            return {
              ...block,
              otherOptionLabel: block.otherOptionLabel ?? null,
              otherOptionNavigation: block.otherOptionNavigation ?? createNavigationRule(),
              options: block.options.map((option) => ({
                id: option.id,
                label: option.label,
                navigation: option.navigation ?? createNavigationRule(),
              })),
              isCollapsed: false,
            };
          case "multiple_choice":
            return {
              ...block,
              otherOptionLabel: block.otherOptionLabel ?? null,
              options: block.options.map((option) => ({
                id: option.id,
                label: option.label,
                navigation: createNavigationRule(),
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
    if (seenIds.has(language.id)) {
      issues.push("Some language IDs are duplicated.");
    } else {
      seenIds.add(language.id);
    }

    if (!language.label.trim()) {
      issues.push(`Language "${language.id}" needs a label.`);
    }
  });

  if (!form.i18n.defaultLanguage || !seenIds.has(form.i18n.defaultLanguage)) {
    issues.push("The default language must match one of the configured languages.");
  }

  return issues;
};

export const validateForm = (form: FormDefinition) => {
  const issues: string[] = [...validateI18nSettings(form)];
  const sectionIds = new Set(form.sections.map((section) => section.id));
  const blockIds = new Set(form.sections.flatMap((section) => section.blocks.map((block) => block.id)));
  const previewLanguage = form.i18n.defaultLanguage;

  form.sections.forEach((section, sectionIndex) => {
    if (section.afterSection.mode === "section" && !section.afterSection.targetSectionId) {
      issues.push(`Section ${sectionIndex + 1} is missing an "After section" target.`);
    }

    section.blocks.forEach((block) => {
      const blockTitle = getTranslationValue(
        form.translations,
        isContentBlock(block) ? block.content : block.title,
        previewLanguage,
      );

      if (isChoiceBlock(block) && block.options.length === 0) {
        issues.push(`Block "${blockTitle || "Untitled block"}" needs at least one option.`);
      }

      if (isSingleChoiceBlock(block) && block.routeByAnswer) {
        block.options.forEach((option) => {
          const optionLabel = getTranslationValue(form.translations, option.label, previewLanguage);

          if (option.navigation.mode === "section" && !option.navigation.targetSectionId) {
            issues.push(
              `Option "${optionLabel || "Untitled option"}" in "${blockTitle || "Untitled block"}" is missing a target section.`,
            );
          }
        });

        if (block.allowOther && block.otherOptionNavigation.mode === "section" && !block.otherOptionNavigation.targetSectionId) {
          const otherLabel = getTranslationValue(form.translations, block.otherOptionLabel, previewLanguage);

          issues.push(
            `"${otherLabel || "Other"}" in "${blockTitle || "Untitled block"}" is missing a target section.`,
          );
        }
      }
    });
  });

  if (sectionIds.size !== form.sections.length) {
    issues.push("Some section IDs are duplicated.");
  }

  if (blockIds.size !== form.sections.flatMap((section) => section.blocks).length) {
    issues.push("Some block IDs are duplicated.");
  }

  return issues;
};

export const isSupportedFormDefinition = (value: unknown): value is PersistedFormDefinition => {
  if (!value || typeof value !== "object") {
    return false;
  }

  const candidate = value as Partial<PersistedFormDefinition>;
  const supportedBlockTypes = new Set<BlockType>(["content", "text", "single_choice", "multiple_choice"]);

  const hasStringMap = (entry: unknown) =>
    Boolean(entry && typeof entry === "object" && Object.values(entry).every((item) => typeof item === "string"));

  const hasNavigationRule = (rule: unknown) =>
    Boolean(
      rule &&
        typeof rule === "object" &&
        ["next", "section", "submit"].includes((rule as NavigationRule).mode) &&
        (typeof (rule as NavigationRule).targetSectionId === "string" ||
          (rule as NavigationRule).targetSectionId === null),
    );

  const hasOptionShape = (option: unknown) =>
    Boolean(
      option &&
        typeof option === "object" &&
        typeof (option as FormOption).id === "string" &&
        typeof (option as FormOption).label === "string" &&
        (((option as FormOption).navigation as unknown) === undefined ||
          hasNavigationRule((option as FormOption).navigation)),
    );

  const hasBlockShape = (block: unknown) =>
    Boolean(block && typeof block === "object" && typeof (block as PersistedFormBlock).id === "string") &&
    (() => {
      const candidateBlock = block as PersistedFormBlock;

      if (!supportedBlockTypes.has(candidateBlock.type)) {
        return false;
      }

      switch (candidateBlock.type) {
        case "content":
          return typeof candidateBlock.content === "string";
        case "text":
          return (
            typeof candidateBlock.title === "string" &&
            typeof candidateBlock.description === "string" &&
            typeof candidateBlock.placeholder === "string" &&
            typeof candidateBlock.required === "boolean" &&
            typeof candidateBlock.shortText === "boolean"
          );
        case "single_choice":
          return (
            typeof candidateBlock.title === "string" &&
            typeof candidateBlock.description === "string" &&
            typeof candidateBlock.required === "boolean" &&
            typeof candidateBlock.showAsDropdown === "boolean" &&
            typeof candidateBlock.routeByAnswer === "boolean" &&
            typeof candidateBlock.allowOther === "boolean" &&
            Array.isArray(candidateBlock.options) &&
            candidateBlock.options.every(hasOptionShape) &&
            (candidateBlock.otherOptionLabel === undefined ||
              typeof candidateBlock.otherOptionLabel === "string") &&
            (candidateBlock.otherOptionNavigation === undefined ||
              hasNavigationRule(candidateBlock.otherOptionNavigation))
          );
        case "multiple_choice":
          return (
            typeof candidateBlock.title === "string" &&
            typeof candidateBlock.description === "string" &&
            typeof candidateBlock.required === "boolean" &&
            typeof candidateBlock.allowOther === "boolean" &&
            Array.isArray(candidateBlock.options) &&
            candidateBlock.options.every(hasOptionShape) &&
            (candidateBlock.otherOptionLabel === undefined ||
              typeof candidateBlock.otherOptionLabel === "string")
          );
        default:
          return false;
      }
    })();

  const hasSectionShape = (section: unknown) =>
    Boolean(
      section &&
        typeof section === "object" &&
        typeof (section as PersistedFormSection).id === "string" &&
        Array.isArray((section as PersistedFormSection).blocks) &&
        (section as PersistedFormSection).blocks.every(hasBlockShape) &&
        hasNavigationRule((section as PersistedFormSection).afterSection),
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
      Array.isArray(candidate.sections) &&
      candidate.sections.every(hasSectionShape),
  );
};
