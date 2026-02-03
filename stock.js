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
     RESERVAS (NUEVO)
  ========================= */
  const TTL_MIN = 10;

  function getSessionId() {
    let id = localStorage.getItem('qver_session_id');
    if (!id) {
      // crypto.randomUUID() existe en casi todos los navegadores modernos
      const uuid = (crypto && crypto.randomUUID) ? crypto.randomUUID() : String(Date.now()) + Math.random().toString(16).slice(2);
      id = 'sess_' + uuid;
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
    return Number(data); // devuelve "stock disponible" luego de reservar, o -1 si no hay
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

  async function liberarReservaItem(item) {
    // item = { tipo:'producto'|'tono', nombre_base, producto_id, tono, cantidad }
    const payload = {
      p_session_id: SESSION_ID,
      p_tipo: item.tipo,
      p_nombre: item.tipo === 'producto' ? item.nombre_base : null,
      p_producto_id: item.tipo === 'tono' ? item.producto_id : null,
      p_tono: item.tipo === 'tono' ? String(item.tono) : null,
      p_cantidad: Number(item.cantidad || 1)
    };

    const { error } = await supa.rpc('liberar_reserva_item', payload);
    if (error) console.error(error);
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
    if (existente) {
      existente.cantidad++;
    } else {
      carrito.push({ id, nombre, precio, cantidad: 1, ...meta });
    }
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
      btn.onclick = async () => {
        const i = Number(btn.dataset.index);
        const item = carrito[i];
        if (!item) return;

        // ✅ liberar reserva antes de borrar (devuelve stock)
        try {
          await liberarReservaItem(item);
        } catch (_) {}

        carrito.splice(i, 1);
        renderCarrito();

        // refrescamos UI
        refrescarStockGlobal();
      };
    });
  }

  function totalCarritoActual() {
    return carrito.reduce((acc, p) => acc + (p.precio * p.cantidad), 0);
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

      card.dataset.precio = String(row.precio);

      const s = Number(row.stock ?? 0);
      card.dataset.stock = String(s);
      if (stockEl) stockEl.textContent = String(s);

      if (btn) {
        if (s <= 0) {
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

  refrescarStockGlobal();

  document.addEventListener('visibilitychange', () => {
    if (document.visibilityState === 'visible') refrescarStockGlobal();
  });

  setInterval(refrescarStockGlobal, 25000);

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
     ✅ AGREGAR PRODUCTOS: AHORA RESERVA Y DESCUENTA EN UI
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
      // ✅ reserva real en DB
      const disponibleNuevo = await reservarProducto(nombre, 1);

      if (disponibleNuevo < 0) {
        if (stockEl) stockEl.textContent = '0';
        card.dataset.stock = '0';
        card.classList.add('sin-stock');
        btn.textContent = 'Sin stock';
        btn.disabled = true;
        return;
      }

      // ✅ agrega al carrito y guarda metadata para liberar después
      agregarOIncrementar(
        `prod:${normalizar(nombre)}`,
        nombre,
        precio,
        { tipo: 'producto', nombre_base: nombre }
      );

      // ✅ UI stock (lo que devuelve la RPC)
      card.dataset.stock = String(disponibleNuevo);
      if (stockEl) stockEl.textContent = String(disponibleNuevo);

      if (disponibleNuevo <= 0) {
        card.classList.add('sin-stock');
        btn.textContent = 'Sin stock';
        btn.disabled = true;
      } else {
        btn.textContent = 'Agregar';
        btn.disabled = false;
      }
    } catch (err) {
      console.error(err);
      setStatus('error', 'Error reservando stock.');
      btn.textContent = textoOriginal;
      btn.disabled = false;
    } finally {
      btn.dataset.loading = '0';
      if (!btn.disabled && btn.textContent === '...') btn.textContent = textoOriginal;
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

      const s = Number(row.stock ?? 0);
      const p = Number(row.precio ?? (productoActual?.precioBase ?? 0));

      btn.dataset.stock = String(s);
      btn.dataset.precio = String(p);
      badge.textContent = String(s);

      if (s <= 0) {
        btn.disabled = true;
        btn.classList.add('is-out');
        btn.title = 'Sin stock';
      } else {
        btn.disabled = false;
        btn.classList.remove('is-out');
        btn.title = `Stock: ${s}`;
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

  // ✅ click en tono: ahora reserva en DB y baja stock
  document.addEventListener('click', async (e) => {
    const btnTono = e.target.closest('.tono');
    if (!btnTono) return;

    const modal = btnTono.closest('.modal-tonos');
    if (!modal || !productoActual) return;

    const tono = String(btnTono.dataset.tono || '').trim();
    const precio = Number(btnTono.dataset.precio || productoActual.precioBase || 0);

    if (btnTono.dataset.loading === '1') return;
    btnTono.dataset.loading = '1';

    const texto = btnTono.textContent;
    btnTono.textContent = '...';
    btnTono.disabled = true;

    try {
      const disponibleNuevo = await reservarTono(productoActual.id, tono, 1);

      if (disponibleNuevo < 0) {
        setStatus('warn', 'Sin stock disponible en ese tono.');
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

      btnTono.dataset.stock = String(disponibleNuevo);
      const badge = btnTono.querySelector('.stock-mini');
      if (badge) badge.textContent = String(disponibleNuevo);

      if (disponibleNuevo <= 0) {
        btnTono.disabled = true;
        btnTono.classList.add('is-out');
      } else {
        btnTono.disabled = false;
        btnTono.classList.remove('is-out');
      }
    } catch (err) {
      console.error(err);
      setStatus('error', 'Error reservando stock del tono.');
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
    };
  }

  if (cerrarMP && modalMP) {
    cerrarMP.onclick = () => {
      modalMP.style.display = 'none';
      document.body.classList.remove('modal-abierto');
    };
  }

  /* =========================
     COMPROBANTE + WHATSAPP + LINK
     (tu flujo original, sin tocar)
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
✅ Orden: ${orderCode}
💰 Monto pagado: $${monto}

📎 Comprobante (link): ${link}

Detalle:
${detalle}
`);
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

    if (btnEnviarWsp) {
      btnEnviarWsp.disabled = true;
      btnEnviarWsp.textContent = 'Procesando...';
    }
    if (btnPague) {
      btnPague.disabled = true;
      btnPague.textContent = 'Procesando...';
    }
    setInputsLocked(true);

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

    return { monto, order_code: pedidoActual.order_code, link: linkComprobante, preOpenedWindow };
  }

  if (btnEnviarWsp) {
    btnEnviarWsp.onclick = async () => {
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

        // ✅ IMPORTANTE: NO liberamos reservas porque ya está en proceso de pago/pedido
        // (si querés liberar al finalizar, se hace del lado admin cuando procesás la orden)
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
     KEEPALIVE + LIBERACION
  ========================= */

  // mantiene viva la reserva mientras haya carrito
  setInterval(() => {
    if (carrito && carrito.length) extenderReservas();
  }, 40000);

  // best effort: si cierra pestaña, intenta liberar todo
  window.addEventListener('beforeunload', () => {
    liberarReservas();
  });

  // si el usuario vacía el carrito (por ejemplo borrando todo) no hace falta extra.
  // igual: si se va sin pagar, expira por TTL y vuelve solo.

  /* =========================
   LIBERAR STOCK SI ABANDONA
   (cierra pestaña / recarga / se va)
========================= */
window.addEventListener('beforeunload', () => {
  try {
    if (!carrito || carrito.length === 0) return;

    carrito.forEach(item => {
      if (item.tipo === 'producto') {
        supa.rpc('liberar_reserva_item', {
          p_session_id: SESSION_ID,
          p_tipo: 'producto',
          p_nombre: item.nombre_base,
          p_cantidad: item.cantidad
        });
      }

      if (item.tipo === 'tono') {
        supa.rpc('liberar_reserva_item', {
          p_session_id: SESSION_ID,
          p_tipo: 'tono',
          p_producto_id: item.producto_id,
          p_tono: String(item.tono),
          p_cantidad: item.cantidad
        });
      }
    });
  } catch (e) {
    console.warn('Liberación de stock al salir', e);
  }
});


});
