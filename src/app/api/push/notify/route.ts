import { NextResponse, type NextRequest } from "next/server";
import { createAdminClient } from "@/lib/supabase/admin";

export interface NotifyPayload {
  userIds: string[];
  title: string;
  body: string;
  url?: string;
}

export async function POST(request: NextRequest) {
  const authHeader = request.headers.get("x-internal-secret");
  if (!authHeader || authHeader !== process.env.INTERNAL_PUSH_SECRET) {
    return NextResponse.json({ error: "Forbidden" }, { status: 403 });
  }

  const webpush = (await import("web-push")).default;
  webpush.setVapidDetails(
    process.env.VAPID_SUBJECT!,
    process.env.NEXT_PUBLIC_VAPID_PUBLIC_KEY!,
    process.env.VAPID_PRIVATE_KEY!
  );

  const payload: NotifyPayload = await request.json();
  const admin = createAdminClient();

  const { data: subs } = await admin
    .from("push_subscriptions")
    .select("endpoint, p256dh, auth")
    .in("user_id", payload.userIds);

  if (!subs?.length) return NextResponse.json({ ok: true, sent: 0 });

  const message = JSON.stringify({ title: payload.title, body: payload.body, url: payload.url });
  let sent = 0;
  const staleEndpoints: string[] = [];

  await Promise.allSettled(
    subs.map(async (sub) => {
      try {
        await webpush.sendNotification(
          { endpoint: sub.endpoint, keys: { p256dh: sub.p256dh, auth: sub.auth } },
          message
        );
        sent++;
      } catch (err) {
        if ((err as { statusCode?: number }).statusCode === 410) {
          staleEndpoints.push(sub.endpoint);
        }
      }
    })
  );

  if (staleEndpoints.length) {
    await admin.from("push_subscriptions").delete().in("endpoint", staleEndpoints);
  }

  return NextResponse.json({ ok: true, sent });
}