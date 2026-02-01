document.addEventListener('DOMContentLoaded', () => {
  /* =========================
     CONFIG
  ========================= */
  const WSP_NUMERO = '5491127902076'; // ✅ TU WhatsApp (formato wa.me sin +)

  /* =========================
     CARRITO
  ========================= */
  let carrito = [];

  const contador = document.getElementById('contador-carrito');
  const overlay = document.getElementById('carrito-overlay');
  const items = document.getElementById('carrito-items');
  const totalSpan = document.getElementById('total-carrito');

  const btnAbrirCarrito = document.getElementById('btn-ver-carrito');
  const btnCerrarCarrito = document.getElementById('cerrar-carrito');

  if (btnAbrirCarrito && overlay) {
    btnAbrirCarrito.addEventListener('click', () => {
      overlay.style.display = 'flex';
      document.body.classList.add('modal-abierto');
    });
  }

  if (btnCerrarCarrito && overlay) {
    btnCerrarCarrito.addEventListener('click', () => {
      overlay.style.display = 'none';
      document.body.classList.remove('modal-abierto');
    });
  }

  function agregarOIncrementar(id, nombre, precio) {
    const existente = carrito.find(p => p.id === id);
    if (existente) existente.cantidad++;
    else carrito.push({ id, nombre, precio, cantidad: 1 });
    renderCarrito();
  }

  function renderCarrito() {
    if (!items || !totalSpan || !contador) return;

    items.innerHTML = '';
    let total = 0;

    carrito.forEach((p, index) => {
      total += p.precio * p.cantidad;
      items.insertAdjacentHTML('beforeend', `
        <div class="item-carrito">
          <p>${p.nombre} x${p.cantidad}</p>
          <strong>$${p.precio * p.cantidad}</strong>
          <button class="btn-eliminar" data-index="${index}">❌</button>
        </div>
      `);
    });

    totalSpan.textContent = String(total);
    contador.textContent = String(carrito.reduce((a, p) => a + p.cantidad, 0));

    document.querySelectorAll('.btn-eliminar').forEach(btn => {
      btn.onclick = () => {
        const i = Number(btn.dataset.index);
        carrito.splice(i, 1);
        renderCarrito();
      };
    });
  }

  /* =========================
     PRODUCTOS SIN TONO (STOCK MANUAL EN HTML)
     - data-stock y <p class="stock"> se actualizan solo en ese dispositivo
  ========================= */
  document.addEventListener('click', (e) => {
    const btn = e.target.closest('.btn-agregar');
    if (!btn) return;

    const producto = btn.closest('.producto');
    if (!producto) return;

    // Si no tiene data-stock, NO es producto sin tono
    if (producto.dataset.stock == null) return;

    const nombre = producto.querySelector('h3')?.textContent?.trim() || 'Producto';
    const precio = Number(producto.dataset.precio || 0);

    let stock = Number(producto.dataset.stock);
    const stockHTML = producto.querySelector('.stock');

    if (Number.isNaN(stock)) stock = 0;

    if (stock <= 0) {
      alert('Sin stock');
      return;
    }

    // ID = nombre (para que sume cantidad)
    agregarOIncrementar(nombre, nombre, precio);

    stock -= 1;
    producto.dataset.stock = String(stock);
    if (stockHTML) stockHTML.textContent = String(stock);

    if (stock <= 0) {
      btn.disabled = true;
      btn.textContent = 'Sin stock';
      producto.classList.add('sin-stock');
    }
  });

  /* =========================
     MODALES TONOS: abrir/cerrar
     (HTML corregido usa class="cerrar-tonos" en TODOS)
  ========================= */
  document.querySelectorAll('.btn-elegir-tono').forEach(btn => {
    btn.onclick = () => {
      const modal = document.getElementById(`modal-${btn.dataset.producto}`);
      if (!modal) return;
      modal.style.display = 'flex';
      document.body.classList.add('modal-abierto');
    };
  });

  // ✅ Cerrar cualquier modal de tonos
  document.querySelectorAll('.cerrar-tonos').forEach(btn => {
    btn.onclick = () => {
      const modal = btn.closest('.modal-tonos');
      if (modal) modal.style.display = 'none';
      document.body.classList.remove('modal-abierto');
    };
  });

  /* =========================
     TONOS: STOCK MANUAL (EDITÁS ACÁ)
     - NO se guarda
     - NO se cierra al elegir
  ========================= */
  const stockTonos = {
    tonos:   { '01': 1,'02': 1,'03': 1,'04': 1,'05': 1,'06': 1,'07': 1,'08': 1,'09': 1,'10': 1,'11': 1,'12': 1 },
    lipgloss:{ '01': 1,'02': 1,'03': 0,'04': 1,'05': 1,'06': 0 },
    lipcheek:{ '01': 1,'02': 2,'03': 2,'04': 1,'05': 2,'06': 2 },
    shini:   { '01': 0,'02': 1,'03': 1,'04': 0,'05': 2,'06': 2 }
  };

  const configTonos = {
    'modal-tonos':    { key: 'tonos',    nombre: 'Delineador para Labios Pink 21',        precio: 2000 },
    'modal-lipgloss': { key: 'lipgloss', nombre: 'Labiales Lip Gloss Mate Miss Betty',   precio: 4500 },
    'modal-lipcheek': { key: 'lipcheek', nombre: 'Pink 21 Lip & Cheek Lipgloss',         precio: 4000 },
    'modal-shini':    { key: 'shini',    nombre: 'Lip Gloss con Glitter Shini Color Tei',precio: 4000 }
  };

  function pintarStockTonos(modalId) {
    const cfg = configTonos[modalId];
    const modal = document.getElementById(modalId);
    if (!cfg || !modal) return;

    modal.querySelectorAll('.tono').forEach(btn => {
      const tono = btn.dataset.tono;
      const s = Number(stockTonos[cfg.key]?.[tono] ?? 0);
      btn.textContent = `${tono} (${s})`;
      btn.disabled = s <= 0;
    });
  }

  // Pintar stock de todos los modales al iniciar
  Object.keys(configTonos).forEach(pintarStockTonos);

  // Click en tonos (NO cerrar modal)
  document.querySelectorAll('.modal-tonos .tono').forEach(btn => {
    btn.onclick = () => {
      const modal = btn.closest('.modal-tonos');
      if (!modal) return;

      const cfg = configTonos[modal.id];
      if (!cfg) return;

      const tono = btn.dataset.tono;
      let s = Number(stockTonos[cfg.key]?.[tono] ?? 0);

      if (s <= 0) {
        alert('Sin stock');
        return;
      }

      s -= 1;
      stockTonos[cfg.key][tono] = s;

      btn.textContent = `${tono} (${s})`;
      btn.disabled = s <= 0;

      const id = `${cfg.nombre}-tono-${tono}`;
      const nombreItem = `${cfg.nombre} - Tono ${tono}`;
      agregarOIncrementar(id, nombreItem, cfg.precio);
    };
  });

  /* =========================
     MERCADO PAGO
  ========================= */
  const btnMP = document.getElementById('btn-mp');
  const modalMP = document.getElementById('modal-mp');
  const cerrarMP = document.getElementById('cerrar-mp');

  const btnPague = document.getElementById('btn-pague');
  const zonaComprobante = document.getElementById('zona-comprobante');
  const inputComprobante = document.getElementById('input-comprobante');
  const montoConfirmado = document.getElementById('monto-confirmado');
  const btnEnviarWsp = document.getElementById('btn-enviar-wsp');
  const avisoAdjunto = document.getElementById('aviso-adjunto');

  if (btnMP && modalMP) {
    btnMP.onclick = () => {
      modalMP.style.display = 'flex';
      document.body.classList.add('modal-abierto');
    };
  }

  if (cerrarMP && modalMP) {
    cerrarMP.onclick = () => {
      modalMP.style.display = 'none';
      document.body.classList.remove('modal-abierto');

      // reset UI pago
      if (zonaComprobante) zonaComprobante.style.display = 'none';
      if (inputComprobante) inputComprobante.value = '';
      if (montoConfirmado) montoConfirmado.value = '';
      if (btnEnviarWsp) btnEnviarWsp.style.display = 'none';
      if (avisoAdjunto) avisoAdjunto.style.display = 'none';
    };
  }

  if (btnPague && zonaComprobante) {
    btnPague.onclick = () => {
      if (carrito.length === 0) {
        alert('Carrito vacío');
        return;
      }
      zonaComprobante.style.display = 'block';
    };
  }

  function validarComprobanteBasico(file) {
    if (!file) return { ok: false, msg: 'No hay archivo' };

    // Android a veces trae file.type vacío -> validamos por extensión también
    const nombre = (file.name || '').toLowerCase();
    const isPdfByName = nombre.endsWith('.pdf');
    const isPdfByType = file.type === 'application/pdf';

    if (!isPdfByType && !isPdfByName) {
      return { ok: false, msg: 'El comprobante debe ser PDF.' };
    }

    // Tamaño
    const minSize = 60000; // 60 KB
    const maxSize = 5 * 1024 * 1024; // 5 MB
    if (file.size < minSize || file.size > maxSize) {
      return { ok: false, msg: 'El archivo no parece un comprobante válido (tamaño).' };
    }

    // Nombre (tu filtro)
    const palabrasClave = ['mercadopago', 'mercado_pago', 'mp', 'comprobante', 'pago', 'transferencia'];
    if (!palabrasClave.some(p => nombre.includes(p))) {
      return { ok: false, msg: 'El nombre del archivo no corresponde a un comprobante de pago.' };
    }

    return { ok: true, msg: '' };
  }

  function tryHabilitarWsp() {
    if (!btnEnviarWsp) return;
    const file = inputComprobante?.files?.[0];
    const monto = Number(montoConfirmado?.value || 0);

    if (file && monto > 0) {
      btnEnviarWsp.style.display = 'block';
    } else {
      btnEnviarWsp.style.display = 'none';
    }
  }

  if (inputComprobante) {
    inputComprobante.addEventListener('change', () => {
      const file = inputComprobante.files[0];
      const v = validarComprobanteBasico(file);

      if (!v.ok) {
        alert(v.msg);
        inputComprobante.value = '';
        if (btnEnviarWsp) btnEnviarWsp.style.display = 'none';
        if (avisoAdjunto) avisoAdjunto.style.display = 'none';
        return;
      }

      if (!confirm('¿Confirmás que este comprobante corresponde a esta compra?')) {
        inputComprobante.value = '';
        if (btnEnviarWsp) btnEnviarWsp.style.display = 'none';
        if (avisoAdjunto) avisoAdjunto.style.display = 'none';
        return;
      }

      tryHabilitarWsp();
    });
  }

  if (montoConfirmado) {
    montoConfirmado.addEventListener('input', tryHabilitarWsp);
  }

  function crearIdOrdenUnico() {
    // ID único para que no se repita entre clientes:
    // ej: QVER-20260201-AB12
    const hoy = new Date();
    const y = hoy.getFullYear();
    const m = String(hoy.getMonth() + 1).padStart(2, '0');
    const d = String(hoy.getDate()).padStart(2, '0');
    const rand = Math.random().toString(36).slice(2, 6).toUpperCase();
    return `QVER-${y}${m}${d}-${rand}`;
  }

  if (btnEnviarWsp) {
    btnEnviarWsp.onclick = () => {
      const file = inputComprobante?.files?.[0];
      const v = validarComprobanteBasico(file);
      if (!v.ok) {
        alert(v.msg);
        return;
      }

      const monto = Number(montoConfirmado?.value || 0);
      if (monto <= 0) {
        alert('Ingresá el monto exacto que pagaste.');
        return;
      }

      const total = Number(totalSpan?.textContent || 0);

      const ordenUnica = crearIdOrdenUnico();

      const detalle = carrito
        .map(p => `• ${p.nombre} x${p.cantidad} = $${p.precio * p.cantidad}`)
        .join('\n');

      const mensaje =
`Hola! Ya realicé el pago. ✅
Orden: ${ordenUnica}

Detalle:
${detalle}

Total carrito: $${total}
Monto pagado: $${monto}

IMPORTANTE: Ya tengo el comprobante en PDF seleccionado.
(En WhatsApp tocá el 📎 y adjuntalo desde Archivos/Downloads).`;

      if (avisoAdjunto) avisoAdjunto.style.display = 'block';

      const url = `https://wa.me/${WSP_NUMERO}?text=${encodeURIComponent(mensaje)}`;
      window.open(url, '_blank');
    };
  }
});
