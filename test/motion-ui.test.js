import test from "node:test";
import assert from "node:assert/strict";
import { readFileSync } from "node:fs";

const css = readFileSync(new URL("../studio-overhaul.css", import.meta.url), "utf8");
const html = readFileSync(new URL("../index.html", import.meta.url), "utf8");
const motion = readFileSync(new URL("../src/motion-ui.js", import.meta.url), "utf8");

test("motion system exposes shared timings, easing, and reduced-motion handling", () => {
  for (const token of ["motion-instant", "motion-fast", "motion-ui", "motion-panel", "motion-generate", "motion-ambient", "ease-ui", "ease-enter", "ease-exit"]) {
    assert.match(css, new RegExp(`--${token}:`));
  }
  assert.match(css, /@media \(prefers-reduced-motion: reduce\)/);
  assert.match(motion, /prefers-reduced-motion: reduce/);
});

test("interaction utilities retain accessible semantics", () => {
  assert.match(html, /id="toast-region"[^>]+aria-live="polite"/);
  assert.match(html, /id="command-palette"[^>]+aria-labelledby="command-title"/);
  assert.match(html, /id="command-results"[^>]+role="listbox"/);
  assert.match(html, /id="open-inspector-drawer"[^>]+aria-controls="inspector-drawer"/);
  assert.match(html, /id="randomise-seed"[^>]+aria-label="Randomise seed"/);
  assert.match(motion, /aria-selected/);
  assert.match(motion, /Control_L|ctrlKey/);
});

test("generation polish is presentation-only", () => {
  assert.doesNotMatch(motion, /generatePersona|PersonaController|SeededRng/);
  assert.match(css, /\.field\.is-rerolling/);
  assert.match(css, /#studio-shell\.is-generating/);
  assert.match(css, /transform:/);
  assert.match(css, /opacity:/);
});
