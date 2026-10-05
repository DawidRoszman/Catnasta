import { expect, test } from "@playwright/test";

test("read the full rules", async ({ page }) => {
  await page.goto("/");
  await page.getByRole("link", { name: "Rules", exact: true }).first().click();
  await expect(page.getByText("How a turn works")).toBeVisible();
  await expect(page.getByText(/scores 100 points, whether or not you've melded/)).toBeVisible();

  await page.locator("#detailed-rules-button").click();
  const rules = page.getByRole("dialog");
  await expect(rules.getByText("Full rules")).toBeVisible();
  await expect(rules.getByRole("heading", { name: "The deal" })).toBeVisible();

  // The rules scroll inside the dialog; each section can be brought into view.
  for (const text of [
    "Total below 1,500",
    "Total 1,500 – 2,995",
    "One meld of each rank",
    "Rounds and winning",
    "5,000 points",
    "no extra bonus for collecting all four",
  ]) {
    const line = rules.getByText(text, { exact: false }).first();
    await line.scrollIntoViewIfNeeded();
    await expect(line).toBeInViewport();
  }

  await rules.getByRole("button", { name: "Close" }).last().click();
  await expect(rules).toBeHidden();
});
