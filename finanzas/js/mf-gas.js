/* ─────────────────────────────────────────────────────────────────────
   mf-gas.js — Servicios de Google Apps Script simulados en el navegador
   Mis Finanzas · Ambilor.Lab

   QUÉ ES: la planilla de Google (SpreadsheetApp) y los demás servicios que
   usa el motor de Mis Finanzas, implementados sobre localStorage. Permite
   correr el MISMO código del servidor (js/mf-server.js) sin Google.

   Basado en simulacion/gas-fakes.js del repo finanzapp (mismo autor), con
   dos cambios: los datos se guardan en localStorage y no hay módulos.

   LO QUE NO ESTÁ (a propósito): cualquier servicio que el motor no use.
   Un fake que implementa de más esconde errores.
   ───────────────────────────────────────────────────────────────────── */
(function () {
  "use strict";

  var CLAVE_HOJAS = "mf_hojas_v1";
  var CLAVE_PROPS = "mf_props_v1";

  /* ── hoja en memoria ─────────────────────────────────────────────── */
  function HojaFake(nombre, datos) {
    this.nombre = nombre;
    this.datos = (datos || []).map(function (f) { return f.slice(); });
    this.congelada = 0;
    this.maxFilas = undefined;
    this.oculta = false;
  }
  HojaFake.prototype.getName = function () { return this.nombre; };
  HojaFake.prototype.setName = function (n) { this.nombre = n; return this; };
  HojaFake.prototype.setFrozenRows = function (n) { this.congelada = n; return this; };
  HojaFake.prototype.getFrozenRows = function () { return this.congelada; };

  HojaFake.prototype.getLastRow = function () {
    var ultima = 0;
    for (var i = 0; i < this.datos.length; i++) {
      var fila = this.datos[i] || [];
      for (var j = 0; j < fila.length; j++) {
        var v = fila[j];
        if (v !== "" && v !== null && v !== undefined) { ultima = i + 1; break; }
      }
    }
    return ultima;
  };
  HojaFake.prototype.getLastColumn = function () {
    var max = 0;
    for (var i = 0; i < this.datos.length; i++) {
      var fila = this.datos[i] || [];
      for (var j = 0; j < fila.length; j++) {
        var v = fila[j];
        if (v !== "" && v !== null && v !== undefined) { if (j + 1 > max) max = j + 1; }
      }
    }
    return max;
  };
  HojaFake.prototype.getMaxRows = function () {
    return Math.max(this.maxFilas === undefined ? 1000 : this.maxFilas, this.datos.length);
  };
  HojaFake.prototype.getMaxColumns = function () { return Math.max(26, this.getLastColumn()); };

  HojaFake.prototype.appendRow = function (arr) {
    if (!Array.isArray(arr)) arr = [arr];
    this.datos.push(arr.slice());
    return this;
  };
  HojaFake.prototype.setColumnWidth = function () { return this; };
  HojaFake.prototype.autoResizeColumns = function () { return this; };
  HojaFake.prototype.setColumnWidths = function () { return this; };
  HojaFake.prototype.hideSheet = function () { this.oculta = true; return this; };
  HojaFake.prototype.showSheet = function () { this.oculta = false; return this; };
  HojaFake.prototype.isSheetHidden = function () { return !!this.oculta; };
  HojaFake.prototype.deleteRows = function (desde, n) {
    if (!(desde >= 1) || !(n >= 1)) throw new Error("deleteRows: posición o cantidad inválida");
    if (this.maxFilas !== undefined) this.maxFilas = Math.max(1, this.maxFilas - n);
    if (desde <= this.datos.length) this.datos.splice(desde - 1, n);
    return this;
  };
  HojaFake.prototype.deleteRow = function (n) {
    if (n >= 1 && n <= this.datos.length) this.datos.splice(n - 1, 1);
    return this;
  };
  HojaFake.prototype.clear = function () { this.datos = []; return this; };
  HojaFake.prototype.clearContents = function () { this.datos = []; return this; };

  /* ── rango ───────────────────────────────────────────────────────── */
  function _asegurar(hoja, f, c) {
    while (hoja.datos.length < f) hoja.datos.push([]);
    var fila = hoja.datos[f - 1];
    while (fila.length < c) fila.push("");
    return fila;
  }
  function _leer(hoja, f, c) {
    var fila = hoja.datos[f - 1];
    if (!fila) return "";
    var v = fila[c - 1];
    return (v === undefined || v === null) ? "" : v;
  }

  function RangoFake(hoja, fila, col, numFilas, numCols) {
    this._hoja = hoja; this._f = fila; this._c = col;
    this._nf = numFilas; this._nc = numCols;
  }
  RangoFake.prototype.getValues = function () {
    var out = [];
    for (var i = 0; i < this._nf; i++) {
      var fila = [];
      for (var j = 0; j < this._nc; j++) fila.push(_leer(this._hoja, this._f + i, this._c + j));
      out.push(fila);
    }
    return out;
  };
  RangoFake.prototype.getValue = function () { return _leer(this._hoja, this._f, this._c); };
  RangoFake.prototype.getDisplayValue = function () { return String(this.getValue()); };
  RangoFake.prototype.getText = function () { return String(this.getValue()); };
  RangoFake.prototype.getNumberFormat = function () { return this._nfFMT || "General"; };
  RangoFake.prototype.getFontWeight = function () { return this._fontWeight || "normal"; };
  RangoFake.prototype.getRow = function () { return this._f; };
  RangoFake.prototype.getColumn = function () { return this._c; };
  RangoFake.prototype.getNumRows = function () { return this._nf; };
  RangoFake.prototype.getNumColumns = function () { return this._nc; };
  RangoFake.prototype.getSheet = function () { return this._hoja; };

  // Como Sheets: un texto que empieza con ' se guarda sin el apóstrofo; uno que
  // empieza con = (o + - @ y no es número) se interpreta como fórmula.
  function _comoSheets(v) {
    if (typeof v !== "string") return v;
    if (v.charAt(0) === "'") return v.slice(1);
    if (/^=/.test(v) || (/^[+\-@]/.test(v) && isNaN(Number(v)))) return "#ERROR!";
    return v;
  }
  RangoFake.prototype.setValue = function (v) {
    _asegurar(this._hoja, this._f, this._c)[this._c - 1] = _comoSheets(v);
    return this;
  };
  RangoFake.prototype.setValues = function (matriz) {
    for (var i = 0; i < this._nf; i++) {
      var fila = matriz[i] || [];
      var destino = _asegurar(this._hoja, this._f + i, this._c + this._nc - 1);
      for (var j = 0; j < this._nc; j++) destino[this._c - 1 + j] = (fila[j] === undefined) ? "" : _comoSheets(fila[j]);
    }
    return this;
  };
  RangoFake.prototype.clearContent = function () {
    for (var i = 0; i < this._nf; i++) {
      var fila = _asegurar(this._hoja, this._f + i, this._c + this._nc - 1);
      for (var j = 0; j < this._nc; j++) fila[this._c - 1 + j] = "";
    }
    return this;
  };
  RangoFake.prototype.clearContents = function () { return this.clearContent(); };
  RangoFake.prototype.clear = function () { return this.clearContent(); };
  RangoFake.prototype.setNumberFormat = function (f) { this._nfFMT = f; return this; };
  RangoFake.prototype.setFontWeight = function (f) { this._fontWeight = f; return this; };
  RangoFake.prototype.setFontColor = function () { return this; };
  RangoFake.prototype.setFontFamily = function () { return this; };
  RangoFake.prototype.setFontSize = function () { return this; };
  RangoFake.prototype.setBackground = function () { return this; };
  RangoFake.prototype.setBorder = function () { return this; };
  RangoFake.prototype.setHorizontalAlignment = function () { return this; };
  RangoFake.prototype.setVerticalAlignment = function () { return this; };
  RangoFake.prototype.setWrap = function () { return this; };
  RangoFake.prototype.setNote = function () { return this; };
  RangoFake.prototype.setDataValidation = function () { return this; };
  RangoFake.prototype.insertCellsAbove = function (n) {
    for (var k = 0; k < n; k++) this._hoja.datos.splice(this._f - 1, 0, []);
    return this;
  };

  HojaFake.prototype.getRange = function (a, b, c, d) {
    if (typeof a === "string") {
      var ref = rangoA1(a);
      return new RangoFake(this, ref.f, ref.c, ref.nf, ref.nc);
    }
    if (b === undefined) return new RangoFake(this, 1, 1, this.getLastRow() || 1, this.getLastColumn() || 1);
    if (c === undefined) return new RangoFake(this, a, b, 1, 1);
    return new RangoFake(this, a, b, c, d === undefined ? 1 : d);
  };
  HojaFake.prototype.getDataRange = function () {
    var nf = this.getLastRow(), nc = this.getLastColumn();
    if (!nf || !nc) return new RangoFake(this, 1, 1, 0, 0);
    return new RangoFake(this, 1, 1, nf, nc);
  };

  function colALetra(n) {
    var s = "";
    while (n > 0) { var m = (n - 1) % 26; s = String.fromCharCode(65 + m) + s; n = Math.floor((n - 1) / 26); }
    return s;
  }
  function letraACol(s) {
    var n = 0;
    for (var i = 0; i < s.length; i++) n = n * 26 + (s.toUpperCase().charCodeAt(i) - 64);
    return n;
  }
  function rangoA1(ref) {
    var m = /^([A-Z]+)(\d+)(?::([A-Z]+)(\d+))?$/i.exec(String(ref).trim());
    if (!m) return { f: 1, c: 1, nf: 1, nc: 1 };
    var f = parseInt(m[2], 10), c = letraACol(m[1]);
    if (!m[3]) return { f: f, c: c, nf: 1, nc: 1 };
    var f2 = parseInt(m[4], 10), c2 = letraACol(m[3]);
    return { f: f, c: c, nf: f2 - f + 1, nc: c2 - c + 1 };
  }

  /* ── planilla ────────────────────────────────────────────────────── */
  function SpreadsheetFake(nombre) {
    this.nombre = nombre || "Mis Finanzas";
    this.hojas = [];
    this.id = "MF_LOCAL";
  }
  SpreadsheetFake.prototype.getName = function () { return this.nombre; };
  SpreadsheetFake.prototype.getId = function () { return this.id; };
  SpreadsheetFake.prototype.getUrl = function () { return ""; };
  SpreadsheetFake.prototype.getSheets = function () { return this.hojas; };
  SpreadsheetFake.prototype.getSheetByName = function (n) {
    for (var i = 0; i < this.hojas.length; i++) if (this.hojas[i].getName() === n) return this.hojas[i];
    return null;
  };
  SpreadsheetFake.prototype.getSheet = function (n) {
    var h = this.getSheetByName(n);
    if (!h) throw new Error("Hoja no encontrada: " + n);
    return h;
  };
  SpreadsheetFake.prototype.insertSheet = function (n) {
    var h = new HojaFake(n, []);
    this.hojas.push(h);
    return h;
  };
  SpreadsheetFake.prototype.deleteSheet = function (hoja) {
    var i = this.hojas.indexOf(hoja);
    if (i >= 0) this.hojas.splice(i, 1);
    return this;
  };
  SpreadsheetFake.prototype.getActiveSheet = function () { return this.hojas[0] || null; };
  SpreadsheetFake.prototype.setActiveSheet = function () { return this; };

  /* ── persistencia ────────────────────────────────────────────────── */
  var ISO_DT = /^\d{4}-\d{2}-\d{2}T\d{2}:\d{2}:\d{2}(\.\d+)?Z$/;

  // JSON guarda las fechas como texto ISO; al volver se reconstruyen como Date
  function revivir(v) {
    if (typeof v === "string") return ISO_DT.test(v) ? new Date(v) : v;
    if (Array.isArray(v)) { for (var i = 0; i < v.length; i++) v[i] = revivir(v[i]); return v; }
    return v;
  }

  var ss = new SpreadsheetFake("Mis Finanzas");
  var props = {};
  var guardando = false;

  function cargar() {
    try {
      var crudo = localStorage.getItem(CLAVE_HOJAS);
      if (crudo) {
        var g = JSON.parse(crudo);
        (g.hojas || []).forEach(function (h) {
          var hoja = new HojaFake(h.nombre, revivir(h.datos || []));
          hoja.congelada = h.congelada || 0;
          hoja.maxFilas = h.maxFilas;
          hoja.oculta = !!h.oculta;
          ss.hojas.push(hoja);
        });
      }
    } catch (e) { console.warn("mf-gas: no se pudo leer la planilla local", e); }
    try {
      var p = localStorage.getItem(CLAVE_PROPS);
      if (p) props = JSON.parse(p) || {};
    } catch (e) { props = {}; }
  }

  function guardar() {
    if (guardando) return;
    guardando = true;
    try {
      var hojas = ss.hojas.map(function (h) {
        return { nombre: h.nombre, datos: h.datos, congelada: h.congelada, maxFilas: h.maxFilas, oculta: !!h.oculta };
      });
      localStorage.setItem(CLAVE_HOJAS, JSON.stringify({ hojas: hojas }));
      localStorage.setItem(CLAVE_PROPS, JSON.stringify(props));
    } catch (e) {
      console.error("mf-gas: no se pudo guardar", e);
      if (window.toast) window.toast("No se pudo guardar en este dispositivo (almacenamiento lleno).");
    } finally {
      guardando = false;
    }
  }

  cargar();

  /* ── servicios ───────────────────────────────────────────────────── */
  function crearLock() {
    return {
      waitLock: function () { return true; },
      releaseLock: function () { return true; },
      tryLock: function () { return true; },
      getDocumentLock: function () { return this; },
      getScriptLock: function () { return this; }
    };
  }

  function formatearFecha(fecha, tz, fmt) {
    var d = (fecha instanceof Date) ? fecha : new Date(fecha);
    function p(n, w) { var s = String(n); while (s.length < (w || 2)) s = "0" + s; return s; }
    switch (fmt) {
      case "dd/MM/yyyy": return p(d.getDate()) + "/" + p(d.getMonth() + 1) + "/" + d.getFullYear();
      case "yyyy-MM-dd": return d.getFullYear() + "-" + p(d.getMonth() + 1) + "-" + p(d.getDate());
      case "dd-MM-yyyy": return p(d.getDate()) + "-" + p(d.getMonth() + 1) + "-" + d.getFullYear();
      case "HH:mm": return p(d.getHours()) + ":" + p(d.getMinutes());
      default: return d.toString();
    }
  }

  function uuid() {
    if (window.crypto && crypto.randomUUID) return crypto.randomUUID();
    var s = "", i;
    for (i = 0; i < 32; i++) s += Math.floor(Math.random() * 16).toString(16);
    return s.slice(0, 8) + "-" + s.slice(8, 12) + "-4" + s.slice(13, 16) + "-a" + s.slice(17, 20) + "-" + s.slice(20, 32);
  }

  var correos = [];

  window.SpreadsheetApp = {
    getActiveSpreadsheet: function () { return ss; },
    getActive: function () { return ss; },
    openById: function () { return ss; },
    create: function (nombre) { return new SpreadsheetFake(nombre); },
    getActiveUser: function () { return { getEmail: function () { return ""; } }; },
    getActiveRange: function () { return null; },
    BorderStyle: { SOLID: "SOLID", DOTTED: "DOTTED", DASHED: "DASHED", NONE: "NONE" },
    getUi: function () {
      return {
        createMenu: function () {
          var api = { addItem: function () { return api; }, addSeparator: function () { return api; }, addToUi: function () { return api; } };
          return api;
        },
        alert: function (msg) { if (window.toast) window.toast(String(msg)); return msg; },
        showModalDialog: function () { return null; },
        showSidebar: function () { return null; },
        prompt: function () { return null; },
        Button: { SET: "SET", CANCEL: "CANCEL", YES: "YES", NO: "NO", OK: "OK" }
      };
    }
  };

  window.LockService = {
    getScriptLock: function () { return crearLock(); },
    getDocumentLock: function () { return crearLock(); },
    getUserLock: function () { return crearLock(); }
  };

  window.Session = {
    getScriptTimeZone: function () { return "America/Santiago"; },
    getActiveUser: function () { return { getEmail: function () { return ""; } }; },
    getEffectiveUser: function () { return { getEmail: function () { return ""; } }; }
  };

  window.Utilities = {
    formatDate: formatearFecha,
    sleep: function () {},
    getUuid: uuid,
    newBlob: function (datos, tipo, nombre) {
      function blob(contenido, mime, n) {
        return {
          contenido: contenido, mime: mime, nombre: n,
          getAs: function (m) { return blob(contenido, m, n); },
          setName: function (x) { this.nombre = x; return this; },
          getName: function () { return this.nombre; },
          getContentType: function () { return this.mime; },
          getBytes: function () { return []; }
        };
      }
      return blob(String(datos), tipo, nombre);
    },
    base64Encode: function (s) { return btoa(unescape(encodeURIComponent(s))); },
    base64Decode: function (s) { return decodeURIComponent(escape(atob(s))); }
  };

  window.PropertiesService = {
    getScriptProperties: function () {
      return {
        getProperty: function (k) { return Object.prototype.hasOwnProperty.call(props, k) ? props[k] : null; },
        setProperty: function (k, v) { props[k] = String(v); return this; },
        deleteProperty: function (k) { delete props[k]; return this; },
        getProperties: function () { return Object.assign({}, props); },
        setProperties: function (o) { Object.keys(o).forEach(function (k) { props[k] = String(o[k]); }); return this; }
      };
    },
    getDocumentProperties: function () { return window.PropertiesService.getScriptProperties(); },
    getUserProperties: function () { return window.PropertiesService.getScriptProperties(); }
  };

  var cache = {};
  window.CacheService = {
    getScriptCache: function () {
      return {
        get: function (k) { return Object.prototype.hasOwnProperty.call(cache, k) ? cache[k] : null; },
        getAll: function (ks) {
          var o = {};
          (ks || []).forEach(function (k) { if (Object.prototype.hasOwnProperty.call(cache, k)) o[k] = cache[k]; });
          return o;
        },
        put: function (k, v) { cache[k] = String(v); },
        putAll: function (o) { Object.keys(o).forEach(function (k) { cache[k] = String(o[k]); }); },
        remove: function (k) { delete cache[k]; },
        removeAll: function (ks) { (ks || []).forEach(function (k) { delete cache[k]; }); }
      };
    }
  };

  window.ScriptApp = {
    // Sin despliegue de Apps Script: urlPanel_() devuelve "" y el panel oculta el enlace de registro
    getService: function () { return { getUrl: function () { return ""; } }; },
    getProjectTriggers: function () { return []; },
    deleteTrigger: function () {},
    newTrigger: function (fn) {
      var def = { fn: fn };
      var c = {
        timeBased: function () { return c; },
        everyDays: function (n) { def.cadaDias = n; return c; },
        everyHours: function (n) { def.cadaHoras = n; return c; },
        atHour: function (h) { def.hora = h; return c; },
        nearMinute: function (m) { def.minuto = m; return c; },
        create: function () { return { getHandlerFunction: function () { return def.fn; }, def: def }; }
      };
      return c;
    },
    getScriptId: function () { return "MF_LOCAL"; }
  };

  // Sin servidor de correo: se registra en consola para no romper el flujo
  window.MailApp = {
    sendEmail: function (o) {
      correos.push(o);
      console.info("[Mis Finanzas] correo no enviado (modo local):", o && o.subject);
    },
    getRemainingDailyQuota: function () { return 0; }
  };
  window.GmailApp = window.MailApp;

  window.Logger = { log: function (m) { console.log("[MF]", m); } };

  window.HtmlService = {
    XFrameOptionsMode: { DEFAULT: "DEFAULT", ALLOWALL: "ALLOWALL" },
    createHtmlOutput: function (html) {
      return {
        _html: html, _titulo: "",
        setTitle: function (t) { this._titulo = t; return this; },
        setXFrameOptionsMode: function () { return this; },
        getContent: function () { return this._html; },
        getTitle: function () { return this._titulo; },
        addMetaTag: function () { return this; },
        setWidth: function () { return this; },
        setHeight: function () { return this; }
      };
    },
    createTemplateFromFile: function () { return { evaluate: function () { return window.HtmlService.createHtmlOutput(""); } }; }
  };

  window.ContentService = {
    MimeType: { JSON: "application/json", TEXT: "text/plain", HTML: "text/html" },
    createTextOutput: function (txt) {
      return {
        _txt: txt, _mime: "text/plain",
        setMimeType: function (m) { this._mime = m; return this; },
        getContent: function () { return this._txt; },
        getMimeType: function () { return this._mime; }
      };
    }
  };

  /* ── API interna para el arranque ────────────────────────────────── */
  window.MFLocal = {
    guardar: guardar,
    cargar: cargar,
    hoja: function (n) { return ss.getSheetByName(n); },
    hojas: function () { return ss.hojas; },
    props: function () { return props; },
    correos: correos,
    // Borra todo (usado por "empezar de cero")
    reiniciar: function () {
      ss.hojas = [];
      props = {};
      cache = {};
      try { localStorage.removeItem(CLAVE_HOJAS); localStorage.removeItem(CLAVE_PROPS); } catch (e) {}
    }
  };

  // Guardar al salir o al pasar a segundo plano (el celular mata la pestaña)
  window.addEventListener("pagehide", guardar);
  document.addEventListener("visibilitychange", function () {
    if (document.visibilityState === "hidden") guardar();
  });
})();
