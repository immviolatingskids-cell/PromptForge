import { chromium } from "playwright";
import { spawn } from "node:child_process";
import { mkdir } from "node:fs/promises";
import { resolve } from "node:path";

const baseUrl = "http://127.0.0.1:8765", outputDir = resolve("visual-review/screenshots");
const server = spawn(process.env.PYTHON || "python", ["start.py"], { stdio: "ignore", shell: process.platform === "win32" });
async function ready() { for (let attempt = 0; attempt < 40; attempt += 1) { try { if ((await fetch(baseUrl)).ok) return; } catch {} await new Promise(done => setTimeout(done, 250)); } throw new Error("PromptForge server did not start"); }
async function seedPersona(page) { await page.goto(`${baseUrl}/#studio`); await page.locator("#studio-shell").waitFor({ state: "visible" }); await page.locator("#seed").fill("scene-forge-browser-seed"); await page.locator("#generate").click(); await page.waitForFunction(() => document.querySelector("#persona-name")?.textContent !== "New Persona"); await page.locator("#save-persona").click(); }

await mkdir(outputDir, { recursive: true }); await ready(); const browser = await chromium.launch();
try {
  for (const [name, viewport] of Object.entries({ desktop: { width: 1440, height: 1000 }, tablet: { width: 1024, height: 900 }, mobile: { width: 390, height: 844 } })) {
    const page = await browser.newPage({ viewport, reducedMotion: "reduce", acceptDownloads: true }); let dialogMessage = "", pageError = ""; page.on("dialog", async dialog => { dialogMessage = dialog.message(); await dialog.dismiss(); }); page.on("pageerror", error => { pageError = error.message; }); await seedPersona(page); await page.goto(`${baseUrl}/#scenes`); await page.locator("#scene-form").waitFor();
    await page.locator('[name="title"]').fill("A Quiet Crossing"); await page.locator('[name="premise"]').fill("A decision must be made before the last train."); await page.locator('[name="activity"]').fill("comparing handwritten notes"); await page.locator('[name="conflict"]').fill("Their deadlines cannot both be met"); await page.locator('#scene-form button[type="submit"]').click();
    await page.waitForTimeout(500); if (!/#scenes\/scene_/.test(page.url())) { const detail = await page.locator("#scene-form").evaluate(form => ({ valid: form.checkValidity(), invalid: [...form.querySelectorAll(":invalid")].map(item => item.name), stored: localStorage.getItem("personaforge.scenes.v1") })); throw new Error(`Scene creation did not complete${dialogMessage ? `: ${dialogMessage}` : ""}${pageError ? `: ${pageError}` : ""}: ${JSON.stringify(detail)}`); } const firstUrl = page.url(); await page.goto(`${baseUrl}/#scenes`); await page.locator('[data-product-action="open-scene"]').first().click(); await page.waitForURL(firstUrl);
    await page.locator('[name="purpose"]').fill("Reveal whose promise matters most"); await page.locator('#scene-form button[type="submit"]').click(); await page.waitForURL(firstUrl);
    const download = page.waitForEvent("download"); await page.locator('[data-product-action="export-scene-json"]').click(); const artifact = await download; if (!artifact.suggestedFilename().endsWith(".json")) throw new Error("Scene JSON export was not offered");
    if (await page.evaluate(() => document.documentElement.scrollWidth > innerWidth)) throw new Error(`Scene Forge overflows at ${viewport.width}px`);
    await page.screenshot({ path: resolve(outputDir, `${name}-scene-forge.png`), fullPage: true }); await page.close();
  }
  console.log("Scene Forge browser flow and responsive audit passed.");
} finally { await browser.close(); server.kill(); }
