import { describe, it, expect } from 'vitest';
import React from 'react';
import userEvent from '@testing-library/user-event';
import { screen, within } from '../test/test-utils.jsx';
import { renderWithProviders } from '../test/test-utils.jsx';
import LanguageSelector from './LanguageSelector.jsx';

// Import i18n to ensure setup file executed and language defaulted to en
import '../i18n/index.js';

describe('LanguageSelector', () => {
  it('renders languages and switches language on change', async () => {
    renderWithProviders(<LanguageSelector />);

    const select = screen.getByRole('combobox', { name: /language/i });
    const options = within(select).getAllByRole('option');
    const values = options.map((o) => o.getAttribute('value'));

    // Default languages from i18n resources
    expect(values).toEqual(expect.arrayContaining(['en', 'fr', 'es']));

    // Change to French using user-event (wrapped in act)
    await userEvent.selectOptions(select, 'fr');

    // The select value should update
    expect(select).toHaveValue('fr');
  });
});
