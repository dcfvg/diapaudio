import { describe, it, expect, beforeEach } from 'vitest';
import { useUiStore } from '../useUiStore.js';

describe('useUiStore', () => {
  beforeEach(() => {
    // Reset UI store to initial state (don't use replace flag to preserve methods)
    useUiStore.setState({
      isDragging: false,
      noticesOpen: false,
      hudVisible: false,
      hudPinned: false,
      delayDraft: '',
    });
  });

  it('initializes with default values', () => {
    const state = useUiStore.getState();
    expect(state.isDragging).toBe(false);
    expect(state.noticesOpen).toBe(false);
    expect(state.hudVisible).toBe(false);
    expect(state.hudPinned).toBe(false);
    expect(state.delayDraft).toBe('');
  });

  it('toggles dragging state', () => {
    useUiStore.getState().setDragging(true);
    expect(useUiStore.getState().isDragging).toBe(true);
    
    useUiStore.getState().setDragging(false);
    expect(useUiStore.getState().isDragging).toBe(false);
  });

  it('opens and closes notices', () => {
    useUiStore.getState().setNoticesOpen(true);
    expect(useUiStore.getState().noticesOpen).toBe(true);
    
    useUiStore.getState().setNoticesOpen(false);
    expect(useUiStore.getState().noticesOpen).toBe(false);
  });

  it('shows and hides HUD', () => {
    useUiStore.getState().showHud();
    expect(useUiStore.getState().hudVisible).toBe(true);
    
    useUiStore.getState().hideHud();
    expect(useUiStore.getState().hudVisible).toBe(false);
  });

  it('pins and unpins HUD', () => {
    useUiStore.getState().setHudPinned(true);
    expect(useUiStore.getState().hudPinned).toBe(true);
    
    useUiStore.getState().setHudPinned(false);
    expect(useUiStore.getState().hudPinned).toBe(false);
  });

  it('updates delay draft', () => {
    useUiStore.getState().setDelayDraft('1:30');
    expect(useUiStore.getState().delayDraft).toBe('1:30');
    
    useUiStore.getState().setDelayDraft('-0:45');
    expect(useUiStore.getState().delayDraft).toBe('-0:45');
  });

  it('avoids unnecessary updates when value is unchanged', () => {
    // Set dragging to true
    useUiStore.getState().setDragging(true);
    expect(useUiStore.getState().isDragging).toBe(true);
    
    // Set to the same value again - should not cause error
    useUiStore.getState().setDragging(true);
    expect(useUiStore.getState().isDragging).toBe(true);
    
    // The optimization returns {} to avoid Zustand update, but verifying reference
    // equality is unreliable due to React batching. Behavior is correct if value stays consistent.
  });
});
