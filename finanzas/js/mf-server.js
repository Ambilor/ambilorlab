/* ═══════════════════════════════════════════════════════════════════════
   Mis Finanzas · Ambilor.Lab — finanzas personales en Google Sheets
   ───────────────────────────────────────────────────────────────────────
   Presupuesto por categoría, metas de ahorro, tarjetas de crédito y deudas,
   con registro rápido desde el celular (panel web).

   La planilla es la base de datos (hojas Movimientos, Categorías, Metas,
   Tarjetas, Deudas y Config). El panel web se publica como aplicación web
   "Ejecutar como: yo" y "Acceso: solo yo": solo la cuenta dueña lo abre.

   Reglas de cálculo (ver Markdown/PROYECTO_FinanzApp_AmbilorLab.md):
   - El mes parte el día de inicio configurado (por ejemplo, el día de sueldo).
   - Una compra con tarjeta en N cuotas imputa al presupuesto solo la cuota
     de cada período, durante N períodos.
   - El pago de la tarjeta NO es un gasto nuevo (la compra ya se contó).
   - El pago de una deuda sí es gasto, en la categoría "Deudas".
   - Un aporte a una meta es ahorro (no gasto); un retiro lo devuelve.
   ═══════════════════════════════════════════════════════════════════════ */

const VERSION = "2.8";   // ver CAMBIOS.md
const ESQUEMA = "1.3";

const HOJA = { MOV: "Movimientos", CAT: "Categorías", METAS: "Metas", TARJ: "Tarjetas", DEUDAS: "Deudas", FIJOS: "Fijos", CONFIG: "Config" };

const CABECERAS = {
  "Movimientos": ["ID", "Fecha", "Tipo", "Monto", "Categoría", "Medio", "Cuotas", "Meta", "Deuda", "Nota", "Registrado", "Fijo"],
  "Categorías":  ["Categoría", "Tipo", "Presupuesto", "Ícono", "Color", "Activa"],
  "Metas":       ["ID", "Meta", "Objetivo", "Fecha objetivo", "Ícono", "Activa"],
  "Tarjetas":    ["ID", "Tarjeta", "Cupo", "Día de cierre", "Día de pago", "Activa"],
  "Deudas":      ["ID", "Deuda", "Acreedor", "Cuota", "Cuotas", "Día de pago", "Inicio", "Activa", "Moneda"],
  "Fijos":       ["ID", "Fijo", "Tipo", "Monto", "Categoría", "Medio", "Día", "Activa"],
  "Config":      ["Clave", "Valor", "Descripción"],
};

// Tipos de movimiento
const TIPOS = ["Gasto", "Ingreso", "Ahorro", "Retiro de meta", "Pago tarjeta", "Pago deuda"];
const MEDIOS_BASE = ["Efectivo", "Débito", "Transferencia"];
const CAT_DEUDAS = "Deudas";

// Categorías de partida (el usuario las edita en el panel)
const CATEGORIAS_BASE = [
  ["Supermercado", "Gasto", 0, "ti-shopping-cart", "#2E9E5B"],
  ["Casa", "Gasto", 0, "ti-home", "#1F5C99"],
  ["Servicios", "Gasto", 0, "ti-bolt", "#C47A1C"],
  ["Transporte", "Gasto", 0, "ti-car", "#6A5BC7"],
  ["Comida fuera", "Gasto", 0, "ti-tools-kitchen-2", "#D0613A"],
  ["Salud", "Gasto", 0, "ti-heart", "#B5405F"],
  ["Educación", "Gasto", 0, "ti-school", "#4C8DDB"],
  ["Entretención", "Gasto", 0, "ti-device-tv", "#078C7E"],
  ["Ropa", "Gasto", 0, "ti-shirt", "#6A5BC7"],
  [CAT_DEUDAS, "Gasto", 0, "ti-building-bank", "#3E546D"],
  ["Otros", "Gasto", 0, "ti-dots", "#6B7A8F"],
  ["Sueldo", "Ingreso", 0, "ti-briefcase", "#2E9E5B"],
  ["Otros ingresos", "Ingreso", 0, "ti-plus", "#078C7E"],
];

// Paleta de categorías de la marca (1.5). Los colores de la paleta anterior se cambian
// solos al abrir la planilla; un color elegido fuera de esa paleta no se toca.
const COLOR_MARCA_ = { "#34A853": "#2E9E5B", "#4C8DDB": "#1F5C99", "#F0A63A": "#C47A1C", "#7C5CF0": "#6A5BC7", "#E8710A": "#D0613A",
  "#D93025": "#B5405F", "#1A73E8": "#4C8DDB", "#C2185B": "#078C7E", "#00897B": "#6A5BC7", "#5F6368": "#3E546D", "#80868B": "#6B7A8F",
  "#188038": "#2E9E5B", "#137333": "#078C7E" };

const CONFIG_CAMPOS = [
  ["nombre", "texto", "", "Tu nombre (para el saludo del panel)"],
  ["inicioMes", "numero", 1, "Día en que parte tu mes (1 a 28), por ejemplo el día de sueldo"],
  ["alertaPct", "numero", 80, "Avisar cuando una categoría llegue a este % de su presupuesto"],
  ["diasAviso", "numero", 7, "Mostrar pagos de tarjetas y deudas que vencen en estos días"],
  ["valorUF", "numero", 0, "Valor de la UF a mano (0 = se trae solo cada día desde mindicador.cl)"],
  ["correoResumen", "texto", "", "Correo donde llega el resumen de cada mes, con PDF (vacío = no se envía)"],
  ["recordatorioHora", "numero", 0, "Hora del recordatorio diario por correo, solo si ese día no registraste nada (0 = no se envía)"],
];

/* ── utilidades ─────────────────────────────────────────────────────── */
function texto_(v) { return v === null || v === undefined ? "" : String(v).trim(); }
function numero_(v) {
  if (typeof v === "number") return isFinite(v) ? v : NaN;
  const s = texto_(v).replace(/\$/g, "").replace(/\s/g, "");
  if (!s) return NaN;
  // formato chileno: 1.234.567 o 1234,5
  const limpio = /,\d{1,2}$/.test(s) ? s.replace(/\./g, "").replace(",", ".") : s.replace(/\./g, "").replace(/,/g, "");
  const n = Number(limpio);
  return isFinite(n) ? n : NaN;
}
// Número con decimales (cuota en UF): "12,3456" · "12.35" · 12.35
function decimal_(v) {
  if (typeof v === "number") return isFinite(v) ? v : NaN;
  let s = texto_(v).replace(/\s/g, "").replace(/^UF/i, ""); if (!s) return NaN;
  if (s.indexOf(",") >= 0) s = s.replace(/\./g, "").replace(",", ".");
  else if (!/^\d+\.\d{1,4}$/.test(s)) s = s.replace(/\./g, "");
  const n = Number(s); return isFinite(n) ? n : NaN;
}
function esSi_(v) { const s = texto_(v).toLowerCase(); return v === true || s === "si" || s === "sí" || s === "true" || s === "1"; }
function falla_(msg, campo) { return { ok: false, error: msg, campo: campo || "" }; }
function clp_(n) { const v = Math.round(Number(n) || 0); return (v < 0 ? "−" : "") + "$" + Math.abs(v).toLocaleString("es-CL"); }
// reloj del sistema (las pruebas lo reemplazan para fijar "hoy")
function ahora_() { return new Date(); }
// Rendimiento (2026-10-18): la zona y las partes de cada fecha se calculan una vez por ejecución.
// Antes, cada período de cada movimiento llamaba a Session y a Utilities.formatDate (decenas de miles
// de veces con muchos datos: segundos en Apps Script).
var ZONA_ = null;
function zona_() { return ZONA_ || (ZONA_ = Session.getScriptTimeZone() || "America/Santiago"); }
// fecha "yyyy-MM-dd" en la zona del script
function iso_(d) { return Utilities.formatDate(d, zona_(), "yyyy-MM-dd"); }
// "yyyy-MM-dd" → Date a mediodía (evita saltos por zona horaria)
function deIso_(s) { const m = texto_(s).match(/^(\d{4})-(\d{2})-(\d{2})$/); return m ? new Date(Number(m[1]), Number(m[2]) - 1, Number(m[3]), 12, 0, 0) : null; }
function fechaDe_(v) {
  if (v instanceof Date && !isNaN(v)) return v;
  const s = texto_(v); if (!s) return null;
  const iso = deIso_(s.slice(0, 10)); if (iso) return iso;
  const m = s.match(/^(\d{1,2})[\/-](\d{1,2})[\/-](\d{4})/);
  if (m) return new Date(Number(m[3]), Number(m[2]) - 1, Number(m[1]), 12, 0, 0);
  const d = new Date(s); return isNaN(d) ? null : d;
}
var PARTES_ = new Map();
function partes_(d) {
  const k = d.getTime(); let p = PARTES_.get(k);
  if (!p) { const s = iso_(d).split("-"); p = { a: Number(s[0]), m: Number(s[1]), d: Number(s[2]) }; if (PARTES_.size > 60000) PARTES_.clear(); PARTES_.set(k, p); }
  return { a: p.a, m: p.m, d: p.d };
}
function diasMes_(a, m) { return new Date(a, m, 0).getDate(); }   // m: 1-12
function idNuevo_(prefijo) { return prefijo + Utilities.getUuid().replace(/-/g, "").slice(0, 10); }

/* ── hojas ──────────────────────────────────────────────────────────── */
function libro_() { return SpreadsheetApp.getActiveSpreadsheet(); }
function hoja_(nombre) { return libro_().getSheetByName(nombre); }
// Lecturas de hoja guardadas durante una misma ejecución: panelDatos usa
// Movimientos en cinco cálculos y así se lee una sola vez. Toda escritura la vacía.
var LECTURAS_ = {};
function olvidarLecturas_() { LECTURAS_ = {}; }
// Lee una hoja como objetos {Cabecera: valor, _fila}. Completa columnas faltantes.
function tabla_(nombre) {
  if (LECTURAS_[nombre]) return LECTURAS_[nombre];
  const t = leerTabla_(nombre); if (t) LECTURAS_[nombre] = t;
  return t;
}
function leerTabla_(nombre) {
  const h = hoja_(nombre); if (!h) return null;
  const valores = h.getDataRange().getValues();
  const cab = (valores[0] || []).map(texto_);
  const filas = [];
  for (let i = 1; i < valores.length; i++) {
    const f = valores[i]; if (!f.some(v => texto_(v) !== "")) continue;
    const o = { _fila: i + 1 }; cab.forEach((c, j) => { if (c) o[c] = f[j]; }); filas.push(o);
  }
  return { hoja: h, cab: cab, filas: filas };
}
// Un texto que empieza con = + - @ Sheets lo tomaría como fórmula: con ' delante queda como texto
// (el apóstrofo no se ve ni se lee de vuelta). Todo lo que se escribe pasa por aquí.
function celda_(v) { return typeof v === "string" && /^[=+\-@]/.test(v) ? "'" + v : v; }
function agregarFilas_(t, objetos) {
  if (!objetos.length) return;
  olvidarLecturas_();
  const datos = objetos.map(o => t.cab.map(c => (o[c] === undefined ? "" : celda_(o[c]))));
  const desde = t.hoja.getLastRow() + 1;
  t.hoja.getRange(desde, 1, datos.length, t.cab.length).setValues(datos);
}
function escribirFila_(t, fila, o) {
  olvidarLecturas_();
  const actual = t.hoja.getRange(fila, 1, 1, t.cab.length).getValues()[0];
  const nueva = t.cab.map((c, j) => celda_(o[c] === undefined ? actual[j] : o[c]));
  t.hoja.getRange(fila, 1, 1, t.cab.length).setValues([nueva]);
}
function reemplazarDatos_(t, objetos) {
  olvidarLecturas_();
  const h = t.hoja, ultima = h.getLastRow();
  if (ultima > 1) h.getRange(2, 1, ultima - 1, t.cab.length).setValues(Array.from({ length: ultima - 1 }, () => t.cab.map(() => "")));
  agregarFilas_(Object.assign({}, t, { hoja: h }), objetos);
}
function crearHojaSiFalta_(nombre, cambios) {
  olvidarLecturas_();
  let h = hoja_(nombre);
  if (!h) {
    h = libro_().insertSheet(nombre);
    h.getRange(1, 1, 1, CABECERAS[nombre].length).setValues([CABECERAS[nombre]]).setFontWeight("bold");
    h.setFrozenRows(1);
    cambios.push("Hoja " + nombre + " creada");
    return true;
  }
  // columnas que falten se agregan al final
  const cab = h.getRange(1, 1, 1, Math.max(1, h.getLastColumn())).getValues()[0].map(texto_);
  CABECERAS[nombre].forEach(c => { if (cab.indexOf(c) < 0) { h.getRange(1, cab.length + 1).setValue(c).setFontWeight("bold"); cab.push(c); cambios.push("Columna " + c + " agregada a " + nombre); } });
  return false;
}
function asegurarEstructura_() {
  const props = PropertiesService.getScriptProperties();
  const previo = props.getProperty("FA_ESQUEMA");
  if (previo === ESQUEMA && hoja_(HOJA.MOV)) return [];
  const lock = LockService.getScriptLock(); lock.waitLock(20000);
  try {
    const cambios = [];
    Object.keys(CABECERAS).forEach(n => {
      const nueva = crearHojaSiFalta_(n, cambios);
      if (nueva && n === HOJA.CAT) agregarFilas_(tabla_(HOJA.CAT), CATEGORIAS_BASE.map(c => ({ "Categoría": c[0], "Tipo": c[1], "Presupuesto": c[2], "Ícono": c[3], "Color": c[4], "Activa": "Si" })));
      if (n === HOJA.CONFIG) { const t = tabla_(HOJA.CONFIG), hay = t.filas.map(f => texto_(f.Clave)); const faltan = CONFIG_CAMPOS.filter(c => hay.indexOf(c[0]) < 0); if (faltan.length) { agregarFilas_(t, faltan.map(c => ({ "Clave": c[0], "Valor": c[2], "Descripción": c[3] }))); if (!nueva) cambios.push("Ajustes nuevos: " + faltan.map(c => c[0]).join(", ")); } }
    });
    if (previo && Number(previo) < 1.2) {   // colores de categorías a la paleta de la marca
      const t = tabla_(HOJA.CAT); let n = 0;
      t.filas.forEach(f => { const nuevo = COLOR_MARCA_[texto_(f.Color).toUpperCase()]; if (nuevo) { escribirFila_(t, f._fila, { "Color": nuevo }); n++; } });
      if (n) cambios.push("Colores de " + n + " categorías a la paleta de la marca");
    }
    const mov = hoja_(HOJA.MOV); if (mov) { mov.getRange("B:B").setNumberFormat("dd-mm-yyyy"); mov.getRange("D:D").setNumberFormat("$#,##0"); }
    props.setProperty("FA_ESQUEMA", ESQUEMA);
    return cambios;
  } finally { lock.releaseLock(); }
}

/* ── lectura del modelo ─────────────────────────────────────────────── */
function config_() {
  const t = tabla_(HOJA.CONFIG), cfg = {};
  CONFIG_CAMPOS.forEach(c => { cfg[c[0]] = c[2]; });
  if (t) t.filas.forEach(f => { const k = texto_(f.Clave); if (!k) return; const def = CONFIG_CAMPOS.find(c => c[0] === k); cfg[k] = def && def[1] === "numero" ? (isNaN(numero_(f.Valor)) ? def[2] : numero_(f.Valor)) : texto_(f.Valor); });
  cfg.inicioMes = Math.min(28, Math.max(1, Math.round(cfg.inicioMes) || 1));
  cfg.alertaPct = Math.min(100, Math.max(1, Math.round(cfg.alertaPct) || 80));
  cfg.diasAviso = Math.min(31, Math.max(1, Math.round(cfg.diasAviso) || 7));
  cfg.valorUF = Math.max(0, Number(cfg.valorUF) || 0);
  cfg.recordatorioHora = Math.round(cfg.recordatorioHora) >= 1 && Math.round(cfg.recordatorioHora) <= 23 ? Math.round(cfg.recordatorioHora) : 0;
  return cfg;
}
function categorias_() {
  const t = tabla_(HOJA.CAT); if (!t) return [];
  return t.filas.map(f => ({ nombre: texto_(f["Categoría"]), tipo: texto_(f.Tipo) === "Ingreso" ? "Ingreso" : "Gasto", presupuesto: Math.max(0, numero_(f.Presupuesto) || 0), icono: texto_(f["Ícono"]) || "ti-tag", color: texto_(f.Color) || "#6B7A8F", activa: texto_(f.Activa) === "" ? true : esSi_(f.Activa), _fila: f._fila })).filter(c => c.nombre);
}
function metas_() {
  const t = tabla_(HOJA.METAS); if (!t) return [];
  return t.filas.map(f => ({ id: texto_(f.ID), nombre: texto_(f.Meta), objetivo: Math.max(0, numero_(f.Objetivo) || 0), fecha: fechaDe_(f["Fecha objetivo"]), icono: texto_(f["Ícono"]) || "ti-target", activa: texto_(f.Activa) === "" ? true : esSi_(f.Activa), _fila: f._fila })).filter(m => m.id && m.nombre);
}
function tarjetas_() {
  const t = tabla_(HOJA.TARJ); if (!t) return [];
  return t.filas.map(f => ({ id: texto_(f.ID), nombre: texto_(f.Tarjeta), cupo: Math.max(0, numero_(f.Cupo) || 0), cierre: Math.round(numero_(f["Día de cierre"]) || 0), pago: Math.round(numero_(f["Día de pago"]) || 0), activa: texto_(f.Activa) === "" ? true : esSi_(f.Activa), _fila: f._fila })).filter(x => x.id && x.nombre);
}
function deudas_() {
  const t = tabla_(HOJA.DEUDAS); if (!t) return [];
  return t.filas.map(f => ({ id: texto_(f.ID), nombre: texto_(f.Deuda), acreedor: texto_(f.Acreedor), cuota: Math.max(0, numero_(f.Cuota) || 0), cuotas: Math.max(0, Math.round(numero_(f.Cuotas) || 0)), pago: Math.round(numero_(f["Día de pago"]) || 0), inicio: fechaDe_(f.Inicio), moneda: texto_(f.Moneda).toUpperCase() === "UF" ? "UF" : "CLP", activa: texto_(f.Activa) === "" ? true : esSi_(f.Activa), _fila: f._fila })).filter(x => x.id && x.nombre);
}
function fijos_() {
  const t = tabla_(HOJA.FIJOS); if (!t) return [];
  return t.filas.map(f => ({ id: texto_(f.ID), nombre: texto_(f.Fijo), tipo: texto_(f.Tipo) === "Ingreso" ? "Ingreso" : "Gasto", monto: Math.max(0, Math.round(numero_(f.Monto) || 0)), categoria: texto_(f["Categoría"]), medio: texto_(f.Medio), dia: Math.min(31, Math.max(1, Math.round(numero_(f["Día"]) || 1))), activa: texto_(f.Activa) === "" ? true : esSi_(f.Activa), _fila: f._fila })).filter(x => x.id && x.nombre);
}
// Los movimientos se convierten una vez por lectura de la hoja (panelDatos los usa en ~12 cálculos)
function movimientos_() {
  const t = tabla_(HOJA.MOV); if (!t) return [];
  if (t._movs) return t._movs.slice();
  t._movs = t.filas.map(f => ({ id: texto_(f.ID), fecha: fechaDe_(f.Fecha), tipo: TIPOS.indexOf(texto_(f.Tipo)) >= 0 ? texto_(f.Tipo) : "Gasto", monto: Math.abs(numero_(f.Monto) || 0), categoria: texto_(f["Categoría"]), medio: texto_(f.Medio), cuotas: Math.max(1, Math.round(numero_(f.Cuotas) || 1)), meta: texto_(f.Meta), deuda: texto_(f.Deuda), nota: texto_(f.Nota), fijo: texto_(f.Fijo), _fila: f._fila })).filter(m => m.fecha && m.monto > 0);
  return t._movs.slice();
}

/* ── períodos (el mes parte el día de inicio) ───────────────────────── */
// Índice continuo del período que contiene la fecha: año*12 + mes(0-11) del mes en que PARTE
function indicePeriodo_(fecha, inicio) {
  const p = partes_(fecha); let a = p.a, m = p.m - 1;
  if (p.d < inicio) { m--; if (m < 0) { m = 11; a--; } }
  return a * 12 + m;
}
function rangoPeriodo_(indice, inicio) {
  const a = Math.floor(indice / 12), m = indice % 12;
  const desde = new Date(a, m, inicio, 0, 0, 0), hasta = new Date(a, m + 1, inicio, 0, 0, 0);
  hasta.setDate(hasta.getDate() - 1);
  return { indice: indice, desde: iso_(desde), hasta: iso_(hasta), nombre: nombrePeriodo_(indice, inicio) };
}
var MESES_ = ["enero", "febrero", "marzo", "abril", "mayo", "junio", "julio", "agosto", "septiembre", "octubre", "noviembre", "diciembre"];
function nombrePeriodo_(indice, inicio) {
  const a = Math.floor(indice / 12), m = indice % 12;
  if (inicio === 1) return MESES_[m].charAt(0).toUpperCase() + MESES_[m].slice(1) + " " + a;
  const m2 = (m + 1) % 12;
  return inicio + " " + MESES_[m].slice(0, 3) + " – " + (inicio - 1) + " " + MESES_[m2].slice(0, 3);
}
// Monto que una compra imputa al período: al contado, todo en su período; en cuotas, monto/N en N períodos
function imputado_(mov, indice, inicio) {
  const i0 = indicePeriodo_(mov.fecha, inicio), n = mov.cuotas || 1;
  if (n <= 1) return i0 === indice ? mov.monto : 0;
  if (indice < i0 || indice >= i0 + n) return 0;
  const base = Math.floor(mov.monto / n), resto = mov.monto - base * n;
  return indice === i0 ? base + resto : base;   // el redondeo queda en la primera cuota
}

/* ── resumen del período ────────────────────────────────────────────── */
function resumen_(indice, ahora) {
  const cfg = config_(), cats = categorias_(), movs = movimientos_(), hoy = ahora || ahora_();
  if (indice === undefined || indice === null) indice = indicePeriodo_(hoy, cfg.inicioMes);
  const rango = rangoPeriodo_(indice, cfg.inicioMes);
  const porCat = {}; cats.forEach(c => { porCat[c.nombre] = 0; });
  let ingresos = 0, gastos = 0, ahorro = 0;
  movs.forEach(mv => {
    if (mv.tipo === "Gasto") { const v = imputado_(mv, indice, cfg.inicioMes); if (v) { gastos += v; porCat[mv.categoria] = (porCat[mv.categoria] || 0) + v; } return; }
    if (indicePeriodo_(mv.fecha, cfg.inicioMes) !== indice) return;
    if (mv.tipo === "Ingreso") ingresos += mv.monto;
    else if (mv.tipo === "Pago deuda") { gastos += mv.monto; porCat[CAT_DEUDAS] = (porCat[CAT_DEUDAS] || 0) + mv.monto; }
    else if (mv.tipo === "Ahorro") ahorro += mv.monto;
    else if (mv.tipo === "Retiro de meta") ahorro -= mv.monto;
    // "Pago tarjeta" no es gasto: la compra ya se contó
  });
  // lo gastado en cada categoría el período anterior (para comparar; mismas reglas: cuotas imputadas y pagos de deuda)
  const antes = {};
  movs.forEach(mv => {
    if (mv.tipo === "Gasto") { const v = imputado_(mv, indice - 1, cfg.inicioMes); if (v) antes[mv.categoria] = (antes[mv.categoria] || 0) + v; return; }
    if (mv.tipo === "Pago deuda" && indicePeriodo_(mv.fecha, cfg.inicioMes) === indice - 1) antes[CAT_DEUDAS] = (antes[CAT_DEUDAS] || 0) + mv.monto;
  });
  const presupuesto = cats.filter(c => c.tipo === "Gasto" && c.activa).map(c => {
    const g = porCat[c.nombre] || 0, pct = c.presupuesto > 0 ? Math.round(g * 100 / c.presupuesto) : null;
    return { nombre: c.nombre, icono: c.icono, color: c.color, presupuesto: c.presupuesto, gastado: g, anterior: antes[c.nombre] || 0, pct: pct, estado: pct === null ? "sin" : (g > c.presupuesto ? "excedido" : (pct >= cfg.alertaPct ? "alerta" : "ok")) };
  });
  // gastos en categorías que ya no existen o inactivas, para que el total cuadre
  Object.keys(porCat).forEach(n => { if (porCat[n] && !presupuesto.some(p => p.nombre === n)) presupuesto.push({ nombre: n || "Sin categoría", icono: "ti-tag", color: "#6B7A8F", presupuesto: 0, gastado: porCat[n], anterior: antes[n] || 0, pct: null, estado: "sin" }); });
  const totalPres = presupuesto.reduce((a, p) => a + p.presupuesto, 0);
  return {
    periodo: rango, ingresos: ingresos, gastos: gastos, ahorro: ahorro, disponible: ingresos - gastos - ahorro,
    presupuestoTotal: totalPres, presupuestoRestante: totalPres - presupuesto.filter(p => p.presupuesto > 0).reduce((a, p) => a + p.gastado, 0),
    presupuesto: presupuesto.sort((a, b) => (b.presupuesto > 0) - (a.presupuesto > 0) || b.gastado - a.gastado),
    alertas: presupuesto.filter(p => p.estado === "alerta" || p.estado === "excedido").map(p => ({ nombre: p.nombre, pct: p.pct, estado: p.estado, restante: p.presupuesto - p.gastado })),
  };
}

/* ── metas ──────────────────────────────────────────────────────────── */
function estadoMetas_(ahora) {
  const movs = movimientos_(), hoy = ahora || ahora_();
  return metas_().filter(m => m.activa).map(m => {
    const ahorrado = movs.filter(x => x.meta === m.id).reduce((a, x) => a + (x.tipo === "Retiro de meta" ? -x.monto : (x.tipo === "Ahorro" ? x.monto : 0)), 0);
    const falta = Math.max(0, m.objetivo - ahorrado), pct = m.objetivo > 0 ? Math.min(100, Math.round(ahorrado * 100 / m.objetivo)) : 0;
    let meses = null, porMes = null;
    if (m.fecha) { const a = partes_(hoy), b = partes_(m.fecha); meses = Math.max(1, (b.a - a.a) * 12 + (b.m - a.m) + (b.d >= a.d ? 1 : 0)); porMes = falta > 0 ? Math.ceil(falta / meses) : 0; }
    return { id: m.id, nombre: m.nombre, icono: m.icono, objetivo: m.objetivo, ahorrado: ahorrado, falta: falta, pct: pct, fecha: m.fecha ? iso_(m.fecha) : "", meses: meses, porMes: porMes, lista: falta === 0 && m.objetivo > 0 };
  });
}

/* ── tarjetas y deudas ──────────────────────────────────────────────── */
// próxima fecha (>= hoy) con ese día del mes (días 29-31 se ajustan al último del mes)
function proximoDia_(dia, hoy) {
  const p = partes_(hoy); let a = p.a, m = p.m;
  let d = Math.min(dia, diasMes_(a, m));
  if (d < p.d) { m++; if (m > 12) { m = 1; a++; } d = Math.min(dia, diasMes_(a, m)); }
  return new Date(a, m - 1, d, 12, 0, 0);
}
function diasEntre_(a, b) { return Math.round((deIso_(iso_(b)) - deIso_(iso_(a))) / 86400000); }
function estadoTarjetas_(ahora) {
  const movs = movimientos_(), hoy = ahora || ahora_(), cfg = config_(), iHoy = indicePeriodo_(hoy, cfg.inicioMes);
  return tarjetas_().filter(t => t.activa).map(t => {
    const compras = movs.filter(m => m.tipo === "Gasto" && m.medio === t.nombre);
    const pagos = movs.filter(m => m.tipo === "Pago tarjeta" && m.medio === t.nombre).reduce((a, m) => a + m.monto, 0);
    const usado = Math.max(0, compras.reduce((a, m) => a + m.monto, 0) - pagos);
    // cuotas que quedan por facturar (compras en cuotas cuyo plazo sigue corriendo)
    const enCuotas = compras.filter(m => m.cuotas > 1).map(m => { const i0 = indicePeriodo_(m.fecha, cfg.inicioMes), hechas = Math.min(m.cuotas, Math.max(0, iHoy - i0 + 1)); return { nombre: m.nota || m.categoria, cuota: Math.round(m.monto / m.cuotas), quedan: m.cuotas - hechas, total: m.cuotas }; }).filter(c => c.quedan > 0);
    const prox = t.pago ? proximoDia_(t.pago, hoy) : null;
    return { id: t.id, nombre: t.nombre, cupo: t.cupo, cierre: t.cierre || 0, pago: t.pago || 0, usado: usado, disponible: Math.max(0, t.cupo - usado), pct: t.cupo > 0 ? Math.min(100, Math.round(usado * 100 / t.cupo)) : 0, cuotasPendientes: enCuotas, proximoPago: prox ? iso_(prox) : "", diasPago: prox ? diasEntre_(hoy, prox) : null };
  });
}
// Valor de la UF de hoy: el de Ajustes si se escribió a mano; si no, mindicador.cl
// (una consulta al día, guardada). Sin internet se usa el último valor conocido.
function valorUF_() {
  const cfg = config_(); if (cfg.valorUF > 0) return { valor: cfg.valorUF, fuente: "manual" };
  const props = PropertiesService.getScriptProperties(), hoy = iso_(ahora_());
  let g = null; try { g = JSON.parse(props.getProperty("FA_UF") || "null"); } catch (e) { g = null; }
  if (g && g.fecha === hoy && g.valor > 0) return { valor: g.valor, fuente: "mindicador.cl", fecha: g.fecha };
  try {
    if (typeof UrlFetchApp !== "undefined") {
      const r = UrlFetchApp.fetch("https://mindicador.cl/api/uf/" + Utilities.formatDate(ahora_(), zona_(), "dd-MM-yyyy"), { muteHttpExceptions: true });
      if (r.getResponseCode() === 200) {
        const j = JSON.parse(r.getContentText()), v = j && j.serie && j.serie[0] ? Number(j.serie[0].valor) : 0;
        if (v > 0) { props.setProperty("FA_UF", JSON.stringify({ valor: v, fecha: hoy })); return { valor: v, fuente: "mindicador.cl", fecha: hoy }; }
      }
    }
  } catch (e) { /* sin conexión: se usa el último valor */ }
  if (g && g.valor > 0) return { valor: g.valor, fuente: "último conocido", fecha: g.fecha };
  return { valor: 0, fuente: "" };
}
function estadoDeudas_(ahora) {
  const movs = movimientos_(), hoy = ahora || ahora_(), lista = deudas_().filter(d => d.activa);
  const uf = lista.some(d => d.moneda === "UF") ? valorUF_() : null;
  return lista.map(d => {
    const enUF = d.moneda === "UF", cuotaUF = enUF ? d.cuota : null, cuota = enUF ? Math.round(d.cuota * (uf.valor || 0)) : d.cuota;
    const pagadas = movs.filter(m => m.tipo === "Pago deuda" && m.deuda === d.id).length;
    const quedan = Math.max(0, d.cuotas - pagadas), prox = d.pago && quedan > 0 ? proximoDia_(d.pago, hoy) : null;
    return { id: d.id, nombre: d.nombre, acreedor: d.acreedor, moneda: d.moneda, cuota: cuota, cuotaUF: cuotaUF, saldoUF: enUF ? Math.round(quedan * d.cuota * 100) / 100 : null, valorUF: enUF ? uf.valor : null, sinUF: enUF && !(uf.valor > 0), cuotas: d.cuotas, pago: d.pago || 0, pagadas: Math.min(pagadas, d.cuotas), quedan: quedan, saldo: quedan * cuota, pct: d.cuotas > 0 ? Math.min(100, Math.round(pagadas * 100 / d.cuotas)) : 0, proximoPago: prox ? iso_(prox) : "", diasPago: prox ? diasEntre_(hoy, prox) : null, terminada: quedan === 0 };
  });
}
// Gastos e ingresos fijos del período: cuál ya se registró y cuándo vence el resto
function estadoFijos_(indice, hoy, cfg) {
  const rango = rangoPeriodo_(indice, cfg.inicioMes), desde = deIso_(rango.desde), movs = movimientos_();
  return fijos_().filter(x => x.activa).map(x => {
    let a = desde.getFullYear(), m = desde.getMonth() + 1;
    if (x.dia < cfg.inicioMes) { m++; if (m > 12) { m = 1; a++; } }
    const fecha = new Date(a, m - 1, Math.min(x.dia, diasMes_(a, m)), 12, 0, 0);
    const mov = movs.find(mv => mv.fijo === x.id && indicePeriodo_(mv.fecha, cfg.inicioMes) === indice);
    return { id: x.id, nombre: x.nombre, tipo: x.tipo, monto: x.monto, categoria: x.categoria, medio: x.medio, dia: x.dia, fecha: iso_(fecha), dias: diasEntre_(hoy, fecha), registrado: !!mov, montoReal: mov ? mov.monto : null };
  }).sort((p, q) => (p.registrado - q.registrado) || (p.fecha < q.fecha ? -1 : p.fecha > q.fecha ? 1 : 0));
}
// Proyección del mes en curso: lo gastado + el ritmo diario de los gastos del día a día por los días que faltan
// + fijos y cuotas de deudas que faltan por pagar; los ingresos suman los fijos que faltan por llegar.
// Día a día = gastos con fecha en el período que no son fijos (de una compra en cuotas cuenta la cuota de este mes),
// sin las compras grandes: más de 3 veces el gasto típico (mediana) de los últimos 90 días, con un mínimo de $50.000.
// Esas ya están en lo gastado, pero no se repiten. Un fijo anotado como gasto normal (misma categoría, monto ±15 %)
// cuenta como pagado. El ritmo mezcla el del mes con el promedio diario de los 3 meses anteriores (si hay datos):
// al comienzo pesa más la historia y, a medida que avanza el mes, lo de este mes (peso = parte del mes transcurrida).
// Con menos de 3 días de datos no hay proyección (el ritmo todavía no dice nada).
function proyeccion_(indice, hoy, r, fijos, cfg) {
  if (indice !== indicePeriodo_(hoy, cfg.inicioMes)) return null;
  const desde = deIso_(r.periodo.desde), hasta = deIso_(r.periodo.hasta);
  const transcurridos = diasEntre_(desde, hoy) + 1, quedan = Math.max(0, diasEntre_(hoy, hasta));
  if (transcurridos < 3) return null;
  const conPres = {}; categorias_().forEach(c => { if (c.tipo === "Gasto" && c.activa && c.presupuesto > 0) conPres[c.nombre] = true; });
  const movs = movimientos_();
  let delMes = movs.filter(m => m.tipo === "Gasto" && !m.fijo && indicePeriodo_(m.fecha, cfg.inicioMes) === indice);
  // fijos anotados como gasto normal
  const pend = fijos.filter(x => !x.registrado).filter(x => {
    if (x.tipo !== "Gasto") return true;
    const m = delMes.find(g => g.categoria === x.categoria && Math.abs(g.monto - x.monto) <= x.monto * 0.15);
    if (!m) return true;
    delMes = delMes.filter(g => g !== m); return false;
  });
  // compras grandes: no se repiten
  const desde90 = new Date(hoy.getTime() - 90 * 86400000);
  const tipicos = movs.filter(m => m.tipo === "Gasto" && !m.fijo && m.fecha >= desde90 && m.fecha <= hoy).map(m => m.monto).sort((a, b) => a - b);
  const mediana = tipicos.length ? (tipicos.length % 2 ? tipicos[(tipicos.length - 1) / 2] : (tipicos[tipicos.length / 2 - 1] + tipicos[tipicos.length / 2]) / 2) : 0;
  const tope = Math.max(50000, mediana * 3);
  let variable = 0, variablePres = 0, grandes = 0;
  delMes.forEach(m => {
    if (m.monto > tope) { grandes++; return; }
    const v = imputado_(m, indice, cfg.inicioMes); variable += v; if (conPres[m.categoria]) variablePres += v;
  });
  // promedio diario de los 3 períodos anteriores, con las mismas reglas
  let hist = 0, histPres = 0, diasHist = 0;
  for (let k = 1; k <= 3; k++) {
    const ant = indice - k, ra = rangoPeriodo_(ant, cfg.inicioMes);
    let suma = 0, sumaPres = 0, hay = false;
    movs.forEach(m => {
      if (m.tipo !== "Gasto" || m.fijo || m.monto > tope || indicePeriodo_(m.fecha, cfg.inicioMes) !== ant) return;
      const v = imputado_(m, ant, cfg.inicioMes); suma += v; hay = true; if (conPres[m.categoria]) sumaPres += v;
    });
    if (!hay) continue;
    hist += suma; histPres += sumaPres; diasHist += diasEntre_(deIso_(ra.desde), deIso_(ra.hasta)) + 1;
  }
  const peso = transcurridos / (transcurridos + quedan);
  const mezcla = (actual, h) => diasHist ? peso * actual + (1 - peso) * (h / diasHist) : actual;
  const ritmo = mezcla(variable / transcurridos, hist), ritmoPres = mezcla(variablePres / transcurridos, histPres);
  const fijosGasto = pend.filter(x => x.tipo === "Gasto").reduce((a, x) => a + x.monto, 0);
  const fijosPres = pend.filter(x => x.tipo === "Gasto" && conPres[x.categoria]).reduce((a, x) => a + x.monto, 0);
  const fijosIngreso = pend.filter(x => x.tipo === "Ingreso").reduce((a, x) => a + x.monto, 0);
  const deudas = estadoDeudas_(hoy).filter(d => !d.terminada && d.proximoPago && d.proximoPago <= r.periodo.hasta &&
    !movs.some(m => m.tipo === "Pago deuda" && m.deuda === d.id && indicePeriodo_(m.fecha, cfg.inicioMes) === indice));
  const cuotasDeuda = deudas.reduce((a, d) => a + (d.cuota || 0), 0);
  const gastos = Math.round(r.gastos + ritmo * quedan + fijosGasto + cuotasDeuda), ingresos = r.ingresos + fijosIngreso;
  const out = {
    dias: quedan, ritmo: Math.round(ritmo), gastos: gastos, ingresos: ingresos, disponible: ingresos - gastos - r.ahorro,
    fijosPendientes: pend.filter(x => x.tipo === "Gasto").length, montoFijos: fijosGasto, ingresosPendientes: fijosIngreso,
    deudasPendientes: deudas.length, montoDeudas: cuotasDeuda, grandes: grandes, tope: Math.round(tope), conHistoria: diasHist > 0, presupuesto: null,
  };
  if (r.presupuestoTotal > 0) {
    const usado = r.presupuestoTotal - r.presupuestoRestante, proyectado = Math.round(usado + ritmoPres * quedan + fijosPres);
    out.presupuesto = { total: r.presupuestoTotal, proyectado: proyectado, diferencia: r.presupuestoTotal - proyectado };
  }
  return out;
}
function proximosPagos_(tarjetas, deudas, dias) {
  return tarjetas.filter(t => t.proximoPago && t.diasPago <= dias && t.usado > 0).map(t => ({ tipo: "tarjeta", id: t.id, nombre: t.nombre, fecha: t.proximoPago, dias: t.diasPago, monto: null }))
    .concat(deudas.filter(d => d.proximoPago && d.diasPago <= dias).map(d => ({ tipo: "deuda", id: d.id, nombre: d.nombre, fecha: d.proximoPago, dias: d.diasPago, monto: d.cuota })))
    .sort((a, b) => a.dias - b.dias);
}

/* ── API del panel (google.script.run) ──────────────────────────────── */
function medios_() { return MEDIOS_BASE.concat(tarjetas_().filter(t => t.activa).map(t => t.nombre)); }
// Todo lo que el panel necesita para pintarse
function panelDatos(indice) {
  olvidarLecturas_();
  asegurarEstructura_();
  const cfg = config_(), hoy = ahora_();
  const actual = indicePeriodo_(hoy, cfg.inicioMes), pedido = Number(indice);
  // un mes inválido o fuera de rango (texto, negativo, futuro lejano) muestra el mes en curso
  const i = indice === undefined || indice === null || indice === "" || !Number.isInteger(pedido) || pedido > actual + 1 || pedido < actual - 1200 ? actual : pedido;
  const tarj = estadoTarjetas_(hoy), deu = estadoDeudas_(hoy), res = resumen_(i, hoy), fijos = estadoFijos_(i, hoy, cfg);
  return {
    ok: true, version: VERSION, hoy: iso_(hoy), config: cfg, actual: indicePeriodo_(hoy, cfg.inicioMes),
    resumen: res, proyeccion: proyeccion_(i, hoy, res, fijos, cfg), metas: estadoMetas_(hoy), tarjetas: tarj, deudas: deu,
    proximos: proximosPagos_(tarj, deu, cfg.diasAviso),
    categorias: categorias_().filter(c => c.activa).map(c => ({ nombre: c.nombre, tipo: c.tipo, icono: c.icono, color: c.color, presupuesto: c.presupuesto })),
    medios: medios_(), movimientos: movimientosPeriodo_(i, cfg), cuotasPeriodo: cuotasPeriodo_(i, cfg), historial: historial_(i, cfg), ejemplo: hayEjemplo_(),
    recientes: recientes_(hoy), urlRegistrar: urlPanel_() ? urlPanel_() + "?a=registrar" : "", frecuentes: frecuentes_(hoy), fijos: fijos,
  };
}
// Categorías más usadas en los últimos 90 días, por tipo (el registro rápido las pone primero)
function frecuentes_(hoy) {
  const desde = new Date(hoy.getTime() - 90 * 86400000), cuenta = { Gasto: {}, Ingreso: {} };
  movimientos_().forEach(m => { if ((m.tipo === "Gasto" || m.tipo === "Ingreso") && m.categoria && m.fecha >= desde) cuenta[m.tipo][m.categoria] = (cuenta[m.tipo][m.categoria] || 0) + 1; });
  const orden = o => Object.keys(o).sort((a, b) => o[b] - o[a] || a.localeCompare(b)).slice(0, 4);
  return { Gasto: orden(cuenta.Gasto), Ingreso: orden(cuenta.Ingreso) };
}
// Lo que la persona registra seguido (mismo tipo, categoría, medio, monto y nota al menos 2 veces
// en 60 días, sin contar fijos): el registro lo ofrece para repetir con un toque
function recientes_(hoy) {
  const desde = new Date(hoy.getTime() - 60 * 86400000), grupos = {};
  movimientos_().forEach(m => {
    if ((m.tipo !== "Gasto" && m.tipo !== "Ingreso") || m.fijo || m.cuotas > 1 || m.fecha < desde) return;
    const k = [m.tipo, m.categoria, m.medio, m.monto, m.nota].join("|");
    const g = grupos[k] || (grupos[k] = { tipo: m.tipo, categoria: m.categoria, medio: m.medio, monto: m.monto, nota: m.nota, veces: 0, ultima: 0 });
    g.veces++; g.ultima = Math.max(g.ultima, m.fecha.getTime());
  });
  return Object.keys(grupos).map(k => grupos[k]).filter(g => g.veces >= 2).sort((a, b) => b.veces - a.veces || b.ultima - a.ultima).slice(0, 4)
    .map(g => ({ tipo: g.tipo, categoria: g.categoria, medio: g.medio, monto: g.monto, nota: g.nota, veces: g.veces }));
}
function urlPanel_() { try { const u = texto_(ScriptApp.getService().getUrl()); return /\/exec$/.test(u) ? u : ""; } catch (e) { return ""; } }
// Gastos e ingresos de los 6 períodos que terminan en "indice" (gráfico de Inicio). Mismas reglas que resumen_
function historial_(indice, cfg) {
  const movs = movimientos_(), out = [];
  for (let k = indice - 5; k <= indice; k++) {
    let g = 0, ing = 0;
    movs.forEach(mv => {
      if (mv.tipo === "Gasto") { g += imputado_(mv, k, cfg.inicioMes); return; }
      if (indicePeriodo_(mv.fecha, cfg.inicioMes) !== k) return;
      if (mv.tipo === "Pago deuda") g += mv.monto; else if (mv.tipo === "Ingreso") ing += mv.monto;
    });
    out.push({ indice: k, mes: MESES_[((k % 12) + 12) % 12].slice(0, 3), gastos: g, ingresos: ing });
  }
  return out;
}
// Cuotas que este período paga de compras hechas en meses anteriores (para ver el detalle de una categoría)
function cuotasPeriodo_(indice, cfg) {
  return movimientos_().filter(m => m.tipo === "Gasto" && m.cuotas > 1 && indicePeriodo_(m.fecha, cfg.inicioMes) < indice)
    .map(m => ({ m: m, v: imputado_(m, indice, cfg.inicioMes) })).filter(x => x.v > 0)
    .map(x => ({ id: x.m.id, fecha: iso_(x.m.fecha), categoria: x.m.categoria, medio: x.m.medio, nota: x.m.nota, monto: x.v, total: x.m.monto, cuota: indice - indicePeriodo_(x.m.fecha, cfg.inicioMes) + 1, cuotas: x.m.cuotas }));
}
function movimientosPeriodo_(indice, cfg) {
  return movimientos_().filter(m => indicePeriodo_(m.fecha, cfg.inicioMes) === indice)
    .sort((a, b) => b.fecha - a.fecha || b._fila - a._fila)
    .map(m => ({ id: m.id, fecha: iso_(m.fecha), tipo: m.tipo, monto: m.monto, categoria: m.categoria, medio: m.medio, cuotas: m.cuotas, meta: m.meta, deuda: m.deuda, nota: m.nota, fijo: m.fijo }));
}
// Valida y arma la fila de un movimiento. d: {fecha, tipo, monto, categoria, medio, cuotas, meta, deuda, nota}
// medioAnterior: al editar, el medio que ya tenía sigue valiendo aunque esa tarjeta se haya quitado
function validarMovimiento_(d, medioAnterior) {
  const tipo = texto_(d.tipo) || "Gasto";
  if (TIPOS.indexOf(tipo) < 0) return falla_("Tipo de movimiento no válido.", "tipo");
  const monto = Math.round(numero_(d.monto));
  if (!(monto > 0)) return falla_("Escribe un monto mayor que cero.", "monto");
  if (monto > 999999999) return falla_("El monto es demasiado grande.", "monto");
  const fecha = d.fecha ? fechaDe_(d.fecha) : ahora_();
  if (!fecha) return falla_("Revisa la fecha.", "fecha");
  if (diasEntre_(ahora_(), fecha) > 1) return falla_("La fecha no puede ser futura.", "fecha");
  const fila = { "Fecha": fecha, "Tipo": tipo, "Monto": monto, "Categoría": "", "Medio": texto_(d.medio), "Cuotas": 1, "Meta": "", "Deuda": "", "Nota": texto_(d.nota).slice(0, 120) };
  const cats = categorias_(), medios = medios_();
  if (medioAnterior && medios.indexOf(medioAnterior) < 0) medios.push(medioAnterior);
  if (tipo === "Gasto" || tipo === "Ingreso") {
    const c = cats.find(x => x.nombre === texto_(d.categoria) && x.tipo === tipo);
    if (!c) return falla_("Elige una categoría.", "categoria");
    fila["Categoría"] = c.nombre;
  }
  if (tipo === "Gasto" || tipo === "Pago tarjeta") {
    if (medios.indexOf(fila.Medio) < 0) return falla_("Elige cómo pagaste.", "medio");
  } else if (fila.Medio && medios.indexOf(fila.Medio) < 0) fila.Medio = "";
  const esTarjeta = tarjetas_().some(t => t.nombre === fila.Medio);
  if (tipo === "Gasto" && esTarjeta) {
    const n = Math.round(numero_(d.cuotas) || 1);
    if (n < 1 || n > 48) return falla_("Las cuotas van de 1 a 48.", "cuotas");
    fila.Cuotas = n;
  }
  if (tipo === "Pago tarjeta" && !esTarjeta) return falla_("Elige la tarjeta que pagaste.", "medio");
  if (tipo === "Ahorro" || tipo === "Retiro de meta") {
    const m = metas_().find(x => x.id === texto_(d.meta) && x.activa);
    if (!m) return falla_("Elige la meta.", "meta");
    fila.Meta = m.id;
  }
  if (tipo === "Pago deuda") {
    const de = deudas_().find(x => x.id === texto_(d.deuda) && x.activa);
    if (!de) return falla_("Elige la deuda.", "deuda");
    fila.Deuda = de.id; fila["Categoría"] = CAT_DEUDAS;
  }
  fila.Fijo = "";
  if (texto_(d.fijo)) {
    const fx = fijos_().find(x => x.id === texto_(d.fijo));
    if (!fx || fx.tipo !== tipo) return falla_("Ese gasto fijo ya no existe.", "fijo");
    fila.Fijo = fx.id;
  }
  return { ok: true, fila: fila };
}
function registrar(d) {
  olvidarLecturas_();
  asegurarEstructura_();
  const lock = LockService.getScriptLock(); lock.waitLock(20000);
  try {
    // un registro hecho sin conexión trae su propio código (cid): si ya llegó antes, no se duplica
    const cid = texto_((d || {}).cid), id = /^[A-Za-z0-9]{8,32}$/.test(cid) ? "M" + cid : idNuevo_("M");
    if (cid && movimientos_().some(m => m.id === id)) return { ok: true, id: id, repetido: true, datos: panelDatos() };
    const v = validarMovimiento_(d || {}); if (!v.ok) return v;
    const t = tabla_(HOJA.MOV), fila = Object.assign({ "ID": id, "Registrado": ahora_() }, v.fila);
    agregarFilas_(t, [fila]);
    return { ok: true, id: fila.ID, datos: panelDatos() };
  } finally { lock.releaseLock(); }
}
function editarMovimiento(id, d) {
  olvidarLecturas_();
  asegurarEstructura_();
  const lock = LockService.getScriptLock(); lock.waitLock(20000);
  try {
    const t = tabla_(HOJA.MOV), f = t.filas.find(x => texto_(x.ID) === texto_(id));
    if (!f) return falla_("Ese movimiento ya no existe.");
    const v = validarMovimiento_(d || {}, texto_(f.Medio)); if (!v.ok) return v;
    escribirFila_(t, f._fila, v.fila);
    return { ok: true, datos: panelDatos(d && d.periodo) };
  } finally { lock.releaseLock(); }
}
function borrarMovimiento(id, periodo) {
  olvidarLecturas_();
  asegurarEstructura_();
  const lock = LockService.getScriptLock(); lock.waitLock(20000);
  try {
    const t = tabla_(HOJA.MOV), f = t.filas.find(x => texto_(x.ID) === texto_(id));
    if (!f) return falla_("Ese movimiento ya no existe.");
    t.hoja.deleteRow(f._fila); olvidarLecturas_();
    return { ok: true, datos: panelDatos(periodo) };
  } finally { lock.releaseLock(); }
}
// Presupuesto y categorías: lista [{nombre, tipo, presupuesto, icono, color, activa}]
function guardarCategorias(lista) {
  olvidarLecturas_();
  asegurarEstructura_();
  const vistos = {}, filas = [], renombres = [];
  for (const c of (lista || [])) {
    const nombre = texto_(c.nombre).slice(0, 40); if (!nombre) continue;
    if (texto_(c.antes) && texto_(c.antes) !== nombre) renombres.push([texto_(c.antes), nombre]);
    const clave = nombre.toLowerCase();
    if (vistos[clave]) return falla_("La categoría " + nombre + " está repetida.");
    vistos[clave] = true;
    const p = c.presupuesto === "" || c.presupuesto === null || c.presupuesto === undefined ? 0 : numero_(c.presupuesto);
    if (isNaN(p) || p < 0) return falla_("Revisa el presupuesto de " + nombre + ".");
    filas.push({ "Categoría": nombre, "Tipo": c.tipo === "Ingreso" ? "Ingreso" : "Gasto", "Presupuesto": Math.round(p), "Ícono": texto_(c.icono) || "ti-tag", "Color": /^#[0-9a-f]{6}$/i.test(texto_(c.color)) ? texto_(c.color) : "#6B7A8F", "Activa": c.activa === false ? "No" : "Si" });
  }
  if (!filas.some(f => f.Tipo === "Gasto")) return falla_("Deja al menos una categoría de gasto.");
  if (!filas.some(f => f["Categoría"] === CAT_DEUDAS)) filas.push({ "Categoría": CAT_DEUDAS, "Tipo": "Gasto", "Presupuesto": 0, "Ícono": "ti-building-bank", "Color": "#3E546D", "Activa": "Si" });
  const lock = LockService.getScriptLock(); lock.waitLock(20000);
  try { reemplazarDatos_(tabla_(HOJA.CAT), filas); } finally { lock.releaseLock(); }
  renombres.forEach(x => renombrarEnMovimientos_("Categoría", x[0], x[1]));
  return { ok: true, datos: panelDatos() };
}
// Cambia un nombre en una columna de Movimientos y de Fijos (al renombrar una
// tarjeta o una categoría, sus movimientos y sus fijos la siguen)
function renombrarEnMovimientos_(columna, antes, despues) {
  return renombrarEnHoja_(HOJA.MOV, columna, antes, despues) + renombrarEnHoja_(HOJA.FIJOS, columna, antes, despues);
}
function renombrarEnHoja_(hojaNombre, columna, antes, despues) {
  const lock = LockService.getScriptLock(); lock.waitLock(20000);
  try {
    const t = tabla_(hojaNombre); if (!t || !t.filas.length) return 0;
    const j = t.cab.indexOf(columna); if (j < 0) return 0;
    const rango = t.hoja.getRange(2, j + 1, t.hoja.getLastRow() - 1, 1), v = rango.getValues();
    let n = 0; v.forEach(f => { if (texto_(f[0]) === antes) { f[0] = despues; n++; } f[0] = celda_(f[0]); });
    if (n) { rango.setValues(v); olvidarLecturas_(); }
    return n;
  } finally { lock.releaseLock(); }
}
// Guarda (crea o actualiza) un elemento de Metas, Tarjetas o Deudas
function guardarElemento_(hojaNombre, prefijo, id, fila) {
  const lock = LockService.getScriptLock(); lock.waitLock(20000);
  try {
    const t = tabla_(hojaNombre), f = id ? t.filas.find(x => texto_(x.ID) === texto_(id)) : null;
    if (f) escribirFila_(t, f._fila, fila); else agregarFilas_(t, [Object.assign({ "ID": idNuevo_(prefijo), "Activa": "Si" }, fila)]);
    return { ok: true, datos: panelDatos() };
  } finally { lock.releaseLock(); }
}
function guardarMeta(d) {
  olvidarLecturas_();
  asegurarEstructura_(); d = d || {};
  const nombre = texto_(d.nombre).slice(0, 40), obj = Math.round(numero_(d.objetivo));
  if (!nombre) return falla_("Ponle nombre a la meta.", "nombre");
  if (!(obj > 0)) return falla_("Escribe cuánto quieres juntar.", "objetivo");
  const fecha = texto_(d.fecha) ? deIso_(d.fecha) : "";
  if (texto_(d.fecha) && !fecha) return falla_("Revisa la fecha.", "fecha");
  return guardarElemento_(HOJA.METAS, "G", d.id, { "Meta": nombre, "Objetivo": obj, "Fecha objetivo": fecha, "Ícono": texto_(d.icono) || "ti-target", "Activa": d.activa === false ? "No" : "Si" });
}
function guardarTarjeta(d) {
  olvidarLecturas_();
  asegurarEstructura_(); d = d || {};
  const nombre = texto_(d.nombre).slice(0, 40), cupo = Math.round(numero_(d.cupo)), cierre = Math.round(numero_(d.cierre)), pago = Math.round(numero_(d.pago));
  if (!nombre) return falla_("Ponle nombre a la tarjeta.", "nombre");
  if (MEDIOS_BASE.indexOf(nombre) >= 0) return falla_("Usa otro nombre: " + nombre + " ya es un medio de pago.", "nombre");
  if (tarjetas_().some(t => t.nombre.toLowerCase() === nombre.toLowerCase() && t.id !== texto_(d.id))) return falla_("Ya tienes una tarjeta con ese nombre.", "nombre");
  if (!(cupo > 0)) return falla_("Escribe el cupo de la tarjeta.", "cupo");
  if (!(pago >= 1 && pago <= 31)) return falla_("El día de pago va de 1 a 31.", "pago");
  if (texto_(d.cierre) && !(cierre >= 1 && cierre <= 31)) return falla_("El día de cierre va de 1 a 31.", "cierre");
  const antes = texto_(d.id) ? tarjetas_().find(t => t.id === texto_(d.id)) : null;
  if (antes && antes.nombre !== nombre) renombrarEnMovimientos_("Medio", antes.nombre, nombre);
  return guardarElemento_(HOJA.TARJ, "T", d.id, { "Tarjeta": nombre, "Cupo": cupo, "Día de cierre": texto_(d.cierre) ? cierre : "", "Día de pago": pago, "Activa": d.activa === false ? "No" : "Si" });
}
function guardarDeuda(d) {
  olvidarLecturas_();
  asegurarEstructura_(); d = d || {};
  const moneda = texto_(d.moneda).toUpperCase() === "UF" ? "UF" : "CLP";
  const nombre = texto_(d.nombre).slice(0, 40), cuota = moneda === "UF" ? Math.round(decimal_(d.cuota) * 10000) / 10000 : Math.round(numero_(d.cuota)), cuotas = Math.round(numero_(d.cuotas)), pago = Math.round(numero_(d.pago));
  if (!nombre) return falla_("Ponle nombre a la deuda.", "nombre");
  if (moneda === "UF" && cuota > 1000) return falla_("Revisa la cuota: en UF suele ser menor que 1.000 (ej: 12,35).", "cuota");
  if (!(cuota > 0)) return falla_("Escribe el valor de la cuota.", "cuota");
  if (!(cuotas >= 1 && cuotas <= 600)) return falla_("Las cuotas van de 1 a 600.", "cuotas");
  if (!(pago >= 1 && pago <= 31)) return falla_("El día de pago va de 1 a 31.", "pago");
  return guardarElemento_(HOJA.DEUDAS, "D", d.id, { "Deuda": nombre, "Acreedor": texto_(d.acreedor).slice(0, 40), "Cuota": cuota, "Cuotas": cuotas, "Día de pago": pago, "Inicio": texto_(d.inicio) ? deIso_(d.inicio) : "", "Moneda": moneda, "Activa": d.activa === false ? "No" : "Si" });
}
/* ── datos de ejemplo (para mostrar la app y para que quien compra la explore) ──
   Todo lo de ejemplo lleva ID "EJ-…" y se borra junto. Solo se cargan en una planilla sin
   movimientos propios; los presupuestos anteriores se guardan y vuelven al borrar. */
const EJ_ = "EJ-";
function hayEjemplo_() { return movimientos_().some(m => m.id.indexOf(EJ_) === 0) || tarjetas_().some(t => t.id.indexOf(EJ_) === 0); }
function cargarEjemplo() {
  olvidarLecturas_();
  asegurarEstructura_();
  if (hayEjemplo_()) return falla_("Los datos de ejemplo ya están cargados.");
  if (movimientos_().length) return falla_("Ya tienes movimientos propios: los datos de ejemplo solo se cargan en una planilla sin movimientos.");
  const cfg = config_(), hoy = ahora_(), iHoy = indicePeriodo_(hoy, cfg.inicioMes), props = PropertiesService.getScriptProperties();
  const lock = LockService.getScriptLock(); lock.waitLock(20000);
  try {
    const pres = {}; categorias_().forEach(c => { pres[c.nombre] = c.presupuesto; });
    props.setProperty("FA_EJ_PRES", JSON.stringify(pres));
    const nuevos = { "Supermercado": 280000, "Casa": 450000, "Comida fuera": 90000, "Transporte": 80000, "Entretención": 40000, "Servicios": 70000 };
    const tc = tabla_(HOJA.CAT); tc.filas.forEach(f => { const n = texto_(f["Categoría"]); if (nuevos[n] !== undefined) escribirFila_(tc, f._fila, { "Presupuesto": nuevos[n] }); });
    const inicio = rangoPeriodo_(iHoy - 5, cfg.inicioMes).desde;
    agregarFilas_(tabla_(HOJA.TARJ), [{ "ID": EJ_ + "T1", "Tarjeta": "Visa (ejemplo)", "Cupo": 800000, "Día de cierre": "", "Día de pago": 10, "Activa": "Si" }]);
    agregarFilas_(tabla_(HOJA.DEUDAS), [{ "ID": EJ_ + "D1", "Deuda": "Crédito de consumo (ejemplo)", "Acreedor": "Banco", "Cuota": 98000, "Cuotas": 24, "Día de pago": 15, "Inicio": deIso_(inicio), "Activa": "Si", "Moneda": "CLP" }]);
    const enCinco = new Date(hoy.getFullYear(), hoy.getMonth() + 5, 28, 12);
    agregarFilas_(tabla_(HOJA.METAS), [
      { "ID": EJ_ + "G1", "Meta": "Vacaciones (ejemplo)", "Objetivo": 900000, "Fecha objetivo": enCinco, "Ícono": "ti-beach", "Activa": "Si" },
      { "ID": EJ_ + "G2", "Meta": "Fondo de emergencia (ejemplo)", "Objetivo": 1500000, "Fecha objetivo": "", "Ícono": "ti-shield", "Activa": "Si" }]);
    agregarFilas_(tabla_(HOJA.FIJOS), [
      { "ID": EJ_ + "F1", "Fijo": "Arriendo", "Tipo": "Gasto", "Monto": 420000, "Categoría": "Casa", "Medio": "Transferencia", "Día": 5, "Activa": "Si" },
      { "ID": EJ_ + "F2", "Fijo": "Luz y agua", "Tipo": "Gasto", "Monto": 38000, "Categoría": "Servicios", "Medio": "Débito", "Día": 12, "Activa": "Si" },
      { "ID": EJ_ + "F3", "Fijo": "Plan celular", "Tipo": "Gasto", "Monto": 15990, "Categoría": "Servicios", "Medio": "Visa (ejemplo)", "Día": 8, "Activa": "Si" },
      { "ID": EJ_ + "F4", "Fijo": "Sueldo", "Tipo": "Ingreso", "Monto": 1350000, "Categoría": "Sueldo", "Medio": "", "Día": 1, "Activa": "Si" }]);
    // movimientos de los últimos 6 meses (siempre los mismos: azar con semilla)
    let semilla = 7; const azar = () => { semilla = (semilla * 1103515245 + 12345) % 2147483648; return semilla / 2147483648; };
    const filas = []; let n = 0;
    const mov = (k, dia, tipo, monto, o) => {
      const d = deIso_(rangoPeriodo_(k, cfg.inicioMes).desde); d.setDate(d.getDate() + dia - 1);
      if (diasEntre_(hoy, d) > 0) return;
      filas.push(Object.assign({ "ID": EJ_ + "M" + (++n), "Fecha": d, "Tipo": tipo, "Monto": Math.round(monto), "Categoría": "", "Medio": "", "Cuotas": 1, "Meta": "", "Deuda": "", "Nota": "", "Registrado": d, "Fijo": "" }, o || {}));
    };
    const ent = (a, b) => a + azar() * (b - a);
    let visaMesAnterior = 0;
    for (let k = iHoy - 5; k <= iHoy; k++) {
      let visa = 0;
      mov(k, 1, "Ingreso", 1350000, { "Categoría": "Sueldo", "Medio": "Transferencia", "Fijo": EJ_ + "F4" });
      mov(k, 2, "Ahorro", [100000, 150000, 120000][k % 3], { "Meta": k % 2 ? EJ_ + "G1" : EJ_ + "G2" });
      mov(k, 5, "Gasto", 420000, { "Categoría": "Casa", "Medio": "Transferencia", "Fijo": EJ_ + "F1" });
      mov(k, 8, "Gasto", 15990, { "Categoría": "Servicios", "Medio": "Visa (ejemplo)", "Fijo": EJ_ + "F3" }); visa += 15990;
      mov(k, 12, "Gasto", ent(33000, 44000), { "Categoría": "Servicios", "Medio": "Débito", "Fijo": EJ_ + "F2" });
      mov(k, 15, "Pago deuda", 98000, { "Categoría": CAT_DEUDAS, "Deuda": EJ_ + "D1" });
      if (visaMesAnterior) mov(k, 10, "Pago tarjeta", visaMesAnterior, { "Medio": "Visa (ejemplo)" });
      [3, 9, 16, 23].forEach((dia, j) => { const v = ent(25000, 72000), tj = j % 2 === 1; mov(k, dia, "Gasto", v, { "Categoría": "Supermercado", "Medio": tj ? "Visa (ejemplo)" : "Débito" }); if (tj) visa += Math.round(v); });
      [6, 13, 20, 27].forEach(dia => { if (azar() < .8) mov(k, dia, "Gasto", ent(7000, 26000), { "Categoría": "Comida fuera", "Medio": "Débito" }); });
      [4, 11, 18, 25].forEach(dia => mov(k, dia, "Gasto", ent(5000, 21000), { "Categoría": "Transporte", "Medio": "Débito" }));
      mov(k, 14, "Gasto", 9990, { "Categoría": "Entretención", "Medio": "Visa (ejemplo)", "Nota": "Streaming" }); visa += 9990;
      if (azar() < .6) { const v = ent(12000, 35000); mov(k, 21, "Gasto", v, { "Categoría": "Entretención", "Medio": "Visa (ejemplo)", "Nota": "Cine y salida" }); visa += Math.round(v); }
      if (azar() < .5) mov(k, 19, "Gasto", ent(15000, 45000), { "Categoría": "Salud", "Medio": "Débito", "Nota": "Farmacia" });
      if (k === iHoy - 2) mov(k, 17, "Gasto", 540000, { "Categoría": "Educación", "Medio": "Visa (ejemplo)", "Cuotas": 6, "Nota": "Notebook" });
      visaMesAnterior = visa;
    }
    agregarFilas_(tabla_(HOJA.MOV), filas);
  } finally { lock.releaseLock(); }
  return { ok: true, datos: panelDatos() };
}
function borrarEjemplo() {
  olvidarLecturas_();
  asegurarEstructura_();
  if (!hayEjemplo_()) return falla_("No hay datos de ejemplo.");
  const props = PropertiesService.getScriptProperties();
  const lock = LockService.getScriptLock(); lock.waitLock(20000);
  try {
    [HOJA.MOV, HOJA.METAS, HOJA.TARJ, HOJA.DEUDAS, HOJA.FIJOS].forEach(n => {
      const t = tabla_(n); if (!t) return;
      const quedan = t.filas.filter(f => texto_(f.ID).indexOf(EJ_) !== 0);
      if (quedan.length !== t.filas.length) reemplazarDatos_(t, quedan);
    });
    let pres = null; try { pres = JSON.parse(props.getProperty("FA_EJ_PRES") || "null"); } catch (e) { pres = null; }
    if (pres) { const tc = tabla_(HOJA.CAT); tc.filas.forEach(f => { const n = texto_(f["Categoría"]); if (pres[n] !== undefined) escribirFila_(tc, f._fila, { "Presupuesto": pres[n] }); }); props.deleteProperty("FA_EJ_PRES"); }
  } finally { lock.releaseLock(); }
  return { ok: true, datos: panelDatos() };
}
function cargarEjemploMenu() { const r = cargarEjemplo(); SpreadsheetApp.getUi().alert(r.ok ? "Listo: se cargaron 6 meses de datos de ejemplo. Bórralos desde el mismo menú cuando quieras." : r.error); }
function borrarEjemploMenu() { const r = borrarEjemplo(); SpreadsheetApp.getUi().alert(r.ok ? "Listo: se borraron los datos de ejemplo." : r.error); }
// Una categoría: {antes, nombre, tipo, presupuesto, icono, color}. Sin "antes" se crea
// (o se reactiva si existía oculta). Al renombrar, movimientos y fijos la siguen.
function guardarCategoria(d) {
  olvidarLecturas_();
  asegurarEstructura_(); d = d || {};
  const nombre = texto_(d.nombre).slice(0, 40), antes = texto_(d.antes), tipo = texto_(d.tipo) === "Ingreso" ? "Ingreso" : "Gasto";
  const p = texto_(d.presupuesto) === "" ? 0 : numero_(d.presupuesto);
  if (!nombre) return falla_("Ponle nombre a la categoría.", "nombre");
  if (isNaN(p) || p < 0) return falla_("Revisa el presupuesto.", "presupuesto");
  const icono = /^ti-[a-z0-9-]+$/.test(texto_(d.icono)) ? texto_(d.icono) : "ti-tag", color = /^#[0-9a-f]{6}$/i.test(texto_(d.color)) ? texto_(d.color) : "#6B7A8F";
  const cats = categorias_(), otra = cats.find(c => c.nombre.toLowerCase() === nombre.toLowerCase() && c.nombre !== antes);
  if (otra && otra.activa) return falla_("Ya tienes una categoría " + otra.nombre + ".", "nombre");
  const t = tabla_(HOJA.CAT);
  if (antes) {
    const c = cats.find(x => x.nombre === antes); if (!c) return falla_("Esa categoría ya no existe.");
    if (antes === CAT_DEUDAS && nombre !== CAT_DEUDAS) return falla_("La categoría Deudas no se puede renombrar: la usan los pagos de deudas.", "nombre");
    if (otra) return falla_("Ya existe una categoría oculta con ese nombre.", "nombre");
    escribirFila_(t, c._fila, { "Categoría": nombre, "Presupuesto": c.tipo === "Gasto" ? Math.round(p) : 0, "Ícono": icono, "Color": color });
    if (antes !== nombre) renombrarEnMovimientos_("Categoría", antes, nombre);
  } else if (otra) {
    escribirFila_(t, otra._fila, { "Tipo": tipo, "Presupuesto": tipo === "Gasto" ? Math.round(p) : 0, "Ícono": icono, "Color": color, "Activa": "Si" });
  } else {
    agregarFilas_(t, [{ "Categoría": nombre, "Tipo": tipo, "Presupuesto": tipo === "Gasto" ? Math.round(p) : 0, "Ícono": icono, "Color": color, "Activa": "Si" }]);
  }
  return { ok: true, datos: panelDatos() };
}
// Oculta una categoría: deja de aparecer al registrar, pero sus movimientos siguen contando
function quitarCategoria(nombre) {
  olvidarLecturas_();
  asegurarEstructura_();
  if (texto_(nombre) === CAT_DEUDAS) return falla_("La categoría Deudas no se puede quitar.");
  const cats = categorias_(), c = cats.find(x => x.nombre === texto_(nombre) && x.activa);
  if (!c) return falla_("Esa categoría ya no existe.");
  if (!cats.some(x => x.activa && x.tipo === c.tipo && x.nombre !== c.nombre && x.nombre !== CAT_DEUDAS)) return falla_("Deja al menos otra categoría de " + (c.tipo === "Gasto" ? "gasto" : "ingreso") + ".");
  escribirFila_(tabla_(HOJA.CAT), c._fila, { "Activa": "No" });
  return { ok: true, datos: panelDatos() };
}
// Presupuestos {nombre: monto} sin tocar el resto de las categorías (ni las ocultas)
function guardarPresupuestos(montos) {
  olvidarLecturas_();
  asegurarEstructura_(); montos = montos || {};
  const cats = categorias_(), cambios = [];
  for (const n of Object.keys(montos)) {
    const c = cats.find(x => x.nombre === n && x.tipo === "Gasto"); if (!c) continue;
    const p = texto_(montos[n]) === "" ? 0 : numero_(montos[n]);
    if (isNaN(p) || p < 0) return falla_("Revisa el presupuesto de " + n + ".");
    if (Math.round(p) !== c.presupuesto) cambios.push([c._fila, Math.round(p)]);
  }
  const lock = LockService.getScriptLock(); lock.waitLock(20000);
  try { const t = tabla_(HOJA.CAT); cambios.forEach(x => escribirFila_(t, x[0], { "Presupuesto": x[1] })); } finally { lock.releaseLock(); }
  return { ok: true, datos: panelDatos() };
}
// Quita (deja inactiva) una meta, tarjeta, deuda o gasto fijo. Su historial se conserva.
function quitar(clase, id) {
  olvidarLecturas_();
  asegurarEstructura_();
  const hoja = { meta: HOJA.METAS, tarjeta: HOJA.TARJ, deuda: HOJA.DEUDAS, fijo: HOJA.FIJOS }[clase];
  if (!hoja) return falla_("No se puede quitar eso.");
  const lock = LockService.getScriptLock(); lock.waitLock(20000);
  try {
    const t = tabla_(hoja), f = t.filas.find(x => texto_(x.ID) === texto_(id));
    if (!f) return falla_("Ya no existe.");
    escribirFila_(t, f._fila, { "Activa": "No" });
  } finally { lock.releaseLock(); }
  return { ok: true, datos: panelDatos() };
}
// Gasto o ingreso fijo: {id, nombre, tipo, monto, categoria, medio, dia}
function guardarFijo(d) {
  olvidarLecturas_();
  asegurarEstructura_(); d = d || {};
  const tipo = texto_(d.tipo) === "Ingreso" ? "Ingreso" : "Gasto", nombre = texto_(d.nombre).slice(0, 40), monto = Math.round(numero_(d.monto)), dia = Math.round(numero_(d.dia));
  if (!nombre) return falla_("Ponle nombre (ej: Arriendo).", "nombre");
  if (!(monto > 0)) return falla_("Escribe el monto de un mes normal (si cambia, lo ajustas al registrarlo).", "monto");
  if (!(dia >= 1 && dia <= 31)) return falla_("El día va de 1 a 31.", "dia");
  if (!categorias_().some(c => c.nombre === texto_(d.categoria) && c.tipo === tipo)) return falla_("Elige una categoría.", "categoria");
  if (tipo === "Gasto" && medios_().indexOf(texto_(d.medio)) < 0) return falla_("Elige cómo lo pagas.", "medio");
  return guardarElemento_(HOJA.FIJOS, "F", d.id, { "Fijo": nombre, "Tipo": tipo, "Monto": monto, "Categoría": texto_(d.categoria), "Medio": tipo === "Gasto" ? texto_(d.medio) : "", "Día": dia, "Activa": "Si" });
}
function guardarConfig(cambios) {
  olvidarLecturas_();
  asegurarEstructura_();
  const t = tabla_(HOJA.CONFIG), c = cambios || {};
  for (const k of Object.keys(c)) {
    const def = CONFIG_CAMPOS.find(x => x[0] === k); if (!def) continue;
    let v = c[k];
    if (def[1] === "numero") {
      v = Math.round(numero_(v));
      if (k === "inicioMes" && !(v >= 1 && v <= 28)) return falla_("El día de inicio va de 1 a 28.", k);
      if (k === "alertaPct" && !(v >= 1 && v <= 100)) return falla_("El aviso va de 1 % a 100 %.", k);
      if (k === "diasAviso" && !(v >= 1 && v <= 31)) return falla_("Los días de aviso van de 1 a 31.", k);
      if (k === "valorUF" && (isNaN(v) || v < 0)) v = 0;
      if (k === "recordatorioHora") {
        if (isNaN(v) || v < 0 || v > 23) return falla_("Elige una hora de 1 a 23, o «No».", k);
        const correo = Object.prototype.hasOwnProperty.call(c, "correoResumen") ? texto_(c.correoResumen) : config_().correoResumen;
        if (v > 0 && !correo) return falla_("Para el recordatorio, escribe primero tu correo.", k);
      }
    } else if (k === "recordatorioHora") { /* número: se valida abajo */ } else if (k === "correoResumen") {
      v = texto_(v).toLowerCase().slice(0, 120);
      if (v && !correoValido_(v)) return falla_("Revisa el correo (por ejemplo, nombre@gmail.com).", k);
    } else v = texto_(v).slice(0, 40);
    const f = t.filas.find(x => texto_(x.Clave) === k);
    if (f) escribirFila_(t, f._fila, { "Valor": v }); else agregarFilas_(t, [{ "Clave": k, "Valor": v, "Descripción": def[3] }]);
  }
  let aviso = "";
  if (Object.prototype.hasOwnProperty.call(c, "correoResumen")) {
    olvidarLecturas_();
    try { programarResumen_(!!config_().correoResumen); }
    catch (e) { aviso = "Se guardó el correo, pero no pude programar el envío mensual: " + e.message; }
  }
  if (Object.prototype.hasOwnProperty.call(c, "correoResumen") || Object.prototype.hasOwnProperty.call(c, "recordatorioHora")) {
    olvidarLecturas_();
    try { programarRecordatorio_(); }
    catch (e) { aviso = (aviso ? aviso + " " : "") + "No pude programar el recordatorio diario: " + e.message; }
  }
  return { ok: true, datos: panelDatos(), aviso: aviso };
}

/* ── resumen del mes por correo (con PDF) ──────────────────────────── */
// Al cerrar cada período, un activador diario (8:00) envía el resumen del período que terminó.
// Se envía con MailApp (solo enviar como tú; Mis Finanzas no lee tu correo) a la dirección de Ajustes.
const RESUMEN_FN_ = "enviarResumenAutomatico";
function correoValido_(s) { return /^[^\s@<>"',;]+@[^\s@<>"',;]+\.[a-z]{2,}$/i.test(texto_(s)); }
function escHtml_(s) { return texto_(s).replace(/&/g, "&amp;").replace(/</g, "&lt;").replace(/>/g, "&gt;").replace(/"/g, "&quot;"); }
function programarResumen_(activo) {
  const actuales = ScriptApp.getProjectTriggers().filter(t => t.getHandlerFunction() === RESUMEN_FN_);
  if (!activo) { actuales.forEach(t => ScriptApp.deleteTrigger(t)); return false; }
  if (!actuales.length) {
    ScriptApp.newTrigger(RESUMEN_FN_).timeBased().everyDays(1).atHour(8).create();
    // el primero automático llega al cerrar el período en curso (no se reenvía el que ya pasó)
    PropertiesService.getScriptProperties().setProperty("FA_RESUMEN_ENVIADO", String(indicePeriodo_(ahora_(), config_().inicioMes) - 1));
  }
  return true;
}
function datosResumenMes_(indice, hoy) {
  const r = resumen_(indice, hoy);
  return {
    r: r,
    categorias: r.presupuesto.filter(p => p.gastado > 0).sort((a, b) => b.gastado - a.gastado),
    metas: estadoMetas_(hoy),
    tarjetas: estadoTarjetas_(hoy).filter(t => t.usado > 0),
    deudas: estadoDeudas_(hoy).filter(d => !d.terminada),
  };
}
// HTML del resumen: tablas y estilos en línea (lo leen Gmail, Outlook y el convertidor a PDF)
function htmlResumen_(d) {
  const r = d.r, cfg = config_(), AZUL = "#1F5C99", TINTA = "#1B2430", SUAVE = "#5B6475", VERDE = "#1E7B4A", ROJO = "#B3261E", NARANJO = "#9A5B00";
  const fila = (izq, der, color, negrita) => '<tr><td style="padding:7px 0;border-bottom:1px solid #E6EAF0;color:' + TINTA + '">' + izq + '</td><td style="padding:7px 0;border-bottom:1px solid #E6EAF0;text-align:right;white-space:nowrap;color:' + (color || TINTA) + (negrita ? ';font-weight:700' : '') + '">' + der + '</td></tr>';
  const titulo = t => '<h2 style="font-size:15px;margin:22px 0 6px;color:' + AZUL + '">' + t + '</h2>';
  const tabla = filas => '<table role="presentation" width="100%" cellpadding="0" cellspacing="0" style="border-collapse:collapse;font-size:14px">' + filas + '</table>';
  const cifra = (n, v, color) => '<td style="padding:10px 12px;background:#F3F6FA;border-radius:8px;width:50%"><div style="font-size:12px;color:' + SUAVE + '">' + n + '</div><div style="font-size:17px;font-weight:700;color:' + color + '">' + clp_(v) + '</div></td>';
  let h = '<div style="font-family:Arial,Helvetica,sans-serif;max-width:600px;margin:0 auto;color:' + TINTA + '">'
    + '<div style="font-size:12px;color:' + AZUL + ';letter-spacing:.04em">FINANZAPP · AMBILOR.LAB</div>'
    + '<h1 style="font-size:21px;margin:4px 0 2px">Resumen de ' + escHtml_(r.periodo.nombre) + '</h1>'
    + '<div style="color:' + SUAVE + ';font-size:13px">Del ' + r.periodo.desde.split("-").reverse().join("-") + ' al ' + r.periodo.hasta.split("-").reverse().join("-") + (cfg.nombre ? ' · ' + escHtml_(cfg.nombre) : '') + '</div>'
    + '<table role="presentation" width="100%" cellpadding="0" cellspacing="6" style="margin-top:14px;border-collapse:separate;max-width:420px">'
    + '<tr>' + cifra("Ingresos", r.ingresos, VERDE) + cifra("Gastos", r.gastos, TINTA) + '</tr>'
    + '<tr>' + cifra("Ahorro", r.ahorro, AZUL) + cifra("Disponible", r.disponible, r.disponible < 0 ? ROJO : VERDE) + '</tr></table>';
  if (r.presupuestoTotal > 0) {
    const usado = r.presupuestoTotal - r.presupuestoRestante;
    h += '<p style="margin:12px 0 0;font-size:14px">Presupuesto: usaste <b>' + clp_(usado) + '</b> de ' + clp_(r.presupuestoTotal) + ' (' + Math.round(usado * 100 / r.presupuestoTotal) + ' %).'
      + (r.presupuestoRestante < 0 ? ' <span style="color:' + ROJO + '">Te pasaste en ' + clp_(-r.presupuestoRestante) + '.</span>' : '') + '</p>';
  }
  const excedidas = d.categorias.filter(p => p.estado === "excedido");
  if (excedidas.length) h += '<p style="margin:10px 0 0;padding:10px 12px;background:#FBEAE9;border-radius:8px;font-size:14px;color:' + ROJO + '">Categorías sobre su presupuesto: ' + excedidas.map(p => escHtml_(p.nombre) + ' (' + clp_(p.gastado - p.presupuesto) + ' de más)').join(', ') + '.</p>';
  if (d.categorias.length) {
    h += titulo("Gastos por categoría") + tabla(d.categorias.map(p => {
      let vs = "";
      if (p.anterior > 0) { const dif = Math.round((p.gastado - p.anterior) * 100 / p.anterior); if (dif) vs = ' <span style="font-size:12px;color:' + (dif > 0 ? NARANJO : VERDE) + '">' + (dif > 0 ? '+' : '−') + Math.abs(dif) + ' % vs mes anterior</span>'; }
      const pres = p.presupuesto > 0 ? ' <span style="font-size:12px;color:' + SUAVE + '">de ' + clp_(p.presupuesto) + '</span>' : '';
      return fila(escHtml_(p.nombre) + vs, clp_(p.gastado) + pres, p.estado === "excedido" ? ROJO : null);
    }).join("") + fila("<b>Total</b>", clp_(r.gastos), null, true));
  } else h += '<p style="color:' + SUAVE + '">No hubo gastos registrados en este período.</p>';
  if (d.metas.length) h += titulo("Metas de ahorro") + tabla(d.metas.map(m => fila(escHtml_(m.nombre) + (m.lista ? ' <span style="font-size:12px;color:' + VERDE + '">¡lista!</span>' : (m.porMes ? ' <span style="font-size:12px;color:' + SUAVE + '">' + clp_(m.porMes) + ' al mes para llegar</span>' : '')), clp_(m.ahorrado) + ' <span style="font-size:12px;color:' + SUAVE + '">de ' + clp_(m.objetivo) + ' · ' + m.pct + ' %</span>')).join(""));
  if (d.tarjetas.length) h += titulo("Tarjetas de crédito") + tabla(d.tarjetas.map(t => fila(escHtml_(t.nombre) + (t.proximoPago ? ' <span style="font-size:12px;color:' + SUAVE + '">paga el ' + t.proximoPago.split("-").reverse().slice(0, 2).join("/") + '</span>' : ''), clp_(t.usado) + (t.cupo ? ' <span style="font-size:12px;color:' + SUAVE + '">de ' + clp_(t.cupo) + '</span>' : ''))).join(""));
  if (d.deudas.length) h += titulo("Deudas") + tabla(d.deudas.map(x => fila(escHtml_(x.nombre) + ' <span style="font-size:12px;color:' + SUAVE + '">' + x.quedan + ' de ' + x.cuotas + ' cuotas por pagar</span>', clp_(x.saldo))).join(""));
  const url = urlPanel_();
  h += '<p style="margin:24px 0 0;font-size:13px;color:' + SUAVE + '">' + (url ? '<a href="' + escHtml_(url) + '" style="color:' + AZUL + '">Abrir Mis Finanzas</a> · ' : '') + 'Lo envía tu propia planilla de Mis Finanzas. Para dejar de recibirlo, borra el correo en Más → Ajustes.</p></div>';
  return h;
}
function enviarResumenDe_(indice, hoy) {
  const cfg = config_(), correo = cfg.correoResumen;
  if (!correo) return falla_("Primero escribe en Ajustes el correo donde quieres recibirlo.", "correoResumen");
  const d = datosResumenMes_(indice, hoy), nombre = "Mis Finanzas · " + d.r.periodo.nombre, html = htmlResumen_(d);
  const pdf = Utilities.newBlob('<html><head><meta charset="utf-8"></head><body style="margin:24px">' + html + '</body></html>', "text/html", nombre + ".html").getAs("application/pdf").setName(nombre + ".pdf");
  MailApp.sendEmail({ to: correo, subject: "Tu resumen de " + d.r.periodo.nombre + " · Mis Finanzas", htmlBody: html, name: "Mis Finanzas", attachments: [pdf] });
  return { ok: true, correo: correo, periodo: d.r.periodo.nombre };
}
// Para ejecutar en el editor después de publicar una versión con permisos nuevos: usa directamente
// el correo y los activadores, sin atrapar errores, para que Google pida el permiso o muestre el error exacto.
function autorizarPermisos() {
  const cupo = MailApp.getRemainingDailyQuota();
  const activadores = ScriptApp.getProjectTriggers().length;
  Logger.log("Permisos listos. Correos disponibles hoy: " + cupo + ". Activadores: " + activadores + ".");
  return { ok: true, cupo: cupo, activadores: activadores };
}
// Desde el panel: envía ahora el resumen del período que se está mirando
function enviarResumen(indice) {
  olvidarLecturas_();
  const hoy = ahora_(), cfg = config_(), actual = indicePeriodo_(hoy, cfg.inicioMes), pedido = Number(indice);
  const i = Number.isInteger(pedido) && pedido <= actual && pedido >= actual - 1200 ? pedido : actual;
  try { return enviarResumenDe_(i, hoy); } catch (e) { return falla_("No se pudo enviar: " + e.message); }
}
// Activador diario: si cerró un período que aún no se envió, lo envía (una sola vez)
function enviarResumenAutomatico() {
  olvidarLecturas_();
  const cfg = config_(); if (!cfg.correoResumen) return { ok: true, enviado: false };
  const lock = LockService.getScriptLock(); lock.waitLock(20000);
  try {
    const hoy = ahora_(), cerrado = indicePeriodo_(hoy, cfg.inicioMes) - 1, props = PropertiesService.getScriptProperties();
    const ultimo = Number(props.getProperty("FA_RESUMEN_ENVIADO"));
    if (Number.isInteger(ultimo) && ultimo >= cerrado) return { ok: true, enviado: false };
    const r = enviarResumenDe_(cerrado, hoy);
    if (r.ok) props.setProperty("FA_RESUMEN_ENVIADO", String(cerrado));
    return Object.assign({ enviado: r.ok }, r);
  } finally { lock.releaseLock(); }
}

/* ── recordatorio diario por correo ─────────────────────────────────── */
// A la hora elegida (Google lo corre dentro de esa hora), solo si ese día no se registró nada.
// Sale a la misma dirección del resumen del mes, con MailApp (solo enviar).
const RECORDATORIO_FN_ = "enviarRecordatorio";
function programarRecordatorio_() {
  const cfg = config_(), hora = cfg.correoResumen ? cfg.recordatorioHora : 0;
  ScriptApp.getProjectTriggers().filter(t => t.getHandlerFunction() === RECORDATORIO_FN_).forEach(t => ScriptApp.deleteTrigger(t));
  if (hora) ScriptApp.newTrigger(RECORDATORIO_FN_).timeBased().everyDays(1).atHour(hora).create();
  return hora;
}
// ¿Se registró algo hoy? (fecha de hoy, o anotado hoy aunque sea de otro día)
function registroHoy_(hoy) {
  const t = tabla_(HOJA.MOV), dia = iso_(hoy); if (!t) return false;
  return t.filas.some(f => { const a = fechaDe_(f.Fecha), b = fechaDe_(f.Registrado); return (a && iso_(a) === dia) || (b && iso_(b) === dia); });
}
function htmlRecordatorio_(hoy, cfg) {
  const AZUL = "#1F5C99", SUAVE = "#5B6B7F", TEXTO = "#1B2430";
  const i = indicePeriodo_(hoy, cfg.inicioMes), r = resumen_(i, hoy), p = proyeccion_(i, hoy, r, estadoFijos_(i, hoy, cfg), cfg), url = urlPanel_();
  let h = '<div style="font-family:Segoe UI,Roboto,Arial,sans-serif;color:' + TEXTO + ';max-width:520px;margin:0 auto;padding:8px">';
  h += '<p style="font-size:17px;margin:0 0 6px"><b>' + (cfg.nombre ? escHtml_(cfg.nombre) + ', h' : 'H') + 'oy no anotaste nada en Mis Finanzas.</b></p>';
  h += '<p style="margin:0 0 16px;color:' + SUAVE + '">Si gastaste algo, regístralo ahora: son 10 segundos.</p>';
  if (url) h += '<p style="margin:0 0 20px"><a href="' + escHtml_(url + "?a=registrar") + '" style="display:inline-block;background:' + AZUL + ';color:#fff;text-decoration:none;padding:12px 20px;border-radius:10px;font-weight:600">Registrar un gasto</a></p>';
  h += '<p style="margin:0 0 4px">' + escHtml_(r.periodo.nombre) + ': llevas <b>' + clp_(r.gastos) + '</b> en gastos' + (r.presupuestoTotal > 0 ? ' y te quedan <b>' + clp_(r.presupuestoRestante) + '</b> del presupuesto' : '') + '.</p>';
  if (p) h += '<p style="margin:0 0 4px">A este ritmo terminas el mes con <b>' + clp_(Math.round(p.disponible / 1000) * 1000) + '</b> disponibles' + (p.presupuesto && p.presupuesto.diferencia < 0 ? ' y te pasarías del presupuesto en ' + clp_(Math.round(-p.presupuesto.diferencia / 1000) * 1000) : '') + '.</p>';
  h += '<p style="margin:20px 0 0;font-size:13px;color:' + SUAVE + '">Lo envía tu propia planilla de Mis Finanzas, solo los días sin registros. Para no recibirlo, en Más → Ajustes elige «No» en el recordatorio diario.</p></div>';
  return h;
}
function enviarRecordatorio() {
  olvidarLecturas_();
  const cfg = config_(); if (!cfg.correoResumen || !cfg.recordatorioHora) return { ok: true, enviado: false };
  const hoy = ahora_(), dia = iso_(hoy), props = PropertiesService.getScriptProperties();
  if (props.getProperty("FA_RECORDATORIO") === dia) return { ok: true, enviado: false };   // uno por día como máximo
  if (registroHoy_(hoy)) return { ok: true, enviado: false, motivo: "ya registró" };
  MailApp.sendEmail({ to: cfg.correoResumen, subject: "¿Gastaste algo hoy? Anótalo en Mis Finanzas", htmlBody: htmlRecordatorio_(hoy, cfg), name: "Mis Finanzas" });
  props.setProperty("FA_RECORDATORIO", dia);
  return { ok: true, enviado: true };
}
