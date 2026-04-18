import {
  createBlock,
  createForm,
  createFormLanguage,
  createNavigationRule,
  createOption,
  createQuestion,
  createTranslationEntries,
  createTranslationKey,
  duplicateBlock,
  duplicateQuestion,
  moveItem,
  normalizeForm,
  normalizeQuestionType,
  supportsOptions,
} from "./form-model";
import type {
  FormBlock,
  FormDefinition,
  LanguageId,
  NavigationRule,
  QuestionType,
  TranslationKey,
} from "./types";

export type FormAction =
  | { type: "replace"; payload: FormDefinition }
  | { type: "set_form_field"; field: "title" | "description"; value: string }
  | { type: "add_language" }
  | { type: "update_language_label"; languageId: string; label: string }
  | { type: "delete_language"; languageId: string }
  | { type: "set_default_language"; languageId: string }
  | { type: "update_translation"; translationKey: TranslationKey; languageId: LanguageId; value: string }
  | { type: "add_block"; afterBlockId?: string }
  | { type: "update_block"; blockId: string; patch: Partial<FormBlock> }
  | { type: "delete_block"; blockId: string }
  | { type: "duplicate_block"; blockId: string }
  | { type: "toggle_block"; blockId: string }
  | { type: "move_block"; fromIndex: number; toIndex: number }
  | { type: "add_question"; blockId: string; questionType?: QuestionType }
  | { type: "set_question_type"; blockId: string; questionId: string; questionType: QuestionType }
  | {
      type: "set_question_toggle";
      blockId: string;
      questionId: string;
      field: "required" | "multilineText" | "showAsDropdown" | "allowOther" | "routeByAnswer";
      value: boolean;
    }
  | { type: "delete_question"; blockId: string; questionId: string }
  | { type: "duplicate_question"; blockId: string; questionId: string }
  | { type: "toggle_question"; blockId: string; questionId: string }
  | { type: "move_question"; blockId: string; fromIndex: number; toIndex: number }
  | { type: "set_block_rule"; blockId: string; rule: NavigationRule }
  | { type: "add_option"; blockId: string; questionId: string }
  | { type: "delete_option"; blockId: string; questionId: string; optionId: string }
  | { type: "move_option"; blockId: string; questionId: string; fromIndex: number; toIndex: number }
  | { type: "set_option_rule"; blockId: string; questionId: string; optionId: string; rule: NavigationRule }
  | { type: "set_other_option_rule"; blockId: string; questionId: string; rule: NavigationRule }
  | { type: "reset" };

const updateBlocks = (
  form: FormDefinition,
  blockId: string,
  updater: (block: FormBlock) => FormBlock,
) => ({
  ...form,
  blocks: form.blocks.map((block) => (block.id === blockId ? updater(block) : block)),
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
        Object.entries(state.translations).map(([translationKey, values]) => [
          translationKey,
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
      const currentValues = state.translations[action.translationKey] ?? {};

      return {
        ...state,
        translations: {
          ...state.translations,
          [action.translationKey]: {
            ...currentValues,
            [action.languageId]: action.value,
          },
        },
      };
    }

    case "add_block": {
      const newBlock = createBlock();
      const index = action.afterBlockId
        ? state.blocks.findIndex((block) => block.id === action.afterBlockId)
        : state.blocks.length - 1;
      const nextBlocks = [...state.blocks];
      nextBlocks.splice(index + 1, 0, newBlock);
      return normalizeForm({ ...state, blocks: nextBlocks });
    }

    case "update_block":
      return normalizeForm(
        updateBlocks(state, action.blockId, (block) => ({
          ...block,
          ...action.patch,
        })),
      );

    case "delete_block": {
      const nextBlocks = state.blocks.filter((block) => block.id !== action.blockId);
      return normalizeForm({
        ...state,
        blocks: nextBlocks.length > 0 ? nextBlocks : [createBlock()],
      });
    }

    case "duplicate_block": {
      const index = state.blocks.findIndex((block) => block.id === action.blockId);
      if (index === -1) {
        return state;
      }

      const duplicated = duplicateBlock(state.blocks[index], state.translations);
      const nextBlocks = [...state.blocks];
      nextBlocks.splice(index + 1, 0, duplicated.block);

      return normalizeForm({
        ...state,
        translations: {
          ...state.translations,
          ...duplicated.translations,
        },
        blocks: nextBlocks,
      });
    }

    case "toggle_block":
      return normalizeForm(
        updateBlocks(state, action.blockId, (block) => ({
          ...block,
          isCollapsed: !block.isCollapsed,
        })),
      );

    case "move_block":
      return normalizeForm({
        ...state,
        blocks: moveItem(state.blocks, action.fromIndex, action.toIndex),
      });

    case "add_question": {
      const question = createQuestion(action.questionType);
      const questionTranslationEntries = createTranslationEntries([
        question.titleKey,
        question.descriptionKey,
        ...question.options.map((option) => option.labelKey),
      ]);

      return normalizeForm(
        updateBlocks(
          {
            ...state,
            translations: {
              ...state.translations,
              ...questionTranslationEntries,
            },
          },
          action.blockId,
          (block) => ({
            ...block,
            isCollapsed: false,
            questions: [...block.questions, question],
          }),
        ),
      );
    }

    case "set_question_type":
      return normalizeForm(
        updateBlocks(state, action.blockId, (block) => ({
          ...block,
          questions: block.questions.map((question) =>
            question.id === action.questionId
              ? normalizeQuestionType(question, action.questionType)
              : question,
          ),
        })),
      );

    case "set_question_toggle": {
      const nextState = normalizeForm(
        updateBlocks(state, action.blockId, (block) => ({
          ...block,
          questions: block.questions.map((question) => {
            if (question.id !== action.questionId) {
              return question;
            }

            if (action.field === "allowOther") {
              return {
                ...question,
                allowOther: supportsOptions(question.type) ? action.value : false,
                otherOptionLabelKey:
                  action.value && !question.otherOptionLabelKey
                    ? createTranslationKey()
                    : action.value
                      ? question.otherOptionLabelKey
                      : null,
                otherOptionNavigation: action.value ? question.otherOptionNavigation : createNavigationRule(),
              };
            }

            if (action.field === "showAsDropdown") {
              return {
                ...question,
                showAsDropdown: question.type === "single_choice" ? action.value : false,
                allowOther: action.value ? false : question.allowOther,
                otherOptionLabelKey: action.value ? null : question.otherOptionLabelKey,
                otherOptionNavigation: action.value ? createNavigationRule() : question.otherOptionNavigation,
              };
            }

            if (action.field === "routeByAnswer") {
              return {
                ...question,
                routeByAnswer: question.type === "single_choice" ? action.value : false,
              };
            }

            if (action.field === "multilineText") {
              return {
                ...question,
                multilineText: question.type === "text" ? action.value : false,
              };
            }

            if (action.field === "required") {
              return {
                ...question,
                required: question.type === "title_description" ? false : action.value,
              };
            }

            return question;
          }),
        })),
      );

      const targetQuestion = nextState.blocks
        .flatMap((block) => block.questions)
        .find((question) => question.id === action.questionId);

      if (!targetQuestion?.otherOptionLabelKey) {
        return nextState;
      }

      return {
        ...nextState,
        translations: {
          ...nextState.translations,
          ...createTranslationEntries([targetQuestion.otherOptionLabelKey]),
        },
      };
    }

    case "delete_question":
      return normalizeForm(
        updateBlocks(state, action.blockId, (block) => ({
          ...block,
          questions: block.questions.filter((question) => question.id !== action.questionId),
        })),
      );

    case "duplicate_question":
      return (() => {
        const block = state.blocks.find((entry) => entry.id === action.blockId);
        if (!block) {
          return state;
        }

        const index = block.questions.findIndex((question) => question.id === action.questionId);
        if (index === -1) {
          return state;
        }

        const duplicated = duplicateQuestion(block.questions[index], state.translations);

        return normalizeForm(
          updateBlocks(
            {
              ...state,
              translations: {
                ...state.translations,
                ...duplicated.translations,
              },
            },
            action.blockId,
            (currentBlock) => {
              if (currentBlock.id !== action.blockId) {
                return currentBlock;
              }

              const nextQuestions = [...currentBlock.questions];
              nextQuestions.splice(index + 1, 0, duplicated.question);

              return {
                ...currentBlock,
                questions: nextQuestions,
              };
            },
          ),
        );
      })();

    case "toggle_question":
      return normalizeForm(
        updateBlocks(state, action.blockId, (block) => ({
          ...block,
          questions: block.questions.map((question) =>
            question.id === action.questionId
              ? {
                  ...question,
                  isCollapsed: !question.isCollapsed,
                }
              : question,
          ),
        })),
      );

    case "move_question":
      return normalizeForm(
        updateBlocks(state, action.blockId, (block) => ({
          ...block,
          questions: moveItem(block.questions, action.fromIndex, action.toIndex),
        })),
      );

    case "set_block_rule":
      return normalizeForm(
        updateBlocks(state, action.blockId, (block) => ({
          ...block,
          afterBlock: action.rule,
        })),
      );

    case "add_option": {
      const option = createOption();

      return normalizeForm(
        updateBlocks(
          {
            ...state,
            translations: {
              ...state.translations,
              ...createTranslationEntries([option.labelKey]),
            },
          },
          action.blockId,
          (block) => ({
            ...block,
            questions: block.questions.map((question) =>
              question.id === action.questionId
                ? {
                    ...question,
                    options: [...question.options, option],
                  }
                : question,
            ),
          }),
        ),
      );
    }

    case "delete_option":
      return normalizeForm(
        updateBlocks(state, action.blockId, (block) => ({
          ...block,
          questions: block.questions.map((question) =>
            question.id === action.questionId
              ? {
                  ...question,
                  options: question.options.filter((option) => option.id !== action.optionId),
                }
              : question,
          ),
        })),
      );

    case "move_option":
      return normalizeForm(
        updateBlocks(state, action.blockId, (block) => ({
          ...block,
          questions: block.questions.map((question) =>
            question.id === action.questionId
              ? {
                  ...question,
                  options: moveItem(question.options, action.fromIndex, action.toIndex),
                }
              : question,
          ),
        })),
      );

    case "set_option_rule":
      return normalizeForm(
        updateBlocks(state, action.blockId, (block) => ({
          ...block,
          questions: block.questions.map((question) =>
            question.id === action.questionId
              ? {
                  ...question,
                  options: question.options.map((option) =>
                    option.id === action.optionId
                      ? {
                          ...option,
                          navigation: action.rule,
                        }
                      : option,
                  ),
                }
              : question,
          ),
        })),
      );

    case "set_other_option_rule":
      return normalizeForm(
        updateBlocks(state, action.blockId, (block) => ({
          ...block,
          questions: block.questions.map((question) =>
            question.id === action.questionId
              ? {
                  ...question,
                  otherOptionNavigation: action.rule,
                }
              : question,
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
