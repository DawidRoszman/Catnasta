import { expect, test } from "@playwright/test";

test("landing page shows the pitch, the rules and a read-only chat", async ({ page }) => {
  await page.goto("/");
  await expect(page.getByText("Meld, discard,")).toBeVisible();
  await expect(page.getByText("A feline twist on Canasta", { exact: false })).toBeVisible();
  await expect(page.getByText("Sign in to deal a new table or join a friend's game.")).toBeVisible();

  await page.getByRole("link", { name: "Rules", exact: true }).first().click();
  await expect(page.getByText("How a turn works")).toBeVisible();
  await page.getByText("Red Three", { exact: true }).scrollIntoViewIfNeeded();
  await expect(page.getByText("Card values")).toBeVisible();
  await expect(page.getByText("Black Three", { exact: true })).toBeVisible();

  // Guests can read the chat but not post.
  await page.locator("#chat-toggle").click();
  await expect(page.getByText("Lobby chat")).toBeVisible();
  await expect(page.getByPlaceholder("Log in to chat")).toBeVisible();
});
