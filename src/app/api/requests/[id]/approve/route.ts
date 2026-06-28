import { NextResponse, type NextRequest } from "next/server";
import { createClient } from "@/lib/supabase/server";
import { createAdminClient } from "@/lib/supabase/admin";
import { getIikoAdapter } from "@/lib/iiko";

export async function POST(
  _request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const { id } = await params;

  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const { data: profile } = await supabase
    .from("profiles").select("role, full_name").eq("id", user.id).single();
  if (!profile || profile.role === "sender") {
    return NextResponse.json({ error: "Forbidden" }, { status: 403 });
  }

  const admin = createAdminClient();
  const { data: req, error: fetchError } = await admin
    .from("writeoff_requests")
    .select("*, store:stores(name, iiko_store_id)")
    .eq("id", id)
    .eq("status", "pending")
    .single();

  if (fetchError) console.error("[approve] fetch:", fetchError.message, fetchError.code);
  if (!req) return NextResponse.json({ error: "Not found or already reviewed" }, { status: 404 });
  if (req.author_id === user.id) return NextResponse.json({ error: "Cannot approve own request" }, { status: 403 });

  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const store = req.store as any;

  // Iiko sync — best-effort, failure must NOT block approval
  let iikoDocNumber: string | null = null;
  let iikoStatus: "sent" | "failed" = "failed";
  let warning: string | null = null;

  try {
    const iiko = getIikoAdapter();
    const result = await iiko.createWriteoffAct({
      storeId: store?.iiko_store_id ?? req.store_id,
      accountId: "default-writeoff-account",
      comment: req.comment,
      items: [{ productId: req.product_name, productName: req.product_name, amount: req.amount, measureUnitId: "шт" }],
    });
    iikoDocNumber = result.documentNumber;
    iikoStatus = result.status === "created" ? "sent" : "failed";
  } catch (err) {
    console.error("[approve] iiko (non-fatal):", err instanceof Error ? err.message : err);
    warning = "Заявка одобрена, но синхронизация с Iiko не удалась — требуется ручная проверка";
  }

  const { error: updateError } = await supabase
    .from("writeoff_requests")
    .update({
      status: "approved",
      reviewed_by: user.id,
      reviewed_at: new Date().toISOString(),
      iiko_doc_number: iikoDocNumber,
      iiko_status: iikoStatus,
    })
    .eq("id", id);

  if (updateError) {
    console.error("[approve] UPDATE:", updateError.message, updateError.code);
    return NextResponse.json({ error: updateError.message }, { status: 500 });
  }

  const { error: auditError } = await supabase
    .from("audit_log")
    .insert({ request_id: id, actor_id: user.id, action: "approved", payload: { iiko_doc_number: iikoDocNumber, iiko_status: iikoStatus } });
  if (auditError) console.error("[approve] audit (non-fatal):", auditError.message, auditError.code);

  return NextResponse.json({ ok: true, iiko_doc_number: iikoDocNumber, iiko_status: iikoStatus, warning });
}