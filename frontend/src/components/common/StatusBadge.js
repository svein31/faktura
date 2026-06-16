import React from "react";
import { Badge, cn } from "@/components/ui-kit";

const MAP = {
  "Szkic": "bg-slate-100 text-slate-700 border border-slate-200 dark:bg-white/10 dark:text-slate-200 dark:border-white/10",
  "Wystawiona": "bg-indigo-50 text-indigo-700 border border-indigo-200 dark:bg-indigo-500/10 dark:text-indigo-200 dark:border-indigo-400/20",
  "Wysłana": "bg-sky-50 text-sky-700 border border-sky-200 dark:bg-sky-500/10 dark:text-sky-200 dark:border-sky-400/20",
  "Zapłacona": "bg-emerald-50 text-emerald-700 border border-emerald-200 dark:bg-emerald-500/10 dark:text-emerald-200 dark:border-emerald-400/20",
  "Przeterminowana": "bg-rose-50 text-rose-700 border border-rose-200 dark:bg-rose-500/10 dark:text-rose-200 dark:border-rose-400/20",
  "Anulowana": "bg-slate-200 text-slate-600 border border-slate-300 line-through dark:bg-white/10 dark:text-slate-400 dark:border-white/10",
  "Oczekuje": "bg-amber-50 text-amber-800 border border-amber-200 dark:bg-amber-500/10 dark:text-amber-200 dark:border-amber-400/20",
  "Zakwestionowana": "bg-rose-50 text-rose-700 border border-rose-200 dark:bg-rose-500/10 dark:text-rose-200 dark:border-rose-400/20",
};

export const StatusBadge = ({ status, className }) => (
  <Badge className={cn(MAP[status] || MAP["Szkic"], className)} data-testid="invoice-status-badge">
    {status}
  </Badge>
);
