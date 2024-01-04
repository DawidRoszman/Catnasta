"use client";
import React, { useEffect } from "react";
import client from "../lib/mqtt";

const Mqtt = () => {
  useEffect(() => {
    client.subscribe("catnasta");
    client.on("message", function (topic, message) {
      // message is Buffer
      console.log(message.toString());
      client.end();
    });
  }, []);

  return <div>Mqtt</div>;
};

export default Mqtt;
