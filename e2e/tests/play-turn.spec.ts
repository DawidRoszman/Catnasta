import { expect, test } from "@playwright/test";
import { YOUR_TURN, joinOpponentTable, joinTableOnOurTurn, register } from "./helpers";

test("join a table and play a turn on the 3D board", async ({ page }) => {
  await register(page);
  const first = await joinOpponentTable(page);
  await expect(page.locator("#game-canvas")).toBeVisible();
  await expect(page.getByText(first.tableCode).first()).toBeVisible();
  await expect(page.getByText(first.opponent).first()).toBeVisible();
  await expect(page.getByRole("heading", { name: "Waiting for an opponent" })).toBeHidden();

  const { opponent } = await joinTableOnOurTurn(page);
  await expect(page.getByText(YOUR_TURN)).toBeVisible();
  // No melds yet, so the litterbox pile can't be taken.
  await expect(page.locator("#take-pile")).toBeDisabled();
  await expect(page.locator("#round-number")).toContainText("Round 1");

  await page.getByRole("button", { name: "Draw", exact: true }).click();
  // Nothing banked yet, so the first melds need the opening 30 points.
  await expect(page.getByText("Your first melds need 30 points — or just discard")).toBeVisible();

  // Click a card in the middle of the fanned hand on the 3D table.
  await page.mouse.click(720, 720);
  await expect(page.getByText("1 selected")).toBeVisible();
  // Drop it on the litterbox to discard.
  await page.mouse.click(1130, 415);
  await expect(page.getByText(`Waiting for ${opponent} to come back…`)).toBeVisible();
  await expect(page.getByText("1 selected")).toBeHidden();

  // The rules are one click away during play.
  await page.locator("#rules-button").click();
  await expect(page.getByText("How to play")).toBeVisible();
  await page.getByRole("button", { name: "Got it" }).click();
  await expect(page.getByText("How to play")).toBeHidden();
});
