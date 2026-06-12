export function HeptaCoreMark({ size = "normal" }: { size?: "small" | "normal" | "large" }) {
  return (
    <img className={`hc-mark-img hc-mark-${size}`} src="/brand/heptacore-icon.png" alt="" aria-hidden="true" />
  );
}

export function HeptaCoreWordmark() {
  return (
    <span className="wordmark">
      <img className="wordmark-img" src="/brand/heptacore-logo-horizontal.svg" alt="HeptaCore" />
    </span>
  );
}
