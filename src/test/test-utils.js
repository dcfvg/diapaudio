// Custom render utilities for Testing Library
import React from 'react';
import { render } from '@testing-library/react';

// App uses react-i18next directly after importing i18n in main.jsx
// For tests, components import hooks directly, so no provider is mandatory.
// If a provider becomes necessary, we can add one here.

function AllProviders({ children }) {
  return (
    <React.StrictMode>
      {children}
    </React.StrictMode>
  );
}

export function renderWithProviders(ui, options = {}) {
  return render(ui, { wrapper: AllProviders, ...options });
}

export * from '@testing-library/react';
