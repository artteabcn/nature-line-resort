"use client";

import React, { useState } from "react";

// Shared-password login for the CMS. Lives OUTSIDE /content so the /content auth
// gate doesn't loop. Inline styles only (no Tailwind/lucide dependency).
export default function AdminLogin(): React.JSX.Element {
  const [password, setPassword] = useState("");
  const [error, setError] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);

  async function onSubmit(e: React.FormEvent): Promise<void> {
    e.preventDefault();
    setLoading(true);
    setError(null);
    try {
      const res = await fetch("/api/admin/login", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ password }),
      });
      if (res.ok) {
        window.location.href = "/content";
        return;
      }
      const j = (await res.json().catch(() => ({}))) as { error?: string };
      setError(j.error ?? "Login failed");
      setLoading(false);
    } catch {
      setError("Network error");
      setLoading(false);
    }
  }

  return (
    <div
      style={{
        minHeight: "100vh",
        display: "flex",
        alignItems: "center",
        justifyContent: "center",
        fontFamily: "system-ui, sans-serif",
        background: "#f4f5f7",
        padding: 16,
      }}
    >
      <form
        onSubmit={onSubmit}
        style={{
          width: "100%",
          maxWidth: 360,
          padding: 32,
          background: "#fff",
          borderRadius: 16,
          boxShadow: "0 4px 24px rgba(0,0,0,0.08)",
        }}
      >
        <h1 style={{ fontSize: 20, fontWeight: 600, margin: "0 0 4px" }}>Content admin</h1>
        <p style={{ fontSize: 13, color: "#666", margin: "0 0 20px" }}>
          Enter the admin password to edit this site.
        </p>
        <input
          type="password"
          value={password}
          onChange={(e) => setPassword(e.target.value)}
          placeholder="Password"
          autoFocus
          autoComplete="current-password"
          style={{
            width: "100%",
            boxSizing: "border-box",
            padding: "10px 12px",
            border: "1px solid #ddd",
            borderRadius: 8,
            fontSize: 14,
            marginBottom: 12,
          }}
        />
        {error && <p style={{ color: "#c0322b", fontSize: 13, margin: "0 0 12px" }}>{error}</p>}
        <button
          type="submit"
          disabled={loading || !password}
          style={{
            width: "100%",
            padding: "10px",
            background: "#1a6b8a",
            color: "#fff",
            border: "none",
            borderRadius: 8,
            fontSize: 14,
            fontWeight: 600,
            cursor: loading || !password ? "not-allowed" : "pointer",
            opacity: loading || !password ? 0.6 : 1,
          }}
        >
          {loading ? "Signing in…" : "Sign in"}
        </button>
      </form>
    </div>
  );
}
