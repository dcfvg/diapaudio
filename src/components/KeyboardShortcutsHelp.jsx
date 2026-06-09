import { memo } from "react";
import { useTranslation } from "react-i18next";
import { getKeyboardShortcuts } from "../hooks/useKeyboardShortcuts";
import Modal from "./Modal.jsx";
import Icon from "./Icon.jsx";
import "./KeyboardShortcutsHelp.css";

const CATEGORY_LABEL_KEYS = {
  Playback: "shortcutCategoryPlayback",
  Display: "shortcutCategoryDisplay",
  Help: "shortcutCategoryHelp",
};

const KeyboardShortcutsHelp = memo(function KeyboardShortcutsHelp({ open, onClose }) {
  const { t } = useTranslation();
  const shortcuts = getKeyboardShortcuts();
  const categories = [...new Set(shortcuts.map((s) => s.category))];

  return (
    <Modal
      open={open}
      onClose={onClose}
      title={t("keyboardShortcutsTitle")}
      icon={<Icon name="keyboard" size={20} />}
      closeLabel={t("closeButton")}
      size="lg"
    >
      <div className="keyboard-shortcuts-content">
        {categories.map((category) => (
          <section key={category} className="keyboard-shortcuts-category">
            <h3>{t(CATEGORY_LABEL_KEYS[category] || category)}</h3>
            <div className="keyboard-shortcuts-list">
              {shortcuts
                .filter((s) => s.category === category)
                .map((shortcut, index) => (
                  <div key={index} className="keyboard-shortcut-item">
                    <kbd className="keyboard-shortcut-key">{shortcut.key}</kbd>
                    <span className="keyboard-shortcut-description">{t(shortcut.description)}</span>
                  </div>
                ))}
            </div>
          </section>
        ))}
      </div>
      <div className="keyboard-shortcuts-footer">
        <p>
          {t("keyboardShortcutsFooterPrefix")} <kbd>?</kbd>{" "}
          {t("keyboardShortcutsFooterSuffix")}
        </p>
      </div>
    </Modal>
  );
});

export default KeyboardShortcutsHelp;
