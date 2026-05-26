import Modal from "./Modal.jsx";
import Icon from "./Icon.jsx";
import "./ErrorModal.css";

export default function ErrorModal({ open, error, onClose, title = "Something went wrong" }) {
  if (!error) {
    return null;
  }

  const message =
    typeof error === "string"
      ? error
      : error?.message || "An unexpected error occurred. Please try again.";

  return (
    <Modal
      open={open}
      onClose={onClose}
      title={title}
      icon={<Icon name="warning" size={22} />}
      variant="danger"
      actions={[
        {
          key: "close",
          label: "Close",
          variant: "primary",
          onClick: onClose,
        },
      ]}
    >
      <p>{message}</p>
      {error?.stack ? (
        <details className="error-modal__details">
          <summary>Technical details</summary>
          <pre>{error.stack}</pre>
        </details>
      ) : null}
    </Modal>
  );
}
