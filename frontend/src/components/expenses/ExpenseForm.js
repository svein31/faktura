import React, { useState, useEffect, useMemo } from "react";
import { toast } from "sonner";
import { Plus, Trash2, Upload } from "lucide-react";
import { Modal, ModalHeader, Button, Input, Textarea, Select, Field } from "@/components/ui-kit";
import { useAppData } from "@/context/AppDataContext";
import { computeVatGroups } from "@/lib/vat";
import { formatMoney, todayISO, EXPENSE_CATEGORIES, EXPENSE_STATUSES, VAT_RATES } from "@/lib/format";

const rateOptions = VAT_RATES.map((r) => ({ value: r, label: ["ZW", "NP", "OO"].includes(r) ? r : `${r}%` }));
const EMPTY = () => ({
  supplier_number: "", supplier: { name: "", nip: "" }, category: "Usługi",
  issue_date: todayISO(), received_date: todayISO(),
  items: [{ name: "", unit: "szt.", quantity: 1, unit_price_net: 0, vat_rate: "23" }],
  vat_deduction: 100, status: "Oczekuje", scan: "", notes: "",
});

export const ExpenseForm = ({ open, onClose, editing }) => {
  const { refreshExpenses, refreshDashboard, api } = useAppData();
  const [form, setForm] = useState(EMPTY());
  const [saving, setSaving] = useState(false);
  useEffect(() => { if (open) setForm(editing ? { ...EMPTY(), ...editing } : EMPTY()); }, [open, editing]);
  const set = (patch) => setForm((f) => ({ ...f, ...patch }));
  const vat = useMemo(() => computeVatGroups(form.items), [form.items]);

  const updateItem = (idx, patch) => set({ items: form.items.map((it, i) => (i === idx ? { ...it, ...patch } : it)) });
  const addItem = () => set({ items: [...form.items, { name: "", unit: "szt.", quantity: 1, unit_price_net: 0, vat_rate: "23" }] });
  const removeItem = (idx) => set({ items: form.items.filter((_, i) => i !== idx) });

  const onScan = (e) => {
    const file = e.target.files?.[0];
    if (file) { set({ scan: file.name }); toast.success(`Załączono skan: ${file.name}`); }
  };

  const save = async () => {
    if (!form.supplier.name) { toast.error("Podaj nazwę dostawcy"); return; }
    setSaving(true);
    try {
      if (editing) await api.put(`/expenses/${editing.id}`, form);
      else await api.post("/expenses", form);
      toast.success(editing ? "Wydatek zaktualizowany" : "Wydatek dodany");
      await Promise.all([refreshExpenses(), refreshDashboard()]);
      onClose();
    } catch (e) { toast.error("Błąd zapisu wydatku"); }
    finally { setSaving(false); }
  };

  return (
    <Modal open={open} onClose={onClose} size="lg">
      <ModalHeader title={editing ? "Edytuj wydatek" : "Nowy wydatek"} onClose={onClose}>
        <Button onClick={save} loading={saving} data-testid="expense-save-button">Zapisz</Button>
      </ModalHeader>
      <div className="max-h-[calc(100dvh-12rem)] space-y-4 overflow-y-auto p-5">
        <div className="grid grid-cols-2 gap-3">
          <Field label="Numer faktury dostawcy" required><Input value={form.supplier_number} onChange={(e) => set({ supplier_number: e.target.value })} data-testid="expense-number-input" /></Field>
          <Field label="Kategoria"><Select value={form.category} onChange={(v) => set({ category: v })} options={EXPENSE_CATEGORIES} data-testid="expense-category-select" /></Field>
          <Field label="Dostawca" required><Input value={form.supplier.name} onChange={(e) => set({ supplier: { ...form.supplier, name: e.target.value } })} data-testid="expense-supplier-input" /></Field>
          <Field label="NIP dostawcy"><Input value={form.supplier.nip} onChange={(e) => set({ supplier: { ...form.supplier, nip: e.target.value } })} /></Field>
          <Field label="Data faktury"><Input type="date" value={form.issue_date} onChange={(e) => set({ issue_date: e.target.value })} /></Field>
          <Field label="Data wpływu"><Input type="date" value={form.received_date} onChange={(e) => set({ received_date: e.target.value })} /></Field>
          <Field label="Odliczenie VAT"><Select value={form.vat_deduction} onChange={(v) => set({ vat_deduction: v })} options={[{ value: 100, label: "100%" }, { value: 50, label: "50%" }, { value: 0, label: "0%" }]} data-testid="expense-deduction-select" /></Field>
          <Field label="Status"><Select value={form.status} onChange={(v) => set({ status: v })} options={EXPENSE_STATUSES} /></Field>
        </div>

        <div>
          <div className="mb-2 flex items-center justify-between">
            <h3 className="text-sm font-semibold text-slate-700 dark:text-slate-200">Pozycje</h3>
            <Button size="sm" variant="secondary" onClick={addItem}><Plus className="h-4 w-4" /> Dodaj pozycję</Button>
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
          <div className="mt-2 text-right text-sm text-slate-500">Razem netto <span className="font-mono font-medium text-slate-700 dark:text-slate-200">{formatMoney(vat.total_net)}</span> · VAT <span className="font-mono">{formatMoney(vat.total_vat)}</span> · brutto <span className="font-mono font-semibold text-indigo-600">{formatMoney(vat.total_gross)}</span></div>
        </div>

        <div className="grid grid-cols-2 gap-3">
          <Field label="Skan faktury (UI)">
            <label className="flex h-9 cursor-pointer items-center gap-2 rounded-lg border border-dashed border-slate-300 px-3 text-sm text-slate-500 hover:bg-slate-50 dark:border-white/15 dark:hover:bg-white/5">
              <Upload className="h-4 w-4" /> {form.scan || "Wybierz plik..."}
              <input type="file" className="hidden" onChange={onScan} />
            </label>
          </Field>
          <Field label="Notatki"><Input value={form.notes} onChange={(e) => set({ notes: e.target.value })} /></Field>
        </div>
      </div>
    </Modal>
  );
};
