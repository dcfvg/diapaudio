// Custom render utilities for Testing Library
import React from 'react';
import { render } from '@testing-library/react';

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
