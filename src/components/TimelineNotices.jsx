import { useMemo, memo } from "react";
import { useTranslation } from "react-i18next";
import { useMediaStore } from "../state/useMediaStore.js";
import Modal from "./Modal.jsx";
import Icon from "./Icon.jsx";
import "./TimelineNotices.css";
import { sanitizeHtml } from "../utils/sanitizeHtml.js";

function TimelineNotices({ open, onClose }) {
  const { t } = useTranslation();
  const anomalies = useMediaStore((state) => state.anomalies);

  const notices = useMemo(
    () => (Array.isArray(anomalies) ? anomalies.filter(Boolean) : []),
    [anomalies]
  );

  if (!notices.length) return null;

  return (
    <Modal
      open={open}
      onClose={onClose}
      title={t("timelineNoticesTitle")}
      icon={<Icon name="warning" size={20} />}
      closeLabel={t("closeButton")}
      actions={[
        {
          key: "close",
          label: t("closeButton"),
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
