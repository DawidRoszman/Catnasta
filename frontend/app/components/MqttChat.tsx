"use client";
import React, { useEffect } from "react";
import client from "../lib/mqtt";
import axios from "axios";
import { useCookies } from "next-client-cookies";
import { api } from "../lib/api";
import { useUserContext } from "./UserContext";
import { v4 as uuidv4 } from "uuid";
interface Message {
  id: string;
  username: string;
  message: string;
}

const MqttChat = () => {
  const cookies = useCookies();
  const userContext = useUserContext();
  const [message, setMessage] = React.useState("");
  const [messages, setMessages] = React.useState<Message[]>([]);
  useEffect(() => {
    client.subscribe("catnasta/chat");

    const getMessages = async () => {
      const response = await axios.get(api + "/chat");
      const data = response.data;

      const messages = data.map((message: any) => {
        return {
          username: message.username,
          message: message.message,
          id: message.id,
        };
      });
      setMessages(messages);
    };

    getMessages();

    const handleMessage = (topic: any, msg: any) => {
      const { id, username, message } = JSON.parse(msg.toString());

      setMessages((prev) => [
        ...prev,
        { id: id, username: username, message: message },
      ]);
    };

    // Add the callback function as a listener to the 'message' event
    client.on("message", handleMessage);
  }, []);

  if (userContext === null) {
    return <div>Loading...</div>;
  }

  const handleSendMsg = (e: any) => {
    e.preventDefault();
    client.publish(
      "catnasta/chat",
      JSON.stringify({
        id: uuidv4(),
        username: userContext.username,
        message: message,
      }),
    );
    setMessage("");
  };

  const handleDeleteMessage = async (id: string) => {
    const response = await axios.delete(api + "/chat/delete/" + id, {
      headers: {
        Authorization: "Bearer " + cookies.get("token"),
      },
    });
    const data = response.data;
    if (data.msg !== "Message deleted") {
      alert(data.msg);
      return;
    }
    setMessages((prev) => prev.filter((message) => message.id !== id));
  };

  const handleEditMessage = async (id: string) => {
    const newMessage = prompt(
      "Edit your message",
      messages.filter((message) => message.id === id)[0].message,
    );
    if (newMessage === null || newMessage === "" || newMessage === undefined) {
      return;
    }
    const response = await axios.put(
      api + "/chat/update/" + id,
      {
        message: newMessage,
      },
      {
        headers: {
          Authorization: "Bearer " + cookies.get("token"),
        },
      },
    );
    const data = response.data;
    if (data.msg !== "Message updated") {
      alert(data.msg);
      return;
    }
    const prevMessages = [...messages];
    const newMessages = prevMessages.map((message) => {
      if (message.id === id) {
        message.message = newMessage;
      }
      return message;
    });
    setMessages(newMessages);
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
                        message.username === userContext.username
                          ? "chat-end"
                          : "chat-start"
                      }`}
                    >
                      <div className="chat-header">{message.username}</div>
                      <div className="chat-bubble">{message.message}</div>
                      <div className="chat-footer">
                        {message.username === userContext.username && (
                          <>
                            <button
                              onClick={() => handleDeleteMessage(message.id)}
                            >
                              delete
                            </button>{" "}
                            <button
                              onClick={() => handleEditMessage(message.id)}
                            >
                              edit
                            </button>
                          </>
                        )}
                      </div>
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
                disabled={message === "" || userContext.username === ""}
                onClick={(e) => handleSendMsg(e)}
              >
                {userContext.username === "" ? "Login to chat" : "Send"}
              </button>
            </form>
          </div>
        </div>
      </div>
    </>
  );
};

export default MqttChat;
