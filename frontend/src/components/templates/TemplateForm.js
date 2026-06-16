import React, { useState, useEffect } from "react";
import { toast } from "sonner";
import { Plus, Trash2 } from "lucide-react";
import { Modal, ModalHeader, Button, Input, Textarea, Select, Field, Checkbox } from "@/components/ui-kit";
import { useAppData } from "@/context/AppDataContext";
import { todayISO, PAYMENT_METHODS, PAYMENT_TERMS, VAT_RATES } from "@/lib/format";

const rateOptions = VAT_RATES.map((r) => ({ value: r, label: ["ZW", "NP", "OO"].includes(r) ? r : `${r}%` }));
const EMPTY = () => ({
  name: "", company_id: "", client_id: "",
  items: [{ name: "", unit: "szt.", quantity: 1, unit_price_net: 0, vat_rate: "23" }],
  notes: "", payment_days: 14, payment_method: "Przelew",
  cyclic: false, frequency: "Miesięcznie", first_date: todayISO(),
});

export const TemplateForm = ({ open, onClose, editing }) => {
  const { companies, clients, activeCompany, refreshTemplates, api } = useAppData();
  const [form, setForm] = useState(EMPTY());
  const [saving, setSaving] = useState(false);
  useEffect(() => {
    if (open) setForm(editing ? { ...EMPTY(), ...editing } : { ...EMPTY(), company_id: activeCompany?.id || "" });
  }, [open, editing, activeCompany]);
  const set = (patch) => setForm((f) => ({ ...f, ...patch }));
  const updateItem = (idx, patch) => set({ items: form.items.map((it, i) => (i === idx ? { ...it, ...patch } : it)) });
  const addItem = () => set({ items: [...form.items, { name: "", unit: "szt.", quantity: 1, unit_price_net: 0, vat_rate: "23" }] });
  const removeItem = (idx) => set({ items: form.items.filter((_, i) => i !== idx) });

  const save = async () => {
    if (!form.name) { toast.error("Podaj nazwę szablonu"); return; }
    setSaving(true);
    try {
      if (editing) await api.put(`/templates/${editing.id}`, form);
      else await api.post("/templates", form);
      toast.success(editing ? "Szablon zaktualizowany" : "Szablon dodany");
      await refreshTemplates();
      onClose();
    } catch (e) { toast.error("Błąd zapisu szablonu"); }
    finally { setSaving(false); }
  };

  return (
    <Modal open={open} onClose={onClose} size="lg">
      <ModalHeader title={editing ? "Edytuj szablon" : "Nowy szablon"} onClose={onClose}>
        <Button onClick={save} loading={saving} data-testid="template-save-button">Zapisz</Button>
      </ModalHeader>
      <div className="max-h-[calc(100dvh-12rem)] space-y-4 overflow-y-auto p-5">
        <div className="grid grid-cols-2 gap-3">
          <Field label="Nazwa szablonu" className="col-span-2" required><Input value={form.name} onChange={(e) => set({ name: e.target.value })} data-testid="template-name-input" /></Field>
          <Field label="Firma"><Select value={form.company_id} onChange={(v) => set({ company_id: v })} options={companies.map((c) => ({ value: c.id, label: c.name }))} placeholder="Wybierz firmę" /></Field>
          <Field label="Domyślny klient"><Select value={form.client_id} onChange={(v) => set({ client_id: v })} options={clients.map((c) => ({ value: c.id, label: c.name }))} placeholder="Wybierz klienta" /></Field>
        </div>

        <div>
          <div className="mb-2 flex items-center justify-between">
            <h3 className="text-sm font-semibold text-slate-700 dark:text-slate-200">Pozycje</h3>
            <Button size="sm" variant="secondary" onClick={addItem}><Plus className="h-4 w-4" /> Dodaj</Button>
          </div>
          <div className="space-y-2">
            {form.items.map((it, idx) => (
              <div key={idx} className="grid grid-cols-12 items-center gap-2">
                <Input className="col-span-5" placeholder="Nazwa" value={it.name} onChange={(e) => updateItem(idx, { name: e.target.value })} />
                <Input className="col-span-2" type="number" placeholder="Il." value={it.quantity} onChange={(e) => updateItem(idx, { quantity: e.target.value })} />
                <Input className="col-span-3" type="number" placeholder="Cena netto" value={it.unit_price_net} onChange={(e) => updateItem(idx, { unit_price_net: e.target.value })} />
                <div className="col-span-1"><Select value={String(it.vat_rate)} onChange={(v) => updateItem(idx, { vat_rate: v })} options={rateOptions} /></div>
                <button onClick={() => removeItem(idx)} aria-label="Usuń" className="col-span-1 rounded p-1 text-rose-400 hover:bg-rose-50 dark:hover:bg-rose-500/10"><Trash2 className="h-4 w-4" /></button>
              </div>
            ))}
          </div>
        </div>

        <div className="grid grid-cols-2 gap-3">
          <Field label="Termin płatności"><Select value={form.payment_days} onChange={(v) => set({ payment_days: v })} options={PAYMENT_TERMS.map((d) => ({ value: d, label: `${d} dni` }))} /></Field>
          <Field label="Metoda płatności"><Select value={form.payment_method} onChange={(v) => set({ payment_method: v })} options={PAYMENT_METHODS} /></Field>
        </div>
        <Field label="Uwagi"><Textarea value={form.notes} onChange={(e) => set({ notes: e.target.value })} rows={2} /></Field>

        <div className="rounded-lg border border-slate-200 p-3 dark:border-white/10">
          <Checkbox checked={form.cyclic} onChange={(v) => set({ cyclic: v })} label="Faktura cykliczna" data-testid="template-cyclic-checkbox" />
          {form.cyclic && (
            <div className="mt-3 grid grid-cols-2 gap-3">
              <Field label="Częstotliwość"><Select value={form.frequency} onChange={(v) => set({ frequency: v })} options={["Miesięcznie", "Kwartalnie", "Rocznie"]} /></Field>
              <Field label="Data pierwszego wystawienia"><Input type="date" value={form.first_date} onChange={(e) => set({ first_date: e.target.value })} /></Field>
            </div>
          )}
        </div>
      </div>
    </Modal>
  );
};
