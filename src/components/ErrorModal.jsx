import { useTranslation } from "react-i18next";
import Modal from "./Modal.jsx";
import Icon from "./Icon.jsx";
import "./ErrorModal.css";

export default function ErrorModal({ open, error, onClose, title }) {
  const { t } = useTranslation();

  if (!error) {
    return null;
  }

  const message =
    typeof error === "string"
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
        {
          key: "close",
          label: t("closeButton"),
          variant: "primary",
          onClick: onClose,
        },
      ]}
    >
      <p>{message}</p>
      {error?.stack ? (
        <details className="error-modal__details">
          <summary>{t("errorModalTechnicalDetails")}</summary>
          <pre>{error.stack}</pre>
        </details>
      ) : null}
    </Modal>
  );
}
