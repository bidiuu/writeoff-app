import { NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";
import { createAdminClient } from "@/lib/supabase/admin";

export async function GET() {
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const { data: profile } = await supabase
    .from("profiles").select("role").eq("id", user.id).single();
  if (!profile || profile.role === "sender") {
    return NextResponse.json({ error: "Forbidden" }, { status: 403 });
  }

  const admin = createAdminClient();
  const { data, error } = await admin
    .from("writeoff_requests")
    .select("*, store:stores(name), author:profiles!writeoff_requests_author_id_fkey(full_name), deducted_employee:profiles!writeoff_requests_deducted_employee_id_fkey(full_name)")
    .order("created_at", { ascending: false });

  if (error) return NextResponse.json({ error: error.message }, { status: 500 });

  const rows = data ?? [];

  const STATUS_RU: Record<string, string> = {
    approved: "Одобрено",
    rejected: "Отклонено",
    pending: "На проверке",
  };

  const headers = [
    "Дата", "Точка", "Сотрудник", "Товар", "Кол-во", "Тип",
    "Удержание с", "Стоимость (₸)", "Статус", "Iiko акт", "Комментарий",
  ];

  function esc(s: string) {
    return `"${s.replace(/"/g, '""')}"`;
  }

  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const csvRows = rows.map((r: any) => [
    new Date(r.created_at).toLocaleString("ru-RU"),
    esc((r.store as any)?.name ?? ""),
    esc((r.author as any)?.full_name ?? ""),
    esc(r.product_name ?? ""),
    String(r.amount ?? ""),
    r.type === "with_deduction" ? "С удержанием" : "Без удержания",
    esc((r.deducted_employee as any)?.full_name ?? ""),
    String(r.estimated_cost ?? ""),
    STATUS_RU[r.status as string] ?? r.status,
    esc(r.iiko_doc_number ?? ""),
    esc(r.comment ?? ""),
  ].join(";"));

  const BOM = "﻿"; // UTF-8 BOM for correct Excel display
  const csv = BOM + [headers.join(";"), ...csvRows].join("\r\n");
  const date = new Date().toISOString().slice(0, 10);

  return new NextResponse(csv, {
    headers: {
      "Content-Type": "text/csv; charset=utf-8",
      "Content-Disposition": `attachment; filename="bahandi-writeoffs-${date}.csv"`,
    },
  });
}