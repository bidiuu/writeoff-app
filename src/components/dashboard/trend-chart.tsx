"use client";

import { AreaChart, Area, XAxis, YAxis, Tooltip, ResponsiveContainer, CartesianGrid } from "recharts";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";

interface TrendChartProps {
  data: { date: string; amount: number; count: number }[];
}

const ruFmt = new Intl.NumberFormat("ru-RU", { style: "currency", currency: "KZT", maximumFractionDigits: 0 });
const compFmt = new Intl.NumberFormat("ru-RU", { notation: "compact", maximumFractionDigits: 1 });

export function TrendChart({ data }: TrendChartProps) {
  return (
    <Card className="rounded-2xl shadow-[0_1px_4px_oklch(0.16_0.02_35_/_6%)]">
      <CardHeader className="pb-2 pt-4 px-4">
        <CardTitle className="text-sm font-semibold text-foreground">Динамика за 14 дней</CardTitle>
      </CardHeader>
      <CardContent className="px-2 pb-4">
        {data.length === 0 ? (
          <p className="text-xs text-muted-foreground py-4 text-center">Нет данных</p>
        ) : (
          <ResponsiveContainer width="100%" height={160}>
            <AreaChart data={data} margin={{ top: 4, right: 8, bottom: 0, left: 0 }}>
              <defs>
                <linearGradient id="brandGrad" x1="0" y1="0" x2="0" y2="1">
                  <stop offset="5%" stopColor="#E8651A" stopOpacity={0.22} />
                  <stop offset="95%" stopColor="#E8651A" stopOpacity={0} />
                </linearGradient>
              </defs>
              <CartesianGrid strokeDasharray="3 3" stroke="#EDE5DC" />
              <XAxis dataKey="date" tick={{ fontSize: 10, fill: "#7A6A60" }} tickLine={false} axisLine={false} />
              <YAxis
                tickFormatter={(v) => typeof v === "number" ? compFmt.format(v) : String(v)}
                tick={{ fontSize: 10, fill: "#7A6A60" }} tickLine={false} axisLine={false} width={40}
              />
              <Tooltip
                formatter={(value) =>
                  typeof value === "number" ? ruFmt.format(value) : String(value)
                }
                contentStyle={{ fontSize: 12, borderRadius: 12, border: "1px solid #EDE5DC", boxShadow: "0 4px 12px rgba(28,16,9,0.08)" }}
              />
              <Area
                type="monotone"
                dataKey="amount"
                stroke="#E8651A"
                strokeWidth={2.5}
                fill="url(#brandGrad)"
                dot={false}
                activeDot={{ r: 4, fill: "#E8651A", strokeWidth: 0 }}
              />
            </AreaChart>
          </ResponsiveContainer>
        )}
      </CardContent>
    </Card>
  );
}