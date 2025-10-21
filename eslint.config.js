import js from "@eslint/js";
import react from "eslint-plugin-react";
import reactHooks from "eslint-plugin-react-hooks";
import prettierConfig from "eslint-config-prettier";

export default [
  js.configs.recommended,
  {
    files: ["src/**/*.{js,jsx}"],
    plugins: {
      react,
      "react-hooks": reactHooks,
    },
    languageOptions: {
      ecmaVersion: "latest",
      sourceType: "module",
      parserOptions: {
        ecmaFeatures: {
          jsx: true,
        },
      },
      globals: {
        window: "readonly",
        document: "readonly",
        console: "readonly",
        navigator: "readonly",
        // Test environment globals
        global: "readonly",
        Event: "readonly",
    beforeAll: "readonly",
        beforeEach: "readonly",
    afterAll: "readonly",
        afterEach: "readonly",
    // Vitest globals
    describe: "readonly",
    it: "readonly",
    test: "readonly",
    expect: "readonly",
    vi: "readonly",
        URL: "readonly",
        File: "readonly",
        FileReader: "readonly",
        Blob: "readonly",
        Audio: "readonly",
        fetch: "readonly",
        setTimeout: "readonly",
        clearTimeout: "readonly",
        setInterval: "readonly",
        clearInterval: "readonly",
        requestAnimationFrame: "readonly",
        cancelAnimationFrame: "readonly",
      },
    },
    settings: {
      react: {
        version: "detect",
      },
    },
    rules: {
      ...react.configs.recommended.rules,
      ...reactHooks.configs.recommended.rules,
      "react/react-in-jsx-scope": "off",
      "react/prop-types": "off",
      "no-unused-vars": "warn",
      "no-console": "off",
      "no-dupe-else-if": "warn",
      "no-useless-escape": "warn",
      "react-hooks/exhaustive-deps": "warn",
      "react-hooks/rules-of-hooks": "error",
      "react-hooks/set-state-in-effect": "warn",
    },
  },
  {
    ignores: ["node_modules", "dist", "build", "coverage", "legacy"],
  },
  prettierConfig,
];
