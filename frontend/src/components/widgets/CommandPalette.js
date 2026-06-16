import React, { useState, useEffect, useMemo } from "react";
import { createPortal } from "react-dom";
import { useNavigate } from "react-router-dom";
import { Search, FilePlus2, ReceiptText, UserPlus, Moon, Languages, FileText, CornerDownLeft } from "lucide-react";
import { useTheme } from "@/context/ThemeContext";
import { useI18n } from "@/lib/i18n";
import { useAppData } from "@/context/AppDataContext";
import { formatMoney } from "@/lib/format";

export const CommandPalette = ({ open, onClose, onOpen }) => {
  const navigate = useNavigate();
  const { toggleTheme } = useTheme();
  const { lang, setLanguage } = useI18n();
  const { invoices } = useAppData();
  const [q, setQ] = useState("");

  useEffect(() => {
    const handler = (e) => {
      if ((e.ctrlKey || e.metaKey) && e.key.toLowerCase() === "k") {
        e.preventDefault();
        open ? onClose() : onOpen();
      } else if (e.key === "Escape" && open) {
        e.preventDefault();
        onClose();
      }
    };
    window.addEventListener("keydown", handler);
    return () => window.removeEventListener("keydown", handler);
  }, [open, onClose, onOpen]);

  useEffect(() => { if (open) setQ(""); }, [open]);

  const actions = useMemo(() => [
    { id: "new-invoice", label: "Nowa faktura", icon: FilePlus2, run: () => navigate("/invoices", { state: { openNew: true, ts: Date.now() } }) },
    { id: "new-expense", label: "Nowy wydatek", icon: ReceiptText, run: () => navigate("/expenses", { state: { openNew: true, ts: Date.now() } }) },
    { id: "new-client", label: "Nowy klient", icon: UserPlus, run: () => navigate("/clients", { state: { openNew: true, ts: Date.now() } }) },
    { id: "theme", label: "Przełącz tryb ciemny / jasny", icon: Moon, run: () => toggleTheme() },
    { id: "lang", label: "Przełącz język PL / EN", icon: Languages, run: () => setLanguage(lang === "pl" ? "en" : "pl") },
  ], [navigate, toggleTheme, setLanguage, lang]);

  const filteredActions = actions.filter((a) => a.label.toLowerCase().includes(q.toLowerCase()));
  const matchedInvoices = q.length > 0
    ? invoices.filter((i) => `${i.number} ${i.buyer?.name || ""}`.toLowerCase().includes(q.toLowerCase())).slice(0, 5)
    : [];

  const exec = (fn) => { onClose(); setTimeout(fn, 10); };

  if (!open) return null;
  return createPortal(
    <div className="fixed inset-0 z-[70] flex items-start justify-center bg-slate-900/50 p-4 pt-[12vh] backdrop-blur-sm animate-in fade-in-0 duration-150" onMouseDown={onClose}>
      <div className="w-full max-w-xl overflow-hidden rounded-2xl border border-slate-200 bg-white shadow-2xl animate-in fade-in-0 slide-in-from-bottom-1 duration-200 dark:border-white/10 dark:bg-slate-900" onMouseDown={(e) => e.stopPropagation()}>
        <div className="flex items-center gap-2 border-b border-slate-200 px-4 dark:border-white/10">
          <Search className="h-4 w-4 text-slate-400" />
          <input
            autoFocus value={q} onChange={(e) => setQ(e.target.value)} data-testid="command-palette-input"
            placeholder="Wpisz komendę lub szukaj faktury..."
            className="h-12 w-full bg-transparent text-sm text-slate-800 outline-none placeholder:text-slate-400 dark:text-slate-100"
          />
          <kbd className="rounded border border-slate-200 px-1.5 text-[10px] text-slate-400 dark:border-white/15">ESC</kbd>
        </div>
        <div className="max-h-80 overflow-y-auto p-2">
          <div className="px-2 py-1 text-[11px] font-semibold uppercase tracking-wide text-slate-400">Akcje</div>
          {filteredActions.map((a) => {
            const Icon = a.icon;
            return (
              <button key={a.id} onClick={() => exec(a.run)} data-testid={`command-${a.id}`}
                className="flex w-full items-center gap-3 rounded-lg px-3 py-2 text-left text-sm text-slate-700 transition-colors hover:bg-indigo-50 dark:text-slate-200 dark:hover:bg-white/10">
                <Icon className="h-4 w-4 text-slate-400" />
                <span className="flex-1">{a.label}</span>
                <CornerDownLeft className="h-3.5 w-3.5 text-slate-300" />
              </button>
            );
          })}
          {matchedInvoices.length > 0 && (
            <>
              <div className="mt-2 px-2 py-1 text-[11px] font-semibold uppercase tracking-wide text-slate-400">Faktury</div>
              {matchedInvoices.map((i) => (
                <button key={i.id} onClick={() => exec(() => navigate("/invoices", { state: { openId: i.id, ts: Date.now() } }))}
                  className="flex w-full items-center gap-3 rounded-lg px-3 py-2 text-left text-sm text-slate-700 transition-colors hover:bg-indigo-50 dark:text-slate-200 dark:hover:bg-white/10">
                  <FileText className="h-4 w-4 text-slate-400" />
                  <span className="flex-1 truncate"><span className="font-mono">{i.number}</span> · {i.buyer?.name}</span>
                  <span className="font-mono text-xs text-slate-400">{formatMoney(i.vat_summary?.total_gross, i.currency)}</span>
                </button>
              ))}
            </>
          )}
        </div>
      </div>
    </div>,
    document.body
  );
};
