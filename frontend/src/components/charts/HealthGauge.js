import React from "react";

// Semi-circle gauge with 3 zones + needle. score: 0..100
export const HealthGauge = ({ score = 50, label = "Kondycja finansowa" }) => {
  const angle = -90 + (Math.min(100, Math.max(0, score)) / 100) * 180; // -90..+90
  const rad = (angle * Math.PI) / 180;
  const cx = 100, cy = 100, len = 70;
  const nx = cx + len * Math.cos((angle - 90) * Math.PI / 180);
  const ny = cy + len * Math.sin((angle - 90) * Math.PI / 180);
  const arc = (start, end, color) => {
    const s = (start * Math.PI) / 180, e = (end * Math.PI) / 180;
    const r = 82;
    const x1 = cx + r * Math.cos(s), y1 = cy + r * Math.sin(s);
    const x2 = cx + r * Math.cos(e), y2 = cy + r * Math.sin(e);
    return `M ${x1} ${y1} A ${r} ${r} 0 0 1 ${x2} ${y2}`;
  };
  const tone = score >= 66 ? "text-emerald-600" : score >= 40 ? "text-amber-600" : "text-rose-600";
  return (
    <div className="flex flex-col items-center">
      <svg viewBox="0 0 200 120" className="h-28 w-full max-w-[220px]" data-testid="financial-health-gauge">
        <path d={arc(180, 240, "")} fill="none" stroke="#f43f5e" strokeWidth="12" strokeLinecap="round" />
        <path d={arc(240, 300, "")} fill="none" stroke="#f59e0b" strokeWidth="12" />
        <path d={arc(300, 360, "")} fill="none" stroke="#10b981" strokeWidth="12" strokeLinecap="round" />
        <line x1={cx} y1={cy} x2={nx} y2={ny} stroke="currentColor" strokeWidth="3" className="text-slate-700 dark:text-slate-200" strokeLinecap="round" />
        <circle cx={cx} cy={cy} r="5" className="fill-slate-700 dark:fill-slate-200" />
      </svg>
      <div className={`-mt-2 text-2xl font-mono font-semibold ${tone}`}>{score}<span className="text-sm text-slate-400">/100</span></div>
      <div className="text-xs text-slate-500 dark:text-slate-400">{label}</div>
    </div>
  );
};
