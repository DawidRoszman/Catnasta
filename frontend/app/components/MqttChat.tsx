"use client";
import React, { useEffect } from "react";
import client from "../lib/mqtt";
import { UUID } from "crypto";
import { v4 as uuid } from "uuid";
interface Message {
  id: UUID;
  username: string;
  message: string;
}

const MqttChat = () => {
  const [message, setMessage] = React.useState("");
  const [messages, setMessages] = React.useState<Message[]>([]);
  useEffect(() => {
    client.subscribe("catnasta-chat");
    const handleMessage = (topic: any, message: any) => {
      // Convert the message buffer to a string
      console.log(message.toString());
      const { id, username, msg } = JSON.parse(message.toString());

      // Log the topic and message to the console
      setMessages((prev) => [
        ...prev,
        { id, username: username, message: msg },
      ]);

      // TODO: Add your logic to update the UI based on the message
    };

    // Add the callback function as a listener to the 'message' event
    client.on("message", handleMessage);
  }, []);

  const handleSendMsg = (e: any) => {
    e.preventDefault();
    client.publish(
      "catnasta-chat",
      JSON.stringify({
        id: uuid(),
        username: localStorage.getItem("username"),
        msg: message,
      }),
    );
  };

  return (
    <div className="pt-12">
      <h1>Chat: </h1>
      <div className="overflow-y-scroll h-96">
        {messages.map((message) => {
          return (
            <div key={message.id}>
              <div
                className={`chat ${
                  message.username === localStorage.getItem("username")
                    ? "chat-end"
                    : "chat-start"
                }`}
              >
                <div className="chat-header">{message.username}</div>
                <div className="chat-bubble">{message.message}</div>
              </div>
            </div>
          );
        })}
      </div>
      <form>
        <input
          type="text"
          className="input input-bordered mx-2"
          value={message}
          onChange={(e) => setMessage(e.target.value)}
          placeholder="Enter your message..."
        />
        <button
          type="submit"
          className="btn btn-secondary"
          onClick={(e) => handleSendMsg(e)}
        >
          Send
        </button>
      </form>
    </div>
  );
};

export default MqttChat;

