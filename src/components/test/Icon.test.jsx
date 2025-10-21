import { describe, it, expect } from 'vitest';
import React from 'react';
import { renderWithProviders } from '../../test/test-utils.jsx';
import Icon from '../Icon.jsx';

describe('Icon', () => {
  it('renders folder icon', () => {
    const { container } = renderWithProviders(<Icon name="folder" />);
    const svg = container.querySelector('svg');
    expect(svg).toBeTruthy();
    expect(svg?.getAttribute('width')).toBe('20'); // Default size
  });

  it('renders play icon', () => {
    const { container } = renderWithProviders(<Icon name="play" />);
    const svg = container.querySelector('svg');
    expect(svg).toBeTruthy();
  });

  it('renders pause icon', () => {
    const { container } = renderWithProviders(<Icon name="pause" />);
    const svg = container.querySelector('svg');
    expect(svg).toBeTruthy();
  });

  it('renders loader icon', () => {
    const { container } = renderWithProviders(<Icon name="loader" />);
    const svg = container.querySelector('svg');
    expect(svg).toBeTruthy();
  });

  it('renders warning icon', () => {
    const { container } = renderWithProviders(<Icon name="warning" />);
    const svg = container.querySelector('svg');
    expect(svg).toBeTruthy();
  });

  it('applies custom size', () => {
    const { container } = renderWithProviders(<Icon name="play" size={32} />);
    const svg = container.querySelector('svg');
    expect(svg?.getAttribute('width')).toBe('32');
    expect(svg?.getAttribute('height')).toBe('32');
  });

  it('applies custom stroke width', () => {
    const { container } = renderWithProviders(<Icon name="play" stroke={2.5} />);
    const svg = container.querySelector('svg');
    expect(svg?.getAttribute('stroke-width')).toBe('2.5');
  });

  it('applies custom className', () => {
    const { container } = renderWithProviders(<Icon name="play" className="custom-icon" />);
    const svg = container.querySelector('svg');
    expect(svg?.classList.contains('custom-icon')).toBe(true);
  });

  it('renders default icon for unknown name', () => {
    const { container } = renderWithProviders(<Icon name="unknown" />);
    const svg = container.querySelector('svg');
    expect(svg).toBeTruthy();
    const circle = svg?.querySelector('circle');
    expect(circle).toBeTruthy();
  });

  it('passes through additional props', () => {
    const { container } = renderWithProviders(<Icon name="play" data-testid="icon-test" />);
    const svg = container.querySelector('svg');
    expect(svg?.getAttribute('data-testid')).toBe('icon-test');
  });
});
