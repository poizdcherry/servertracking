import { readFileSync, writeFileSync, mkdirSync, existsSync } from "fs";
import { join } from "path";

const DATA_DIR = join(process.cwd(), "data");
const FP_FILE = join(DATA_DIR, "fingerprints.json");

export interface APReading {
  bssid: string;
  rssi: number;
}

interface StoredAP {
  rssi: number; // running average RSSI
  count: number; // number of samples
}

export interface Fingerprint {
  room: string;
  samples: number;
  aps: Record<string, StoredAP>;
}

function ensureDataDir() {
  if (!existsSync(DATA_DIR)) mkdirSync(DATA_DIR, { recursive: true });
}

export function loadFingerprints(): Fingerprint[] {
  ensureDataDir();
  if (!existsSync(FP_FILE)) return [];
  try {
    return JSON.parse(readFileSync(FP_FILE, "utf-8"));
  } catch {
    return [];
  }
}

export function saveFingerprints(fps: Fingerprint[]) {
  ensureDataDir();
  writeFileSync(FP_FILE, JSON.stringify(fps, null, 2));
}

// Add or update a calibration sample for a room.
// Multiple samples are averaged for better accuracy.
export function calibrate(room: string, aps: APReading[]): Fingerprint {
  const fps = loadFingerprints();
  let fp = fps.find((f) => f.room.toLowerCase() === room.toLowerCase());

  if (!fp) {
    fp = { room, samples: 0, aps: {} };
    fps.push(fp);
  }

  fp.samples++;
  for (const ap of aps) {
    const bssid = ap.bssid.toUpperCase();
    if (fp.aps[bssid]) {
      // running average
      const prev = fp.aps[bssid];
      prev.rssi = (prev.rssi * prev.count + ap.rssi) / (prev.count + 1);
      prev.count++;
    } else {
      fp.aps[bssid] = { rssi: ap.rssi, count: 1 };
    }
  }

  saveFingerprints(fps);
  return fp;
}

export function deleteFingerprint(room: string): boolean {
  const fps = loadFingerprints();
  const idx = fps.findIndex((f) => f.room.toLowerCase() === room.toLowerCase());
  if (idx < 0) return false;
  fps.splice(idx, 1);
  saveFingerprints(fps);
  return true;
}

// Weighted fingerprint matching.
// Compares a live scan against all stored fingerprints and returns the best match.
export function matchZone(scan: APReading[]): { zone: string; confidence: number } | null {
  const fps = loadFingerprints();
  if (fps.length === 0 || scan.length === 0) return null;

  // Build scan map: bssid -> rssi
  const scanMap = new Map<string, number>();
  for (const ap of scan) {
    scanMap.set(ap.bssid.toUpperCase(), ap.rssi);
  }

  let bestScore = -Infinity;
  let bestRoom: string | null = null;

  for (const fp of fps) {
    const fpBssids = Object.keys(fp.aps);
    let score = 0;
    let matchCount = 0;

    for (const bssid of fpBssids) {
      const scanRssi = scanMap.get(bssid);
      if (scanRssi !== undefined) {
        const fpRssi = fp.aps[bssid].rssi;
        const diff = Math.abs(scanRssi - fpRssi);

        // Weight: stronger signals are more reliable and stable
        const signalWeight = Math.max(0, (100 + scanRssi) / 100);

        // Score: closer RSSI = higher score, weighted by signal strength
        score += signalWeight * Math.max(0, 100 - diff * 2);
        matchCount++;
      }
    }

    // Need at least 2 matching APs for a meaningful result
    if (matchCount < 2) continue;

    // Bonus for having more AP matches (better coverage)
    const coverageBonus = matchCount / Math.max(fpBssids.length, 1);
    score *= coverageBonus;

    // Penalize if many fingerprint APs are missing from the scan
    const missingRatio = 1 - matchCount / fpBssids.length;
    score *= 1 - missingRatio * 0.3;

    if (score > bestScore) {
      bestScore = score;
      bestRoom = fp.room;
    }
  }

  if (!bestRoom || bestScore <= 0) return null;

  // Normalize confidence to 0-100
  const confidence = Math.min(100, Math.round(bestScore));
  return { zone: bestRoom, confidence };
}
