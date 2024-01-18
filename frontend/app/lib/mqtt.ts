import mqtt from "mqtt";
const clientId = "mqttjs_" + Math.random().toString(16).slice(2, 8);
const host = "wss://broker.emqx.io:8883/mqtt";
const client = mqtt.connect(host);
client.options.keepalive = 60;
client.options.clientId = clientId;
client.options.protocolId = "MQTT";
client.options.protocolVersion = 4;
client.options.clean = true;
client.options.reconnectPeriod = 1000;
client.options.connectTimeout = 30 * 1000;
client.options.will = {
  topic: "WillMsg",
  payload: Buffer.from("Connection Closed abnormally..!"),
  qos: 0,
  retain: false,
};
export default client;
