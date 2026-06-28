import { NextResponse, type NextRequest } from "next/server";
import { createClient } from "@/lib/supabase/server";
import { createAdminClient } from "@/lib/supabase/admin";

export async function POST(
  _request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const { id } = await params;

  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const { data: profile } = await supabase
    .from("profiles").select("role").eq("id", user.id).single();
  if (!profile || profile.role === "sender") {
    return NextResponse.json({ error: "Forbidden" }, { status: 403 });
  }

  // Admin only for cross-user SELECT
  const admin = createAdminClient();
  const { data: req, error: fetchError } = await admin
    .from("writeoff_requests")
    .select("id, author_id, status")
    .eq("id", id)
    .eq("status", "pending")
    .single();

  if (fetchError) console.error("[reject] fetch:", fetchError.message, fetchError.code);
  if (!req) return NextResponse.json({ error: "Not found or already reviewed" }, { status: 404 });
  if (req.author_id === user.id) return NextResponse.json({ error: "Cannot reject own request" }, { status: 403 });

  // User session client: RLS WITH CHECK (migration 005) allows status='rejected', reviewed_by=auth.uid()
  const { error: updateError } = await supabase
    .from("writeoff_requests")
    .update({ status: "rejected", reviewed_by: user.id, reviewed_at: new Date().toISOString() })
    .eq("id", id);

  if (updateError) {
    console.error("[reject] UPDATE — msg:", updateError.message, "| code:", updateError.code, "| hint:", updateError.hint, "| details:", updateError.details);
    return NextResponse.json({ error: updateError.message }, { status: 500 });
  }

  // audit_log INSERT via user session (policy audit_insert_reviewer: actor_id = auth.uid() + reviewer role)
  const { error: auditError } = await supabase
    .from("audit_log")
    .insert({ request_id: id, actor_id: user.id, action: "rejected", payload: {} });
  if (auditError) console.error("[reject] audit (non-fatal):", auditError.message, auditError.code);

  return NextResponse.json({ ok: true });
}