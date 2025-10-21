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
  if (parts.length !== 2) return null;
  const minutesPart = Number(parts[0]);
  const secondsPart = Number(parts[1]);
  if (!Number.isFinite(minutesPart) || !Number.isFinite(secondsPart)) {
    return null;
  }
  const totalSeconds = Math.abs(minutesPart) * 60 + Math.abs(secondsPart);
  return sign * totalSeconds;
}

export function formatDelay(value) {
  if (!Number.isFinite(value)) return "0:00";
  const sign = value < 0 ? "-" : "";
  const absValue = Math.abs(value);
  const minutes = Math.floor(absValue / 60);
  const seconds = absValue - minutes * 60;
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
  return `${sign}${minutes}:${secondsDisplay}`;
}

export default {
  parseDelayField,
  formatDelay,
};
