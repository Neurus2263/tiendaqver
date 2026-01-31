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

  const btnMP = document.getElementById('btn-mp');
  const modalMP = document.getElementById('modal-mp');
  const cerrarMP = document.getElementById('cerrar-mp');

  const btnPague = document.getElementById('btn-pague');
  const zonaComprobante = document.getElementById('zona-comprobante');
  const inputComprobante = document.getElementById('input-comprobante');
  const telefonoCliente = document.getElementById('telefono-cliente');

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

      const id = nombre;
      const existente = carrito.find(p => p.id === id);

      if (existente) existente.cantidad++;
      else {
        carrito.push({ id, nombre, precio, cantidad: 1 });
      }

      producto.dataset.stock = stock - 1;

      actualizarContador();
      renderCarrito();
    });
  });

  /* =========================
     MODALES DE TONOS
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

  document.querySelectorAll('.cerrar-modal, #cerrar-tonos').forEach(btn => {
    btn.addEventListener('click', () => {
      btn.closest('.modal-tonos').style.display = 'none';
      document.body.classList.remove('modal-abierto');
    });
  });

  /* =========================
     STOCK TONOS
  ========================= */

  const stockTonosLapiz = { '01':10,'02':10,'03':10,'04':10,'05':10,'06':10,'07':10,'08':10,'09':10,'10':10,'11':10,'12':10 };
  const stockTonosLipGloss = { '01':10,'02':10,'03':10,'04':10,'05':10,'06':10 };
  const stockTonosLipCheek = { '01':10,'02':10,'03':10,'04':10,'05':10,'06':10 };
  const stockTonosShini = { '01':10,'02':10,'03':10,'04':10,'05':10,'06':10 };

  activarTonos('#modal-tonos .tono', stockTonosLapiz, 'Delineador para Labios Pink 21', 2000);
  activarTonos('#modal-lipgloss .tono', stockTonosLipGloss, 'Labiales Lip Gloss Mate Miss Betty', 4500);
  activarTonos('#modal-lipcheek .tono', stockTonosLipCheek, 'Pink 21 Lip & Cheek Lipgloss', 4000);
  activarTonos('#modal-shini .tono', stockTonosShini, 'Lip Gloss con Glitter Shini Color Tei', 4000);

  function activarTonos(selector, stockObj, nombreBase, precio) {
    document.querySelectorAll(selector).forEach(btn => {
      btn.addEventListener('click', () => {

        const tono = btn.dataset.tono;
        if (stockObj[tono] <= 0) return alert('Sin stock');

        stockObj[tono]--;

        const id = `${nombreBase}-tono-${tono}`;
        const existente = carrito.find(p => p.id === id);

        if (existente) existente.cantidad++;
        else carrito.push({ id, nombre: `${nombreBase} - Tono ${tono}`, precio, cantidad: 1 });

        btn.textContent = `${tono} (${stockObj[tono]})`;
        if (stockObj[tono] === 0) btn.disabled = true;

        actualizarContador();
        renderCarrito();
      });
    });
  }

  /* =========================
     CARRITO
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
        </div>`;
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

  function actualizarContador() {
    contador.textContent = carrito.reduce((a, p) => a + p.cantidad, 0);
  }

  /* =========================
     MERCADO PAGO
  ========================= */

  btnMP.addEventListener('click', () => {
    modalMP.style.display = 'flex';
    document.body.classList.add('modal-abierto');
  });

  cerrarMP.addEventListener('click', () => {
    modalMP.style.display = 'none';
    document.body.classList.remove('modal-abierto');
    telefonoCliente.style.display = 'none';
    zonaComprobante.style.display = 'none';
    btnPague.disabled = false;
    btnPague.textContent = 'Ya realicé el pago';
    inputComprobante.value = '';
  });

  /* BOTÓN PAGUÉ */
  btnPague.addEventListener('click', () => {
    zonaComprobante.style.display = 'block';
    btnPague.disabled = true;
    btnPague.textContent = 'Esperando comprobante…';
  });

  /* =========================
     VALIDACIÓN PDF (MÁXIMA FRONTEND)
  ========================= */

  inputComprobante.addEventListener('change', () => {
    const file = inputComprobante.files[0];
    if (!file) return;

    if (file.type !== 'application/pdf') {
      alert('Debe ser un PDF');
      inputComprobante.value = '';
      return;
    }

    if (file.size > 5 * 1024 * 1024) {
      alert('Máximo 5 MB');
      inputComprobante.value = '';
      return;
    }

    if (carrito.length === 0) {
      alert('Carrito vacío');
      inputComprobante.value = '';
      return;
    }

    const nombre = file.name.toLowerCase();
    const claves = ['mercadopago','mercado_pago','mp','comprobante','pago','transferencia'];

    if (!claves.some(p => nombre.includes(p))) {
      alert('El PDF no parece un comprobante válido');
      inputComprobante.value = '';
      return;
    }

    if (!confirm('¿Confirmás que este comprobante corresponde a esta compra?')) {
      inputComprobante.value = '';
      return;
    }

    const total = carrito.reduce((a, p) => a + p.precio * p.cantidad, 0);

    telefonoCliente.innerHTML = `
      <p><strong>Contacto post-pago:</strong></p>
      <a href="https://wa.me/5491171020296?text=Hola,%20ya%20realicé%20el%20pago%20de%20$${total}"
         target="_blank"
         class="btn-wsp">
        Contactar por WhatsApp
      </a>
    `;
    telefonoCliente.style.display = 'block';
  });

});
