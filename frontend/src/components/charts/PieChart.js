import React from "react";
import { formatMoney } from "@/lib/format";

const COLORS = ["#4f46e5", "#10b981", "#f59e0b", "#0ea5e9", "#f43f5e", "#8b5cf6", "#64748b"];

export const PieChart = ({ data = [], currency = "PLN" }) => {
  const total = data.reduce((s, d) => s + (d.value || 0), 0);
  const r = 42, C = 2 * Math.PI * r;
  let acc = 0;
  if (!total) {
    return (
      <div className="flex flex-col items-center justify-center py-6 text-sm text-slate-400">
        <svg viewBox="0 0 100 100" className="h-32 w-32">
          <circle cx="50" cy="50" r={r} fill="none" stroke="currentColor" strokeWidth="12" className="text-slate-200 dark:text-white/10" />
        </svg>
        <span className="mt-2">Brak danych</span>
      </div>
    );
  }
  return (
    <div className="flex flex-col items-center gap-4 sm:flex-row">
      <svg viewBox="0 0 100 100" className="h-36 w-36 -rotate-90">
        {data.map((d, i) => {
          const frac = (d.value || 0) / total;
          const dash = frac * C;
          const seg = (
            <circle key={i} cx="50" cy="50" r={r} fill="none" stroke={COLORS[i % COLORS.length]} strokeWidth="12"
              strokeDasharray={`${dash} ${C - dash}`} strokeDashoffset={-acc} />
          );
          acc += dash;
          return seg;
        })}
        <circle cx="50" cy="50" r="28" className="fill-white dark:fill-slate-900" />
      </svg>
      <div className="w-full space-y-1.5">
        {data.slice(0, 6).map((d, i) => (
          <div key={i} className="flex items-center justify-between gap-2 text-xs">
            <span className="flex min-w-0 items-center gap-1.5">
              <span className="h-2.5 w-2.5 shrink-0 rounded-sm" style={{ background: COLORS[i % COLORS.length] }} />
              <span className="truncate text-slate-600 dark:text-slate-300">{d.label}</span>
            </span>
            <span className="shrink-0 font-mono font-medium text-slate-700 dark:text-slate-200">{formatMoney(d.value, currency)}</span>
          </div>
        ))}
      </div>
    </div>
  );
};
