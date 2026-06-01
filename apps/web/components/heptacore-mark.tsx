export function HeptaCoreMark({ size = "normal" }: { size?: "small" | "normal" | "large" }) {
  return (
    <span className={`hc-mark hc-mark-${size}`} aria-hidden="true">
      <span className="hc-mark-ring" />
      <span className="hc-mark-core" />
      <span className="hc-mark-line hc-mark-line-a" />
      <span className="hc-mark-line hc-mark-line-b" />
      <span className="hc-mark-dot hc-mark-dot-a" />
      <span className="hc-mark-dot hc-mark-dot-b" />
    </span>
  );
}

export function HeptaCoreWordmark() {
  return (
    <span className="wordmark">
      <HeptaCoreMark size="small" />
      <span>H E P T A C O R E</span>
    </span>
  );
}
