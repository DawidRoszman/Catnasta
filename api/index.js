"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
var express = require("express");
var dotenv = require("dotenv");
var mqtt = require("mqtt");
var clientId = "mqttjs_server_" + Math.random().toString(16).slice(2, 8);
var client = mqtt.connect("ws://broker.emqx.io:8083/mqtt", {
    clientId: clientId,
});
client.publish("catnasta", "Hello mqtt");
dotenv.config();
var app = express();
var port = process.env.PORT || 5000;
app.get("/", function (req, res) {
    res.send("Welcome to Catnasta");
});
app.get("/game", function (req, res) {
    client.publish("catnasta", "Game");
    res.send("Game");
});
app.listen(port, function () {
    console.log("[server]: Server is running at http://localhost:".concat(port));
});
