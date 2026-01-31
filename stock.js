document.addEventListener('DOMContentLoaded', () => {

  /* =========================
     VARIABLES
  ========================= */

  let carrito = [];

  const contador = document.getElementById('contador-carrito');
  const overlay = document.getElementById('carrito-overlay');
  const items = document.getElementById('carrito-items');
  const totalSpan = document.getElementById('total-carrito');

  const btnAbrirCarrito = document.getElementById('btn-ver-carrito');
  const btnCerrarCarrito = document.getElementById('cerrar-carrito');

  /* =========================
     ABRIR / CERRAR CARRITO
  ========================= */

  btnAbrirCarrito.addEventListener('click', () => {
    overlay.style.display = 'flex';
    document.body.classList.add('modal-abierto');
  });

  btnCerrarCarrito.addEventListener('click', () => {
    overlay.style.display = 'none';
    document.body.classList.remove('modal-abierto');
  });

  /* =========================
     PRODUCTOS SIN TONOS
  ========================= */

 document.querySelectorAll('.btn-agregar').forEach(btn => {
  btn.addEventListener('click', () => {

    const producto = btn.closest('.producto');
    const nombre = producto.querySelector('h3').textContent;
    const precio = parseInt(producto.dataset.precio);
    let stock = parseInt(producto.dataset.stock);

    if (stock <= 0) {
      alert('Sin stock');
      return;
    }

    const id = nombre; // ID simple para productos sin tonos

    const existente = carrito.find(p => p.id === id);

    if (existente) {
      existente.cantidad++;
    } else {
      carrito.push({
        id,
        nombre,
        precio,
        cantidad: 1
      });
    }

    // descontar stock
    producto.dataset.stock = stock - 1;

    actualizarContador();
    renderCarrito();
  });
});

  /* =========================
     ABRIR MODALES DE TONOS
  ========================= */

  document.querySelectorAll('.btn-elegir-tono').forEach(btn => {
    btn.addEventListener('click', () => {
      const tipo = btn.dataset.producto;
      const modal = document.getElementById(`modal-${tipo}`);
      if (!modal) return;

      modal.style.display = 'flex';
      document.body.classList.add('modal-abierto');
    });
  });

  /* =========================
     CERRAR MODALES
  ========================= */

  document.querySelectorAll('.cerrar-modal, #cerrar-tonos').forEach(btn => {
    btn.addEventListener('click', () => {
      btn.closest('.modal-tonos').style.display = 'none';
      document.body.classList.remove('modal-abierto');
    });
  });

  /* =========================
     STOCK POR TONO
  ========================= */

  const stockTonosLapiz = {
    '01': 10, '02': 10, '03': 10, '04': 10, '05': 10, '06': 10,
    '07': 10, '08': 10, '09': 10, '10': 10, '11': 10, '12': 10
  };

  const stockTonosLipGloss = {
    '01': 10, '02': 10, '03': 10, '04': 10, '05': 10, '06': 10
  };

  const stockTonosLipCheek = {
    '01': 10, '02': 10, '03': 10, '04': 10, '05': 10, '06': 10
  };



  const stockTonosShini = {
    '01': 10,
    '02': 10,
    '03': 10,
    '04': 10,
    '05': 10,
    '06': 10
  };


  /* =========================
     TONOS LÁPIZ LABIAL
  ========================= */

  activarTonos(
    '#modal-tonos .tono',
    stockTonosLapiz,
    'Delineador para Labios Pink 21',
    2000
  );

  /* =========================
     TONOS LIP GLOSS
  ========================= */

  activarTonos(
    '#modal-lipgloss .tono',
    stockTonosLipGloss,
    'Labiales Lip Gloss Mate Miss Betty',
    4500
  );

  /* =========================
     TONOS LIP & CHEEK
  ========================= */

  activarTonos(
    '#modal-lipcheek .tono',
    stockTonosLipCheek,
    'Pink 21 Lip & Cheek Lipgloss',
    4000
  );


  /* =========================
   TONOS SHINI COLOR TEI
========================= */

  activarTonos(
    '#modal-shini .tono',
    stockTonosShini,
    'Lip Gloss con Glitter Shini Color Tei',
    4000
  );


  /* =========================
     FUNCIÓN REUTILIZABLE
  ========================= */

  function activarTonos(selector, stockObj, nombreBase, precio) {
    document.querySelectorAll(selector).forEach(btn => {
      btn.addEventListener('click', () => {

        const tono = btn.dataset.tono;

        if (stockObj[tono] <= 0) {
          alert('Sin stock de este tono');
          return;
        }

        stockObj[tono]--;

        const id = `${nombreBase}-tono-${tono}`;
        const existente = carrito.find(p => p.id === id);

        if (existente) existente.cantidad++;
        else {
          carrito.push({
            id,
            nombre: `${nombreBase} - Tono ${tono}`,
            precio,
            cantidad: 1
          });
        }

        btn.textContent = `${tono} (${stockObj[tono]})`;
        if (stockObj[tono] === 0) {
          btn.disabled = true;
          btn.style.background = '#ccc';
        }

        actualizarContador();
        renderCarrito();
      });
    });
  }

  /* =========================
     RENDER CARRITO
  ========================= */

  function renderCarrito() {
    items.innerHTML = '';
    let total = 0;

    carrito.forEach((p, index) => {
      total += p.precio * p.cantidad;

      items.innerHTML += `
        <div class="item-carrito">
          <p>${p.nombre} x${p.cantidad}</p>
          <strong>$${p.precio * p.cantidad}</strong>
          <button class="btn-eliminar" data-index="${index}">❌</button>
        </div>
      `;
    });

    totalSpan.textContent = total;

    document.querySelectorAll('.btn-eliminar').forEach(btn => {
      btn.addEventListener('click', () => {
        carrito.splice(btn.dataset.index, 1);
        actualizarContador();
        renderCarrito();
      });
    });
  }

  /* =========================
     UTILIDAD
  ========================= */

  function actualizarContador() {
    contador.textContent = carrito.reduce((acc, p) => acc + p.cantidad, 0);
  }

});
