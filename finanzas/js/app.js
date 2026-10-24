const monthLabel = document.getElementById('monthLabel');
const prevMonthBtn = document.getElementById('prevMonth');
const nextMonthBtn = document.getElementById('nextMonth');
const sumIngresos = document.getElementById('sumIngresos');
const sumGastos = document.getElementById('sumGastos');
const sumSaldo = document.getElementById('sumSaldo');
const listaMovimientos = document.getElementById('listaMovimientos');
const sinMovimientos = document.getElementById('sinMovimientos');
const filtroTipo = document.getElementById('filtroTipo');
const btnExport = document.getElementById('btnExport');
const btnImport = document.getElementById('btnImport');
const fileImport = document.getElementById('fileImport');

let currentDate = new Date();
let currentMonth = currentDate.getMonth();
let currentYear = currentDate.getFullYear();

function formatMoney(value){
  return new Intl.NumberFormat('es-CL', { style: 'currency', currency: 'CLP', maximumFractionDigits: 0 }).format(value || 0);
}

function updateMonthLabel(){
  const date = new Date(currentYear, currentMonth, 1);
  monthLabel.textContent = date.toLocaleDateString('es-CL', { month: 'long', year: 'numeric' });
}

async function loadMovimientos(){
  const start = new Date(currentYear, currentMonth, 1).toISOString().split('T')[0];
  const end = new Date(currentYear, currentMonth + 1, 0).toISOString().split('T')[0];
  let movimientos = await db.movimientos.where('fecha').between(start, end, true, true).toArray();
  movimientos.sort((a,b) => b.fecha.localeCompare(a.fecha) || b.creadoEn - a.creadoEn);
  const tipo = filtroTipo.value;
  if(tipo !== 'todos'){
    movimientos = movimientos.filter(m => m.tipo === tipo);
  }
  renderMovimientos(movimientos);
  renderSummary(movimientos);
}

function renderSummary(movimientos){
  let ingresos = 0, gastos = 0;
  movimientos.forEach(m => {
    if(m.tipo === 'ingreso') ingresos += Number(m.monto || 0);
    if(m.tipo === 'gasto') gastos += Number(m.monto || 0);
  });
  sumIngresos.textContent = formatMoney(ingresos);
  sumGastos.textContent = formatMoney(gastos);
  sumSaldo.textContent = formatMoney(ingresos - gastos);
}

function renderMovimientos(movimientos){
  listaMovimientos.innerHTML = '';
  if(movimientos.length === 0){
    sinMovimientos.style.display = 'block';
    return;
  }
  sinMovimientos.style.display = 'none';
  movimientos.forEach(m => {
    const item = document.createElement('div');
    item.className = 'mov-item';
    const fecha = new Date(m.fecha + 'T00:00:00').toLocaleDateString('es-CL', { day: '2-digit', month: 'short' });
    item.innerHTML = `
      <div class="mov-info">
        <div class="mov-titulo">${m.categoria || 'Sin categoría'}</div>
        <div class="mov-detalle">${fecha} • ${m.cuenta || ''} ${m.nota ? '• ' + m.nota : ''}</div>
      </div>
      <div class="mov-monto ${m.tipo}">${m.tipo === 'gasto' ? '-' : '+'}${formatMoney(m.monto)}</div>
    `;
    listaMovimientos.appendChild(item);
  });
}

prevMonthBtn.addEventListener('click', () => {
  currentMonth--;
  if(currentMonth < 0){ currentMonth = 11; currentYear--; }
  updateMonthLabel();
  loadMovimientos();
});

nextMonthBtn.addEventListener('click', () => {
  currentMonth++;
  if(currentMonth > 11){ currentMonth = 0; currentYear++; }
  updateMonthLabel();
  loadMovimientos();
});

filtroTipo.addEventListener('change', loadMovimientos);

btnExport.addEventListener('click', async () => {
  const movimientos = await db.movimientos.toArray();
  const categorias = await db.categorias.toArray();
  const cuentas = await db.cuentas.toArray();
  const data = { movimientos, categorias, cuentas, exportadoEn: new Date().toISOString() };
  const blob = new Blob([JSON.stringify(data, null, 2)], { type: 'application/json' });
  const url = URL.createObjectURL(blob);
  const a = document.createElement('a');
  a.href = url;
  a.download = `mis-finanzas-backup-${Date.now()}.json`;
  a.click();
  URL.revokeObjectURL(url);
});

btnImport.addEventListener('click', () => fileImport.click());
fileImport.addEventListener('change', async (e) => {
  const file = e.target.files[0];
  if(!file) return;
  const text = await file.text();
  try {
    const data = JSON.parse(text);
    if(Array.isArray(data.movimientos)){
      for(const m of data.movimientos){
        delete m.id;
        await db.movimientos.add({...m, sync: false});
      }
    }
    if(Array.isArray(data.categorias)){
      for(const c of data.categorias){
        const exists = await db.categorias.where('nombre').equals(c.nombre).count();
        if(exists === 0) await db.categorias.add({nombre: c.nombre});
      }
    }
    if(Array.isArray(data.cuentas)){
      for(const c of data.cuentas){
        const exists = await db.cuentas.where('nombre').equals(c.nombre).count();
        if(exists === 0) await db.cuentas.add({nombre: c.nombre});
      }
    }
    alert('Importado correctamente');
    loadMovimientos();
  } catch(err){
    alert('Archivo inválido');
  }
  fileImport.value = '';
});

updateMonthLabel();
loadMovimientos();
