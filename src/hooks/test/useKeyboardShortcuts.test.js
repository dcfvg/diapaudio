import { describe, it, expect, vi, beforeEach } from 'vitest';
import { renderHook } from '@testing-library/react';
import { useKeyboardShortcuts, getKeyboardShortcuts } from '../useKeyboardShortcuts.js';

// Mock react-hotkeys-hook
vi.mock('react-hotkeys-hook', () => ({
  useHotkeys: vi.fn((keys, callback, options) => {
    // Store the callback so we can invoke it in tests
    if (!global.hotkeyCallbacks) {
      global.hotkeyCallbacks = {};
    }
    if (options?.enabled !== false) {
      global.hotkeyCallbacks[keys] = callback;
    } else {
      delete global.hotkeyCallbacks[keys];
    }
  }),
}));

describe('useKeyboardShortcuts', () => {
  let callbacks;

  beforeEach(() => {
    callbacks = {
      onPlayPause: vi.fn(),
      onSeekForward: vi.fn(),
      onSeekBackward: vi.fn(),
      onSpeedIncrease: vi.fn(),
      onSpeedDecrease: vi.fn(),
      onToggleFullscreen: vi.fn(),
      onShowHelp: vi.fn(),
    };
    global.hotkeyCallbacks = {};
  });

  describe('Play/Pause shortcuts', () => {
    it('should register space key for play/pause', () => {
      renderHook(() => useKeyboardShortcuts(callbacks));

      expect(global.hotkeyCallbacks['space']).toBeDefined();
      
      // Simulate key press
      const event = { preventDefault: vi.fn() };
      global.hotkeyCallbacks['space'](event);

      expect(event.preventDefault).toHaveBeenCalled();
      expect(callbacks.onPlayPause).toHaveBeenCalledTimes(1);
    });

    it('should register k key for play/pause', () => {
      renderHook(() => useKeyboardShortcuts(callbacks));

      expect(global.hotkeyCallbacks['k']).toBeDefined();
      
      const event = { preventDefault: vi.fn() };
      global.hotkeyCallbacks['k'](event);

      expect(event.preventDefault).toHaveBeenCalled();
      expect(callbacks.onPlayPause).toHaveBeenCalledTimes(1);
    });

    it('should not register play/pause shortcuts when disabled', () => {
      renderHook(() => useKeyboardShortcuts({ ...callbacks, disabled: true }));

      expect(global.hotkeyCallbacks['space']).toBeUndefined();
      expect(global.hotkeyCallbacks['k']).toBeUndefined();
    });

    it('should not register play/pause shortcuts when callback is not provided', () => {
  // remove play/pause handler
  const rest = { ...callbacks };
  delete rest.onPlayPause;
  renderHook(() => useKeyboardShortcuts(rest));

      expect(global.hotkeyCallbacks['space']).toBeUndefined();
      expect(global.hotkeyCallbacks['k']).toBeUndefined();
    });
  });

  describe('Seek shortcuts', () => {
    it('should seek forward 1 second on right arrow', () => {
      renderHook(() => useKeyboardShortcuts(callbacks));

      expect(global.hotkeyCallbacks['right']).toBeDefined();
      
      const event = { preventDefault: vi.fn() };
      global.hotkeyCallbacks['right'](event);

      expect(event.preventDefault).toHaveBeenCalled();
      expect(callbacks.onSeekForward).toHaveBeenCalledWith(1000);
    });

    it('should seek backward 1 second on left arrow', () => {
      renderHook(() => useKeyboardShortcuts(callbacks));

      expect(global.hotkeyCallbacks['left']).toBeDefined();
      
      const event = { preventDefault: vi.fn() };
      global.hotkeyCallbacks['left'](event);

      expect(event.preventDefault).toHaveBeenCalled();
      expect(callbacks.onSeekBackward).toHaveBeenCalledWith(1000);
    });

    it('should seek forward 5 seconds on shift+right arrow', () => {
      renderHook(() => useKeyboardShortcuts(callbacks));

      expect(global.hotkeyCallbacks['shift+right']).toBeDefined();
      
      const event = { preventDefault: vi.fn() };
      global.hotkeyCallbacks['shift+right'](event);

      expect(event.preventDefault).toHaveBeenCalled();
      expect(callbacks.onSeekForward).toHaveBeenCalledWith(5000);
    });

    it('should seek backward 5 seconds on shift+left arrow', () => {
      renderHook(() => useKeyboardShortcuts(callbacks));

      expect(global.hotkeyCallbacks['shift+left']).toBeDefined();
      
      const event = { preventDefault: vi.fn() };
      global.hotkeyCallbacks['shift+left'](event);

      expect(event.preventDefault).toHaveBeenCalled();
      expect(callbacks.onSeekBackward).toHaveBeenCalledWith(5000);
    });

    it('should seek forward 10 seconds on l key', () => {
      renderHook(() => useKeyboardShortcuts(callbacks));

      expect(global.hotkeyCallbacks['l']).toBeDefined();
      
      const event = { preventDefault: vi.fn() };
      global.hotkeyCallbacks['l'](event);

      expect(event.preventDefault).toHaveBeenCalled();
      expect(callbacks.onSeekForward).toHaveBeenCalledWith(10000);
    });

    it('should seek backward 10 seconds on j key', () => {
      renderHook(() => useKeyboardShortcuts(callbacks));

      expect(global.hotkeyCallbacks['j']).toBeDefined();
      
      const event = { preventDefault: vi.fn() };
      global.hotkeyCallbacks['j'](event);

      expect(event.preventDefault).toHaveBeenCalled();
      expect(callbacks.onSeekBackward).toHaveBeenCalledWith(10000);
    });

    it('should not register seek shortcuts when disabled', () => {
      renderHook(() => useKeyboardShortcuts({ ...callbacks, disabled: true }));

      expect(global.hotkeyCallbacks['right']).toBeUndefined();
      expect(global.hotkeyCallbacks['left']).toBeUndefined();
      expect(global.hotkeyCallbacks['j']).toBeUndefined();
      expect(global.hotkeyCallbacks['l']).toBeUndefined();
    });

    it('should not register seek shortcuts when callbacks are not provided', () => {
  // remove seek handlers
  const rest = { ...callbacks };
  delete rest.onSeekForward;
  delete rest.onSeekBackward;
  renderHook(() => useKeyboardShortcuts(rest));

      expect(global.hotkeyCallbacks['right']).toBeUndefined();
      expect(global.hotkeyCallbacks['left']).toBeUndefined();
      expect(global.hotkeyCallbacks['j']).toBeUndefined();
      expect(global.hotkeyCallbacks['l']).toBeUndefined();
    });
  });

  describe('Speed control shortcuts', () => {
    it('should increase speed on up arrow', () => {
      renderHook(() => useKeyboardShortcuts(callbacks));

      expect(global.hotkeyCallbacks['up']).toBeDefined();
      
      const event = { preventDefault: vi.fn() };
      global.hotkeyCallbacks['up'](event);

      expect(event.preventDefault).toHaveBeenCalled();
      expect(callbacks.onSpeedIncrease).toHaveBeenCalledTimes(1);
    });

    it('should decrease speed on down arrow', () => {
      renderHook(() => useKeyboardShortcuts(callbacks));

      expect(global.hotkeyCallbacks['down']).toBeDefined();
      
      const event = { preventDefault: vi.fn() };
      global.hotkeyCallbacks['down'](event);

      expect(event.preventDefault).toHaveBeenCalled();
      expect(callbacks.onSpeedDecrease).toHaveBeenCalledTimes(1);
    });

    it('should not register speed shortcuts when disabled', () => {
      renderHook(() => useKeyboardShortcuts({ ...callbacks, disabled: true }));

      expect(global.hotkeyCallbacks['up']).toBeUndefined();
      expect(global.hotkeyCallbacks['down']).toBeUndefined();
    });

    it('should not register speed shortcuts when callbacks are not provided', () => {
  // remove speed handlers
  const rest = { ...callbacks };
  delete rest.onSpeedIncrease;
  delete rest.onSpeedDecrease;
  renderHook(() => useKeyboardShortcuts(rest));

      expect(global.hotkeyCallbacks['up']).toBeUndefined();
      expect(global.hotkeyCallbacks['down']).toBeUndefined();
    });
  });

  describe('Fullscreen shortcut', () => {
    it('should toggle fullscreen on f key', () => {
      renderHook(() => useKeyboardShortcuts(callbacks));

      expect(global.hotkeyCallbacks['f']).toBeDefined();
      
      const event = { preventDefault: vi.fn() };
      global.hotkeyCallbacks['f'](event);

      expect(event.preventDefault).toHaveBeenCalled();
      expect(callbacks.onToggleFullscreen).toHaveBeenCalledTimes(1);
    });

    it('should not register fullscreen shortcut when disabled', () => {
      renderHook(() => useKeyboardShortcuts({ ...callbacks, disabled: true }));

      expect(global.hotkeyCallbacks['f']).toBeUndefined();
    });

    it('should not register fullscreen shortcut when callback is not provided', () => {
  // remove fullscreen handler
  const rest = { ...callbacks };
  delete rest.onToggleFullscreen;
  renderHook(() => useKeyboardShortcuts(rest));

      expect(global.hotkeyCallbacks['f']).toBeUndefined();
    });
  });

  describe('Help shortcut', () => {
    it('should show help on shift+/ (? key)', () => {
      renderHook(() => useKeyboardShortcuts(callbacks));

      expect(global.hotkeyCallbacks['shift+/']).toBeDefined();
      
      const event = { preventDefault: vi.fn() };
      global.hotkeyCallbacks['shift+/'](event);

      expect(event.preventDefault).toHaveBeenCalled();
      expect(callbacks.onShowHelp).toHaveBeenCalledTimes(1);
    });

    it('should not register help shortcut when disabled', () => {
      renderHook(() => useKeyboardShortcuts({ ...callbacks, disabled: true }));

      expect(global.hotkeyCallbacks['shift+/']).toBeUndefined();
    });

    it('should not register help shortcut when callback is not provided', () => {
  // remove help handler
  const rest = { ...callbacks };
  delete rest.onShowHelp;
  renderHook(() => useKeyboardShortcuts(rest));

      expect(global.hotkeyCallbacks['shift+/']).toBeUndefined();
    });
  });

  describe('Hook stability and cleanup', () => {
    it('should work with empty options object', () => {
      const { unmount } = renderHook(() => useKeyboardShortcuts({}));

      // No shortcuts should be registered
      expect(Object.keys(global.hotkeyCallbacks).length).toBe(0);

      unmount();
    });

    it('should work with no options provided', () => {
      const { unmount } = renderHook(() => useKeyboardShortcuts());

      // No shortcuts should be registered
      expect(Object.keys(global.hotkeyCallbacks).length).toBe(0);

      unmount();
    });

    it('should register all shortcuts when all callbacks provided', () => {
      renderHook(() => useKeyboardShortcuts(callbacks));

      // Should have 10 shortcuts registered (space, k, left, right, shift+left, shift+right, j, l, up, down, f, shift+/)
      expect(global.hotkeyCallbacks['space']).toBeDefined();
      expect(global.hotkeyCallbacks['k']).toBeDefined();
      expect(global.hotkeyCallbacks['left']).toBeDefined();
      expect(global.hotkeyCallbacks['right']).toBeDefined();
      expect(global.hotkeyCallbacks['shift+left']).toBeDefined();
      expect(global.hotkeyCallbacks['shift+right']).toBeDefined();
      expect(global.hotkeyCallbacks['j']).toBeDefined();
      expect(global.hotkeyCallbacks['l']).toBeDefined();
      expect(global.hotkeyCallbacks['up']).toBeDefined();
      expect(global.hotkeyCallbacks['down']).toBeDefined();
      expect(global.hotkeyCallbacks['f']).toBeDefined();
      expect(global.hotkeyCallbacks['shift+/']).toBeDefined();
    });

    it('should update callbacks when they change', () => {
      const newCallback = vi.fn();
      const { rerender } = renderHook(
        ({ onPlayPause }) => useKeyboardShortcuts({ onPlayPause }),
        { initialProps: { onPlayPause: callbacks.onPlayPause } }
      );

      // Call the registered callback
      const event = { preventDefault: vi.fn() };
      global.hotkeyCallbacks['space'](event);
      expect(callbacks.onPlayPause).toHaveBeenCalledTimes(1);

      // Update callback and call again
      rerender({ onPlayPause: newCallback });
      const event2 = { preventDefault: vi.fn() };
      global.hotkeyCallbacks['space'](event2);
      expect(newCallback).toHaveBeenCalledTimes(1);
    });
  });

  describe('Disabled state changes', () => {
    it('should enable shortcuts when disabled changes from true to false', () => {
      const { rerender } = renderHook(
        ({ disabled }) => useKeyboardShortcuts({ ...callbacks, disabled }),
        { initialProps: { disabled: true } }
      );

      // Should not be registered when disabled
      expect(global.hotkeyCallbacks['space']).toBeUndefined();

      // Should be registered after enabling
      rerender({ disabled: false });
      expect(global.hotkeyCallbacks['space']).toBeDefined();
      
      const event = { preventDefault: vi.fn() };
      global.hotkeyCallbacks['space'](event);
      expect(callbacks.onPlayPause).toHaveBeenCalledTimes(1);
    });

    it('should disable shortcuts when disabled changes from false to true', () => {
      const { rerender } = renderHook(
        ({ disabled }) => useKeyboardShortcuts({ ...callbacks, disabled }),
        { initialProps: { disabled: false } }
      );

      // Should be registered when enabled
      expect(global.hotkeyCallbacks['space']).toBeDefined();
      
      const event = { preventDefault: vi.fn() };
      global.hotkeyCallbacks['space'](event);
      expect(callbacks.onPlayPause).toHaveBeenCalledTimes(1);

      // Should not be registered after disabling
      rerender({ disabled: true });
      expect(global.hotkeyCallbacks['space']).toBeUndefined();
    });
  });
});

describe('getKeyboardShortcuts', () => {
  it('should return array of keyboard shortcuts', () => {
    const shortcuts = getKeyboardShortcuts();

    expect(Array.isArray(shortcuts)).toBe(true);
    expect(shortcuts.length).toBeGreaterThan(0);
  });

  it('should have correct structure for each shortcut', () => {
    const shortcuts = getKeyboardShortcuts();

    shortcuts.forEach((shortcut) => {
      expect(shortcut).toHaveProperty('key');
      expect(shortcut).toHaveProperty('description');
      expect(shortcut).toHaveProperty('category');
      expect(typeof shortcut.key).toBe('string');
      expect(typeof shortcut.description).toBe('string');
      expect(typeof shortcut.category).toBe('string');
    });
  });

  it('should include play/pause shortcuts', () => {
    const shortcuts = getKeyboardShortcuts();

    const playPause = shortcuts.find((s) => s.key === 'Space / K');
    expect(playPause).toBeDefined();
    expect(playPause.description).toContain('Play');
    expect(playPause.category).toBe('Playback');
  });

  it('should include seek shortcuts', () => {
    const shortcuts = getKeyboardShortcuts();

    const seekForward = shortcuts.find((s) => s.key === '→');
    expect(seekForward).toBeDefined();
    expect(seekForward.description).toContain('forward');

    const seekBackward = shortcuts.find((s) => s.key === '←');
    expect(seekBackward).toBeDefined();
    expect(seekBackward.description).toContain('backward');

    const seekForward5 = shortcuts.find((s) => s.key === 'Shift + →');
    expect(seekForward5).toBeDefined();
    expect(seekForward5.description).toContain('5 seconds');

    const seekBackward5 = shortcuts.find((s) => s.key === 'Shift + ←');
    expect(seekBackward5).toBeDefined();
    expect(seekBackward5.description).toContain('5 seconds');

    const seekForwardJ = shortcuts.find((s) => s.key === 'J');
    expect(seekForwardJ).toBeDefined();
    expect(seekForwardJ.description).toContain('10 seconds');

    const seekForwardL = shortcuts.find((s) => s.key === 'L');
    expect(seekForwardL).toBeDefined();
    expect(seekForwardL.description).toContain('10 seconds');
  });

  it('should include speed control shortcuts', () => {
    const shortcuts = getKeyboardShortcuts();

    const speedIncrease = shortcuts.find((s) => s.key === '↑');
    expect(speedIncrease).toBeDefined();
    expect(speedIncrease.description).toContain('Increase');

    const speedDecrease = shortcuts.find((s) => s.key === '↓');
    expect(speedDecrease).toBeDefined();
    expect(speedDecrease.description).toContain('Decrease');
  });

  it('should include fullscreen shortcut', () => {
    const shortcuts = getKeyboardShortcuts();

    const fullscreen = shortcuts.find((s) => s.key === 'F');
    expect(fullscreen).toBeDefined();
    expect(fullscreen.description).toContain('fullscreen');
    expect(fullscreen.category).toBe('Display');
  });

  it('should include help shortcut', () => {
    const shortcuts = getKeyboardShortcuts();

    const help = shortcuts.find((s) => s.key === '?');
    expect(help).toBeDefined();
    expect(help.description).toContain('shortcuts');
    expect(help.category).toBe('Help');
  });

  it('should return expected number of shortcuts', () => {
    const shortcuts = getKeyboardShortcuts();

    // Space/K, arrows (4), J, L, up, down, F, ?
    expect(shortcuts.length).toBe(11);
  });

  it('should categorize shortcuts correctly', () => {
    const shortcuts = getKeyboardShortcuts();

    const playbackShortcuts = shortcuts.filter((s) => s.category === 'Playback');
    const displayShortcuts = shortcuts.filter((s) => s.category === 'Display');
    const helpShortcuts = shortcuts.filter((s) => s.category === 'Help');

    expect(playbackShortcuts.length).toBe(9);
    expect(displayShortcuts.length).toBe(1);
    expect(helpShortcuts.length).toBe(1);
  });
});
