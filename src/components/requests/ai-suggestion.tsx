"use client";

import { Badge } from "@/components/ui/badge";
import { Sparkles, AlertTriangle, Check, XCircle } from "lucide-react";
import type { ClassificationResult } from "@/app/api/classify-photo/route";

interface AiSuggestionProps {
  result: ClassificationResult;
  onAccept: (type: "with_deduction" | "without_deduction", category: string) => void;
  accepted: boolean;
}

export function AiSuggestion({ result, onAccept, accepted }: AiSuggestionProps) {
  // Non-food rejection — show warning, no accept button
  if (!result.is_food_product) {
    return (
      <div className="rounded-xl border border-amber-200 bg-amber-50 px-4 py-3 flex items-start gap-2">
        <XCircle size={16} className="text-amber-500 mt-0.5 shrink-0" />
        <p className="text-xs text-amber-700">{result.rejected_reason}</p>
      </div>
    );
  }

  const pct = Math.round(result.confidence * 100);

  return (
    <div className={`rounded-xl border px-4 py-3 space-y-2 ${
      result.suspicious ? "bg-red-50 border-red-200" : "bg-violet-50 border-violet-200"
    }`}>
      <div className="flex items-start gap-2">
        {result.suspicious ? (
          <AlertTriangle size={16} className="text-red-500 mt-0.5 shrink-0" />
        ) : (
          <Sparkles size={16} className="text-violet-500 mt-0.5 shrink-0" />
        )}
        <div className="flex-1 min-w-0">
          <div className="flex items-center gap-2 flex-wrap">
            <span className="text-sm font-medium text-slate-800">{result.category}</span>
            <Badge variant="secondary" className="text-xs">{pct}%</Badge>
            {result.suspicious && (
              <Badge variant="destructive" className="text-xs">Подозрительно</Badge>
            )}
          </div>
          <p className="text-xs text-slate-500 mt-0.5">{result.description}</p>
          {result.suspicious && result.suspicious_reason && (
            <p className="text-xs text-red-600 mt-0.5">{result.suspicious_reason}</p>
          )}
        </div>
      </div>

      {!accepted ? (
        <button
          type="button"
          onClick={() => onAccept(result.suggested_type, result.category)}
          className="w-full text-center text-xs font-medium text-violet-700 bg-white border border-violet-200 rounded-lg py-1.5 hover:bg-violet-50 transition-colors"
        >
          Применить предложение AI
        </button>
      ) : (
        <div className="flex items-center gap-1.5 text-xs text-green-700">
          <Check size={13} />
          Предложение применено
        </div>
      )}
    </div>
  );
}