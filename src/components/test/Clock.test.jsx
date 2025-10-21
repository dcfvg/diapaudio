import { describe, it, expect } from 'vitest';
import React from 'react';
import { renderWithProviders } from '../../test/test-utils.jsx';
import Clock from '../Clock.jsx';

describe('Clock', () => {
  const defaultAnalogAngles = {
    hour: 0,
    minute: 0,
    second: 0,
  };

  const defaultClockDisplays = {
    time: '12:00:00',
    date: '15 Jan 2025',
    minimalDate: 'Jan 15',
  };

  it('renders analog clock face', () => {
    const { container } = renderWithProviders(
      <Clock analogAngles={defaultAnalogAngles} clockDisplays={defaultClockDisplays} />
    );

    const clockFace = container.querySelector('.clock-face');
    expect(clockFace).toBeTruthy();
  });

  it('renders clock hands with correct rotation', () => {
    const angles = {
      hour: 90,
      minute: 180,
      second: 270,
    };

    const { container } = renderWithProviders(
      <Clock analogAngles={angles} clockDisplays={defaultClockDisplays} />
    );

    const hourHand = container.querySelector('#clock-hour-hand');
    const minuteHand = container.querySelector('#clock-minute-hand');
    const secondHand = container.querySelector('#clock-second-hand');

    expect(hourHand?.getAttribute('transform')).toContain('rotate(90');
    expect(minuteHand?.getAttribute('transform')).toContain('rotate(180');
    expect(secondHand?.getAttribute('transform')).toContain('rotate(270');
  });

  it('renders analog clock as SVG only', () => {
    const { container } = renderWithProviders(
      <Clock analogAngles={defaultAnalogAngles} clockDisplays={defaultClockDisplays} mode="analog" />
    );

    // Analog mode shows only SVG, no text info
    const svg = container.querySelector('.clock-svg');
    expect(svg).toBeTruthy();
    expect(svg?.classList.contains('hidden')).toBe(false);
    
    // No digital info in analog mode
    const digitalInfo = container.querySelector('.clock-digital-info');
    expect(digitalInfo).toBeFalsy();
  });

  it('renders digital clock with one line time and date', () => {
    const { container } = renderWithProviders(
      <Clock analogAngles={defaultAnalogAngles} clockDisplays={defaultClockDisplays} mode="digital" />
    );

    // Digital clock shows time and date on same line
    const digitalInfo = container.querySelector('.clock-digital-info');
    expect(digitalInfo).toBeTruthy();
    
    const digitalTime = container.querySelector('.clock-digital-time');
    expect(digitalTime?.textContent).toBe('12:00:00');
    
    const digitalDate = container.querySelector('.clock-digital-date');
    expect(digitalDate?.textContent).toBe('15 JAN 2025'); // Uppercase transformation
  });

  it('renders 12 hour tick marks', () => {
    const { container } = renderWithProviders(
      <Clock analogAngles={defaultAnalogAngles} clockDisplays={defaultClockDisplays} />
    );

    const ticks = container.querySelectorAll('.clock-tick');
    expect(ticks.length).toBe(12);
  });

  it('handles midnight (0 degrees)', () => {
    const angles = {
      hour: 0,
      minute: 0,
      second: 0,
    };

    const { container } = renderWithProviders(
      <Clock analogAngles={angles} clockDisplays={{ ...defaultClockDisplays, time: '00:00:00' }} />
    );

    const hourHand = container.querySelector('#clock-hour-hand');
    expect(hourHand?.getAttribute('transform')).toContain('rotate(0');
  });

  it('handles afternoon time (180+ degrees)', () => {
    const angles = {
      hour: 210, // 7 PM
      minute: 180, // 30 minutes
      second: 0,
    };

    const { container } = renderWithProviders(
      <Clock analogAngles={angles} clockDisplays={{ ...defaultClockDisplays, time: '19:30:00' }} />
    );

    const hourHand = container.querySelector('#clock-hour-hand');
    expect(hourHand?.getAttribute('transform')).toContain('rotate(210');
  });

  it('passes through additional props', () => {
    const { container } = renderWithProviders(
      <Clock
        analogAngles={defaultAnalogAngles}
        clockDisplays={defaultClockDisplays}
        data-testid="clock-test"
      />
    );

    const clock = container.querySelector('.viewer__clock');
    expect(clock?.getAttribute('data-testid')).toBe('clock-test');
  });
});
