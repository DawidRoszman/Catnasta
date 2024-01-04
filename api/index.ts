import { Express, Request, Response } from "express";
const express = require("express");
const dotenv = require("dotenv");
const mqtt = require("mqtt");

const clientId = "mqttjs_server_" + Math.random().toString(16).slice(2, 8);
const client = mqtt.connect("ws://broker.emqx.io:8083/mqtt", {
  clientId: clientId,
});

client.publish("catnasta", "Hello mqtt");

dotenv.config();

const app: Express = express();
const port = process.env.PORT || 5000;

app.get("/", (req: Request, res: Response) => {
  res.send("Welcome to Catnasta");
});

app.get("/game", (req: Request, res: Response) => {
  client.publish("catnasta", "Game");
  res.send("Game");
});

app.listen(port, () => {
  console.log(`[server]: Server is running at http://localhost:${port}`);
});
