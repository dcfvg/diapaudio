import React from 'react';
import { describe, expect, it, vi } from 'vitest';
import { renderWithProviders, screen } from '../../test/test-utils.jsx';
import CompositionView from '../CompositionView.jsx';

vi.mock('../TransitionImage.jsx', () => ({
  default: function MockTransitionImage({ image, slotIndex }) {
    return (
      <div
        data-testid={`transition-slot-${slotIndex}`}
        data-image-name={image?.name || ''}
      />
    );
  },
}));

describe('CompositionView', () => {
  it('renders the exact schedule slot order without compacting holes', () => {
    const imageA = { name: 'a.jpg', url: 'blob:a' };
    const imageC = { name: 'c.jpg', url: 'blob:c' };

    renderWithProviders(
      <CompositionView
        slots={[{ image: imageA }, null, { image: imageC }]}
        layoutSize={3}
      />
    );

    const slots = document.querySelectorAll('.slideshow__slot');
    expect(slots).toHaveLength(3);
    expect(slots[0].querySelector('[data-image-name]')).toHaveAttribute('data-image-name', 'a.jpg');
    expect(slots[1].querySelector('[data-image-name]')).toHaveAttribute('data-image-name', '');
    expect(slots[2].querySelector('[data-image-name]')).toHaveAttribute('data-image-name', 'c.jpg');
  });

  it('does not move persistent images back to their previous rendered slot on rerender', () => {
    const imageA = { name: 'a.jpg', url: 'blob:a' };
    const imageB = { name: 'b.jpg', url: 'blob:b' };

    const { rerender } = renderWithProviders(
      <CompositionView
        slots={[{ image: imageA }, { image: imageB }]}
        layoutSize={2}
      />
    );

    expect(screen.getByTestId('transition-slot-0')).toHaveAttribute('data-image-name', 'a.jpg');
    expect(screen.getByTestId('transition-slot-1')).toHaveAttribute('data-image-name', 'b.jpg');

    rerender(
      <CompositionView
        slots={[{ image: imageB }, { image: imageA }]}
        layoutSize={2}
      />
    );

    expect(screen.getByTestId('transition-slot-0')).toHaveAttribute('data-image-name', 'b.jpg');
    expect(screen.getByTestId('transition-slot-1')).toHaveAttribute('data-image-name', 'a.jpg');
  });
});
