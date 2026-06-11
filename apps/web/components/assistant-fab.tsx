"use client";

import { useState, useRef, useEffect } from "react";
import { MessageCircle, X, Send } from "lucide-react";

export function AssistantFab() {
  const [open, setOpen] = useState(false);
  const [question, setQuestion] = useState("");
  const [messages, setMessages] = useState<Array<{ role: "user" | "assistant"; text: string }>>([
    { role: "assistant", text: "Hola! Soy el asistente de HeptaCore. Preguntame lo que necesites sobre la plataforma." },
  ]);
  const [loading, setLoading] = useState(false);
  const bottomRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    bottomRef.current?.scrollIntoView({ behavior: "smooth" });
  }, [messages]);

  async function handleSend() {
    const q = question.trim();
    if (!q || loading) return;
    setMessages((prev) => [...prev, { role: "user", text: q }]);
    setQuestion("");
    setLoading(true);

    try {
      const res = await fetch("/api/assistant", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ question: q }),
      });
      const data = await res.json();
      setMessages((prev) => [...prev, { role: "assistant", text: data.reply || "Error al responder." }]);
    } catch {
      setMessages((prev) => [...prev, { role: "assistant", text: "Error de conexion. Intenta de nuevo." }]);
    } finally {
      setLoading(false);
    }
  }

  return (
    <>
      <button
        onClick={() => setOpen(!open)}
        style={{
          position: "fixed",
          bottom: 24,
          right: 24,
          zIndex: 999,
          width: 56,
          height: 56,
          borderRadius: 28,
          border: "none",
          background: "var(--hc-ink)",
          color: "#fff",
          cursor: "pointer",
          boxShadow: "0 4px 16px rgba(0,0,0,0.3)",
          display: "flex",
          alignItems: "center",
          justifyContent: "center",
        }}
      >
        {open ? <X size={24} /> : <MessageCircle size={24} />}
      </button>

      {open && (
        <div
          style={{
            position: "fixed",
            bottom: 96,
            right: 24,
            zIndex: 999,
            width: 360,
            maxHeight: 480,
            background: "var(--hc-surface)",
            borderRadius: 12,
            boxShadow: "0 8px 32px rgba(0,0,0,0.25)",
            display: "flex",
            flexDirection: "column",
            overflow: "hidden",
          }}
        >
          <div style={{ padding: "12px 16px", borderBottom: "1px solid var(--hc-line)", fontWeight: 700, fontSize: 14 }}>
            Asistente HeptaCore
          </div>
          <div style={{ flex: 1, overflow: "auto", padding: "12px 16px", display: "flex", flexDirection: "column", gap: 8, maxHeight: 340 }}>
            {messages.map((m, i) => (
              <div
                key={i}
                style={{
                  alignSelf: m.role === "user" ? "flex-end" : "flex-start",
                  background: m.role === "user" ? "var(--hc-ink)" : "var(--hc-bone)",
                  color: m.role === "user" ? "#fff" : "var(--hc-ink)",
                  padding: "8px 12px",
                  borderRadius: 10,
                  maxWidth: "85%",
                  fontSize: 12,
                  lineHeight: 1.4,
                }}
              >
                {m.text}
              </div>
            ))}
            {loading && <div style={{ fontSize: 11, color: "var(--hc-fog)", alignSelf: "flex-start", fontStyle: "italic" }}>Escribiendo...</div>}
            <div ref={bottomRef} />
          </div>
          <div style={{ padding: "8px 12px", borderTop: "1px solid var(--hc-line)", display: "flex", gap: 8 }}>
            <input
              value={question}
              onChange={(e) => setQuestion(e.target.value)}
              onKeyDown={(e) => { if (e.key === "Enter") handleSend(); }}
              placeholder="Pregunta algo..."
              style={{ flex: 1, padding: "8px 10px", borderRadius: 6, border: "1px solid var(--hc-line)", fontSize: 12 }}
            />
            <button
              onClick={handleSend}
              disabled={loading}
              style={{ padding: "8px 12px", borderRadius: 6, border: "none", background: "var(--hc-ink)", color: "#fff", cursor: "pointer" }}
            >
              <Send size={14} />
            </button>
          </div>
        </div>
      )}
    </>
  );
}
