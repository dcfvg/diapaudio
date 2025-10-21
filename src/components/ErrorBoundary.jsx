import { Component } from "react";
import Modal from "./Modal.jsx";
import * as logger from "../utils/logger.js";

/**
 * Error Boundary component to catch and handle React component errors gracefully.
 * Prevents the entire app from crashing when a child component throws an error.
 */
class ErrorBoundary extends Component {
  constructor(props) {
    super(props);
    this.state = {
      hasError: false,
      error: null,
      errorInfo: null,
      errorCount: 0,
    };
  }

  static getDerivedStateFromError() {
    // Update state so the next render will show the fallback UI
    return { hasError: true };
  }

  componentDidCatch(error, errorInfo) {
    // Log error details for debugging
    logger.error("ErrorBoundary caught an error:", error, errorInfo);

    // Update state with error details
    this.setState((prevState) => ({
      error,
      errorInfo,
      errorCount: prevState.errorCount + 1,
    }));

    // Optional: Send error to logging service (e.g., Sentry)
    if (this.props.onError) {
      this.props.onError(error, errorInfo);
    }
  }

  handleReset = () => {
    this.setState({
      hasError: false,
      error: null,
      errorInfo: null,
    });
  };

  handleReload = () => {
    window.location.reload();
  };

  render() {
    if (this.state.hasError) {
      const { error, errorInfo, errorCount } = this.state;
      const { componentName = "Component" } = this.props;
      const message =
        error?.message ||
        `An unexpected error occurred while rendering the ${componentName.toLowerCase()}.`;

      return (
        <Modal
          open
          title={`${componentName} Error`}
          icon="⚠️"
          variant="danger"
          onClose={this.handleReset}
          actions={[
            {
              key: "try-again",
              label: "Try again",
              variant: "primary",
              onClick: this.handleReset,
            },
            {
              key: "reload",
              label: "Reload",
              variant: "secondary",
              onClick: this.handleReload,
            },
          ]}
        >
          <p>{message}</p>
          {errorCount > 1 ? (
            <p>
              This error has happened {errorCount} times. You may need to reload the page to recover
              fully.
            </p>
          ) : null}
          {this.props.showDetails && error ? (
            <details>
              <summary>Technical details</summary>
              <div>
                <pre>{error.toString()}</pre>
                {errorInfo?.componentStack ? <pre>{errorInfo.componentStack}</pre> : null}
                {error.stack ? <pre>{error.stack}</pre> : null}
              </div>
            </details>
          ) : null}
        </Modal>
      );
    }

    return this.props.children;
  }
}

export default ErrorBoundary;
