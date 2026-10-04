"use client";
import { useEffect } from "react";
import client from "../lib/socket";
import { useToast } from "./ui/Feedback";

/** Shows admin broadcasts as toasts. */
const Announcements = () => {
  const toast = useToast();

  useEffect(() => {
    client.subscribe("catnasta/messages");
    const handleMessage = (topic: string, msg: string) => {
      if (topic !== "catnasta/messages") {
        return;
      }
      const { message } = JSON.parse(msg);
      toast(message, { tone: "announcement", title: "Announcement", duration: 8000 });
    };
    client.on("message", handleMessage);
    return () => {
      client.off("message", handleMessage);
    };
  }, [toast]);

  return null;
};

export default Announcements;
