import { chromium } from "playwright";
const base = "http://127.0.0.1:8765";
const viewports = { desktop: [1440, 1000], tablet: [1024, 900], mobile: [390, 844] };
const browser = await chromium.launch();
try {
  for (const [name, [width, height]] of Object.entries(viewports)) {
    const page = await browser.newPage({ viewport: { width, height }, reducedMotion: "reduce" });
    await page.goto(`${base}/#studio`);
    await page.locator('[data-tab="projects"]').click();
    await page.locator("#projects-view").waitFor({ state: "visible" });
    const result = await page.evaluate(({ width }) => ({ overflow: document.documentElement.scrollWidth > width || document.body.scrollWidth > width, projectsVisible: !!document.querySelector("#projects-view") && !document.querySelector("#projects-view").hidden, newProjectVisible: !!document.querySelector("#create-project")?.getBoundingClientRect().width }), { width });
    if (result.overflow || !result.projectsVisible || !result.newProjectVisible) throw new Error(`${name}: ${JSON.stringify(result)}`);
    await page.screenshot({ path: `visual-review/screenshots/${name}-projects-empty.png`, fullPage: true });
    console.log(`${name}: project empty verified`);
    await page.locator('[data-tab="studio"]').click();
    await page.locator("#generate").click();
    await page.locator("#save-persona").click();
    await page.locator('[data-tab="projects"]').click();
    await page.locator("#create-project").click();
    await page.locator('#project-create-form input[name="name"]').fill(`Responsive ${name}`);
    await page.locator('#project-create-form button[type="submit"]').click();
    const card = page.locator('[data-project-action="open"]').first();
    await card.click();
    await page.locator('[data-project-action="add"]').last().click();
    await page.locator("#project-add-form").waitFor();
    await page.locator('#project-add-form button[type="submit"]').click();
    const populated = await page.evaluate(({ width }) => ({ overflow: document.documentElement.scrollWidth > width || document.body.scrollWidth > width, hasReference: document.body.innerText.includes("1 character") || document.body.innerText.includes("characters") }), { width });
    if (populated.overflow || !populated.hasReference) throw new Error(`${name} populated: ${JSON.stringify(populated)}`);
    await page.screenshot({ path: `visual-review/screenshots/${name}-projects-populated.png`, fullPage: true });
    console.log(`${name}: project populated verified`);
    await page.close();
  }
} finally { await browser.close(); }
