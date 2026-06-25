"use client";

export function AdminTenantPagination({
  page,
  totalPages,
  onPageChange,
}: {
  page: number;
  totalPages: number;
  onPageChange: (page: number) => void;
}) {
  if (totalPages <= 1) return null;

  const pages: (number | "...")[] = [];
  for (let i = 1; i <= totalPages; i++) {
    if (i === 1 || i === totalPages || (i >= page - 1 && i <= page + 1)) {
      pages.push(i);
    } else if (pages[pages.length - 1] !== "...") {
      pages.push("...");
    }
  }

  return (
    <nav style={{ display: "flex", alignItems: "center", gap: 4, justifyContent: "center", padding: "12px 0" }} aria-label="Paginacion">
      <button
        onClick={() => onPageChange(page - 1)}
        disabled={page <= 1}
        style={{
          padding: "4px 10px",
          border: "1px solid var(--hc-line)",
          borderRadius: 4,
          background: page <= 1 ? "var(--hc-bone)" : "var(--hc-panel)",
          color: page <= 1 ? "var(--hc-fog)" : "var(--hc-ink)",
          cursor: page <= 1 ? "default" : "pointer",
          fontSize: 12,
          fontFamily: "inherit",
        }}
        aria-label="Pagina anterior"
      >
        Anterior
      </button>
      {pages.map((p, i) =>
        p === "..." ? (
          <span key={`dots-${i}`} style={{ padding: "0 4px", color: "var(--hc-fog)", fontSize: 12 }}>...</span>
        ) : (
          <button
            key={p}
            onClick={() => onPageChange(p)}
            style={{
              minWidth: 28,
              height: 28,
              padding: "0 4px",
              border: "1px solid var(--hc-line)",
              borderRadius: 4,
              background: p === page ? "var(--hc-ink)" : "var(--hc-panel)",
              color: p === page ? "#fff" : "var(--hc-ink)",
              cursor: "pointer",
              fontWeight: p === page ? 700 : 400,
              fontSize: 12,
              fontFamily: "inherit",
            }}
            aria-label={`Pagina ${p}`}
            aria-current={p === page ? "page" : undefined as any}
          >
            {p}
          </button>
        ),
      )}
      <button
        onClick={() => onPageChange(page + 1)}
        disabled={page >= totalPages}
        style={{
          padding: "4px 10px",
          border: "1px solid var(--hc-line)",
          borderRadius: 4,
          background: page >= totalPages ? "var(--hc-bone)" : "var(--hc-panel)",
          color: page >= totalPages ? "var(--hc-fog)" : "var(--hc-ink)",
          cursor: page >= totalPages ? "default" : "pointer",
          fontSize: 12,
          fontFamily: "inherit",
        }}
        aria-label="Pagina siguiente"
      >
        Siguiente
      </button>
    </nav>
  );
}
