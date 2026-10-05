import { expect, test } from "@playwright/test";
import { dealTable, joinByCode, opponentTable, openTableOptions, register } from "./helpers";

test("private tables stay out of the lobby", async ({ page }) => {
  await register(page);

  // Deal a private table from the home page.
  await openTableOptions(page);
  await page.locator("#private-table").click();
  await expect(page.locator("#private-table")).toHaveAttribute("aria-checked", "true");
  const code = await dealTable(page);
  await expect(page.getByRole("heading", { name: "Waiting for an opponent" })).toBeVisible();
  await page.goto("/game");
  await expect(page.getByRole("heading", { name: "Open tables" })).toBeVisible();
  await expect(page.getByText(code)).toHaveCount(0);

  // Someone else's private table is hidden too, but the code still gets you in.
  const { opponent, tableCode } = await opponentTable(page.request, { private: true });
  await page.goto("/game");
  await expect(page.getByRole("heading", { name: "Open tables" })).toBeVisible();
  await expect(page.getByText(tableCode)).toHaveCount(0);
  await joinByCode(page, tableCode);
  await expect(page.getByText(opponent).first()).toBeVisible();
});
