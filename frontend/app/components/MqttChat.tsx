"use client";
import React, { useEffect } from "react";
import client from "../lib/mqtt";
import axios from "axios";
import { useCookies } from "next-client-cookies";
import { api } from "../lib/api";
interface Message {
  username: string;
  message: string;
}

const MqttChat = () => {
  const cookies = useCookies();
  const [message, setMessage] = React.useState("");
  const [messages, setMessages] = React.useState<Message[]>([]);
  useEffect(() => {
    client.subscribe("catnasta/chat");

    const getMessages = async () => {
      const response = await axios.get(api + "/chat");
      const messages = response.data.map((message: any) => {
        return {
          username: message.username,
          message: message.message,
        };
      });
      setMessages(messages);
    };

    getMessages();

    const handleMessage = (topic: any, message: any) => {
      const { username, msg } = JSON.parse(message.toString());

      setMessages((prev) => [...prev, { username: username, message: msg }]);
    };

    // Add the callback function as a listener to the 'message' event
    client.on("message", handleMessage);
  }, []);

  const handleSendMsg = (e: any) => {
    e.preventDefault();
    client.publish(
      "catnasta/chat",
      JSON.stringify({
        username: cookies.get("username"),
        msg: message,
      }),
    );
    setMessage("");
  };

  return (
    <>
      <div
        tabIndex={0}
        className="collapse collapse-arrow w-fit bg-base-200 fixed bottom-0 right-0"
      >
        <input type="checkbox" />
        <div className="collapse-title collapse-arrow text-xl font-medium">
          Chat here
        </div>
        <div className="collapse-content grid place-items-center">
          <div className="border-2 border-primary rounded-xl p-5">
            <div className="overflow-y-scroll flex flex-col-reverse h-96">
              {messages.toReversed().map((message, id) => {
                return (
                  <div key={id}>
                    <div
                      className={`chat ${
                        message.username === cookies.get("username")
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
        </div>
      </div>
    </>
  );
};

export default MqttChat;
