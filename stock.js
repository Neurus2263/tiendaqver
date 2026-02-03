document.addEventListener('DOMContentLoaded', () => {
  /* =========================
     CONFIG
  ========================= */
  const WSP_NUMERO = '5491127902076';

  const SUPABASE_URL = "https://dsspsxiactuskjmodety.supabase.co";
  const SUPABASE_ANON_KEY = "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6ImRzc3BzeGlhY3R1c2tqbW9kZXR5Iiwicm9sZSI6ImFub24iLCJpYXQiOjE3Njk5OTEyMTAsImV4cCI6MjA4NTU2NzIxMH0.OGaX04gxjDvM7O6HPOIeEQZlhErGSp58lYminEfPm_Y";

  // Reservas
  const TTL_MIN = 10;

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

  function buildWhatsAppUrl(phoneE164, mensaje) {
    const text = encodeURIComponent(mensaje);
    return `https://api.whatsapp.com/send?phone=${phoneE164}&text=${text}`;
  }

  // ✅ FIX móvil: abrimos ventana dentro del click (gesto), y después la redirigimos
  function abrirWhatsAppSeguro(phoneE164, mensaje, preOpenedWindow) {
    const url = buildWhatsAppUrl(phoneE164, mensaje);
    try {
      if (preOpenedWindow && !preOpenedWindow.closed) {
        preOpenedWindow.location.href = url;
        return;
      }
    } catch (_) {}
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
     SUPABASE INIT
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
     SESIÓN RESERVAS
  ========================= */
  function getSessionId() {
    let id = localStorage.getItem('qver_session_id');
    if (!id) {
      id = 'sess_' + crypto.randomUUID();
      localStorage.setItem('qver_session_id', id);
    }
    return id;
  }
  const SESSION_ID = getSessionId();

  async function reservarProducto(nombre, cantidad = 1) {
    const { data, error } = await supa.rpc('reservar_producto', {
      p_session_id: SESSION_ID,
      p_nombre: nombre,
      p_cantidad: cantidad,
      p_ttl_min: TTL_MIN
    });
    if (error) throw error;
    return Number(data);
  }

  async function reservarTono(productoId, tono, cantidad = 1) {
    const { data, error } = await supa.rpc('reservar_tono', {
      p_session_id: SESSION_ID,
      p_producto_id: productoId,
      p_tono: tono,
      p_cantidad: cantidad,
      p_ttl_min: TTL_MIN
    });
    if (error) throw error;
    return Number(data);
  }

  async function liberarReservas() {
    const { error } = await supa.rpc('liberar_reservas', { p_session_id: SESSION_ID });
    if (error) console.error(error);
  }

  async function extenderReservas() {
    const { error } = await supa.rpc('extender_reservas', { p_session_id: SESSION_ID, p_ttl_min: TTL_MIN });
    if (error) console.error(error);
  }

  async function liberarReservaItemProducto(nombre, cantidad) {
    const { error } = await supa.rpc('liberar_reserva_item', {
      p_session_id: SESSION_ID,
      p_tipo: 'producto',
      p_nombre: nombre,
      p_cantidad: cantidad
    });
    if (error) throw error;
  }

  async function liberarReservaItemTono(productoId, tono, cantidad) {
    const { error } = await supa.rpc('liberar_reserva_item', {
      p_session_id: SESSION_ID,
      p_tipo: 'tono',
      p_producto_id: productoId,
      p_tono: String(tono),
      p_cantidad: cantidad
    });
    if (error) throw error;
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

  function agregarOIncrementar(id, nombre, precio, meta = {}) {
    const existente = carrito.find(p => p.id === id);
    if (existente) existente.cantidad++;
    else carrito.push({ id, nombre, precio, cantidad: 1, ...meta });
    renderCarrito();
  }

  function totalCarritoActual() {
    return carrito.reduce((acc, p) => acc + (p.precio * p.cantidad), 0);
  }

  function reservadoLocalProducto(nombre) {
    const key = normalizar(nombre);
    return carrito
      .filter(p => p.tipo === 'producto' && normalizar(p.nombre_base) === key)
      .reduce((acc, p) => acc + (p.cantidad || 0), 0);
  }

  function reservadoLocalTono(productoId, tono) {
    return carrito
      .filter(p => p.tipo === 'tono' && p.producto_id === productoId && String(p.tono) === String(tono))
      .reduce((acc, p) => acc + (p.cantidad || 0), 0);
  }

  async function liberarTodoSiCarritoVacio() {
    if (carrito.length === 0) {
      try {
        await liberarReservas();
        await refrescarStockGlobal();
      } catch (_) {}
    }
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
      btn.onclick = async () => {
        const i = Number(btn.dataset.index);
        const item = carrito[i];
        if (!item) return;

        // Saco del carrito
        carrito.splice(i, 1);
        renderCarrito();

        // Libero reserva de ESE ITEM
        try {
          if (item.tipo === 'producto') {
            await liberarReservaItemProducto(item.nombre_base, item.cantidad || 1);
          } else if (item.tipo === 'tono') {
            await liberarReservaItemTono(item.producto_id, item.tono, item.cantidad || 1);
          }
        } catch (err) {
          console.error(err);
        }

        // Refresco stock (sube el numerito)
        try {
          await refrescarStockGlobal();
          await liberarTodoSiCarritoVacio();
        } catch (_) {}
      };
    });
  }

  /* =========================
     STOCK GLOBAL (SUPABASE)
  ========================= */
  let productosDB = new Map(); // key(normalizado nombre) -> row

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

      if (!h3) return;

      const key = normalizar(h3.textContent);
      const row = productosDB.get(key);
      if (!row) return;

      // precio siempre de DB
      card.dataset.precio = String(row.precio);

      // ✅ Stock visible = stock real - reservado local (para que “baje” como antes)
      const stockReal = Number(row.stock ?? 0);
      const reservado = reservadoLocalProducto(row.nombre);
      const stockVisible = Math.max(0, stockReal - reservado);

      card.dataset.stock = String(stockVisible);
      if (stockEl) stockEl.textContent = String(stockVisible);

      if (btn) {
        if (stockVisible <= 0) {
          btn.disabled = true;
          btn.textContent = 'Sin stock';
          card.classList.add('sin-stock');
        } else {
          btn.disabled = false;
          btn.textContent = 'Agregar';
          card.classList.remove('sin-stock');
        }
      }
    });
  }

  async function refrescarStockGlobal() {
    await cargarProductosDB();
    pintarStockEnCards();
  }

  // Refresh inicial
  refrescarStockGlobal();

  // Refresh cuando volvés a la pestaña
  document.addEventListener('visibilitychange', () => {
    if (document.visibilityState === 'visible') refrescarStockGlobal();
  });

  // Poll suave
  setInterval(refrescarStockGlobal, 25000);

  // Realtime (si está habilitado)
  try {
    supa
      .channel('stock-changes')
      .on('postgres_changes', { event: '*', schema: 'public', table: 'productos' }, () => {
        refrescarStockGlobal();
      })
      .on('postgres_changes', { event: '*', schema: 'public', table: 'tonos' }, () => {})
      .subscribe();
  } catch (_) {}

  /* =========================
     ✅ AGREGAR PRODUCTO SIMPLE
     - Reserva en DB
     - Baja numerito visible
     - NO descuenta stock real
  ========================= */
  document.addEventListener('click', async (e) => {
    const btn = e.target.closest('.btn-agregar');
    if (!btn) return;

    const card = btn.closest('.producto');
    if (!card) return;

    const h3 = card.querySelector('h3');
    if (!h3) return;

    const nombre = h3.textContent.trim();
    const precio = Number(card.dataset.precio || 0);
    const stockEl = card.querySelector('.stock');

    if (btn.dataset.loading === '1') return;
    btn.dataset.loading = '1';

    const textoOriginal = btn.textContent;
    btn.textContent = '...';
    btn.disabled = true;

   try {
  // Reservo 1 unidad (temporal en backend)
  await reservarProducto(nombre, 1);

  // 🔽 Descuento SOLO visual (frontend)
  const stockActual = Number(card.dataset.stock || 0);
  const nuevoStockVisible = Math.max(0, stockActual - 1);
  card.dataset.stock = String(nuevoStockVisible);

  const stockEl = card.querySelector('.stock');
  if (stockEl) stockEl.textContent = nuevoStockVisible;

  if (nuevoStockVisible <= 0) {
    btn.disabled = true;
    btn.textContent = 'Sin stock';
    card.classList.add('sin-stock');
  }

  // ✅ Agrego al carrito
  agregarOIncrementar(
    `prod:${normalizar(nombre)}`,
    nombre,
    precio,
    { tipo: 'producto', nombre_base: nombre }
  );

      // Actualizo stock visible en card
      card.dataset.stock = String(nuevoStockVisible);
      if (stockEl) stockEl.textContent = String(nuevoStockVisible);

      if (nuevoStockVisible <= 0) {
        card.classList.add('sin-stock');
        btn.textContent = 'Sin stock';
        btn.disabled = true;
      } else {
        card.classList.remove('sin-stock');
        btn.textContent = 'Agregar';
        btn.disabled = false;
      }

      // Mantengo viva la reserva
      extenderReservas();
    } catch (err) {
      console.error(err);
      setStatus('warn', 'No se pudo reservar stock (quizás se agotó).');
      btn.textContent = textoOriginal;
      btn.disabled = false;
    } finally {
      btn.dataset.loading = '0';
    }
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
      const reservado = productoActual ? reservadoLocalTono(productoActual.id, tono) : 0;
      const stockVisible = Math.max(0, stockReal - reservado);

      const p = Number(row.precio ?? (productoActual?.precioBase ?? 0));

      btn.dataset.stock = String(stockVisible);
      btn.dataset.precio = String(p);
      badge.textContent = String(stockVisible);

      if (stockVisible <= 0) {
        btn.disabled = true;
        btn.classList.add('is-out');
        btn.title = 'Sin stock';
      } else {
        btn.disabled = false;
        btn.classList.remove('is-out');
        btn.title = `Stock: ${stockVisible}`;
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

  // ✅ click en tono: reserva + baja badge + agrega al carrito
  document.addEventListener('click', async (e) => {
    const btnTono = e.target.closest('.tono');
    if (!btnTono) return;

    const modal = btnTono.closest('.modal-tonos');
    if (!modal || !productoActual) return;

    const tono = String(btnTono.dataset.tono || '').trim();
    const precio = Number(btnTono.dataset.precio || productoActual.precioBase || 0);
    const stockVisible = Number(btnTono.dataset.stock || 0);

    if (stockVisible <= 0) {
      setStatus('warn', 'No hay stock suficiente de ese tono.');
      return;
    }

    if (btnTono.dataset.loading === '1') return;
    btnTono.dataset.loading = '1';

    const texto = btnTono.textContent;
    btnTono.textContent = '...';
    btnTono.disabled = true;

    try {
      const nuevoStockVisible = await reservarTono(productoActual.id, tono, 1);

      if (nuevoStockVisible < 0) {
        setStatus('warn', 'No hay stock disponible de ese tono.');
        return;
      }

      const idCarrito = `tono:${productoActual.id}:${tono}`;
      const nombreCarrito = `${productoActual.nombre} (Tono ${tono})`;

      agregarOIncrementar(idCarrito, nombreCarrito, precio, {
        tipo: 'tono',
        producto_id: productoActual.id,
        tono,
        nombre_base: productoActual.nombre
      });

      // Actualizo badge visible
      btnTono.dataset.stock = String(nuevoStockVisible);
      const badge = btnTono.querySelector('.stock-mini');
      if (badge) badge.textContent = String(nuevoStockVisible);

      if (nuevoStockVisible <= 0) {
        btnTono.disabled = true;
        btnTono.classList.add('is-out');
      } else {
        btnTono.disabled = false;
        btnTono.classList.remove('is-out');
      }

      extenderReservas();
    } catch (err) {
      console.error(err);
      setStatus('warn', 'No se pudo reservar ese tono.');
    } finally {
      btnTono.dataset.loading = '0';
      btnTono.textContent = texto;
    }
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
      extenderReservas();
    };
  }

  if (cerrarMP && modalMP) {
    cerrarMP.onclick = () => {
      modalMP.style.display = 'none';
      document.body.classList.remove('modal-abierto');
      // NO liberamos acá porque capaz sigue comprando.
      // Se liberan al irse/cerrar/abandonar.
    };
  }

  /* =========================
     COMPROBANTE + WHATSAPP
     ✅ Stock real se descuenta SOLO cuando confirma (acá).
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
      extenderReservas();
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
✅ Orden: ${orderCode}
💰 Monto pagado: $${monto}

📎 Comprobante (link): ${link}

Detalle:
${detalle}
`);
  }

  // ✅ Descontar stock real en DB (recién en confirmación)
  async function descontarStockRealEnDB() {
    const productos = carrito.filter(p => p.tipo === 'producto');
    const tonos = carrito.filter(p => p.tipo === 'tono');

    // Productos simples
    for (const p of productos) {
      for (let i = 0; i < (p.cantidad || 1); i++) {
        const { data, error } = await supa.rpc('decrement_stock', { p_nombre: p.nombre_base });
        if (error) throw error;
        const nuevoStock = Number(data);
        if (nuevoStock < 0) throw new Error(`Sin stock para: ${p.nombre_base}`);
      }
    }

    // Tonos
    for (const t of tonos) {
      for (let i = 0; i < (t.cantidad || 1); i++) {
        const { data, error } = await supa.rpc('decrement_tono_stock', {
          p_producto_id: t.producto_id,
          p_tono: String(t.tono)
        });
        if (error) throw error;
        const nuevoStock = Number(data);
        if (nuevoStock < 0) throw new Error(`Sin stock para tono: ${t.nombre_base} (${t.tono})`);
      }
    }
  }

  async function procesarPagoYObtenerLink(preOpenedWindow) {
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

    // 1) Confirmar stock real
    setStatus('info', 'Confirmando stock...');
    await refrescarStockGlobal();
    await descontarStockRealEnDB();

    // 2) Crear pedido
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

    // 3) Subir comprobante
    setStatus('info', 'Subiendo comprobante...');
    const comprobante_path = await subirComprobantePDF(fileSeleccionado, pedidoActual.order_code);

    // 4) Link firmado + notificar
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

    // ✅ IMPORTANTE: ya se compró -> liberar reservas del carrito (para no trabar stock)
    try { await liberarReservas(); } catch (_) {}

    setStatus('ok', 'Listo ✅ Ahora se abre WhatsApp con tu orden y el link.');
    if (avisoAdjunto) avisoAdjunto.style.display = 'block';

    // Limpiar carrito local (opcional pero recomendado)
    carrito = [];
    renderCarrito();

    // refrescar stock visible
    refrescarStockGlobal();

    return { monto, order_code: pedidoActual.order_code, link: linkComprobante, preOpenedWindow };
  }

  if (btnEnviarWsp) {
    btnEnviarWsp.onclick = async () => {
      // ✅ abrir “ventana” dentro del click para que el celu no bloquee WhatsApp
      let preOpenedWindow = null;
      try {
        preOpenedWindow = window.open('about:blank', '_blank');
      } catch (_) {}

      try {
        const { monto, order_code, link } = await procesarPagoYObtenerLink(preOpenedWindow);

        setStatus(
          'ok',
          'Comprobante subido correctamente ✅ Ahora se abrirá WhatsApp. Adjuntá el PDF desde el clip 📎'
        );

        const msg = armarMensajeWhatsApp(order_code, monto, link);
        abrirWhatsAppSeguro(WSP_NUMERO, msg, preOpenedWindow);

      } catch (err) {
        console.error(err);

        try { if (preOpenedWindow && !preOpenedWindow.closed) preOpenedWindow.close(); } catch (_) {}

        setInputsLocked(false);
        if (btnEnviarWsp) {
          btnEnviarWsp.disabled = false;
          btnEnviarWsp.textContent = 'Enviar pedido por WhatsApp';
        }
        if (btnPague) {
          btnPague.disabled = false;
          btnPague.textContent = 'Ya realicé el pago';
        }
      }
    };
  }

  /* =========================
     ✅ ABANDONO / CIERRE / RECARGA
     Si se va sin pagar -> libera reservas y vuelve stock.
  ========================= */
  const liberarAlSalir = async () => {
    try {
      await liberarReservas();
    } catch (_) {}
  };

  // iOS/Android usan pagehide más que beforeunload
  window.addEventListener('pagehide', liberarAlSalir);
  window.addEventListener('beforeunload', liberarAlSalir);

});
