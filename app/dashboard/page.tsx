"use client";

import { useEffect, useState, useCallback } from "react";

interface FingerprintSummary {
  room: string;
  samples: number;
  ap_count: number;
}

interface DeviceStatus {
  device_id: string;
  zone: string;
  confidence: number;
  ap_count: number;
  last_seen: string;
}

export default function Dashboard() {
  const [fingerprints, setFingerprints] = useState<FingerprintSummary[]>([]);
  const [devices, setDevices] = useState<DeviceStatus[]>([]);
  const [loading, setLoading] = useState(true);
  const [deleteRoom, setDeleteRoom] = useState<string | null>(null);

  const fetchData = useCallback(async () => {
    try {
      const res = await fetch("/dashboard/api/fingerprints");
      if (res.ok) {
        const data = await res.json();
        setFingerprints(data.fingerprints ?? []);
        setDevices(data.devices ?? []);
      }
    } catch (e) {
      console.error("Failed to fetch:", e);
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    fetchData();
    const interval = setInterval(fetchData, 5000);
    return () => clearInterval(interval);
  }, [fetchData]);

  async function handleDelete(room: string) {
    if (!confirm(`Delete all fingerprint data for "${room}"?`)) return;
    setDeleteRoom(room);
    try {
      const res = await fetch("/dashboard/api/fingerprints", {
        method: "DELETE",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ room }),
      });
      if (res.ok) {
        setFingerprints((prev) => prev.filter((f) => f.room !== room));
      }
    } finally {
      setDeleteRoom(null);
    }
  }

  return (
    <main style={{ fontFamily: "sans-serif", padding: "2rem", maxWidth: 900, margin: "0 auto" }}>
      <h1>Zone Tracker Dashboard</h1>

      <section style={{ marginBottom: "2rem" }}>
        <h2>Live Devices</h2>
        {devices.length === 0 ? (
          <p style={{ color: "#888" }}>No devices reporting yet. Connect an ESP32 to see it here.</p>
        ) : (
          <table style={tableStyle}>
            <thead>
              <tr>
                <th style={thStyle}>Device</th>
                <th style={thStyle}>Zone</th>
                <th style={thStyle}>Confidence</th>
                <th style={thStyle}>APs</th>
                <th style={thStyle}>Last Seen</th>
              </tr>
            </thead>
            <tbody>
              {devices.map((d) => (
                <tr key={d.device_id}>
                  <td style={tdStyle}><code>{d.device_id}</code></td>
                  <td style={{ ...tdStyle, fontWeight: "bold", color: "#007bff" }}>{d.zone}</td>
                  <td style={tdStyle}>{d.confidence}%</td>
                  <td style={tdStyle}>{d.ap_count}</td>
                  <td style={tdStyle}>{d.last_seen}</td>
                </tr>
              ))}
            </tbody>
          </table>
        )}
      </section>

      <section>
        <h2>Calibrated Rooms ({fingerprints.length})</h2>
        {loading ? (
          <p>Loading...</p>
        ) : fingerprints.length === 0 ? (
          <p style={{ color: "#888" }}>
            No rooms calibrated yet. Use the ESP32 calibrate page (192.168.1.1/calibrate)
            to record fingerprints.
          </p>
        ) : (
          <table style={tableStyle}>
            <thead>
              <tr>
                <th style={thStyle}>Room</th>
                <th style={thStyle}>Samples</th>
                <th style={thStyle}>APs Tracked</th>
                <th style={thStyle}></th>
              </tr>
            </thead>
            <tbody>
              {fingerprints.map((fp) => (
                <tr key={fp.room}>
                  <td style={tdStyle}>{fp.room}</td>
                  <td style={tdStyle}>{fp.samples}</td>
                  <td style={tdStyle}>{fp.ap_count}</td>
                  <td style={tdStyle}>
                    <button
                      onClick={() => handleDelete(fp.room)}
                      disabled={deleteRoom === fp.room}
                      style={deleteBtnStyle}
                    >
                      {deleteRoom === fp.room ? "Deleting..." : "Delete"}
                    </button>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        )}
      </section>

      <p style={{ marginTop: "2rem", color: "#888", fontSize: "0.85em" }}>
        Auto-refreshes every 5 seconds
      </p>
    </main>
  );
}

const tableStyle: React.CSSProperties = {
  borderCollapse: "collapse",
  width: "100%",
};
const thStyle: React.CSSProperties = {
  border: "1px solid #ccc",
  padding: "8px 12px",
  textAlign: "left",
  background: "#f5f5f5",
};
const tdStyle: React.CSSProperties = {
  border: "1px solid #ccc",
  padding: "8px 12px",
};
const deleteBtnStyle: React.CSSProperties = {
  background: "#dc3545",
  color: "#fff",
  border: "none",
  padding: "4px 12px",
  borderRadius: 4,
  cursor: "pointer",
};
