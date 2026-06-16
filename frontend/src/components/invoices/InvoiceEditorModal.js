import React, { useState, useEffect, useMemo } from "react";
import { toast } from "sonner";
import { Plus, Trash2, ArrowUp, ArrowDown, Save, Send, AlertTriangle, CheckCircle2, XCircle, Download } from "lucide-react";
import { Modal, ModalHeader, Button, Input, Textarea, Select, Field, Checkbox, cn } from "@/components/ui-kit";
import { A4InvoicePreview } from "@/components/invoices/A4InvoicePreview";
import { useAppData } from "@/context/AppDataContext";
import { computeItems, computeVatGroups } from "@/lib/vat";
import { formatMoney, todayISO, addDaysISO, INVOICE_TYPES, PAYMENT_METHODS, PAYMENT_TERMS, CURRENCIES, VAT_RATES } from "@/lib/format";
import { amountInWordsPL } from "@/lib/words";
import { validateNipLocal } from "@/lib/nip";

const rateOptions = VAT_RATES.map((r) => ({ value: r, label: ["ZW", "NP", "OO"].includes(r) ? r : `${r}%` }));

function emptyInvoice(company) {
  const today = todayISO();
  return {
    invoice_type: "FV", number: "", issue_date: today, sale_date: today,
    payment_days: company?.default_payment_days || 14, due_date: addDaysISO(today, company?.default_payment_days || 14),
    payment_method: company?.default_payment_method || "Przelew", currency: "PLN", exchange_rate: 1,
    company_id: company?.id || "",
    buyer: { client_id: "", name: "", nip: "", street: "", postal_code: "", city: "" },
    items: [{ name: "", unit: "szt.", quantity: 1, unit_price_net: 0, vat_rate: "23" }],
    mpp: false, paragon: false, paragon_number: "", po_number: "", delivery_method: "", notes: "", status: "Szkic",
  };
}

export const InvoiceEditorModal = ({ open, onClose, editing, onSaved }) => {
  const { companies, clients, activeCompany, refreshInvoices, refreshDashboard, refreshClients, api } = useAppData();
  const [form, setForm] = useState(emptyInvoice(activeCompany));
  const [customTerm, setCustomTerm] = useState(false);
  const [saving, setSaving] = useState(false);
  const [mobileView, setMobileView] = useState("form");
  const [gusBusy, setGusBusy] = useState(false);

  useEffect(() => {
    if (open) {
      if (editing) {
        setForm({ ...emptyInvoice(activeCompany), ...editing, buyer: { ...editing.buyer } });
        setCustomTerm(!PAYMENT_TERMS.includes(editing.payment_days));
      } else {
        setForm(emptyInvoice(activeCompany));
        setCustomTerm(false);
      }
      setMobileView("form");
    }
  }, [open, editing, activeCompany]);

  const set = (patch) => setForm((f) => ({ ...f, ...patch }));
  const setBuyer = (patch) => setForm((f) => ({ ...f, buyer: { ...f.buyer, ...patch } }));

  const company = useMemo(() => companies.find((c) => c.id === form.company_id) || activeCompany, [companies, form.company_id, activeCompany]);
  const computedItems = useMemo(() => computeItems(form.items), [form.items]);
  const vat = useMemo(() => computeVatGroups(form.items), [form.items]);
  const mppAuto = vat.total_gross > 15000;

  const previewInvoice = { ...form, items: computedItems, mpp: form.mpp || mppAuto };

  const updateItem = (idx, patch) => set({ items: form.items.map((it, i) => (i === idx ? { ...it, ...patch } : it)) });
  const addItem = () => set({ items: [...form.items, { name: "", unit: "szt.", quantity: 1, unit_price_net: 0, vat_rate: "23" }] });
  const removeItem = (idx) => set({ items: form.items.filter((_, i) => i !== idx) });
  const moveItem = (idx, dir) => {
    const ni = idx + dir;
    if (ni < 0 || ni >= form.items.length) return;
    const arr = [...form.items];
    [arr[idx], arr[ni]] = [arr[ni], arr[idx]];
    set({ items: arr });
  };

  const onTermChange = (days) => {
    if (days === "custom") { setCustomTerm(true); return; }
    setCustomTerm(false);
    set({ payment_days: days, due_date: addDaysISO(form.issue_date, days) });
  };
  const onIssueChange = (d) => {
    set({ issue_date: d, due_date: customTerm ? form.due_date : addDaysISO(d, form.payment_days) });
  };
  const pickClient = (clientId) => {
    const c = clients.find((x) => x.id === clientId);
    if (c) setBuyer({ client_id: c.id, name: c.name, nip: c.nip, street: c.street, postal_code: c.postal_code, city: c.city });
  };

  const buyerNipValid = form.buyer.nip ? validateNipLocal(form.buyer.nip) : null;

  const gusLookupBuyer = async () => {
    if (!validateNipLocal(form.buyer.nip)) { toast.error("Wpisz poprawny NIP nabywcy, aby pobrać dane z GUS"); return; }
    setGusBusy(true);
    try {
      const res = (await api.post("/tools/gus-lookup", { nip: form.buyer.nip })).data;
      if (res.found) {
        setBuyer({ name: res.data.name, street: res.data.street, postal_code: res.data.postal_code, city: res.data.city });
        toast.success(res.message);
      } else {
        toast.error(res.message);
      }
    } catch { toast.error("Błąd pobierania danych z GUS"); }
    finally { setGusBusy(false); }
  };

  const validate = () => {
    if (!company) { toast.error("Brak firmy. Dodaj firmę w sekcji Moje firmy."); return false; }
    if (!form.buyer.name) { toast.error("Podaj nazwę nabywcy."); return false; }
    if (form.items.length === 0 || form.items.every((i) => !i.name)) { toast.error("Dodaj przynajmniej jedną pozycję."); return false; }
    return true;
  };

  const doSave = async (sendKsef = false) => {
    if (!validate()) return null;
    setSaving(true);
    try {
      const payload = { ...form, company_id: company.id, mpp: form.mpp || mppAuto };
      let saved;
      if (editing && editing.id) {
        saved = (await api.put(`/invoices/${editing.id}`, payload)).data;
      } else {
        saved = (await api.post("/invoices", payload)).data;
      }
      if (sendKsef) {
        const res = (await api.post(`/invoices/${saved.id}/send-ksef`)).data;
        toast.success(`Wysłano do KSeF: ${res.ksef.ksef_number}`);
      } else {
        toast.success(editing ? "Faktura zaktualizowana" : "Faktura utworzona");
      }
      await Promise.all([refreshInvoices(), refreshDashboard(), refreshClients()]);
      onSaved && onSaved(saved);
      onClose();
      return saved;
    } catch (e) {
      toast.error(e.response?.data?.detail || "Błąd zapisu faktury");
      return null;
    } finally {
      setSaving(false);
    }
  };

  if (!open) return null;

  return (
    <Modal open={open} onClose={onClose} size="full" className="h-[calc(100dvh-2rem)] sm:h-[calc(100dvh-4rem)] flex flex-col">
      <ModalHeader title={editing ? `Edycja faktury ${editing.number || ""}` : "Nowa faktura"} subtitle="Wypełnij dane — podgląd A4 aktualizuje się na żywo" onClose={onClose}>
        <Button variant="outline" onClick={() => doSave(false)} loading={saving} data-testid="invoice-editor-save-button"><Save className="h-4 w-4" /> Zapisz</Button>
        <Button onClick={() => doSave(true)} loading={saving} data-testid="invoice-editor-save-send-button"><Send className="h-4 w-4" /> Zapisz i wyślij do KSeF</Button>
      </ModalHeader>

      {/* Mobile view switch */}
      <div className="flex justify-center border-b border-slate-200 p-2 dark:border-white/10 lg:hidden">
        <div className="inline-flex rounded-lg border border-slate-200 p-0.5 dark:border-white/10">
          {[{ v: "form", l: "Formularz" }, { v: "preview", l: "Podgląd A4" }].map((m) => (
            <button key={m.v} onClick={() => setMobileView(m.v)} className={cn("rounded-md px-4 py-1.5 text-sm font-medium transition-colors", mobileView === m.v ? "bg-indigo-600 text-white" : "text-slate-500")}>{m.l}</button>
          ))}
        </div>
      </div>

      <div className="grid flex-1 min-h-0 grid-cols-1 gap-0 overflow-hidden lg:grid-cols-12">
        {/* LEFT: form */}
        <div className={cn("min-h-0 space-y-5 overflow-y-auto p-5 lg:col-span-7", mobileView === "preview" && "hidden lg:block")}>
          {/* Header fields */}
          <section className="space-y-3">
            <h3 className="text-sm font-semibold text-slate-700 dark:text-slate-200">Dane faktury</h3>
            <div className="grid grid-cols-2 gap-3 sm:grid-cols-3">
              <Field label="Typ faktury"><Select value={form.invoice_type} onChange={(v) => set({ invoice_type: v })} options={INVOICE_TYPES} data-testid="invoice-type-select" /></Field>
              <Field label="Numer (auto)"><Input value={form.number} onChange={(e) => set({ number: e.target.value })} placeholder="Auto" data-testid="invoice-number-input" /></Field>
              <Field label="Waluta"><Select value={form.currency} onChange={(v) => set({ currency: v })} options={CURRENCIES} /></Field>
              <Field label="Data wystawienia"><Input type="date" value={form.issue_date} onChange={(e) => onIssueChange(e.target.value)} data-testid="invoice-issue-date-input" /></Field>
              <Field label="Data sprzedaży"><Input type="date" value={form.sale_date} onChange={(e) => set({ sale_date: e.target.value })} /></Field>
              <Field label="Termin płatności">
                <Select value={customTerm ? "custom" : form.payment_days} onChange={onTermChange} options={[...PAYMENT_TERMS.map((d) => ({ value: d, label: `${d} dni` })), { value: "custom", label: "Własny" }]} />
              </Field>
              {customTerm && <Field label="Data płatności"><Input type="date" value={form.due_date} onChange={(e) => set({ due_date: e.target.value })} /></Field>}
              <Field label="Metoda płatności"><Select value={form.payment_method} onChange={(v) => set({ payment_method: v })} options={PAYMENT_METHODS} /></Field>
              {form.currency !== "PLN" && <Field label="Kurs NBP"><Input type="number" step="0.0001" value={form.exchange_rate} onChange={(e) => set({ exchange_rate: e.target.value })} /></Field>}
            </div>
          </section>

          {/* Seller */}
          <section className="space-y-3">
            <h3 className="text-sm font-semibold text-slate-700 dark:text-slate-200">Sprzedawca</h3>
            <Select value={form.company_id} onChange={(v) => set({ company_id: v })} options={companies.map((c) => ({ value: c.id, label: `${c.name} (NIP ${c.nip})` }))} placeholder="Wybierz firmę" data-testid="invoice-seller-select" />
          </section>

          {/* Buyer */}
          <section className="space-y-3">
            <h3 className="text-sm font-semibold text-slate-700 dark:text-slate-200">Nabywca</h3>
            <Select value={form.buyer.client_id} onChange={pickClient} options={clients.map((c) => ({ value: c.id, label: `${c.name}${c.nip ? ` (${c.nip})` : ""}` }))} placeholder="Wyszukaj klienta z listy" data-testid="invoice-buyer-select" />
            <div className="grid grid-cols-2 gap-3">
              <Field label="Nazwa" className="col-span-2"><Input value={form.buyer.name} onChange={(e) => setBuyer({ name: e.target.value })} data-testid="invoice-buyer-name-input" /></Field>
              <Field label="NIP">
                <div className="flex gap-2">
                  <div className="relative flex-1">
                    <Input value={form.buyer.nip} onChange={(e) => setBuyer({ nip: e.target.value })} error={buyerNipValid === false} />
                    {buyerNipValid === true && <CheckCircle2 className="absolute right-2 top-2 h-5 w-5 text-emerald-500 pointer-events-none" />}
                    {buyerNipValid === false && <XCircle className="absolute right-2 top-2 h-5 w-5 text-rose-500 pointer-events-none" />}
                  </div>
                  <Button variant="outline" size="md" onClick={gusLookupBuyer} loading={gusBusy} disabled={!form.buyer.nip} title="Pobierz dane z GUS"><Download className="h-4 w-4" /> GUS</Button>
                </div>
              </Field>
              <Field label="Ulica i numer"><Input value={form.buyer.street} onChange={(e) => setBuyer({ street: e.target.value })} /></Field>
              <Field label="Kod pocztowy"><Input value={form.buyer.postal_code} onChange={(e) => setBuyer({ postal_code: e.target.value })} /></Field>
              <Field label="Miasto"><Input value={form.buyer.city} onChange={(e) => setBuyer({ city: e.target.value })} /></Field>
            </div>
          </section>

          {/* Items */}
          <section className="space-y-2">
            <div className="flex items-center justify-between">
              <h3 className="text-sm font-semibold text-slate-700 dark:text-slate-200">Pozycje</h3>
              <Button size="sm" variant="secondary" onClick={addItem} data-testid="invoice-add-item-button"><Plus className="h-4 w-4" /> Dodaj pozycję</Button>
            </div>
            <div className="space-y-2">
              {form.items.map((it, idx) => {
                const ci = computedItems[idx] || {};
                return (
                  <div key={idx} className="rounded-lg border border-slate-200 p-2.5 dark:border-white/10" data-testid={`invoice-item-row-${idx}`}>
                    <div className="grid grid-cols-12 gap-2">
                      <div className="col-span-12 sm:col-span-5"><Input placeholder="Nazwa towaru/usługi" value={it.name} onChange={(e) => updateItem(idx, { name: e.target.value })} data-testid={`invoice-item-name-${idx}`} /></div>
                      <div className="col-span-3 sm:col-span-2"><Input placeholder="J.m." value={it.unit} onChange={(e) => updateItem(idx, { unit: e.target.value })} /></div>
                      <div className="col-span-4 sm:col-span-2"><Input type="number" placeholder="Ilość" value={it.quantity} onChange={(e) => updateItem(idx, { quantity: e.target.value })} data-testid={`invoice-item-qty-${idx}`} /></div>
                      <div className="col-span-5 sm:col-span-3"><Input type="number" placeholder="Cena netto" value={it.unit_price_net} onChange={(e) => updateItem(idx, { unit_price_net: e.target.value })} data-testid={`invoice-item-price-${idx}`} /></div>
                    </div>
                    <div className="mt-2 flex flex-wrap items-center gap-2">
                      <div className="w-24"><Select value={String(it.vat_rate)} onChange={(v) => updateItem(idx, { vat_rate: v })} options={rateOptions} /></div>
                      <div className="flex-1 text-right text-xs text-slate-500">
                        Netto <span className="font-mono font-medium text-slate-700 dark:text-slate-200">{formatMoney(ci.net, form.currency)}</span>
                        <span className="mx-1">·</span> VAT <span className="font-mono">{formatMoney(ci.vat, form.currency)}</span>
                        <span className="mx-1">·</span> Brutto <span className="font-mono font-medium text-indigo-600">{formatMoney(ci.gross, form.currency)}</span>
                      </div>
                      <button onClick={() => moveItem(idx, -1)} aria-label="W górę" className="rounded p-1 text-slate-400 hover:bg-slate-100 dark:hover:bg-white/10"><ArrowUp className="h-4 w-4" /></button>
                      <button onClick={() => moveItem(idx, 1)} aria-label="W dół" className="rounded p-1 text-slate-400 hover:bg-slate-100 dark:hover:bg-white/10"><ArrowDown className="h-4 w-4" /></button>
                      <button onClick={() => removeItem(idx)} aria-label="Usuń pozycję" data-testid={`invoice-item-remove-${idx}`} className="rounded p-1 text-rose-400 hover:bg-rose-50 dark:hover:bg-rose-500/10"><Trash2 className="h-4 w-4" /></button>
                    </div>
                  </div>
                );
              })}
            </div>
          </section>

          {/* VAT summary */}
          <section className="rounded-lg border border-slate-200 p-3 dark:border-white/10">
            <h3 className="mb-2 text-sm font-semibold text-slate-700 dark:text-slate-200">Podsumowanie VAT</h3>
            <table className="w-full text-sm">
              <thead><tr className="text-xs text-slate-400"><th className="text-left font-medium">Stawka</th><th className="text-right font-medium">Netto</th><th className="text-right font-medium">VAT</th><th className="text-right font-medium">Brutto</th></tr></thead>
              <tbody>
                {vat.groups.map((g) => (
                  <tr key={g.rate}><td className="py-0.5">{["ZW", "NP", "OO"].includes(g.rate) ? g.rate : `${g.rate}%`}</td><td className="py-0.5 text-right font-mono">{formatMoney(g.net, form.currency)}</td><td className="py-0.5 text-right font-mono">{formatMoney(g.vat, form.currency)}</td><td className="py-0.5 text-right font-mono">{formatMoney(g.gross, form.currency)}</td></tr>
                ))}
                <tr className="border-t border-slate-200 font-semibold dark:border-white/10"><td className="py-1">Razem</td><td className="py-1 text-right font-mono" data-testid="invoice-total-net-value">{formatMoney(vat.total_net, form.currency)}</td><td className="py-1 text-right font-mono">{formatMoney(vat.total_vat, form.currency)}</td><td className="py-1 text-right font-mono text-indigo-600" data-testid="invoice-total-gross-value">{formatMoney(vat.total_gross, form.currency)}</td></tr>
              </tbody>
            </table>
            <div className="mt-2 text-xs text-slate-500">Słownie: <span className="font-medium text-slate-700 dark:text-slate-200">{amountInWordsPL(vat.total_gross)}</span></div>
          </section>

          {/* MPP banner */}
          {mppAuto && (
            <div className="flex items-center gap-2 rounded-lg border border-amber-200 bg-amber-50 px-3 py-2 text-sm text-amber-800 dark:border-amber-400/20 dark:bg-amber-500/10 dark:text-amber-200" data-testid="invoice-mpp-banner">
              <AlertTriangle className="h-4 w-4 shrink-0" />
              Wartość brutto przekracza 15 000 PLN — wymagany mechanizm podzielonej płatności (MPP).
            </div>
          )}

          {/* Extra options */}
          <section className="space-y-3">
            <h3 className="text-sm font-semibold text-slate-700 dark:text-slate-200">Dodatkowe</h3>
            <div className="grid grid-cols-2 gap-3">
              <Field label="Nr zamówienia / PO"><Input value={form.po_number} onChange={(e) => set({ po_number: e.target.value })} /></Field>
              <Field label="Sposób dostawy"><Input value={form.delivery_method} onChange={(e) => set({ delivery_method: e.target.value })} /></Field>
            </div>
            <Field label="Uwagi / opis"><Textarea value={form.notes} onChange={(e) => set({ notes: e.target.value })} rows={2} /></Field>
            <div className="flex flex-wrap gap-4">
              <Checkbox checked={form.mpp || mppAuto} onChange={(v) => set({ mpp: v })} label="Mechanizm podzielonej płatności (MPP)" data-testid="invoice-mpp-checkbox" />
              <Checkbox checked={form.paragon} onChange={(v) => set({ paragon: v })} label="Faktura do paragonu" data-testid="invoice-paragon-checkbox" />
            </div>
            {form.paragon && <Field label="Nr paragonu"><Input value={form.paragon_number} onChange={(e) => set({ paragon_number: e.target.value })} className="max-w-xs" /></Field>}
          </section>
        </div>

        {/* RIGHT: live A4 preview */}
        <div className={cn("min-h-0 overflow-y-auto bg-slate-50 p-4 dark:bg-[#0b1220] lg:col-span-5", mobileView === "form" && "hidden lg:block")}>
          <A4InvoicePreview invoice={previewInvoice} company={company} vat={vat} />
        </div>
      </div>
    </Modal>
  );
};
