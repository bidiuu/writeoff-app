"use client";

import { useEffect, useState, useCallback } from "react";
import { processQueue, getPendingRequests } from "@/lib/offline/queue";
import { toast } from "sonner";

export function useOnline() {
  const [isOnline, setIsOnline] = useState(true);
  const [pendingCount, setPendingCount] = useState(0);

  const syncQueue = useCallback(async () => {
    const pending = await getPendingRequests();
    if (pending.length === 0) return;
    toast.info(`Отправляем ${pending.length} отложенных заявок...`);
    const { sent, failed } = await processQueue();
    const fresh = await getPendingRequests();
    setPendingCount(fresh.length);
    if (sent > 0) toast.success(`Отправлено ${sent} заявок`);
    if (failed > 0) toast.error(`Не удалось отправить ${failed} заявок`);
  }, []);

  useEffect(() => {
    setIsOnline(navigator.onLine);
    getPendingRequests().then((p) => setPendingCount(p.length));

    function onOnline() {
      setIsOnline(true);
      syncQueue();
    }
    function onOffline() {
      setIsOnline(false);
      toast.warning("Нет подключения — заявки сохраняются локально");
    }

    window.addEventListener("online", onOnline);
    window.addEventListener("offline", onOffline);
    return () => {
      window.removeEventListener("online", onOnline);
      window.removeEventListener("offline", onOffline);
    };
  }, [syncQueue]);

  return { isOnline, pendingCount, syncQueue };
}
