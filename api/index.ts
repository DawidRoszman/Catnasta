import express, { Express, Request, Response } from "express";
import mqtt from "mqtt";
import PocketBase from "pocketbase";
import cors from "cors";

const clientId = "mqttjs_server_" + Math.random().toString(16).slice(2, 8);
const client = mqtt.connect("ws://broker.emqx.io:8083/mqtt", {
  clientId: clientId,
});

const pb = new PocketBase("http://127.0.0.1:8090");
pb.admins.authWithPassword("dawidroszman@gmail.com", "ypjTRaf!s6K7H:x");

client.publish("catnasta", "Hello mqtt");

const app: Express = express();
const port = 5000;
app.use(express.json());
app.use(cors());

client.subscribe("catnasta-chat");

client.on("message", (topic, message) => {
  if (topic === "catnasta-chat") {
    const msg = JSON.parse(message.toString());
    pb.collection("chat").create({
      username: msg.username,
      message: msg.msg,
    });
  }
});

app.get("/chat", async (req: Request, res: Response) => {
  const chat = await pb.collection("chat").getList();
  const messages = chat.items;
  res.send(messages);
});

app.get("/", (req: Request, res: Response) => {
  res.send("Welcome to Catnasta");
});

app.post("/create_game", async (req: Request, res: Response) => {});

app.get("/join_game", (req: Request, res: Response) => {
  client.publish("catnasta", "Game");
  res.send("Game");
});

app.listen(port, () => {
  console.log(`[server]: Server is running at http://localhost:${port}`);
});
