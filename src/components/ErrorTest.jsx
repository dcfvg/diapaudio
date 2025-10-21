/**
 * ErrorBoundary Test Component
 *
 * This component can be temporarily added to test error boundary functionality.
 *
 * Usage:
 * 1. Import this component in App.jsx: import ErrorTest from './components/ErrorTest.jsx';
 * 2. Add it somewhere in the render tree: <ErrorTest />
 * 3. Click the "Trigger Error" button to test the error boundary
 * 4. Verify the error boundary catches the error and shows fallback UI
 * 5. Test "Try Again" and "Reload Page" buttons
 * 6. Remove this component when done testing
 */

import { useState } from "react";

export default function ErrorTest() {
  const [shouldError, setShouldError] = useState(false);

  if (shouldError) {
    // This will be caught by the nearest error boundary
    throw new Error("Test error from ErrorTest component!");
  }

  return (
    <div style={{ padding: "1rem", background: "#f0f0f0", margin: "1rem", borderRadius: "4px" }}>
      <h3>Error Boundary Test Component</h3>
      <p>Click the button below to trigger a component error:</p>
      <button
        onClick={() => setShouldError(true)}
        style={{
          padding: "0.5rem 1rem",
          background: "#ff4444",
          color: "white",
          border: "none",
          borderRadius: "4px",
          cursor: "pointer",
          fontWeight: "bold",
        }}
      >
        🔴 Trigger Error
      </button>
      <p style={{ fontSize: "0.85rem", color: "#666", marginTop: "0.5rem" }}>
        The error should be caught by the nearest ErrorBoundary and display fallback UI.
      </p>
    </div>
  );
}
