import { useCallback, useEffect, useMemo, useRef, useId } from "react";
import { createPortal } from "react-dom";
import "./Modal.css";

const VARIANT_CLASS = {
  dialog: "modal--dialog",
  panel: "modal--panel",
  danger: "modal--danger",
};

const SIZE_CLASS = {
  sm: "modal--sm",
  md: "modal--md",
  lg: "modal--lg",
};

const FOCUSABLE_SELECTORS =
  'a[href], area[href], button:not([disabled]), input:not([disabled]):not([type="hidden"]), select:not([disabled]), textarea:not([disabled]), iframe, [tabindex]:not([tabindex="-1"])';

let activeModalCount = 0;

function setApplicationInert(isInert) {
  if (typeof document === "undefined") return;
  const root = document.getElementById("root");
  if (!root) {
    return;
  }
  if (isInert) {
    root.setAttribute("aria-hidden", "true");
    if ("inert" in root) {
      root.inert = true;
    } else {
      root.setAttribute("inert", "");
    }
  } else {
    root.removeAttribute("aria-hidden");
    if ("inert" in root) {
      root.inert = false;
    } else {
      root.removeAttribute("inert");
    }
  }
}

const HTMLElementConstructor =
  typeof window !== "undefined" && window.HTMLElement ? window.HTMLElement : null;

function isHTMLElement(node) {
  if (!node) return false;
  if (HTMLElementConstructor) {
    return node instanceof HTMLElementConstructor;
  }
  return node.nodeType === 1;
}

export default function Modal({
  open,
  title,
  subtitle,
  icon,
  onClose,
  children,
  actions,
  size = "md",
  variant = "dialog",
  className = "",
  contentClassName = "",
  style,
  disableBackdropClose = false,
  labelledBy,
  describeBy,
}) {
  const modalContentRef = useRef(null);
  const restoreFocusRef = useRef(null);
  const headingId = useId();

  const handleKeyDown = useCallback(
    (event) => {
      if (event.key === "Escape") {
        onClose?.();
      }
    },
    [onClose]
  );

  useEffect(() => {
    if (!open) return undefined;
    document.addEventListener("keydown", handleKeyDown);
    return () => {
      document.removeEventListener("keydown", handleKeyDown);
    };
  }, [open, handleKeyDown]);

  useEffect(() => {
    if (!open || typeof document === "undefined") {
      return undefined;
    }

    restoreFocusRef.current = isHTMLElement(document.activeElement)
      ? document.activeElement
      : null;

    activeModalCount += 1;
    if (activeModalCount === 1) {
      setApplicationInert(true);
    }

    const focusWithinModal = () => {
      const node = modalContentRef.current;
      if (!node) return;
      const focusable = Array.from(node.querySelectorAll(FOCUSABLE_SELECTORS)).filter((el) => {
        if (!isHTMLElement(el)) return false;
        return !el.hasAttribute("disabled") && el.getAttribute("aria-hidden") !== "true";
      });
      const target = focusable[0] || node;
      target.focus({ preventScroll: true });
    };

    const trapFocus = (event) => {
      if (event.key !== "Tab") {
        return;
      }
      const node = modalContentRef.current;
      if (!node) return;

      const focusable = Array.from(node.querySelectorAll(FOCUSABLE_SELECTORS)).filter((el) => {
        if (!isHTMLElement(el)) return false;
        return !el.hasAttribute("disabled") && el.getAttribute("aria-hidden") !== "true";
      });

      if (focusable.length === 0) {
        event.preventDefault();
        node.focus({ preventScroll: true });
        return;
      }

      const first = focusable[0];
      const last = focusable[focusable.length - 1];
      const active = document.activeElement;
      const isShift = event.shiftKey;

      if (isShift) {
        if (!node.contains(active) || active === first) {
          event.preventDefault();
          last.focus({ preventScroll: true });
        }
      } else if (!node.contains(active) || active === last) {
        event.preventDefault();
        first.focus({ preventScroll: true });
      }
    };

    const rafId = window.requestAnimationFrame(focusWithinModal);
    document.addEventListener("keydown", trapFocus, true);

    return () => {
      document.removeEventListener("keydown", trapFocus, true);
      window.cancelAnimationFrame(rafId);

      activeModalCount = Math.max(0, activeModalCount - 1);
      if (activeModalCount === 0) {
        setApplicationInert(false);
      }

      const previous = restoreFocusRef.current;
      const isConnected =
        previous && typeof previous === "object"
          ? "isConnected" in previous
            ? previous.isConnected
            : document.body
                ? document.body.contains(previous)
                : false
          : false;
      if (previous && typeof previous.focus === "function" && isConnected) {
        window.requestAnimationFrame(() => {
          previous.focus({ preventScroll: true });
        });
      }
    };
  }, [open]);

  const overlayClass = useMemo(() => {
    const base = ["modal-overlay", VARIANT_CLASS[variant] || VARIANT_CLASS.dialog];
    if (className) {
      base.push(className);
    }
    return base.join(" ");
  }, [className, variant]);

  const modalClass = useMemo(() => {
    const base = ["modal", SIZE_CLASS[size] || SIZE_CLASS.md];
    if (variant === "panel") {
      base.push("modal--panel-shell");
    }
    if (contentClassName) {
      base.push(contentClassName);
    }
    return base.join(" ");
  }, [size, variant, contentClassName]);

  if (!open) {
    return null;
  }

  const ariaLabelledBy = labelledBy || (title ? headingId : undefined);

  const handleOverlayClick = (event) => {
    if (disableBackdropClose) return;
    if (event.target === event.currentTarget) {
      onClose?.();
    }
  };

  return createPortal(
    <div
      className={overlayClass}
      role="dialog"
      aria-modal="true"
      aria-labelledby={ariaLabelledBy}
      aria-describedby={describeBy}
      onMouseDown={handleOverlayClick}
    >
      <div
        className={modalClass}
        style={style}
        ref={modalContentRef}
        tabIndex={-1}
        role="document"
      >
        {(title || onClose || icon || subtitle) && (
          <div className="modal__header">
            <div className="modal__title-group">
              {icon ? <span className="modal__icon" aria-hidden="true">{icon}</span> : null}
              {title ? (
                <h2 className="modal__title" id={ariaLabelledBy}>
                  {title}
                </h2>
              ) : null}
              {subtitle ? <p className="modal__subtitle">{subtitle}</p> : null}
            </div>
            {onClose ? (
              <button
                type="button"
                className="modal__close"
                aria-label="Close"
                onClick={onClose}
              >
                ×
              </button>
            ) : null}
          </div>
        )}
        <div className="modal__body">{children}</div>
        {Array.isArray(actions) && actions.length ? (
          <div className="modal__footer">
            {actions.map((action) => (
              <button
                key={action.key || action.label}
                type={action.type || "button"}
                className={`modal__action ${action.variant ? `modal__action--${action.variant}` : ""}`}
                onClick={action.onClick}
                disabled={action.disabled}
              >
                {action.label}
              </button>
            ))}
          </div>
        ) : null}
      </div>
    </div>,
    document.body
  );
}
