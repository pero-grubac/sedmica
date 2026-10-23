// Smoke tests for the main flows: setup, rounds, šuster, the end of the game,
// undo, history and reload. Runs on a desktop and a phone viewport.
import { test, expect } from "@playwright/test";

test.beforeEach(async ({ page }) => {
  const errors = [];
  page.on("pageerror", (e) => errors.push(e.message));
  page.on("console", (m) => m.type() === "error" && errors.push(m.text()));
  page.errors = errors;
  await page.goto("./");
});

test.afterEach(async ({ page }) => {
  expect(page.errors, "no JavaScript errors").toEqual([]);
});

async function setup(page, names, limit) {
  for (const [i, name] of names.entries()) await page.fill(`#p${i + 1}`, name);
  if (limit !== undefined) await page.fill("#limit", String(limit));
  await page.getByRole("button", { name: "Počni igru →" }).click();
}

async function round(page, values, shuster = []) {
  for (const [i, v] of values.entries()) await page.fill(`#input-${i}`, String(v));
  for (const i of shuster) await page.locator(`#card-${i} .btn-looser`).click();
  await page.getByRole("button", { name: "+ Dodaj rundu" }).click();
}

const rows = (page) => page.locator("#score-tbody tr:not(.sum-row)");

test("custom limit, 8/9 check, šuster and running totals in the table", async ({ page }) => {
  await setup(page, ["Ana", "Marko", "Jelena"], 31);
  await expect(page.locator("#subtitle")).toContainText("igra do 31");
  await expect(page.locator("#limit-label")).toHaveText("do 31");

  await round(page, [1, 1, 1]);
  await expect(page.locator("#round-error")).toContainText("8 ili 9");
  await expect(rows(page)).toHaveCount(1); // only the "no rounds yet" row
  await expect(page.locator("#score-tbody")).toContainText("Još nema rundi");

  await round(page, [3, 4, 2]);
  await round(page, [5, 4, 6], [2]);
  await expect(rows(page)).toHaveCount(2);
  const second = rows(page).nth(1).locator("td");
  await expect(second.nth(1).locator(".cell-run")).toHaveText("Σ 8");
  await expect(second.nth(3)).toContainText("💀");
  await expect(second.nth(3).locator(".cell-run")).toHaveText("↺ 0");
  await expect(page.locator(".sum-row td")).toHaveText(["Suma", "8", "8", "0"]);
});

test("reaching the limit ends the game and undo reopens it", async ({ page }) => {
  await setup(page, ["Ana", "Marko"], 11);
  await round(page, [5, 4]);
  await expect(page.locator("#game-over")).toBeHidden();
  await round(page, [6, 3]);

  await expect(page.locator("#game-over")).toBeVisible();
  await expect(page.locator("#game-over-text")).toContainText("Gubitnik: Ana");
  await expect(page.locator("#add-btn")).toBeDisabled();
  await expect(page.locator("#input-0")).toBeDisabled();
  await expect(page.locator("#card-0 .btn-looser")).toBeDisabled();

  await page.getByRole("button", { name: "↶ Poništi zadnju rundu" }).click();
  await expect(page.locator("#game-over")).toBeHidden();
  await expect(page.locator("#add-btn")).toBeEnabled();
  await round(page, [3, 6]);
  await expect(rows(page)).toHaveCount(2);
});

test("a finished game shows up in the history with per-player stats", async ({ page }) => {
  await setup(page, ["Ana", "Marko"], 11);
  await round(page, [5, 4]);
  await round(page, [6, 3]);
  await page.locator("#game-over").getByRole("button", { name: "↺ Nova igra" }).click();
  await page.locator("#reset-modal").getByRole("button", { name: "Resetuj" }).click();

  const history = page.locator("#history-section");
  await expect(history).toBeVisible();
  await expect(page.locator(".history-item")).toHaveCount(1);
  await expect(page.locator(".history-item")).toContainText("do 11");
  await expect(page.locator(".history-item .h-loser")).toHaveText("💀 Ana 11");
  await expect(page.locator("#stats-tbody tr").first().locator("td")).toHaveText(["Ana", "1", "1", "11"]);

  // History survives a reload, and can be deleted through the dialog.
  await page.reload();
  await expect(page.locator(".history-item")).toHaveCount(1);
  await page.getByRole("button", { name: "🗑 Obriši istoriju" }).click();
  await page.locator("#history-modal").getByRole("button", { name: "Obriši" }).click();
  await expect(history).toBeHidden();
});

test("a reload keeps the game in progress, its limit and an ended state", async ({ page }) => {
  await setup(page, ["Ana", "Marko", "Jelena"], 21);
  await round(page, [3, 4, 2]);
  await page.reload();
  await expect(page.locator("#game-view")).toBeVisible();
  await expect(page.locator("#subtitle")).toContainText("igra do 21");
  await expect(rows(page)).toHaveCount(1);

  await round(page, [9, 0, 0]);
  await round(page, [9, 0, 0]); // Ana 21
  await page.reload();
  await expect(page.locator("#game-over")).toBeVisible();
  await expect(page.locator("#add-btn")).toBeDisabled();
});
