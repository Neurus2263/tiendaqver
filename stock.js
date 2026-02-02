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
     - Esto funciona aunque falle todo lo demás.
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
     A PARTIR DE ACÁ: TODO TU SISTEMA
     (se protege para que no mate el botón)
  ========================= */
  let supa = null;

  try {
    if (!window.supabase || !window.supabase.createClient) {
      // Si Supabase no carga, igual dejamos el botón funcionando.
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

  function totalCarritoActual() {
    return carrito.reduce((acc, p) => acc + (p.precio * p.cantidad), 0);
  }

  /* =========================
     STOCK GLOBAL (SUPABASE)
  ========================= */
  let productosDB = new Map();

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

      const s = Number(row.stock ?? 0);
      card.dataset.stock = String(s);
      if (stockEl) stockEl.textContent = String(s);

      if (s <= 0) {
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
      const { data, error } = await supa.rpc('decrement_stock', { p_nombre: nombre });
      if (error) {
        console.error(error);
        return;
      }

      const nuevoStock = Number(data);

      if (nuevoStock < 0) {
        if (stockEl) stockEl.textContent = '0';
        card.dataset.stock = '0';
        card.classList.add('sin-stock');
        btn.textContent = 'Sin stock';
        btn.disabled = true;
        return;
      }

      agregarOIncrementar(nombre, nombre, precio);

      card.dataset.stock = String(nuevoStock);
      if (stockEl) stockEl.textContent = String(nuevoStock);

      if (nuevoStock <= 0) {
        card.classList.add('sin-stock');
        btn.textContent = 'Sin stock';
        btn.disabled = true;
      } else {
        btn.textContent = 'Agregar';
        btn.disabled = false;
      }
    } finally {
      btn.dataset.loading = '0';
      if (!btn.disabled) btn.textContent = textoOriginal === 'Agregar' ? 'Agregar' : textoOriginal;
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
      const { data, error } = await supa.rpc('decrement_tono_stock', {
        p_producto_id: productoActual.id,
        p_tono: tono
      });

      if (error) {
        console.error(error);
        return;
      }

      const nuevoStock = Number(data);
      if (nuevoStock < 0) return;

      const idCarrito = `${productoActual.id}:${tono}`;
      const nombreCarrito = `${productoActual.nombre} (Tono ${tono})`;
      agregarOIncrementar(idCarrito, nombreCarrito, precio);

      btnTono.dataset.stock = String(nuevoStock);
      const badge = btnTono.querySelector('.stock-mini');
      if (badge) badge.textContent = String(nuevoStock);

      if (nuevoStock <= 0) {
        btnTono.disabled = true;
        btnTono.classList.add('is-out');
      } else {
        btnTono.disabled = false;
        btnTono.classList.remove('is-out');
      }
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
     COMPROBANTE + WHATSAPP + EMAIL
  ========================= */
  const inputComprobante = document.getElementById('input-comprobante');
  const montoConfirmado = document.getElementById('monto-confirmado');
  const btnEnviarWsp = document.getElementById('btn-enviar-wsp');
  const avisoAdjunto = document.getElementById('aviso-adjunto');
  const btnPague = document.getElementById('btn-pague');

  let pedidoActual = null;   // {id, order_code}
  let linkComprobante = null;

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
    return data; // { signed_url }
  }

  function armarMensajeWhatsApp(orderCode, monto, link) {
    const detalle = carrito.map(p => `- ${p.nombre} x${p.cantidad} = $${p.precio * p.cantidad}`).join('\n');
    return (
`Hola! Ya realicé el pago.
🧾 Orden: ${orderCode}
💰 Monto: $${monto}

📎 Comprobante: ${link}

Detalle:
${detalle}
`);
  }

  if (inputComprobante) {
    inputComprobante.addEventListener('change', async () => {
      try {
        pedidoActual = null;
        linkComprobante = null;

        const file = inputComprobante.files?.[0];
        if (!file) return;

        if (file.type !== 'application/pdf') {
          setStatus('error', 'Solo se permite PDF.');
          inputComprobante.value = '';
          return;
        }

        const maxMB = 5;
        if (file.size > maxMB * 1024 * 1024) {
          setStatus('error', `El PDF no puede pesar más de ${maxMB}MB.`);
          inputComprobante.value = '';
          return;
        }

        const monto = Number(montoConfirmado?.value || 0);
        if (!monto || monto <= 0) {
          setStatus('error', 'Ingresá el monto exacto que pagaste.');
          return;
        }

        if (!carrito.length) {
          setStatus('error', 'Tu carrito está vacío.');
          return;
        }

        setInputsLocked(true);
        if (btnPague) {
          btnPague.disabled = true;
          btnPague.textContent = 'Procesando...';
        }

        setStatus('info', 'Subiendo comprobante...');

        const order_code = generarOrderCode();
        pedidoActual = await crearPedido({
          order_code,
          items: carrito,
          total: totalCarritoActual(),
          monto_pagado: monto,
          canal: 'mercadopago'
        });

        showOrderCode(pedidoActual.order_code);

        const comprobante_path = await subirComprobantePDF(file, pedidoActual.order_code);

        setStatus('info', 'Generando link y notificando...');

        const resp = await notificarPagoBackend({
          pedido_id: pedidoActual.id,
          order_code: pedidoActual.order_code,
          comprobante_path,
          monto_pagado: monto
        });

        linkComprobante = resp?.signed_url;

        if (!linkComprobante) {
          setStatus('error', 'Subió el comprobante pero no recibí el link. Revisá la Edge Function.');
          setInputsLocked(false);
          return;
        }

        if (btnEnviarWsp) {
          btnEnviarWsp.style.display = 'block';
          btnEnviarWsp.textContent = 'Enviar pedido por WhatsApp';
        }
        if (avisoAdjunto) avisoAdjunto.style.display = 'block';

        setStatus('ok', 'Comprobante cargado. Ahora podés enviar el pedido por WhatsApp.');

        // Bloqueo final para evitar duplicados
        setInputsLocked(true);

      } catch (err) {
        console.error(err);
        setStatus('error', 'Error subiendo/notificando el comprobante. Revisá consola y policies.');
        setInputsLocked(false);
      } finally {
        if (btnPague) {
          btnPague.disabled = false;
          btnPague.textContent = 'Ya realicé el pago';
        }
      }
    });
  }

  if (btnEnviarWsp) {
    btnEnviarWsp.onclick = () => {
      const monto = Number(montoConfirmado?.value || 0);
      if (!pedidoActual || !linkComprobante) {
        setStatus('warn', 'Primero subí el comprobante.');
        return;
      }
      const msg = armarMensajeWhatsApp(pedidoActual.order_code, monto, linkComprobante);
      abrirWhatsApp(WSP_NUMERO, msg);
    };
  }
});
