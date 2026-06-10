import { useMemo } from "react";
import { useTranslation } from "react-i18next";
import { getAvailableLanguages, setLanguage } from "../i18n/index.js";

const LANGUAGE_LABELS = {
  en: "🇬🇧 English",
  fr: "🇫🇷 Français",
  es: "🇪🇸 Español",
};

export default function LanguageSelector({
  className,
  id = "language-select",
  labelClassName = "",
  selectClassName = "",
  showLabel = false,
}) {
  const { i18n, t } = useTranslation();
  const options = useMemo(() => getAvailableLanguages(), []);
  const currentLanguage = (i18n.resolvedLanguage || i18n.language || "en").split("-")[0];

  return (
    <label className={["language-selector__label", className].filter(Boolean).join(" ")}>
      <span className={showLabel ? labelClassName : "visually-hidden"}>{t("languageLabel")}</span>
      <select
        id={id}
        className={["language-selector__select", selectClassName].filter(Boolean).join(" ")}
        value={currentLanguage}
        onChange={(event) => {
          void setLanguage(event.target.value);
        }}
      >
        {options.map((lang) => (
          <option key={lang} value={lang}>
            {LANGUAGE_LABELS[lang] || lang.toUpperCase()}
          </option>
        ))}
      </select>
    </label>
  );
}
