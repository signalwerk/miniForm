import {
  createBlock,
  createForm,
  createFormLanguage,
  createNavigationRule,
  createOption,
  createSection,
  createTranslationEntries,
  createTranslationId,
  duplicateBlock,
  duplicateSection,
  isChoiceBlock,
  isContentBlock,
  isSingleChoiceBlock,
  isTextBlock,
  moveItem,
  normalizeBlockType,
  normalizeForm,
} from "./form-model";
import type {
  BlockType,
  FormDefinition,
  FormSection,
  LanguageId,
  NavigationRule,
  TranslationId,
} from "./types";

export type FormAction =
  | { type: "replace"; payload: FormDefinition }
  | { type: "set_form_field"; field: "title" | "description"; value: string }
  | { type: "set_form_published"; value: boolean }
  | { type: "add_language" }
  | { type: "update_language_label"; languageId: string; label: string }
  | { type: "delete_language"; languageId: string }
  | { type: "set_default_language"; languageId: string }
  | { type: "update_translation"; translationId: TranslationId; languageId: LanguageId; value: string }
  | { type: "add_section"; afterSectionId?: string }
  | { type: "update_section"; sectionId: string; patch: Partial<FormSection> }
  | { type: "delete_section"; sectionId: string }
  | { type: "duplicate_section"; sectionId: string }
  | { type: "toggle_section"; sectionId: string }
  | { type: "move_section"; fromIndex: number; toIndex: number }
  | { type: "add_block"; sectionId: string; blockType?: BlockType }
  | { type: "set_block_type"; sectionId: string; blockId: string; blockType: BlockType }
  | {
      type: "set_block_toggle";
      sectionId: string;
      blockId: string;
      field: "required" | "shortText" | "showAsDropdown" | "allowOther" | "routeByAnswer";
      value: boolean;
    }
  | { type: "delete_block"; sectionId: string; blockId: string }
  | { type: "duplicate_block"; sectionId: string; blockId: string }
  | { type: "toggle_block"; sectionId: string; blockId: string }
  | { type: "move_block"; sectionId: string; fromIndex: number; toIndex: number }
  | { type: "set_section_rule"; sectionId: string; rule: NavigationRule }
  | { type: "add_option"; sectionId: string; blockId: string }
  | { type: "delete_option"; sectionId: string; blockId: string; optionId: string }
  | { type: "move_option"; sectionId: string; blockId: string; fromIndex: number; toIndex: number }
  | { type: "set_option_rule"; sectionId: string; blockId: string; optionId: string; rule: NavigationRule }
  | { type: "set_other_option_rule"; sectionId: string; blockId: string; rule: NavigationRule }
  | { type: "reset" };

const updateSections = (
  form: FormDefinition,
  sectionId: string,
  updater: (section: FormSection) => FormSection,
) => ({
  ...form,
  sections: form.sections.map((section) => (section.id === sectionId ? updater(section) : section)),
});

export const formReducer = (state: FormDefinition, action: FormAction): FormDefinition => {
  switch (action.type) {
    case "replace":
      return normalizeForm(action.payload);

    case "set_form_field":
      return {
        ...state,
        [action.field]: action.value,
      };

    case "set_form_published":
      return {
        ...state,
        published: action.value,
      };

    case "add_language": {
      const language = createFormLanguage(state.i18n.languages);

      return normalizeForm({
        ...state,
        i18n: {
          ...state.i18n,
          languages: [...state.i18n.languages, language],
        },
      });
    }

    case "update_language_label":
      return normalizeForm({
        ...state,
        i18n: {
          ...state.i18n,
          languages: state.i18n.languages.map((language) =>
            language.id === action.languageId
              ? {
                  ...language,
                  label: action.label,
                }
              : language,
          ),
        },
      });

    case "delete_language": {
      if (state.i18n.languages.length <= 1) {
        return state;
      }

      const remainingLanguages = state.i18n.languages.filter((language) => language.id !== action.languageId);
      const translations = Object.fromEntries(
        Object.entries(state.translations).map(([translationId, values]) => [
          translationId,
          Object.fromEntries(Object.entries(values).filter(([languageId]) => languageId !== action.languageId)),
        ]),
      );

      return normalizeForm({
        ...state,
        translations,
        i18n: {
          languages: remainingLanguages,
          defaultLanguage:
            state.i18n.defaultLanguage === action.languageId
              ? remainingLanguages[0]?.id ?? ""
              : state.i18n.defaultLanguage,
        },
      });
    }

    case "set_default_language":
      return normalizeForm({
        ...state,
        i18n: {
          ...state.i18n,
          defaultLanguage: action.languageId,
        },
      });

    case "update_translation": {
      const currentValues = state.translations[action.translationId] ?? {};

      return {
        ...state,
        translations: {
          ...state.translations,
          [action.translationId]: {
            ...currentValues,
            [action.languageId]: action.value,
          },
        },
      };
    }

    case "add_section": {
      const newSection = createSection();
      const index = action.afterSectionId
        ? state.sections.findIndex((section) => section.id === action.afterSectionId)
        : state.sections.length - 1;
      const nextSections = [...state.sections];
      nextSections.splice(index + 1, 0, newSection);
      return normalizeForm({ ...state, sections: nextSections });
    }

    case "update_section":
      return normalizeForm(
        updateSections(state, action.sectionId, (section) => ({
          ...section,
          ...action.patch,
        })),
      );

    case "delete_section":
      return normalizeForm({
        ...state,
        sections: state.sections.filter((section) => section.id !== action.sectionId),
      });

    case "duplicate_section": {
      const index = state.sections.findIndex((section) => section.id === action.sectionId);
      if (index === -1) {
        return state;
      }

      const duplicated = duplicateSection(state.sections[index], state.translations);
      const nextSections = [...state.sections];
      nextSections.splice(index + 1, 0, duplicated.section);

      return normalizeForm({
        ...state,
        translations: {
          ...state.translations,
          ...duplicated.translations,
        },
        sections: nextSections,
      });
    }

    case "toggle_section":
      return normalizeForm(
        updateSections(state, action.sectionId, (section) => ({
          ...section,
          isCollapsed: !section.isCollapsed,
        })),
      );

    case "move_section":
      return normalizeForm({
        ...state,
        sections: moveItem(state.sections, action.fromIndex, action.toIndex),
      });

    case "add_block": {
      const block = createBlock(action.blockType);
      const blockTranslationEntries = createTranslationEntries([
        ...(isContentBlock(block) ? [block.content] : [block.title, block.description]),
        ...(isTextBlock(block) ? [block.placeholder] : []),
        ...(isChoiceBlock(block) ? block.options.map((option) => option.label) : []),
      ]);

      return normalizeForm(
        updateSections(
          {
            ...state,
            translations: {
              ...state.translations,
              ...blockTranslationEntries,
            },
          },
          action.sectionId,
          (section) => ({
            ...section,
            isCollapsed: false,
            blocks: [...section.blocks, block],
          }),
        ),
      );
    }

    case "set_block_type": {
      const nextState = normalizeForm(
        updateSections(state, action.sectionId, (section) => ({
          ...section,
          blocks: section.blocks.map((block) =>
            block.id === action.blockId ? normalizeBlockType(block, action.blockType) : block,
          ),
        })),
      );

      const targetBlock = nextState.sections
        .flatMap((section) => section.blocks)
        .find((block) => block.id === action.blockId);

      if (!targetBlock) {
        return nextState;
      }

      return {
        ...nextState,
        translations: {
          ...nextState.translations,
          ...createTranslationEntries([
            ...(isContentBlock(targetBlock) ? [targetBlock.content] : [targetBlock.title, targetBlock.description]),
            ...(isTextBlock(targetBlock) ? [targetBlock.placeholder] : []),
            ...(isChoiceBlock(targetBlock) ? targetBlock.options.map((option) => option.label) : []),
            ...(isChoiceBlock(targetBlock) && targetBlock.otherOptionLabel ? [targetBlock.otherOptionLabel] : []),
          ]),
        },
      };
    }

    case "set_block_toggle": {
      const nextState = normalizeForm(
        updateSections(state, action.sectionId, (section) => ({
          ...section,
          blocks: section.blocks.map((block) => {
            if (block.id !== action.blockId) {
              return block;
            }

            if (action.field === "allowOther") {
              if (!isChoiceBlock(block)) {
                return block;
              }

              return isSingleChoiceBlock(block)
                ? {
                    ...block,
                    allowOther: action.value,
                    otherOptionLabel:
                      action.value && !block.otherOptionLabel
                        ? createTranslationId()
                        : action.value
                          ? block.otherOptionLabel
                          : null,
                    otherOptionNavigation: action.value ? block.otherOptionNavigation : createNavigationRule(),
                  }
                : {
                    ...block,
                    allowOther: action.value,
                    otherOptionLabel:
                      action.value && !block.otherOptionLabel
                        ? createTranslationId()
                        : action.value
                          ? block.otherOptionLabel
                          : null,
                  };
            }

            if (action.field === "showAsDropdown") {
              if (!isSingleChoiceBlock(block)) {
                return block;
              }

              return {
                ...block,
                showAsDropdown: action.value,
                allowOther: action.value ? false : block.allowOther,
                otherOptionLabel: action.value ? null : block.otherOptionLabel,
                otherOptionNavigation: action.value ? createNavigationRule() : block.otherOptionNavigation,
              };
            }

            if (action.field === "routeByAnswer") {
              if (!isSingleChoiceBlock(block)) {
                return block;
              }

              return {
                ...block,
                routeByAnswer: action.value,
              };
            }

            if (action.field === "shortText") {
              if (!isTextBlock(block)) {
                return block;
              }

              return {
                ...block,
                shortText: action.value,
              };
            }

            if (action.field === "required") {
              if (isContentBlock(block)) {
                return block;
              }

              return {
                ...block,
                required: action.value,
              };
            }

            return block;
          }),
        })),
      );

      const targetBlock = nextState.sections
        .flatMap((section) => section.blocks)
        .find((block) => block.id === action.blockId);

      if (!targetBlock || !isChoiceBlock(targetBlock) || !targetBlock.otherOptionLabel) {
        return nextState;
      }

      return {
        ...nextState,
        translations: {
          ...nextState.translations,
          ...createTranslationEntries([targetBlock.otherOptionLabel]),
        },
      };
    }

    case "delete_block":
      return normalizeForm(
        updateSections(state, action.sectionId, (section) => ({
          ...section,
          blocks: section.blocks.filter((block) => block.id !== action.blockId),
        })),
      );

    case "duplicate_block":
      return (() => {
        const section = state.sections.find((entry) => entry.id === action.sectionId);
        if (!section) {
          return state;
        }

        const index = section.blocks.findIndex((block) => block.id === action.blockId);
        if (index === -1) {
          return state;
        }

        const duplicated = duplicateBlock(section.blocks[index], state.translations);

        return normalizeForm(
          updateSections(
            {
              ...state,
              translations: {
                ...state.translations,
                ...duplicated.translations,
              },
            },
            action.sectionId,
            (currentSection) => {
              if (currentSection.id !== action.sectionId) {
                return currentSection;
              }

              const nextBlocks = [...currentSection.blocks];
              nextBlocks.splice(index + 1, 0, duplicated.block);

              return {
                ...currentSection,
                blocks: nextBlocks,
              };
            },
          ),
        );
      })();

    case "toggle_block":
      return normalizeForm(
        updateSections(state, action.sectionId, (section) => ({
          ...section,
          blocks: section.blocks.map((block) =>
            block.id === action.blockId
              ? {
                  ...block,
                  isCollapsed: !block.isCollapsed,
                }
              : block,
          ),
        })),
      );

    case "move_block":
      return normalizeForm(
        updateSections(state, action.sectionId, (section) => ({
          ...section,
          blocks: moveItem(section.blocks, action.fromIndex, action.toIndex),
        })),
      );

    case "set_section_rule":
      return normalizeForm(
        updateSections(state, action.sectionId, (section) => ({
          ...section,
          afterSection: action.rule,
        })),
      );

    case "add_option": {
      const option = createOption();

      return normalizeForm(
        updateSections(
          {
            ...state,
            translations: {
              ...state.translations,
              ...createTranslationEntries([option.label]),
            },
          },
          action.sectionId,
          (section) => ({
            ...section,
            blocks: section.blocks.map((block) =>
              block.id === action.blockId && isChoiceBlock(block)
                ? {
                    ...block,
                    options: [...block.options, option],
                  }
                : block,
            ),
          }),
        ),
      );
    }

    case "delete_option":
      return normalizeForm(
        updateSections(state, action.sectionId, (section) => ({
          ...section,
          blocks: section.blocks.map((block) =>
            block.id === action.blockId && isChoiceBlock(block)
              ? {
                  ...block,
                  options: block.options.filter((option) => option.id !== action.optionId),
                }
              : block,
          ),
        })),
      );

    case "move_option":
      return normalizeForm(
        updateSections(state, action.sectionId, (section) => ({
          ...section,
          blocks: section.blocks.map((block) =>
            block.id === action.blockId && isChoiceBlock(block)
              ? {
                  ...block,
                  options: moveItem(block.options, action.fromIndex, action.toIndex),
                }
              : block,
          ),
        })),
      );

    case "set_option_rule":
      return normalizeForm(
        updateSections(state, action.sectionId, (section) => ({
          ...section,
          blocks: section.blocks.map((block) =>
            block.id === action.blockId && isChoiceBlock(block)
              ? {
                  ...block,
                  options: block.options.map((option) =>
                    option.id === action.optionId
                      ? {
                          ...option,
                          navigation: action.rule,
                        }
                      : option,
                  ),
                }
              : block,
          ),
        })),
      );

    case "set_other_option_rule":
      return normalizeForm(
        updateSections(state, action.sectionId, (section) => ({
          ...section,
          blocks: section.blocks.map((block) =>
            block.id === action.blockId && isSingleChoiceBlock(block)
              ? {
                  ...block,
                  otherOptionNavigation: action.rule,
                }
              : block,
          ),
        })),
      );

    case "reset":
      return createForm();

    default:
      return state;
  }
};

export const getInitialFormState = () => createForm();
