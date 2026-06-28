import { createClient } from "@/lib/supabase/server";
import { redirect } from "next/navigation";
import { EmptyState } from "@/components/empty-state";
import Link from "next/link";
import { ClipboardList, FileCheck } from "lucide-react";
import { cn } from "@/lib/utils";

const STATUS_MAP: Record<string, { label: string; cls: string }> = {
  pending:  { label: "На проверке", cls: "bg-amber-100 text-amber-700" },
  approved: { label: "Одобрена",    cls: "bg-green-100 text-green-700" },
  rejected: { label: "Отклонена",   cls: "bg-red-100 text-red-700"    },
};

export default async function MyRequestsPage({
  searchParams,
}: {
  searchParams: Promise<{ view?: string }>;
}) {
  const { view = "my" } = await searchParams;
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) redirect("/login");

  const { data: profile } = await supabase
    .from("profiles").select("role").eq("id", user.id).single();
  if (!profile || profile.role !== "sender") redirect("/dashboard");

  const since30 = new Date(Date.now() - 30 * 24 * 60 * 60 * 1000).toISOString();

  const [{ data: myReqs }, { data: deductionsRaw }] = await Promise.all([
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    (supabase as any)
      .from("writeoff_requests")
      .select("id, product_name, amount, type, status, created_at, iiko_doc_number, iiko_status, store:stores(name)")
      .eq("author_id", user.id)
      .order("created_at", { ascending: false }),
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    (supabase as any)
      .from("writeoff_requests")
      .select("id, product_name, amount, type, status, created_at, estimated_cost, store:stores(name), author:profiles!writeoff_requests_author_id_fkey(full_name)")
      .eq("deducted_employee_id", user.id)
      .order("created_at", { ascending: false }),
  ]);

  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const deductions: any[] = deductionsRaw ?? [];
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const all: any[] = myReqs ?? [];

  const statApproved = all.filter((r) => r.status === "approved").length;
  const statRejected = all.filter((r) => r.status === "rejected").length;
  const statPending  = all.filter((r) => r.status === "pending").length;

  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const deductionSum = deductions
    .filter((r: any) => r.status === "approved" && r.type === "with_deduction" && r.created_at >= since30)
    .reduce((s: number, r: any) => s + (r.estimated_cost ? Number(r.estimated_cost) : 0), 0);

  const fmtKZT = (n: number) =>
    new Intl.NumberFormat("ru-RU", { style: "currency", currency: "KZT", maximumFractionDigits: 0 }).format(n);

  const isDeductions = view === "deductions";
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const rows: any[] = isDeductions ? deductions : all;

  return (
    <div className="p-4 space-y-4 max-w-lg mx-auto pb-24">
      <h1 className="text-xl font-bold text-foreground pt-2 animate-in fade-in-0 slide-in-from-bottom-2 duration-300">
        История заявок
      </h1>

      {/* Personal stats card */}
      <div className="rounded-2xl bg-white border border-border p-4 shadow-[0_1px_4px_oklch(0.16_0.02_35_/_6%)] animate-in fade-in-0 slide-in-from-bottom-2 duration-300">
        <p className="text-xs font-medium text-muted-foreground uppercase tracking-wide mb-3">Моя статистика</p>
        <div className="grid grid-cols-4 gap-2 text-center">
          <div className="rounded-xl bg-muted/60 p-2.5">
            <p className="text-lg font-bold text-foreground">{all.length}</p>
            <p className="text-[10px] text-muted-foreground leading-tight mt-0.5">Всего</p>
          </div>
          <div className="rounded-xl bg-green-50 p-2.5">
            <p className="text-lg font-bold text-green-700">{statApproved}</p>
            <p className="text-[10px] text-green-600 leading-tight mt-0.5">Одобрено</p>
          </div>
          <div className="rounded-xl bg-amber-50 p-2.5">
            <p className="text-lg font-bold text-amber-700">{statPending}</p>
            <p className="text-[10px] text-amber-600 leading-tight mt-0.5">На проверке</p>
          </div>
          <div className="rounded-xl bg-red-50 p-2.5">
            <p className="text-lg font-bold text-red-700">{statRejected}</p>
            <p className="text-[10px] text-red-600 leading-tight mt-0.5">Отклонено</p>
          </div>
        </div>
        {deductionSum > 0 && (
          <div className="mt-3 rounded-xl bg-red-50 border border-red-100 p-3 flex items-center justify-between">
            <div>
              <p className="text-xs font-medium text-red-700">Удержания с меня (30 дней)</p>
              <p className="text-xs text-red-400 mt-0.5">Одобренные заявки с удержанием</p>
            </div>
            <p className="text-lg font-bold text-red-700">{fmtKZT(deductionSum)}</p>
          </div>
        )}
      </div>

      {/* Tabs */}
      <div className="flex rounded-xl overflow-hidden border border-border">
        <Link
          href="/requests/my?view=my"
          className={cn(
            "flex-1 text-center py-2.5 text-sm font-medium transition-colors",
            !isDeductions ? "bg-primary text-white" : "text-muted-foreground hover:bg-muted/40"
          )}
        >
          Мои заявки{all.length > 0 ? ` (${all.length})` : ""}
        </Link>
        <Link
          href="/requests/my?view=deductions"
          className={cn(
            "flex-1 text-center py-2.5 text-sm font-medium transition-colors",
            isDeductions ? "bg-primary text-white" : "text-muted-foreground hover:bg-muted/40"
          )}
        >
          Удержания{deductions.length > 0 ? ` (${deductions.length})` : ""}
        </Link>
      </div>

      {rows.length === 0 ? (
        <EmptyState
          icon={ClipboardList}
          title={isDeductions ? "Нет удержаний" : "Нет заявок"}
          description={
            isDeductions
              ? "Заявки с удержанием с вас появятся здесь"
              : "Создайте первую заявку на списание"
          }
        />
      ) : (
        <div className="space-y-3">
          {rows.map((r, idx) => {
            const s = STATUS_MAP[r.status as string] ?? STATUS_MAP["pending"];
            return (
              <div
                key={r.id}
                className="bg-white rounded-2xl border border-border shadow-[0_1px_4px_oklch(0.16_0.02_35_/_6%)] overflow-hidden animate-in fade-in-0 slide-in-from-bottom-3 duration-300 fill-mode-both"
                style={{ animationDelay: `${idx * 60}ms` }}
              >
                <div className="px-4 pt-3 pb-2 flex flex-row items-start justify-between gap-2">
                  <div className="flex-1 min-w-0">
                    <p className="font-semibold text-foreground leading-tight truncate">{r.product_name}</p>
                    <p className="text-xs text-muted-foreground mt-0.5">
                      {r.store?.name} · {new Date(r.created_at).toLocaleString("ru-RU", {
                        day: "2-digit", month: "2-digit", hour: "2-digit", minute: "2-digit",
                      })}
                    </p>
                    {isDeductions && r.author?.full_name && (
                      <p className="text-xs text-red-500 mt-0.5">Создал: {r.author.full_name}</p>
                    )}
                  </div>
                  <span className={cn("text-xs font-medium px-2.5 py-1 rounded-full whitespace-nowrap shrink-0", s.cls)}>
                    {s.label}
                  </span>
                </div>

                <div className="px-4 pb-3">
                  <div className="grid grid-cols-2 gap-2 text-sm">
                    <div className="rounded-xl bg-muted/50 px-3 py-2">
                      <p className="text-xs text-muted-foreground">Количество</p>
                      <p className="font-medium">{r.amount}</p>
                    </div>
                    <div className="rounded-xl bg-muted/50 px-3 py-2">
                      <p className="text-xs text-muted-foreground">Тип</p>
                      <p className="font-medium text-xs leading-tight">
                        {r.type === "with_deduction" ? "С удержанием" : "Без удержания"}
                      </p>
                    </div>
                  </div>

                  {/* Iiko badge for approved */}
                  {r.status === "approved" && r.iiko_doc_number && (
                    <div className="mt-2 inline-flex items-center gap-1.5 text-xs font-medium text-blue-700 bg-blue-50 border border-blue-100 rounded-full px-2.5 py-1">
                      <FileCheck size={11} strokeWidth={2} />
                      Iiko акт #{r.iiko_doc_number}
                    </div>
                  )}
                </div>
              </div>
            );
          })}
        </div>
      )}
    </div>
  );
}