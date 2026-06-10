import { useEffect } from "react";
import { useTranslation } from "react-i18next";
import Modal from "./Modal.jsx";
import Icon from "./Icon.jsx";
import {
  isStaleBuildImportError,
  recoverFromStaleBuildImport,
} from "../utils/staleBuildRecovery.js";
import "./ErrorModal.css";

export default function ErrorModal({ open, error, onClose, title }) {
  const { t } = useTranslation();
  const staleBuildError = isStaleBuildImportError(error);

  const handleReload = () => {
    if (!recoverFromStaleBuildImport(error, { force: true })) {
      window.location.reload();
    }
  };

  useEffect(() => {
    if (open && staleBuildError) {
      recoverFromStaleBuildImport(error);
    }
  }, [error, open, staleBuildError]);

  if (!error) {
    return null;
  }

  const message =
    staleBuildError
      ? t("errorModalStaleBuildMessage")
      : typeof error === "string"
      ? error
      : error?.message || t("errorModalDefaultMessage");

  return (
    <Modal
      open={open}
      onClose={onClose}
      title={title || t("errorModalTitle")}
      icon={<Icon name="warning" size={22} />}
      variant="danger"
      closeLabel={t("closeButton")}
      actions={[
        staleBuildError
          ? {
              key: "reload",
              label: t("reloadButton"),
              variant: "primary",
              onClick: handleReload,
            }
          : {
              key: "close",
              label: t("closeButton"),
              variant: "primary",
              onClick: onClose,
            },
      ]}
    >
      <p>{message}</p>
      {error?.stack && !staleBuildError ? (
        <details className="error-modal__details">
          <summary>{t("errorModalTechnicalDetails")}</summary>
          <pre>{error.stack}</pre>
        </details>
      ) : null}
    </Modal>
  );
}
