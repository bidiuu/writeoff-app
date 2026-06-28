"use client";

import { useEffect, useMemo, useState } from "react";
import { useRouter } from "next/navigation";
import { toast } from "sonner";
import { createClient } from "@/lib/supabase/client";
import { enqueueRequest } from "@/lib/offline/queue";
import { PhotoCapture } from "./photo-capture";
import { AiSuggestion } from "./ai-suggestion";
import { StoreMapPicker } from "./store-map-picker";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { WifiOff, Loader2, MapPin, X } from "lucide-react";
import { cn } from "@/lib/utils";
import type { ClassificationResult } from "@/app/api/classify-photo/route";

type StoreRow   = { id: string; name: string; address?: string | null; city?: string | null };
type Profile    = { id: string; full_name: string | null; role: string };
type Category   = "food" | "equipment" | "supplies" | "other";
type PriceItem  = { id: string; name: string; unit: string; price_per_unit: number };

// Simple Russian morphology: match first N-1 chars of each word against AI description
function matchProductByText(text: string, prices: PriceItem[]): PriceItem | null {
  const t = text.toLowerCase();
  for (const p of prices) {
    const words = p.name.toLowerCase().split(/\s+/).filter((w) => w.length >= 4);
    if (words.some((w) => t.includes(w.slice(0, Math.max(4, w.length - 1))))) return p;
  }
  return null;
}

const CATEGORIES: { id: Category; label: string; desc: string }[] = [
  { id: "food",      label: "Еда",          desc: "Продукты, ингредиенты, напитки" },
  { id: "equipment", label: "Оборудование",  desc: "Техника, инвентарь" },
  { id: "supplies",  label: "Расходники",    desc: "Стаканы, упаковка, салфетки" },
  { id: "other",     label: "Другое",        desc: "Прочее" },
];

export function RequestForm() {
  const router = useRouter();
  const supabase = createClient();
  const [stores, setStores]             = useState<StoreRow[]>([]);
  const [employees, setEmployees]       = useState<Profile[]>([]);
  const [photoFile, setPhotoFile]         = useState<File | null>(null);
  const [hasCameraExif, setHasCameraExif] = useState<boolean | null>(null);
  const [productPrices, setProductPrices] = useState<{ id: string; name: string; unit: string; price_per_unit: number }[]>([]);
  const [selectedPriceId, setSelectedPriceId] = useState("");
  const [estimatedCost, setEstimatedCost] = useState<number | null>(null);
  const [submitting, setSubmitting]     = useState(false);
  const [isOnline, setIsOnline]         = useState(true);
  const [selectedCity, setSelectedCity] = useState("");
  const [mapOpen, setMapOpen]           = useState(false);
  const [selectedStore, setSelectedStore] = useState<StoreRow | null>(null);
  const [category, setCategory]         = useState<Category | "">("");

  const [aiResult, setAiResult]   = useState<ClassificationResult | null>(null);
  const [aiLoading, setAiLoading] = useState(false);
  const [aiAccepted, setAiAccepted] = useState(false);

  const [form, setForm] = useState({
    store_id: "",
    type: "without_deduction" as "with_deduction" | "without_deduction",
    deducted_employee_id: "",
    product_name: "",
    amount: "",
    comment: "",
  });

  useEffect(() => {
    setIsOnline(navigator.onLine);
    const up = () => setIsOnline(true);
    const dn = () => setIsOnline(false);
    window.addEventListener("online", up);
    window.addEventListener("offline", dn);

    supabase.from("stores").select("id, name, address, city").order("name")
      .then(({ data, error }) => {
        if (error || !data) {
          supabase.from("stores").select("id, name").order("name")
            .then(({ data: d2 }) => setStores((d2 as unknown as StoreRow[]) ?? []));
        } else {
          setStores((data as unknown as StoreRow[]).sort((a, b) =>
            (a.city ?? "").localeCompare(b.city ?? "", "ru") || a.name.localeCompare(b.name, "ru")));
        }
      });

    supabase.from("profiles").select("id, full_name, role").eq("role", "sender")
      .then(({ data }) => setEmployees((data as Profile[]) ?? []));

    return () => { window.removeEventListener("online", up); window.removeEventListener("offline", dn); };
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  // Auto-match AI result against product catalog as soon as both are available
  useEffect(() => {
    if (!aiResult?.is_food_product || productPrices.length === 0 || selectedPriceId) return;
    const matched = matchProductByText(aiResult.description, productPrices);
    if (!matched) return;
    setSelectedPriceId(matched.id);
    if (!form.product_name) setField("product_name", matched.name);
    const amt = parseFloat(form.amount);
    setEstimatedCost(!isNaN(amt) && amt > 0 ? amt * matched.price_per_unit : null);
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [aiResult, productPrices]);

  const cities = useMemo(
    () => [...new Set(stores.map((s) => s.city).filter(Boolean))].sort((a, b) =>
      (a as string).localeCompare(b as string, "ru")) as string[],
    [stores]
  );
  const hasCities = cities.length > 0;

  function setField(key: keyof typeof form, value: string) {
    setForm((f) => ({ ...f, [key]: value }));
    if (key === "amount" && selectedPriceId) {
      const product = productPrices.find((p) => p.id === selectedPriceId);
      const amt = parseFloat(value);
      setEstimatedCost(product && !isNaN(amt) && amt > 0 ? amt * product.price_per_unit : null);
    }
  }

  function handleProductSelect(productId: string | null) {
    if (!productId) { setSelectedPriceId(""); setEstimatedCost(null); return; }
    setSelectedPriceId(productId);
    const product = productPrices.find((p) => p.id === productId);
    if (product) {
      if (!form.product_name) setField("product_name", product.name);
      const amt = parseFloat(form.amount);
      setEstimatedCost(!isNaN(amt) && amt > 0 ? amt * product.price_per_unit : null);
    } else {
      setEstimatedCost(null);
    }
  }

  function handleCityChange(city: string) {
    setSelectedCity(city);
    setField("store_id", "");
    setSelectedStore(null);
  }

  function handleMapSelect(store: StoreRow) {
    setSelectedStore(store);
    setField("store_id", store.id);
  }

  function clearStore() {
    setSelectedStore(null);
    setField("store_id", "");
  }

  async function runAiClassification(file: File) {
    setAiLoading(true);
    try {
      const fd = new FormData();
      fd.append("photo", file);
      const res = await fetch("/api/classify-photo", { method: "POST", body: fd });
      if (res.ok) setAiResult(await res.json());
    } catch { /* AI non-blocking */ }
    finally { setAiLoading(false); }
  }

  async function handlePhotoSelected(file: File | null, hasExif: boolean) {
    setPhotoFile(file);
    setHasCameraExif(file ? hasExif : null);
    setAiResult(null);
    setAiAccepted(false);
    if (!file || !isOnline || category !== "food") return;
    await runAiClassification(file);
  }

  function handleCategoryChange(cat: Category) {
    setCategory(cat);
    setSelectedPriceId("");
    setEstimatedCost(null);
    if (cat !== "food") {
      setAiResult(null);
      setAiAccepted(false);
    } else {
      if (productPrices.length === 0) {
        // eslint-disable-next-line @typescript-eslint/no-explicit-any
        (supabase as any).from("product_prices").select("id, name, unit, price_per_unit").order("name")
          // eslint-disable-next-line @typescript-eslint/no-explicit-any
          .then(({ data }: { data: any }) => setProductPrices(data ?? []));
      }
      if (photoFile && isOnline) void runAiClassification(photoFile);
    }
  }

  function handleAiAccept(type: "with_deduction" | "without_deduction", cat: string) {
    setField("type", type);
    if (!form.product_name) setField("product_name", cat);
    setAiAccepted(true);
  }

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    if (!category)                { toast.error("Выберите категорию товара"); return; }
    if (!photoFile)               { toast.error("Прикрепите фото"); return; }
    if (form.comment.length < 10) { toast.error("Комментарий минимум 10 символов"); return; }
    if (!form.store_id)           { toast.error("Выберите торговую точку"); return; }

    setSubmitting(true);
    try {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) throw new Error("Не авторизован");
      const photoPath = `${user.id}/${crypto.randomUUID()}.jpg`;

      if (!isOnline) {
        await enqueueRequest({
          store_id: form.store_id, type: form.type,
          deducted_employee_id: form.type === "with_deduction" ? form.deducted_employee_id || null : null,
          product_name: form.product_name, amount: parseFloat(form.amount),
          comment: form.comment, photo_path: photoPath, photo_blob: photoFile,
          category: category as Category,
          has_camera_exif: hasCameraExif,
          estimated_cost: estimatedCost,
        });
        toast.success("Заявка сохранена — отправится при подключении к сети");
        router.push("/dashboard");
        return;
      }

      const { error: uploadError } = await supabase.storage
        .from("writeoff-photos")
        .upload(photoPath, photoFile, { contentType: "image/jpeg", upsert: false });
      if (uploadError) throw uploadError;

      const res = await fetch("/api/requests", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          store_id: form.store_id, type: form.type,
          deducted_employee_id: form.type === "with_deduction" ? form.deducted_employee_id || null : null,
          product_name: form.product_name, amount: parseFloat(form.amount),
          comment: form.comment, photo_path: photoPath,
          category,
          has_camera_exif: hasCameraExif,
          estimated_cost: estimatedCost,
        }),
      });
      if (!res.ok) { const { error } = await res.json(); throw new Error(error ?? "Ошибка"); }

      toast.success("Заявка отправлена на проверку");
      router.push("/dashboard");
    } catch (err) {
      toast.error(err instanceof Error ? err.message : "Ошибка отправки");
    } finally {
      setSubmitting(false);
    }
  }

  return (
    <>
      <form onSubmit={handleSubmit} className="space-y-5">
        {!isOnline && (
          <div className="flex items-center gap-2 text-sm text-amber-700 bg-amber-50 border border-amber-200 rounded-lg px-3 py-2">
            <WifiOff size={15} /> Офлайн — заявка будет сохранена локально
          </div>
        )}

        <div className="space-y-1.5">
          <Label>Категория товара</Label>
          <div className="grid grid-cols-2 gap-2">
            {CATEGORIES.map((cat) => (
              <button
                key={cat.id}
                type="button"
                onClick={() => handleCategoryChange(cat.id)}
                className={cn(
                  "rounded-xl border px-3 py-2.5 text-sm font-medium transition-colors text-left",
                  category === cat.id
                    ? "border-red-500 bg-red-50 text-red-700"
                    : "border-slate-200 bg-white text-slate-700 hover:border-slate-300 hover:bg-slate-50"
                )}
              >
                <span className="block leading-tight">{cat.label}</span>
                <span className="block text-xs font-normal text-slate-400 mt-0.5 leading-tight">{cat.desc}</span>
              </button>
            ))}
          </div>
        </div>

        <div className="space-y-1.5">
          <Label>Фото</Label>
          <PhotoCapture onFile={handlePhotoSelected} disabled={submitting} />
          {category === "food" && aiLoading && (
            <div className="flex items-center gap-2 text-xs text-violet-600">
              <Loader2 size={13} className="animate-spin" /> AI анализирует фото...
            </div>
          )}
          {category === "food" && aiResult && !aiLoading && (
            <AiSuggestion result={aiResult} onAccept={handleAiAccept} accepted={aiAccepted} />
          )}
        </div>

        <div className="space-y-1.5">
          <Label>Торговая точка</Label>

          {selectedStore ? (
            <div className="flex items-start justify-between gap-2 rounded-xl border border-red-200 bg-red-50 px-3 py-2.5">
              <div className="flex items-start gap-2">
                <MapPin size={16} className="text-red-500 mt-0.5 shrink-0" />
                <div>
                  <p className="text-sm font-semibold text-slate-800 leading-tight">{selectedStore.name}</p>
                  {selectedStore.address && (
                    <p className="text-xs text-slate-500 mt-0.5">{selectedStore.address}</p>
                  )}
                </div>
              </div>
              <button type="button" onClick={clearStore} className="text-slate-400 hover:text-slate-600 shrink-0 mt-0.5">
                <X size={16} />
              </button>
            </div>
          ) : (
            <div className="flex flex-col gap-2">
              {hasCities && (
                <Select value={selectedCity} onValueChange={(v) => v && handleCityChange(v)}>
                  <SelectTrigger className="text-sm">
                    <SelectValue placeholder="Выберите город" />
                  </SelectTrigger>
                  <SelectContent>
                    {cities.map((city) => (
                      <SelectItem key={city} value={city}>{city}</SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              )}

              <Button
                type="button"
                variant="outline"
                className="w-full gap-2 border-dashed border-red-300 text-red-600 hover:bg-red-50"
                disabled={hasCities && !selectedCity}
                onClick={() => setMapOpen(true)}
              >
                <MapPin size={16} />
                {selectedCity ? `Открыть карту — ${selectedCity}` : hasCities ? "Сначала выберите город" : "Выбрать точку на карте"}
              </Button>
            </div>
          )}
        </div>

        {category === "food" && productPrices.length > 0 && (
          <div className="space-y-1.5">
            <Label>Из справочника <span className="text-slate-400 text-xs">(опционально)</span></Label>
            <Select value={selectedPriceId} onValueChange={handleProductSelect}>
              <SelectTrigger className="text-sm">
                <SelectValue placeholder="Выбрать из справочника..." />
              </SelectTrigger>
              <SelectContent>
                {productPrices.map((p) => (
                  <SelectItem key={p.id} value={p.id}>
                    {p.name} — {p.price_per_unit} ₸/{p.unit === "kg" ? "кг" : "шт"}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
            {estimatedCost !== null && (
              <p className="text-sm font-medium text-green-700 bg-green-50 border border-green-200 rounded-lg px-3 py-2">
                Примерная стоимость: {new Intl.NumberFormat("ru-RU", { style: "currency", currency: "KZT", maximumFractionDigits: 0 }).format(estimatedCost)}
              </p>
            )}
          </div>
        )}

        <div className="space-y-1.5">
          <Label>Наименование продукта</Label>
          <Input required value={form.product_name}
            onChange={(e) => setField("product_name", e.target.value)}
            placeholder="Например: Котлета говяжья" />
        </div>

        <div className="space-y-1.5">
          <Label>Количество (кг / шт)</Label>
          <Input type="number" step="0.01" min="0.01" required value={form.amount}
            onChange={(e) => setField("amount", e.target.value)} placeholder="0.00" />
        </div>

        <div className="space-y-1.5">
          <Label>Тип списания</Label>
          <Select value={form.type} onValueChange={(v) => setField("type", (v ?? "without_deduction") as typeof form.type)}>
            <SelectTrigger><SelectValue /></SelectTrigger>
            <SelectContent>
              <SelectItem value="without_deduction">Без удержания</SelectItem>
              <SelectItem value="with_deduction">С удержанием с сотрудника</SelectItem>
            </SelectContent>
          </Select>
        </div>

        {form.type === "with_deduction" && (
          <div className="space-y-1.5">
            <Label>Сотрудник (с кого удержание)</Label>
            <Select value={form.deducted_employee_id} onValueChange={(v) => setField("deducted_employee_id", v ?? "")}>
              <SelectTrigger><SelectValue placeholder="Выберите сотрудника" /></SelectTrigger>
              <SelectContent>
                {employees.map((p) => <SelectItem key={p.id} value={p.id}>{p.full_name}</SelectItem>)}
              </SelectContent>
            </Select>
          </div>
        )}

        <div className="space-y-1.5">
          <Label>Комментарий <span className="text-slate-400 text-xs">({form.comment.length}/10 мин.)</span></Label>
          <Textarea required minLength={10} rows={3} value={form.comment}
            onChange={(e) => setField("comment", e.target.value)}
            placeholder="Опишите причину списания..." />
        </div>

        <Button type="submit" className="w-full" disabled={submitting || !photoFile}>
          {submitting
            ? <><Loader2 size={15} className="animate-spin mr-2" />Отправка...</>
            : isOnline ? "Отправить на проверку" : "Сохранить (офлайн)"}
        </Button>
      </form>

      <StoreMapPicker
        open={mapOpen}
        onClose={() => setMapOpen(false)}
        city={selectedCity || (hasCities ? "" : "Алматы")}
        stores={stores}
        onSelect={handleMapSelect}
      />
    </>
  );
}