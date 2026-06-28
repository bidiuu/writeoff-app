import { NextResponse, type NextRequest } from "next/server";
import { z } from "zod";
import { createClient } from "@/lib/supabase/server";
import { createAdminClient } from "@/lib/supabase/admin";
import { notifyUsers } from "@/lib/push";

const createSchema = z.object({
  store_id: z.string().uuid(),
  type: z.enum(["with_deduction", "without_deduction"]),
  deducted_employee_id: z.string().uuid().nullable().optional(),
  product_name: z.string().min(1).max(200),
  amount: z.number().positive(),
  comment: z.string().min(10).max(1000),
  photo_path: z.string().min(1),
  category: z.enum(["food", "equipment", "supplies", "other"]).optional(),
  has_camera_exif: z.boolean().nullable().optional(),
  estimated_cost: z.number().positive().nullable().optional(),
  photo_hash: z.string().length(64).optional(),
});

export async function POST(request: NextRequest) {
  const supabase = await createClient();
  const { data: { user }, error: authError } = await supabase.auth.getUser();

  console.log("[DEBUG] auth.getUser() result — user.id:", user?.id ?? "NULL", "authError:", authError?.message ?? "none");

  if (!user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const { data: profile } = await supabase
    .from("profiles").select("role, full_name, store_id").eq("id", user.id).single();

  console.log("[DEBUG] profile:", JSON.stringify(profile));

  if (!profile || profile.role === "reviewer") {
    return NextResponse.json({ error: "Forbidden" }, { status: 403 });
  }

  const body = await request.json().catch(() => null);
  const parsed = createSchema.safeParse(body);
  if (!parsed.success) {
    return NextResponse.json({ error: parsed.error.flatten() }, { status: 400 });
  }

  const data = parsed.data;

  if (profile.role === "sender" && profile.store_id && data.store_id !== profile.store_id) {
    return NextResponse.json({ error: "Forbidden: store mismatch" }, { status: 403 });
  }

  if (data.photo_hash) {
    const { data: existing } = await supabase
      .from("writeoff_requests")
      .select("id")
      .eq("photo_hash", data.photo_hash)
      .limit(1)
      .maybeSingle();
    if (existing) {
      // Remove the already-uploaded photo to avoid orphaned storage files
      await supabase.storage.from("writeoff-photos").remove([data.photo_path]);
      return NextResponse.json(
        { error: "Это фото уже использовалось в предыдущей заявке. Загрузите новое фото." },
        { status: 409 }
      );
    }
  }

  const insertPayload = {
    store_id: data.store_id,
    author_id: user.id,
    type: data.type,
    deducted_employee_id: data.deducted_employee_id ?? null,
    product_name: data.product_name,
    amount: data.amount,
    comment: data.comment,
    photo_path: data.photo_path,
    status: "pending" as const,
    category: data.category ?? null,
    has_camera_exif: data.has_camera_exif ?? null,
    estimated_cost: data.estimated_cost ?? null,
    photo_hash: data.photo_hash ?? null,
    is_duplicate_photo: false,
  };

  console.log("[DEBUG] auth.uid() from session:", user.id);
  console.log("[DEBUG] author_id being inserted:", insertPayload.author_id);
  console.log("[DEBUG] full insert payload:", JSON.stringify(insertPayload));

  const { data: req, error } = await supabase
    .from("writeoff_requests")
    .insert(insertPayload as any)
    .select()
    .single();

  if (error) {
    console.error("[requests/POST] INSERT error — message:", error.message, "| code:", error.code, "| details:", error.details, "| hint:", error.hint);
    return NextResponse.json({ error: error.message }, { status: 500 });
  }

  // Find reviewers to notify: profiles_select_reviewers_pub policy (migration 005)
  // allows any authenticated user to read reviewer/admin profile IDs
  const { data: reviewers } = await supabase
    .from("profiles")
    .select("id")
    .in("role", ["reviewer", "admin"]);

  if (reviewers?.length) {
    // Admin client for reading push subscriptions across users (push_subs_own policy)
    // If push notifications fail silently it's acceptable — core flow succeeds
    const admin = createAdminClient();
    void notifyUsers({
      userIds: reviewers.map((r) => r.id),
      title: "Новая заявка на списание",
      body: `${profile.full_name}: ${data.product_name} (${data.amount} ед.)`,
      url: "/requests/review",
    }).catch((err) => console.error("[requests/POST] notify (non-fatal):", err));
    void admin; // admin kept for push subscription cross-user read inside notifyUsers
  }

  return NextResponse.json(req, { status: 201 });
}

export async function GET() {
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const { data: profile } = await supabase
    .from("profiles").select("role").eq("id", user.id).single();

  let query = supabase
    .from("writeoff_requests")
    .select("*, store:stores(name), author:profiles!writeoff_requests_author_id_fkey(full_name)")
    .order("created_at", { ascending: false });

  if (profile?.role === "sender") {
    query = query.eq("author_id", user.id);
  } else {
    query = query.eq("status", "pending");
  }

  const { data, error } = await query;
  if (error) return NextResponse.json({ error: error.message }, { status: 500 });
  return NextResponse.json(data);
}