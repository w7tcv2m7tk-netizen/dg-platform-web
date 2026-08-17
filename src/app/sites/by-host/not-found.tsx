/**
 * Custom-host missing pages must render a real 404.
 * Without this file, notFound() inside the by-host rewrite can surface as 5xx.
 */
export default function ByHostNotFound() {
  return (
    <main
      style={{
        minHeight: "70vh",
        display: "grid",
        placeItems: "center",
        fontFamily: "system-ui, sans-serif",
        padding: "2rem",
        textAlign: "center",
        background: "#0b1220",
        color: "#e2e8f0",
      }}
    >
      <div>
        <p style={{ letterSpacing: "0.12em", fontSize: "0.75rem", color: "#94a3b8" }}>
          404
        </p>
        <h1 style={{ fontSize: "1.5rem", margin: "0.5rem 0 0.75rem" }}>Page not found</h1>
        <p style={{ color: "#94a3b8", maxWidth: "28rem", margin: "0 auto 1.25rem" }}>
          This page is no longer available.
        </p>
        <a href="/" style={{ color: "#93c5fd", fontWeight: 600 }}>
          Back to home
        </a>
      </div>
    </main>
  );
}
