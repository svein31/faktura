import React, { useState } from "react";
import { Bell, AlertTriangle, CalendarClock } from "lucide-react";
import { useNavigate } from "react-router-dom";
import { useAppData } from "@/context/AppDataContext";
import { formatMoney, formatDate, daysUntil } from "@/lib/format";

export const NotificationsBell = () => {
  const { dashboard, templates } = useAppData();
  const [open, setOpen] = useState(false);
  const navigate = useNavigate();

  const overdue = dashboard?.overdue_invoices || [];
  const upcoming = dashboard?.upcoming_payments || [];
  const cyclic = (templates || []).filter((t) => t.cyclic);
  const count = overdue.length + upcoming.length + cyclic.length;

  return (
    <div className="relative">
      <button
        onClick={() => setOpen((o) => !o)} aria-label="Powiadomienia" data-testid="notifications-bell-button"
        className="relative rounded-lg p-2 text-slate-600 transition-colors hover:bg-slate-100 dark:text-slate-300 dark:hover:bg-white/10"
      >
        <Bell className="h-5 w-5" />
        {count > 0 && (
          <span className="absolute right-1 top-1 flex h-4 min-w-4 items-center justify-center rounded-full bg-rose-500 px-1 text-[10px] font-bold text-white">{count}</span>
        )}
      </button>
      {open && (
        <>
          <div className="fixed inset-0 z-40" onClick={() => setOpen(false)} />
          <div className="absolute right-0 z-50 mt-1 w-80 overflow-hidden rounded-xl border border-slate-200 bg-white shadow-lg dark:border-white/10 dark:bg-slate-900">
            <div className="border-b border-slate-100 px-4 py-2.5 text-sm font-semibold text-slate-800 dark:border-white/10 dark:text-slate-100">Powiadomienia</div>
            <div className="max-h-80 overflow-y-auto">
              {count === 0 && <div className="px-4 py-8 text-center text-sm text-slate-400">Brak nowych powiadomień</div>}
              {overdue.map((i) => (
                <button key={`o-${i.id}`} onClick={() => { setOpen(false); navigate("/invoices"); }} className="flex w-full items-start gap-3 border-b border-slate-50 px-4 py-2.5 text-left transition-colors hover:bg-slate-50 dark:border-white/5 dark:hover:bg-white/5">
                  <AlertTriangle className="mt-0.5 h-4 w-4 shrink-0 text-rose-500" />
                  <div className="min-w-0">
                    <div className="text-sm text-slate-700 dark:text-slate-200">Przeterminowana: <span className="font-mono">{i.number}</span></div>
                    <div className="text-xs text-slate-400">{i.client} · {formatMoney(i.gross, i.currency)} · termin {formatDate(i.due_date)}</div>
                  </div>
                </button>
              ))}
              {upcoming.map((i) => (
                <button key={`u-${i.id}`} onClick={() => { setOpen(false); navigate("/invoices"); }} className="flex w-full items-start gap-3 border-b border-slate-50 px-4 py-2.5 text-left transition-colors hover:bg-slate-50 dark:border-white/5 dark:hover:bg-white/5">
                  <CalendarClock className="mt-0.5 h-4 w-4 shrink-0 text-amber-500" />
                  <div className="min-w-0">
                    <div className="text-sm text-slate-700 dark:text-slate-200">Płatność za {daysUntil(i.due_date)} dni: <span className="font-mono">{i.number}</span></div>
                    <div className="text-xs text-slate-400">{i.client} · {formatMoney(i.gross, i.currency)}</div>
                  </div>
                </button>
              ))}
              {cyclic.map((t) => (
                <button key={`c-${t.id}`} onClick={() => { setOpen(false); navigate("/templates"); }} className="flex w-full items-start gap-3 border-b border-slate-50 px-4 py-2.5 text-left transition-colors hover:bg-slate-50 dark:border-white/5 dark:hover:bg-white/5">
                  <CalendarClock className="mt-0.5 h-4 w-4 shrink-0 text-indigo-500" />
                  <div className="min-w-0">
                    <div className="text-sm text-slate-700 dark:text-slate-200">Faktura cykliczna: {t.name}</div>
                    <div className="text-xs text-slate-400">{t.frequency} · gotowa do wystawienia</div>
                  </div>
                </button>
              ))}
            </div>
          </div>
        </>
      )}
    </div>
  );
};
