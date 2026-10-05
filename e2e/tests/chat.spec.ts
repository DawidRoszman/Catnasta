import { expect, test } from "@playwright/test";
import { register } from "./helpers";

test("post in the lobby chat", async ({ page }) => {
  const { username } = await register(page);
  await page.locator("#chat-toggle").click();
  await expect(page.getByText("Lobby chat")).toBeVisible();
  const input = page.getByPlaceholder("Write a message…");
  await input.fill(`Meow from ${username}`);
  await input.press("Enter");
  await expect(page.getByText(`Meow from ${username}`)).toBeVisible();
});
