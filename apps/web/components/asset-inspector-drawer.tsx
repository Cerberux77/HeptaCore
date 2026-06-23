"use client";

import { X } from "lucide-react";
import { createPortal } from "react-dom";
import { useEffect, useId, useRef, useState } from "react";

export default function AssetInspectorDrawer({
  open,
  title,
  onClose,
  children,
}: {
  open: boolean;
  title: string;
  onClose: () => void;
  children: React.ReactNode;
}) {
  const [mounted, setMounted] = useState(false);
  const titleId = useId();
  const closeButtonRef = useRef<HTMLButtonElement>(null);

  useEffect(() => {
    setMounted(true);
  }, []);

  useEffect(() => {
    if (!open) return;
    const previousOverflow = document.body.style.overflow;
    document.body.style.overflow = "hidden";
    closeButtonRef.current?.focus();

    const handleKeyDown = (event: KeyboardEvent) => {
      if (event.key === "Escape") onClose();
    };

    window.addEventListener("keydown", handleKeyDown);
    return () => {
      window.removeEventListener("keydown", handleKeyDown);
      document.body.style.overflow = previousOverflow;
    };
  }, [onClose, open]);

  if (!mounted || !open) return null;

  return createPortal(
    <>
      <button
        type="button"
        className="asset-inspector-overlay"
        aria-label="Cerrar inspector de asset"
        onClick={onClose}
      />
      <aside
        className="asset-inspector-drawer"
        role="dialog"
        aria-modal="true"
        aria-labelledby={titleId}
      >
        <div className="asset-inspector-header">
          <strong id={titleId}>{title}</strong>
          <button
            ref={closeButtonRef}
            type="button"
            className="asset-inspector-close"
            aria-label="Cerrar inspector"
            onClick={onClose}
          >
            <X size={20} />
          </button>
        </div>
        {children}
      </aside>
    </>,
    document.body,
  );
}
