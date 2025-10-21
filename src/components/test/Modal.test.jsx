import { describe, it, expect } from 'vitest';
import React from 'react';
import userEvent from '@testing-library/user-event';
import { screen } from '../../test/test-utils.jsx';
import { renderWithProviders } from '../../test/test-utils.jsx';
import Modal from '../Modal.jsx';

describe('Modal', () => {
  it('does not render when closed', () => {
    renderWithProviders(<Modal open={false} title="Test Modal">Content</Modal>);
    expect(screen.queryByRole('dialog')).not.toBeInTheDocument();
  });

  it('renders when open', () => {
    renderWithProviders(<Modal open={true} title="Test Modal">Content</Modal>);
    expect(screen.getByRole('dialog')).toBeInTheDocument();
  });

  it('displays title', () => {
    renderWithProviders(<Modal open={true} title="Test Modal">Content</Modal>);
    expect(screen.getByText('Test Modal')).toBeInTheDocument();
  });

  it('displays subtitle', () => {
    renderWithProviders(
      <Modal open={true} title="Test Modal" subtitle="Subtitle text">
        Content
      </Modal>
    );
    expect(screen.getByText('Subtitle text')).toBeInTheDocument();
  });

  it('displays children content', () => {
    renderWithProviders(
      <Modal open={true} title="Test Modal">
        <div>Modal body content</div>
      </Modal>
    );
    expect(screen.getByText('Modal body content')).toBeInTheDocument();
  });

  it('renders close button when onClose provided', () => {
    const onClose = () => {};
    renderWithProviders(
      <Modal open={true} title="Test Modal" onClose={onClose}>
        Content
      </Modal>
    );
    expect(screen.getByLabelText('Close')).toBeInTheDocument();
  });

  it('calls onClose when close button clicked', async () => {
    let closed = false;
    const onClose = () => {
      closed = true;
    };
    renderWithProviders(
      <Modal open={true} title="Test Modal" onClose={onClose}>
        Content
      </Modal>
    );

    await userEvent.click(screen.getByLabelText('Close'));
    expect(closed).toBe(true);
  });

  it('renders action buttons', () => {
    const actions = [
      { key: 'cancel', label: 'Cancel', onClick: () => {} },
      { key: 'confirm', label: 'Confirm', onClick: () => {} },
    ];

    renderWithProviders(
      <Modal open={true} title="Test Modal" actions={actions}>
        Content
      </Modal>
    );

    expect(screen.getByText('Cancel')).toBeInTheDocument();
    expect(screen.getByText('Confirm')).toBeInTheDocument();
  });

  it('calls action onClick handlers', async () => {
    let clicked = false;
    const actions = [{ key: 'test', label: 'Test Action', onClick: () => { clicked = true; } }];

    renderWithProviders(
      <Modal open={true} title="Test Modal" actions={actions}>
        Content
      </Modal>
    );

    await userEvent.click(screen.getByText('Test Action'));
    expect(clicked).toBe(true);
  });

  it('applies size classes', () => {
    renderWithProviders(
      <Modal open={true} title="Test Modal" size="lg">
        Content
      </Modal>
    );

    // Modal renders to document.body via portal
    const modal = document.body.querySelector('.modal');
    expect(modal?.classList.contains('modal--lg')).toBe(true);
  });

  it('applies variant classes', () => {
    renderWithProviders(
      <Modal open={true} title="Test Modal" variant="danger">
        Content
      </Modal>
    );

    // Modal renders to document.body via portal
    const overlay = document.body.querySelector('.modal-overlay');
    expect(overlay?.classList.contains('modal--danger')).toBe(true);
  });

  it('renders icon when provided', () => {
    const icon = '⚠️';
    renderWithProviders(
      <Modal open={true} title="Test Modal" icon={icon}>
        Content
      </Modal>
    );

    const iconEl = document.querySelector('.modal__icon');
    expect(iconEl?.textContent).toBe(icon);
  });

  it('applies custom className', () => {
    renderWithProviders(
      <Modal open={true} title="Test Modal" className="custom-modal">
        Content
      </Modal>
    );

    // Modal renders to document.body via portal
    const overlay = document.body.querySelector('.modal-overlay');
    expect(overlay?.classList.contains('custom-modal')).toBe(true);
  });

  it('applies aria-modal and role attributes', () => {
    renderWithProviders(<Modal open={true} title="Test Modal">Content</Modal>);
    const dialog = screen.getByRole('dialog');
    expect(dialog.getAttribute('aria-modal')).toBe('true');
  });

  it('disables action buttons when specified', () => {
    const actions = [{ key: 'test', label: 'Disabled', onClick: () => {}, disabled: true }];

    renderWithProviders(
      <Modal open={true} title="Test Modal" actions={actions}>
        Content
      </Modal>
    );

    const button = screen.getByText('Disabled');
    expect(button).toBeDisabled();
  });
});
