import { redirect } from "next/navigation";
import { createClient } from "@/lib/supabase/server";
import { SummaryCards } from "@/components/dashboard/summary-cards";
import { TopChart } from "@/components/dashboard/top-chart";
import { TrendChart } from "@/components/dashboard/trend-chart";
import { ShiftChart } from "@/components/dashboard/shift-chart";
import { EmployeeFilter } from "@/components/dashboard/employee-filter";
import { Download, Clock, ShieldAlert } from "lucide-react";

async function getAnalyticsData() {
  const supabase = await createClient();

  const since30 = new Date(Date.now() - 30 * 24 * 60 * 60 * 1000).toISOString();
  const since14 = new Date(Date.now() - 14 * 24 * 60 * 60 * 1000).toISOString();

  const [approved, pending, allRecent, allProfiles] = await Promise.all([
    supabase
      .from("writeoff_requests")
      .select("amount, estimated_cost, type, store_id, deducted_employee_id, created_at, store:stores(name)")
      .eq("status", "approved")
      .gte("created_at", since30),
    supabase
      .from("writeoff_requests")
      .select("id", { count: "exact", head: true })
      .eq("status", "pending"),
    supabase
      .from("writeoff_requests")
      .select("amount, created_at")
      .eq("status", "approved")
      .gte("created_at", since14)
      .order("created_at"),
    supabase
      .from("profiles")
      .select("id, full_name"),
  ]);

  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const rows: any[] = (approved as any).data ?? [];
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const profileMap = new Map<string, string>(((allProfiles as any).data ?? []).map((p: any) => [p.id, p.full_name]));

  // Summary
  const estimatedCost = rows
    .filter((r) => r.estimated_cost != null)
    .reduce((s, r) => s + Number(r.estimated_cost), 0);
  const withDeductionCost = rows
    .filter((r) => r.type === "with_deduction" && r.estimated_cost != null)
    .reduce((s, r) => s + Number(r.estimated_cost), 0);
  const uncostedCount = rows.filter((r) => r.estimated_cost == null).length;

  // Top stores
  const storeMap = new Map<string, { name: string; amount: number; count: number }>();
  for (const r of rows) {
    const name = (r.store as unknown as { name: string } | null)?.name ?? r.store_id;
    const cur = storeMap.get(r.store_id) ?? { name, amount: 0, count: 0 };
    storeMap.set(r.store_id, {
      name,
      amount: cur.amount + (r.estimated_cost != null ? Number(r.estimated_cost) : 0),
      count: cur.count + 1,
    });
  }
  const topStores = [...storeMap.values()].sort((a, b) => b.amount - a.amount).slice(0, 5);

  // Top employees with deductions
  const empMap = new Map<string, { name: string; amount: number; count: number }>();
  for (const r of rows.filter((r) => r.type === "with_deduction" && r.deducted_employee_id)) {
    const empId = r.deducted_employee_id!;
    const name = profileMap.get(empId) ?? empId;
    const cur = empMap.get(empId) ?? { name, amount: 0, count: 0 };
    empMap.set(empId, {
      name,
      amount: cur.amount + (r.estimated_cost != null ? Number(r.estimated_cost) : 0),
      count: cur.count + 1,
    });
  }
  const topEmployees = [...empMap.values()].sort((a, b) => b.amount - a.amount).slice(0, 5);

  // Daily trend (last 14 days)
  const dayMap = new Map<string, { amount: number; count: number }>();
  for (let i = 13; i >= 0; i--) {
    const d = new Date(Date.now() - i * 24 * 60 * 60 * 1000);
    const key = d.toLocaleDateString("ru-RU", { day: "2-digit", month: "2-digit" });
    dayMap.set(key, { amount: 0, count: 0 });
  }
  for (const r of allRecent.data ?? []) {
    const key = new Date(r.created_at).toLocaleDateString("ru-RU", { day: "2-digit", month: "2-digit" });
    const cur = dayMap.get(key);
    if (cur) dayMap.set(key, { amount: cur.amount + Number(r.amount), count: cur.count + 1 });
  }
  const dailyTrend = [...dayMap.entries()].map(([date, v]) => ({ date, ...v }));

  // Shift breakdown (утро/день/вечер/ночь)
  const shifts = [
    { name: "morning", label: "Утро",   range: "06-12", amount: 0, count: 0 },
    { name: "day",     label: "День",   range: "12-18", amount: 0, count: 0 },
    { name: "evening", label: "Вечер",  range: "18-00", amount: 0, count: 0 },
    { name: "night",   label: "Ночь",   range: "00-06", amount: 0, count: 0 },
  ];
  for (const r of rows) {
    const h = new Date(r.created_at).getHours();
    const idx = h >= 6 && h < 12 ? 0 : h >= 12 && h < 18 ? 1 : h >= 18 ? 2 : 3;
    shifts[idx].amount += r.estimated_cost != null ? Number(r.estimated_cost) : 0;
    shifts[idx].count += 1;
  }
  const shiftData = shifts.map((s) => ({ name: s.name, label: `${s.label} ${s.range}`, amount: s.amount, count: s.count }));

  return {
    summary: {
      estimatedCost,
      withDeductionCost,
      uncostedCount,
      totalCount: rows.length,
      pendingCount: pending.count ?? 0,
      approvedCount: rows.length,
    },
    topStores,
    topEmployees,
    dailyTrend,
    shiftData,
  };
}

export default async function AnalyticsPage() {
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) redirect("/login");

  const { data: profile } = await supabase
    .from("profiles").select("role").eq("id", user.id).single();
  if (profile?.role === "sender") redirect("/dashboard");

  const { summary, topStores, topEmployees, dailyTrend, shiftData } = await getAnalyticsData();

  const { data: senders } = await supabase
    .from("profiles")
    .select("id, full_name")
    .eq("role", "sender")
    .order("full_name");

  const { data: fraudAttempts } = await supabase
    .from("audit_log")
    .select("id, ts, payload")
    .eq("action", "duplicate_photo_attempt")
    .order("ts", { ascending: false })
    .limit(5);

  const savings3pct = summary.estimatedCost * 0.03;
  const savings5pct = summary.estimatedCost * 0.05;
  const fmt = (n: number) =>
    new Intl.NumberFormat("ru-RU", { style: "currency", currency: "KZT", maximumFractionDigits: 0 }).format(n);

  return (
    <div className="p-4 max-w-lg mx-auto space-y-5">
      <div className="flex items-center justify-between pt-2">
        <div>
          <h1 className="text-xl font-bold text-foreground">Аналитика</h1>
          <p className="text-xs text-muted-foreground">Последние 30 дней</p>
        </div>
        <a
          href="/api/analytics/export"
          className="inline-flex items-center gap-1.5 text-xs font-medium text-primary border border-primary/30 rounded-xl px-3 py-2 hover:bg-primary/5 transition-colors active:scale-95 duration-150"
        >
          <Download size={13} strokeWidth={2} />
          Экспорт CSV
        </a>
      </div>

      <SummaryCards {...summary} />

      {/* Time savings card — static, for presentation */}
      <div className="rounded-2xl bg-white border border-border p-4 shadow-[0_1px_4px_oklch(0.16_0.02_35_/_6%)]">
        <div className="flex items-center gap-1.5 mb-3">
          <Clock size={13} strokeWidth={2} className="text-primary" />
          <p className="text-xs font-semibold uppercase tracking-wide text-muted-foreground">Время на обработку</p>
        </div>
        <div className="flex items-center gap-4">
          <div className="text-center">
            <p className="text-2xl font-extrabold text-muted-foreground/40 line-through">~15 мин</p>
            <p className="text-[10px] text-muted-foreground mt-0.5">вручную</p>
          </div>
          <div className="text-lg font-bold text-muted-foreground">→</div>
          <div className="text-center">
            <p className="text-2xl font-extrabold text-green-600">~2 мин</p>
            <p className="text-[10px] text-muted-foreground mt-0.5">с системой</p>
          </div>
          <div className="ml-auto">
            <span className="inline-block rounded-full bg-green-100 px-3 py-1 text-sm font-bold text-green-700">−87%</span>
          </div>
        </div>
      </div>

      {/* ROI banner */}
      <div className="rounded-2xl bg-gradient-to-br from-[#1C1009] to-[#3D1F0A] text-white p-4 shadow-[0_4px_16px_oklch(0.16_0.02_35_/_20%)]">
        <p className="text-xs font-medium opacity-70 mb-1 uppercase tracking-wide">Потенциальная экономия</p>
        <p className="text-2xl font-extrabold">{fmt(savings3pct)} — {fmt(savings5pct)}</p>
        <p className="text-xs opacity-50 mt-1">Снижение потерь на 3–5% (бенчмарк MarketMan)</p>
      </div>

      <TrendChart data={dailyTrend} />

      <ShiftChart data={shiftData} />

      <TopChart title="Топ точек по списаниям" data={topStores} />

      {topEmployees.length > 0 && (
        <TopChart
          title="Топ сотрудников (удержания)"
          data={topEmployees}
          color="#ef4444"
        />
      )}

      <EmployeeFilter employees={senders ?? []} />

      {/* Fraud attempts section — visible only when there are incidents */}
      <div className="rounded-2xl bg-white border border-border p-4 shadow-[0_1px_4px_oklch(0.16_0.02_35_/_6%)]">
        <div className="flex items-center gap-1.5 mb-3">
          <ShieldAlert size={13} strokeWidth={2} className="text-orange-500" />
          <p className="text-xs font-semibold uppercase tracking-wide text-muted-foreground">
            Попытки мошенничества
          </p>
          {fraudAttempts && fraudAttempts.length > 0 && (
            <span className="ml-auto inline-flex items-center justify-center rounded-full bg-orange-100 text-orange-700 text-[10px] font-bold px-2 py-0.5">
              {fraudAttempts.length}
            </span>
          )}
        </div>
        {!fraudAttempts || fraudAttempts.length === 0 ? (
          <p className="text-sm text-muted-foreground">Попыток повторного использования фото не зафиксировано</p>
        ) : (
          <ul className="space-y-2">
            {fraudAttempts.map((entry) => {
              // eslint-disable-next-line @typescript-eslint/no-explicit-any
              const p = entry.payload as any;
              const attemptDate = new Date(entry.ts).toLocaleString("ru-RU", {
                day: "2-digit", month: "2-digit", year: "numeric",
                hour: "2-digit", minute: "2-digit",
              });
              const origDate = p?.original_created_at
                ? new Date(p.original_created_at).toLocaleDateString("ru-RU", {
                    day: "2-digit", month: "2-digit", year: "numeric",
                  })
                : "неизвестно";
              return (
                <li key={entry.id} className="rounded-xl bg-orange-50 border border-orange-100 px-3 py-2 text-sm">
                  <p className="font-semibold text-orange-800">{p?.attacker_name ?? "Неизвестный"}</p>
                  <p className="text-xs text-orange-700 mt-0.5">
                    Попытка: {attemptDate}
                  </p>
                  <p className="text-xs text-orange-600 mt-0.5">
                    Фото из заявки от {origDate} ({p?.original_author ?? "другой пользователь"})
                  </p>
                </li>
              );
            })}
          </ul>
        )}
      </div>

      <div className="text-xs text-muted-foreground text-center pb-2">
        Данные обновляются в реальном времени
      </div>
    </div>
  );
}