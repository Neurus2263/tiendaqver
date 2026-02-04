document.addEventListener('DOMContentLoaded', () => {
  /* =========================
     CONFIG
  ========================= */
  const WSP_NUMERO = '5491127902076';

  const SUPABASE_URL = "https://dsspsxiactuskjmodety.supabase.co";
  const SUPABASE_ANON_KEY = "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6ImRzc3BzeGlhY3R1c2tqbW9kZXR5Iiwicm9sZSI6ImFub24iLCJpYXQiOjE3Njk5OTEyMTAsImV4cCI6MjA4NTU2NzIxMH0.OGaX04gxjDvM7O6HPOIeEQZlhErGSp58lYminEfPm_Y";

  /* =========================
     HELPERS (UI)
  ========================= */
  function ensureStatusBox() {
    const zona = document.getElementById('zona-comprobante');
    if (!zona) return null;

    let box = document.getElementById('estado-pago');
    if (!box) {
      box = document.createElement('div');
      box.id = 'estado-pago';
      box.style.marginTop = '12px';
      zona.appendChild(box);
    }
    return box;
  }

  function setStatus(type, text) {
    const box = ensureStatusBox();
    if (!box) return;

    box.style.padding = '10px';
    box.style.borderRadius = '10px';
    box.style.fontWeight = '700';
    box.style.textAlign = 'center';

    if (type === 'ok') {
      box.style.background = '#eaffea';
      box.style.border = '1px solid rgba(76,175,80,.35)';
      box.style.color = '#2e7d32';
      box.textContent = `✅ ${text}`;
    } else if (type === 'warn') {
      box.style.background = '#fff6e5';
      box.style.border = '1px solid rgba(255,152,0,.35)';
      box.style.color = '#8a5a00';
      box.textContent = `⚠️ ${text}`;
    } else if (type === 'error') {
      box.style.background = '#ffecec';
      box.style.border = '1px solid rgba(244,67,54,.35)';
      box.style.color = '#b71c1c';
      box.textContent = `❌ ${text}`;
    } else {
      box.style.background = '#f3ecff';
      box.style.border = '1px solid rgba(155,126,219,.35)';
      box.style.color = '#444';
      box.textContent = text;
    }
  }

  function showOrderCode(orderCode) {
    const zona = document.getElementById('zona-comprobante');
    if (!zona) return;

    let el = document.getElementById('order-code-box');
    if (!el) {
      el = document.createElement('div');
      el.id = 'order-code-box';
      el.style.marginTop = '12px';
      el.style.padding = '10px';
      el.style.borderRadius = '12px';
      el.style.border = '2px solid rgba(155,126,219,.35)';
      el.style.background = '#fff';
      el.style.textAlign = 'center';
      zona.appendChild(el);
    }

    el.innerHTML = `
      <div style="font-size:13px;color:#666;">Nro de orden</div>
      <div style="font-size:18px;font-weight:800;color:#7a5fc5;letter-spacing:.5px;">${orderCode}</div>
    `;
  }

  function setInputsLocked(locked) {
    const inputComprobante = document.getElementById('input-comprobante');
    const montoConfirmado = document.getElementById('monto-confirmado');
    if (inputComprobante) inputComprobante.disabled = !!locked;
    if (montoConfirmado) montoConfirmado.disabled = !!locked;
  }

  /* =========================
     HELPERS (GENERAL)
  ========================= */
  function normalizar(txt) {
    return (txt || '')
      .toLowerCase()
      .normalize('NFD').replace(/[\u0300-\u036f]/g, '')
      .replace(/\s+/g, ' ')
      .trim();
  }

  function generarOrderCode() {
    const d = new Date();
    const y = d.getFullYear().toString().slice(-2);
    const m = String(d.getMonth() + 1).padStart(2, '0');
    const day = String(d.getDate()).padStart(2, '0');
    const rand = Math.random().toString(36).slice(2, 7).toUpperCase();
    return `QVER-${y}${m}${day}-${rand}`;
  }

  function abrirWhatsApp(phoneE164, mensaje) {
    const text = encodeURIComponent(mensaje);
    const url = `https://api.whatsapp.com/send?phone=${phoneE164}&text=${text}`;
    window.location.href = url;
  }

  /* =========================
     CLICK ROBUSTO: "YA REALICÉ EL PAGO"
  ========================= */
  document.addEventListener('click', (e) => {
    const btn = e.target.closest('#btn-pague');
    if (!btn) return;

    const zona = document.getElementById('zona-comprobante');
    if (!zona) return;

    zona.style.display = 'block';

    const btnEnviarWsp = document.getElementById('btn-enviar-wsp');
    const avisoAdjunto = document.getElementById('aviso-adjunto');

    if (btnEnviarWsp) btnEnviarWsp.style.display = 'none';
    if (avisoAdjunto) avisoAdjunto.style.display = 'none';

    setInputsLocked(false);
    setStatus('info', 'Subí el comprobante en PDF y escribí el monto exacto.');
  });

  /* =========================
     INICIALIZAR SUPABASE
  ========================= */
  let supa = null;

  try {
    if (!window.supabase || !window.supabase.createClient) {
      setStatus('warn', 'Supabase no cargó. El botón funciona, pero no se podrá subir comprobante.');
      return;
    }

    const { createClient } = supabase;
    supa = createClient(SUPABASE_URL, SUPABASE_ANON_KEY);
  } catch (err) {
    console.error(err);
    setStatus('error', 'No pude inicializar Supabase.');
    return;
  }

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

  function agregarOIncrementar(item) {
    const existente = carrito.find(p => p.id === item.id);
    if (existente) existente.cantidad++;
    else carrito.push({ ...item, cantidad: 1 });
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
        const item = carrito[i];

        // ✅ Al eliminar del carrito, devolvemos stock visual local (NO DB)
        if (item?.kind === 'producto') liberarStockVisualProducto(item.keyProductoNorm, 1);
        if (item?.kind === 'tono') liberarStockVisualTono(item.producto_id, item.tono, 1);

        carrito.splice(i, 1);
        renderCarrito();
      };
    });
  }

  function totalCarritoActual() {
    return carrito.reduce((acc, p) => acc + (p.precio * p.cantidad), 0);
  }

  /* =========================
     STOCK GLOBAL (SUPABASE)
  ========================= */
  let productosDB = new Map();

  // ✅ Ajuste local (reservas visuales) para que el UI no mienta
  // key: nombre_normalizado -> reservado (int)
  const reservasProductos = new Map();

  function getReservadoProducto(keyNorm) {
    return Number(reservasProductos.get(keyNorm) || 0);
  }

  function reservarStockVisualProducto(keyNorm, cant) {
    reservasProductos.set(keyNorm, getReservadoProducto(keyNorm) + cant);
    pintarStockEnCards(); // repinta con stock - reservado
  }

  function liberarStockVisualProducto(keyNorm, cant) {
    reservasProductos.set(keyNorm, Math.max(0, getReservadoProducto(keyNorm) - cant));
    pintarStockEnCards();
  }

  // Para tonos, guardamos reservas por producto_id:tono
  const reservasTonos = new Map(); // key `${producto_id}:${tono}` -> reservado

  function keyTono(pid, tono) {
    return `${pid}:${tono}`;
  }

  function getReservadoTono(pid, tono) {
    return Number(reservasTonos.get(keyTono(pid, tono)) || 0);
  }

  function reservarStockVisualTono(pid, tono, cant) {
    reservasTonos.set(keyTono(pid, tono), getReservadoTono(pid, tono) + cant);
    // si el modal está abierto, lo actualizamos “en vivo”
    if (productoActual?.id === pid) {
      const modalAbierto = document.querySelector('.modal-tonos[style*="display: flex"]');
      if (modalAbierto) recargarYRepintarTonos(modalAbierto, pid);
    }
  }

  function liberarStockVisualTono(pid, tono, cant) {
    reservasTonos.set(keyTono(pid, tono), Math.max(0, getReservadoTono(pid, tono) - cant));
    if (productoActual?.id === pid) {
      const modalAbierto = document.querySelector('.modal-tonos[style*="display: flex"]');
      if (modalAbierto) recargarYRepintarTonos(modalAbierto, pid);
    }
  }

  async function cargarProductosDB() {
    const { data, error } = await supa
      .from('productos')
      .select('id, nombre, stock, precio');

    if (error) {
      console.error(error);
      return;
    }

    productosDB.clear();
    (data || []).forEach(row => {
      productosDB.set(normalizar(row.nombre), row);
    });
  }

  function pintarStockEnCards() {
    document.querySelectorAll('.producto').forEach(card => {
      const h3 = card.querySelector('h3');
      const stockEl = card.querySelector('.stock');
      const btn = card.querySelector('.btn-agregar');

      if (!btn || !h3) return;

      const key = normalizar(h3.textContent);
      const row = productosDB.get(key);
      if (!row) return;

      card.dataset.precio = String(row.precio);

      const stockReal = Number(row.stock ?? 0);
      const reservado = getReservadoProducto(key);
      const stockMostrado = Math.max(0, stockReal - reservado);

      card.dataset.stock = String(stockMostrado);
      if (stockEl) stockEl.textContent = String(stockMostrado);

      if (stockMostrado <= 0) {
        btn.disabled = true;
        btn.textContent = 'Sin stock';
        card.classList.add('sin-stock');
      } else {
        btn.disabled = false;
        btn.textContent = 'Agregar';
        card.classList.remove('sin-stock');
      }
    });
  }

  async function refrescarStockGlobal() {
    await cargarProductosDB();
    pintarStockEnCards();
  }

  refrescarStockGlobal();

  /* =========================
     ✅ CAMBIO CLAVE #1
     "Agregar" ya NO descuenta stock en DB.
     Solo agrega al carrito + reserva visual.
  ========================= */
  document.addEventListener('click', async (e) => {
    const btn = e.target.closest('.btn-agregar');
    if (!btn) return;

    const card = btn.closest('.producto');
    if (!card) return;

    const h3 = card.querySelector('h3');
    if (!h3) return;

    const nombre = h3.textContent.trim();
    const keyNorm = normalizar(nombre);

    const row = productosDB.get(keyNorm);
    if (!row) return;

    const precio = Number(row.precio || card.dataset.precio || 0);

    // stock visible (real - reservado)
    const stockDisponible = Number(card.dataset.stock || 0);
    if (stockDisponible <= 0) {
      setStatus('warn', 'Sin stock.');
      return;
    }

    // ✅ agregamos al carrito SIN tocar DB
    agregarOIncrementar({
      id: `prod:${row.id}`,         // id estable
      kind: 'producto',
      nombre,
      precio,
      keyProductoNorm: keyNorm,
      producto_id: row.id
    });

    // ✅ reservar visualmente 1 unidad
    reservarStockVisualProducto(keyNorm, 1);
  });

  /* =========================
     TONOS (SUPABASE)
  ========================= */
  let productoActual = null;

  async function cargarTonosParaProducto(productoId) {
    const { data, error } = await supa
      .from('tonos')
      .select('tono, stock, precio')
      .eq('producto_id', productoId)
      .order('tono', { ascending: true });

    if (error) {
      console.error(error);
      return [];
    }
    return data || [];
  }

  async function recargarYRepintarTonos(modal, productoId) {
    const tonos = await cargarTonosParaProducto(productoId);
    pintarTonosEnModal(modal, tonos);
  }

  function pintarTonosEnModal(modal, tonos) {
    const botones = modal.querySelectorAll('.tono');
    const map = new Map();
    tonos.forEach(t => map.set(String(t.tono).trim(), t));

    botones.forEach(btn => {
      const tono = String(btn.dataset.tono || '').trim();
      const row = map.get(tono);

      let badge = btn.querySelector('.stock-mini');
      if (!badge) {
        badge = document.createElement('span');
        badge.className = 'stock-mini';
        btn.appendChild(badge);
      }

      if (!row) {
        badge.textContent = '—';
        btn.disabled = true;
        btn.classList.add('is-out');
        btn.title = 'Tono no cargado';
        return;
      }

      const stockReal = Number(row.stock ?? 0);
      const reservado = getReservadoTono(productoActual.id, tono);
      const stockMostrado = Math.max(0, stockReal - reservado);

      const p = Number(row.precio ?? (productoActual?.precioBase ?? 0));

      btn.dataset.stock = String(stockMostrado);
      btn.dataset.precio = String(p);
      badge.textContent = String(stockMostrado);

      if (stockMostrado <= 0) {
        btn.disabled = true;
        btn.classList.add('is-out');
        btn.title = 'Sin stock';
      } else {
        btn.disabled = false;
        btn.classList.remove('is-out');
        btn.title = `Stock: ${stockMostrado}`;
      }
    });
  }

  document.querySelectorAll('.btn-elegir-tono').forEach(btn => {
    btn.onclick = async () => {
      const card = btn.closest('.producto');
      const h3 = card?.querySelector('h3');
      if (!card || !h3) return;

      const nombreProducto = h3.textContent.trim();
      const row = productosDB.get(normalizar(nombreProducto));
      if (!row) return;

      productoActual = { id: row.id, nombre: row.nombre, precioBase: Number(row.precio || 0) };

      const modal = document.getElementById(`modal-${btn.dataset.producto}`);
      if (!modal) return;

      modal.style.display = 'flex';
      document.body.classList.add('modal-abierto');

      const tonos = await cargarTonosParaProducto(productoActual.id);
      pintarTonosEnModal(modal, tonos);
    };
  });

  document.querySelectorAll('.cerrar-tonos').forEach(btn => {
    btn.onclick = () => {
      const modal = btn.closest('.modal-tonos');
      if (modal) modal.style.display = 'none';
      document.body.classList.remove('modal-abierto');
      productoActual = null;
    };
  });

  /* =========================
     ✅ CAMBIO CLAVE #2
     Elegir un tono ya NO descuenta stock en DB.
     Solo agrega al carrito + reserva visual del tono.
  ========================= */
  document.addEventListener('click', async (e) => {
    const btnTono = e.target.closest('.tono');
    if (!btnTono) return;

    const modal = btnTono.closest('.modal-tonos');
    if (!modal || !productoActual) return;

    const tono = String(btnTono.dataset.tono || '').trim();
    const precio = Number(btnTono.dataset.precio || productoActual.precioBase || 0);

    const stockDisponible = Number(btnTono.dataset.stock || 0);
    if (stockDisponible <= 0) {
      setStatus('warn', 'Ese tono está sin stock.');
      return;
    }

    // ✅ agregar al carrito sin DB
    const idCarrito = `tono:${productoActual.id}:${tono}`;
    const nombreCarrito = `${productoActual.nombre} (Tono ${tono})`;

    agregarOIncrementar({
      id: idCarrito,
      kind: 'tono',
      nombre: nombreCarrito,
      precio,
      producto_id: productoActual.id,
      tono
    });

    // ✅ reservar visual del tono
    reservarStockVisualTono(productoActual.id, tono, 1);
  });

  /* =========================
     MERCADO PAGO (MODAL)
  ========================= */
  const btnMP = document.getElementById('btn-mp');
  const modalMP = document.getElementById('modal-mp');
  const cerrarMP = document.getElementById('cerrar-mp');

  if (btnMP && modalMP) {
    btnMP.onclick = () => {
      if (!carrito.length) {
        setStatus('warn', 'Tu carrito está vacío.');
        return;
      }
      modalMP.style.display = 'flex';
      document.body.classList.add('modal-abierto');
    };
  }

  if (cerrarMP && modalMP) {
    cerrarMP.onclick = () => {
      modalMP.style.display = 'none';
      document.body.classList.remove('modal-abierto');
    };
  }

  /* =========================
     COMPROBANTE + WHATSAPP + EMAIL
     ✅ CAMBIO CLAVE #3: DESCONTAR STOCK REAL ACÁ
  ========================= */
  const inputComprobante = document.getElementById('input-comprobante');
  const montoConfirmado = document.getElementById('monto-confirmado');
  const btnEnviarWsp = document.getElementById('btn-enviar-wsp');
  const avisoAdjunto = document.getElementById('aviso-adjunto');
  const btnPague = document.getElementById('btn-pague');

  let fileSeleccionado = null;
  let pedidoActual = null;
  let linkComprobante = null;

  if (inputComprobante) {
    inputComprobante.addEventListener('change', () => {
      const f = inputComprobante.files?.[0] || null;
      fileSeleccionado = f;

      if (!fileSeleccionado) return;

      if (fileSeleccionado.type !== 'application/pdf') {
        setStatus('error', 'Solo se permite PDF.');
        inputComprobante.value = '';
        fileSeleccionado = null;
        return;
      }

      const maxMB = 5;
      if (fileSeleccionado.size > maxMB * 1024 * 1024) {
        setStatus('error', `El PDF no puede pesar más de ${maxMB}MB.`);
        inputComprobante.value = '';
        fileSeleccionado = null;
        return;
      }

      setStatus('info', 'PDF seleccionado ✅ Ahora ingresá el monto y tocá “Enviar pedido por WhatsApp”.');

      if (btnEnviarWsp) {
        btnEnviarWsp.style.display = 'block';
        btnEnviarWsp.textContent = 'Enviar pedido por WhatsApp';
      }
      if (avisoAdjunto) avisoAdjunto.style.display = 'none';
    });
  }

  async function crearPedido({ order_code, items, total, monto_pagado, canal }) {
    const { data, error } = await supa
      .from('pedidos')
      .insert([{
        order_code,
        items,
        total,
        monto_pagado,
        canal,
        comprobante_url: null
      }])
      .select('id, order_code')
      .single();

    if (error) throw error;
    return data;
  }

  async function subirComprobantePDF(file, orderCode) {
    const fileName = `comprobante-${Date.now()}.pdf`;
    const path = `${orderCode}/${fileName}`;

    const { data, error } = await supa.storage
      .from('comprobantes')
      .upload(path, file, { contentType: 'application/pdf', upsert: false });

    if (error) throw error;
    return data.path;
  }

  async function notificarPagoBackend({ pedido_id, order_code, comprobante_path, monto_pagado }) {
    const { data, error } = await supa.functions.invoke('notificar-pago', {
      body: { pedido_id, order_code, comprobante_path, monto_pagado }
    });

    if (error) throw error;
    return data;
  }

  function armarMensajeWhatsApp(orderCode, monto, link) {
    const detalle = carrito
      .map(p => `- ${p.nombre} x${p.cantidad} = $${p.precio * p.cantidad}`)
      .join('\n');

    return (
`Hola! Ya realicé el pago.
🧾 Orden: ${orderCode}
💰 Monto: $${monto}

📎 Comprobante: ${link}

Detalle:
${detalle}
`);
  }

  // ✅ DESCUENTA STOCK REAL EN SUPABASE (recién al confirmar)
  async function confirmarCompraYDescontarStock() {
    // 1) Armamos lista “expandida” por cantidad
    const acciones = [];
    for (const item of carrito) {
      for (let k = 0; k < (item.cantidad || 0); k++) {
        acciones.push(item);
      }
    }

    // 2) Primero revalidamos stock contra DB (evita descontar a medias)
    //    Productos sin tonos: por producto_id
    //    Tonos: por producto_id+tono
    const prods = new Map();   // producto_id -> total
    const tonos = new Map();   // `${pid}:${tono}` -> total

    carrito.forEach(it => {
      if (it.kind === 'producto') {
        prods.set(it.producto_id, (prods.get(it.producto_id) || 0) + it.cantidad);
      } else if (it.kind === 'tono') {
        const kt = `${it.producto_id}:${it.tono}`;
        tonos.set(kt, (tonos.get(kt) || 0) + it.cantidad);
      }
    });

    // validar productos
    if (prods.size) {
      const ids = Array.from(prods.keys());
      const { data, error } = await supa.from('productos').select('id, stock').in('id', ids);
      if (error) throw error;

      for (const row of (data || [])) {
        const necesito = prods.get(row.id) || 0;
        const stock = Number(row.stock || 0);
        if (stock < necesito) {
          throw new Error(`Stock insuficiente (producto id ${row.id}). Hay ${stock}, necesitás ${necesito}.`);
        }
      }
    }

    // validar tonos
    if (tonos.size) {
      // consultamos por producto_id y traemos tonos de esos productos
      const pids = Array.from(new Set(Array.from(tonos.keys()).map(x => x.split(':')[0])));
      const { data, error } = await supa.from('tonos').select('producto_id, tono, stock').in('producto_id', pids);
      if (error) throw error;

      const map = new Map();
      (data || []).forEach(r => map.set(`${r.producto_id}:${String(r.tono).trim()}`, Number(r.stock || 0)));

      for (const [kt, necesito] of tonos.entries()) {
        const stock = Number(map.get(kt) ?? 0);
        if (stock < necesito) {
          throw new Error(`Stock insuficiente (tono ${kt}). Hay ${stock}, necesitás ${necesito}.`);
        }
      }
    }

    // 3) Si pasa validación, recién ahí descontamos de verdad
    //    Productos sin tonos: usamos tu RPC decrement_stock por nombre
    //    Tonos: usamos tu RPC decrement_tono_stock
    for (const it of acciones) {
      if (it.kind === 'producto') {
        // Tu RPC espera nombre (p_nombre). Usamos el nombre del h3 (it.nombre base).
        const nombreBase = it.nombre.replace(/\s+x\d+.*$/i, '').trim();
        const { data, error } = await supa.rpc('decrement_stock', { p_nombre: nombreBase });
        if (error) throw error;
        if (Number(data) < 0) throw new Error('Sin stock (producto) al confirmar.');
      } else if (it.kind === 'tono') {
        const { data, error } = await supa.rpc('decrement_tono_stock', {
          p_producto_id: it.producto_id,
          p_tono: String(it.tono).trim()
        });
        if (error) throw error;
        if (Number(data) < 0) throw new Error('Sin stock (tono) al confirmar.');
      }
    }
  }

  async function procesarPagoYObtenerLink() {
    if (!carrito.length) {
      setStatus('warn', 'Tu carrito está vacío.');
      throw new Error('Carrito vacío');
    }

    if (!fileSeleccionado) {
      setStatus('error', 'Seleccioná el comprobante en PDF.');
      throw new Error('Sin PDF');
    }

    const monto = Number(montoConfirmado?.value || 0);
    if (!monto || monto <= 0) {
      setStatus('error', 'Ingresá el monto exacto que pagaste.');
      throw new Error('Monto inválido');
    }

    // UI lock
    if (btnEnviarWsp) {
      btnEnviarWsp.disabled = true;
      btnEnviarWsp.textContent = 'Procesando...';
    }
    if (btnPague) {
      btnPague.disabled = true;
      btnPague.textContent = 'Procesando...';
    }
    setInputsLocked(true);

    // ✅ 1) DESCONTAR STOCK REAL AHORA (no antes)
    setStatus('info', 'Confirmando stock...');
    await confirmarCompraYDescontarStock();

    // ✅ 2) crear pedido + subir PDF + notificar (como ya lo tenías)
    setStatus('info', 'Creando orden...');
    const order_code = generarOrderCode();

    pedidoActual = await crearPedido({
      order_code,
      items: carrito,
      total: totalCarritoActual(),
      monto_pagado: monto,
      canal: 'mercadopago'
    });

    showOrderCode(pedidoActual.order_code);

    setStatus('info', 'Subiendo comprobante...');
    const comprobante_path = await subirComprobantePDF(fileSeleccionado, pedidoActual.order_code);

    setStatus('info', 'Generando link y notificando...');
    const resp = await notificarPagoBackend({
      pedido_id: pedidoActual.id,
      order_code: pedidoActual.order_code,
      comprobante_path,
      monto_pagado: monto
    });

    linkComprobante = resp?.signed_url;
    if (!linkComprobante) {
      setStatus('error', 'Se subió el PDF pero no recibí el link. Revisá la Edge Function.');
      throw new Error('Sin signed_url');
    }

    setStatus('ok', 'Listo ✅ Ahora se abre WhatsApp con tu orden y el link.');
    if (avisoAdjunto) avisoAdjunto.style.display = 'block';

    return { monto, order_code: pedidoActual.order_code, link: linkComprobante };
  }

  if (btnEnviarWsp) {
    btnEnviarWsp.onclick = async () => {
      try {
        const { monto, order_code, link } = await procesarPagoYObtenerLink();

        setStatus(
          'ok',
          'Comprobante subido correctamente ✅ Ahora se abrirá WhatsApp. Adjuntá el PDF desde el clip 📎'
        );

        setTimeout(() => {
          const msg = armarMensajeWhatsApp(order_code, monto, link);
          abrirWhatsApp(WSP_NUMERO, msg);
        }, 1200);

        // ✅ Limpieza local: carrito y reservas visuales
        carrito = [];
        reservasProductos.clear();
        reservasTonos.clear();
        renderCarrito();
        await refrescarStockGlobal();

      } catch (err) {
        console.error(err);

        setStatus('error', (err && err.message) ? err.message : 'Error procesando el pago.');
        setInputsLocked(false);

        if (btnEnviarWsp) {
          btnEnviarWsp.disabled = false;
          btnEnviarWsp.textContent = 'Enviar pedido por WhatsApp';
        }
        if (btnPague) {
          btnPague.disabled = false;
          btnPague.textContent = 'Ya realicé el pago';
        }

        // si falló, resync stock real para no “mentir” visualmente
        await refrescarStockGlobal();
      }
    };
  }
});
