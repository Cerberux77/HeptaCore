"use client";

import { useState } from "react";

const DANGEROUS_CHARS = /[\\/:*?"'<>|&;#@$%^()\[\]{}]/;

function isValidCollectionName(name: string): boolean {
  const trimmed = name.trim();
  if (!trimmed) return false;
  if (trimmed.length > 80) return false;
  if (trimmed.includes("..")) return false;
  if (DANGEROUS_CHARS.test(trimmed)) return false;
  return true;
}

export default function AssetCollectionPicker({
  currentFolder,
  tenantSlug,
  onSelect,
  folders,
}: {
  currentFolder: string;
  tenantSlug: string;
  onSelect: (folder: string) => void;
  folders: string[];
}) {
  const [creating, setCreating] = useState(false);
  const [newName, setNewName] = useState("");
  const [error, setError] = useState("");

  const displayFolders = folders.filter((f) => f !== "");

  const handleSelectChange = (value: string) => {
    if (value === "__create__") {
      setCreating(true);
      setNewName("");
      setError("");
      return;
    }
    setCreating(false);
    onSelect(value);
  };

  const handleCreateSubmit = () => {
    const trimmed = newName.trim();
    if (!isValidCollectionName(trimmed)) {
      setError("Nombre invalido. Max 80 caracteres, sin caracteres especiales.");
      return;
    }
    const exists = displayFolders.some(
      (f) => f.toLowerCase() === trimmed.toLowerCase()
    );
    if (exists) {
      setError("Ya existe una coleccion con ese nombre.");
      return;
    }
    onSelect(trimmed);
    setCreating(false);
    setNewName("");
    setError("");
  };

  const handleKeyDown = (e: React.KeyboardEvent) => {
    if (e.key === "Enter") {
      e.preventDefault();
      handleCreateSubmit();
    }
    if (e.key === "Escape") {
      setCreating(false);
      setNewName("");
      setError("");
    }
  };

  return (
    <div style={{ display: "flex", gap: 6, alignItems: "flex-start", flex: 1 }}>
      <select
        value={creating ? "__create__" : (currentFolder ?? "")}
        onChange={(e) => handleSelectChange(e.target.value)}
        style={{
          padding: "4px 8px",
          borderRadius: 4,
          border: "1px solid var(--hc-line)",
          fontSize: 12,
          maxWidth: 180,
          background: "var(--hc-surface)",
          color: "var(--hc-ink)",
        }}
      >
        <option value="">Sin coleccion</option>
        {displayFolders.map((folder) => (
          <option key={folder} value={folder}>
            {folder}
          </option>
        ))}
        <option value="__create__">+ Crear nueva coleccion</option>
      </select>
      {creating && (
        <div style={{ display: "flex", flexDirection: "column", gap: 4 }}>
          <input
            autoFocus
            value={newName}
            onChange={(e) => {
              setNewName(e.target.value);
              setError("");
            }}
            onKeyDown={handleKeyDown}
            placeholder="Nombre de coleccion"
            style={{
              padding: "4px 8px",
              borderRadius: 4,
              border: `1px solid ${error ? "#b42318" : "var(--hc-line)"}`,
              fontSize: 12,
              maxWidth: 160,
              background: "var(--hc-surface)",
              color: "var(--hc-ink)",
            }}
          />
          {error && (
            <small style={{ color: "#b42318", fontSize: 10 }}>{error}</small>
          )}
        </div>
      )}
    </div>
  );
}
