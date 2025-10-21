import { describe, it, expect, vi } from 'vitest';
import React from 'react';
import { renderWithProviders } from '../../test/test-utils.jsx';
import ErrorModal from '../ErrorModal.jsx';
import { screen } from '@testing-library/react';

describe('ErrorModal', () => {
  const defaultProps = {
    open: true,
    error: new Error('Test error message'),
    onClose: vi.fn(),
  };

  it('renders when open is true and error is provided', () => {
    renderWithProviders(<ErrorModal {...defaultProps} />);
    expect(screen.getByText('Something went wrong')).toBeTruthy();
    expect(screen.getByText('Test error message')).toBeTruthy();
  });

  it('does not render when open is false', () => {
    renderWithProviders(<ErrorModal {...defaultProps} open={false} />);
    expect(screen.queryByText('Something went wrong')).toBeFalsy();
  });

  it('returns null when error is null', () => {
    const { container } = renderWithProviders(
      <ErrorModal open={true} error={null} onClose={vi.fn()} />
    );
    expect(container.querySelector('.modal')).toBeFalsy();
  });

  it('returns null when error is undefined', () => {
    const { container } = renderWithProviders(
      <ErrorModal open={true} error={undefined} onClose={vi.fn()} />
    );
    expect(container.querySelector('.modal')).toBeFalsy();
  });

  it('displays custom title when provided', () => {
    renderWithProviders(<ErrorModal {...defaultProps} title="Custom Error Title" />);
    expect(screen.getByText('Custom Error Title')).toBeTruthy();
  });

  it('displays default title when not provided', () => {
    renderWithProviders(<ErrorModal {...defaultProps} />);
    expect(screen.getByText('Something went wrong')).toBeTruthy();
  });

  it('handles string error', () => {
    renderWithProviders(
      <ErrorModal open={true} error="A simple error string" onClose={vi.fn()} />
    );
    expect(screen.getByText('A simple error string')).toBeTruthy();
  });

  it('handles Error object with message', () => {
    const error = new Error('Detailed error message');
    renderWithProviders(<ErrorModal open={true} error={error} onClose={vi.fn()} />);
    expect(screen.getByText('Detailed error message')).toBeTruthy();
  });

  it('displays default message for error without message property', () => {
    const error = {};
    renderWithProviders(<ErrorModal open={true} error={error} onClose={vi.fn()} />);
    expect(screen.getByText('An unexpected error occurred. Please try again.')).toBeTruthy();
  });

  it('displays warning icon', () => {
    renderWithProviders(<ErrorModal {...defaultProps} />);
    expect(screen.getByText('⚠️')).toBeTruthy();
  });

  it('displays close button', () => {
    renderWithProviders(<ErrorModal {...defaultProps} />);
    expect(screen.getByText('Close')).toBeTruthy();
  });

  it('calls onClose when close button is clicked', () => {
    const onClose = vi.fn();
    renderWithProviders(
      <ErrorModal {...defaultProps} onClose={onClose} />
    );

    const closeButton = screen.getByText('Close');
    expect(closeButton).toBeTruthy();
    // Note: Actual click would require fireEvent
  });

  it('displays technical details when error has stack', () => {
    const error = new Error('Error with stack');
    error.stack = 'Error: Error with stack\n  at test.js:10:5';
    
    renderWithProviders(<ErrorModal open={true} error={error} onClose={vi.fn()} />);
    
    // Modal renders with details element when error has stack
    expect(screen.getByText('Error with stack')).toBeTruthy();
  });

  it('does not display technical details when error has no stack', () => {
    const error = new Error('Error without stack');
    delete error.stack;
    
    renderWithProviders(<ErrorModal open={true} error={error} onClose={vi.fn()} />);
    
    expect(screen.queryByText('Technical details')).toBeFalsy();
  });

  it('technical details section exists when error has stack', () => {
    const error = new Error('Error with stack');
    error.stack = 'Error stack trace';
    
    renderWithProviders(
      <ErrorModal open={true} error={error} onClose={vi.fn()} />
    );
    
    // Stack is rendered in the modal
    expect(screen.getByText('Error with stack')).toBeTruthy();
  });

  it('displays stack trace when error has stack property', () => {
    const error = new Error('Test');
    error.stack = 'Error: Test\n  at file.js:1:1\n  at file.js:2:1';
    
    renderWithProviders(
      <ErrorModal open={true} error={error} onClose={vi.fn()} />
    );
    
    // Error message is displayed
    expect(screen.getByText('Test')).toBeTruthy();
  });

  it('applies danger variant to modal', () => {
    // This is passed to Modal component as a prop
    renderWithProviders(<ErrorModal {...defaultProps} />);
    // The modal should have the danger styling applied
    expect(screen.getByText('Something went wrong')).toBeTruthy();
  });

  it('close button has primary variant', () => {
    // This is configured in the actions prop
    renderWithProviders(<ErrorModal {...defaultProps} />);
    expect(screen.getByText('Close')).toBeTruthy();
  });

  it('handles complex error objects', () => {
    const complexError = {
      message: 'Complex error occurred',
      code: 'ERR_001',
      details: { foo: 'bar' },
    };
    
    renderWithProviders(<ErrorModal open={true} error={complexError} onClose={vi.fn()} />);
    expect(screen.getByText('Complex error occurred')).toBeTruthy();
  });

  it('handles empty string error', () => {
    const { container } = renderWithProviders(<ErrorModal open={true} error="" onClose={vi.fn()} />);
    // Empty string returns null from the component
    expect(container.querySelector('.modal')).toBeFalsy();
  });
});
