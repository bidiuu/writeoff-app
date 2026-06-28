"use client";

import { useRef, useState } from "react";
import imageCompression from "browser-image-compression";
import { Camera, X } from "lucide-react";
import { Button } from "@/components/ui/button";
import { cn } from "@/lib/utils";

interface PhotoCaptureProps {
  onFile: (file: File | null, hasExif: boolean, rawHash: string | null) => void;
  disabled?: boolean;
}

// Checks for EXIF APP1 marker in raw JPEG bytes (present in camera photos, absent in screenshots).
// Must be called BEFORE imageCompression which strips EXIF.
function detectCameraExif(buf: ArrayBuffer): boolean {
  const view = new DataView(buf);
  if (view.byteLength < 6) return false;
  if (view.getUint16(0) !== 0xffd8) return false;
  let offset = 2;
  while (offset + 3 < view.byteLength) {
    const marker = view.getUint16(offset);
    if (marker === 0xffe1) {
      if (offset + 9 >= view.byteLength) return false;
      const sig = String.fromCharCode(
        view.getUint8(offset + 4), view.getUint8(offset + 5),
        view.getUint8(offset + 6), view.getUint8(offset + 7),
      );
      return sig === "Exif";
    }
    if ((marker & 0xff00) !== 0xff00 || marker === 0xffda) break;
    const segLen = view.getUint16(offset + 2);
    offset += 2 + segLen;
  }
  return false;
}

const ALLOWED_TYPES = ["image/jpeg", "image/png", "image/webp"];
const MAX_MB = 8;

export function PhotoCapture({ onFile, disabled }: PhotoCaptureProps) {
  const inputRef = useRef<HTMLInputElement>(null);
  const [preview, setPreview] = useState<string | null>(null);
  const [compressing, setCompressing] = useState(false);
  const [error, setError] = useState<string | null>(null);

  async function handleChange(e: React.ChangeEvent<HTMLInputElement>) {
    const raw = e.target.files?.[0];
    if (!raw) return;
    setError(null);

    if (!ALLOWED_TYPES.includes(raw.type)) {
      setError("Разрешены только JPEG, PNG, WebP");
      onFile(null, false);
      return;
    }
    if (raw.size > MAX_MB * 1024 * 1024) {
      setError(`Файл превышает ${MAX_MB} МБ`);
      onFile(null, false);
      return;
    }

    // Read raw bytes once — used for both EXIF detection and hashing
    const rawBuf = await raw.arrayBuffer();
    const hasExif = raw.type === "image/jpeg" ? detectCameraExif(rawBuf) : false;

    // Hash the original file BEFORE compression (JPEG compression is non-deterministic
    // so hashing the compressed output would produce a different hash each time).
    const digest = await crypto.subtle.digest("SHA-256", rawBuf);
    const rawHash = Array.from(new Uint8Array(digest)).map((b) => b.toString(16).padStart(2, "0")).join("");

    setCompressing(true);
    try {
      const compressed = await imageCompression(raw, {
        maxWidthOrHeight: 1280,
        maxSizeMB: 1.5,
        useWebWorker: true,
        fileType: "image/jpeg",
      });
      const url = URL.createObjectURL(compressed);
      setPreview(url);
      onFile(compressed, hasExif, rawHash);
    } catch {
      setError("Ошибка при обработке фото");
      onFile(null, false, null);
    } finally {
      setCompressing(false);
    }
  }

  function handleClear() {
    setPreview(null);
    onFile(null, false, null);
    if (inputRef.current) inputRef.current.value = "";
  }

  return (
    <div className="space-y-2">
      <input
        ref={inputRef}
        type="file"
        accept="image/jpeg,image/png,image/webp"
        capture="environment"
        className="hidden"
        onChange={handleChange}
        disabled={disabled || compressing}
      />

      {preview ? (
        <div className="relative rounded-xl overflow-hidden border border-slate-200 bg-slate-100">
          {/* eslint-disable-next-line @next/next/no-img-element */}
          <img src={preview} alt="Фото" className="w-full max-h-64 object-cover" />
          <button
            type="button"
            onClick={handleClear}
            className="absolute top-2 right-2 bg-white rounded-full p-1 shadow"
          >
            <X size={16} className="text-slate-600" />
          </button>
        </div>
      ) : (
        <button
          type="button"
          onClick={() => inputRef.current?.click()}
          disabled={disabled || compressing}
          className={cn(
            "flex flex-col items-center justify-center w-full h-40 rounded-xl border-2 border-dashed border-slate-200 bg-slate-50 transition-colors",
            "hover:border-slate-400 hover:bg-slate-100",
            disabled && "opacity-50 cursor-not-allowed"
          )}
        >
          <Camera size={32} className="text-slate-400 mb-2" />
          <span className="text-sm text-slate-500">
            {compressing ? "Обработка..." : "Сфотографировать или выбрать фото"}
          </span>
        </button>
      )}

      {error && <p className="text-sm text-red-500">{error}</p>}
    </div>
  );
}
