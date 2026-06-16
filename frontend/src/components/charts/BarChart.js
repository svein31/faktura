import React, { useState } from "react";
import { formatMoney } from "@/lib/format";

export const BarChart = ({ data = [], currency = "PLN" }) => {
  const [hover, setHover] = useState(null);
  const max = Math.max(1, ...data.flatMap((d) => [d.revenue || 0, d.expenses || 0]));
  return (
    <div className="w-full">
      <div className="flex h-52 items-end gap-2 sm:gap-4">
        {data.map((d, i) => (
          <div key={i} className="group relative flex flex-1 flex-col items-center gap-1"
            onMouseEnter={() => setHover(i)} onMouseLeave={() => setHover(null)}>
            <div className="flex h-44 w-full items-end justify-center gap-1">
              <div className="w-1/2 max-w-[26px] rounded-t bg-indigo-600 transition-[height] duration-300"
                style={{ height: `${((d.revenue || 0) / max) * 100}%` }} />
              <div className="w-1/2 max-w-[26px] rounded-t bg-slate-300 transition-[height] duration-300 dark:bg-slate-600"
                style={{ height: `${((d.expenses || 0) / max) * 100}%` }} />
            </div>
            <span className="text-[11px] font-medium text-slate-500 dark:text-slate-400">{d.label}</span>
            {hover === i && (
              <div className="pointer-events-none absolute bottom-full z-10 mb-1 w-max rounded-lg border border-slate-200 bg-white px-3 py-2 text-xs shadow-lg dark:border-white/10 dark:bg-slate-900">
                <div className="flex items-center gap-1.5"><span className="h-2 w-2 rounded-full bg-indigo-600" /> Przychody: <span className="font-mono font-medium">{formatMoney(d.revenue, currency)}</span></div>
                <div className="mt-0.5 flex items-center gap-1.5"><span className="h-2 w-2 rounded-full bg-slate-400" /> Wydatki: <span className="font-mono font-medium">{formatMoney(d.expenses, currency)}</span></div>
              </div>
            )}
          </div>
        ))}
      </div>
      <div className="mt-4 flex items-center justify-center gap-5 text-xs text-slate-500 dark:text-slate-400">
        <span className="flex items-center gap-1.5"><span className="h-2.5 w-2.5 rounded-sm bg-indigo-600" /> Przychody</span>
        <span className="flex items-center gap-1.5"><span className="h-2.5 w-2.5 rounded-sm bg-slate-400" /> Wydatki</span>
      </div>
    </div>
  );
};
