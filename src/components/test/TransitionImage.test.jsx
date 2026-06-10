import { render, waitFor } from '@testing-library/react';
import { describe, expect, it } from 'vitest';
import TransitionImage from '../TransitionImage.jsx';

describe('TransitionImage', () => {
  it('removes stale layers immediately when fade duration is zero', async () => {
    const firstImage = { name: '2026-06-03 12.28.42.jpg', url: 'blob:first' };
    const secondImage = { name: 'Next preview.jpg', url: 'blob:second' };

    const { container, rerender } = render(
      <TransitionImage image={firstImage} imageKey="first" hideDelayMs={0} />
    );

    await waitFor(() => {
      expect(container.querySelectorAll('img')).toHaveLength(1);
    });

    rerender(<TransitionImage image={secondImage} imageKey="second" hideDelayMs={0} />);

    await waitFor(() => {
      const images = container.querySelectorAll('img');
      expect(images).toHaveLength(1);
      expect(images[0]).toHaveAttribute('src', secondImage.url);
      expect(images[0]).toHaveAttribute('alt', secondImage.name);
    });
  });
});
