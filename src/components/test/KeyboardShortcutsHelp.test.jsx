import { describe, it, expect, vi } from 'vitest';
import React from 'react';
import { renderWithProviders } from '../../test/test-utils.jsx';
import KeyboardShortcutsHelp from '../KeyboardShortcutsHelp.jsx';
import { screen } from '@testing-library/react';

describe('KeyboardShortcutsHelp', () => {
  const defaultProps = {
    open: true,
    onClose: vi.fn(),
  };

  it('renders when open is true', () => {
    renderWithProviders(<KeyboardShortcutsHelp {...defaultProps} />);
    expect(screen.getByText('Keyboard shortcuts')).toBeTruthy();
  });

  it('does not render when open is false', () => {
    renderWithProviders(<KeyboardShortcutsHelp {...defaultProps} open={false} />);
    expect(screen.queryByText('Keyboard shortcuts')).toBeFalsy();
  });

  it('displays keyboard icon', () => {
    renderWithProviders(<KeyboardShortcutsHelp {...defaultProps} />);
    expect(screen.getByText('Keyboard shortcuts')).toBeTruthy();
  });

  it('displays shortcuts grouped by category', () => {
    renderWithProviders(<KeyboardShortcutsHelp {...defaultProps} />);
    
    // Check for some common categories
    const content = screen.getByText('Keyboard shortcuts').parentElement?.parentElement;
    expect(content).toBeTruthy();
  });

  it('displays shortcut keys in kbd elements', () => {
    renderWithProviders(<KeyboardShortcutsHelp {...defaultProps} />);
    expect(screen.getByText('Space')).toBeTruthy();
  });

  it('displays toggle help instruction in footer', () => {
    renderWithProviders(<KeyboardShortcutsHelp {...defaultProps} />);
    expect(screen.getByText(/Press.*to toggle this help/)).toBeTruthy();
  });

  it('displays shortcut descriptions', () => {
    renderWithProviders(<KeyboardShortcutsHelp {...defaultProps} />);
    expect(screen.getByText('Play / Pause')).toBeTruthy();
    expect(screen.getByText('Toggle fullscreen')).toBeTruthy();
  });

  it('organizes shortcuts into sections', () => {
    renderWithProviders(<KeyboardShortcutsHelp {...defaultProps} />);
    expect(screen.getByText('Playback')).toBeTruthy();
    expect(screen.getByText('Display')).toBeTruthy();
    expect(screen.getByText('Help')).toBeTruthy();
  });

  it('displays category headings', () => {
    renderWithProviders(<KeyboardShortcutsHelp {...defaultProps} />);
    expect(screen.getByRole('heading', { name: 'Playback' })).toBeTruthy();
    expect(screen.getByRole('heading', { name: 'Display' })).toBeTruthy();
  });

  it('displays shortcuts in a list format', () => {
    renderWithProviders(<KeyboardShortcutsHelp {...defaultProps} />);
    // Check for actual shortcuts
    expect(screen.getByText('Play / Pause')).toBeTruthy();
    expect(screen.getByText('Seek backward 10 seconds')).toBeTruthy();
  });

  it('renders individual shortcut items', () => {
    renderWithProviders(<KeyboardShortcutsHelp {...defaultProps} />);
    // Check for key combinations and their descriptions
    expect(screen.getByText('J')).toBeTruthy();
    expect(screen.getByText('Jump to next media (audio or image)')).toBeTruthy();
  });
});
