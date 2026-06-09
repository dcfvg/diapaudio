export function parseDelayField(raw) {
  if (typeof raw !== "string") return null;
  let value = raw.trim();
  if (!value) return 0;
  let sign = 1;
  if (value.startsWith("-")) {
    sign = -1;
    value = value.slice(1);
  } else if (value.startsWith("+")) {
    value = value.slice(1);
  }
  if (!value) return 0;
  const parts = value.split(":");
  if (parts.length === 1) {
    const secondsOnly = Number(parts[0]);
    if (!Number.isFinite(secondsOnly)) return null;
    return sign * secondsOnly;
  }
  if (parts.length !== 2 && parts.length !== 3) return null;
  const numericParts = parts.map((part) => Number(part));
  if (numericParts.some((part) => !Number.isFinite(part))) {
    return null;
  }
  const totalSeconds =
    parts.length === 3
      ? Math.abs(numericParts[0]) * 3600 +
        Math.abs(numericParts[1]) * 60 +
        Math.abs(numericParts[2])
      : Math.abs(numericParts[0]) * 60 + Math.abs(numericParts[1]);
  return sign * totalSeconds;
}

export function formatDelay(value) {
  if (!Number.isFinite(value)) return "0:00";
  const sign = value < 0 ? "-" : "";
  const absValue = Math.abs(value);
  const hours = Math.floor(absValue / 3600);
  const minutes = Math.floor((absValue - hours * 3600) / 60);
  const seconds = absValue - hours * 3600 - minutes * 60;
  const hasFraction = Math.abs(seconds - Math.round(seconds)) > 0.001;
  let secondsDisplay;
  if (hasFraction) {
    const fixed = seconds.toFixed(1);
    const [intPart, decimalPart] = fixed.split(".");
    const paddedInt = intPart.padStart(2, "0");
    secondsDisplay = `${paddedInt}.${decimalPart}`;
  } else {
    secondsDisplay = String(Math.round(seconds)).padStart(2, "0");
  }
  if (hours > 0) {
    return `${sign}${hours}:${String(minutes).padStart(2, "0")}:${secondsDisplay}`;
  }
  return `${sign}${minutes}:${secondsDisplay}`;
}

export function stepDelayField(raw, fallbackSeconds = 0, stepSeconds = 1) {
  const parsed = parseDelayField(raw);
  const baseValue =
    parsed === null ? (Number.isFinite(fallbackSeconds) ? fallbackSeconds : 0) : parsed;
  const safeStep = Number.isFinite(stepSeconds) ? stepSeconds : 0;
  return formatDelay(baseValue + safeStep);
}

export default {
  parseDelayField,
  formatDelay,
  stepDelayField,
};
