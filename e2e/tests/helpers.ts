import { APIRequestContext, Page, expect } from "@playwright/test";

export const API_URL = process.env.API_URL ?? "http://localhost:5001";

const unique = () => Date.now().toString(36) + Math.floor(Math.random() * 1000);

export const YOUR_TURN = "Your turn — draw from the stock or take the discard pile";

/** Signs up a fresh user and leaves the page on the home page, signed in. */
export async function register(page: Page) {
  const username = "cat" + unique();
  const password = "whiskers-" + Math.floor(Math.random() * 100000);
  await page.goto("/register");
  await expect(page.getByRole("heading", { name: "Join the table" })).toBeVisible();
  await page.locator("#username").fill(username);
  await page.locator("#password").fill(password);
  await page.getByRole("button", { name: "Create account" }).click();
  await expect(page.getByText(`Welcome to Catnasta, ${username}!`)).toBeVisible();
  await expect(page.locator("#account-menu")).toBeVisible();
  return { username, password };
}

export type OpponentOptions = { private?: boolean; turnSeconds?: number; handSize?: number };

/** Registers an opponent through the API and deals a table in their name. They never move. */
export async function opponentTable(request: APIRequestContext, options: OpponentOptions = {}) {
  const opponent = "rival" + unique();
  const registered = await request.post(`${API_URL}/register`, {
    data: { username: opponent, password: "rival-pass" },
  });
  expect(registered.ok()).toBe(true);
  const table = await request.post(`${API_URL}/create_game`, {
    data: {
      name: opponent,
      private: options.private ?? false,
      turnSeconds: options.turnSeconds ?? 0,
      ...(options.handSize ? { handSize: options.handSize } : {}),
    },
  });
  const { id } = await table.json();
  expect(id, "table code").toBeTruthy();
  return { opponent, tableCode: id as string };
}

/** Deals a table through the API and fills both seats, so nobody else can join. */
export async function fullTable(request: APIRequestContext) {
  const suffix = unique();
  const table = await request.post(`${API_URL}/create_game`, { data: { name: "host" + suffix } });
  const { id } = await table.json();
  const join = await request.put(`${API_URL}/join_game`, { data: { id, name: "guest" + suffix } });
  expect((await join.json()).id).toBe(id);
  return id as string;
}

/** Types a table code on the home page and joins; the cards are dealt once both seats fill. */
export async function joinByCode(page: Page, code: string) {
  await page.goto("/");
  await page.locator("#table-code").fill(code);
  await page.getByRole("button", { name: "Join", exact: true }).click();
  await expect(page.locator("#action-dock")).toBeVisible({ timeout: 20_000 });
}

/** Deals an opponent's table and joins it. */
export async function joinOpponentTable(page: Page, options: OpponentOptions = {}) {
  const table = await opponentTable(page.request, options);
  await joinByCode(page, table.tableCode);
  return table;
}

/**
 * Who starts is random and the API opponent never moves, so deal fresh tables
 * until we get the first turn.
 */
export async function joinTableOnOurTurn(page: Page) {
  for (let attempt = 0; attempt < 10; attempt++) {
    // The action dock only shows once the cards are dealt and someone has the turn.
    const table = await joinOpponentTable(page);
    if (await page.getByText(YOUR_TURN).isVisible()) {
      return table;
    }
  }
  throw new Error("Never got the first turn");
}

/** Opens the "Deal a new table" options dialog. */
export async function openTableOptions(page: Page) {
  await page.locator("#create-game").click();
  await expect(page.getByRole("heading", { name: "Table options" })).toBeVisible();
}

/** Deals a table from the options dialog and returns its code from the waiting room. */
export async function dealTable(page: Page) {
  await page.getByRole("button", { name: "Deal table" }).click();
  await expect(page.locator("#waiting-room")).toBeVisible({ timeout: 15_000 });
  const code = (await page.locator("#game-code").innerText()).trim();
  expect(code).toHaveLength(6);
  return code;
}
