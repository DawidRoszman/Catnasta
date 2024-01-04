"use client";
import React, { useEffect } from "react";
import client from "../lib/mqtt";

const Mqtt = () => {
  const [message, setMessage] = React.useState<string>("");
  useEffect(() => {
    client.subscribe("catnasta");
    const handleMessage = (topic: any, message: any) => {
      // Convert the message buffer to a string
      const msg = message.toString();

      // Log the topic and message to the console
      setMessage(msg);

      // TODO: Add your logic to update the UI based on the message
    };

    // Add the callback function as a listener to the 'message' event
    client.on("message", handleMessage);
  }, []);

  return (
    <div>
      <h1>Messages: </h1>
        <div>{message}</div>
    </div>
  );
};

export default Mqtt;