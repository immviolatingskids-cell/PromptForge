import test from "node:test";
import assert from "node:assert/strict";
import { readFile } from "node:fs/promises";

test("Library responsive source rules keep cards and controls usable at narrow widths", async () => {
  const css = await readFile(new URL("../styles.css", import.meta.url), "utf8");
  assert.match(css, /\.library-card\{[^}]*display:grid[^}]*grid-template-columns:1fr auto/);
  assert.match(css, /\.library-actions\{[^}]*flex-wrap:wrap/);
  assert.match(css, /@media\(max-width:700px\)\{\.library-toolbar\{grid-template-columns:1fr\}\.library-card\{display:block\}/);
});

test("Control Centre source rules include reduced-motion handling", async () => {
  const css = await readFile(new URL("../control-centre.css", import.meta.url), "utf8");
  assert.match(css, /@media\(prefers-reduced-motion:reduce\)/);
  assert.match(css, /data-motion=reduced/);
});
