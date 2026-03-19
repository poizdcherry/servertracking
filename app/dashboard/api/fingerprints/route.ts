import { NextRequest, NextResponse } from "next/server";
import { loadFingerprints, deleteFingerprint } from "@/lib/store";
import { getDevices } from "@/lib/devices";

export async function GET() {
  const fps = loadFingerprints();
  const summary = fps.map((fp) => ({
    room: fp.room,
    samples: fp.samples,
    ap_count: Object.keys(fp.aps).length,
  }));

  return NextResponse.json({
    fingerprints: summary,
    devices: getDevices(),
  });
}

export async function DELETE(request: NextRequest) {
  const data = await request.json().catch(() => null);
  if (!data || typeof data.room !== "string") {
    return NextResponse.json({ error: "missing room" }, { status: 400 });
  }

  const deleted = deleteFingerprint(data.room);
  if (!deleted) {
    return NextResponse.json({ error: "room not found" }, { status: 404 });
  }

  return NextResponse.json({ status: "ok", deleted: data.room });
}
