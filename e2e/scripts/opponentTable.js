// Registers an opponent through the API and deals a table in their name,
// so a single browser can join it and start a two-player game.
// Pass PRIVATE: "true" to deal a private table that stays out of the lobby.
const headers = { "Content-Type": "application/json" };
const opponent = "rival" + Date.now().toString(36);

const register = http.post(API_URL + "/register", {
  headers,
  body: JSON.stringify({ username: opponent, password: "rival-pass" }),
});
if (!register.ok) {
  throw new Error("Could not register opponent: " + register.status);
}

const table = http.post(API_URL + "/create_game", {
  headers,
  body: JSON.stringify({
    name: opponent,
    private: typeof PRIVATE !== "undefined" && PRIVATE === "true",
  }),
});
const id = json(table.body).id;
if (!id) {
  throw new Error("Could not create table: " + table.body);
}

output.opponent = opponent;
output.tableCode = id;
