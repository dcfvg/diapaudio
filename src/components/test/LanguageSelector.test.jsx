import { describe, it, expect } from 'vitest';
import React from 'react';
import userEvent from '@testing-library/user-event';
import { screen, within } from '../../test/test-utils.jsx';
import { renderWithProviders } from '../../test/test-utils.jsx';
import LanguageSelector from '../LanguageSelector.jsx';

import '../../i18n/index.js';

describe('LanguageSelector', () => {
  it('renders languages and switches language on change', async () => {
    renderWithProviders(<LanguageSelector />);

    const select = screen.getByRole('combobox', { name: /language/i });
    const options = within(select).getAllByRole('option');
    const values = options.map((o) => o.getAttribute('value'));

    expect(values).toEqual(expect.arrayContaining(['en', 'fr', 'es']));

    await userEvent.selectOptions(select, 'fr');

    expect(select).toHaveValue('fr');
  });
});
