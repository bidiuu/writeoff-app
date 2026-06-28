"use client";

import { useOnline } from "@/hooks/use-online";
import { WifiOff, RefreshCw } from "lucide-react";

export function OfflineBanner() {
  const { isOnline, pendingCount, syncQueue } = useOnline();

  if (isOnline && pendingCount === 0) return null;

  return (
    <div className={`mx-4 mt-4 flex items-center gap-3 rounded-xl px-4 py-3 border ${
      isOnline
        ? "bg-amber-50 border-amber-200 text-amber-800"
        : "bg-red-50 border-red-200 text-red-800"
    }`}>
      <WifiOff size={18} className="shrink-0" />
      <p className="text-sm flex-1">
        {!isOnline
          ? "Нет подключения — заявки сохраняются локально"
          : `${pendingCount} заявок ожидают отправки`}
      </p>
      {isOnline && pendingCount > 0 && (
        <button onClick={syncQueue} className="shrink-0">
          <RefreshCw size={16} />
        </button>
      )}
    </div>
  );
}
