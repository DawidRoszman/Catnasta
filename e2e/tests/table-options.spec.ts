import { expect, test } from "@playwright/test";
import { dealTable, openTableOptions, register } from "./helpers";

test("deal a table with custom options", async ({ page }) => {
  await register(page);

  // A public table to 1,000 points with a short break, timed turns and 13-card
  // hands shows its options in the lobby.
  await openTableOptions(page);
  await expect(page.getByText("Points to win")).toBeVisible();
  await page.getByRole("radio", { name: "1,000" }).click();
  await page.getByRole("radio", { name: "5s" }).click();
  await page.getByRole("radio", { name: "60s" }).click();
  await expect(page.locator("#hand-size")).toHaveText("15 cards");
  await page.locator("#hand-size-less").click();
  await page.locator("#hand-size-less").click();
  await expect(page.locator("#hand-size")).toHaveText("13 cards");
  const code = await dealTable(page);

  await page.goto("/game");
  const card = page.locator("li, article, div").filter({ hasText: code }).filter({ hasText: "First to" }).last();
  await expect(card).toContainText("First to 1,000");
  await expect(card).toContainText("60s turns");
  await expect(card).toContainText("13 cards each");

  // The same dialog deals private tables, which stay out of the lobby.
  await openTableOptions(page);
  await page.getByRole("radio", { name: "2,500" }).click();
  await expect(page.locator("#private-table")).toContainText("Off");
  await page.locator("#private-table").click();
  await expect(page.locator("#private-table")).toContainText("On");
  const hidden = await dealTable(page);
  await page.goto("/game");
  await expect(page.getByRole("heading", { name: "Open tables" })).toBeVisible();
  await expect(page.getByText(hidden)).toHaveCount(0);
  await expect(page.getByText("First to 2,500")).toHaveCount(0);
});
