// Client-side VAT computation mirroring the backend (for live invoice preview).
const NUMERIC = { "23": 0.23, "8": 0.08, "5": 0.05, "0": 0 };
const ORDER = ["23", "8", "5", "0", "ZW", "NP", "OO"];

export const round2 = (x) => Math.round((Number(x) + Number.EPSILON) * 100) / 100;

export function normalizeRate(r) {
  return String(r ?? "23").toUpperCase().replace("%", "").trim();
}

export function computeItems(items = []) {
  return items.map((it) => {
    const qty = parseFloat(it.quantity) || 0;
    const price = parseFloat(it.unit_price_net) || 0;
    const rate = normalizeRate(it.vat_rate);
    const net = round2(qty * price);
    const vat = NUMERIC[rate] !== undefined ? round2(net * NUMERIC[rate]) : 0;
    const gross = round2(net + vat);
    return { ...it, vat_rate: rate, net, vat, gross };
  });
}

export function computeVatGroups(items = []) {
  const groupNet = {};
  items.forEach((it) => {
    const qty = parseFloat(it.quantity) || 0;
    const price = parseFloat(it.unit_price_net) || 0;
    const rate = normalizeRate(it.vat_rate);
    groupNet[rate] = (groupNet[rate] || 0) + round2(qty * price);
  });
  const groups = Object.keys(groupNet)
    .sort((a, b) => (ORDER.indexOf(a) < 0 ? 99 : ORDER.indexOf(a)) - (ORDER.indexOf(b) < 0 ? 99 : ORDER.indexOf(b)))
    .map((rate) => {
      const net = round2(groupNet[rate]);
      const vat = NUMERIC[rate] !== undefined ? round2(net * NUMERIC[rate]) : 0;
      const gross = round2(net + vat);
      return { rate, net, vat, gross };
    });
  const total_net = round2(groups.reduce((s, g) => s + g.net, 0));
  const total_vat = round2(groups.reduce((s, g) => s + g.vat, 0));
  const total_gross = round2(groups.reduce((s, g) => s + g.gross, 0));
  return { groups, total_net, total_vat, total_gross, mpp_required: total_gross > 15000 };
}
