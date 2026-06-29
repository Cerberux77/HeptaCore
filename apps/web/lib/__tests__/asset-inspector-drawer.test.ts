import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import { join } from "node:path";
import { describe, it } from "node:test";

function cssBlock(source: string, selector: string): string {
  const start = source.indexOf(selector);
  assert.ok(start >= 0, `${selector} not found`);
  const open = source.indexOf("{", start);
  const close = source.indexOf("}", open);
  return source.slice(open + 1, close);
}

describe("asset inspector drawer", () => {
  const component = readFileSync(join(process.cwd(), "components", "asset-inspector-drawer.tsx"), "utf8");
  const dashboard = readFileSync(join(process.cwd(), "components", "dashboard-console.tsx"), "utf8");
  const styles = readFileSync(join(process.cwd(), "app", "globals.css"), "utf8");

  it("uses a portal mounted on document.body", () => {
    assert.match(component, /createPortal\(/);
    assert.match(component, /document\.body/);
    assert.match(dashboard, /<AssetInspectorDrawer/);
  });

  it("renders overlay and drawer as separate elements", () => {
    assert.match(component, /className="asset-inspector-overlay"/);
    assert.match(component, /className="asset-inspector-drawer"/);
  });

  it("supports Escape close and restores body scroll", () => {
    assert.match(component, /event\.key === "Escape"/);
    assert.match(component, /document\.body\.style\.overflow = "hidden"/);
    assert.match(component, /document\.body\.style\.overflow = previousOverflow/);
  });

  it("sets dialog accessibility attributes and focuses the close button", () => {
    assert.match(component, /role="dialog"/);
    assert.match(component, /aria-modal="true"/);
    assert.match(component, /closeButtonRef\.current\?\.focus\(\)/);
  });

  it("uses an explicit solid drawer background and separate opaque overlay", () => {
    const overlay = cssBlock(styles, ".asset-inspector-overlay");
    const drawer = cssBlock(styles, ".asset-inspector-drawer");

    assert.match(overlay, /position:\s*fixed/);
    assert.match(overlay, /background-color:\s*rgba\(15,\s*23,\s*42,\s*0\.48\)/);
    assert.match(drawer, /background-color:\s*#ffffff/);
    assert.doesNotMatch(drawer, /var\(--hc-surface\)|transparent|backdrop-filter/);
  });
});
