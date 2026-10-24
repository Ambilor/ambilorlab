const db = new Dexie('MisFinanzasDB');
db.version(1).stores({
  movimientos: '++id, fecha, tipo, monto, categoria, cuenta, nota, creadoEn, sync',
  categorias: '++id, nombre',
  cuentas: '++id, nombre'
});

async function initDefaults(){
  const catCount = await db.categorias.count();
  if(catCount === 0){
    await db.categorias.bulkAdd([
      {nombre: 'Alimentación'},
      {nombre: 'Transporte'},
      {nombre: 'Casa'},
      {nombre: 'Salud'},
      {nombre: 'Ocio'},
      {nombre: 'Compras'},
      {nombre: 'Otros'}
    ]);
  }
  const cueCount = await db.cuentas.count();
  if(cueCount === 0){
    await db.cuentas.bulkAdd([
      {nombre: 'Efectivo'},
      {nombre: 'Tarjeta'},
      {nombre: 'Cuenta bancaria'}
    ]);
  }
}

initDefaults();
