import React, { useState, useEffect } from "react";
import { toast } from "sonner";
import { CheckCircle2, XCircle, Download } from "lucide-react";
import { Modal, ModalHeader, Button, Input, Textarea, Select, Field } from "@/components/ui-kit";
import { useAppData } from "@/context/AppDataContext";
import { validateNipLocal } from "@/lib/nip";
import { CLIENT_TYPES } from "@/lib/format";

const EMPTY = { type: "Firma", name: "", nip: "", regon: "", pesel: "", street: "", postal_code: "", city: "", country: "Polska", vat_eu: "", email: "", phone: "", notes: "" };

export const ClientForm = ({ open, onClose, editing }) => {
  const { refreshClients, api } = useAppData();
  const [form, setForm] = useState(EMPTY);
  const [saving, setSaving] = useState(false);
  const [gusBusy, setGusBusy] = useState(false);

  useEffect(() => { if (open) setForm(editing ? { ...EMPTY, ...editing } : EMPTY); }, [open, editing]);
  const set = (patch) => setForm((f) => ({ ...f, ...patch }));

  const nipValid = form.nip ? validateNipLocal(form.nip) : null;

  const gusLookup = async () => {
    if (!validateNipLocal(form.nip)) { toast.error("Wpisz poprawny NIP, aby pobrać dane z GUS"); return; }
    setGusBusy(true);
    try {
      const res = (await api.post("/tools/gus-lookup", { nip: form.nip })).data;
      if (res.found) { set({ name: res.data.name, street: res.data.street, postal_code: res.data.postal_code, city: res.data.city, regon: res.data.regon }); toast.success(res.message); }
      else toast.error(res.message);
    } catch (e) { toast.error("Błąd pobierania z GUS"); }
    finally { setGusBusy(false); }
  };

  const save = async () => {
    if (!form.name) { toast.error("Podaj nazwę klienta"); return; }
    if (form.type !== "Osoba fizyczna" && form.nip && !validateNipLocal(form.nip)) { toast.error("Nieprawidłowy NIP"); return; }
    setSaving(true);
    try {
      if (editing) await api.put(`/clients/${editing.id}`, form);
      else await api.post("/clients", form);
      toast.success(editing ? "Klient zaktualizowany" : "Klient dodany");
      await refreshClients();
      onClose();
    } catch (e) { toast.error("Błąd zapisu klienta"); }
    finally { setSaving(false); }
  };

  return (
    <Modal open={open} onClose={onClose} size="lg">
      <ModalHeader title={editing ? "Edytuj klienta" : "Nowy klient"} onClose={onClose}>
        <Button onClick={save} loading={saving} data-testid="client-save-button">Zapisz</Button>
      </ModalHeader>
      <div className="max-h-[calc(100dvh-12rem)] overflow-y-auto"><div className="grid grid-cols-2 gap-3 p-5">
        <Field label="Typ"><Select value={form.type} onChange={(v) => set({ type: v })} options={CLIENT_TYPES} data-testid="client-type-select" /></Field>
        <Field label="Kraj"><Input value={form.country} onChange={(e) => set({ country: e.target.value })} /></Field>
        <Field label="Nazwa" className="col-span-2" required><Input value={form.name} onChange={(e) => set({ name: e.target.value })} data-testid="client-name-input" /></Field>
        <Field label="NIP">
          <div className="flex gap-2">
            <div className="relative flex-1">
              <Input value={form.nip} onChange={(e) => set({ nip: e.target.value })} data-testid="client-nip-input" error={nipValid === false} />
              {nipValid === true && <CheckCircle2 className="absolute right-2 top-2 h-5 w-5 text-emerald-500" />}
              {nipValid === false && <XCircle className="absolute right-2 top-2 h-5 w-5 text-rose-500" />}
            </div>
            <Button variant="outline" size="md" onClick={gusLookup} loading={gusBusy} data-testid="client-gus-lookup-button"><Download className="h-4 w-4" /> GUS</Button>
          </div>
        </Field>
        {form.type === "Osoba fizyczna" ? (
          <Field label="PESEL"><Input value={form.pesel} onChange={(e) => set({ pesel: e.target.value })} /></Field>
        ) : (
          <Field label="REGON"><Input value={form.regon} onChange={(e) => set({ regon: e.target.value })} /></Field>
        )}
        <Field label="Ulica i numer"><Input value={form.street} onChange={(e) => set({ street: e.target.value })} /></Field>
        <Field label="Kod pocztowy"><Input value={form.postal_code} onChange={(e) => set({ postal_code: e.target.value })} placeholder="00-000" /></Field>
        <Field label="Miasto"><Input value={form.city} onChange={(e) => set({ city: e.target.value })} /></Field>
        {form.type === "Zagraniczna firma" && <Field label="VAT UE"><Input value={form.vat_eu} onChange={(e) => set({ vat_eu: e.target.value })} /></Field>}
        <Field label="Email"><Input type="email" value={form.email} onChange={(e) => set({ email: e.target.value })} /></Field>
        <Field label="Telefon"><Input value={form.phone} onChange={(e) => set({ phone: e.target.value })} /></Field>
        <Field label="Notatki / uwagi" className="col-span-2"><Textarea value={form.notes} onChange={(e) => set({ notes: e.target.value })} rows={2} /></Field>
      </div></div>
    </Modal>
  );
};
