import { NextRequest, NextResponse } from "next/server";
import { timingSafeEqual } from "crypto";

const API_KEY = process.env.API_KEY;

function unauthorized() {
  return NextResponse.json({ error: "unauthorized" }, { status: 401 });
}

export async function POST(request: NextRequest) {
  if (!API_KEY) {
    console.error("API_KEY environment variable is not set");
    return NextResponse.json({ error: "server misconfigured" }, { status: 500 });
  }

  // --- authenticate (timing-safe) ---
  const auth = request.headers.get("authorization") ?? "";
  if (!auth.startsWith("Bearer ")) return unauthorized();

  const token = auth.slice(7);
  const tokenBuf = Buffer.from(token);
  const keyBuf = Buffer.from(API_KEY);
  if (tokenBuf.length !== keyBuf.length || !timingSafeEqual(tokenBuf, keyBuf)) {
    return unauthorized();
  }

  // --- validate payload ---
  const data = await request.json().catch(() => null);
  if (!data) {
    return NextResponse.json({ error: "invalid json" }, { status: 400 });
  }

  const { device_id, zone, top_aps = [], uptime_ms = 0 } = data;
  if (typeof device_id !== "string" || typeof zone !== "string") {
    return NextResponse.json(
      { error: "missing or invalid device_id / zone" },
      { status: 400 }
    );
  }

  // --- process (log for now — swap for a database in production) ---
  const apSummary = top_aps
    .map((ap: { bssid?: string; rssi?: number }) => `${ap.bssid ?? "?"}(${ap.rssi ?? "?"})`)
    .join(", ");
  console.log(
    `[${new Date().toISOString()}] ${device_id} | zone=${zone} | aps=[${apSummary}] | uptime=${uptime_ms}ms`
  );

  return NextResponse.json({ status: "ok" });
}
