document.addEventListener('DOMContentLoaded', () => {

  let carrito = [];

  const contador = document.getElementById('contador-carrito');
  const overlay = document.getElementById('carrito-overlay');
  const items = document.getElementById('carrito-items');
  const totalSpan = document.getElementById('total-carrito');

  const btnAbrirCarrito = document.getElementById('btn-ver-carrito');
  const btnCerrarCarrito = document.getElementById('cerrar-carrito');

  /* =========================
     CARRITO
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
     AGREGAR PRODUCTOS
  ========================= */

  document.querySelectorAll('.btn-agregar').forEach(btn => {
    btn.addEventListener('click', () => {

      const producto = btn.closest('.producto');
      let stock = parseInt(producto.dataset.stock);
      const precio = parseInt(producto.dataset.precio);
      const nombre = producto.querySelector('h3').textContent;
      const stockText = producto.querySelector('.stock');

      if (stock <= 0) return;

      carrito.push({ nombre, precio });

      stock--;
      producto.dataset.stock = stock;
      contador.textContent = carrito.length;

      if (stock > 0) {
        stockText.textContent = `Stock disponible: ${stock}`;
      } else {
        stockText.textContent = 'SIN STOCK';
        producto.classList.add('sin-stock');
        btn.disabled = true;
      }

      renderCarrito();
    });
  });

  /* =========================
     RENDER CARRITO
  ========================= */

  function renderCarrito() {
    items.innerHTML = '';
    let total = 0;

    carrito.forEach((p, index) => {
      items.innerHTML += `
        <div class="item-carrito">
          <p>• ${p.nombre} - $${p.precio}</p>
          <button class="btn-eliminar" data-index="${index}">❌</button>
        </div>
      `;
      total += p.precio;
    });

    totalSpan.textContent = total;

    document.querySelectorAll('.btn-eliminar').forEach(btn => {
      btn.addEventListener('click', () => {
        carrito.splice(btn.dataset.index, 1);
        contador.textContent = carrito.length;
        renderCarrito();
      });
    });
  }

  /* =========================
     MODAL TONOS
  ========================= */

  const btnTonos = document.querySelector('.ver-tonos-btn');
  const modalTonos = document.getElementById('modal-tonos');
  const cerrarTonos = document.getElementById('cerrar-tonos');

  if (btnTonos) {
    btnTonos.addEventListener('click', () => {
      modalTonos.style.display = 'flex';
      document.body.classList.add('modal-abierto');
    });
  }

  if (cerrarTonos) {
    cerrarTonos.addEventListener('click', () => {
      modalTonos.style.display = 'none';
      document.body.classList.remove('modal-abierto');
    });
  }

  document.querySelectorAll('.tono').forEach(btn => {
    btn.addEventListener('click', () => {

      const tono = btn.dataset.tono;
      carrito.push({
        nombre: `Labial Pink 21 - Tono ${tono}`,
        precio: 8500
      });

      contador.textContent = carrito.length;
      renderCarrito();

      modalTonos.style.display = 'none';
      document.body.classList.remove('modal-abierto');
    });
  });

  /* =========================
     MODAL MERCADO PAGO
  ========================= */

  const btnMP = document.getElementById('btn-mp');
  const modalMP = document.getElementById('modal-mp');
  const cerrarMP = document.getElementById('cerrar-mp');

  if (btnMP) {
    btnMP.addEventListener('click', () => {
      modalMP.style.display = 'flex';
      document.body.classList.add('modal-abierto');
    });
  }

  if (cerrarMP) {
    cerrarMP.addEventListener('click', () => {
      modalMP.style.display = 'none';
      document.body.classList.remove('modal-abierto');
    });
  }

  /* =========================
     COMPROBANTE MP
  ========================= */

  const btnPague = document.getElementById('btn-pague');
  const zonaComprobante = document.getElementById('zona-comprobante');
  const inputComprobante = document.getElementById('input-comprobante');
  const telefonoCliente = document.getElementById('telefono-cliente');

  if (btnPague) {
    btnPague.addEventListener('click', () => {
      zonaComprobante.style.display = 'block';
    });
  }

  if (inputComprobante) {
    inputComprobante.addEventListener('change', () => {

      const archivo = inputComprobante.files[0];
      if (!archivo) return;

      if (archivo.type !== 'application/pdf') {
        alert('Solo se aceptan comprobantes en PDF.');
        inputComprobante.value = '';
        return;
      }

      const minSize = 30000;
      const maxSize = 5000000;

      if (archivo.size < minSize || archivo.size > maxSize) {
        alert('El archivo no parece un comprobante válido.');
        inputComprobante.value = '';
        return;
      }

      telefonoCliente.style.display = 'block';
    });
  }

});
