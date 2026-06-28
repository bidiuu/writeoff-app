"use client";

import { useEffect } from "react";
import { processQueue } from "@/lib/offline/queue";
import { toast } from "sonner";

// Listens for Background Sync message from SW and processes offline queue
export function SwMessageHandler() {
  useEffect(() => {
    if (!("serviceWorker" in navigator)) return;

    function handleMessage(event: MessageEvent) {
      if (event.data?.type === "PROCESS_OFFLINE_QUEUE") {
        processQueue().then(({ sent }) => {
          if (sent > 0) toast.success(`Синхронизировано ${sent} заявок`);
        });
      }
    }

    navigator.serviceWorker.addEventListener("message", handleMessage);
    return () => navigator.serviceWorker.removeEventListener("message", handleMessage);
  }, []);

  return null;
}
