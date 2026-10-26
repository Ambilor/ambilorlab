// Mis Finanzas · app sin conexión (PWA)
// Anota en el teléfono aunque no haya señal. Para subir, abre el panel de Apps Script (?a=pwa) con los
// pendientes en el enlace; el panel los guarda con la sesión de Google de la persona y vuelve aquí con
// #pwa=<resultado + categorías y resumen del mes>. Cada registro lleva su código (cid): reenviar no duplica.
import { todos, poner, quitar, leerEstado, guardarEstado } from "./db.js";
import { clp, hoyIso } from "./utils.js";

const VERSION_APP = "1.0";
const TIPOS = ["Gasto", "Ingreso", "Ahorro", "Retiro de meta", "Pago tarjeta", "Pago deuda"];
const RE_PANEL = /^https:\/\/script\.google\.com\/(macros|a\/macros\/[^/?#]+)\/s\/[\w-]+\/exec$/;
const MAX_ENVIO = 200;   // lo mismo que acepta el panel por viaje

const E = { cat: null, panel: "", pend: [], atajos: [], vista: "inicio", ultimoMedio: "" };
let F = null;            // formulario abierto
let abridor = null;      // botón que abrió la hoja (vuelve el foco al cerrar)

const $ = id => document.getElementById(id);
const esc = s => String(s ?? "").replace(/&/g, "&amp;").replace(/</g, "&lt;").replace(/>/g, "&gt;").replace(/"/g, "&quot;").replace(/'/g, "&#39;");
const digitos = v => Number(String(v ?? "").replace(/\D/g, "").slice(0, 10)) || 0;
const miles = n => (n > 0 ? Number(n).toLocaleString("es-CL") : "");
const lista = v => (Array.isArray(v) ? v : []);
const esNeg = t => t !== "Ingreso" && t !== "Retiro de meta";

function codigo() {
  const a = new Uint8Array(16); crypto.getRandomValues(a);
  return Array.from(a, b => "abcdefghijklmnopqrstuvwxyz0123456789"[b % 36]).join("");
}
function limpiarPanel(u) {
  const s = String(u || "").trim().split(/[?#]/)[0];
  return RE_PANEL.test(s) ? s : "";
}
// Lo que llega del panel se toma como datos, nunca como HTML (todo se pinta con esc)
function normalizarCatalogo(c) {
  if (!c || typeof c !== "object") return null;
  return {
    version: String(c.version || ""), hoy: String(c.hoy || ""), actualizado: String(c.actualizado || ""), nombre: String(c.nombre || ""),
    periodo: String(c.periodo || ""), ingresos: +c.ingresos || 0, gastos: +c.gastos || 0, ahorro: +c.ahorro || 0, disponible: +c.disponible || 0,
    presupuesto: lista(c.presupuesto), categorias: lista(c.categorias), medios: lista(c.medios).map(String), tarjetas: lista(c.tarjetas).map(String),
    metas: lista(c.metas), deudas: lista(c.deudas), recientes: lista(c.recientes),
    frecuentes: c.frecuentes && typeof c.frecuentes === "object" ? { Gasto: lista(c.frecuentes.Gasto), Ingreso: lista(c.frecuentes.Ingreso) } : { Gasto: [], Ingreso: [] },
    panel: String(c.panel || ""),
  };
}
function colorCat(nombre) {
  const c = E.cat && E.cat.categorias.find(x => x.nombre === nombre);
  return c && /^#[0-9a-f]{3,8}$/i.test(c.color) ? c.color : "#6B7A8F";
}
function catsDe(tipo) {
  if (!E.cat) return [];
  const frec = E.cat.frecuentes[tipo] || [];
  return E.cat.categorias.filter(c => c.tipo === tipo)
    .sort((a, b) => (frec.indexOf(a.nombre) + 1 || 99) - (frec.indexOf(b.nombre) + 1 || 99));
}
function titulo(d) {
  if (d.nota) return d.nota;
  if (d.categoria) return d.categoria;
  if (d.tipo === "Ahorro" || d.tipo === "Retiro de meta") { const m = E.cat && E.cat.metas.find(x => x.id === d.meta); if (m) return d.tipo + " · " + m.nombre; }
  if (d.tipo === "Pago deuda") { const x = E.cat && E.cat.deudas.find(y => y.id === d.deuda); if (x) return "Pago · " + x.nombre; }
  if (d.tipo === "Pago tarjeta" && d.medio) return "Pago · " + d.medio;
  return d.tipo;
}
function fechaCorta(isoTxt) {
  const p = String(isoTxt || "").split("-");
  return p.length === 3 ? Number(p[2]) + "/" + Number(p[1]) : "";
}

/* ── validación: las mismas reglas que el panel (validarMovimiento_) ── */
function validar(d, { parcial = false } = {}) {
  const mal = (error, campo) => ({ ok: false, error, campo });
  const c = E.cat;
  if (!c) return mal("Conecta tu planilla primero, para traer tus categorías.", "");
  if (!TIPOS.includes(d.tipo)) return mal("Elige el tipo.", "tipo");
  if (!parcial || d.monto) {
    if (!(d.monto > 0)) return mal("Escribe un monto mayor que cero.", "monto");
    if (d.monto > 999999999) return mal("El monto es demasiado grande.", "monto");
  }
  if (!parcial && (!/^\d{4}-\d{2}-\d{2}$/.test(d.fecha) || d.fecha > hoyIso())) return mal("La fecha no puede ser futura.", "fecha");
  if ((d.tipo === "Gasto" || d.tipo === "Ingreso") && !c.categorias.some(x => x.nombre === d.categoria && x.tipo === d.tipo)) return mal("Elige una categoría.", "categoria");
  if (d.tipo === "Gasto" && !c.medios.includes(d.medio)) return mal("Elige cómo pagaste.", "medio");
  if (d.tipo === "Pago tarjeta" && !c.tarjetas.includes(d.medio)) return mal("Elige la tarjeta que pagaste.", "medio");
  if ((d.tipo === "Ahorro" || d.tipo === "Retiro de meta") && !c.metas.some(m => m.id === d.meta)) return mal("Elige la meta.", "meta");
  if (d.tipo === "Pago deuda" && !c.deudas.some(x => x.id === d.deuda)) return mal("Elige la deuda.", "deuda");
  if (d.cuotas < 1 || d.cuotas > 48) return mal("Las cuotas van de 1 a 48.", "cuotas");
  return { ok: true };
}
// Deja solo los campos que corresponden al tipo (lo que el panel guardaría)
function depurar(d) {
  const t = d.tipo, conTarjeta = t === "Gasto" && E.cat && E.cat.tarjetas.includes(d.medio);
  return {
    tipo: t, monto: d.monto || 0, fecha: d.fecha, nota: String(d.nota || "").trim().slice(0, 120),
    categoria: t === "Gasto" || t === "Ingreso" ? d.categoria : "",
    medio: t === "Gasto" || t === "Pago tarjeta" ? d.medio : "",
    cuotas: conTarjeta ? Math.round(d.cuotas) || 1 : 1,
    meta: t === "Ahorro" || t === "Retiro de meta" ? d.meta : "",
    deuda: t === "Pago deuda" ? d.deuda : "",
  };
}

/* ── registrar y subir ── */
async function anotar(d) {
  const p = Object.assign(depurar(d), { cid: codigo(), creado: new Date().toISOString() });
  await poner("pendientes", p);
  E.pend.push(p);
  if (p.medio && p.tipo === "Gasto") { E.ultimoMedio = p.medio; guardarEstado("ultimoMedio", p.medio); }
  pintarTodo();
  avisar(titulo(p) + " · " + clp(p.monto) + " anotado", "Deshacer", async () => {
    await quitar("pendientes", p.cid); E.pend = E.pend.filter(x => x.cid !== p.cid); pintarTodo();
  });
}

function sincronizar() {
  if (!E.panel) { ir("ajustes"); $("in-panel2").focus(); avisar("Primero pega el enlace de tu panel."); return; }
  if (!navigator.onLine) { avisar("Sin conexión. Tus registros siguen guardados aquí; súbelos cuando vuelva la señal."); return; }
  const envio = E.pend.filter(p => !p.error).slice(0, MAX_ENVIO)
    .map(p => ({ cid: p.cid, tipo: p.tipo, monto: p.monto, fecha: p.fecha, categoria: p.categoria, medio: p.medio, cuotas: p.cuotas, meta: p.meta, deuda: p.deuda, nota: p.nota }));
  const retorno = location.origin + location.pathname;
  location.href = E.panel + "?a=pwa#d=" + encodeURIComponent(JSON.stringify(envio)) + "&r=" + encodeURIComponent(retorno);
}

// Vuelta desde el panel: #pwa=<{resultados, catalogo}>
async function procesarRetorno() {
  const m = location.hash.match(/^#pwa=(.+)$/);
  if (!m) return;
  history.replaceState(null, "", location.pathname);
  let r;
  try { r = JSON.parse(decodeURIComponent(m[1])); } catch { avisar("No se pudo leer la respuesta del panel. Toca subir otra vez."); return; }
  const cat = normalizarCatalogo(r && r.catalogo);
  if (cat) { E.cat = cat; await guardarEstado("catalogo", cat); }
  E.pend = await todos("pendientes");
  let subidos = 0, malos = 0;
  for (const x of lista(r && r.resultados)) {
    const p = E.pend.find(q => q.cid === x.cid);
    if (!p) continue;
    if (x.ok) { await quitar("pendientes", p.cid); subidos++; }
    else { p.error = String(x.error || "No se pudo guardar."); p.campo = String(x.campo || ""); await poner("pendientes", p); malos++; }
  }
  E.pend = await todos("pendientes");
  pintarTodo();
  if (malos) { ir("pendientes"); avisar(malos === 1 ? "1 registro necesita corrección." : malos + " registros necesitan corrección."); }
  else avisar(subidos ? (subidos === 1 ? "1 registro subido a tu planilla." : subidos + " registros subidos a tu planilla.") : "Datos al día.");
}

// Enlaces de atajos: ?nuevo=Gasto&monto=2500&categoria=…&medio=…&nota=…&guardar=1 · ?atajo=<id> · ?sync=1
async function procesarEnlace() {
  const q = new URLSearchParams(location.search);
  if (![...q.keys()].length) return;
  history.replaceState(null, "", location.pathname + location.hash);
  if (q.get("sync") === "1") { sincronizar(); return; }
  if (q.has("atajo")) {
    const a = E.atajos.find(x => x.id === q.get("atajo"));
    if (a) usarAtajo(a); else avisar("Ese atajo no existe en este teléfono.");
    return;
  }
  if (q.has("nuevo")) {
    const d = {
      tipo: TIPOS.includes(q.get("nuevo")) ? q.get("nuevo") : "Gasto", monto: digitos(q.get("monto")), fecha: hoyIso(),
      categoria: q.get("categoria") || "", medio: q.get("medio") || "", nota: (q.get("nota") || "").slice(0, 120),
      cuotas: Math.round(Number(q.get("cuotas"))) || 1, meta: q.get("meta") || "", deuda: q.get("deuda") || "",
    };
    if (q.get("guardar") === "1" && validar(d).ok) await anotar(d);
    else abrirForm({ modo: "registro", datos: d });
  }
}

/* ── atajos ── */
// Un atajo sin nota deja su nombre como nota (así se reconoce en la planilla: «Metro», «Café»)
function usarAtajo(a) {
  const d = Object.assign({}, a, { fecha: hoyIso(), nota: a.nota || a.nombre || "" });
  if (a.monto > 0 && validar(d).ok) anotar(d);
  else abrirForm({ modo: "registro", datos: d });
}
function sugeridos() {
  if (!E.cat) return [];
  const k = x => [x.tipo, x.categoria, x.medio, x.monto, x.nota || ""].join("|");
  const ya = new Set(E.atajos.map(k));
  return E.cat.recientes.filter(s => TIPOS.includes(s.tipo) && !ya.has(k(s))).slice(0, 4);
}
function enlaceAtajo(a) {
  const q = new URLSearchParams({ nuevo: a.tipo });
  if (a.monto > 0) q.set("monto", a.monto);
  ["categoria", "medio", "nota", "meta", "deuda"].forEach(c => { if (a[c]) q.set(c, a[c]); });
  if (a.cuotas > 1) q.set("cuotas", a.cuotas);
  if (a.monto > 0) q.set("guardar", "1");
  return location.origin + location.pathname + "?" + q.toString();
}
async function copiar(texto) {
  try { await navigator.clipboard.writeText(texto); avisar("Enlace copiado. Pégalo en «Abrir URL» de tu app de atajos."); }
  catch { window.prompt("Copia este enlace:", texto); }
}

/* ── formulario (registro y atajos) ── */
function abrirForm({ modo, datos = {}, cid = "", id = "", error = "" }) {
  if (!E.cat) { ir("inicio"); avisar("Conecta tu planilla primero, para traer tus categorías."); return; }
  abridor = document.activeElement;
  const tipo = TIPOS.includes(datos.tipo) ? datos.tipo : "Gasto";
  F = { modo, cid, id, tipo, categoria: datos.categoria || "" };
  const atajo = modo === "atajo";
  $("hoja-titulo").textContent = atajo ? (id ? "Editar atajo" : "Nuevo atajo") : (cid ? "Corregir registro" : "Anotar");
  $("r-nombre").classList.toggle("oculto", !atajo);
  $("r-fecha").classList.toggle("oculto", atajo);
  $("l-monto").textContent = atajo ? "Monto (vacío = preguntar cada vez)" : "Monto";
  $("f-nombre").value = datos.nombre || "";
  $("f-monto").value = miles(datos.monto);
  $("f-fecha").value = datos.fecha || hoyIso();
  $("f-fecha").max = hoyIso();
  $("f-nota").value = datos.nota || "";
  $("f-cuotas").value = datos.cuotas || 1;
  $("f-guardar").textContent = atajo ? "Guardar atajo" : (cid ? "Guardar corrección" : "Guardar");
  pintarForm(datos);
  mostrarError(error);
  $("hoja").classList.remove("oculto");
  document.body.style.overflow = "hidden";
  requestAnimationFrame(() => (atajo && !datos.nombre ? $("f-nombre") : $("f-monto")).focus());
}
function cerrarForm() {
  $("hoja").classList.add("oculto");
  document.body.style.overflow = "";
  F = null;
  if (abridor && abridor.focus) abridor.focus();
}
function mostrarError(t, campo) {
  $("f-error").textContent = t || "";
  $("f-error").classList.toggle("oculto", !t);
  const foco = { monto: "f-monto", medio: "f-medio", meta: "f-meta", deuda: "f-deuda", fecha: "f-fecha", cuotas: "f-cuotas", nombre: "f-nombre" }[campo];
  if (foco) $(foco).focus();
}
function opciones(sel, items, valor, vacio) {
  sel.innerHTML = (vacio ? '<option value="">' + esc(vacio) + "</option>" : "") +
    items.map(o => '<option value="' + esc(o.v) + '"' + (o.v === valor ? " selected" : "") + ">" + esc(o.t) + "</option>").join("");
}
// Pinta los campos que dependen del tipo. datos: valores a conservar (medio, meta, deuda)
function pintarForm(datos = {}) {
  const t = F.tipo, c = E.cat;
  $("f-tipos").innerHTML = TIPOS.map(x => '<button type="button" class="chip" role="radio" aria-checked="' + (x === t) + '" data-tipo="' + esc(x) + '">' + esc(x) + "</button>").join("");
  const conCat = t === "Gasto" || t === "Ingreso";
  $("r-cat").classList.toggle("oculto", !conCat);
  if (conCat) {
    const cats = catsDe(t);
    if (!cats.some(x => x.nombre === F.categoria)) F.categoria = "";
    $("f-cats").innerHTML = cats.length
      ? cats.map(x => '<button type="button" class="chip" role="radio" aria-checked="' + (x.nombre === F.categoria) + '" data-cat="' + esc(x.nombre) + '"><span class="bolita" style="background:' + esc(colorCat(x.nombre)) + '"></span>' + esc(x.nombre) + "</button>").join("")
      : '<p class="sutil">No tienes categorías de ' + esc(t.toLowerCase()) + ". Créalas en el panel.</p>";
  }
  const conMedio = t === "Gasto" || t === "Pago tarjeta";
  $("r-medio").classList.toggle("oculto", !conMedio);
  if (conMedio) {
    const medios = t === "Pago tarjeta" ? c.tarjetas : c.medios;
    const actual = medios.includes(datos.medio) ? datos.medio : (medios.includes($("f-medio").value) ? $("f-medio").value : (medios.includes(E.ultimoMedio) ? E.ultimoMedio : medios[0] || ""));
    opciones($("f-medio"), medios.map(m => ({ v: m, t: m })), actual, medios.length ? "" : "Sin tarjetas: agrégalas en el panel");
  }
  $("r-meta").classList.toggle("oculto", !(t === "Ahorro" || t === "Retiro de meta"));
  opciones($("f-meta"), c.metas.map(m => ({ v: String(m.id), t: String(m.nombre) })), datos.meta || $("f-meta").value, c.metas.length ? "Elige la meta" : "Sin metas: créalas en el panel");
  $("r-deuda").classList.toggle("oculto", t !== "Pago deuda");
  opciones($("f-deuda"), c.deudas.map(m => ({ v: String(m.id), t: String(m.nombre) })), datos.deuda || $("f-deuda").value, c.deudas.length ? "Elige la deuda" : "Sin deudas activas");
  pintarCuotas();
}
function pintarCuotas() {
  const ok = F && F.tipo === "Gasto" && E.cat.tarjetas.includes($("f-medio").value);
  $("r-cuotas").classList.toggle("oculto", !ok);
  if (!ok) $("f-cuotas").value = 1;
}
function leerForm() {
  return {
    tipo: F.tipo, monto: digitos($("f-monto").value), fecha: $("f-fecha").value, categoria: F.categoria,
    medio: $("f-medio").value, cuotas: Math.round(Number($("f-cuotas").value)) || 1,
    meta: $("f-meta").value, deuda: $("f-deuda").value, nota: $("f-nota").value.trim(),
  };
}
async function guardarForm(e) {
  e.preventDefault();
  if (!F) return;
  const d = leerForm(), atajo = F.modo === "atajo";
  if (atajo) {
    const nombre = $("f-nombre").value.trim().slice(0, 30);
    if (!nombre) return mostrarError("Ponle un nombre al atajo.", "nombre");
    const v = validar(d, { parcial: true }); if (!v.ok) return mostrarError(v.error, v.campo);
    const a = Object.assign(depurar(d), { id: F.id || codigo(), nombre });
    delete a.fecha;
    const previo = E.atajos.find(x => x.id === a.id);
    a.orden = previo ? previo.orden : Date.now();
    await poner("atajos", a);
    E.atajos = (await todos("atajos")).sort((x, y) => x.orden - y.orden);
    cerrarForm(); pintarTodo(); avisar("Atajo guardado.");
    return;
  }
  const v = validar(d); if (!v.ok) return mostrarError(v.error, v.campo);
  if (F.cid) {
    const p = Object.assign(depurar(d), { cid: F.cid, creado: new Date().toISOString() });
    await poner("pendientes", p);
    E.pend = await todos("pendientes");
    cerrarForm(); pintarTodo(); avisar("Corregido. Se subirá en la próxima sincronización.");
    return;
  }
  cerrarForm();
  await anotar(d);
}

/* ── pantallas ── */
function ir(vista) {
  E.vista = vista;
  document.querySelectorAll(".vista").forEach(v => v.classList.toggle("on", v.id === "v-" + vista));
  document.querySelectorAll(".nav-b").forEach(b => { const on = b.dataset.ir === vista; b.classList.toggle("on", on); if (on) b.setAttribute("aria-current", "page"); else b.removeAttribute("aria-current"); });
  window.scrollTo(0, 0);
}
function filaMov(p) {
  const neg = esNeg(p.tipo);
  const sub = [fechaCorta(p.fecha), p.tipo, p.categoria && p.nota ? p.categoria : "", p.medio, p.cuotas > 1 ? p.cuotas + " cuotas" : ""].filter(Boolean).join(" · ");
  return '<div class="fila' + (p.error ? " mala" : "") + '"><div class="txt"><b>' + esc(titulo(p)) + "</b><small>" + esc(sub) + '</small></div>' +
    '<span class="monto-f ' + (neg ? "neg" : "pos") + '">' + (neg ? "" : "+") + esc(clp(p.monto)) + "</span>" +
    '<div class="acc"><button type="button" data-acc="corregir" data-id="' + esc(p.cid) + '" aria-label="Corregir"><svg class="i"><use href="#i-editar"/></svg></button>' +
    '<button type="button" data-acc="descartar" data-id="' + esc(p.cid) + '" aria-label="Descartar"><svg class="i"><use href="#i-borrar"/></svg></button></div>' +
    (p.error ? '<p class="motivo"><svg class="i"><use href="#i-alerta"/></svg>' + esc(p.error) + "</p>" : "") + "</div>";
}
function pintarCab() {
  const n = E.pend.length;
  $("cab-sub").textContent = E.cat && E.cat.nombre ? "Hola, " + E.cat.nombre : (E.cat ? E.cat.periodo : "Sin conexión a tu planilla todavía");
  [["sync-n", n], ["nav-n", n]].forEach(([id, v]) => { $(id).textContent = v > 99 ? "99+" : v; $(id).classList.toggle("oculto", !v); });
  $("btn-sync").setAttribute("aria-label", n ? "Subir " + n + " registros a tu planilla" : "Sincronizar con tu planilla");
  $("banda-red").classList.toggle("oculto", navigator.onLine);
}
function pintarInicio() {
  const conectado = !!(E.panel && E.cat);
  $("conectar").classList.toggle("oculto", conectado);
  if (!conectado && !$("in-panel").value) $("in-panel").value = E.panel;
  const n = E.pend.length, malos = E.pend.filter(p => p.error).length;
  $("aviso-pend").classList.toggle("oculto", !n);
  $("aviso-pend-txt").textContent = (n === 1 ? "1 registro por subir" : n + " registros por subir") + (malos ? " · " + malos + " con problema" : "");
  $("aviso-pend").querySelector("b").textContent = navigator.onLine && !malos ? "Subir ahora" : "Ver";

  $("bloque-atajos").classList.toggle("oculto", !E.cat);
  const sug = sugeridos();
  const tarjetas = E.atajos.map(a =>
    '<button type="button" class="atajo" data-acc="usar" data-id="' + esc(a.id) + '"><b><span class="bolita" style="background:' + esc(colorCat(a.categoria)) + '"></span><span>' + esc(a.nombre) + "</span></b>" +
    "<small>" + esc(a.monto > 0 ? clp(a.monto) : "Escribir monto") + (a.medio ? " · " + esc(a.medio) : "") + "</small></button>").concat(
    sug.map((s, i) =>
      '<button type="button" class="atajo sug" data-acc="sugerido" data-i="' + i + '"><b><span class="bolita" style="background:' + esc(colorCat(s.categoria)) + '"></span><span>' + esc(s.nota || s.categoria) + "</span></b>" +
      "<small>" + esc(clp(s.monto)) + " · lo anotas seguido</small></button>"));
  $("lista-atajos").innerHTML = tarjetas.length ? tarjetas.join("")
    : '<p class="nota vacio">Crea atajos para lo que anotas seguido (café, metro, almuerzo) y regístralos con un toque. <button type="button" class="link" data-acc="nuevo-atajo">Crear un atajo</button></p>';

  $("bloque-mes").classList.toggle("oculto", !E.cat);
  if (!E.cat) return;
  const c = E.cat;
  $("mes-nombre").textContent = c.periodo || "Este mes";
  $("k-disp").textContent = clp(c.disponible);
  $("k-ing").textContent = clp(c.ingresos);
  $("k-gas").textContent = clp(c.gastos);
  $("k-aho").textContent = clp(c.ahorro);
  const cuando = c.actualizado ? new Date(c.actualizado) : null;
  let nota = cuando && !isNaN(cuando) ? "Datos de tu planilla del " + cuando.toLocaleDateString("es-CL", { day: "numeric", month: "short" }) + ", " + cuando.toLocaleTimeString("es-CL", { hour: "2-digit", minute: "2-digit", hourCycle: "h23" }) + "." : "";
  const gastoPend = E.pend.filter(p => p.tipo === "Gasto" || p.tipo === "Pago deuda").reduce((a, p) => a + p.monto, 0);
  if (n) nota += " No incluye " + (n === 1 ? "1 registro" : n + " registros") + " por subir" + (gastoPend ? " (" + clp(gastoPend) + " en gastos)" : "") + ".";
  $("mes-nota").textContent = nota;
  const pres = c.presupuesto.filter(p => p && p.nombre);
  $("t-pres").classList.toggle("oculto", !pres.length);
  $("lista-pres").classList.toggle("oculto", !pres.length);
  $("lista-pres").innerHTML = pres.map(p => {
    const tope = +p.presupuesto || 0, g = +p.gastado || 0, pct = tope > 0 ? Math.min(100, Math.round(g * 100 / tope)) : 0;
    const estado = ["alerta", "excedido"].includes(p.estado) ? p.estado : "";
    return '<div class="fila"><div class="txt"><b>' + esc(p.nombre) + "</b><small>" + esc(tope > 0 ? clp(g) + " de " + clp(tope) : clp(g) + " · sin presupuesto") + "</small>" +
      (tope > 0 ? '<div class="barra"><i class="' + estado + '" style="width:' + pct + '%"></i></div>' : "") + "</div>" +
      (tope > 0 ? '<span class="monto-f">' + Math.round(g * 100 / tope) + "%</span>" : "") + "</div>";
  }).join("");
}
function pintarPend() {
  const orden = [...E.pend].sort((a, b) => (b.error ? 1 : 0) - (a.error ? 1 : 0) || String(b.fecha).localeCompare(String(a.fecha)) || String(b.creado).localeCompare(String(a.creado)));
  $("lista-pend").innerHTML = orden.length ? orden.map(filaMov).join("") : '<p class="vacio">Todo está en tu planilla. No hay nada por subir.</p>';
  $("btn-subir-pend").classList.toggle("oculto", !E.pend.some(p => !p.error));
}
function pintarAjustes() {
  const filas = E.atajos.map(a =>
    '<div class="fila"><div class="txt"><b>' + esc(a.nombre) + "</b><small>" + esc([a.tipo, a.categoria, a.monto > 0 ? clp(a.monto) : "pregunta el monto", a.medio].filter(Boolean).join(" · ")) + "</small></div>" +
    '<div class="acc"><button type="button" data-acc="copiar-atajo" data-id="' + esc(a.id) + '" aria-label="Copiar enlace de ' + esc(a.nombre) + '"><svg class="i"><use href="#i-copiar"/></svg></button>' +
    '<button type="button" data-acc="editar-atajo" data-id="' + esc(a.id) + '" aria-label="Editar ' + esc(a.nombre) + '"><svg class="i"><use href="#i-editar"/></svg></button>' +
    '<button type="button" data-acc="borrar-atajo" data-id="' + esc(a.id) + '" aria-label="Borrar ' + esc(a.nombre) + '"><svg class="i"><use href="#i-borrar"/></svg></button></div></div>').concat(
    sugeridos().map((s, i) =>
      '<div class="fila"><div class="txt"><b>' + esc(s.nota || s.categoria) + "</b><small>Sugerido · " + esc([s.categoria, clp(s.monto), s.medio].filter(Boolean).join(" · ")) + "</small></div>" +
      '<div class="acc"><button type="button" data-acc="guardar-sugerido" data-i="' + i + '" aria-label="Guardar como atajo"><svg class="i"><use href="#i-plus"/></svg></button></div></div>'));
  $("lista-atajos-aj").innerHTML = filas.length ? filas.join("") : '<p class="vacio">Aún no tienes atajos.</p>';
  if (document.activeElement !== $("in-panel2")) $("in-panel2").value = E.panel;
  $("link-panel").href = E.panel || "#";
  $("link-panel").classList.toggle("oculto", !E.panel);
  $("version").textContent = "App " + VERSION_APP + (E.cat && E.cat.version ? " · panel " + E.cat.version : "");
}
function pintarTodo() { pintarCab(); pintarInicio(); pintarPend(); pintarAjustes(); }

/* ── aviso inferior ── */
let avisoT = null, avisoFn = null;
function avisar(texto, accion, fn) {
  $("toast-txt").textContent = texto;
  $("toast-acc").textContent = accion || "";
  $("toast-acc").classList.toggle("oculto", !accion);
  avisoFn = fn || null;
  $("toast").classList.add("on");
  clearTimeout(avisoT);
  avisoT = setTimeout(() => { $("toast").classList.remove("on"); avisoFn = null; }, accion ? 6000 : 3500);
}

/* ── eventos ── */
async function guardarPanel(valor, errorId) {
  const u = limpiarPanel(valor);
  $(errorId).classList.toggle("oculto", !!u);
  if (!u) { $(errorId).textContent = "Ese enlace no parece el de tu panel. Debe empezar con https://script.google.com/ y terminar en /exec."; return false; }
  E.panel = u;
  await guardarEstado("panel", u);
  return true;
}
function enlazar() {
  document.addEventListener("click", async e => {
    const b = e.target.closest("[data-acc],[data-ir],[data-tipo],[data-cat],[data-cerrar]");
    if (!b) return;
    if (b.hasAttribute("data-cerrar")) return cerrarForm();
    if (b.dataset.ir) { ir(b.dataset.ir); if (b.dataset.foco) $(b.dataset.foco).scrollIntoView({ block: "start" }); return; }
    if (b.dataset.tipo && F) { F.tipo = b.dataset.tipo; pintarForm(); mostrarError(""); return; }
    if (b.dataset.cat && F) { F.categoria = b.dataset.cat; document.querySelectorAll("#f-cats .chip").forEach(c => c.setAttribute("aria-checked", c === b)); mostrarError(""); return; }
    const id = b.dataset.id, acc = b.dataset.acc;
    if (acc === "usar") { const a = E.atajos.find(x => x.id === id); if (a) usarAtajo(a); }
    else if (acc === "sugerido") { const s = sugeridos()[+b.dataset.i]; if (s) usarAtajo(Object.assign({}, s, { cuotas: 1 })); }
    else if (acc === "guardar-sugerido") { const s = sugeridos()[+b.dataset.i]; if (s) abrirForm({ modo: "atajo", datos: Object.assign({ nombre: (s.nota || s.categoria).slice(0, 30) }, s) }); }
    else if (acc === "nuevo-atajo") abrirForm({ modo: "atajo" });
    else if (acc === "editar-atajo") { const a = E.atajos.find(x => x.id === id); if (a) abrirForm({ modo: "atajo", datos: a, id: a.id }); }
    else if (acc === "copiar-atajo") { const a = E.atajos.find(x => x.id === id); if (a) copiar(enlaceAtajo(a)); }
    else if (acc === "borrar-atajo") {
      const a = E.atajos.find(x => x.id === id); if (!a) return;
      await quitar("atajos", id); E.atajos = E.atajos.filter(x => x.id !== id); pintarTodo();
      avisar("Atajo «" + a.nombre + "» borrado.", "Deshacer", async () => { await poner("atajos", a); E.atajos = (await todos("atajos")).sort((x, y) => x.orden - y.orden); pintarTodo(); });
    }
    else if (acc === "corregir") { const p = E.pend.find(x => x.cid === id); if (p) abrirForm({ modo: "registro", datos: p, cid: p.cid, error: p.error }); }
    else if (acc === "descartar") {
      const p = E.pend.find(x => x.cid === id); if (!p) return;
      await quitar("pendientes", id); E.pend = E.pend.filter(x => x.cid !== id); pintarTodo();
      avisar("Registro descartado.", "Deshacer", async () => { await poner("pendientes", p); E.pend = await todos("pendientes"); pintarTodo(); });
    }
  });
  $("btn-anotar").addEventListener("click", () => abrirForm({ modo: "registro" }));
  $("btn-sync").addEventListener("click", sincronizar);
  $("btn-subir-pend").addEventListener("click", sincronizar);
  $("btn-nuevo-atajo").addEventListener("click", () => abrirForm({ modo: "atajo" }));
  $("aviso-pend").addEventListener("click", () => { if (navigator.onLine && !E.pend.some(p => p.error)) sincronizar(); else ir("pendientes"); });
  $("toast-acc").addEventListener("click", () => { const fn = avisoFn; avisoFn = null; $("toast").classList.remove("on"); if (fn) fn(); });
  $("form-reg").addEventListener("submit", guardarForm);
  $("f-medio").addEventListener("change", pintarCuotas);
  $("f-monto").addEventListener("input", e => { const n = digitos(e.target.value); e.target.value = miles(n); });
  $("form-conectar").addEventListener("submit", async e => { e.preventDefault(); if (await guardarPanel($("in-panel").value, "conectar-error")) sincronizar(); });
  $("form-panel").addEventListener("submit", async e => { e.preventDefault(); if (await guardarPanel($("in-panel2").value, "panel-error")) { pintarTodo(); avisar("Enlace guardado. Toca subir para traer tus datos."); } });
  document.addEventListener("keydown", e => { if (e.key === "Escape" && F) cerrarForm(); });
  window.addEventListener("online", pintarTodo);
  window.addEventListener("offline", pintarTodo);
  window.addEventListener("hashchange", procesarRetorno);
  // Al volver a la app (por ejemplo, después de subir en otra pestaña) se releen los datos guardados
  document.addEventListener("visibilitychange", async () => {
    if (document.visibilityState !== "visible") return;
    E.pend = await todos("pendientes");
    E.cat = normalizarCatalogo(await leerEstado("catalogo")) || E.cat;
    pintarTodo();
  });
}

async function iniciar() {
  enlazar();
  try {
    const [pend, atajos, panel, cat, medio] = await Promise.all([todos("pendientes"), todos("atajos"), leerEstado("panel"), leerEstado("catalogo"), leerEstado("ultimoMedio")]);
    Object.assign(E, { pend, atajos: atajos.sort((a, b) => a.orden - b.orden), panel: panel || "", cat: normalizarCatalogo(cat), ultimoMedio: medio || "" });
  } catch (err) {
    avisar("Este navegador no deja guardar datos (¿modo incógnito?). Lo que anotes no quedará guardado.");
  }
  pintarTodo();
  await procesarRetorno();
  await procesarEnlace();
  if (navigator.storage && navigator.storage.persist) navigator.storage.persist().catch(() => {});
  if ("serviceWorker" in navigator) navigator.serviceWorker.register("./sw.js").catch(() => {});
}

iniciar();
