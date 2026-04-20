import { useEffect, useState } from "react";
import { getTranslationValue } from "../lib/form-model";
import type { FormLanguage, FormTranslations, TranslationId } from "../lib/types";

interface TranslationInputProps {
  id: string;
  label: string;
  translationId: TranslationId | null;
  translations: FormTranslations;
  languages: FormLanguage[];
  defaultLanguage: string;
  placeholder: string;
  multiline?: boolean;
  rows?: number;
  variant?: "default" | "option";
  showMissingBadge?: boolean;
  showMarkdownBadge?: boolean;
  onChange: (translationId: TranslationId, languageId: string, value: string) => void;
}

export function TranslationInput({
  id,
  label,
  translationId,
  translations,
  languages,
  defaultLanguage,
  placeholder,
  multiline = false,
  rows = 3,
  variant = "default",
  showMissingBadge = true,
  showMarkdownBadge = false,
  onChange,
}: TranslationInputProps) {
  const [activeLanguageId, setActiveLanguageId] = useState(defaultLanguage);

  useEffect(() => {
    if (!languages.some((language) => language.id === activeLanguageId)) {
      setActiveLanguageId(defaultLanguage);
    }
  }, [activeLanguageId, defaultLanguage, languages]);

  if (!translationId) {
    return null;
  }

  const value = getTranslationValue(translations, translationId, activeLanguageId);
  const isMissing = value.trim().length === 0;

  return (
    <div
      className={[
        "translation-input",
        `translation-input--${variant}`,
        isMissing && showMissingBadge ? "translation-input--missing" : "",
      ]
        .filter(Boolean)
        .join(" ")}
    >
      <div className="translation-input__header">
        <label htmlFor={id}>{label}</label>
        {showMarkdownBadge ? <span className="translation-input__badge translation-input__badge--neutral">Markdown</span> : null}
        {isMissing && showMissingBadge ? <span className="translation-input__badge">Missing</span> : null}
      </div>

      <div className="translation-input__body">
        <div className="translation-input__field-wrap">
          {multiline ? (
            <textarea
              id={id}
              rows={rows}
              className="translation-input__field"
              value={value}
              placeholder={placeholder}
              onChange={(event) => onChange(translationId, activeLanguageId, event.target.value)}
            />
          ) : (
            <input
              id={id}
              type="text"
              className="translation-input__field"
              value={value}
              placeholder={placeholder}
              onChange={(event) => onChange(translationId, activeLanguageId, event.target.value)}
            />
          )}
        </div>

        <div className="translation-input__controls">
          <select
            className="translation-input__language"
            aria-label={`${label} language`}
            value={activeLanguageId}
            onChange={(event) => setActiveLanguageId(event.target.value)}
          >
            {languages.map((language) => (
              <option key={language.id} value={language.id}>
                {language.label}
                {language.id === defaultLanguage ? " (Default)" : ""}
              </option>
            ))}
          </select>
        </div>
      </div>
    </div>
  );
}
