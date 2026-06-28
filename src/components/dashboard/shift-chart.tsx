"use client";

import { PieChart, Pie, Cell, Tooltip, ResponsiveContainer } from "recharts";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { BarChart2 } from "lucide-react";

interface ShiftData {
  name: string;
  label: string;
  amount: number;
  count: number;
}

interface ShiftChartProps {
  data: ShiftData[];
}

const SHIFT_COLORS = ["#E8651A", "#F59E0B", "#C04D0D", "#7A6A60"];

const ruFmt = new Intl.NumberFormat("ru-RU", { style: "currency", currency: "KZT", maximumFractionDigits: 0 });

export function ShiftChart({ data }: ShiftChartProps) {
  const total = data.reduce((s, d) => s + d.count, 0);
  if (total === 0) {
    return (
      <Card className="rounded-2xl shadow-[0_1px_4px_oklch(0.16_0.02_35_/_6%)]">
        <CardHeader className="pb-0 pt-4 px-4">
          <CardTitle className="text-sm font-semibold text-foreground">Списания по сменам</CardTitle>
        </CardHeader>
        <CardContent className="flex flex-col items-center justify-center py-8 gap-2 text-muted-foreground">
          <BarChart2 size={28} strokeWidth={1.5} />
          <p className="text-xs">Нет данных за период</p>
        </CardContent>
      </Card>
    );
  }

  const active = data.filter((d) => d.count > 0);

  return (
    <Card className="rounded-2xl shadow-[0_1px_4px_oklch(0.16_0.02_35_/_6%)]">
      <CardHeader className="pb-0 pt-4 px-4">
        <CardTitle className="text-sm font-semibold text-foreground">Списания по сменам</CardTitle>
        <p className="text-xs text-muted-foreground">Когда чаще всего происходят потери</p>
      </CardHeader>
      <CardContent className="px-4 pb-4">
        <div className="flex items-center gap-2">
          {/* Donut */}
          <div className="shrink-0">
            <ResponsiveContainer width={130} height={130}>
              <PieChart>
                <Pie
                  data={active}
                  cx="50%"
                  cy="50%"
                  innerRadius={38}
                  outerRadius={62}
                  paddingAngle={3}
                  dataKey="count"
                  strokeWidth={0}
                >
                  {active.map((_, i) => (
                    <Cell key={i} fill={SHIFT_COLORS[data.indexOf(active[i])] ?? SHIFT_COLORS[0]} />
                  ))}
                </Pie>
                <Tooltip
                  formatter={(value, name) => [`${value} заявок`, name]}
                  contentStyle={{ fontSize: 11, borderRadius: 10, border: "1px solid #EDE5DC" }}
                />
              </PieChart>
            </ResponsiveContainer>
          </div>

          {/* Legend */}
          <div className="flex-1 grid grid-cols-2 gap-2">
            {data.map((d, i) => (
              <div key={d.name} className="rounded-xl px-2.5 py-2" style={{ background: SHIFT_COLORS[i] + "18" }}>
                <p className="text-xs font-semibold leading-tight" style={{ color: SHIFT_COLORS[i] }}>
                  {d.label}
                </p>
                <p className="text-base font-extrabold mt-0.5" style={{ color: SHIFT_COLORS[i] }}>{d.count}</p>
                {d.amount > 0 && (
                  <p className="text-[10px] text-muted-foreground leading-tight">{ruFmt.format(d.amount)}</p>
                )}
              </div>
            ))}
          </div>
        </div>

        {/* Worst shift callout */}
        {(() => {
          const worst = data.reduce((max, d) => d.count > max.count ? d : max, data[0]);
          if (!worst || worst.count === 0) return null;
          const idx = data.indexOf(worst);
          return (
            <div className="mt-3 rounded-xl px-3 py-2.5 border" style={{ background: SHIFT_COLORS[idx] + "12", borderColor: SHIFT_COLORS[idx] + "40" }}>
              <p className="text-xs font-medium" style={{ color: SHIFT_COLORS[idx] }}>
                Больше всего потерь — <b>{worst.label}</b> ({worst.count} заявок)
              </p>
            </div>
          );
        })()}
      </CardContent>
    </Card>
  );
}