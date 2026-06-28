"use client";

import { useEffect } from "react";
import { usePush } from "@/hooks/use-push";
import { Button } from "@/components/ui/button";
import { Bell } from "lucide-react";

interface PushPromptProps {
  role: string;
}

export function PushPrompt({ role }: PushPromptProps) {
  const { state, loading, subscribe } = usePush();

  // Auto-subscribe reviewers silently on first visit
  useEffect(() => {
    if (role === "reviewer" && state === "prompt") {
      subscribe();
    }
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [role, state]);

  if (state === "unsupported" || state === "denied" || state === "granted") return null;

  return (
    <div className="mx-4 mt-4 flex items-center gap-3 rounded-xl bg-blue-50 border border-blue-200 px-4 py-3">
      <Bell size={18} className="text-blue-600 shrink-0" />
      <p className="text-sm text-blue-800 flex-1">
        Включите уведомления, чтобы получать новые заявки
      </p>
      <Button size="sm" variant="outline" disabled={loading} onClick={subscribe}
        className="border-blue-300 text-blue-700 hover:bg-blue-100 shrink-0">
        {loading ? "..." : "Включить"}
      </Button>
    </div>
  );
}
