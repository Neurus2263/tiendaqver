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
     - carga stock real
     - descuenta global al "Agregar"
  ========================= */

  function normalizar(txt) {
    return (txt || '')
      .toLowerCase()
      .normalize('NFD').replace(/[\u0300-\u036f]/g, '') // saca acentos
      .replace(/\s+/g, ' ')
      .trim();
  }

  // Mapa: nombre_normalizado -> row
  let productosDB = new Map();

  async function cargarProductosDB() {
    const { data, error } = await supa
      .from('productos')
      .select('id, nombre, stock, precio');

    if (error) {
      console.error(error);
      alert('No pude leer stock (Supabase). Revisá RLS/policies.');
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

      // Si no está en la DB, no tocamos nada (queda como estaba)
      if (!row) return;

      // Precio: si querés, lo sincronizamos también
      card.dataset.precio = String(row.precio);

      // Stock visible
      const s = Number(row.stock ?? 0);
      card.dataset.stock = String(s);
      if (stockEl) stockEl.textContent = String(s);

      // Estado botón
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

  // ✅ cargar stock al entrar
  refrescarStockGlobal();

  // ✅ click "Agregar" con descuento global real
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

    // Evitar doble click mientras procesa
    if (btn.dataset.loading === '1') return;
    btn.dataset.loading = '1';
    const textoOriginal = btn.textContent;
    btn.textContent = '...';
    btn.disabled = true;

    try {
      const { data, error } = await supa.rpc('decrement_stock', { p_nombre: nombre });

      if (error) {
        console.error(error);
        alert('Error descontando stock. Revisá la función/policies.');
        return;
      }

      // data = nuevo stock o -1 si no hay
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

      // ✅ ya descontó global -> recién ahora lo agregamos al carrito
      agregarOIncrementar(nombre, nombre, precio);

      // pintar nuevo stock
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
      // si quedó sin stock ya seteamos texto, si no, restauramos
      if (!btn.disabled) btn.textContent = textoOriginal === 'Agregar' ? 'Agregar' : textoOriginal;
    }
  });

  /* =========================
     MODALES TONOS (lo tuyo)
  ========================= */
  document.querySelectorAll('.btn-elegir-tono').forEach(btn => {
    btn.onclick = () => {
      const modal = document.getElementById(`modal-${btn.dataset.producto}`);
      if (!modal) return;
      modal.style.display = 'flex';
      document.body.classList.add('modal-abierto');
    };
  });

  document.querySelectorAll('.cerrar-tonos').forEach(btn => {
    btn.onclick = () => {
      const modal = btn.closest('.modal-tonos');
      if (modal) modal.style.display = 'none';
      document.body.classList.remove('modal-abierto');
    };
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
