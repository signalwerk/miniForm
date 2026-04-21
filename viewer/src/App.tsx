import { FormEvent, useCallback, useEffect, useMemo, useRef, useState } from "react";
import {
  Navigate,
  createBrowserRouter,
  useNavigate,
  useParams,
  useSearchParams,
} from "react-router-dom";
import { renderMarkdown } from "./lib/markdown";

type TranslationId = string;
type LanguageId = string;
type ViewerLocale = "en_US" | "de_CH" | "fr_CH" | "it_CH";

type NavigationMode = "next" | "section" | "submit";

interface NavigationRule {
  mode: NavigationMode;
  targetSectionId: string | null;
}

interface ViewerLanguage {
  id: LanguageId;
  label: string;
  locale: ViewerLocale;
}

interface ViewerSurveyOption {
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
  options: ViewerSurveyOption[];
}

interface ViewerMultipleChoiceBlock {
  id: string;
  type: "multiple_choice";
  title: TranslationId;
  description: TranslationId;
  required: boolean;
  allowOther: boolean;
  otherOptionLabel?: TranslationId;
  options: ViewerSurveyOption[];
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

interface ViewerSurvey {
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
  isOtherSelected: boolean;
  otherValue: string;
}

interface MultipleChoiceAnswer {
  type: "multiple_choice";
  selectedOptionIds: string[];
  isOtherSelected: boolean;
  otherValue: string;
}

type BlockAnswer = TextAnswer | SingleChoiceAnswer | MultipleChoiceAnswer;
type AnswersState = Record<string, BlockAnswer>;
type ViewerStep =
  | { kind: "section"; sectionId: string }
  | { kind: "confirmation" };

interface SubmissionAnswer {
  id: string;
  label: string;
  value: string | string[];
}

interface EmbeddedHeightMessage {
  type: "iframe-embed:height";
  id: string | null;
  height: number;
}

interface EmbeddedScrollMessage {
  type: "iframe-embed:scroll-top";
  id: string | null;
}

const OTHER_OPTION_VALUE = "__other__";
const DEFAULT_VIEWER_LOCALE: ViewerLocale = "en_US";
const EMBEDDED_HEIGHT_MESSAGE_TYPE = "iframe-embed:height";
const EMBEDDED_SCROLL_MESSAGE_TYPE = "iframe-embed:scroll-top";

const VIEWER_COPY: Record<
  ViewerLocale,
  {
    missingRequiredFields: string;
    continue: string;
    back: string;
    submit: string;
    submitting: string;
    selectOption: string;
    loadingSurvey: string;
    surveyViewer: string;
    missingSurveyId: string;
    couldNotLoadSurvey: string;
    couldNotSubmitSurvey: string;
    survey: string; // not currently used
    language: string;
    thisSurveyHasNoSections: string;
  }
> = {
  en_US: {
    missingRequiredFields: "There are missing required fields.",
    continue: "Continue",
    back: "Back",
    submit: "Submit",
    submitting: "Submitting...",
    selectOption: "Select an option",
    loadingSurvey: "Loading survey…",
    surveyViewer: "Survey viewer",
    missingSurveyId: "Missing survey id.",
    couldNotLoadSurvey: "Could not load the survey.",
    couldNotSubmitSurvey: "Could not submit the survey.",
    survey: "Survey",
    language: "Language",
    thisSurveyHasNoSections: "This survey has no sections.",
  },
  de_CH: {
    missingRequiredFields: "Es fehlen erforderliche Felder.",
    continue: "Weiter",
    back: "Zurück",
    submit: "Absenden",
    submitting: "Wird gesendet...",
    selectOption: "Option auswählen",
    loadingSurvey: "Umfrage wird geladen…",
    surveyViewer: "Umfrageansicht",
    missingSurveyId: "Fehlende Umfrage-ID.",
    couldNotLoadSurvey: "Die Umfrage konnte nicht geladen werden.",
    couldNotSubmitSurvey: "Die Umfrage konnte nicht gesendet werden.",
    survey: "Umfrage",
    language: "Sprache",
    thisSurveyHasNoSections: "Diese Umfrage hat keine Sektionen.",
  },
  fr_CH: {
    missingRequiredFields: "Il manque des champs obligatoires.",
    continue: "Continuer",
    back: "Retour",
    submit: "Envoyer",
    submitting: "Envoi en cours...",
    selectOption: "Choisir une option",
    loadingSurvey: "Chargement du sondage…",
    surveyViewer: "Affichage du sondage",
    missingSurveyId: "Identifiant du sondage manquant.",
    couldNotLoadSurvey: "Impossible de charger le sondage.",
    couldNotSubmitSurvey: "Impossible d’envoyer le sondage.",
    survey: "Sondage",
    language: "Langue",
    thisSurveyHasNoSections: "Ce sondage n’a aucune section.",
  },
  it_CH: {
    missingRequiredFields: "Mancano campi obbligatori.",
    continue: "Continua",
    back: "Indietro",
    submit: "Invia",
    submitting: "Invio in corso...",
    selectOption: "Seleziona un’opzione",
    loadingSurvey: "Caricamento del sondaggio…",
    surveyViewer: "Visualizzazione sondaggio",
    missingSurveyId: "ID del sondaggio mancante.",
    couldNotLoadSurvey: "Impossibile caricare il sondaggio.",
    couldNotSubmitSurvey: "Impossibile inviare il sondaggio.",
    survey: "Sondaggio",
    language: "Lingua",
    thisSurveyHasNoSections: "Questo sondaggio non ha sezioni.",
  },
};

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

const getDocumentHeight = () => {
  if (typeof document === "undefined") {
    return 0;
  }

  const mainElement = document.querySelector("main");

  if (mainElement instanceof HTMLElement) {
    return Math.ceil(mainElement.getBoundingClientRect().height);
  }

  const { body, documentElement } = document;

  return Math.max(
    documentElement?.scrollHeight ?? 0,
    body?.scrollHeight ?? 0,
  );
};

const getTranslation = (
  survey: ViewerSurvey,
  translationId: string | undefined,
  languageId: LanguageId,
) => {
  if (!translationId) {
    return "";
  }

  return survey.translations[translationId]?.[languageId] ?? "";
};

const isContentBlock = (block: ViewerBlock): block is ViewerContentBlock =>
  block.type === "content";
const isTextBlock = (block: ViewerBlock): block is ViewerTextBlock =>
  block.type === "text";
const isSingleChoiceBlock = (
  block: ViewerBlock,
): block is ViewerSingleChoiceBlock => block.type === "single_choice";
const isMultipleChoiceBlock = (
  block: ViewerBlock,
): block is ViewerMultipleChoiceBlock => block.type === "multiple_choice";

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
      isOtherSelected: false,
      otherValue: "",
    };
  }

  if (isMultipleChoiceBlock(block)) {
    return {
      type: "multiple_choice",
      selectedOptionIds: [],
      isOtherSelected: false,
      otherValue: "",
    };
  }

  return null;
};

const normalizeAnswers = (survey: ViewerSurvey, currentAnswers: AnswersState) => {
  const nextAnswers: AnswersState = {};

  survey.sections.forEach((section) => {
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
          nextAnswers[block.id] = initialAnswer;
          return;
        }

        const validOptionIds = new Set(
          block.options.map((option) => option.id),
        );
        nextAnswers[block.id] = {
          ...currentAnswer,
          selectedOptionId:
            currentAnswer.selectedOptionId &&
            validOptionIds.has(currentAnswer.selectedOptionId)
              ? currentAnswer.selectedOptionId
              : null,
        };
        return;
      }

      if (currentAnswer.type === "multiple_choice") {
        if (!isMultipleChoiceBlock(block)) {
          nextAnswers[block.id] = initialAnswer;
          return;
        }

        const validOptionIds = new Set(
          block.options.map((option) => option.id),
        );
        nextAnswers[block.id] = {
          ...currentAnswer,
          selectedOptionIds: currentAnswer.selectedOptionIds.filter(
            (optionId) => validOptionIds.has(optionId),
          ),
        };
        return;
      }

      nextAnswers[block.id] = currentAnswer;
    });
  });

  return nextAnswers;
};

const getSectionById = (survey: ViewerSurvey, sectionId: string | null) =>
  sectionId
    ? (survey.sections.find((section) => section.id === sectionId) ?? null)
    : null;

const getNextStepFromRule = (
  survey: ViewerSurvey,
  currentSectionIndex: number,
  rule: NavigationRule,
): ViewerStep => {
  if (rule.mode === "submit") {
    return { kind: "confirmation" };
  }

  if (rule.mode === "section" && rule.targetSectionId) {
    return { kind: "section", sectionId: rule.targetSectionId };
  }

  const nextSection = survey.sections[currentSectionIndex + 1];

  if (!nextSection) {
    return { kind: "confirmation" };
  }

  return { kind: "section", sectionId: nextSection.id };
};

const getSectionNextStep = (
  survey: ViewerSurvey,
  currentSectionIndex: number,
  answers: AnswersState,
): ViewerStep => {
  const section = survey.sections[currentSectionIndex];

  if (!section) {
    return { kind: "confirmation" };
  }

  const routedBlock = section.blocks.find(
    (block): block is ViewerSingleChoiceBlock =>
      isSingleChoiceBlock(block) && block.routeByAnswer,
  );

  if (!routedBlock) {
    return getNextStepFromRule(survey, currentSectionIndex, section.afterSection);
  }

  const answer = answers[routedBlock.id];

  if (answer?.type === "single_choice") {
    if (answer.selectedOptionId) {
      const selectedOption = routedBlock.options.find(
        (option) => option.id === answer.selectedOptionId,
      );

      if (selectedOption?.navigation) {
        return getNextStepFromRule(
          survey,
          currentSectionIndex,
          selectedOption.navigation,
        );
      }
    }

    if (
      routedBlock.allowOther &&
      answer.isOtherSelected &&
      routedBlock.otherOptionNavigation
    ) {
      return getNextStepFromRule(
        survey,
        currentSectionIndex,
        routedBlock.otherOptionNavigation,
      );
    }
  }

  return getNextStepFromRule(survey, currentSectionIndex, section.afterSection);
};

const getAccessibleSectionIds = (survey: ViewerSurvey, answers: AnswersState) => {
  const accessibleSectionIds: string[] = [];

  if (survey.sections.length === 0) {
    return accessibleSectionIds;
  }

  let currentSectionIndex = 0;
  const seenSectionIds = new Set<string>();

  while (
    currentSectionIndex >= 0 &&
    currentSectionIndex < survey.sections.length
  ) {
    const currentSection = survey.sections[currentSectionIndex];

    if (seenSectionIds.has(currentSection.id)) {
      break;
    }

    seenSectionIds.add(currentSection.id);
    accessibleSectionIds.push(currentSection.id);

    const nextStep = getSectionNextStep(survey, currentSectionIndex, answers);

    if (nextStep.kind === "confirmation") {
      break;
    }

    const nextSectionIndex = survey.sections.findIndex(
      (section) => section.id === nextStep.sectionId,
    );

    if (nextSectionIndex === -1) {
      break;
    }

    currentSectionIndex = nextSectionIndex;
  }

  return accessibleSectionIds;
};

const getQuestionLabel = (
  survey: ViewerSurvey,
  block: ViewerTextBlock | ViewerSingleChoiceBlock | ViewerMultipleChoiceBlock,
  languageId: LanguageId,
) => (
  <span>
    {getTranslation(survey, block.title, languageId)}
    {block.required ? <span className="required-indicator">*</span> : ""}
  </span>
);

const validateSection = (
  section: ViewerSection | null,
  answers: AnswersState,
) => {
  if (!section) {
    return [];
  }

  const missingBlockIds: string[] = [];

  section.blocks.forEach((block) => {
    if (!("required" in block) || !block.required) {
      return;
    }

    const answer = answers[block.id];

    if (isTextBlock(block)) {
      if (answer?.type !== "text" || !answer.value.trim()) {
        missingBlockIds.push(block.id);
      }
      return;
    }

    if (isSingleChoiceBlock(block)) {
      const hasOption =
        answer?.type === "single_choice" && answer.selectedOptionId !== null;
      const hasOther =
        answer?.type === "single_choice" &&
        answer.isOtherSelected &&
        answer.otherValue.trim().length > 0;

      if (!hasOption && !hasOther) {
        missingBlockIds.push(block.id);
      }
      return;
    }

    if (isMultipleChoiceBlock(block)) {
      const hasOptions =
        answer?.type === "multiple_choice" &&
        answer.selectedOptionIds.length > 0;
      const hasOther =
        answer?.type === "multiple_choice" &&
        answer.isOtherSelected &&
        answer.otherValue.trim().length > 0;

      if (!hasOptions && !hasOther) {
        missingBlockIds.push(block.id);
      }
    }
  });

  return missingBlockIds;
};

const buildSubmissionAnswers = (
  survey: ViewerSurvey,
  answers: AnswersState,
  languageId: LanguageId,
): SubmissionAnswer[] => {
  const accessibleSectionIds = new Set(getAccessibleSectionIds(survey, answers));
  const submissionAnswers: SubmissionAnswer[] = [];

  survey.sections.forEach((section) => {
    if (!accessibleSectionIds.has(section.id)) {
      return;
    }

    section.blocks.forEach((block) => {
      if (isContentBlock(block)) {
        return;
      }

      const label = getTranslation(survey, block.title, languageId);
      const answer = answers[block.id];

      if (isTextBlock(block)) {
        submissionAnswers.push({
          id: block.id,
          label,
          value: answer?.type === "text" ? answer.value : "",
        });
        return;
      }

      if (isSingleChoiceBlock(block)) {
        let value = "";

        if (answer?.type === "single_choice") {
          if (answer.selectedOptionId) {
            const selectedOption = block.options.find(
              (option) => option.id === answer.selectedOptionId,
            );
            value = selectedOption
              ? getTranslation(survey, selectedOption.label, languageId)
              : "";
          } else if (answer.isOtherSelected) {
            value = answer.otherValue;
          }
        }

        submissionAnswers.push({
          id: block.id,
          label,
          value,
        });
        return;
      }

      const selectedValues =
        answer?.type === "multiple_choice"
          ? block.options
              .filter((option) => answer.selectedOptionIds.includes(option.id))
              .map((option) => getTranslation(survey, option.label, languageId))
          : [];

      if (
        answer?.type === "multiple_choice" &&
        answer.isOtherSelected &&
        answer.otherValue.trim()
      ) {
        selectedValues.push(answer.otherValue);
      }

      submissionAnswers.push({
        id: block.id,
        label,
        value: selectedValues,
      });
    });
  });

  return submissionAnswers;
};

function SurveyEntryPage() {
  const navigate = useNavigate();
  const { id } = useParams();
  const [searchParams] = useSearchParams();
  const [survey, setSurvey] = useState<ViewerSurvey | null>(null);
  const [answers, setAnswers] = useState<AnswersState>({});
  const [stepHistory, setStepHistory] = useState<ViewerStep[]>([]);
  const [currentStepIndex, setCurrentStepIndex] = useState(0);
  const [errorMessage, setErrorMessage] = useState("");
  const [isLoading, setIsLoading] = useState(true);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [missingRequiredBlockIds, setMissingRequiredBlockIds] = useState<
    string[]
  >([]);
  const heightFrameRef = useRef<number | null>(null);
  const lastReportedHeightRef = useRef<number | null>(null);
  const forceNextHeightPostRef = useRef(false);
  const lastRenderedStepKeyRef = useRef<string>("");
  const isEmbedded = searchParams.get("embedded") === "true";

  useEffect(() => {
    let isCancelled = false;

    const loadSurvey = async () => {
      if (!id) {
        setErrorMessage(VIEWER_COPY[DEFAULT_VIEWER_LOCALE].missingSurveyId);
        setIsLoading(false);
        return;
      }

      setIsLoading(true);
      setErrorMessage("");

      try {
        const response = await fetch(
          `${resolveApiBaseUrl()}/api/surveys/public/${id}`,
        );

        if (!response.ok) {
          throw new Error(
            VIEWER_COPY[DEFAULT_VIEWER_LOCALE].couldNotLoadSurvey,
          );
        }

        const payload = (await response.json()) as ViewerSurvey;

        if (isCancelled) {
          return;
        }

        setSurvey(payload);
        setAnswers((currentAnswers) =>
          normalizeAnswers(payload, currentAnswers),
        );
        setStepHistory(
          payload.sections[0]
            ? [{ kind: "section", sectionId: payload.sections[0].id }]
            : [{ kind: "confirmation" }],
        );
        setCurrentStepIndex(0);
        setMissingRequiredBlockIds([]);
      } catch (error) {
        if (!isCancelled) {
          setErrorMessage(
            error instanceof Error
              ? error.message
              : VIEWER_COPY[DEFAULT_VIEWER_LOCALE].couldNotLoadSurvey,
          );
        }
      } finally {
        if (!isCancelled) {
          setIsLoading(false);
        }
      }
    };

    void loadSurvey();

    return () => {
      isCancelled = true;
    };
  }, [id]);

  const hasPinnedLanguage = searchParams.has("lang");

  const activeLanguageId = useMemo(() => {
    if (!survey) {
      return "";
    }

    const requestedLanguageId = searchParams.get("lang");
    const requestedLanguageExists = survey.i18n.languages.some(
      (language) => language.id === requestedLanguageId,
    );

    return requestedLanguageExists && requestedLanguageId
      ? requestedLanguageId
      : survey.i18n.defaultLanguage;
  }, [survey, searchParams]);

  const activeLocale = useMemo(() => {
    if (!survey || !activeLanguageId) {
      return DEFAULT_VIEWER_LOCALE;
    }

    return (
      survey.i18n.languages.find((language) => language.id === activeLanguageId)
        ?.locale ?? DEFAULT_VIEWER_LOCALE
    );
  }, [survey, activeLanguageId]);

  const copy = VIEWER_COPY[activeLocale];

  const currentStep = stepHistory[currentStepIndex] ?? null;
  const currentSection = useMemo(() => {
    if (!survey || !currentStep || currentStep.kind !== "section") {
      return null;
    }

    return getSectionById(survey, currentStep.sectionId);
  }, [survey, currentStep]);

  const currentSectionIndex = useMemo(() => {
    if (!survey || !currentSection) {
      return -1;
    }

    return survey.sections.findIndex(
      (section) => section.id === currentSection.id,
    );
  }, [survey, currentSection]);

  const previewNextStep =
    survey && currentSectionIndex >= 0
      ? getSectionNextStep(survey, currentSectionIndex, answers)
      : ({ kind: "confirmation" } as const);

  const postToParent = useCallback(
    (message: EmbeddedHeightMessage | EmbeddedScrollMessage) => {
      if (
        !isEmbedded ||
        typeof window === "undefined" ||
        window.parent === window
      ) {
        return;
      }

      window.parent.postMessage(message, "*");
    },
    [isEmbedded],
  );

  const reportEmbeddedHeight = useCallback(() => {
    if (!isEmbedded) {
      return;
    }

    const height = getDocumentHeight();

    if (!forceNextHeightPostRef.current && height === lastReportedHeightRef.current) {
      return;
    }

    forceNextHeightPostRef.current = false;
    lastReportedHeightRef.current = height;

    postToParent({
      type: EMBEDDED_HEIGHT_MESSAGE_TYPE,
      id: id ?? null,
      height,
    });
  }, [currentStep, id, isEmbedded, postToParent]);

  const scheduleEmbeddedHeightReport = useCallback(() => {
    if (!isEmbedded || typeof window === "undefined") {
      return;
    }

    if (heightFrameRef.current !== null) {
      window.cancelAnimationFrame(heightFrameRef.current);
    }

    heightFrameRef.current = window.requestAnimationFrame(() => {
      heightFrameRef.current = window.requestAnimationFrame(() => {
        heightFrameRef.current = null;
        reportEmbeddedHeight();
      });
    });
  }, [isEmbedded, reportEmbeddedHeight]);

  const clearValidationState = () => {
    setErrorMessage("");
    setMissingRequiredBlockIds([]);
  };

  useEffect(() => {
    if (!isEmbedded || typeof window === "undefined") {
      return;
    }

    const mainElement = document.querySelector("main");
    const observer =
      typeof ResizeObserver !== "undefined"
        ? new ResizeObserver(() => {
            scheduleEmbeddedHeightReport();
          })
        : null;

    if (mainElement instanceof HTMLElement) {
      observer?.observe(mainElement);
    } else {
      if (document.body) {
        observer?.observe(document.body);
      }

      if (document.documentElement) {
        observer?.observe(document.documentElement);
      }
    }

    const handleResize = () => {
      scheduleEmbeddedHeightReport();
    };

    const handleInteraction = () => {
      scheduleEmbeddedHeightReport();
    };

    window.addEventListener("resize", handleResize);
    document.addEventListener("input", handleInteraction, true);
    document.addEventListener("change", handleInteraction, true);

    scheduleEmbeddedHeightReport();

    return () => {
      observer?.disconnect();
      window.removeEventListener("resize", handleResize);
      document.removeEventListener("input", handleInteraction, true);
      document.removeEventListener("change", handleInteraction, true);

      if (heightFrameRef.current !== null) {
        window.cancelAnimationFrame(heightFrameRef.current);
        heightFrameRef.current = null;
      }
    };
  }, [isEmbedded, scheduleEmbeddedHeightReport]);

  useEffect(() => {
    if (!isEmbedded || !currentStep) {
      return;
    }

    const stepKey =
      currentStep.kind === "confirmation"
        ? `confirmation:${currentStepIndex}`
        : `${currentStep.sectionId}:${currentStepIndex}`;

    if (lastRenderedStepKeyRef.current === stepKey) {
      return;
    }

    lastRenderedStepKeyRef.current = stepKey;
    forceNextHeightPostRef.current = true;
    scheduleEmbeddedHeightReport();

    postToParent({
      type: EMBEDDED_SCROLL_MESSAGE_TYPE,
      id: id ?? null,
    });
  }, [
    currentStep,
    currentStepIndex,
    id,
    isEmbedded,
    postToParent,
    scheduleEmbeddedHeightReport,
  ]);

  const setLanguage = (languageId: string) => {
    const nextSearchParams = new URLSearchParams(searchParams);
    nextSearchParams.set("lang", languageId);
    navigate(`/s/${id}?${nextSearchParams.toString()}`, { replace: true });
  };

  const updateTextAnswer = (blockId: string, value: string) => {
    clearValidationState();
    setAnswers((currentAnswers) => ({
      ...currentAnswers,
      [blockId]: {
        type: "text",
        value,
      },
    }));
  };

  const selectSingleChoiceOption = (
    blockId: string,
    selectedOptionId: string | null,
  ) => {
    clearValidationState();
    setAnswers((currentAnswers) => {
      const currentAnswer = currentAnswers[blockId];

      return {
        ...currentAnswers,
        [blockId]: {
          type: "single_choice",
          selectedOptionId,
          isOtherSelected: false,
          otherValue:
            currentAnswer?.type === "single_choice"
              ? currentAnswer.otherValue
              : "",
        },
      };
    });
  };

  const selectSingleChoiceOther = (blockId: string) => {
    clearValidationState();
    setAnswers((currentAnswers) => {
      const currentAnswer = currentAnswers[blockId];

      return {
        ...currentAnswers,
        [blockId]: {
          type: "single_choice",
          selectedOptionId: null,
          isOtherSelected: true,
          otherValue:
            currentAnswer?.type === "single_choice"
              ? currentAnswer.otherValue
              : "",
        },
      };
    });
  };

  const updateSingleChoiceOther = (blockId: string, value: string) => {
    clearValidationState();
    setAnswers((currentAnswers) => {
      return {
        ...currentAnswers,
        [blockId]: {
          type: "single_choice",
          selectedOptionId: null,
          isOtherSelected: true,
          otherValue: value,
        },
      };
    });
  };

  const toggleMultipleChoiceOption = (
    blockId: string,
    optionId: string,
    checked: boolean,
  ) => {
    clearValidationState();
    setAnswers((currentAnswers) => {
      const currentAnswer = currentAnswers[blockId];
      const selectedOptionIds =
        currentAnswer?.type === "multiple_choice"
          ? currentAnswer.selectedOptionIds
          : [];

      return {
        ...currentAnswers,
        [blockId]: {
          type: "multiple_choice",
          selectedOptionIds: checked
            ? [...selectedOptionIds, optionId]
            : selectedOptionIds.filter(
                (currentOptionId) => currentOptionId !== optionId,
              ),
          isOtherSelected:
            currentAnswer?.type === "multiple_choice"
              ? currentAnswer.isOtherSelected
              : false,
          otherValue:
            currentAnswer?.type === "multiple_choice"
              ? currentAnswer.otherValue
              : "",
        },
      };
    });
  };

  const toggleMultipleChoiceOther = (blockId: string, checked: boolean) => {
    clearValidationState();
    setAnswers((currentAnswers) => {
      const currentAnswer = currentAnswers[blockId];

      return {
        ...currentAnswers,
        [blockId]: {
          type: "multiple_choice",
          selectedOptionIds:
            currentAnswer?.type === "multiple_choice"
              ? currentAnswer.selectedOptionIds
              : [],
          isOtherSelected: checked,
          otherValue:
            checked && currentAnswer?.type === "multiple_choice"
              ? currentAnswer.otherValue
              : "",
        },
      };
    });
  };

  const updateMultipleChoiceOther = (blockId: string, value: string) => {
    clearValidationState();
    setAnswers((currentAnswers) => {
      const currentAnswer = currentAnswers[blockId];

      return {
        ...currentAnswers,
        [blockId]: {
          type: "multiple_choice",
          selectedOptionIds:
            currentAnswer?.type === "multiple_choice"
              ? currentAnswer.selectedOptionIds
              : [],
          isOtherSelected: true,
          otherValue: value,
        },
      };
    });
  };

  const goBack = () => {
    clearValidationState();
    setCurrentStepIndex((currentIndex) => Math.max(0, currentIndex - 1));
  };

  const submitResults = async () => {
    if (!survey || !id) {
      return false;
    }

    const payload = {
      surveyId: id,
      languageId: activeLanguageId,
      answers: buildSubmissionAnswers(survey, answers, activeLanguageId),
    };

    const response = await fetch(
      `${resolveApiBaseUrl()}/api/surveys/public/${id}`,
      {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify(payload),
      },
    );

    if (!response.ok) {
      throw new Error(copy.couldNotSubmitSurvey);
    }

    return true;
  };

  const handleSubmitSection = async (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault();

    if (!survey || !currentSection || currentSectionIndex < 0) {
      return;
    }

    const nextMissingRequiredBlockIds = validateSection(
      currentSection,
      answers,
    );

    if (nextMissingRequiredBlockIds.length > 0) {
      setMissingRequiredBlockIds(nextMissingRequiredBlockIds);
      setErrorMessage(copy.missingRequiredFields);
      return;
    }

    clearValidationState();

    const nextStep = getSectionNextStep(survey, currentSectionIndex, answers);

    if (nextStep.kind === "confirmation") {
      setIsSubmitting(true);

      try {
        await submitResults();
        setStepHistory((currentHistory) => [
          ...currentHistory.slice(0, currentStepIndex + 1),
          nextStep,
        ]);
        setCurrentStepIndex((currentIndex) => currentIndex + 1);
      } catch (error) {
        setErrorMessage(
          error instanceof Error ? error.message : copy.couldNotSubmitSurvey,
        );
      } finally {
        setIsSubmitting(false);
      }

      return;
    }

    setStepHistory((currentHistory) => [
      ...currentHistory.slice(0, currentStepIndex + 1),
      nextStep,
    ]);
    setCurrentStepIndex((currentIndex) => currentIndex + 1);
  };

  if (isLoading) {
    return (
      <main>
        <p>{copy.loadingSurvey}</p>
      </main>
    );
  }

  if (!survey) {
    return (
      <main>
        <h1>{copy.surveyViewer}</h1>
        <p className="error-message">
          {errorMessage || copy.couldNotLoadSurvey}
        </p>
      </main>
    );
  }

  if (currentStep?.kind === "confirmation") {
    return (
      <main>
        <header>
          {renderMarkdown(
            getTranslation(survey, survey.confirmation.content, activeLanguageId),
            "confirmation",
          )}
        </header>
      </main>
    );
  }

  if (!currentSection) {
    return (
      <main>
        <h1>{copy.surveyViewer}</h1>
        <p>{copy.thisSurveyHasNoSections}</p>
      </main>
    );
  }

  return (
    <main data-survey={id}>
      <header>
        {/* <h1>{copy.survey}</h1> */}

        {!hasPinnedLanguage ? (
          <div>
            <label htmlFor="viewer-language">{copy.language}</label>
            <select
              id="viewer-language"
              value={activeLanguageId}
              onChange={(event) => setLanguage(event.target.value)}
            >
              {survey.i18n.languages.map((language) => (
                <option key={language.id} value={language.id}>
                  {language.label}
                </option>
              ))}
            </select>
          </div>
        ) : null}
      </header>

      <form onSubmit={(event) => void handleSubmitSection(event)}>
        {currentSection.blocks.map((block) => {
          const isMissing = missingRequiredBlockIds.includes(block.id);
          const blockClassName = isMissing
            ? "survey-block survey-block--error"
            : "survey-block";

          if (isContentBlock(block)) {
            return (
              <section
                key={block.id}
                className="survey-block survey-block--content"
              >
                {renderMarkdown(
                  getTranslation(survey, block.content, activeLanguageId),
                  `content-${block.id}`,
                )}
              </section>
            );
          }

          if (isTextBlock(block)) {
            const answer = answers[block.id];
            const value = answer?.type === "text" ? answer.value : "";

            return (
              <section
                key={block.id}
                className={blockClassName}
                aria-invalid={isMissing}
              >
                <label htmlFor={`block-${block.id}`}>
                  {getQuestionLabel(survey, block, activeLanguageId)}
                </label>
                {renderMarkdown(
                  getTranslation(survey, block.description, activeLanguageId),
                  `text-description-${block.id}`,
                )}
                {block.shortText ? (
                  <input
                    id={`block-${block.id}`}
                    type="text"
                    value={value}
                    placeholder={getTranslation(
                      survey,
                      block.placeholder,
                      activeLanguageId,
                    )}
                    onChange={(event) =>
                      updateTextAnswer(block.id, event.target.value)
                    }
                  />
                ) : (
                  <textarea
                    id={`block-${block.id}`}
                    rows={5}
                    value={value}
                    placeholder={getTranslation(
                      survey,
                      block.placeholder,
                      activeLanguageId,
                    )}
                    onChange={(event) =>
                      updateTextAnswer(block.id, event.target.value)
                    }
                  />
                )}
              </section>
            );
          }

          if (isSingleChoiceBlock(block)) {
            const answer =
              answers[block.id]?.type === "single_choice"
                ? (answers[block.id] as SingleChoiceAnswer)
                : {
                    type: "single_choice" as const,
                    selectedOptionId: null,
                    isOtherSelected: false,
                    otherValue: "",
                  };
            const isOtherFieldMissing =
              isMissing &&
              answer.isOtherSelected &&
              answer.otherValue.trim().length === 0;
            const otherFieldClassName = isOtherFieldMissing
              ? "survey-block__other-input survey-block__other-input--error"
              : "survey-block__other-input";

            return (
              <section
                key={block.id}
                className={blockClassName}
                aria-invalid={isMissing}
              >
                <fieldset>
                  <legend>
                    {getQuestionLabel(survey, block, activeLanguageId)}
                  </legend>
                  {renderMarkdown(
                    getTranslation(survey, block.description, activeLanguageId),
                    `single-choice-description-${block.id}`,
                  )}

                  {block.showAsDropdown ? (
                    <>
                      <select
                        value={
                          answer.isOtherSelected
                            ? OTHER_OPTION_VALUE
                            : (answer.selectedOptionId ?? "")
                        }
                        onChange={(event) => {
                          if (event.target.value === OTHER_OPTION_VALUE) {
                            selectSingleChoiceOther(block.id);
                            return;
                          }

                          selectSingleChoiceOption(
                            block.id,
                            event.target.value || null,
                          );
                        }}
                      >
                        <option value="">{copy.selectOption}</option>
                        {block.options.map((option) => (
                          <option key={option.id} value={option.id}>
                            {getTranslation(
                              survey,
                              option.label,
                              activeLanguageId,
                            )}
                          </option>
                        ))}
                        {block.allowOther ? (
                          <option value={OTHER_OPTION_VALUE}>
                            {getTranslation(
                              survey,
                              block.otherOptionLabel,
                              activeLanguageId,
                            )}
                          </option>
                        ) : null}
                      </select>

                      {block.allowOther && answer.isOtherSelected ? (
                        <div className={otherFieldClassName}>
                          <input
                            type="text"
                            value={answer.otherValue}
                            onChange={(event) =>
                              updateSingleChoiceOther(
                                block.id,
                                event.target.value,
                              )
                            }
                          />
                        </div>
                      ) : null}
                    </>
                  ) : (
                    <>
                      {block.options.map((option) => (
                        <label key={option.id} className="survey-choice">
                          <input
                            className="survey-choice__control"
                            type="radio"
                            name={`block-${block.id}`}
                            checked={
                              !answer.isOtherSelected &&
                              answer.selectedOptionId === option.id
                            }
                            onChange={() =>
                              selectSingleChoiceOption(block.id, option.id)
                            }
                          />
                          <span className="survey-choice__label">
                            {getTranslation(
                              survey,
                              option.label,
                              activeLanguageId,
                            )}
                          </span>
                        </label>
                      ))}

                      {block.allowOther ? (
                        <>
                          <label className="survey-choice">
                            <input
                              className="survey-choice__control"
                              type="radio"
                              name={`block-${block.id}`}
                              checked={answer.isOtherSelected}
                              onChange={() => selectSingleChoiceOther(block.id)}
                            />
                            <span className="survey-choice__label">
                              {getTranslation(
                                survey,
                                block.otherOptionLabel,
                                activeLanguageId,
                              )}
                            </span>
                          </label>

                          {answer.isOtherSelected ? (
                            <div className={otherFieldClassName}>
                              <input
                                type="text"
                                value={answer.otherValue}
                                onChange={(event) =>
                                  updateSingleChoiceOther(
                                    block.id,
                                    event.target.value,
                                  )
                                }
                              />
                            </div>
                          ) : null}
                        </>
                      ) : null}
                    </>
                  )}
                </fieldset>
              </section>
            );
          }

          const answer =
            answers[block.id]?.type === "multiple_choice"
              ? (answers[block.id] as MultipleChoiceAnswer)
              : {
                  type: "multiple_choice" as const,
                  selectedOptionIds: [],
                  isOtherSelected: false,
                  otherValue: "",
                };

          return (
            <section
              key={block.id}
              className={blockClassName}
              aria-invalid={isMissing}
            >
              <fieldset>
                <legend>
                  {getQuestionLabel(survey, block, activeLanguageId)}
                </legend>
                {renderMarkdown(
                  getTranslation(survey, block.description, activeLanguageId),
                  `multiple-choice-description-${block.id}`,
                )}

                {block.options.map((option) => (
                  <label key={option.id} className="survey-choice">
                    <input
                      className="survey-choice__control survey-choice__control--checkbox"
                      role="checkbox"
                      type="checkbox"
                      checked={answer.selectedOptionIds.includes(option.id)}
                      onChange={(event) =>
                        toggleMultipleChoiceOption(
                          block.id,
                          option.id,
                          event.target.checked,
                        )
                      }
                    />
                    <span className="survey-choice__label">
                      {getTranslation(survey, option.label, activeLanguageId)}
                    </span>
                  </label>
                ))}

                {block.allowOther ? (
                  <>
                    <label className="survey-choice">
                      <input
                        className="survey-choice__control survey-choice__control--checkbox"
                        role="checkbox"
                        type="checkbox"
                        checked={answer.isOtherSelected}
                        onChange={(event) =>
                          toggleMultipleChoiceOther(
                            block.id,
                            event.target.checked,
                          )
                        }
                      />
                      <span className="survey-choice__label">
                        {getTranslation(
                          survey,
                          block.otherOptionLabel,
                          activeLanguageId,
                        )}
                      </span>
                    </label>

                    {answer.isOtherSelected ? (
                      <input
                        type="text"
                        value={answer.otherValue}
                        onChange={(event) =>
                          updateMultipleChoiceOther(
                            block.id,
                            event.target.value,
                          )
                        }
                      />
                    ) : null}
                  </>
                ) : null}
              </fieldset>
            </section>
          );
        })}

        {errorMessage ? <p className="error-message">{errorMessage}</p> : null}

        <div className="survey-navigation">
          {currentStepIndex > 0 ? (
            <button type="button" className="survey-navigation__button" onClick={goBack}>
              {copy.back}
            </button>
          ) : (
            <span className="survey-navigation__spacer" aria-hidden="true" />
          )}

          <button
            type="submit"
            className="survey-navigation__button survey-navigation__button--primary"
            disabled={isSubmitting}
          >
            {isSubmitting
              ? copy.submitting
              : previewNextStep.kind === "confirmation"
                ? copy.submit
                : copy.continue}
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
