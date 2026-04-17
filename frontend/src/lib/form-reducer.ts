import {
  cloneBlock,
  cloneQuestion,
  createBlock,
  createForm,
  createNavigationRule,
  createOption,
  createQuestion,
  moveItem,
  normalizeForm,
  normalizeQuestionType,
  supportsOptions,
} from "./form-model";
import type { FormBlock, FormDefinition, NavigationRule, QuestionType } from "./types";

export type FormAction =
  | { type: "replace"; payload: FormDefinition }
  | { type: "set_form_field"; field: "title" | "description"; value: string }
  | { type: "add_block"; afterBlockId?: string }
  | { type: "update_block"; blockId: string; patch: Partial<FormBlock> }
  | { type: "delete_block"; blockId: string }
  | { type: "duplicate_block"; blockId: string }
  | { type: "toggle_block"; blockId: string }
  | { type: "move_block"; fromIndex: number; toIndex: number }
  | { type: "add_question"; blockId: string; questionType?: QuestionType }
  | {
      type: "update_question_field";
      blockId: string;
      questionId: string;
      field: "title" | "description" | "otherOptionLabel";
      value: string;
    }
  | { type: "set_question_type"; blockId: string; questionId: string; questionType: QuestionType }
  | {
      type: "set_question_toggle";
      blockId: string;
      questionId: string;
      field: "required" | "allowOther" | "routeByAnswer";
      value: boolean;
    }
  | { type: "delete_question"; blockId: string; questionId: string }
  | { type: "duplicate_question"; blockId: string; questionId: string }
  | { type: "toggle_question"; blockId: string; questionId: string }
  | { type: "move_question"; blockId: string; fromIndex: number; toIndex: number }
  | { type: "set_block_rule"; blockId: string; rule: NavigationRule }
  | { type: "add_option"; blockId: string; questionId: string }
  | { type: "update_option"; blockId: string; questionId: string; optionId: string; value: string }
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

      const nextBlocks = [...state.blocks];
      nextBlocks.splice(index + 1, 0, cloneBlock(state.blocks[index]));
      return normalizeForm({ ...state, blocks: nextBlocks });
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

    case "add_question":
      return normalizeForm(
        updateBlocks(state, action.blockId, (block) => ({
          ...block,
          isCollapsed: false,
          questions: [...block.questions, createQuestion(action.questionType)],
        })),
      );

    case "update_question_field":
      return normalizeForm(
        updateBlocks(state, action.blockId, (block) => ({
          ...block,
          questions: block.questions.map((question) =>
            question.id === action.questionId
              ? {
                  ...question,
                  [action.field]: action.value,
                }
              : question,
          ),
        })),
      );

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

    case "set_question_toggle":
      return normalizeForm(
        updateBlocks(state, action.blockId, (block) => ({
          ...block,
          questions: block.questions.map((question) =>
            question.id === action.questionId
              ? {
                  ...question,
                  [action.field]:
                    action.field === "allowOther" && !supportsOptions(question.type)
                      ? false
                      : action.field === "routeByAnswer" &&
                          !(question.type === "single_choice" || question.type === "dropdown")
                        ? false
                        : action.value,
                  otherOptionLabel:
                    action.field === "allowOther" && action.value && !question.otherOptionLabel
                      ? "Other"
                      : question.otherOptionLabel,
                  otherOptionNavigation:
                    action.field === "allowOther" && !action.value
                      ? createNavigationRule()
                      : question.otherOptionNavigation,
                }
              : question,
          ),
        })),
      );

    case "delete_question":
      return normalizeForm(
        updateBlocks(state, action.blockId, (block) => ({
          ...block,
          questions: block.questions.filter((question) => question.id !== action.questionId),
        })),
      );

    case "duplicate_question":
      return normalizeForm(
        updateBlocks(state, action.blockId, (block) => {
          const index = block.questions.findIndex((question) => question.id === action.questionId);
          if (index === -1) {
            return block;
          }

          const nextQuestions = [...block.questions];
          nextQuestions.splice(index + 1, 0, cloneQuestion(block.questions[index]));
          return {
            ...block,
            questions: nextQuestions,
          };
        }),
      );

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

    case "add_option":
      return normalizeForm(
        updateBlocks(state, action.blockId, (block) => ({
          ...block,
          questions: block.questions.map((question) =>
            question.id === action.questionId
              ? {
                  ...question,
                  options: [...question.options, createOption()],
                }
              : question,
          ),
        })),
      );

    case "update_option":
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
                          label: action.value,
                        }
                      : option,
                  ),
                }
              : question,
          ),
        })),
      );

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

export const getInitialFormState = () => normalizeForm(createForm());

export const createNextNavigation = () => createNavigationRule("next");
