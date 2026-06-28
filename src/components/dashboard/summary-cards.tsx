import { TrendingDown, AlertCircle, Package, CheckCircle2 } from "lucide-react";

interface SummaryCardsProps {
  estimatedCost: number;
  withDeductionCost: number;
  uncostedCount: number;
  totalCount: number;
  pendingCount: number;
  approvedCount: number;
}

export function SummaryCards({
  estimatedCost,
  withDeductionCost,
  uncostedCount,
  totalCount,
  pendingCount,
  approvedCount,
}: SummaryCardsProps) {
  const fmt = (n: number) =>
    new Intl.NumberFormat("ru-RU", { style: "currency", currency: "KZT", maximumFractionDigits: 0 }).format(n);

  return (
    <div className="grid grid-cols-2 gap-3">
      {/* Main loss card — full width */}
      <div className="col-span-2 bg-gradient-to-br from-[#E8651A] to-[#C04D0D] rounded-2xl p-4 text-white shadow-[0_4px_16px_oklch(0.63_0.175_40_/_25%)]">
        <div className="flex items-center gap-1.5 mb-2 opacity-80">
          <TrendingDown size={13} strokeWidth={2} />
          <p className="text-xs font-medium uppercase tracking-wide">Потери за 30 дней</p>
        </div>
        <p className="text-4xl font-extrabold leading-none tracking-tight">{fmt(estimatedCost)}</p>
        <div className="flex items-center justify-between mt-2">
          <p className="text-xs opacity-70">{totalCount} актов списания одобрено</p>
          {uncostedCount > 0 && (
            <span className="text-[10px] bg-white/20 rounded-full px-2 py-0.5">
              {uncostedCount} без оценки
            </span>
          )}
        </div>
      </div>

      {/* Deduction card */}
      <div className="bg-white rounded-2xl p-4 border border-border shadow-[0_1px_4px_oklch(0.16_0.02_35_/_6%)]">
        <div className="flex items-center gap-1 text-muted-foreground mb-2">
          <AlertCircle size={12} strokeWidth={2} />
          <p className="text-[11px] font-medium uppercase tracking-wide">С удержанием</p>
        </div>
        <p className="text-2xl font-bold text-red-600 leading-none">{fmt(withDeductionCost)}</p>
        <p className="text-[11px] text-muted-foreground mt-1.5">вина сотрудника</p>
      </div>

      {/* Pending card */}
      <div className="bg-white rounded-2xl p-4 border border-border shadow-[0_1px_4px_oklch(0.16_0.02_35_/_6%)]">
        <div className="flex items-center gap-1 text-muted-foreground mb-2">
          <Package size={12} strokeWidth={2} />
          <p className="text-[11px] font-medium uppercase tracking-wide">На проверке</p>
        </div>
        <p className="text-2xl font-bold text-amber-600 leading-none">{pendingCount}</p>
        <p className="text-[11px] text-muted-foreground mt-1.5">из {pendingCount + approvedCount} заявок</p>
      </div>
    </div>
  );
}