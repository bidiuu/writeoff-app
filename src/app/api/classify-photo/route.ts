import { NextResponse, type NextRequest } from "next/server";
import { createClient } from "@/lib/supabase/server";
import { getAnthropicClient } from "@/lib/anthropic";

export interface ClassificationResult {
  category: string;
  suggested_type: "with_deduction" | "without_deduction";
  confidence: number;
  suspicious: boolean;
  suspicious_reason: string | null;
  description: string;
  is_food_product: boolean;
  rejected_reason?: string;
}

function detectMediaType(buf: Buffer): "image/jpeg" | "image/png" | "image/webp" | null {
  if (buf[0] === 0xff && buf[1] === 0xd8 && buf[2] === 0xff) return "image/jpeg";
  if (buf[0] === 0x89 && buf[1] === 0x50 && buf[2] === 0x4e && buf[3] === 0x47) return "image/png";
  if (
    buf[0] === 0x52 && buf[1] === 0x49 && buf[2] === 0x46 && buf[3] === 0x46 &&
    buf[8] === 0x57 && buf[9] === 0x45 && buf[10] === 0x42 && buf[11] === 0x50
  ) return "image/webp";
  return null;
}

const rl = new Map<string, { n: number; reset: number }>();
function allowed(ip: string): boolean {
  const now = Date.now();
  const rec = rl.get(ip);
  if (!rec || now > rec.reset) { rl.set(ip, { n: 1, reset: now + 60_000 }); return true; }
  if (rec.n >= 10) return false;
  rec.n++;
  return true;
}

const GATE_SYSTEM =
  "You are a content validator for a restaurant quality-control system. " +
  "Determine if the image shows a food product, beverage, ingredient, packaging, or restaurant supply item. " +
  "Reply with exactly one word: YES or NO.";

const GATE_USER =
  "Does this image show a food product, beverage, ingredient, or restaurant supply item " +
  "that could be written off as spoiled or damaged inventory? YES or NO only.";

const CLASSIFY_SYSTEM =
  "Ты — система контроля качества для ресторанного бизнеса. " +
  "Анализируй фото продуктов/товаров и классифицируй причину списания. " +
  "Всегда отвечай только валидным JSON без markdown, комментариев и пояснений.";

const CLASSIFY_USER =
  'Проанализируй это фото продукта и верни JSON строго в формате:\n' +
  '{\n' +
  '  "category": "<одно из: Порча продукции | Истёкший срок годности | Производственный брак | Механическое повреждение | Другое>",\n' +
  '  "suggested_type": "<with_deduction если видна вина сотрудника (ожог, разбито, небрежность) — иначе without_deduction>",\n' +
  '  "confidence": <число 0.0-1.0>,\n' +
  '  "suspicious": <true если продукт выглядит нормально и причина списания неочевидна — иначе false>,\n' +
  '  "suspicious_reason": "<строка с причиной подозрения или null>",\n' +
  '  "description": "<одно предложение на русском, описывающее состояние продукта>"\n' +
  '}';

const FALLBACK: ClassificationResult = {
  category: "Другое",
  suggested_type: "without_deduction",
  confidence: 0,
  suspicious: false,
  suspicious_reason: null,
  description: "AI-классификация недоступна — заполните вручную",
  is_food_product: true,
};

export async function POST(request: NextRequest) {
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const ip = request.headers.get("x-forwarded-for")?.split(",")[0].trim() ?? "local";
  if (!allowed(ip)) return NextResponse.json({ error: "Too many requests" }, { status: 429 });

  const formData = await request.formData().catch(() => null);
  const file = formData?.get("photo") as File | null;
  if (!file) return NextResponse.json({ error: "No photo provided" }, { status: 400 });

  if (file.size > 5 * 1024 * 1024)
    return NextResponse.json({ error: "Photo too large (max 5 MB)" }, { status: 400 });

  const buffer = Buffer.from(await file.arrayBuffer());
  const mediaType = detectMediaType(buffer);
  if (!mediaType)
    return NextResponse.json({ error: "Unsupported image format — use JPEG, PNG, or WebP" }, { status: 415 });

  const base64 = buffer.toString("base64");

  let anthropic;
  try {
    anthropic = getAnthropicClient();
  } catch (err) {
    console.error("[classify-photo] Anthropic client init failed:", err);
    return NextResponse.json(FALLBACK);
  }

  try {
    const gate = await anthropic.messages.create({
      model: "claude-haiku-4-5-20251001",
      max_tokens: 5,
      system: GATE_SYSTEM,
      messages: [{
        role: "user",
        content: [
          { type: "image", source: { type: "base64", media_type: mediaType, data: base64 } },
          { type: "text", text: GATE_USER },
        ],
      }],
    });

    const answer = gate.content[0].type === "text"
      ? gate.content[0].text.trim().toUpperCase()
      : "NO";

    if (!answer.startsWith("YES")) {
      return NextResponse.json({
        ...FALLBACK,
        is_food_product: false,
        confidence: 0.95,
        rejected_reason: "Фото не содержит продукт питания — пожалуйста, загрузите фото списываемого товара",
      } satisfies ClassificationResult);
    }

    const cls = await anthropic.messages.create({
      model: "claude-haiku-4-5-20251001",
      max_tokens: 512,
      system: CLASSIFY_SYSTEM,
      messages: [{
        role: "user",
        content: [
          { type: "image", source: { type: "base64", media_type: mediaType, data: base64 } },
          { type: "text", text: CLASSIFY_USER },
        ],
      }],
    });

    const raw = cls.content[0].type === "text" ? cls.content[0].text : "";
    // Strip markdown code fences if model wraps response in ```json ... ```
    const jsonStr = raw.replace(/^```(?:json)?\s*/i, "").replace(/\s*```\s*$/i, "").trim();
    const parsed = JSON.parse(jsonStr);
    return NextResponse.json({ ...parsed, is_food_product: true } satisfies ClassificationResult);
  } catch (err) {
    // Log the actual Anthropic error so it appears in `npm run dev` terminal
    const message = err instanceof Error ? err.message : String(err);
    const status = (err as { status?: number }).status;
    console.error(`[classify-photo] Anthropic API error — status=${status ?? "?"} message=${message}`);
    return NextResponse.json(FALLBACK);
  }
}