"use client";

import { useState } from "react";
import { createClient } from "@/lib/supabase/client";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { User } from "lucide-react";

interface Employee { id: string; full_name: string | null }

interface DeductionRow {
  id: string;
  product_name: string;
  amount: number;
  estimated_cost: number | null;
  created_at: string;
}

interface Props { employees: Employee[] }

const fmtKZT = (n: number) =>
  new Intl.NumberFormat("ru-RU", { style: "currency", currency: "KZT", maximumFractionDigits: 0 }).format(n);

export function EmployeeFilter({ employees }: Props) {
  const [selectedId, setSelectedId] = useState("");
  const [loading, setLoading]       = useState(false);
  const [result, setResult]         = useState<{
    totalCost: number;
    count: number;
    recent: DeductionRow[];
  } | null>(null);

  const supabase = createClient();

  async function handleSelect(id: string | null) {
    if (!id) { setSelectedId(""); setResult(null); return; }
    setSelectedId(id);
    setLoading(true);
    try {
      const since30 = new Date(Date.now() - 30 * 24 * 60 * 60 * 1000).toISOString();
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      const { data, error } = await (supabase as any)
        .from("writeoff_requests")
        .select("id, product_name, amount, estimated_cost, created_at")
        .eq("deducted_employee_id", id)
        .eq("type", "with_deduction")
        .eq("status", "approved")
        .gte("created_at", since30)
        .order("created_at", { ascending: false });

      if (error) {
        console.error("[EmployeeFilter] query error:", error.code, error.message);
        setResult({ totalCost: 0, count: 0, recent: [] });
        return;
      }

      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      const rows: DeductionRow[] = (data ?? []).map((r: any) => ({
        id:             r.id,
        product_name:   r.product_name,
        amount:         Number(r.amount),
        estimated_cost: r.estimated_cost != null ? Number(r.estimated_cost) : null,
        created_at:     r.created_at,
      }));

      const totalCost = rows.reduce((s, r) => s + (r.estimated_cost ?? 0), 0);
      setResult({ totalCost, count: rows.length, recent: rows.slice(0, 5) });
    } catch (err) {
      console.error("[EmployeeFilter] unexpected error:", err);
      setResult({ totalCost: 0, count: 0, recent: [] });
    } finally {
      setLoading(false);
    }
  }

  const empName = employees.find((e) => e.id === selectedId)?.full_name ?? "";

  return (
    <div className="space-y-3">
      <Card>
        <CardHeader className="pb-2 pt-4 px-4">
          <CardTitle className="text-sm text-slate-700 flex items-center gap-2">
            <User size={14} />
            Аналитика по сотруднику
          </CardTitle>
        </CardHeader>
        <CardContent className="px-4 pb-4">
          <Select value={selectedId || undefined} onValueChange={handleSelect}>
            <SelectTrigger className="text-sm">
              <SelectValue placeholder="Выбрать сотрудника..." />
            </SelectTrigger>
            <SelectContent>
              {employees.length === 0 ? (
                <div className="px-3 py-4 text-center text-xs text-muted-foreground">Нет сотрудников</div>
              ) : (
                employees.map((e) => (
                  <SelectItem key={e.id} value={e.id}>{e.full_name ?? e.id}</SelectItem>
                ))
              )}
            </SelectContent>
          </Select>
        </CardContent>
      </Card>

      {loading && (
        <p className="text-xs text-slate-400 text-center py-2 animate-pulse">Загрузка...</p>
      )}

      {result && !loading && (
        <Card className="animate-in fade-in-0 slide-in-from-bottom-2 duration-300">
          <CardHeader className="pb-2 pt-4 px-4">
            <CardTitle className="text-sm text-slate-700">{empName} — 30 дней</CardTitle>
          </CardHeader>
          <CardContent className="px-4 pb-4 space-y-3">
            <div className="grid grid-cols-2 gap-3">
              <div className="rounded-xl bg-red-50 p-3">
                <p className="text-xs text-slate-500 mb-0.5">Сумма удержаний</p>
                <p className="text-xl font-bold text-red-600">{fmtKZT(result.totalCost)}</p>
                <p className="text-xs text-slate-400 mt-0.5">по оценённым</p>
              </div>
              <div className="rounded-xl bg-slate-50 p-3">
                <p className="text-xs text-slate-500 mb-0.5">Случаев</p>
                <p className="text-xl font-bold text-slate-800">{result.count}</p>
                <p className="text-xs text-slate-400 mt-0.5">одобренных</p>
              </div>
            </div>

            {result.recent.length > 0 ? (
              <div className="space-y-0">
                <p className="text-xs font-medium text-slate-400 mb-1.5">Последние заявки</p>
                {result.recent.map((r) => (
                  <div
                    key={r.id}
                    className="flex items-center justify-between py-2 border-b border-slate-100 last:border-0"
                  >
                    <div className="min-w-0 flex-1">
                      <p className="text-sm text-slate-700 truncate">{r.product_name}</p>
                      <p className="text-xs text-slate-400">
                        {new Date(r.created_at).toLocaleDateString("ru-RU", { day: "2-digit", month: "2-digit" })}
                        {r.estimated_cost != null
                          ? ` · ${fmtKZT(r.estimated_cost)}`
                          : " · без оценки"}
                      </p>
                    </div>
                    <span className="text-xs text-slate-400 ml-3 shrink-0">{r.amount} ед.</span>
                  </div>
                ))}
              </div>
            ) : (
              <p className="text-xs text-slate-400 text-center py-2">
                Нет одобренных удержаний за период
              </p>
            )}
          </CardContent>
        </Card>
      )}
    </div>
  );
}