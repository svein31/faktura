import React from "react";
import { Card, cn } from "@/components/ui-kit";

const ACCENTS = {
  indigo: "bg-indigo-50 text-indigo-600 dark:bg-indigo-500/10 dark:text-indigo-300",
  emerald: "bg-emerald-50 text-emerald-600 dark:bg-emerald-500/10 dark:text-emerald-300",
  amber: "bg-amber-50 text-amber-600 dark:bg-amber-500/10 dark:text-amber-300",
  slate: "bg-slate-100 text-slate-600 dark:bg-white/10 dark:text-slate-300",
  rose: "bg-rose-50 text-rose-600 dark:bg-rose-500/10 dark:text-rose-300",
};

export const KpiCard = ({ icon: Icon, label, value, accent = "indigo", sub, testId }) => (
  <Card className="p-4 sm:p-5">
    <div className="flex items-center justify-between">
      <span className="text-xs font-medium text-slate-500 dark:text-slate-400">{label}</span>
      <span className={cn("flex h-8 w-8 items-center justify-center rounded-lg", ACCENTS[accent])}>
        <Icon className="h-4 w-4" />
      </span>
    </div>
    <div data-testid={testId} className="mt-2 font-mono text-2xl font-semibold tabular-nums text-slate-900 dark:text-slate-100">{value}</div>
    {sub && <div className="mt-1 text-xs text-slate-400">{sub}</div>}
  </Card>
);
