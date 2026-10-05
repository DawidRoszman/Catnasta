import { expect, test } from "@playwright/test";
import { register } from "./helpers";

test("register, sign out and log back in", async ({ page }) => {
  const { username, password } = await register(page);

  await page.locator("#account-menu").click();
  await expect(page.getByText(/Signed in as/)).toBeVisible();
  await expect(page.getByText("Change password")).toBeVisible();
  await page.getByText("Sign out").click();
  await expect(page.getByText("You've been signed out.")).toBeVisible();
  await expect(page.getByRole("link", { name: "Sign up" }).first()).toBeVisible();

  // A wrong password shows an inline error, not a browser popup.
  await page.getByRole("link", { name: "Log in" }).first().click();
  await expect(page.getByRole("heading", { name: "Welcome back" })).toBeVisible();
  await page.locator("#username").fill(username);
  await page.locator("#password").fill("definitely-wrong");
  await page.getByRole("button", { name: "Log in" }).click();
  await expect(page.getByText("Wrong username or password")).toBeVisible();

  await page.locator("#password").fill(password);
  await page.getByRole("button", { name: "Log in" }).click();
  await expect(page.getByText(`Welcome back, ${username}!`)).toBeVisible();
  await expect(page.locator("#account-menu")).toBeVisible();
});
