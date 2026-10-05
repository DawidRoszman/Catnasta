import { expect, test } from "@playwright/test";
import { dealTable, joinOpponentTable, openTableOptions, register } from "./helpers";

test("leave, rejoin and forfeit a table", async ({ page }) => {
  await register(page);
  const first = await joinOpponentTable(page);

  // The API opponent never opens the table, so they show as away with a countdown.
  await expect(page.locator("#opponent-away")).toBeVisible();
  await expect(page.getByText(`${first.opponent} isn't at the table.`)).toBeVisible();

  // Stepping away keeps the seat, and the rest of the site offers a way back.
  await page.goto("/");
  await expect(page.locator("#active-game")).toBeVisible();
  await expect(page.getByText("Your game is still on")).toBeVisible();
  await page.getByText("Return to table").click();
  await expect(page.locator("#action-dock")).toBeVisible({ timeout: 20_000 });
  await expect(page.getByText(first.tableCode).first()).toBeVisible();

  // Leaving from the table asks first, then forfeits. The API opponent forfeits
  // once the grace period runs out, so use a fresh table for this part.
  const second = await joinOpponentTable(page);
  await page.locator("#leave-button").click();
  await expect(page.getByText("Forfeit the game?")).toBeVisible();
  await page.getByRole("button", { name: "Keep playing" }).click();
  await expect(page.getByText("Forfeit the game?")).toBeHidden();
  await page.locator("#leave-button").click();
  await page.getByRole("button", { name: "Forfeit and leave" }).click();
  await expect(page.getByRole("heading", { name: "Open tables" })).toBeVisible();
  // The forfeited table is gone from the lobby and from the "return" banner.
  await expect(page.getByText(second.tableCode)).toHaveCount(0);

  // A table that hasn't started is simply closed.
  await openTableOptions(page);
  const code = await dealTable(page);
  await page.getByRole("button", { name: "Leave", exact: true }).click();
  await expect(page.getByText("Close this table?")).toBeVisible();
  await page.getByRole("button", { name: "Close table" }).click();
  await expect(page.getByRole("heading", { name: "Open tables" })).toBeVisible();
  await expect(page.getByText(code)).toHaveCount(0);
});
