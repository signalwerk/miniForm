import { FormEvent, useEffect, useMemo, useState } from "react";
import { Navigate, createBrowserRouter, useNavigate, useParams, useSearchParams } from "react-router-dom";

type TranslationId = string;
type LanguageId = string;

type NavigationMode = "next" | "section" | "submit";

interface NavigationRule {
  mode: NavigationMode;
  targetSectionId: string | null;
}

interface ViewerLanguage {
  id: LanguageId;
  label: string;
}

interface ViewerFormOption {
  id: string;
  label: TranslationId;
  navigation?: NavigationRule;
}

interface ViewerContentBlock {
  id: string;
  type: "content";
  content: TranslationId;
}

interface ViewerTextBlock {
  id: string;
  type: "text";
  title: TranslationId;
  description: TranslationId;
  placeholder: TranslationId;
  required: boolean;
  shortText: boolean;
}

interface ViewerSingleChoiceBlock {
  id: string;
  type: "single_choice";
  title: TranslationId;
  description: TranslationId;
  required: boolean;
  showAsDropdown: boolean;
  routeByAnswer: boolean;
  allowOther: boolean;
  otherOptionLabel?: TranslationId;
  otherOptionNavigation?: NavigationRule;
  options: ViewerFormOption[];
}

interface ViewerMultipleChoiceBlock {
  id: string;
  type: "multiple_choice";
  title: TranslationId;
  description: TranslationId;
  required: boolean;
  allowOther: boolean;
  otherOptionLabel?: TranslationId;
  options: ViewerFormOption[];
}

type ViewerBlock =
  | ViewerContentBlock
  | ViewerTextBlock
  | ViewerSingleChoiceBlock
  | ViewerMultipleChoiceBlock;

interface ViewerSection {
  id: string;
  afterSection: NavigationRule;
  blocks: ViewerBlock[];
}

interface ViewerForm {
  confirmation: {
    content: TranslationId;
  };
  i18n: {
    defaultLanguage: LanguageId;
    languages: ViewerLanguage[];
  };
  sections: ViewerSection[];
  translations: Record<TranslationId, Record<LanguageId, string>>;
}

interface TextAnswer {
  type: "text";
  value: string;
}

interface SingleChoiceAnswer {
  type: "single_choice";
  selectedOptionId: string | null;
  otherValue: string;
}

interface MultipleChoiceAnswer {
  type: "multiple_choice";
  selectedOptionIds: string[];
  otherValue: string;
}

type BlockAnswer = TextAnswer | SingleChoiceAnswer | MultipleChoiceAnswer;
type AnswersState = Record<string, BlockAnswer>;

const resolveApiBaseUrl = () => {
  const fromEnv = import.meta.env.VITE_POCKETBASE_URL;
  if (fromEnv) {
    return fromEnv;
  }

  if (typeof window !== "undefined") {
    return `${window.location.protocol}//${window.location.hostname}:8090`;
  }

  return "http://0.0.0.0:8090";
};

const getTranslation = (form: ViewerForm, translationId: string | undefined, languageId: LanguageId) => {
  if (!translationId) {
    return "";
  }

  return form.translations[translationId]?.[languageId] ?? "";
};

const isTextBlock = (block: ViewerBlock): block is ViewerTextBlock => block.type === "text";
const isContentBlock = (block: ViewerBlock): block is ViewerContentBlock => block.type === "content";
const isSingleChoiceBlock = (block: ViewerBlock): block is ViewerSingleChoiceBlock => block.type === "single_choice";
const isMultipleChoiceBlock = (block: ViewerBlock): block is ViewerMultipleChoiceBlock => block.type === "multiple_choice";

const createInitialAnswer = (block: ViewerBlock): BlockAnswer | null => {
  if (isTextBlock(block)) {
    return {
      type: "text",
      value: "",
    };
  }

  if (isSingleChoiceBlock(block)) {
    return {
      type: "single_choice",
      selectedOptionId: null,
      otherValue: "",
    };
  }

  if (isMultipleChoiceBlock(block)) {
    return {
      type: "multiple_choice",
      selectedOptionIds: [],
      otherValue: "",
    };
  }

  return null;
};

const normalizeAnswers = (form: ViewerForm, currentAnswers: AnswersState) => {
  const nextAnswers: AnswersState = {};

  form.sections.forEach((section) => {
    section.blocks.forEach((block) => {
      const currentAnswer = currentAnswers[block.id];
      const initialAnswer = createInitialAnswer(block);

      if (!initialAnswer) {
        return;
      }

      if (!currentAnswer || currentAnswer.type !== initialAnswer.type) {
        nextAnswers[block.id] = initialAnswer;
        return;
      }

      if (currentAnswer.type === "single_choice") {
        if (!isSingleChoiceBlock(block)) {
          nextAnswers[block.id] = createInitialAnswer(block) ?? currentAnswer;
          return;
        }

        const validOptionIds = new Set(block.options.map((option) => option.id));
        nextAnswers[block.id] = {
          ...currentAnswer,
          selectedOptionId:
            currentAnswer.selectedOptionId && validOptionIds.has(currentAnswer.selectedOptionId)
              ? currentAnswer.selectedOptionId
              : null,
        };
        return;
      }

      if (currentAnswer.type === "multiple_choice") {
        if (!isMultipleChoiceBlock(block)) {
          nextAnswers[block.id] = createInitialAnswer(block) ?? currentAnswer;
          return;
        }

        const validOptionIds = new Set(block.options.map((option) => option.id));
        nextAnswers[block.id] = {
          ...currentAnswer,
          selectedOptionIds: currentAnswer.selectedOptionIds.filter((optionId) => validOptionIds.has(optionId)),
        };
        return;
      }

      nextAnswers[block.id] = currentAnswer;
    });
  });

  return nextAnswers;
};

const getNextTarget = (
  form: ViewerForm,
  currentSectionIndex: number,
  rule: NavigationRule,
): { kind: "section"; sectionId: string } | { kind: "confirmation" } => {
  if (rule.mode === "submit") {
    return { kind: "confirmation" };
  }

  if (rule.mode === "section" && rule.targetSectionId) {
    return { kind: "section", sectionId: rule.targetSectionId };
  }

  const nextSection = form.sections[currentSectionIndex + 1];

  if (!nextSection) {
    return { kind: "confirmation" };
  }

  return { kind: "section", sectionId: nextSection.id };
};

const getSingleChoiceNavigation = (
  form: ViewerForm,
  currentSectionIndex: number,
  block: ViewerSingleChoiceBlock,
  answer: SingleChoiceAnswer,
) => {
  if (!block.routeByAnswer) {
    return getNextTarget(form, currentSectionIndex, form.sections[currentSectionIndex].afterSection);
  }

  if (answer.selectedOptionId) {
    const selectedOption = block.options.find((option) => option.id === answer.selectedOptionId);

    if (selectedOption?.navigation) {
      return getNextTarget(form, currentSectionIndex, selectedOption.navigation);
    }
  }

  if (block.allowOther && !answer.selectedOptionId && answer.otherValue.trim() && block.otherOptionNavigation) {
    return getNextTarget(form, currentSectionIndex, block.otherOptionNavigation);
  }

  return getNextTarget(form, currentSectionIndex, form.sections[currentSectionIndex].afterSection);
};

function SurveyEntryPage() {
  const navigate = useNavigate();
  const { id } = useParams();
  const [searchParams] = useSearchParams();
  const [form, setForm] = useState<ViewerForm | null>(null);
  const [answers, setAnswers] = useState<AnswersState>({});
  const [currentSectionId, setCurrentSectionId] = useState<string | null>(null);
  const [hasSubmitted, setHasSubmitted] = useState(false);
  const [errorMessage, setErrorMessage] = useState("");
  const [isLoading, setIsLoading] = useState(true);

  useEffect(() => {
    let isCancelled = false;

    const loadForm = async () => {
      if (!id) {
        setErrorMessage("Missing survey id.");
        setIsLoading(false);
        return;
      }

      setIsLoading(true);
      setErrorMessage("");

      try {
        const response = await fetch(`${resolveApiBaseUrl()}/api/forms/public/${id}`);

        if (!response.ok) {
          throw new Error("Could not load the survey.");
        }

        const payload = (await response.json()) as ViewerForm;

        if (!isCancelled) {
          setForm(payload);
          setAnswers((currentAnswers) => normalizeAnswers(payload, currentAnswers));
          setCurrentSectionId(payload.sections[0]?.id ?? null);
          setHasSubmitted(false);
          setIsLoading(false);
        }
      } catch (error) {
        if (!isCancelled) {
          setErrorMessage(error instanceof Error ? error.message : "Could not load the survey.");
          setIsLoading(false);
        }
      }
    };

    void loadForm();

    return () => {
      isCancelled = true;
    };
  }, [id]);

  const activeLanguageId = useMemo(() => {
    if (!form) {
      return "";
    }

    const requestedLanguageId = searchParams.get("lang");
    const languageExists = form.i18n.languages.some((language) => language.id === requestedLanguageId);

    return languageExists && requestedLanguageId ? requestedLanguageId : form.i18n.defaultLanguage;
  }, [form, searchParams]);

  const currentSectionIndex = useMemo(() => {
    if (!form || !currentSectionId) {
      return -1;
    }

    return form.sections.findIndex((section) => section.id === currentSectionId);
  }, [form, currentSectionId]);

  const currentSection =
    form && currentSectionIndex >= 0 ? form.sections[currentSectionIndex] : null;

  const setLanguage = (languageId: string) => {
    const nextSearchParams = new URLSearchParams(searchParams);
    nextSearchParams.set("lang", languageId);
    navigate(`/s/${id}?${nextSearchParams.toString()}`, { replace: true });
  };

  const updateTextAnswer = (blockId: string, value: string) => {
    setAnswers((currentAnswers) => ({
      ...currentAnswers,
      [blockId]: {
        type: "text",
        value,
      },
    }));
  };

  const updateSingleChoiceAnswer = (blockId: string, selectedOptionId: string | null) => {
    setAnswers((currentAnswers) => {
      const currentAnswer = currentAnswers[blockId];

      return {
        ...currentAnswers,
        [blockId]: {
          type: "single_choice",
          selectedOptionId,
          otherValue: currentAnswer?.type === "single_choice" ? currentAnswer.otherValue : "",
        },
      };
    });
  };

  const updateSingleChoiceOther = (blockId: string, value: string) => {
    setAnswers((currentAnswers) => {
      return {
        ...currentAnswers,
        [blockId]: {
          type: "single_choice",
          selectedOptionId: null,
          otherValue: value,
        },
      };
    });
  };

  const toggleMultipleChoiceAnswer = (blockId: string, optionId: string, checked: boolean) => {
    setAnswers((currentAnswers) => {
      const currentAnswer = currentAnswers[blockId];
      const selectedOptionIds =
        currentAnswer?.type === "multiple_choice" ? currentAnswer.selectedOptionIds : [];

      return {
        ...currentAnswers,
        [blockId]: {
          type: "multiple_choice",
          selectedOptionIds: checked
            ? [...selectedOptionIds, optionId]
            : selectedOptionIds.filter((currentOptionId) => currentOptionId !== optionId),
          otherValue: currentAnswer?.type === "multiple_choice" ? currentAnswer.otherValue : "",
        },
      };
    });
  };

  const updateMultipleChoiceOther = (blockId: string, value: string) => {
    setAnswers((currentAnswers) => {
      const currentAnswer = currentAnswers[blockId];

      return {
        ...currentAnswers,
        [blockId]: {
          type: "multiple_choice",
          selectedOptionIds: currentAnswer?.type === "multiple_choice" ? currentAnswer.selectedOptionIds : [],
          otherValue: value,
        },
      };
    });
  };

  const validateCurrentSection = () => {
    if (!currentSection || !form) {
      return true;
    }

    for (const block of currentSection.blocks) {
      if (!("required" in block) || !block.required) {
        continue;
      }

      const answer = answers[block.id];

      if (isTextBlock(block)) {
        if (answer?.type !== "text" || !answer.value.trim()) {
          return false;
        }
      }

      if (isSingleChoiceBlock(block)) {
        if (answer?.type !== "single_choice") {
          return false;
        }

        if (!answer.selectedOptionId && !(block.allowOther && answer.otherValue.trim())) {
          return false;
        }
      }

      if (isMultipleChoiceBlock(block)) {
        if (answer?.type !== "multiple_choice") {
          return false;
        }

        const hasSelectedOption = answer.selectedOptionIds.length > 0;
        const hasOther = block.allowOther && answer.otherValue.trim().length > 0;

        if (!hasSelectedOption && !hasOther) {
          return false;
        }
      }
    }

    return true;
  };

  const handleSubmitSection = (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault();

    if (!form || !currentSection || currentSectionIndex < 0) {
      return;
    }

    if (!validateCurrentSection()) {
      setErrorMessage("Please complete all required fields before continuing.");
      return;
    }

    setErrorMessage("");

    const routedBlock = currentSection.blocks.find(
      (block): block is ViewerSingleChoiceBlock => isSingleChoiceBlock(block) && block.routeByAnswer,
    );

    const nextTarget =
      routedBlock && answers[routedBlock.id]?.type === "single_choice"
        ? getSingleChoiceNavigation(
            form,
            currentSectionIndex,
            routedBlock,
            answers[routedBlock.id] as SingleChoiceAnswer,
          )
        : getNextTarget(form, currentSectionIndex, currentSection.afterSection);

    if (nextTarget.kind === "confirmation") {
      setHasSubmitted(true);
      return;
    }

    setCurrentSectionId(nextTarget.sectionId);
  };

  if (isLoading) {
    return <main><p>Loading survey…</p></main>;
  }

  if (!form || errorMessage && !currentSection && !hasSubmitted) {
    return (
      <main>
        <h1>Survey viewer</h1>
        <p>{errorMessage || "Could not load the survey."}</p>
      </main>
    );
  }

  if (hasSubmitted) {
    return (
      <main>
        <header>
          <h1>{getTranslation(form, form.confirmation.content, activeLanguageId)}</h1>
        </header>
      </main>
    );
  }

  if (!currentSection) {
    return (
      <main>
        <h1>Survey viewer</h1>
        <p>This survey has no sections.</p>
      </main>
    );
  }

  return (
    <main>
      <header>
        <h1>Survey</h1>
        <p>ID: {id}</p>
        <div>
          <label htmlFor="viewer-language">Language</label>
          <select
            id="viewer-language"
            value={activeLanguageId}
            onChange={(event) => setLanguage(event.target.value)}
          >
            {form.i18n.languages.map((language) => (
              <option key={language.id} value={language.id}>
                {language.label}
              </option>
            ))}
          </select>
        </div>
      </header>

      <form onSubmit={handleSubmitSection}>
        {currentSection.blocks.map((block) => {
          if (isContentBlock(block)) {
            return (
              <section key={block.id}>
                <p>{getTranslation(form, block.content, activeLanguageId)}</p>
              </section>
            );
          }

          if (isTextBlock(block)) {
            const answer = answers[block.id];
            const value = answer?.type === "text" ? answer.value : "";

            return (
              <section key={block.id}>
                <h2>{getTranslation(form, block.title, activeLanguageId)}</h2>
                <p>{getTranslation(form, block.description, activeLanguageId)}</p>
                {block.shortText ? (
                  <input
                    type="text"
                    value={value}
                    placeholder={getTranslation(form, block.placeholder, activeLanguageId)}
                    onChange={(event) => updateTextAnswer(block.id, event.target.value)}
                  />
                ) : (
                  <textarea
                    rows={5}
                    value={value}
                    placeholder={getTranslation(form, block.placeholder, activeLanguageId)}
                    onChange={(event) => updateTextAnswer(block.id, event.target.value)}
                  />
                )}
              </section>
            );
          }

          if (isSingleChoiceBlock(block)) {
            const answer =
              answers[block.id]?.type === "single_choice"
                ? (answers[block.id] as SingleChoiceAnswer)
                : { type: "single_choice", selectedOptionId: null, otherValue: "" };

            return (
              <section key={block.id}>
                <h2>{getTranslation(form, block.title, activeLanguageId)}</h2>
                <p>{getTranslation(form, block.description, activeLanguageId)}</p>

                {block.showAsDropdown ? (
                  <select
                    value={answer.selectedOptionId ?? ""}
                    onChange={(event) => updateSingleChoiceAnswer(block.id, event.target.value || null)}
                  >
                    <option value="">Select an option</option>
                    {block.options.map((option) => (
                      <option key={option.id} value={option.id}>
                        {getTranslation(form, option.label, activeLanguageId)}
                      </option>
                    ))}
                  </select>
                ) : (
                  <fieldset>
                    <legend>{getTranslation(form, block.title, activeLanguageId)}</legend>
                    {block.options.map((option) => (
                      <label key={option.id}>
                        <input
                          type="radio"
                          name={`block-${block.id}`}
                          checked={answer.selectedOptionId === option.id}
                          onChange={() => updateSingleChoiceAnswer(block.id, option.id)}
                        />
                        <span>{getTranslation(form, option.label, activeLanguageId)}</span>
                      </label>
                    ))}
                    {block.allowOther ? (
                      <label>
                        <input
                          type="radio"
                          name={`block-${block.id}`}
                          checked={!answer.selectedOptionId && answer.otherValue.trim().length > 0}
                          onChange={() => updateSingleChoiceAnswer(block.id, null)}
                        />
                        <span>{getTranslation(form, block.otherOptionLabel, activeLanguageId)}</span>
                        <input
                          type="text"
                          value={answer.otherValue}
                          onChange={(event) => updateSingleChoiceOther(block.id, event.target.value)}
                        />
                      </label>
                    ) : null}
                  </fieldset>
                )}
              </section>
            );
          }

          const answer: MultipleChoiceAnswer =
            answers[block.id]?.type === "multiple_choice"
              ? (answers[block.id] as MultipleChoiceAnswer)
              : { type: "multiple_choice", selectedOptionIds: [], otherValue: "" };

          return (
            <section key={block.id}>
              <h2>{getTranslation(form, block.title, activeLanguageId)}</h2>
              <p>{getTranslation(form, block.description, activeLanguageId)}</p>
              <fieldset>
                <legend>{getTranslation(form, block.title, activeLanguageId)}</legend>
                {block.options.map((option) => (
                  <label key={option.id}>
                    <input
                      type="checkbox"
                      checked={answer.selectedOptionIds.includes(option.id)}
                      onChange={(event) =>
                        toggleMultipleChoiceAnswer(block.id, option.id, event.target.checked)
                      }
                    />
                    <span>{getTranslation(form, option.label, activeLanguageId)}</span>
                  </label>
                ))}
                {block.allowOther ? (
                  <label>
                    <span>{getTranslation(form, block.otherOptionLabel, activeLanguageId)}</span>
                    <input
                      type="text"
                      value={answer.otherValue}
                      onChange={(event) => updateMultipleChoiceOther(block.id, event.target.value)}
                    />
                  </label>
                ) : null}
              </fieldset>
            </section>
          );
        })}

        {errorMessage ? <p>{errorMessage}</p> : null}

        <div>
          <button type="submit">
            {currentSection.afterSection.mode === "submit" ? "Submit" : "Continue"}
          </button>
        </div>
      </form>
    </main>
  );
}

export const router = createBrowserRouter([
  {
    path: "/s/:id",
    element: <SurveyEntryPage />,
  },
  {
    path: "*",
    element: <Navigate to="/s/example" replace />,
  },
]);
