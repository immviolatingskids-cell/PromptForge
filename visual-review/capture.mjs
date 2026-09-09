import { chromium } from "playwright";
import { spawn } from "node:child_process";
import { mkdir } from "node:fs/promises";
import { resolve } from "node:path";

const baseUrl = "http://127.0.0.1:8765";
const outputDir = resolve("visual-review/screenshots");
const viewports = { desktop: { width: 1440, height: 1000 }, tablet: { width: 1024, height: 900 }, mobile: { width: 390, height: 844 } };

const server = spawn(process.env.PYTHON || "python", ["start.py"], { stdio: ["ignore", "pipe", "pipe"], shell: process.platform === "win32" });
let serverOutput = "";
server.stdout.on("data", chunk => { serverOutput += chunk; });
server.stderr.on("data", chunk => { serverOutput += chunk; });
const stopServer = () => server.kill();
process.on("exit", stopServer);

async function waitForServer() {
  for (let attempt = 0; attempt < 40; attempt += 1) {
    try { const response = await fetch(baseUrl); if (response.ok) return; } catch {}
    await new Promise(resolve => setTimeout(resolve, 250));
  }
  throw new Error(`Local app did not start at ${baseUrl}. Output:\n${serverOutput}`);
}

async function assertResponsive(page, viewport) {
  const result = await page.evaluate(({ width }) => {
    const rect = selector => document.querySelector(selector)?.getBoundingClientRect();
    const selectors = [".topbar", ".workspace", ".workbench-phases", ".output-actions", ".library-toolbar", ".hub-main", ".hub-grid", ".panel"];
    const overflow = document.documentElement.scrollWidth > width || document.body.scrollWidth > width;
    const clipped = selectors.filter(selector => { const box = rect(selector); return box && (box.left < 0 || box.right > width + 1); });
    const primary = ["#generate", '[data-hub-action="generate"]', "#primary-studio"].map(rect).find(box => box && box.width > 0 && box.height > 0);
    const phases = rect(".workbench-phases");
    return { overflow, clipped, primaryVisible: !!primary && primary.width > 0 && primary.height > 0 && primary.right <= width + 1, phasesVisible: !!phases && phases.width > 0 && phases.right <= width + 1 };
  }, { width: viewport.width });
  if (result.overflow) throw new Error(`horizontal overflow at ${viewport.width}px`);
  if (result.clipped.length) throw new Error(`clipped surfaces at ${viewport.width}px: ${result.clipped.join(", ")}`);
  if (!result.primaryVisible) throw new Error(`primary action is not visible at ${viewport.width}px`);
  if (!result.phasesVisible && result.phasesVisible !== undefined && await page.locator(".workbench-phases:visible").count()) throw new Error(`phase navigation exceeds viewport at ${viewport.width}px`);
}

async function studio(page) { await page.goto(`${baseUrl}/#studio`); await page.locator("#studio-shell").waitFor({ state: "visible" }); }
async function generate(page) { await page.locator("#seed").fill("visual-review-fixed-seed"); await page.locator("#variance").selectOption("varied"); await page.locator("#generate").click(); await page.waitForFunction(() => document.querySelector("#persona-name")?.textContent !== "New Persona"); }
async function savePersona(page) { await page.locator("#save-persona").click(); }

const states = {
  "studio-empty": async page => studio(page),
  "studio-generated": async page => { await studio(page); await generate(page); },
  alternatives: async page => { await studio(page); await generate(page); await page.locator('[data-action="alternatives"]').first().click(); },
  inspector: async page => { await studio(page); await generate(page); await page.locator('[data-action="inspect"]').first().click(); },
  "stale-dependency": async page => { await studio(page); await generate(page); await page.locator('[data-action="reroll"]').first().evaluate(button => button.click()); },
  "persona-output": async page => { await studio(page); await generate(page); await page.locator('[data-tab="persona"]').click(); },
  "reference-package": async page => { await studio(page); await generate(page); await page.locator('[data-tab="reference"]').click(); },
  "persona-library": async page => { await studio(page); await generate(page); await savePersona(page); await page.locator('[data-tab="library"]').click(); await page.locator("#library-list").waitFor(); },
  "project-empty": async page => { await studio(page); await page.locator('[data-tab="projects"]').click(); await page.locator("#projects-view").waitFor({ state: "visible" }); },
  "project-populated": async page => { await studio(page); await generate(page); await savePersona(page); await page.locator('[data-tab="projects"]').click(); await page.locator("#create-project").click(); await page.locator("#project-create-form").waitFor(); await page.locator('#project-create-form input[name="name"]').fill("Visual Review Project"); await page.locator('#project-create-form input[name="setting"]').fill("Futuristic"); await page.locator('#project-create-form input[name="era"]').fill("2043"); await page.locator('#project-create-form button[type="submit"]').click(); await page.locator('[data-project-action="open"]').click(); await page.locator('[data-project-action="add"]').last().click(); await page.locator("#project-add-form").waitFor(); await page.locator('#project-add-form button[type="submit"]').click(); },
  "control-centre": async page => { await page.goto(`${baseUrl}/#hub/overview`); await page.locator("#hub-content").waitFor(); },
  "control-centre-studio": async page => { await page.goto(`${baseUrl}/#hub/overview`); await page.locator('[data-hub-action="generate"]').click(); await page.locator("#studio-shell").waitFor({ state: "visible" }); }
};

await mkdir(outputDir, { recursive: true });
await waitForServer();
const browser = await chromium.launch();
try {
  for (const [name, state] of Object.entries(states)) {
    for (const [size, viewport] of Object.entries(viewports)) {
      const page = await browser.newPage({ viewport, reducedMotion: "reduce" });
      try {
        await state(page);
        await page.waitForTimeout(100);
        await assertResponsive(page, viewport);
        await page.screenshot({ path: resolve(outputDir, `${size}-${name}.png`), fullPage: true });
        console.log(`captured ${size}-${name}`);
      } finally { await page.close(); }
    }
  }
  console.log(`Visual review complete: ${Object.keys(states).length * Object.keys(viewports).length} screenshots in ${outputDir}`);
} catch (error) {
  console.error(`Visual review failed: ${error.message}`);
  process.exitCode = 1;
} finally { await browser.close(); stopServer(); }
