import { useHotkeys } from "react-hotkeys-hook";

/**
 * Custom hook for keyboard shortcuts in the app
 * @param {Object} options - Configuration options
 * @param {Function} options.onPlayPause - Toggle play/pause
 * @param {Function} options.onSeekForward - Seek forward in timeline
 * @param {Function} options.onSeekBackward - Seek backward in timeline
 * @param {Function} options.onSpeedIncrease - Increase playback speed
 * @param {Function} options.onSpeedDecrease - Decrease playback speed
 * @param {Function} options.onToggleFullscreen - Toggle fullscreen mode
 * @param {Function} options.onShowHelp - Show keyboard shortcuts help
 * @param {boolean} options.disabled - Disable all shortcuts
 */
export function useKeyboardShortcuts({
  onPlayPause,
  onSeekForward,
  onSeekBackward,
  onSpeedIncrease,
  onSpeedDecrease,
  onToggleFullscreen,
  onShowHelp,
  disabled = false,
} = {}) {
  // Space - Play/Pause
  useHotkeys(
    "space",
    (event) => {
      event.preventDefault();
      onPlayPause?.();
    },
    {
      enabled: !disabled && !!onPlayPause,
      enableOnFormTags: false, // Don't trigger when focused on inputs
    },
    [onPlayPause, disabled]
  );

  // Left Arrow - Seek backward (1 second)
  useHotkeys(
    "left",
    (event) => {
      event.preventDefault();
      onSeekBackward?.(1000);
    },
    {
      enabled: !disabled && !!onSeekBackward,
      enableOnFormTags: false,
    },
    [onSeekBackward, disabled]
  );

  // Right Arrow - Seek forward (1 second)
  useHotkeys(
    "right",
    (event) => {
      event.preventDefault();
      onSeekForward?.(1000);
    },
    {
      enabled: !disabled && !!onSeekForward,
      enableOnFormTags: false,
    },
    [onSeekForward, disabled]
  );

  // Shift + Left Arrow - Seek backward (5 seconds)
  useHotkeys(
    "shift+left",
    (event) => {
      event.preventDefault();
      onSeekBackward?.(5000);
    },
    {
      enabled: !disabled && !!onSeekBackward,
      enableOnFormTags: false,
    },
    [onSeekBackward, disabled]
  );

  // Shift + Right Arrow - Seek forward (5 seconds)
  useHotkeys(
    "shift+right",
    (event) => {
      event.preventDefault();
      onSeekForward?.(5000);
    },
    {
      enabled: !disabled && !!onSeekForward,
      enableOnFormTags: false,
    },
    [onSeekForward, disabled]
  );

  // Up Arrow - Increase playback speed
  useHotkeys(
    "up",
    (event) => {
      event.preventDefault();
      onSpeedIncrease?.();
    },
    {
      enabled: !disabled && !!onSpeedIncrease,
      enableOnFormTags: false,
    },
    [onSpeedIncrease, disabled]
  );

  // Down Arrow - Decrease playback speed
  useHotkeys(
    "down",
    (event) => {
      event.preventDefault();
      onSpeedDecrease?.();
    },
    {
      enabled: !disabled && !!onSpeedDecrease,
      enableOnFormTags: false,
    },
    [onSpeedDecrease, disabled]
  );

  // F - Toggle fullscreen
  useHotkeys(
    "f",
    (event) => {
      event.preventDefault();
      onToggleFullscreen?.();
    },
    {
      enabled: !disabled && !!onToggleFullscreen,
      enableOnFormTags: false,
    },
    [onToggleFullscreen, disabled]
  );

  // ? - Show keyboard shortcuts help
  useHotkeys(
    "shift+/",
    (event) => {
      event.preventDefault();
      onShowHelp?.();
    },
    {
      enabled: !disabled && !!onShowHelp,
      enableOnFormTags: false,
    },
    [onShowHelp, disabled]
  );

  // K - Alternative play/pause (common in video players)
  useHotkeys(
    "k",
    (event) => {
      event.preventDefault();
      onPlayPause?.();
    },
    {
      enabled: !disabled && !!onPlayPause,
      enableOnFormTags: false,
    },
    [onPlayPause, disabled]
  );

  // J - Seek backward 10 seconds (YouTube-style)
  useHotkeys(
    "j",
    (event) => {
      event.preventDefault();
      onSeekBackward?.(10000);
    },
    {
      enabled: !disabled && !!onSeekBackward,
      enableOnFormTags: false,
    },
    [onSeekBackward, disabled]
  );

  // L - Seek forward 10 seconds (YouTube-style)
  useHotkeys(
    "l",
    (event) => {
      event.preventDefault();
      onSeekForward?.(10000);
    },
    {
      enabled: !disabled && !!onSeekForward,
      enableOnFormTags: false,
    },
    [onSeekForward, disabled]
  );
}

/**
 * Get the list of available keyboard shortcuts
 * @returns {Array} List of shortcuts with their descriptions
 */
export function getKeyboardShortcuts() {
  return [
    {
      key: "Space / K",
      description: "Play / Pause",
      category: "Playback",
    },
    {
      key: "←",
      description: "Seek backward 1 second",
      category: "Playback",
    },
    {
      key: "→",
      description: "Seek forward 1 second",
      category: "Playback",
    },
    {
      key: "Shift + ←",
      description: "Seek backward 5 seconds",
      category: "Playback",
    },
    {
      key: "Shift + →",
      description: "Seek forward 5 seconds",
      category: "Playback",
    },
    {
      key: "J",
      description: "Seek backward 10 seconds",
      category: "Playback",
    },
    {
      key: "L",
      description: "Seek forward 10 seconds",
      category: "Playback",
    },
    {
      key: "↑",
      description: "Increase playback speed",
      category: "Playback",
    },
    {
      key: "↓",
      description: "Decrease playback speed",
      category: "Playback",
    },
    {
      key: "F",
      description: "Toggle fullscreen",
      category: "Display",
    },
    {
      key: "?",
      description: "Show keyboard shortcuts",
      category: "Help",
    },
  ];
}
