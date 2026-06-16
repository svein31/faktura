import React, { useState, useEffect, useCallback } from "react";
import { toast } from "sonner";
import { Download, FileSpreadsheet } from "lucide-react";
import { useAppData } from "@/context/AppDataContext";
import { Card, Button, Select, Tabs } from "@/components/ui-kit";
import { formatMoney } from "@/lib/format";

const YEARS = [2023, 2024, 2025, 2026];
const MONTHS = ["Styczeń", "Luty", "Marzec", "Kwiecień", "Maj", "Czerwiec", "Lipiec", "Sierpień", "Wrzesień", "Październik", "Listopad", "Grudzień"];

function downloadCSV(filename, rows) {
  const csv = rows.map((r) => r.map((c) => `"${String(c ?? "").replace(/"/g, '""')}"`).join(";")).join("\n");
  const blob = new Blob(["﻿" + csv], { type: "text/csv;charset=utf-8;" });
  const url = URL.createObjectURL(blob);
  const a = document.createElement("a"); a.href = url; a.download = filename; a.click();
  URL.revokeObjectURL(url);
}

export default function Reports() {
  const { api } = useAppData();
  const [tab, setTab] = useState("revenue");
  const [year, setYear] = useState(new Date().getFullYear());
  const [month, setMonth] = useState(new Date().getMonth() + 1);
  const EMPTY_REVENUE = { rows: Array.from({ length: 12 }, (_, i) => ({ month: i + 1, month_name: MONTHS[i], net: 0, vat: 0, gross: 0, count: 0 })), totals: { net: 0, vat: 0, gross: 0, count: 0 } };
  const EMPTY_VAT = { year, month, month_name: MONTHS[month - 1], sales: [], purchases: [], vat_due: 0, vat_deductible: 0, balance: 0 };
  const EMPTY_COSTS = { categories: [], trend: Array.from({ length: 12 }, (_, i) => ({ month: i + 1, month_name: MONTHS[i], net: 0 })), total: 0 };
  const EMPTY_LEDGER = { sales: [], costs: [] };

  const [revenue, setRevenue] = useState(EMPTY_REVENUE);
  const [vat, setVat] = useState(EMPTY_VAT);
  const [costs, setCosts] = useState(EMPTY_COSTS);
  const [ledger, setLedger] = useState(EMPTY_LEDGER);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState(null);

  const load = useCallback(async () => {
    setLoading(true);
    setError(null);
    try {
      if (tab === "revenue") setRevenue((await api.get(`/reports/revenue?year=${year}`)).data || EMPTY_REVENUE);
      if (tab === "vat") setVat((await api.get(`/reports/vat?year=${year}&month=${month}`)).data || EMPTY_VAT);
      if (tab === "costs") setCosts((await api.get(`/reports/costs?year=${year}`)).data || EMPTY_COSTS);
      if (tab === "ledger") setLedger((await api.get(`/reports/ledger?year=${year}&month=${month}`)).data || EMPTY_LEDGER);
    } catch (e) {
      console.error("Reports load error:", e);
      setError("Nie udało się załadować raportu. Sprawdź połączenie z serwerem.");
      toast.error("Błąd ładowania raportu");
    } finally {
      setLoading(false);
    }
  }, [api, tab, year, month]);

  useEffect(() => { load(); }, [load]);

  const rateLabel = (r) => (["ZW", "NP", "OO"].includes(r) ? r : `${r}%`);

  return (
    <div className="space-y-5 animate-in fade-in-0 duration-200">
      <h1 className="text-2xl font-semibold tracking-tight text-slate-900 dark:text-slate-100">Raporty</h1>

      <div className="flex flex-wrap items-center justify-between gap-3">
        <Tabs value={tab} onChange={setTab} tabs={[{ value: "revenue", label: "Przychody" }, { value: "vat", label: "VAT (JPK-V7)" }, { value: "costs", label: "Koszty" }, { value: "ledger", label: "Zestawienie" }]} />
        <div className="flex items-center gap-2">
          <div className="w-28"><Select value={year} onChange={setYear} options={YEARS.map((y) => ({ value: y, label: String(y) }))} /></div>
          {(tab === "vat" || tab === "ledger") && <div className="w-36"><Select value={month} onChange={setMonth} options={MONTHS.map((m, i) => ({ value: i + 1, label: m }))} /></div>}
        </div>
      </div>

      {/* Loading */}
      {loading && (
        <Card className="flex items-center justify-center gap-3 p-12 text-slate-500 dark:text-slate-400">
          <svg className="h-5 w-5 animate-spin" viewBox="0 0 24 24" fill="none"><circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" /><path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4z" /></svg>
          Ładowanie raportu…
        </Card>
      )}

      {/* Error */}
      {!loading && error && (
        <Card className="p-8 text-center">
          <div className="mb-3 text-4xl">⚠️</div>
          <p className="text-sm font-medium text-slate-700 dark:text-slate-200">{error}</p>
          <p className="mt-1 text-xs text-slate-500 dark:text-slate-400">Upewnij się, że backend (serwer API) jest uruchomiony i dostępny.</p>
          <Button variant="outline" size="sm" className="mt-4" onClick={load}>Spróbuj ponownie</Button>
        </Card>
      )}

      {/* Revenue */}
      {!loading && !error && tab === "revenue" && revenue && (
        <Card className="overflow-hidden">
          <div className="flex items-center justify-between border-b border-slate-200 px-5 py-3 dark:border-white/10">
            <h2 className="text-sm font-semibold text-slate-700 dark:text-slate-200">Przychody {year}</h2>
            <Button size="sm" variant="outline" onClick={() => downloadCSV(`przychody_${year}.csv`, [["Miesiąc", "Netto", "VAT", "Brutto", "Liczba"], ...revenue.rows.map((r) => [r.month_name, r.net, r.vat, r.gross, r.count]), ["RAZEM", revenue.totals.net, revenue.totals.vat, revenue.totals.gross, revenue.totals.count]])} data-testid="report-export-revenue"><FileSpreadsheet className="h-4 w-4" /> Eksport CSV</Button>
          </div>
          <table className="w-full text-sm">
            <thead><tr className="text-left text-xs text-slate-500"><th className="px-5 py-2 font-medium">Miesiąc</th><th className="px-2 py-2 text-right font-medium">Netto</th><th className="px-2 py-2 text-right font-medium">VAT</th><th className="px-2 py-2 text-right font-medium">Brutto</th><th className="px-5 py-2 text-right font-medium">Faktur</th></tr></thead>
            <tbody>
              {revenue.rows.map((r, idx) => (
                <tr key={r.month} className={idx % 2 ? "bg-slate-50/60 dark:bg-white/5" : ""}><td className="px-5 py-2 text-slate-600 dark:text-slate-300">{r.month_name}</td><td className="px-2 py-2 text-right font-mono">{formatMoney(r.net)}</td><td className="px-2 py-2 text-right font-mono text-slate-500">{formatMoney(r.vat)}</td><td className="px-2 py-2 text-right font-mono">{formatMoney(r.gross)}</td><td className="px-5 py-2 text-right font-mono">{r.count}</td></tr>
              ))}
              <tr className="border-t border-slate-200 font-semibold dark:border-white/10"><td className="px-5 py-2.5">Razem rok</td><td className="px-2 py-2.5 text-right font-mono">{formatMoney(revenue.totals.net)}</td><td className="px-2 py-2.5 text-right font-mono">{formatMoney(revenue.totals.vat)}</td><td className="px-2 py-2.5 text-right font-mono text-indigo-600">{formatMoney(revenue.totals.gross)}</td><td className="px-5 py-2.5 text-right font-mono">{revenue.totals.count}</td></tr>
            </tbody>
          </table>
        </Card>
      )}

      {/* VAT */}
      {!loading && !error && tab === "vat" && vat && (
        <div className="space-y-4">
          <Card className="p-3 text-xs text-slate-500 dark:text-slate-400">Dane pomocnicze do JPK-V7 — wygeneruj oficjalny plik w systemie Ministerstwa Finansów.</Card>
          <div className="grid grid-cols-1 gap-4 lg:grid-cols-2">
            <Card className="overflow-hidden">
              <div className="border-b border-slate-200 px-5 py-3 text-sm font-semibold text-slate-700 dark:border-white/10 dark:text-slate-200">Sprzedaż — {vat.month_name} {vat.year}</div>
              <table className="w-full text-sm"><thead><tr className="text-left text-xs text-slate-500"><th className="px-5 py-2 font-medium">Stawka</th><th className="px-2 py-2 text-right font-medium">Podstawa</th><th className="px-5 py-2 text-right font-medium">VAT</th></tr></thead><tbody>{vat.sales.length === 0 ? <tr><td colSpan={3} className="px-5 py-4 text-center text-slate-400">Brak</td></tr> : vat.sales.map((r) => <tr key={r.rate}><td className="px-5 py-2">{rateLabel(r.rate)}</td><td className="px-2 py-2 text-right font-mono">{formatMoney(r.net)}</td><td className="px-5 py-2 text-right font-mono">{formatMoney(r.vat)}</td></tr>)}</tbody></table>
            </Card>
            <Card className="overflow-hidden">
              <div className="border-b border-slate-200 px-5 py-3 text-sm font-semibold text-slate-700 dark:border-white/10 dark:text-slate-200">Zakupy — {vat.month_name} {vat.year}</div>
              <table className="w-full text-sm"><thead><tr className="text-left text-xs text-slate-500"><th className="px-5 py-2 font-medium">Stawka</th><th className="px-2 py-2 text-right font-medium">Podstawa</th><th className="px-5 py-2 text-right font-medium">VAT do odlicz.</th></tr></thead><tbody>{vat.purchases.length === 0 ? <tr><td colSpan={3} className="px-5 py-4 text-center text-slate-400">Brak</td></tr> : vat.purchases.map((r) => <tr key={r.rate}><td className="px-5 py-2">{rateLabel(r.rate)}</td><td className="px-2 py-2 text-right font-mono">{formatMoney(r.net)}</td><td className="px-5 py-2 text-right font-mono">{formatMoney(r.vat)}</td></tr>)}</tbody></table>
            </Card>
          </div>
          <Card className="flex flex-wrap items-center justify-around gap-4 p-5">
            <div className="text-center"><div className="text-xs text-slate-500">VAT należny</div><div className="font-mono text-xl font-semibold">{formatMoney(vat.vat_due)}</div></div>
            <div className="text-center"><div className="text-xs text-slate-500">VAT naliczony</div><div className="font-mono text-xl font-semibold">{formatMoney(vat.vat_deductible)}</div></div>
            <div className="text-center"><div className="text-xs text-slate-500">{vat.balance >= 0 ? "Do zapłaty" : "Do zwrotu"}</div><div className={`font-mono text-2xl font-bold ${vat.balance >= 0 ? "text-rose-600" : "text-emerald-600"}`}>{formatMoney(Math.abs(vat.balance))}</div></div>
          </Card>
        </div>
      )}

      {/* Costs */}
      {!loading && !error && tab === "costs" && costs && (
        <div className="grid grid-cols-1 gap-4 lg:grid-cols-2">
          <Card className="overflow-hidden">
            <div className="flex items-center justify-between border-b border-slate-200 px-5 py-3 dark:border-white/10"><h2 className="text-sm font-semibold text-slate-700 dark:text-slate-200">Koszty wg kategorii {year}</h2><Button size="sm" variant="outline" onClick={() => downloadCSV(`koszty_${year}.csv`, [["Kategoria", "Netto"], ...costs.categories.map((c) => [c.category, c.net])])}><Download className="h-4 w-4" /> CSV</Button></div>
            <table className="w-full text-sm"><tbody>{costs.categories.map((c, idx) => <tr key={c.category} className={idx % 2 ? "bg-slate-50/60 dark:bg-white/5" : ""}><td className="px-5 py-2 text-slate-600 dark:text-slate-300">{c.category}</td><td className="px-5 py-2 text-right font-mono">{formatMoney(c.net)}</td></tr>)}<tr className="border-t border-slate-200 font-semibold dark:border-white/10"><td className="px-5 py-2.5">Razem</td><td className="px-5 py-2.5 text-right font-mono text-indigo-600">{formatMoney(costs.total)}</td></tr></tbody></table>
          </Card>
          <Card className="p-5">
            <h2 className="mb-3 text-sm font-semibold text-slate-700 dark:text-slate-200">Trend miesięczny</h2>
            <div className="flex h-48 items-end gap-1">
              {costs.trend.map((m) => { const max = Math.max(1, ...costs.trend.map((x) => x.net)); return <div key={m.month} className="flex flex-1 flex-col items-center gap-1"><div className="flex h-40 w-full items-end"><div className="w-full rounded-t bg-slate-400 dark:bg-slate-600" style={{ height: `${(m.net / max) * 100}%` }} title={`${m.month_name}: ${formatMoney(m.net)}`} /></div><span className="text-[9px] text-slate-400">{m.month}</span></div>; })}
            </div>
          </Card>
        </div>
      )}

      {/* Ledger */}
      {!loading && !error && tab === "ledger" && ledger && (
        <div className="space-y-4">
          <Card className="overflow-hidden">
            <div className="flex items-center justify-between border-b border-slate-200 px-5 py-3 dark:border-white/10"><h2 className="text-sm font-semibold text-slate-700 dark:text-slate-200">Sprzedaż</h2><Button size="sm" variant="outline" onClick={() => downloadCSV(`sprzedaz_${year}_${month}.csv`, [["Numer", "Data", "Klient", "Netto", "VAT", "Brutto", "Status"], ...ledger.sales.map((s) => [s.number, s.date, s.client, s.net, s.vat, s.gross, s.status])])}><FileSpreadsheet className="h-4 w-4" /> CSV</Button></div>
            <div className="overflow-x-auto"><table className="w-full text-sm"><thead><tr className="text-left text-xs text-slate-500"><th className="px-5 py-2 font-medium">Numer</th><th className="px-2 py-2 font-medium">Data</th><th className="px-2 py-2 font-medium">Klient</th><th className="px-2 py-2 text-right font-medium">Netto</th><th className="px-5 py-2 text-right font-medium">Brutto</th></tr></thead><tbody>{ledger.sales.length === 0 ? <tr><td colSpan={5} className="px-5 py-4 text-center text-slate-400">Brak</td></tr> : ledger.sales.map((s, idx) => <tr key={idx} className={idx % 2 ? "bg-slate-50/60 dark:bg-white/5" : ""}><td className="px-5 py-2 font-mono text-xs">{s.number}</td><td className="px-2 py-2 text-slate-500">{s.date}</td><td className="px-2 py-2">{s.client}</td><td className="px-2 py-2 text-right font-mono">{formatMoney(s.net)}</td><td className="px-5 py-2 text-right font-mono">{formatMoney(s.gross)}</td></tr>)}</tbody></table></div>
          </Card>
          <Card className="overflow-hidden">
            <div className="flex items-center justify-between border-b border-slate-200 px-5 py-3 dark:border-white/10"><h2 className="text-sm font-semibold text-slate-700 dark:text-slate-200">Koszty</h2><Button size="sm" variant="outline" onClick={() => downloadCSV(`koszty_${year}_${month}.csv`, [["Numer", "Data", "Dostawca", "Kategoria", "Netto", "Brutto"], ...ledger.costs.map((s) => [s.number, s.date, s.supplier, s.category, s.net, s.gross])])}><FileSpreadsheet className="h-4 w-4" /> CSV</Button></div>
            <div className="overflow-x-auto"><table className="w-full text-sm"><thead><tr className="text-left text-xs text-slate-500"><th className="px-5 py-2 font-medium">Numer</th><th className="px-2 py-2 font-medium">Data</th><th className="px-2 py-2 font-medium">Dostawca</th><th className="px-2 py-2 text-right font-medium">Netto</th><th className="px-5 py-2 text-right font-medium">Brutto</th></tr></thead><tbody>{ledger.costs.length === 0 ? <tr><td colSpan={5} className="px-5 py-4 text-center text-slate-400">Brak</td></tr> : ledger.costs.map((s, idx) => <tr key={idx} className={idx % 2 ? "bg-slate-50/60 dark:bg-white/5" : ""}><td className="px-5 py-2 font-mono text-xs">{s.number}</td><td className="px-2 py-2 text-slate-500">{s.date}</td><td className="px-2 py-2">{s.supplier}</td><td className="px-2 py-2 text-right font-mono">{formatMoney(s.net)}</td><td className="px-5 py-2 text-right font-mono">{formatMoney(s.gross)}</td></tr>)}</tbody></table></div>
          </Card>
        </div>
      )}
    </div>
  );
}
