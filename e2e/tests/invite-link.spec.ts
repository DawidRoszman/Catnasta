import { expect, test } from "@playwright/test";
import { fullTable, opponentTable, register } from "./helpers";

test("join a table straight from its invite link", async ({ page }) => {
  await register(page);
  const { opponent, tableCode } = await opponentTable(page.request);

  // Opening the link is all it takes: no code to type, no lobby.
  await page.goto(`/game/${tableCode}`);
  await expect(page.locator("#action-dock")).toBeVisible({ timeout: 20_000 });
  await expect(page.getByRole("heading", { name: "Waiting for an opponent" })).toBeHidden();
  await expect(page.getByText(opponent).first()).toBeVisible();
  await expect(page.getByText(tableCode).first()).toBeVisible();

  // A link to a table that's already full sends you back to the lobby.
  const full = await fullTable(page.request);
  await page.goto(`/game/${full}`);
  await expect(page.getByText("Game is full")).toBeVisible();
  await expect(page.getByRole("heading", { name: "Open tables" })).toBeVisible();
});
