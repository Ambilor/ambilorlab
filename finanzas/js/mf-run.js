/* ─────────────────────────────────────────────────────────────────────
   mf-run.js — google.script.run simulado + arranque
   Mis Finanzas · Ambilor.Lab

   El panel llama al servidor con google.script.run.withSuccessHandler(...).
   Aquí esas llamadas se resuelven contra las funciones de js/mf-server.js,
   que corren en el mismo navegador sobre la planilla simulada (mf-gas.js).

   El panel no siempre escribe el nombre de la función: los formularios
   genéricos lo pasan como texto ('guardarMeta', 'guardarTarjeta', ...).
   Por eso el runner NO lleva una lista fija: cualquier nombre que se pida
   se busca en las funciones del servidor. Si algún día se agrega una
   función nueva, funciona sin tocar este archivo.

   Después de cada llamada se guarda en localStorage, para que el celular
   no pierda nada si cierra la pestaña.
   ───────────────────────────────────────────────────────────────────── */
(function () {
  "use strict";

  var exito = null, fallo = null;

  function ejecutar(nombre, args) {
    // Los manejadores se toman AHORA: si dos llamadas se cruzan, cada una
    // conserva los suyos (el panel ya evita cruces con S.ocupado, pero
    // subirCola puede coincidir con una recarga).
    var ok = exito, ko = fallo;
    exito = null; fallo = null;

    setTimeout(function () {
      try {
        var fn = window[nombre];
        if (typeof fn !== "function") throw new Error("Función no disponible: " + nombre);
        var res = fn.apply(null, args);
        if (window.MFLocal) window.MFLocal.guardar();
        if (ok) ok(res);
      } catch (e) {
        console.error("[Mis Finanzas] " + nombre + ":", e);
        if (ko) ko(e);
        else if (window.toast) window.toast("Ocurrió un error. Intenta de nuevo.");
      }
    }, 0);
  }

  var runner = new Proxy({}, {
    get: function (destino, prop) {
      if (prop === "withSuccessHandler") {
        return function (f) { exito = f; return runner; };
      }
      if (prop === "withFailureHandler") {
        return function (f) { fallo = f; return runner; };
      }
      if (prop === "withUserObject") {
        return function () { return runner; };
      }
      if (typeof prop !== "string") return undefined;
      return function () { ejecutar(prop, Array.prototype.slice.call(arguments)); };
    }
  });

  window.google = window.google || {};
  window.google.script = {
    run: runner,
    host: {
      close: function () {},
      setHeight: function () {},
      setWidth: function () {},
      editor: { focus: function () {} }
    },
    url: {
      getLocation: function (cb) {
        if (cb) cb({ parameter: {}, parameters: {}, hash: "" });
      }
    },
    history: { push: function () {}, replace: function () {}, setChangeHandler: function () {} }
  };

  /* ── sesión ──────────────────────────────────────────────────────── */
  window.cerrarSesion = function () {
    try {
      localStorage.removeItem("mf_auth");
      sessionStorage.removeItem("mf_auth");
    } catch (e) {}
    location.replace("login.html");
  };

  /* ── valor de la UF ──────────────────────────────────────────────────
     El motor lo pide a mindicador.cl desde el servidor. Aquí no hay
     servidor, así que se consulta una vez al día y se guarda; el motor
     lo encuentra en las propiedades y no necesita internet.
     ─────────────────────────────────────────────────────────────────── */
  function hoyIso() {
    var d = new Date();
    function p(n) { return (n < 10 ? "0" : "") + n; }
    return d.getFullYear() + "-" + p(d.getMonth() + 1) + "-" + p(d.getDate());
  }

  function traerUF() {
    var props = window.PropertiesService.getScriptProperties();
    var hoy = hoyIso();
    var guardado = null;
    try { guardado = JSON.parse(props.getProperty("FA_UF") || "null"); } catch (e) { guardado = null; }
    if (guardado && guardado.fecha === hoy && guardado.valor > 0) return;

    fetch("https://mindicador.cl/api/uf", { cache: "no-store" })
      .then(function (r) { return r.ok ? r.json() : null; })
      .then(function (j) {
        var v = j && j.serie && j.serie[0] ? Number(j.serie[0].valor) : 0;
        if (v > 0) {
          props.setProperty("FA_UF", JSON.stringify({ valor: v, fecha: hoy }));
          if (window.MFLocal) window.MFLocal.guardar();
        }
      })
      .catch(function () { /* sin internet: se usa el último valor conocido */ });
  }

  /* ── service worker ──────────────────────────────────────────────── */
  if ("serviceWorker" in navigator) {
    window.addEventListener("load", function () {
      navigator.serviceWorker.register("sw.js").catch(function () {});
    });
  }

  traerUF();
})();
