"use client";

import { useState } from "react";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";
import { Loader2, CheckCircle2, XCircle, Camera, CameraOff, Store, User, FileCheck, AlertTriangle } from "lucide-react";
import { createClient } from "@/lib/supabase/client";
import { cn } from "@/lib/utils";

interface Request {
  id: string;
  product_name: string;
  amount: number;
  type: string;
  comment: string;
  photo_path: string;
  status: string;
  created_at: string;
  has_camera_exif?: boolean | null;
  is_duplicate_photo?: boolean | null;
  iiko_doc_number?: string | null;
  iiko_status?: string | null;
  store: { name: string } | null;
  author: { full_name: string } | null;
  deducted_employee: { full_name: string } | null;
}

interface RequestCardProps {
  request: Request;
  onUpdate: () => void;
  index?: number;
}

export function RequestCard({ request, onUpdate, index = 0 }: RequestCardProps) {
  const [loading, setLoading] = useState<"approve" | "reject" | null>(null);
  const [showSuccess, setShowSuccess] = useState(false);
  const supabase = createClient();
  const [photoUrl, setPhotoUrl] = useState<string | null>(null);

  async function loadPhoto() {
    if (photoUrl) return;
    try {
      const { data } = await supabase.storage
        .from("writeoff-photos")
        .createSignedUrl(request.photo_path, 300);
      setPhotoUrl(data?.signedUrl ?? null);
    } catch {
      toast.error("Не удалось загрузить фото");
    }
  }

  async function handleAction(action: "approve" | "reject") {
    setLoading(action);
    try {
      const res = await fetch(`/api/requests/${request.id}/${action}`, { method: "POST" });
      const body = await res.json().catch(() => ({}));
      if (!res.ok) throw new Error(body.error ?? "Ошибка сервера");

      if (action === "approve") {
        setShowSuccess(true);
        toast.success("Заявка одобрена");
        if (body.iiko_doc_number && body.iiko_status === "sent") {
          toast.success(`Iiko: акт #${body.iiko_doc_number} создан`, {
            icon: "📄",
            duration: 7000,
            description: "Данные переданы в систему учёта",
          });
        } else if (body.warning) {
          toast.warning(body.warning, { duration: 8000 });
        } else {
          toast.info("Iiko: акт сформирован (demo-режим)", {
            icon: "📋",
            duration: 5000,
          });
        }
        setTimeout(() => onUpdate(), 900);
      } else {
        toast.error("Заявка отклонена");
        onUpdate();
      }
    } catch (err) {
      toast.error(err instanceof Error ? err.message : "Ошибка соединения");
    } finally {
      setLoading(null);
    }
  }

  const formattedDate = new Date(request.created_at).toLocaleString("ru-RU", {
    day: "2-digit", month: "2-digit", hour: "2-digit", minute: "2-digit",
  });

  const isDeduction = request.type === "with_deduction";

  return (
    <div
      className="relative bg-white rounded-2xl border border-border shadow-[0_1px_6px_oklch(0.16_0.02_35_/_6%)] overflow-hidden animate-in fade-in-0 slide-in-from-bottom-3 duration-300 fill-mode-both"
      style={{ animationDelay: `${index * 70}ms` }}
    >
      {showSuccess && (
        <div className="absolute inset-0 z-20 flex items-center justify-center bg-green-500/10 animate-in fade-in-0 duration-150">
          <div className="bg-green-500 rounded-full p-5 shadow-2xl animate-in zoom-in-50 duration-300">
            <CheckCircle2 size={48} className="text-white" strokeWidth={2.5} />
          </div>
        </div>
      )}
      {/* Type banner */}
      <div className={cn(
        "px-4 py-2 flex items-center justify-between",
        isDeduction ? "bg-red-50 border-b border-red-100" : "bg-green-50 border-b border-green-100"
      )}>
        <span className={cn(
          "text-xs font-semibold uppercase tracking-wide",
          isDeduction ? "text-red-700" : "text-green-700"
        )}>
          {isDeduction ? "С удержанием" : "Без удержания"}
        </span>
        <div className="flex items-center gap-2 flex-wrap">
          {request.is_duplicate_photo && (
            <span className="inline-flex items-center gap-1 text-[10px] font-medium px-2 py-0.5 rounded-full bg-orange-100 text-orange-700 border border-orange-200">
              <AlertTriangle size={10} strokeWidth={2} />
              Дубликат фото
            </span>
          )}
          {request.iiko_doc_number && (
            <span className="inline-flex items-center gap-1 text-[10px] font-medium px-2 py-0.5 rounded-full bg-blue-50 text-blue-700 border border-blue-100">
              <FileCheck size={10} strokeWidth={2} />
              Iiko #{request.iiko_doc_number}
            </span>
          )}
          {request.has_camera_exif != null && (
            <span className={cn(
              "inline-flex items-center gap-1 text-[10px] font-medium px-2 py-0.5 rounded-full",
              request.has_camera_exif
                ? "bg-green-100 text-green-700"
                : "bg-red-100 text-red-700"
            )}>
              {request.has_camera_exif
                ? <><Camera size={10} strokeWidth={2} /> EXIF: камера</>
                : <><CameraOff size={10} strokeWidth={2} /> Нет EXIF</>
              }
            </span>
          )}
        </div>
      </div>

      <div className="p-4 space-y-3">
        {/* Product + date */}
        <div>
          <p className="font-bold text-foreground text-base leading-tight">{request.product_name}</p>
          <p className="text-xs text-muted-foreground mt-0.5">{formattedDate}</p>
        </div>

        {/* Meta row */}
        <div className="grid grid-cols-2 gap-2">
          <div className="flex items-center gap-1.5">
            <Store size={12} strokeWidth={2} className="text-muted-foreground shrink-0" />
            <div>
              <p className="text-[10px] text-muted-foreground">Точка</p>
              <p className="text-sm font-medium leading-tight">{request.store?.name ?? "—"}</p>
            </div>
          </div>
          <div className="flex items-center gap-1.5">
            <User size={12} strokeWidth={2} className="text-muted-foreground shrink-0" />
            <div>
              <p className="text-[10px] text-muted-foreground">Сотрудник</p>
              <p className="text-sm font-medium leading-tight">{request.author?.full_name ?? "—"}</p>
            </div>
          </div>
        </div>

        {/* Deduction target */}
        {request.deducted_employee && (
          <div className="rounded-xl bg-red-50 border border-red-100 px-3 py-2">
            <p className="text-[10px] text-red-500 font-medium uppercase tracking-wide mb-0.5">Удержание с</p>
            <p className="text-sm font-semibold text-red-700">{request.deducted_employee.full_name}</p>
          </div>
        )}

        {/* Amount + comment */}
        <div className="grid grid-cols-2 gap-2">
          <div className="rounded-xl bg-muted/60 px-3 py-2">
            <p className="text-[10px] text-muted-foreground uppercase tracking-wide mb-0.5">Количество</p>
            <p className="text-sm font-bold">{request.amount}</p>
          </div>
          <div className="rounded-xl bg-muted/60 px-3 py-2">
            <p className="text-[10px] text-muted-foreground uppercase tracking-wide mb-0.5">Комментарий</p>
            <p className="text-sm font-medium truncate">{request.comment || "—"}</p>
          </div>
        </div>

        {/* Photo */}
        {!photoUrl ? (
          <button
            type="button"
            onClick={loadPhoto}
            className="w-full h-28 rounded-xl bg-muted/60 flex flex-col items-center justify-center gap-1.5 text-sm text-muted-foreground hover:bg-muted transition-colors active:scale-[0.98] duration-150"
          >
            <Camera size={20} strokeWidth={1.5} />
            <span className="text-xs">Показать фото</span>
          </button>
        ) : (
          // eslint-disable-next-line @next/next/no-img-element
          <img src={photoUrl} alt="Фото товара" className="w-full max-h-52 object-cover rounded-xl" />
        )}
      </div>

      {/* Action buttons */}
      {request.status === "pending" && (
        <div className="flex gap-3 px-4 pb-4">
          <Button
            className="flex-1 h-12 rounded-xl text-sm font-semibold bg-green-600 hover:bg-green-700 active:scale-[0.97] transition-all duration-150 shadow-[0_2px_8px_rgba(22,163,74,0.3)] gap-2"
            disabled={!!loading}
            onClick={() => handleAction("approve")}
          >
            {loading === "approve"
              ? <Loader2 size={16} className="animate-spin" />
              : <><CheckCircle2 size={16} strokeWidth={2} /> Одобрить</>
            }
          </Button>
          <Button
            variant="outline"
            className="flex-1 h-12 rounded-xl text-sm font-semibold border-red-200 text-red-600 hover:bg-red-50 active:scale-[0.97] transition-all duration-150 gap-2"
            disabled={!!loading}
            onClick={() => handleAction("reject")}
          >
            {loading === "reject"
              ? <Loader2 size={16} className="animate-spin" />
              : <><XCircle size={16} strokeWidth={2} /> Отклонить</>
            }
          </Button>
        </div>
      )}
    </div>
  );
}