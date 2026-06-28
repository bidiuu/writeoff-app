import { getDB, type OfflineRequest } from "./db";

export async function enqueueRequest(
  data: Omit<OfflineRequest, "id" | "created_at" | "retry_count">
): Promise<string> {
  const db = await getDB();
  const id = crypto.randomUUID();
  await db.add("offline_requests", {
    ...data,
    id,
    created_at: new Date().toISOString(),
    retry_count: 0,
  });
  // Register Background Sync if supported
  if ("serviceWorker" in navigator && "SyncManager" in window) {
    const reg = await navigator.serviceWorker.ready;
    await (reg as ServiceWorkerRegistration & { sync: { register(tag: string): Promise<void> } })
      .sync.register("offline-requests");
  }
  return id;
}

export async function getPendingRequests(): Promise<OfflineRequest[]> {
  const db = await getDB();
  return db.getAllFromIndex("offline_requests", "by_created");
}

export async function removeRequest(id: string): Promise<void> {
  const db = await getDB();
  await db.delete("offline_requests", id);
}

export async function incrementRetry(id: string): Promise<void> {
  const db = await getDB();
  const item = await db.get("offline_requests", id);
  if (item) {
    await db.put("offline_requests", { ...item, retry_count: item.retry_count + 1 });
  }
}

export async function processQueue(): Promise<{ sent: number; failed: number }> {
  const pending = await getPendingRequests();
  let sent = 0;
  let failed = 0;

  for (const req of pending) {
    try {
      // Re-upload photo from blob
      const { createClient } = await import("@/lib/supabase/client");
      const supabase = createClient();
      const { error: uploadErr } = await supabase.storage
        .from("writeoff-photos")
        .upload(req.photo_path, req.photo_blob, { contentType: "image/jpeg", upsert: false });
      if (uploadErr && uploadErr.message !== "The resource already exists") throw uploadErr;

      const res = await fetch("/api/requests", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          store_id: req.store_id,
          type: req.type,
          deducted_employee_id: req.deducted_employee_id,
          product_name: req.product_name,
          amount: req.amount,
          comment: req.comment,
          photo_path: req.photo_path,
          category: req.category,
          has_camera_exif: req.has_camera_exif,
          estimated_cost: req.estimated_cost,
        }),
      });
      if (!res.ok) throw new Error(await res.text());

      await removeRequest(req.id);
      sent++;
    } catch {
      await incrementRetry(req.id);
      failed++;
    }
  }
  return { sent, failed };
}