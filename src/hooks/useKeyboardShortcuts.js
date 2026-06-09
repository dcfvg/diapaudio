import { useCallback } from "react";
import { useHotkeys } from "react-hotkeys-hook";

/**
 * Custom hook for keyboard shortcuts in the app
 * @param {Object} options - Configuration options
 * @param {Function} options.onPlayPause - Toggle play/pause
 * @param {Function} options.onSeekForward - Seek forward in timeline
 * @param {Function} options.onSeekBackward - Seek backward in timeline
 * @param {Function} options.onNextMedia - Jump to next media event
 * @param {Function} options.onPrevMedia - Jump to previous media event
 * @param {Function} options.onSpeedIncrease - Increase playback speed
 * @param {Function} options.onSpeedDecrease - Decrease playback speed
 * @param {Function} options.onToggleFullscreen - Toggle fullscreen mode
 * @param {Function} options.onShowHelp - Show keyboard shortcuts help
 * @param {Function} options.shouldIgnoreEvent - Ignore shortcuts for editable/interactive targets
 * @param {boolean} options.disabled - Disable all shortcuts
 */
export function useKeyboardShortcuts({
  onPlayPause,
  onSeekForward,
  onSeekBackward,
  onNextMedia,
  onPrevMedia,
  onSpeedIncrease,
  onSpeedDecrease,
  onToggleFullscreen,
  onShowHelp,
  shouldIgnoreEvent,
  disabled = false,
} = {}) {
  const runShortcut = useCallback((event, callback, ...args) => {
    if (shouldIgnoreEvent?.(event)) {
      return;
    }
    event.preventDefault();
    callback?.(...args);
  }, [shouldIgnoreEvent]);

  // Space - Play/Pause
  useHotkeys(
    "space",
    (event) => {
      runShortcut(event, onPlayPause);
    },
    {
      enabled: !disabled && !!onPlayPause,
      enableOnFormTags: false, // Don't trigger when focused on inputs
    },
    [onPlayPause, runShortcut, disabled]
  );

  // Left Arrow - Seek backward (10 seconds)
  useHotkeys(
    "left",
    (event) => {
      runShortcut(event, onSeekBackward, 10000);
    },
    {
      enabled: !disabled && !!onSeekBackward,
      enableOnFormTags: false,
    },
    [onSeekBackward, runShortcut, disabled]
  );

  // Right Arrow - Seek forward (10 seconds)
  useHotkeys(
    "right",
    (event) => {
      runShortcut(event, onSeekForward, 10000);
    },
    {
      enabled: !disabled && !!onSeekForward,
      enableOnFormTags: false,
    },
    [onSeekForward, runShortcut, disabled]
  );

  // Up Arrow - Increase playback speed
  useHotkeys(
    "up",
    (event) => {
      runShortcut(event, onSpeedIncrease);
    },
    {
      enabled: !disabled && !!onSpeedIncrease,
      enableOnFormTags: false,
    },
    [onSpeedIncrease, runShortcut, disabled]
  );

  // Down Arrow - Decrease playback speed
  useHotkeys(
    "down",
    (event) => {
      runShortcut(event, onSpeedDecrease);
    },
    {
      enabled: !disabled && !!onSpeedDecrease,
      enableOnFormTags: false,
    },
    [onSpeedDecrease, runShortcut, disabled]
  );

  // F - Toggle fullscreen
  useHotkeys(
    "f",
    (event) => {
      runShortcut(event, onToggleFullscreen);
    },
    {
      enabled: !disabled && !!onToggleFullscreen,
      enableOnFormTags: false,
    },
    [onToggleFullscreen, runShortcut, disabled]
  );

  // ? - Show keyboard shortcuts help
  useHotkeys(
    "shift+/",
    (event) => {
      runShortcut(event, onShowHelp);
    },
    {
      enabled: !disabled && !!onShowHelp,
      enableOnFormTags: false,
    },
    [onShowHelp, runShortcut, disabled]
  );

  // J - Jump to next media (audio start or image)
  useHotkeys(
    "j",
    (event) => {
      runShortcut(event, onNextMedia);
    },
    {
      enabled: !disabled && !!onNextMedia,
      enableOnFormTags: false,
    },
    [onNextMedia, runShortcut, disabled]
  );

  // K - Jump to previous media (audio start or image)
  useHotkeys(
    "k",
    (event) => {
      runShortcut(event, onPrevMedia);
    },
    {
      enabled: !disabled && !!onPrevMedia,
      enableOnFormTags: false,
    },
    [onPrevMedia, runShortcut, disabled]
  );
}

/**
 * Get the list of available keyboard shortcuts
 * @returns {Array} List of shortcuts with their descriptions
 */
export function getKeyboardShortcuts() {
  return [
    {
      key: "Space",
      description: "shortcutPlayPause",
      category: "Playback",
    },
    {
      key: "←",
      description: "shortcutSeekBackward",
      category: "Playback",
    },
    {
      key: "→",
      description: "shortcutSeekForward",
      category: "Playback",
    },
    {
      key: "J",
      description: "shortcutNextMedia",
      category: "Playback",
    },
    {
      key: "K",
      description: "shortcutPrevMedia",
      category: "Playback",
    },
    {
      key: "↑",
      description: "shortcutSpeedUp",
      category: "Playback",
    },
    {
      key: "↓",
      description: "shortcutSpeedDown",
      category: "Playback",
    },
    {
      key: "F",
      description: "shortcutFullscreen",
      category: "Display",
    },
    {
      key: "?",
      description: "shortcutHelp",
      category: "Help",
    },
  ];
}
