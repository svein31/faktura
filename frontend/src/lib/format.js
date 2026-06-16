// Polish-aware formatting helpers

export function formatMoney(amount, currency = "PLN") {
  const n = Number(amount || 0);
  try {
    return new Intl.NumberFormat("pl-PL", { style: "currency", currency, minimumFractionDigits: 2 }).format(n);
  } catch (e) {
    return `${n.toFixed(2)} ${currency}`;
  }
}

export function formatNumber(amount, decimals = 2) {
  return new Intl.NumberFormat("pl-PL", { minimumFractionDigits: decimals, maximumFractionDigits: decimals }).format(Number(amount || 0));
}

export function formatDate(d) {
  if (!d) return "—";
  const s = String(d).slice(0, 10);
  const parts = s.split("-");
  if (parts.length === 3) return `${parts[2]}.${parts[1]}.${parts[0]}`;
  return s;
}

export function todayISO() {
  return new Date().toISOString().slice(0, 10);
}

export function addDaysISO(baseISO, days) {
  const d = baseISO ? new Date(baseISO) : new Date();
  d.setDate(d.getDate() + Number(days || 0));
  return d.toISOString().slice(0, 10);
}

export function daysUntil(dateISO) {
  if (!dateISO) return null;
  const d = new Date(String(dateISO).slice(0, 10));
  const t = new Date(new Date().toISOString().slice(0, 10));
  return Math.round((d - t) / 86400000);
}

export const CURRENCIES = ["PLN", "EUR", "USD", "GBP"];
export const VAT_RATES = ["23", "8", "5", "0", "ZW", "NP", "OO"];
export const PAYMENT_METHODS = ["Przelew", "Gotówka", "Karta", "BLIK"];
export const PAYMENT_TERMS = [7, 14, 21, 30, 60];
export const INVOICE_TYPES = [
  { value: "FV", label: "FV — standardowa" },
  { value: "FVKOR", label: "FVKOR — korygująca" },
  { value: "PRO", label: "PRO — proforma" },
  { value: "FZA", label: "FZA — zaliczkowa" },
];
export const INVOICE_STATUSES = ["Szkic", "Wystawiona", "Wysłana", "Zapłacona", "Przeterminowana", "Anulowana"];
export const EXPENSE_CATEGORIES = ["Usługi", "Sprzęt IT", "Paliwo", "Wynajem biura", "Telefon/Internet", "Marketing", "Delegacje", "Szkolenia", "Inne"];
export const EXPENSE_STATUSES = ["Oczekuje", "Zapłacona", "Zakwestionowana"];
export const TAX_FORMS = ["Zasady ogólne (skala)", "Podatek liniowy 19%", "Ryczałt", "Karta podatkowa"];
export const VAT_STATUSES = ["Czynny podatnik VAT", "Zwolniony z VAT", "VAT UE"];
export const CLIENT_TYPES = ["Firma", "Osoba fizyczna", "Zagraniczna firma"];
