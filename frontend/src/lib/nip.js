// Local NIP checksum validation (mirrors backend) for instant UX feedback.
const W = [6, 5, 7, 2, 3, 4, 5, 6, 7];

export function validateNipLocal(nip) {
  const d = String(nip || "").replace(/\D/g, "");
  if (d.length !== 10) return false;
  if (d === d[0].repeat(10)) return false;
  let sum = 0;
  for (let i = 0; i < 9; i++) sum += parseInt(d[i], 10) * W[i];
  const c = sum % 11;
  if (c === 10) return false;
  return c === parseInt(d[9], 10);
}

export function formatNip(nip) {
  const d = String(nip || "").replace(/\D/g, "");
  if (d.length !== 10) return nip;
  return `${d.slice(0, 3)}-${d.slice(3, 6)}-${d.slice(6, 8)}-${d.slice(8, 10)}`;
}
