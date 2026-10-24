const tipoBtns = document.querySelectorAll('.tipo-btn');
const montoInput = document.getElementById('monto');
const fechaInput = document.getElementById('fecha');
const categoriaSelect = document.getElementById('categoria');
const cuentaSelect = document.getElementById('cuenta');
const notaInput = document.getElementById('nota');
const btnGuardar = document.getElementById('btnGuardar');
const btnGuardarOtro = document.getElementById('btnGuardarOtro');
const addCategoria = document.getElementById('addCategoria');
const addCuenta = document.getElementById('addCuenta');

let tipoActual = 'gasto';

tipoBtns.forEach(btn => {
  btn.addEventListener('click', () => {
    tipoBtns.forEach(b => b.classList.remove('active'));
    btn.classList.add('active');
    tipoActual = btn.dataset.tipo;
  });
});

function setToday(){
  const now = new Date();
  const offset = now.getTimezoneOffset();
  const local = new Date(now.getTime() - offset * 60000);
  fechaInput.value = local.toISOString().split('T')[0];
}

async function cargarSelects(){
  const categorias = await db.categorias.orderBy('nombre').toArray();
  const cuentas = await db.cuentas.orderBy('nombre').toArray();
  categoriaSelect.innerHTML = '';
  cuentasSelect.innerHTML = '';
  categorias.forEach(c => {
    const opt = document.createElement('option');
    opt.value = c.nombre;
    opt.textContent = c.nombre;
    categoriaSelect.appendChild(opt);
  });
  cuentas.forEach(c => {
    const opt = document.createElement('option');
    opt.value = c.nombre;
    opt.textContent = c.nombre;
    cuentaSelect.appendChild(opt);
  });
}

addCategoria.addEventListener('click', async () => {
  const nombre = prompt('Nombre de la nueva categoría');
  if(!nombre) return;
  const exists = await db.categorias.where('nombre').equals(nombre.trim()).count();
  if(exists > 0){ alert('Ya existe'); return; }
  await db.categorias.add({nombre: nombre.trim()});
  await cargarSelects();
  categoriaSelect.value = nombre.trim();
});

addCuenta.addEventListener('click', async () => {
  const nombre = prompt('Nombre de la nueva cuenta');
  if(!nombre) return;
  const exists = await db.cuentas.where('nombre').equals(nombre.trim()).count();
  if(exists > 0){ alert('Ya existe'); return; }
  await db.cuentas.add({nombre: nombre.trim()});
  await cargarSelects();
  cuentaSelect.value = nombre.trim();
});

async function guardar(continuar){
  const monto = Number(montoInput.value);
  if(!monto || monto <= 0){
    alert('Ingresa un monto válido');
    montoInput.focus();
    return;
  }
  await db.movimientos.add({
    fecha: fechaInput.value,
    tipo: tipoActual,
    monto: monto,
    categoria: categoriaSelect.value,
    cuenta: cuentaSelect.value,
    nota: notaInput.value.trim(),
    creadoEn: Date.now(),
    sync: false
  });
  if(continuar){
    montoInput.value = '';
    notaInput.value = '';
    montoInput.focus();
  }else{
    window.location.href = 'index.html';
  }
}

btnGuardar.addEventListener('click', () => guardar(false));
btnGuardarOtro.addEventListener('click', () => guardar(true));

setToday();
cargarSelects();
montoInput.focus();
