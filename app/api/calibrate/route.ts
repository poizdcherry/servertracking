import { NextRequest, NextResponse } from "next/server";
import { authenticate } from "../route";
import { calibrate } from "@/lib/store";

export async function POST(request: NextRequest) {
  if (!authenticate(request)) {
    return NextResponse.json({ error: "unauthorized" }, { status: 401 });
  }

  const data = await request.json().catch(() => null);
  if (!data) {
    return NextResponse.json({ error: "invalid json" }, { status: 400 });
  }

  const { room, aps } = data;
  if (typeof room !== "string" || !room.trim()) {
    return NextResponse.json({ error: "missing room name" }, { status: 400 });
  }
  if (!Array.isArray(aps) || aps.length === 0) {
    return NextResponse.json({ error: "missing aps array" }, { status: 400 });
  }

  const fp = calibrate(room.trim(), aps);
  console.log(
    `[CALIBRATE] ${room} | ${aps.length} APs | sample #${fp.samples} | total APs tracked: ${Object.keys(fp.aps).length}`
  );

  return NextResponse.json({
    status: "ok",
    room: fp.room,
    samples: fp.samples,
    ap_count: Object.keys(fp.aps).length,
  });
}
