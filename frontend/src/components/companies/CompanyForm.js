import React, { useState, useEffect } from "react";
import { toast } from "sonner";
import { Plus, Trash2, CheckCircle2, XCircle } from "lucide-react";
import { Modal, ModalHeader, Button, Input, Select, Field, Checkbox } from "@/components/ui-kit";
import { useAppData } from "@/context/AppDataContext";
import { validateNipLocal } from "@/lib/nip";
import { TAX_FORMS, VAT_STATUSES, PAYMENT_METHODS, PAYMENT_TERMS } from "@/lib/format";

const EMPTY = {
  name: "", short_name: "", nip: "", regon: "", krs: "", street: "", postal_code: "", city: "", country_code: "PL",
  same_correspondence: true, logo: "", bank_accounts: [{ iban: "", bank: "", swift: "" }], email: "", phone: "", www: "",
  tax_form: "Podatek liniowy 19%", vat_status: "Czynny podatnik VAT", invoice_scheme: "FV/{YYYY}/{MM}/{NNN}",
  default_payment_days: 14, default_payment_method: "Przelew",
};

function schemePreview(scheme) {
  const d = new Date();
  return (scheme || "").replace("{YYYY}", d.getFullYear()).replace("{YY}", String(d.getFullYear()).slice(2))
    .replace("{MM}", String(d.getMonth() + 1).padStart(2, "0")).replace("{M}", d.getMonth() + 1)
    .replace(/\{(N+)\}/g, (m, n) => "1".padStart(n.length, "0")).replace("{TYPE}", "FV");
}

export const CompanyForm = ({ open, onClose, editing }) => {
  const { refreshCompanies, api } = useAppData();
  const [form, setForm] = useState(EMPTY);
  const [saving, setSaving] = useState(false);
  useEffect(() => { if (open) setForm(editing ? { ...EMPTY, ...editing, bank_accounts: editing.bank_accounts?.length ? editing.bank_accounts : [{ iban: "", bank: "", swift: "" }] } : EMPTY); }, [open, editing]);
  const set = (patch) => setForm((f) => ({ ...f, ...patch }));
  const nipValid = form.nip ? validateNipLocal(form.nip) : null;

  const setBank = (idx, patch) => set({ bank_accounts: form.bank_accounts.map((b, i) => (i === idx ? { ...b, ...patch } : b)) });
  const addBank = () => set({ bank_accounts: [...form.bank_accounts, { iban: "", bank: "", swift: "" }] });
  const removeBank = (idx) => set({ bank_accounts: form.bank_accounts.filter((_, i) => i !== idx) });

  const save = async () => {
    if (!form.name) { toast.error("Podaj nazwę firmy"); return; }
    if (form.nip && !validateNipLocal(form.nip)) { toast.error("Nieprawidłowy NIP"); return; }
    setSaving(true);
    try {
      if (editing) await api.put(`/companies/${editing.id}`, form);
      else await api.post("/companies", form);
      toast.success(editing ? "Firma zaktualizowana" : "Firma dodana");
      await refreshCompanies();
      onClose();
    } catch (e) { toast.error("Błąd zapisu firmy"); }
    finally { setSaving(false); }
  };

  return (
    <Modal open={open} onClose={onClose} size="lg">
      <ModalHeader title={editing ? "Edytuj firmę" : "Nowa firma"} onClose={onClose}>
        <Button onClick={save} loading={saving} data-testid="company-save-button">Zapisz</Button>
      </ModalHeader>
      <div className="max-h-[calc(100dvh-12rem)] space-y-4 overflow-y-auto p-5">
        <div className="grid grid-cols-2 gap-3">
          <Field label="Nazwa pełna" className="col-span-2" required><Input value={form.name} onChange={(e) => set({ name: e.target.value })} data-testid="company-name-input" /></Field>
          <Field label="Nazwa skrócona"><Input value={form.short_name} onChange={(e) => set({ short_name: e.target.value })} /></Field>
          <Field label="NIP">
            <div className="relative">
              <Input value={form.nip} onChange={(e) => set({ nip: e.target.value })} data-testid="company-nip-input" error={nipValid === false} />
              {nipValid === true && <CheckCircle2 className="absolute right-2 top-2 h-5 w-5 text-emerald-500" />}
              {nipValid === false && <XCircle className="absolute right-2 top-2 h-5 w-5 text-rose-500" />}
            </div>
          </Field>
          <Field label="REGON"><Input value={form.regon} onChange={(e) => set({ regon: e.target.value })} /></Field>
          <Field label="KRS"><Input value={form.krs} onChange={(e) => set({ krs: e.target.value })} /></Field>
          <Field label="Ulica i numer" className="col-span-2"><Input value={form.street} onChange={(e) => set({ street: e.target.value })} /></Field>
          <Field label="Kod pocztowy"><Input value={form.postal_code} onChange={(e) => set({ postal_code: e.target.value })} placeholder="00-000" /></Field>
          <Field label="Miasto"><Input value={form.city} onChange={(e) => set({ city: e.target.value })} /></Field>
          <Field label="Email"><Input value={form.email} onChange={(e) => set({ email: e.target.value })} /></Field>
          <Field label="Telefon"><Input value={form.phone} onChange={(e) => set({ phone: e.target.value })} /></Field>
          <Field label="Strona WWW"><Input value={form.www} onChange={(e) => set({ www: e.target.value })} /></Field>
        </div>

        <div>
          <div className="mb-2 flex items-center justify-between">
            <h3 className="text-sm font-semibold text-slate-700 dark:text-slate-200">Konta bankowe</h3>
            <Button size="sm" variant="secondary" onClick={addBank}><Plus className="h-4 w-4" /> Dodaj konto</Button>
          </div>
          <div className="space-y-2">
            {form.bank_accounts.map((b, i) => (
              <div key={i} className="grid grid-cols-12 items-center gap-2">
                <Input className="col-span-6" placeholder="IBAN" value={b.iban} onChange={(e) => setBank(i, { iban: e.target.value })} />
                <Input className="col-span-3" placeholder="Bank" value={b.bank} onChange={(e) => setBank(i, { bank: e.target.value })} />
                <Input className="col-span-2" placeholder="SWIFT" value={b.swift} onChange={(e) => setBank(i, { swift: e.target.value })} />
                <button onClick={() => removeBank(i)} aria-label="Usuń konto" className="col-span-1 rounded p-1 text-rose-400 hover:bg-rose-50 dark:hover:bg-rose-500/10"><Trash2 className="h-4 w-4" /></button>
              </div>
            ))}
          </div>
        </div>

        <div className="grid grid-cols-2 gap-3">
          <Field label="Forma opodatkowania"><Select value={form.tax_form} onChange={(v) => set({ tax_form: v })} options={TAX_FORMS} /></Field>
          <Field label="Status VAT"><Select value={form.vat_status} onChange={(v) => set({ vat_status: v })} options={VAT_STATUSES} /></Field>
          <Field label="Schemat numeracji" hint={`Podgląd: ${schemePreview(form.invoice_scheme)}`}><Input value={form.invoice_scheme} onChange={(e) => set({ invoice_scheme: e.target.value })} data-testid="company-scheme-input" /></Field>
          <Field label="Domyślny termin"><Select value={form.default_payment_days} onChange={(v) => set({ default_payment_days: v })} options={PAYMENT_TERMS.map((d) => ({ value: d, label: `${d} dni` }))} /></Field>
          <Field label="Domyślna metoda płatności"><Select value={form.default_payment_method} onChange={(v) => set({ default_payment_method: v })} options={PAYMENT_METHODS} /></Field>
        </div>
      </div>
    </Modal>
  );
};
