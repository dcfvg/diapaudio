import { useEffect, useMemo, memo } from "react";
import { useMediaStore } from "../state/useMediaStore.js";
import Modal from "./Modal.jsx";
import Icon from "./Icon.jsx";
import "./TimelineNotices.css";
import { sanitizeHtml } from "../utils/sanitizeHtml.js";

function TimelineNotices({ open, onClose }) {
  const anomalies = useMediaStore((state) => state.anomalies);

  const notices = useMemo(
    () => (Array.isArray(anomalies) ? anomalies.filter(Boolean) : []),
    [anomalies]
  );

  useEffect(() => {
    if (!open && notices.length && onClose) {
      // Auto-close handled by parent; nothing additional needed here.
    }
  }, [open, notices.length, onClose]);

  if (!notices.length) return null;

  return (
    <Modal
      open={open}
      onClose={onClose}
      title="Timeline notices"
      icon={<Icon name="warning" size={20} />}
      actions={[
        {
          key: "close",
          label: "Close",
          variant: "primary",
          onClick: onClose,
        },
      ]}
      describeBy="timeline-notices-modal-messages"
    >
      <div className="timeline-notices" id="timeline-notices-modal-messages">
        {notices.map((notice, index) => {
          const message = typeof notice === "string" ? notice : notice?.message || "";
          const sanitized = sanitizeHtml(message);
          return (
            <div
              key={index}
              className="timeline-notices__message"
              dangerouslySetInnerHTML={{ __html: sanitized }}
            />
          );
        })}
      </div>
    </Modal>
  );
}

export default memo(TimelineNotices);
