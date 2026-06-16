import React, { useState } from "react";
import { Calculator, X } from "lucide-react";
import { Select, Input, cn } from "@/components/ui-kit";
import { formatMoney } from "@/lib/format";
import { VAT_RATES } from "@/lib/format";

export const VatCalculatorWidget = () => {
  const [open, setOpen] = useState(false);
  const [mode, setMode] = useState("net"); // net | gross
  const [amount, setAmount] = useState("");
  const [rate, setRate] = useState("23");

  const numericRate = ["23", "8", "5", "0"].includes(rate) ? parseInt(rate, 10) / 100 : 0;
  const val = parseFloat(amount) || 0;
  let net = 0, vat = 0, gross = 0;
  if (mode === "net") { net = val; vat = val * numericRate; gross = net + vat; }
  else { gross = val; net = val / (1 + numericRate); vat = gross - net; }

  return (
    <div className="fixed bottom-4 right-4 z-40 no-print">
      {open ? (
        <div className="w-72 rounded-xl border border-slate-200 bg-white shadow-xl dark:border-white/10 dark:bg-slate-900">
          <div className="flex items-center justify-between border-b border-slate-200 px-4 py-2.5 dark:border-white/10">
            <span className="flex items-center gap-2 text-sm font-semibold text-slate-800 dark:text-slate-100"><Calculator className="h-4 w-4 text-indigo-600" /> Kalkulator VAT</span>
            <button onClick={() => setOpen(false)} aria-label="Zamknij" className="rounded p-1 text-slate-400 hover:bg-slate-100 dark:hover:bg-white/10"><X className="h-4 w-4" /></button>
          </div>
          <div className="space-y-3 p-4">
            <div className="flex rounded-lg border border-slate-200 p-0.5 dark:border-white/10">
              {[{ v: "net", l: "Od netto" }, { v: "gross", l: "Od brutto" }].map((m) => (
                <button key={m.v} onClick={() => setMode(m.v)} className={cn("flex-1 rounded-md py-1 text-xs font-medium transition-colors", mode === m.v ? "bg-indigo-600 text-white" : "text-slate-500")}>{m.l}</button>
              ))}
            </div>
            <Input type="number" value={amount} onChange={(e) => setAmount(e.target.value)} placeholder="Kwota" data-testid="vat-calculator-net-input" />
            <Select value={rate} onChange={setRate} options={VAT_RATES.map((r) => ({ value: r, label: (["ZW", "NP", "OO"].includes(r) ? r : `${r}%`) }))} />
            <div className="space-y-1 rounded-lg bg-slate-50 p-3 text-sm dark:bg-white/5">
              <div className="flex justify-between"><span className="text-slate-500">Netto</span><span className="font-mono font-medium">{formatMoney(net)}</span></div>
              <div className="flex justify-between"><span className="text-slate-500">VAT</span><span className="font-mono font-medium text-amber-600">{formatMoney(vat)}</span></div>
              <div className="flex justify-between border-t border-slate-200 pt-1 dark:border-white/10"><span className="text-slate-500">Brutto</span><span className="font-mono font-semibold text-indigo-600">{formatMoney(gross)}</span></div>
            </div>
          </div>
        </div>
      ) : (
        <button onClick={() => setOpen(true)} aria-label="Kalkulator VAT" data-testid="vat-calculator-toggle-button"
          className="flex h-12 w-12 items-center justify-center rounded-full bg-indigo-600 text-white shadow-lg transition-colors hover:bg-indigo-700">
          <Calculator className="h-5 w-5" />
        </button>
      )}
    </div>
  );
};
