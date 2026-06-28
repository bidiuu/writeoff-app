"use client";

import { BarChart, Bar, XAxis, YAxis, Tooltip, ResponsiveContainer, Cell } from "recharts";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";

interface TopChartProps {
  title: string;
  data: { name: string; amount: number; count: number }[];
  color?: string;
}

const BRAND_COLORS = ["#E8651A", "#F59E0B", "#C04D0D", "#DC6803", "#92400E"];

const ruFmt = new Intl.NumberFormat("ru-RU", { style: "currency", currency: "KZT", maximumFractionDigits: 0 });
const compFmt = new Intl.NumberFormat("ru-RU", { notation: "compact", maximumFractionDigits: 1 });

export function TopChart({ title, data, color = "#E8651A" }: TopChartProps) {
  if (data.length === 0) {
    return (
      <Card className="rounded-2xl shadow-[0_1px_4px_oklch(0.16_0.02_35_/_6%)]">
        <CardHeader className="pb-2"><CardTitle className="text-sm">{title}</CardTitle></CardHeader>
        <CardContent><p className="text-xs text-muted-foreground py-4 text-center">Нет данных</p></CardContent>
      </Card>
    );
  }

  return (
    <Card className="rounded-2xl shadow-[0_1px_4px_oklch(0.16_0.02_35_/_6%)]">
      <CardHeader className="pb-2 pt-4 px-4">
        <CardTitle className="text-sm font-semibold text-foreground">{title}</CardTitle>
      </CardHeader>
      <CardContent className="px-2 pb-4">
        <ResponsiveContainer width="100%" height={data.length * 44 + 16}>
          <BarChart data={data} layout="vertical" margin={{ top: 0, right: 56, bottom: 0, left: 0 }}>
            <XAxis type="number" hide />
            <YAxis
              type="category" dataKey="name" width={90}
              tick={{ fontSize: 11, fill: "#7A6A60" }} tickLine={false} axisLine={false}
            />
            <Tooltip
              formatter={(value) =>
                typeof value === "number" ? ruFmt.format(value) : String(value)
              }
              contentStyle={{ fontSize: 12, borderRadius: 12, border: "1px solid #EDE5DC", boxShadow: "0 4px 12px rgba(28,16,9,0.08)" }}
            />
            <Bar
              dataKey="amount"
              radius={[0, 6, 6, 0]}
              label={{
                position: "right",
                fontSize: 11,
                fill: "#7A6A60",
                formatter: (v: unknown) =>
                  typeof v === "number" ? compFmt.format(v) : String(v ?? ""),
              }}
            >
              {data.map((_, i) => (
                <Cell key={i} fill={BRAND_COLORS[i % BRAND_COLORS.length] ?? color} />
              ))}
            </Bar>
          </BarChart>
        </ResponsiveContainer>
      </CardContent>
    </Card>
  );
}