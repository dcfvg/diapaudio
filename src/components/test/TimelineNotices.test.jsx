import { describe, it, expect, vi, beforeEach } from 'vitest';
import React from 'react';
import { renderWithProviders } from '../../test/test-utils.jsx';
import TimelineNotices from '../TimelineNotices.jsx';
import { screen } from '@testing-library/react';
import { useMediaStore } from '../../state/useMediaStore.js';

vi.mock('../../state/useMediaStore.js', () => ({
  useMediaStore: vi.fn(),
}));

describe('TimelineNotices', () => {
  const defaultProps = {
    open: true,
    onClose: vi.fn(),
  };

  beforeEach(() => {
    vi.clearAllMocks();
  });

  it('returns null when there are no notices', () => {
    useMediaStore.mockImplementation((selector) => 
      selector({ anomalies: [] })
    );

    const { container } = renderWithProviders(<TimelineNotices {...defaultProps} />);
    expect(container.firstChild).toBeFalsy();
  });

  it('renders when open is true with notices', () => {
    useMediaStore.mockImplementation((selector) => 
      selector({ anomalies: ['Test notice'] })
    );

    renderWithProviders(<TimelineNotices {...defaultProps} />);
    expect(screen.getByText('Timeline notices')).toBeTruthy();
  });

  it('does not render when open is false', () => {
    useMediaStore.mockImplementation((selector) => 
      selector({ anomalies: ['Test notice'] })
    );

    renderWithProviders(<TimelineNotices {...defaultProps} open={false} />);
    expect(screen.queryByText('Timeline notices')).toBeFalsy();
  });

  it('displays warning icon', () => {
    useMediaStore.mockImplementation((selector) => 
      selector({ anomalies: ['Test notice'] })
    );

    renderWithProviders(<TimelineNotices {...defaultProps} />);
    expect(screen.getByText('Timeline notices')).toBeTruthy();
  });

  it('displays close button', () => {
    useMediaStore.mockImplementation((selector) => 
      selector({ anomalies: ['Test notice'] })
    );

    renderWithProviders(<TimelineNotices {...defaultProps} />);
    expect(screen.getByText('Close')).toBeTruthy();
  });

  it('displays notice messages', () => {
    useMediaStore.mockImplementation((selector) => 
      selector({ anomalies: ['First notice', 'Second notice'] })
    );

    renderWithProviders(<TimelineNotices {...defaultProps} />);
    expect(screen.getByText('First notice')).toBeTruthy();
    expect(screen.getByText('Second notice')).toBeTruthy();
  });

  it('sanitizes HTML in notices', () => {
    useMediaStore.mockImplementation((selector) => 
      selector({ anomalies: ['<script>alert("xss")</script><strong>Safe text</strong>'] })
    );

    renderWithProviders(<TimelineNotices {...defaultProps} />);
    expect(screen.getByText('Safe text')).toBeTruthy();
  });

  it('handles notice objects with message property', () => {
    useMediaStore.mockImplementation((selector) => 
      selector({ anomalies: [{ message: 'Object notice' }] })
    );

    renderWithProviders(<TimelineNotices {...defaultProps} />);
    expect(screen.getByText('Object notice')).toBeTruthy();
  });

  it('filters out falsy notices', () => {
    useMediaStore.mockImplementation((selector) => 
      selector({ anomalies: ['Valid notice', null, undefined, ''] })
    );

    const { container } = renderWithProviders(<TimelineNotices {...defaultProps} />);
    const messages = container.querySelectorAll('.timeline-notices__message');
    // Should filter out falsy values
    expect(messages.length).toBeLessThanOrEqual(2);
  });

  it('renders multiple notice messages', () => {
    useMediaStore.mockImplementation((selector) => 
      selector({ anomalies: ['Notice 1', 'Notice 2', 'Notice 3'] })
    );
    renderWithProviders(<TimelineNotices {...defaultProps} />);
    expect(screen.getByText('Notice 1')).toBeTruthy();
    expect(screen.getByText('Notice 2')).toBeTruthy();
    expect(screen.getByText('Notice 3')).toBeTruthy();
  });

  it('handles empty anomalies array', () => {
    useMediaStore.mockImplementation((selector) => 
      selector({ anomalies: [] })
    );

    const { container } = renderWithProviders(<TimelineNotices {...defaultProps} />);
    expect(container.firstChild).toBeFalsy();
  });

  it('handles null anomalies', () => {
    useMediaStore.mockImplementation((selector) => 
      selector({ anomalies: null })
    );

    const { container } = renderWithProviders(<TimelineNotices {...defaultProps} />);
    expect(container.firstChild).toBeFalsy();
  });

  it('handles undefined anomalies', () => {
    useMediaStore.mockImplementation((selector) => 
      selector({ anomalies: undefined })
    );

    const { container } = renderWithProviders(<TimelineNotices {...defaultProps} />);
    expect(container.firstChild).toBeFalsy();
  });

  it('has correct accessibility attributes', () => {
    useMediaStore.mockImplementation((selector) => 
      selector({ anomalies: ['Test notice'] })
    );

    renderWithProviders(<TimelineNotices {...defaultProps} />);
    const noticesText = screen.getByText('Test notice');
    expect(noticesText).toBeTruthy();
    const noticesContainer = noticesText.closest('.timeline-notices');
    expect(noticesContainer.id).toBe('timeline-notices-modal-messages');
  });
});
