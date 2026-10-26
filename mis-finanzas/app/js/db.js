// Mis Finanzas (app sin conexión) · datos guardados en el teléfono (IndexedDB)
//   pendientes: registros anotados que aún no llegan a la planilla (clave: cid)
//   atajos:     registros que se repiten, para anotarlos con un toque (clave: id)
//   estado:     enlace del panel, datos traídos de la planilla y preferencias (clave: clave)

const NOMBRE = "mis-finanzas";
const VERSION = 1;
let conexion = null;

function abrir() {
  if (conexion) return conexion;
  conexion = new Promise((ok, mal) => {
    const req = indexedDB.open(NOMBRE, VERSION);
    req.onupgradeneeded = () => {
      const db = req.result;
      if (!db.objectStoreNames.contains("pendientes")) db.createObjectStore("pendientes", { keyPath: "cid" });
      if (!db.objectStoreNames.contains("atajos")) db.createObjectStore("atajos", { keyPath: "id" });
      if (!db.objectStoreNames.contains("estado")) db.createObjectStore("estado", { keyPath: "clave" });
    };
    req.onsuccess = () => ok(req.result);
    req.onerror = () => { conexion = null; mal(req.error); };
  });
  return conexion;
}

// El resultado se entrega cuando la transacción termina: así lo escrito ya está guardado.
function pedir(almacen, modo, fn) {
  return abrir().then(db => new Promise((ok, mal) => {
    const tx = db.transaction(almacen, modo);
    const req = fn(tx.objectStore(almacen));
    tx.oncomplete = () => ok(req ? req.result : undefined);
    tx.onerror = () => mal(tx.error);
    tx.onabort = () => mal(tx.error);
  }));
}

export const todos = almacen => pedir(almacen, "readonly", o => o.getAll());
export const poner = (almacen, valor) => pedir(almacen, "readwrite", o => o.put(valor));
export const quitar = (almacen, clave) => pedir(almacen, "readwrite", o => o.delete(clave));

export async function leerEstado(clave) {
  const fila = await pedir("estado", "readonly", o => o.get(clave));
  return fila ? fila.valor : undefined;
}
export const guardarEstado = (clave, valor) => poner("estado", { clave, valor });
