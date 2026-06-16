import React from "react";

/**
 * Global React Error Boundary.
 * Catches ANY render-time error and shows a friendly fallback instead of a blank white page.
 */
export class ErrorBoundary extends React.Component {
  constructor(props) {
    super(props);
    this.state = { hasError: false, error: null };
  }

  static getDerivedStateFromError(error) {
    return { hasError: true, error };
  }

  componentDidCatch(error, info) {
    console.error("[ErrorBoundary] caught:", error, info);
  }

  handleRetry = () => {
    this.setState({ hasError: false, error: null });
  };

  render() {
    if (this.state.hasError) {
      if (this.props.fallback) return this.props.fallback;
      return (
        <div style={{ minHeight: "60vh", display: "flex", alignItems: "center", justifyContent: "center" }}>
          <div style={{ textAlign: "center", maxWidth: 400, padding: 32 }}>
            <div style={{ fontSize: 48, marginBottom: 12 }}>⚠️</div>
            <h2 style={{ fontSize: 18, fontWeight: 600, marginBottom: 8, color: "#1e293b" }}>
              Wystąpił nieoczekiwany błąd
            </h2>
            <p style={{ fontSize: 13, color: "#64748b", marginBottom: 16 }}>
              Coś poszło nie tak podczas renderowania tej strony.
              Spróbuj odświeżyć lub kliknij przycisk poniżej.
            </p>
            {this.state.error && (
              <pre style={{ fontSize: 11, color: "#f43f5e", background: "#fef2f2", padding: 12, borderRadius: 8, marginBottom: 16, overflowX: "auto", textAlign: "left", maxHeight: 120 }}>
                {String(this.state.error)}
              </pre>
            )}
            <button
              onClick={this.handleRetry}
              style={{
                padding: "8px 20px", fontSize: 13, fontWeight: 500,
                background: "#4f46e5", color: "#fff", border: "none",
                borderRadius: 8, cursor: "pointer", marginRight: 8,
              }}
            >
              Spróbuj ponownie
            </button>
            <button
              onClick={() => window.location.reload()}
              style={{
                padding: "8px 20px", fontSize: 13, fontWeight: 500,
                background: "#f1f5f9", color: "#334155", border: "1px solid #e2e8f0",
                borderRadius: 8, cursor: "pointer",
              }}
            >
              Odśwież stronę
            </button>
          </div>
        </div>
      );
    }
    return this.props.children;
  }
}
