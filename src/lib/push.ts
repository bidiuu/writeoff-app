import type { NotifyPayload } from "@/app/api/push/notify/route";

export async function notifyUsers(payload: NotifyPayload): Promise<void> {
  try {
    const baseUrl = process.env.VERCEL_URL
      ? `https://${process.env.VERCEL_URL}`
      : "http://localhost:3000";

    await fetch(`${baseUrl}/api/push/notify`, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        "x-internal-secret": process.env.INTERNAL_PUSH_SECRET!,
      },
      body: JSON.stringify(payload),
    });
  } catch {
    // Push failure must never break the main flow
  }
}