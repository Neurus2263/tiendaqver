document.addEventListener('DOMContentLoaded', () => {
  /* =========================
     CONFIG
  ========================= */
  const WSP_NUMERO = '5491127902076';

  // ✅ Supabase (CDN v2)
  const SUPABASE_URL = "https://dsspsxiactuskjmodety.supabase.co";
  const SUPABASE_ANON_KEY = "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6ImRzc3BzeGlhY3R1c2tqbW9kZXR5Iiwicm9sZSI6ImFub24iLCJpYXQiOjE3Njk5OTEyMTAsImV4cCI6MjA4NTU2NzIxMH0.OGaX04gxjDvM7O6HPOIeEQZlhErGSp58lYminEfPm_Y";

  const { createClient } = supabase;
  const supa = createClient(SUPABASE_URL, SUPABASE_ANON_KEY);

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
     STOCK GLOBAL (SUPABASE)
     - (productos sin tonos) se maneja en productos
     - (productos con tonos) se maneja en tonos
  ========================= */

  function normalizar(txt) {
    return (txt || '')
      .toLowerCase()
      .normalize('NFD').replace(/[\u0300-\u036f]/g, '')
      .replace(/\s+/g, ' ')
      .trim();
  }

  // Mapa: nombre_normalizado -> row {id,nombre,stock,precio}
  let productosDB = new Map();

  async function cargarProductosDB() {
    const { data, error } = await supa
      .from('productos')
      .select('id, nombre, stock, precio');

    if (error) {
      console.error(error);
      alert('No pude leer productos (Supabase). Revisá RLS/policies.');
      return;
    }

    productosDB.clear();
    data.forEach(row => {
      productosDB.set(normalizar(row.nombre), row);
    });
  }

  function pintarStockEnCards() {
    document.querySelectorAll('.producto').forEach(card => {
      const h3 = card.querySelector('h3');
      const stockEl = card.querySelector('.stock');
      const btn = card.querySelector('.btn-agregar');

      // Solo productos con botón "Agregar" (sin tonos)
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

  // ✅ click "Agregar" (productos sin tonos) descuenta stock en productos (tu RPC anterior)
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
        alert('Error descontando stock (productos). Revisá función/policies.');
        return;
      }

      const nuevoStock = Number(data);

      if (nuevoStock < 0) {
        alert('Sin stock');
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
     - lee tonos reales
     - muestra badge con stock
     - deshabilita agotados
     - al elegir un tono: descuenta global y agrega al carrito
  ========================= */

  let modalActual = null;
  let productoActual = null; // {id, nombre, precioBase}

  async function cargarTonosParaProducto(productoId) {
    const { data, error } = await supa
      .from('tonos')
      .select('tono, stock, precio')
      .eq('producto_id', productoId)
      .order('tono', { ascending: true });

    if (error) {
      console.error(error);
      alert('No pude leer tonos (Supabase). Revisá RLS/policies de tonos.');
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

      // crear badge si no existe
      let badge = btn.querySelector('.stock-mini');
      if (!badge) {
        badge = document.createElement('span');
        badge.className = 'stock-mini';
        btn.appendChild(badge);
      }

      // Si ese tono no existe en DB, lo dejamos deshabilitado
      if (!row) {
        badge.textContent = '—';
        btn.disabled = true;
        btn.classList.add('is-out');
        btn.title = 'Tono no cargado en Supabase';
        return;
      }

      const s = Number(row.stock ?? 0);
      const p = Number(row.precio ?? (productoActual?.precioBase ?? 0));

      btn.dataset.stock = String(s);
      btn.dataset.precio = String(p);

      // mostrar stock
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

  // Abrir modal y cargar tonos desde DB
  document.querySelectorAll('.btn-elegir-tono').forEach(btn => {
    btn.onclick = async () => {
      const card = btn.closest('.producto');
      const h3 = card?.querySelector('h3');
      if (!card || !h3) return;

      const nombreProducto = h3.textContent.trim();
      const row = productosDB.get(normalizar(nombreProducto));

      if (!row) {
        alert('Este producto no está en Supabase (tabla productos). Revisá el nombre.');
        return;
      }

      productoActual = { id: row.id, nombre: row.nombre, precioBase: Number(row.precio || 0) };

      const modal = document.getElementById(`modal-${btn.dataset.producto}`);
      if (!modal) return;

      modalActual = modal;

      modal.style.display = 'flex';
      document.body.classList.add('modal-abierto');

      const tonos = await cargarTonosParaProducto(productoActual.id);
      pintarTonosEnModal(modal, tonos);
    };
  });

  // Cerrar modales tonos
  document.querySelectorAll('.cerrar-tonos').forEach(btn => {
    btn.onclick = () => {
      const modal = btn.closest('.modal-tonos');
      if (modal) modal.style.display = 'none';
      document.body.classList.remove('modal-abierto');
      modalActual = null;
      productoActual = null;
    };
  });

  // Click en un tono: descontar stock global y agregar al carrito
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
        alert('Error descontando stock (tonos). Revisá función/policies.');
        return;
      }

      const nuevoStock = Number(data);

      if (nuevoStock < 0) {
        alert('Sin stock en ese tono');
        // badge a 0 por seguridad
        const badge = btnTono.querySelector('.stock-mini');
        if (badge) badge.textContent = '0';
        btnTono.classList.add('is-out');
        btnTono.title = 'Sin stock';
        return;
      }

      // agregar al carrito con ID único por tono
      const idCarrito = `${productoActual.id}:${tono}`;
      const nombreCarrito = `${productoActual.nombre} (Tono ${tono})`;

      agregarOIncrementar(idCarrito, nombreCarrito, precio);

      // actualizar botón + badge
      btnTono.dataset.stock = String(nuevoStock);

      const badge = btnTono.querySelector('.stock-mini');
      if (badge) badge.textContent = String(nuevoStock);

      if (nuevoStock <= 0) {
        btnTono.disabled = true;
        btnTono.classList.add('is-out');
        btnTono.title = 'Sin stock';
      } else {
        btnTono.disabled = false;
        btnTono.classList.remove('is-out');
        btnTono.title = `Stock: ${nuevoStock}`;
      }
    } finally {
      btnTono.dataset.loading = '0';
      btnTono.textContent = texto;
      // si quedó disabled por 0, no hace falta tocar
    }
  });

  /* =========================
     MERCADO PAGO (lo tuyo)
  ========================= */
  const btnMP = document.getElementById('btn-mp');
  const modalMP = document.getElementById('modal-mp');
  const cerrarMP = document.getElementById('cerrar-mp');

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
    };
  }
});
