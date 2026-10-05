import { expect, test } from "@playwright/test";
import { dealTable, openTableOptions, register } from "./helpers";

test("deal a table and wait for an opponent", async ({ page }) => {
  await register(page);
  await openTableOptions(page);
  const code = await dealTable(page);
  await expect(page.getByRole("heading", { name: "Waiting for an opponent" })).toBeVisible();
  // New codes leave out characters that look alike.
  expect(code).toMatch(/^[A-HJKMNP-Z2-9]{6}$/);

  // Stepping away keeps the table open for a while, and the site offers a way back.
  await page.goto("/game");
  await expect(page.getByRole("heading", { name: "Open tables" })).toBeVisible();
  await expect(page.getByText(code).first()).toBeVisible();
  await expect(page.getByText("1/2 · seat open").first()).toBeVisible();
  await expect(page.getByText("Your table is open")).toBeVisible();
});
