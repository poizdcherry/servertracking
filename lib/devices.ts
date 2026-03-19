// In-memory device status tracker.
// Stores the latest report from each ESP32 device.

interface DeviceEntry {
  device_id: string;
  zone: string;
  confidence: number;
  ap_count: number;
  last_seen: Date;
}

const devices = new Map<string, DeviceEntry>();

// Devices are considered stale after 60 seconds of no reports
const STALE_MS = 60_000;

export function updateDevice(
  device_id: string,
  zone: string,
  confidence: number,
  ap_count: number
) {
  devices.set(device_id, {
    device_id,
    zone,
    confidence,
    ap_count,
    last_seen: new Date(),
  });
}

export function getDevices() {
  const now = Date.now();
  const result: {
    device_id: string;
    zone: string;
    confidence: number;
    ap_count: number;
    last_seen: string;
  }[] = [];

  for (const [id, entry] of devices) {
    if (now - entry.last_seen.getTime() > STALE_MS) {
      devices.delete(id);
      continue;
    }
    const ago = Math.round((now - entry.last_seen.getTime()) / 1000);
    result.push({
      device_id: entry.device_id,
      zone: entry.zone,
      confidence: entry.confidence,
      ap_count: entry.ap_count,
      last_seen: ago < 5 ? "just now" : `${ago}s ago`,
    });
  }

  return result;
}
