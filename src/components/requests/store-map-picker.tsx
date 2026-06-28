"use client";

import { useCallback, useEffect, useRef, useState } from "react";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Loader2, MapPin, AlertCircle, RefreshCw } from "lucide-react";
import { Button } from "@/components/ui/button";

type StoreRow = { id: string; name: string; address?: string | null; city?: string | null };

interface Props {
  open: boolean;
  onClose: () => void;
  city: string;
  stores: StoreRow[];
  onSelect: (store: StoreRow) => void;
}

const CITY_CENTERS: Record<string, [number, number]> = {
  "Алматы":           [43.2220, 76.8512],
  "Астана":           [51.1801, 71.4460],
  "Шымкент":          [42.3417, 69.5901],
  "Караганда":        [49.8019, 73.1026],
  "Актау":            [43.6529, 51.1575],
  "Атырау":           [47.0945, 51.9160],
  "Усть-Каменогорск": [49.9781, 82.6125],
  "Актобе":           [50.2839, 57.1670],
  "Кокшетау":         [53.2833, 69.3833],
  "Тараз":            [42.9000, 71.3667],
};

const OVERALL_TIMEOUT_MS = 60_000;

function buildGeocodeQuery(address: string, city: string): string {
  const cleaned = address
    .replace(/\s*\([^)]*\)/g, "")
    .replace(/\s{2,}/g, " ")
    .trim();
  return `Казахстан, ${city}, ${cleaned}`;
}

function loadYmapsScript(apiKey: string): Promise<void> {
  return new Promise((resolve, reject) => {
    if ((window as any).ymaps) { resolve(); return; }
    const existing = document.getElementById("ymaps-script");
    if (existing) { existing.addEventListener("load", () => resolve()); return; }
    const s = document.createElement("script");
    s.id = "ymaps-script";
    s.src = `https://api-maps.yandex.ru/2.1/?apikey=${apiKey}&lang=ru_RU`;
    s.onload  = () => resolve();
    s.onerror = () => reject(new Error("ymaps_load_failed"));
    document.head.appendChild(s);
  });
}

// Server-side geocoding proxy — avoids Yandex referrer-domain restrictions on localhost.
// Returns [lat, lng] in ymaps coordinate order, or null if not found / API error.
async function serverGeocode(query: string): Promise<[number, number] | null> {
  const res = await fetch(`/api/geocode?q=${encodeURIComponent(query)}`);
  if (!res.ok) {
    const body = await res.json().catch(() => ({ error: res.status }));
    console.log("[MAP] geocode server error:", body.error, "for:", query);
    return null;
  }
  const { lat, lng } = await res.json();
  return [lat, lng];
}

export function StoreMapPicker({ open, onClose, city, stores, onSelect }: Props) {
  const mapRef  = useRef<HTMLDivElement>(null);
  const mapInst = useRef<any>(null);
  const [status, setStatus] = useState<"loading" | "ready" | "no-key" | "error">("loading");
  const [progress, setProgress] = useState({ done: 0, total: 0 });
  const [retryKey, setRetryKey] = useState(0);

  const retry = useCallback(() => {
    setStatus("loading");
    setProgress({ done: 0, total: 0 });
    setRetryKey((k) => k + 1);
  }, []);

  useEffect(() => {
    if (!open || !city) return;

    const apiKey = process.env.NEXT_PUBLIC_YANDEX_MAPS_API_KEY;
    if (!apiKey) { setStatus("no-key"); return; }

    setStatus("loading");
    setProgress({ done: 0, total: 0 });

    let cancelled = false;
    const overallTimer = setTimeout(() => {
      if (!cancelled) {
        console.log("[MAP] Overall timeout hit");
        setStatus("error");
      }
    }, OVERALL_TIMEOUT_MS);

    loadYmapsScript(apiKey)
      .then(() => {
        (window as any).ymaps.ready(() => {
          if (cancelled || !mapRef.current) return;

          if (mapInst.current) { mapInst.current.destroy(); mapInst.current = null; }

          const center = CITY_CENTERS[city] ?? [51.1801, 71.4460];
          const map = new (window as any).ymaps.Map(mapRef.current, {
            center,
            zoom: 12,
            controls: ["zoomControl"],
          });
          mapInst.current = map;

          const allForCity = stores.filter((s) => s.city === city);
          const cityStores = allForCity.filter((s) => s.address);
          console.log(`[MAP] city="${city}" | total: ${stores.length} | city match: ${allForCity.length} | with address: ${cityStores.length}`);
          if (allForCity[0]) console.log("[MAP] sample:", JSON.stringify(allForCity[0]));

          if (cityStores.length === 0) {
            console.log("[MAP] No stores with address — migration 006 may not be applied yet");
            clearTimeout(overallTimer);
            setStatus("ready");
            return;
          }

          setProgress({ done: 0, total: cityStores.length });

          let done = 0;
          const markDone = () => {
            done++;
            setProgress({ done, total: cityStores.length });
            if (done === cityStores.length && !cancelled) {
              clearTimeout(overallTimer);
              setStatus("ready");
              console.log(`[MAP] Done — ${cityStores.length} geocode requests finished`);
            }
          };

          cityStores.forEach((store) => {
            const query = buildGeocodeQuery(store.address!, city);
            console.log(`[MAP] geocoding via server: "${query}"`);

            serverGeocode(query)
              .then((coords) => {
                if (!coords || cancelled) {
                  if (!coords) console.log(`[MAP] no result for "${query}"`);
                  return;
                }
                console.log(`[MAP] OK "${store.name}" → [${coords[0]}, ${coords[1]}]`);
                const pin = new (window as any).ymaps.Placemark(
                  coords,
                  {
                    balloonContentHeader: store.name,
                    balloonContentBody:   store.address ?? "",
                    balloonContentFooter: '<span style="color:#e53e3e;font-weight:600">Нажмите, чтобы выбрать</span>',
                    hintContent: store.name,
                  },
                  { preset: "islands#redStretchyIcon", iconContent: "Bahandi" }
                );
                pin.events.add("click", () => { onSelect(store); onClose(); });
                map.geoObjects.add(pin);
              })
              .catch((err: unknown) => {
                console.log(`[MAP] fetch error "${query}":`, err instanceof Error ? err.message : String(err));
              })
              .finally(markDone);
          });
        });
      })
      .catch((err: unknown) => {
        console.log("[MAP] Script/ready error:", err instanceof Error ? err.message : String(err));
        if (!cancelled) setStatus("error");
      });

    return () => {
      cancelled = true;
      clearTimeout(overallTimer);
      if (mapInst.current) { mapInst.current.destroy(); mapInst.current = null; }
    };
  }, [open, city, retryKey]); // eslint-disable-line react-hooks/exhaustive-deps

  return (
    <Dialog open={open} onOpenChange={onClose}>
      <DialogContent className="max-w-2xl p-0 overflow-hidden" style={{ height: "85dvh" }}>
        <DialogHeader className="px-4 pt-4 pb-2 shrink-0">
          <DialogTitle className="flex items-center gap-2">
            <MapPin size={18} className="text-red-500" />
            Выберите точку — {city}
          </DialogTitle>
        </DialogHeader>

        <div className="relative flex-1 overflow-hidden" style={{ height: "calc(85dvh - 64px)" }}>
          {status === "no-key" && (
            <div className="absolute inset-0 flex flex-col items-center justify-center gap-3 text-center px-6">
              <MapPin size={40} className="text-slate-300" />
              <p className="font-semibold text-slate-700">API-ключ Яндекс Карт не настроен</p>
              <p className="text-sm text-slate-400">
                Добавь <code className="bg-slate-100 px-1 rounded">NEXT_PUBLIC_YANDEX_MAPS_API_KEY</code> в <code className="bg-slate-100 px-1 rounded">.env.local</code>
              </p>
            </div>
          )}

          {status === "error" && (
            <div className="absolute inset-0 flex flex-col items-center justify-center gap-4 text-center px-6 bg-white z-10">
              <AlertCircle size={40} className="text-red-400" />
              <div>
                <p className="font-semibold text-slate-700">Не удалось загрузить карту</p>
                <p className="text-sm text-slate-400 mt-1">Проверьте интернет-соединение и попробуйте снова</p>
              </div>
              <Button variant="outline" size="sm" onClick={retry} className="gap-2">
                <RefreshCw size={14} /> Повторить
              </Button>
            </div>
          )}

          {status === "loading" && (
            <div className="absolute inset-0 flex flex-col items-center justify-center gap-3 bg-white/90 z-10">
              <Loader2 size={32} className="animate-spin text-red-500" />
              <p className="text-sm text-slate-500">
                {progress.total > 0
                  ? `Размещаем точки на карте… ${progress.done}/${progress.total}`
                  : "Загружаем карту…"}
              </p>
            </div>
          )}

          <div ref={mapRef} className="w-full h-full" />
        </div>
      </DialogContent>
    </Dialog>
  );
}