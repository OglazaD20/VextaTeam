"use client";

export default function GlobalError({
  error,
  reset,
}: {
  error: Error & { digest?: string };
  reset: () => void;
}) {
  return (
    <html lang="en">
      <body style={{ fontFamily: "system-ui, sans-serif" }}>
        <div
          style={{
            display: "flex",
            minHeight: "100vh",
            flexDirection: "column",
            alignItems: "center",
            justifyContent: "center",
            gap: "1rem",
            padding: "1.5rem",
            textAlign: "center",
          }}
        >
          <h1 style={{ fontSize: "1rem", fontWeight: 600 }}>Something went wrong</h1>
          <p style={{ maxWidth: "24rem", fontSize: "0.875rem", color: "#666" }}>
            {error.message || "LifeFlow ran into an unexpected error."}
          </p>
          <button
            type="button"
            onClick={() => reset()}
            style={{
              borderRadius: "9999px",
              border: "1px solid #ccc",
              padding: "0.5rem 1rem",
              fontSize: "0.875rem",
              cursor: "pointer",
              background: "transparent",
            }}
          >
            Try again
          </button>
        </div>
      </body>
    </html>
  );
}
