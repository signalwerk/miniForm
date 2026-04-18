import { useEffect, useState } from "react";
import { getTranslationValue } from "../lib/form-model";
import type { FormLanguage, FormTranslations, TranslationKey } from "../lib/types";

interface TranslationInputProps {
  id: string;
  label: string;
  translationKey: TranslationKey | null;
  translations: FormTranslations;
  languages: FormLanguage[];
  defaultLanguage: string;
  placeholder: string;
  multiline?: boolean;
  rows?: number;
  variant?: "default" | "option";
  onChange: (translationKey: TranslationKey, languageId: string, value: string) => void;
}

export function TranslationInput({
  id,
  label,
  translationKey,
  translations,
  languages,
  defaultLanguage,
  placeholder,
  multiline = false,
  rows = 3,
  variant = "default",
  onChange,
}: TranslationInputProps) {
  const [activeLanguageId, setActiveLanguageId] = useState(defaultLanguage);

  useEffect(() => {
    if (!languages.some((language) => language.id === activeLanguageId)) {
      setActiveLanguageId(defaultLanguage);
    }
  }, [activeLanguageId, defaultLanguage, languages]);

  if (!translationKey) {
    return null;
  }

  const value = getTranslationValue(translations, translationKey, activeLanguageId);
  const isMissing = value.trim().length === 0;

  return (
    <div
      className={[
        "translation-input",
        `translation-input--${variant}`,
        isMissing ? "translation-input--missing" : "",
      ]
        .filter(Boolean)
        .join(" ")}
    >
      <div className="translation-input__header">
        <label htmlFor={id}>{label}</label>
        {isMissing ? <span className="translation-input__badge">Missing</span> : null}
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
              onChange={(event) => onChange(translationKey, activeLanguageId, event.target.value)}
            />
          ) : (
            <input
              id={id}
              type="text"
              className="translation-input__field"
              value={value}
              placeholder={placeholder}
              onChange={(event) => onChange(translationKey, activeLanguageId, event.target.value)}
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
