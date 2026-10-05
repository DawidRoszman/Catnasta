import { expect, test } from "@playwright/test";
import { YOUR_TURN, joinOpponentTable, register } from "./helpers";

test("timed turns play themselves when time runs out", async ({ page }) => {
  // Up to two 30-second turns run out, so allow well over a minute.
  test.setTimeout(150_000);
  await register(page);
  const { opponent } = await joinOpponentTable(page, { turnSeconds: 30 });
  await expect(page.locator("#turn-timer")).toBeVisible();

  // The API opponent never moves, so if they start, their clock plays for them.
  await expect(page.getByText(YOUR_TURN)).toBeVisible({ timeout: 45_000 });
  await expect(page.locator("#turn-timer")).toBeVisible();

  // Do nothing: when the clock runs out a card is drawn and the lowest discarded.
  await expect(
    page.getByText("Time's up — a card was drawn for you and your lowest card discarded."),
  ).toBeVisible({ timeout: 45_000 });
  await expect(page.getByText(`Waiting for ${opponent} to come back…`)).toBeVisible();
  await expect(page.locator("#turn-timer")).toBeVisible();
});
