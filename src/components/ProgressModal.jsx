import Modal from "./Modal.jsx";
import "./ProgressModal.css";
import { sanitizeHtml } from "../utils/sanitizeHtml.js";

export default function ProgressModal({
  open,
  title = "Working…",
  status,
  percent = 0,
  details,
  icon = "",
  onClose,
  cancellable = false,
  onCancel,
}) {
  const safePercent = Number.isFinite(percent) ? Math.max(0, Math.min(100, percent)) : null;
  const actions = [];
  if (cancellable && typeof onCancel === "function") {
    actions.push({
      key: "cancel",
      label: "Cancel",
      onClick: onCancel,
    });
  }

  const sanitizedDetails = details ? sanitizeHtml(details) : "";

  return (
    <Modal
      open={open}
      title={title}
      subtitle={status}
      icon={icon}
      size="sm"
      onClose={cancellable ? onClose : undefined}
      actions={actions}
      disableBackdropClose={!cancellable}
      className="modal-overlay--progress"
    >
      <div className="progress-modal" role="status" aria-live="polite">
        {safePercent !== null ? (
          <div
            className="progress-modal__bar"
            role="progressbar"
            aria-valuenow={safePercent}
            aria-valuemin="0"
            aria-valuemax="100"
          >
            <div className="progress-modal__bar-fill" style={{ width: `${safePercent}%` }} />
            <span className="progress-modal__bar-label">{Math.round(safePercent)}%</span>
          </div>
        ) : null}
        {sanitizedDetails ? (
          <p
            className="progress-modal__details"
            dangerouslySetInnerHTML={{ __html: sanitizedDetails }}
          />
        ) : null}
      </div>
    </Modal>
  );
}
