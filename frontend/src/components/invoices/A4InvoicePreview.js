import React from "react";
import { formatMoney, formatDate } from "@/lib/format";
import { amountInWordsPL } from "@/lib/words";

const rateLabel = (r) => (["ZW", "NP", "OO"].includes(r) ? r : `${r}%`);

export const A4InvoicePreview = ({ invoice, company, vat, printable }) => {
  const cur = invoice.currency || "PLN";
  const seller = company || invoice.seller_snapshot || {};
  const buyer = invoice.buyer || {};
  const items = invoice.items || [];
  const bank = (seller.bank_accounts && seller.bank_accounts[0]) || {};
  const typeLabel = { FV: "FAKTURA VAT", FVKOR: "FAKTURA KORYGUJĄCA", PRO: "FAKTURA PRO FORMA", FZA: "FAKTURA ZALICZKOWA" }[invoice.invoice_type] || "FAKTURA VAT";

  return (
    <div className="rounded-xl border border-slate-200 bg-slate-100 p-3 dark:border-white/10 dark:bg-[#0b1220]">
      <div id={printable ? "a4-print-area" : undefined} data-testid="invoice-a4-preview"
        className="mx-auto w-full max-w-[640px] rounded-lg bg-white p-6 text-slate-900 shadow-sm sm:p-8" style={{ fontSize: "12px" }}>
        {/* Header */}
        <div className="flex items-start justify-between border-b-2 border-slate-800 pb-3">
          <div>
            <div className="text-xl font-bold tracking-tight">{typeLabel}</div>
            <div className="mt-0.5 font-mono text-sm font-semibold text-indigo-700">{invoice.number || "—"}</div>
          </div>
          <div className="text-right text-[11px] leading-5">
            <div>Data wystawienia: <span className="font-medium">{formatDate(invoice.issue_date)}</span></div>
            <div>Data sprzedaży: <span className="font-medium">{formatDate(invoice.sale_date)}</span></div>
            <div>Termin płatności: <span className="font-medium">{formatDate(invoice.due_date)}</span></div>
          </div>
        </div>

        {/* Parties */}
        <div className="mt-4 grid grid-cols-2 gap-4">
          <div>
            <div className="mb-1 text-[10px] font-semibold uppercase tracking-wide text-slate-400">Sprzedawca</div>
            <div className="font-semibold">{seller.name || "—"}</div>
            <div className="text-[11px] leading-5 text-slate-600">
              <div>{seller.street}</div>
              <div>{seller.postal_code} {seller.city}</div>
              <div>NIP: {seller.nip}</div>
            </div>
          </div>
          <div>
            <div className="mb-1 text-[10px] font-semibold uppercase tracking-wide text-slate-400">Nabywca</div>
            <div className="font-semibold">{buyer.name || "—"}</div>
            <div className="text-[11px] leading-5 text-slate-600">
              <div>{buyer.street}</div>
              <div>{buyer.postal_code} {buyer.city}</div>
              {buyer.nip && <div>NIP: {buyer.nip}</div>}
            </div>
          </div>
        </div>

        {/* Items */}
        <table className="mt-4 w-full border-collapse text-[10px]">
          <thead>
            <tr className="bg-slate-100 text-left">
              <th className="border border-slate-300 px-1.5 py-1">Lp</th>
              <th className="border border-slate-300 px-1.5 py-1">Nazwa</th>
              <th className="border border-slate-300 px-1.5 py-1 text-right">Il.</th>
              <th className="border border-slate-300 px-1.5 py-1">J.m.</th>
              <th className="border border-slate-300 px-1.5 py-1 text-right">Cena netto</th>
              <th className="border border-slate-300 px-1.5 py-1 text-right">VAT</th>
              <th className="border border-slate-300 px-1.5 py-1 text-right">Netto</th>
              <th className="border border-slate-300 px-1.5 py-1 text-right">Brutto</th>
            </tr>
          </thead>
          <tbody>
            {items.length === 0 && (
              <tr><td colSpan={8} className="border border-slate-300 px-1.5 py-3 text-center text-slate-400">Brak pozycji</td></tr>
            )}
            {items.map((it, i) => (
              <tr key={i}>
                <td className="border border-slate-300 px-1.5 py-1">{i + 1}</td>
                <td className="border border-slate-300 px-1.5 py-1">{it.name}</td>
                <td className="border border-slate-300 px-1.5 py-1 text-right font-mono">{it.quantity}</td>
                <td className="border border-slate-300 px-1.5 py-1">{it.unit}</td>
                <td className="border border-slate-300 px-1.5 py-1 text-right font-mono">{formatMoney(it.unit_price_net, cur)}</td>
                <td className="border border-slate-300 px-1.5 py-1 text-right">{rateLabel(it.vat_rate)}</td>
                <td className="border border-slate-300 px-1.5 py-1 text-right font-mono">{formatMoney(it.net, cur)}</td>
                <td className="border border-slate-300 px-1.5 py-1 text-right font-mono">{formatMoney(it.gross, cur)}</td>
              </tr>
            ))}
          </tbody>
        </table>

        {/* Summary */}
        <div className="mt-3 flex justify-end">
          <table className="text-[10px]">
            <thead>
              <tr className="text-slate-500"><th className="px-2 py-0.5 text-left">Stawka</th><th className="px-2 py-0.5 text-right">Netto</th><th className="px-2 py-0.5 text-right">VAT</th><th className="px-2 py-0.5 text-right">Brutto</th></tr>
            </thead>
            <tbody>
              {(vat?.groups || []).map((g, i) => (
                <tr key={i}><td className="px-2 py-0.5">{rateLabel(g.rate)}</td><td className="px-2 py-0.5 text-right font-mono">{formatMoney(g.net, cur)}</td><td className="px-2 py-0.5 text-right font-mono">{formatMoney(g.vat, cur)}</td><td className="px-2 py-0.5 text-right font-mono">{formatMoney(g.gross, cur)}</td></tr>
              ))}
              <tr className="border-t border-slate-300 font-semibold"><td className="px-2 py-1">Razem</td><td className="px-2 py-1 text-right font-mono">{formatMoney(vat?.total_net, cur)}</td><td className="px-2 py-1 text-right font-mono">{formatMoney(vat?.total_vat, cur)}</td><td className="px-2 py-1 text-right font-mono text-indigo-700">{formatMoney(vat?.total_gross, cur)}</td></tr>
            </tbody>
          </table>
        </div>

        {/* Words + payment */}
        <div className="mt-3 rounded bg-slate-50 px-3 py-2 text-[11px]">
          <span className="text-slate-500">Słownie: </span>
          <span className="font-medium">{amountInWordsPL(vat?.total_gross || 0)}</span>
        </div>
        <div className="mt-3 grid grid-cols-2 gap-4 text-[11px]">
          <div>
            <div className="text-slate-500">Forma płatności: <span className="font-medium text-slate-800">{invoice.payment_method}</span></div>
            {bank.iban && <div className="text-slate-500">Nr konta: <span className="font-mono text-slate-800">{bank.iban}</span></div>}
            {bank.bank && <div className="text-slate-500">{bank.bank}</div>}
          </div>
          {invoice.mpp && <div className="flex items-start"><span className="rounded bg-amber-100 px-2 py-1 text-[10px] font-semibold text-amber-800">mechanizm podzielonej płatności</span></div>}
        </div>
        {invoice.notes && <div className="mt-3 text-[11px] text-slate-600"><span className="text-slate-500">Uwagi: </span>{invoice.notes}</div>}
        {invoice.ksef?.ksef_number && (
          <div className="mt-3 border-t border-slate-200 pt-2 text-[10px] text-slate-500">
            Numer KSeF: <span className="font-mono text-slate-800">{invoice.ksef.ksef_number}</span>
          </div>
        )}
      </div>
    </div>
  );
};
