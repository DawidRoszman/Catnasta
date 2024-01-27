"use client";
import { useEffect, useState } from "react";
import client from "../lib/mqtt";

const Messages = () => {
  const [incomingMessage, setIncomingMessage] = useState("");

  useEffect(() => {
    client.subscribe("catnasta/messages");

    client.on("message", (topic, msg) => {
      if (topic !== "catnasta/messages") {
        return;
      }
      const { message } = JSON.parse(msg.toString());
      setIncomingMessage(message);
      setTimeout(() => {
        setIncomingMessage("");
      }, 5000);
    });
  }, []);
  return (
    <div className="fixed top-0 left-0">
      {incomingMessage === "" ? null : (
        <div role="alert" className="alert">
          <svg
            xmlns="http://www.w3.org/2000/svg"
            fill="none"
            viewBox="0 0 24 24"
            className="stroke-info shrink-0 w-6 h-6"
          >
            <path
              strokeLinecap="round"
              strokeLinejoin="round"
              strokeWidth="2"
              d="M13 16h-1v-4h-1m1-4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z"
            ></path>
          </svg>
          <span>{incomingMessage}</span>
          <button
            className="btn btn-sm btn-circle"
            onClick={() => setIncomingMessage("")}
          >
            X
          </button>
        </div>
      )}
    </div>
  );
};

export default Messages;
