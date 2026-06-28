import { NextResponse, type NextRequest } from "next/server";

// Nominatim (OpenStreetMap) — no API key, free, good Kazakhstan coverage.
// Yandex Maps JS API key is used separately for map rendering on the client.
export async function GET(request: NextRequest) {
  const q = request.nextUrl.searchParams.get("q");
  if (!q) return NextResponse.json({ error: "Missing q param" }, { status: 400 });

  const url = new URL("https://nominatim.openstreetmap.org/search");
  url.searchParams.set("q", q);
  url.searchParams.set("format", "json");
  url.searchParams.set("limit", "1");
  url.searchParams.set("accept-language", "ru");

  try {
    const res = await fetch(url.toString(), {
      headers: {
        "User-Agent": "WriteoffApp/1.0 (bahandi-burger-writeoff)",
        "Accept-Language": "ru",
      },
    });

    if (!res.ok) return NextResponse.json({ error: "Nominatim error " + res.status }, { status: 502 });

    const data = await res.json();
    if (!Array.isArray(data) || data.length === 0) {
      return NextResponse.json({ error: "not_found" }, { status: 404 });
    }

    const { lat, lon } = data[0];
    return NextResponse.json({ lat: parseFloat(lat), lng: parseFloat(lon) });
  } catch (err) {
    const msg = err instanceof Error ? err.message : String(err);
    return NextResponse.json({ error: msg }, { status: 502 });
  }
}