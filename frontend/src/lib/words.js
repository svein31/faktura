// Polish "kwota slownie" generator (mirrors backend core/words.py).
const JED = ["", "jeden", "dwa", "trzy", "cztery", "pięć", "sześć", "siedem", "osiem", "dziewięć", "dziesięć", "jedenaście", "dwanaście", "trzynaście", "czternaście", "piętnaście", "szesnaście", "siedemnaście", "osiemnaście", "dziewiętnaście"];
const DZIES = ["", "", "dwadzieścia", "trzydzieści", "czterdzieści", "pięćdziesiąt", "sześćdziesiąt", "siedemdziesiąt", "osiemdziesiąt", "dziewięćdziesiąt"];
const SET = ["", "sto", "dwieście", "trzysta", "czterysta", "pięćset", "sześćset", "siedemset", "osiemset", "dziewięćset"];
const GRP = [["", "", ""], ["tysiąc", "tysiące", "tysięcy"], ["milion", "miliony", "milionów"], ["miliard", "miliardy", "miliardów"]];

function forma(n, f) {
  if (n === 1) return f[0];
  const j = n % 10, d = Math.floor((n % 100) / 10);
  if (d !== 1 && j >= 2 && j <= 4) return f[1];
  return f[2];
}
function trzy(n) {
  const out = [];
  const s = Math.floor(n / 100), d = Math.floor((n % 100) / 10), j = n % 10;
  if (s) out.push(SET[s]);
  if (d === 1) out.push(JED[10 + j]);
  else { if (d) out.push(DZIES[d]); if (j) out.push(JED[j]); }
  return out.filter(Boolean).join(" ");
}
function liczba(n) {
  if (n === 0) return "zero";
  const grupy = [];
  while (n > 0) { grupy.push(n % 1000); n = Math.floor(n / 1000); }
  const parts = [];
  for (let idx = grupy.length - 1; idx >= 0; idx--) {
    const g = grupy[idx];
    if (g === 0) continue;
    if (idx === 0) parts.push(trzy(g));
    else parts.push(trzy(g) + " " + forma(g, GRP[idx]));
  }
  return parts.filter(Boolean).join(" ").trim();
}
function formaZl(n) {
  if (n === 1) return "złoty";
  const j = n % 10, d = Math.floor((n % 100) / 10);
  if (d !== 1 && j >= 2 && j <= 4) return "złote";
  return "złotych";
}

export function amountInWordsPL(amount) {
  const amt = Math.round((Number(amount) + Number.EPSILON) * 100) / 100;
  const zlote = Math.floor(amt);
  const grosze = Math.round((amt - zlote) * 100);
  return `${liczba(zlote)} ${formaZl(zlote)} ${String(grosze).padStart(2, "0")}/100`;
}
