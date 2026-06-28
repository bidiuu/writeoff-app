"use client";

import { useState, useEffect } from "react";
import { ClipboardList } from "lucide-react";
import { createClient } from "@/lib/supabase/client";
import { RequestCard } from "./request-card";
import { EmptyState } from "@/components/empty-state";
import { Skeleton } from "@/components/ui/skeleton";

// eslint-disable-next-line @typescript-eslint/no-explicit-any
type RequestRow = any;

interface ReviewQueueProps {
  initialRequests: RequestRow[];
}

export function ReviewQueue({ initialRequests }: ReviewQueueProps) {
  const [requests, setRequests] = useState<RequestRow[]>(initialRequests);
  const [loading, setLoading] = useState(false);
  const supabase = createClient();

  useEffect(() => {
    const channel = supabase
      .channel("review-queue-realtime")
      .on(
        "postgres_changes",
        { event: "INSERT", schema: "public", table: "writeoff_requests", filter: "status=eq.pending" },
        async (payload) => {
          // Fetch full row with joins when a new request arrives
          const { data } = await supabase
            .from("writeoff_requests")
            .select("*, store:stores(name), author:profiles!writeoff_requests_author_id_fkey(full_name)")
            .eq("id", payload.new.id)
            .single();
          if (!data) return;
          // Resolve deducted employee name separately (FK constraint name unreliable)
          let deducted_employee = null;
          if (data.deducted_employee_id) {
            const { data: emp } = await supabase
              .from("profiles").select("full_name").eq("id", data.deducted_employee_id).single();
            deducted_employee = emp ?? null;
          }
          setRequests((prev) => [{ ...data, deducted_employee }, ...prev]);
        }
      )
      .subscribe();

    return () => { supabase.removeChannel(channel); };
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  function removeRequest(id: string) {
    setRequests((prev) => prev.filter((r) => r.id !== id));
  }

  if (loading) {
    return (
      <div className="space-y-4">
        {[1, 2, 3].map((i) => (
          <div key={i} className="rounded-xl border bg-white p-4 space-y-3">
            <Skeleton className="h-5 w-2/3" />
            <Skeleton className="h-3 w-1/3" />
            <Skeleton className="h-16 w-full" />
            <div className="flex gap-2">
              <Skeleton className="h-10 flex-1" />
              <Skeleton className="h-10 flex-1" />
            </div>
          </div>
        ))}
      </div>
    );
  }

  if (requests.length === 0) {
    return (
      <EmptyState
        icon={ClipboardList}
        title="Все заявки обработаны"
        description="Новые заявки появятся здесь автоматически"
      />
    );
  }

  return (
    <div className="space-y-4">
      {requests.map((req, i) => (
        <RequestCard
          key={req.id}
          request={req}
          index={i}
          onUpdate={() => removeRequest(req.id)}
        />
      ))}
    </div>
  );
}