// Deals a table through the API and fills both seats, so nobody else can join.
const headers = { "Content-Type": "application/json" };
const suffix = Date.now().toString(36);

const table = http.post(API_URL + "/create_game", {
  headers,
  body: JSON.stringify({ name: "host" + suffix }),
});
const id = json(table.body).id;
if (!id) {
  throw new Error("Could not create table: " + table.body);
}
const join = http.put(API_URL + "/join_game", {
  headers,
  body: JSON.stringify({ id, name: "guest" + suffix }),
});
if (json(join.body).id !== id) {
  throw new Error("Could not fill table: " + join.body);
}

output.fullTableCode = id;
