import { NextRequest, NextResponse } from "next/server";
import { timingSafeEqual } from "crypto";
import { matchZone } from "@/lib/store";
import { updateDevice } from "@/lib/devices";

const API_KEY = process.env.API_KEY;

function unauthorized() {
  return NextResponse.json({ error: "unauthorized" }, { status: 401 });
}

export function authenticate(request: NextRequest): boolean {
  if (!API_KEY) return false;
  const auth = request.headers.get("authorization") ?? "";
  if (!auth.startsWith("Bearer ")) return false;
  const token = auth.slice(7);
  const tokenBuf = Buffer.from(token);
  const keyBuf = Buffer.from(API_KEY);
  if (tokenBuf.length !== keyBuf.length) return false;
  return timingSafeEqual(tokenBuf, keyBuf);
}

export async function POST(request: NextRequest) {
  if (!API_KEY) {
    console.error("API_KEY environment variable is not set");
    return NextResponse.json({ error: "server misconfigured" }, { status: 500 });
  }

  if (!authenticate(request)) return unauthorized();

  const data = await request.json().catch(() => null);
  if (!data) {
    return NextResponse.json({ error: "invalid json" }, { status: 400 });
  }

  const { device_id, aps = [], uptime_ms = 0 } = data;
  if (typeof device_id !== "string") {
    return NextResponse.json({ error: "missing device_id" }, { status: 400 });
  }

  // Match zone from scanned APs
  const result = matchZone(aps);
  const zone = result?.zone ?? "Unknown";
  const confidence = result?.confidence ?? 0;

  const apSummary = aps
    .slice(0, 5)
    .map((ap: { bssid?: string; rssi?: number }) => `${ap.bssid ?? "?"}(${ap.rssi ?? "?"})`)
    .join(", ");
  console.log(
    `[${new Date().toISOString()}] ${device_id} | zone=${zone} (${confidence}%) | aps=[${apSummary}${aps.length > 5 ? ", ..." : ""}] | uptime=${uptime_ms}ms`
  );

  updateDevice(device_id, zone, confidence, aps.length);

  return NextResponse.json({ status: "ok", zone, confidence });
}
