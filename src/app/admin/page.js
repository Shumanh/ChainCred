"use client";

import { useEffect, useState } from "react";

export default function AdminPage() {
  const [logs, setLogs] = useState([]);
  const [loading, setLoading] = useState(false);
  const [bizId, setBizId] = useState("");

  async function refresh() {
    setLoading(true);
    try {
      const qs = new URLSearchParams();
      if (bizId) qs.set("bizId", bizId);
      qs.set("type", "all");
      qs.set("limit", "500");
      const res = await fetch(`/api/logs?${qs.toString()}`);
      const data = await res.json();
      const rows = [
        ...(data.issuances || []).map((x) => ({ _id: x._id, kind: "issuance", createdAt: x.createdAt, customer: x.customer, amount: x.amount, signature: x.signature })),
        ...(data.redemptions || []).map((x) => ({ _id: x._id, kind: "redemption", createdAt: x.createdAt, customer: x.customer, rewardId: x.rewardId, rewardName: x.rewardName, cost: x.cost, signature: x.signature })),
      ].sort((a, b) => new Date(b.createdAt) - new Date(a.createdAt));
      setLogs(rows);
    } finally {
      setLoading(false);
    }
  }

  useEffect(() => {
    refresh();
  }, []);

  return (
    <div className="min-h-screen p-8">
      <h1 className="text-2xl font-semibold mb-4">Admin - Logs</h1>
      <div className="flex items-center gap-2">
        <input className="border rounded px-2 py-1 bg-white text-black" placeholder="Filter by bizId (optional)" value={bizId} onChange={(e) => setBizId(e.target.value)} />
        <button className="px-3 py-1 rounded bg-slate-700" onClick={refresh} disabled={loading}>
          {loading ? "Refreshing..." : "Refresh"}
        </button>
        <button className="px-3 py-1 rounded bg-slate-700" onClick={() => downloadCsv(logs)} disabled={logs.length === 0}>Export CSV</button>
      </div>
      <div className="mt-6 flex flex-col gap-3">
        {logs.length === 0 && <div className="opacity-70">No logs yet</div>}
        {logs.map((l) => (
          <div key={l._id || l.id} className="border border-slate-700 rounded p-3 text-sm">
            <div><b>Time</b>: {new Date(l.createdAt).toLocaleString()}</div>
            <div><b>Type</b>: {l.kind}</div>
            <div><b>Customer</b>: {l.customer}</div>
            {l.kind === 'issuance' ? (
              <div><b>Amount</b>: {l.amount}</div>
            ) : (
              <>
                <div><b>Reward</b>: {l.rewardId} ({l.rewardName})</div>
                <div><b>Cost</b>: {l.cost}</div>
              </>
            )}
            {l.signature && (
              <div>
                <b>Tx</b>: <a className="text-blue-400 underline" href={`https://explorer.solana.com/tx/${l.signature}?cluster=devnet`} target="_blank">View</a>
              </div>
            )}
          </div>
        ))}
      </div>
    </div>
  );
}

function downloadCsv(rows) {
  if (!rows || rows.length === 0) return;
  const headers = ["time","type","customer","amount","rewardId","rewardName","cost","signature"];
  const lines = [headers.join(",")];
  for (const r of rows) {
    const vals = [
      new Date(r.createdAt).toISOString(),
      r.kind || "",
      r.customer || "",
      r.amount != null ? String(r.amount) : "",
      r.rewardId || "",
      r.rewardName || "",
      r.cost != null ? String(r.cost) : "",
      r.signature || "",
    ];
    lines.push(vals.map((v) => `"${String(v).replace(/"/g, '""')}"`).join(","));
  }
  const blob = new Blob([lines.join("\n")], { type: "text/csv;charset=utf-8;" });
  const url = URL.createObjectURL(blob);
  const a = document.createElement("a");
  a.href = url;
  a.download = `logs-${Date.now()}.csv`;
  a.click();
  URL.revokeObjectURL(url);
}


