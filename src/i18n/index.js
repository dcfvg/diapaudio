import i18n from "i18next";
import { initReactI18next } from "react-i18next";
import { resources, translations } from "./translations";
import * as logger from "../utils/logger.js";

const STORAGE_KEY = "diapaudio-language";
const isBrowser = typeof window !== "undefined";

function detectLanguage() {
  if (!isBrowser) {
    return "en";
  }

  try {
    const stored = window.localStorage.getItem(STORAGE_KEY);
    if (stored && resources[stored]) {
      return stored;
    }
  } catch {
    // Ignore storage access issues (private mode, etc.)
  }

  const browserLang = navigator.language || navigator.userLanguage;
  if (typeof browserLang === "string") {
    const langCode = browserLang.split("-")[0].toLowerCase();
    if (resources[langCode]) {
      return langCode;
    }
  }

  return "en";
}

const initialLanguage = detectLanguage();

i18n
  .use(initReactI18next)
  .init({
    resources,
    lng: initialLanguage,
    fallbackLng: "en",
    defaultNS: "translation",
    interpolation: {
      escapeValue: false,
    },
    returnObjects: true,
  })
  .catch((error) => {
    logger.error("Failed to initialise i18n", error);
  });

i18n.on("languageChanged", (language) => {
  if (!isBrowser) return;
  try {
    window.localStorage.setItem(STORAGE_KEY, language);
  } catch {
    // Ignore storage failures
  }
});

function getAvailableLanguages() {
  return Object.keys(resources);
}

function getCurrentLanguage() {
  return i18n.language || initialLanguage;
}

function setLanguage(language) {
  if (!resources[language]) return Promise.resolve(getCurrentLanguage());
  return i18n.changeLanguage(language);
}

function subscribe(listener) {
  if (typeof listener !== "function") {
    return () => {};
  }
  i18n.on("languageChanged", listener);
  return () => {
    i18n.off("languageChanged", listener);
  };
}

const t = (...args) => i18n.t(...args);

export {
  STORAGE_KEY,
  detectLanguage,
  getAvailableLanguages,
  getCurrentLanguage,
  setLanguage,
  subscribe,
  t,
  translations,
};

export default i18n;
