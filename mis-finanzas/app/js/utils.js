// Mis Finanzas PWA - Utils
// Portado desde FinanzApp_AmbilorLab.gs

export const MESES = ["enero", "febrero", "marzo", "abril", "mayo", "junio", "julio", "agosto", "septiembre", "octubre", "noviembre", "diciembre"];

export function texto(v) {
  return v === null || v === undefined ? "" : String(v).trim();
}

export function numero(v) {
  if (typeof v === "number") return isFinite(v) ? v : NaN;
  const s = texto(v).replace(/\$/g, "").replace(/\s/g, "");
  if (!s) return NaN;
  const limpio = /,\d{1,2}$/.test(s) ? s.replace(/\./g, "").replace(",", ".") : s.replace(/\./g, "").replace(/,/g, "");
  const n = Number(limpio);
  return isFinite(n) ? n : NaN;
}

export function decimal(v) {
  if (typeof v === "number") return isFinite(v) ? v : NaN;
  let s = texto(v).replace(/\s/g, "").replace(/^UF/i, "");
  if (!s) return NaN;
  if (s.indexOf(",") >= 0) s = s.replace(/\./g, "").replace(",", ".");
  else if (!/^\d+\.\d{1,4}$/.test(s)) s = s.replace(/\./g, "");
  const n = Number(s);
  return isFinite(n) ? n : NaN;
}

export function esSi(v) {
  const s = texto(v).toLowerCase();
  return v === true || s === "si" || s === "sí" || s === "true" || s === "1";
}

export function clp(n) {
  const v = Math.round(Number(n) || 0);
  return (v < 0 ? "−" : "") + "$" + Math.abs(v).toLocaleString("es-CL");
}

export function clpCorto(n) {
  n = Math.round(Number(n) || 0);
  if (Math.abs(n) >= 1000000) return "$" + (n / 1000000).toLocaleString("es-CL", { maximumFractionDigits: 1 }) + " M";
  if (Math.abs(n) >= 1000) return "$" + Math.round(n / 1000).toLocaleString("es-CL") + " mil";
  return clp(n);
}

export function iso(d) {
  const year = d.getFullYear();
  const month = String(d.getMonth() + 1).padStart(2, "0");
  const day = String(d.getDate()).padStart(2, "0");
  return year + "-" + month + "-" + day;
}

export function deIso(s) {
  const m = texto(s).match(/^(\d{4})-(\d{2})-(\d{2})$/);
  if (!m) return null;
  return new Date(Number(m[1]), Number(m[2]) - 1, Number(m[3]), 12, 0, 0);
}

export function fechaDe(v) {
  if (v instanceof Date && !isNaN(v)) return v;
  const s = texto(v);
  if (!s) return null;
  const isoDate = deIso(s.slice(0, 10));
  if (isoDate) return isoDate;
  const m = s.match(/^(\d{1,2})[\/-](\d{1,2})[\/-](\d{4})/);
  if (m) return new Date(Number(m[3]), Number(m[2]) - 1, Number(m[1]), 12, 0, 0);
  const d = new Date(s);
  return isNaN(d) ? null : d;
}

export function diasMes(a, m) {
  return new Date(a, m, 0).getDate();
}

export function diasEntre(a, b) {
  const da = deIso(iso(a));
  const db = deIso(iso(b));
  if (!da || !db) return 0;
  return Math.round((db - da) / 86400000);
}

export function sinTildes(t) {
  return String(t || "").toLowerCase()
    .replace(/[áàäâ]/g, "a")
    .replace(/[éèëê]/g, "e")
    .replace(/[íìïî]/g, "i")
    .replace(/[óòöô]/g, "o")
    .replace(/[úùüû]/g, "u")
    .replace(/ñ/g, "n");
}

export function hoyIso() {
  return iso(new Date());
}
