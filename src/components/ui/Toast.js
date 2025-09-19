"use client";

import { useEffect, useState } from "react";

export default function ToastContainer() {
  const [items, setItems] = useState([]);

  useEffect(() => {
    function onToast(e) {
      const detail = e.detail || {};
      const id = `${Date.now()}-${Math.random().toString(36).slice(2)}`;
      const entry = { id, ...detail };
      setItems((prev) => [entry, ...prev].slice(0, 5));
      setTimeout(() => {
        setItems((prev) => prev.filter((x) => x.id !== id));
      }, detail.duration || 4000);
    }
    window.addEventListener("toast", onToast);
    return () => window.removeEventListener("toast", onToast);
  }, []);

  if (items.length === 0) return null;

  return (
    <div className="fixed bottom-4 right-4 flex flex-col gap-2 z-50">
      {items.map((t) => (
        <div
          key={t.id}
          className="min-w-[260px] max-w-sm border border-slate-700 bg-slate-900/90 rounded p-3 shadow-lg"
        >
          {t.title && <div className="font-medium mb-1">{t.title}</div>}
          <div className="text-sm opacity-90">{t.message}</div>
          {t.link && (
            <a
              className="mt-2 inline-block text-xs text-blue-400 underline"
              href={t.link}
              target="_blank"
            >
              View
            </a>
          )}
        </div>
      ))}
    </div>
  );
}


