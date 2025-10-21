export default function Icon({ name, size = 20, stroke = 1.5, className = "", ...props }) {
  const common = {
    width: size,
    height: size,
    viewBox: "0 0 24 24",
    fill: "none",
    stroke: "currentColor",
    strokeWidth: stroke,
    strokeLinecap: "round",
    strokeLinejoin: "round",
    className,
    ...props,
  };

  switch (name) {
    case "folder":
      return (
        <svg {...common}>
          <path d="M3 6h5l2 3h11v9a1 1 0 0 1-1 1H4a1 1 0 0 1-1-1V6Z" />
          <path d="M21 9H9" />
        </svg>
      );
    case "timer":
      return (
        <svg {...common}>
          <circle cx="12" cy="13" r="7" />
          <path d="M12 10v4l2 1" />
          <path d="M9 4h6" />
          <path d="M15 2h-6" />
        </svg>
      );
    case "upload":
      return (
        <svg {...common}>
          <path d="M12 15V3" />
          <path d="m6 9 6-6 6 6" />
          <path d="M5 19h14" />
          <path d="M5 15h14v4a2 2 0 0 1-2 2H7a2 2 0 0 1-2-2Z" />
        </svg>
      );
    case "warning":
      return (
        <svg {...common}>
          <path d="M12 9v4" />
          <path d="M12 17h.01" />
          <path d="m4.5 19 7.5-13 7.5 13H4.5Z" />
        </svg>
      );
    case "keyboard":
      return (
        <svg {...common}>
          <rect x="3" y="6" width="18" height="12" rx="2" />
          <path d="M7 10h.01M11 10h.01M15 10h.01M7 14h10" />
        </svg>
      );
    case "document":
      return (
        <svg {...common}>
          <path d="M7 3h7l5 5v11a2 2 0 0 1-2 2H7a2 2 0 0 1-2-2V5a2 2 0 0 1 2-2Z" />
          <path d="M14 3v4a1 1 0 0 0 1 1h4" />
        </svg>
      );
    case "play":
      return (
        <svg {...common}>
          <path d="M8 5v14l11-7-11-7Z" />
        </svg>
      );
    case "pause":
      return (
        <svg {...common}>
          <rect x="7.5" y="5" width="3" height="14" fill="currentColor" stroke="none" rx="0.6" />
          <rect x="13.5" y="5" width="3" height="14" fill="currentColor" stroke="none" rx="0.6" />
        </svg>
      );
    case "loader":
      return (
        <svg {...common}>
          <circle cx="12" cy="12" r="9" opacity="0.25" />
          <path d="M12 3a9 9 0 0 1 9 9" />
        </svg>
      );
    case "archive":
      return (
        <svg {...common}>
          <rect x="3" y="3" width="18" height="5" rx="1" />
          <path d="M5 8v11a1 1 0 0 0 1 1h12a1 1 0 0 0 1-1V8" />
          <path d="M10 12h4" />
        </svg>
      );
    default:
      return (
        <svg {...common}>
          <circle cx="12" cy="12" r="9" />
        </svg>
      );
  }
}
