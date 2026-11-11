'use strict';

/* =========================================================
   ໜ້າແອັດມິນ: login, dashboard, ອໍເດີ້, ສິນຄ້າ, ຕັ້ງຄ່າ
   ========================================================= */

const adminState = {
  tab: 'dashboard',
  orders: [],
  products: [],
  settings: null,
  stats: null,
  statuses: [],
  categories: [],
  orderFilter: 'all',
  orderQuery: '',
  productQuery: '',
  qrImage: ''
};

const A = (id) => document.getElementById(id);

function shortMoney(value) {
  const n = Number(value) || 0;
  if (n >= 1e9) return `${(n / 1e9).toFixed(1)}B`;
  if (n >= 1e6) return `${(n / 1e6).toFixed(n >= 1e7 ? 0 : 1)}M`;
  if (n >= 1e3) return `${Math.round(n / 1e3)}K`;
  return String(n);
}

function statusInfo(id) {
  return adminState.statuses.find((s) => s.id === id) || { id, label: id, color: 'gray' };
}

function statusPill(order) {
  return `<span class="status-pill status-${escapeHtml(order.statusColor || 'gray')}">${escapeHtml(order.statusLabel || statusInfo(order.status).label)}</span>`;
}

function handleError(err, fallback = 'ເກີດຂໍ້ຜິດພາດ') {
  if (err && err.status === 401) {
    localStorage.removeItem(ADMIN_TOKEN_KEY);
    closeModal();
    showLogin();
    toast('ໝົດເວລາເຂົ້າສູ່ລະບົບ — ກະລຸນາເຂົ້າໃໝ່', 'warning');
    return;
  }
  toast((err && err.message) || fallback, 'error');
}

/* ---------------- auth ---------------- */

function showLogin() {
  A('login-view').hidden = false;
  A('app-view').hidden = true;
  A('login-password').value = '';
}

async function showApp() {
  A('login-view').hidden = true;
  A('app-view').hidden = false;
  await loadAll();
}

async function doLogin(event) {
  event.preventDefault();
  const btn = A('login-submit');
  const errorHost = A('login-error');
  errorHost.innerHTML = '';

  btn.disabled = true;
  btn.innerHTML = '<span class="spinner"></span> ກຳລັງເຂົ້າ...';

  try {
    const data = await ShopAPI.post('/api/admin/login', {
      username: A('login-username').value.trim(),
      password: A('login-password').value
    });
    localStorage.setItem(ADMIN_TOKEN_KEY, data.token);
    A('login-password').value = '';
    toast('ຍິນດີຕ້ອນຮັບເຂົ້າສູ່ລະບົບ', 'success');
    await showApp();
  } catch (err) {
    errorHost.innerHTML = `<div class="notice notice-red">${escapeHtml(err.message)}</div>`;
  } finally {
    btn.disabled = false;
    btn.innerHTML = '🔐 ເຂົ້າສູ່ລະບົບ';
  }
}

async function doLogout() {
  try { await ShopAPI.post('/api/admin/logout'); } catch { /* ignore */ }
  localStorage.removeItem(ADMIN_TOKEN_KEY);
  showLogin();
  toast('ອອກຈາກລະບົບແລ້ວ', 'info');
}

/* ---------------- ໂຫຼດຂໍ້ມູນ ---------------- */

async function loadAll() {
  try {
    const [stats, ordersRes, productsRes, settingsRes, meta] = await Promise.all([
      ShopAPI.get('/api/admin/stats'),
      ShopAPI.get('/api/admin/orders'),
      ShopAPI.get('/api/admin/products'),
      ShopAPI.get('/api/admin/settings'),
      ShopAPI.get('/api/meta')
    ]);

    adminState.stats = stats;
    adminState.orders = ordersRes.orders || [];
    adminState.products = productsRes.products || [];
    adminState.categories = productsRes.categories || [];
    adminState.settings = settingsRes.settings;
    adminState.statuses = meta.statuses || [];
    adminState.qrImage = adminState.settings.qrImage || '/img/seed/bank-qr.svg';

    renderAll();
  } catch (err) {
    handleError(err, 'ໂຫຼດຂໍ້ມູນບໍ່ສຳເລັດ');
  }
}

function renderAll() {
  renderDashboard();
  renderOrderFilters();
  renderOrders();
  renderProducts();
  renderSettings();

  const name = adminState.settings && adminState.settings.shopName;
  document.querySelectorAll('[data-shop-name]').forEach((el) => {
    if (name) el.textContent = name;
  });
}

/* ---------------- Dashboard ---------------- */

function renderDashboard() {
  const stats = adminState.stats;
  if (!stats) return;
  const t = stats.totals;

  A('dashboard-stats').innerHTML = `
    <div class="stat-card">
      <div class="stat-icon green">💰</div>
      <div>
        <div class="stat-label">ຍອດຂາຍລວມ</div>
        <div class="stat-value">${formatKip(t.revenue)}</div>
        <div class="stat-hint">${t.orders} ອໍເດີ້ · ສົ່ງສຳເລັດ <strong>${formatKip(t.deliveredRevenue)}</strong></div>
      </div>
    </div>
    <div class="stat-card" style="border-top-color:#2563eb">
      <div class="stat-icon blue">📅</div>
      <div>
        <div class="stat-label">ອໍເດີ້ມື້ນີ້</div>
        <div class="stat-value">${t.todayOrders} ອໍເດີ້</div>
        <div class="stat-hint">ຍອດຂາຍມື້ນີ້ <strong>${formatKip(t.todayRevenue)}</strong></div>
      </div>
    </div>
    <div class="stat-card" style="border-top-color:#facc15">
      <div class="stat-icon yellow">🚚</div>
      <div>
        <div class="stat-label">ລໍຖ້າດຳເນີນການ</div>
        <div class="stat-value">${t.preparing + t.shipping} ອໍເດີ້</div>
        <div class="stat-hint">ກຽມເຄື່ອງ ${t.preparing} · ກຳລັງສົ່ງ ${t.shipping}</div>
      </div>
    </div>
    <div class="stat-card" style="border-top-color:#dc2626">
      <div class="stat-icon red">📦</div>
      <div>
        <div class="stat-label">ສິນຄ້າ</div>
        <div class="stat-value">${t.products} ລາຍການ</div>
        <div class="stat-hint">ສະຕັອກໜ້ອຍ <strong>${t.lowStock}</strong> ລາຍການ</div>
      </div>
    </div>
  `;

  // ກຣາຟ 7 ວັນ
  const days = stats.last7 || [];
  const max = Math.max(...days.map((d) => d.total), 1);
  A('sales-chart').innerHTML = `
    <div class="bar-chart">
      ${days.map((d) => `
        <div class="bar-col" title="${d.orders} ອໍເດີ້ · ${formatKip(d.total)}">
          <div class="bar-value">${d.total ? shortMoney(d.total) : ''}</div>
          <div class="bar-track">
            <div class="bar" style="height:${Math.max(3, Math.round((d.total / max) * 100))}%"></div>
          </div>
          <div class="bar-label">${escapeHtml(d.label)}</div>
        </div>`).join('')}
    </div>
    <div class="muted" style="font-size:12px;margin-top:10px;text-align:center">ລວມ 7 ວັນ: ${formatKip(days.reduce((s, d) => s + d.total, 0))}</div>
  `;

  // ສະຕັອກໜ້ອຍ
  const low = stats.lowStockProducts || [];
  A('low-stock-list').innerHTML = low.length
    ? `<div class="stock-list">${low.map((p) => `
        <div class="stock-row">
          <img src="${escapeHtml(mediaUrl(p.image))}" alt="">
          <div class="info">
            <strong>${escapeHtml(p.name)}</strong>
            <span>${escapeHtml(p.category || '')} · ເຫຼືອ ${p.stock} ຊິ້ນ</span>
          </div>
          <span class="badge ${p.stock <= 0 ? 'badge-red' : 'badge-yellow'}">${p.stock <= 0 ? 'ໝົດ' : 'ໃກ້ໝົດ'}</span>
          <button type="button" class="btn btn-blue btn-sm" data-edit-product="${escapeHtml(p.id)}">ແກ້ໄຂ</button>
        </div>`).join('')}</div>`
    : '<div class="empty-row" style="padding:26px"><div class="icon">✅</div><h3>ສະຕັອກພຽງພໍ</h3><p>ບໍ່ມີສິນຄ້າໃກ້ໝົດ</p></div>';

  // ອໍເດີ້ຫຼ້າສຸດ
  const recent = stats.recentOrders || [];
  A('recent-orders').innerHTML = recent.length
    ? `<table class="data-table" style="min-width:620px">
        <thead><tr><th>ລະຫັດ</th><th>ລູກຄ້າ</th><th>ຍອດ</th><th>ສະຖານະ</th><th>ວັນທີ</th><th></th></tr></thead>
        <tbody>
          ${recent.map((o) => `
            <tr>
              <td class="nowrap"><strong>${escapeHtml(o.code)}</strong></td>
              <td>${escapeHtml(o.customer.name)}<div class="sub">${escapeHtml(o.customer.phone)}</div></td>
              <td class="money">${formatKip(o.total)}</td>
              <td>${statusPill(o)}</td>
              <td class="nowrap sub">${formatDate(o.createdAt)}</td>
              <td class="table-actions"><button type="button" class="btn btn-blue" data-order-id="${escapeHtml(o.id)}">ເບິ່ງ</button></td>
            </tr>`).join('')}
        </tbody>
      </table>`
    : '<div class="empty-row"><div class="icon">🧾</div><h3>ຍັງບໍ່ມີອໍເດີ້</h3><p>ອໍເດີ້ຈາກລູກຄ້າຈະສະແດງຢູ່ນີ້</p></div>';
}

/* ---------------- ອໍເດີ້ ---------------- */

function renderOrderFilters() {
  const host = A('order-filters');
  const total = adminState.orders.length;
  const items = [{ id: 'all', label: 'ທັງໝົດ', count: total }];

  for (const s of adminState.statuses) {
    items.push({
      id: s.id,
      label: s.label,
      count: adminState.orders.filter((o) => o.status === s.id).length
    });
  }

  host.innerHTML = items.map((item) => `
    <button type="button" class="chip ${adminState.orderFilter === item.id ? 'active' : ''}" data-status="${escapeHtml(item.id)}">
      ${escapeHtml(item.label)} (${item.count})
    </button>`).join('');
}

function filteredOrders() {
  let list = [...adminState.orders];
  if (adminState.orderFilter !== 'all') {
    list = list.filter((o) => o.status === adminState.orderFilter);
  }
  const q = adminState.orderQuery.trim().toLowerCase();
  if (q) {
    const qDigits = q.replace(/\D/g, '');
    list = list.filter((o) => {
      const phone = String(o.customer.phone || '').replace(/\D/g, '');
      return (
        o.code.toLowerCase().includes(q) ||
        String(o.customer.name || '').toLowerCase().includes(q) ||
        (qDigits && phone.includes(qDigits))
      );
    });
  }
  return list;
}

function renderOrders() {
  const host = A('orders-table');
  const list = filteredOrders();

  if (!list.length) {
    host.innerHTML = `
      <div class="empty-row">
        <div class="icon">🧾</div>
        <h3>ບໍ່ພົບອໍເດີ້</h3>
        <p>${adminState.orders.length ? 'ລອງປ່ຽນຕົວກອງ ຫຼື ຄຳຄົ້ນຫາ' : 'ຍັງບໍ່ມີອໍເດີ້ໃນລະບົບ'}</p>
      </div>`;
    return;
  }

  host.innerHTML = `
    <table class="data-table">
      <thead>
        <tr>
          <th>ລະຫັດ / ວັນທີ</th>
          <th>ລູກຄ້າ</th>
          <th>ສິນຄ້າ</th>
          <th>ຍອດລວມ</th>
          <th>ຈ່າຍ</th>
          <th>ສະຖານະ</th>
          <th></th>
        </tr>
      </thead>
      <tbody>
        ${list.map((o) => {
          const count = o.items.reduce((s, i) => s + i.qty, 0);
          const first = o.items[0] ? o.items[0].name : '';
          return `
            <tr>
              <td class="nowrap">
                <strong>${escapeHtml(o.code)}</strong>
                <div class="sub">${formatDate(o.createdAt)}</div>
              </td>
              <td>
                ${escapeHtml(o.customer.name)}
                <div class="sub">${escapeHtml(o.customer.phone)}</div>
              </td>
              <td>
                ${count} ຊິ້ນ
                <div class="sub">${escapeHtml(first)}${o.items.length > 1 ? ` +${o.items.length - 1}` : ''}</div>
              </td>
              <td class="money">${formatKip(o.total)}</td>
              <td><span class="badge ${o.payment.method === 'bank' ? 'badge-blue' : 'badge-orange'}">${o.payment.method === 'bank' ? 'QR' : 'COD'}</span></td>
              <td>${statusPill(o)}</td>
              <td class="table-actions">
                <button type="button" class="btn btn-blue" data-order-id="${escapeHtml(o.id)}">ເບິ່ງ</button>
              </td>
            </tr>`;
        }).join('')}
      </tbody>
    </table>
  `;
}

async function openOrderModal(id) {
  try {
    const { order } = await ShopAPI.get(`/api/admin/orders/${encodeURIComponent(id)}`);
    const count = order.items.reduce((s, i) => s + i.qty, 0);
    const history = (order.history || [])
      .slice()
      .reverse()
      .map((h) => `<div class="history-line"><strong>${escapeHtml(statusInfo(h.status).label)}</strong><span>${formatDate(h.at)}</span></div>`)
      .join('');

    const statusOptions = adminState.statuses
      .map((s) => `<option value="${escapeHtml(s.id)}" ${s.id === order.status ? 'selected' : ''}>${escapeHtml(s.label)}</option>`)
      .join('');

    openModal(`
      <div class="modal-head">
        <div>
          <h2>ອໍເດີ້ ${escapeHtml(order.code)}</h2>
          <div class="sub">ສັ່ງເມື່ອ ${formatDate(order.createdAt)}</div>
        </div>
        <div style="display:flex;gap:8px;align-items:center">
          ${statusPill(order)}
          <button type="button" class="modal-close" data-close-modal aria-label="ປິດ">✕</button>
        </div>
      </div>

      <div class="modal-body">
        <div class="order-grid">
          <div>
            <div class="order-section">
              <h3>👤 ຂໍ້ມູນລູກຄ້າ</h3>
              <dl class="kv">
                <dt>ຊື່</dt><dd>${escapeHtml(order.customer.name)}</dd>
                <dt>ເບີໂທ</dt><dd><a href="tel:${escapeHtml(order.customer.phone)}">${escapeHtml(order.customer.phone)}</a></dd>
                <dt>ທີ່ຢູ່</dt><dd>${escapeHtml(order.customer.address)}</dd>
                ${order.note ? `<dt>ໝາຍເຫດ</dt><dd>${escapeHtml(order.note)}</dd>` : ''}
              </dl>
            </div>

            <div class="order-section">
              <h3>💳 ການຈ່າຍເງິນ</h3>
              <dl class="kv">
                <dt>ວິທີ</dt><dd>${escapeHtml(order.paymentLabel)}</dd>
                <dt>ສະຖານະ</dt><dd>${order.payment.method === 'bank' ? 'ລໍຖ້າກວດສອບສະລິບ' : 'ເກັບເງິນປາຍທາງ'}</dd>
              </dl>
              ${order.payment.slip
                ? `<img class="slip-thumb" data-zoom src="${escapeHtml(mediaUrl(order.payment.slip))}" alt="ສະລິບການໂອນເງິນ">`
                : ''}
            </div>

            <div class="order-section">
              <h3>🕘 ປະຫວັດສະຖານະ</h3>
              ${history || '<div class="muted" style="font-size:13px">—</div>'}
            </div>
          </div>

          <div>
            <div class="order-section">
              <h3>🛒 ລາຍການສິນຄ້າ (${count} ຊິ້ນ)</h3>
              <div>
                ${order.items.map((i) => `
                  <div class="mini-item">
                    <img src="${escapeHtml(mediaUrl(i.image || '/img/seed/placeholder.svg'))}" alt="">
                    <div class="name">${escapeHtml(i.name)}<div class="qty">× ${i.qty} · ${formatKip(i.price)}</div></div>
                    <div class="line">${formatKip(i.lineTotal)}</div>
                  </div>`).join('')}
              </div>
              <div class="order-total-box">
                <div class="summary-row" style="padding:4px 0"><span>ລວມສິນຄ້າ</span><span>${formatKip(order.subtotal)}</span></div>
                <div class="summary-row" style="padding:4px 0"><span>ຄ່າຈັດສົ່ງ</span><span>${formatKip(order.deliveryFee)}</span></div>
                <div class="summary-total" style="font-size:18px;margin-top:6px;padding-top:10px"><span>ຍອດລວມ</span><span class="amount">${formatKip(order.total)}</span></div>
              </div>
            </div>

            <div class="order-section">
              <h3>🔁 ປ່ຽນສະຖານະອໍເດີ້</h3>
              <div class="form-field">
                <label for="order-status-select">ສະຖານະໃໝ່</label>
                <select id="order-status-select" class="input">${statusOptions}</select>
              </div>
              <div class="order-actions">
                <button type="button" class="btn btn-blue" id="save-order-status">💾 ອັບເດດສະຖານະ</button>
                ${order.status !== 'cancelled'
                  ? '<button type="button" class="btn btn-red" id="cancel-order-btn">ຍົກເລີກອໍເດີ້</button>'
                  : ''}
              </div>
              <div class="form-hint" style="margin-top:8px">ການຍົກເລີກຈະຄືນສະຕັອກສິນຄ້າໃຫ້ອັດຕະໂນມັດ</div>
            </div>
          </div>
        </div>

        <div class="order-section" style="margin-top:20px">
          <h3>📍 ແຜນທີ່ຈັດສົ່ງ</h3>
          ${order.location
            ? `<div id="order-map" style="height:290px;border-radius:14px;overflow:hidden;border:1px solid #e5e7eb"></div>
               <div class="map-coords">
                 <span>ພິກັດ: ${order.location.lat.toFixed(6)}, ${order.location.lng.toFixed(6)}</span>
                 <a href="https://www.openstreetmap.org/?mlat=${order.location.lat}&mlon=${order.location.lng}#map=17/${order.location.lat}/${order.location.lng}" target="_blank" rel="noopener">ເປີດໃນ OpenStreetMap ↗</a>
               </div>`
            : '<div class="notice notice-yellow" style="margin:0">ລູກຄ້າບໍ່ໄດ້ປັກໝຸດ GPS — ຈັດສົ່ງຕາມທີ່ຢູ່ທີ່ລູກຄ້າປ້ອນໄວ້</div>'}
        </div>
      </div>
    `, { wide: true });

    initOrderMap(order);

    A('save-order-status').onclick = () => {
      const status = A('order-status-select').value;
      updateOrderStatus(order.id, status);
    };

    if (A('cancel-order-btn')) {
      A('cancel-order-btn').onclick = () => {
        if (!window.confirm(`ຕ້ອງການຍົກເລີກອໍເດີ້ ${order.code} ບໍ? ສະຕັອກຈະຖືກຄືນ.`)) return;
        updateOrderStatus(order.id, 'cancelled');
      };
    }
  } catch (err) {
    handleError(err, 'ໂຫຼດອໍເດີ້ບໍ່ໄດ້');
  }
}

function initOrderMap(order) {
  if (!order.location || !window.L) return;
  const host = A('order-map');
  if (!host) return;

  const map = L.map(host).setView([order.location.lat, order.location.lng], 16);
  L.tileLayer('https://server.arcgisonline.com/ArcGIS/rest/services/World_Street_Map/MapServer/tile/{z}/{y}/{x}', {
    maxZoom: 19,
    attribution: 'Tiles &copy; Esri &mdash; Esri, DeLorme, NAVTEQ'
  }).addTo(map);
  L.marker([order.location.lat, order.location.lng]).addTo(map);
  setTimeout(() => map.invalidateSize(), 220);
}

async function updateOrderStatus(id, status) {
  const btn = A('save-order-status');
  if (btn) { btn.disabled = true; btn.innerHTML = '<span class="spinner"></span> ກຳລັງອັບເດດ...'; }

  try {
    const data = await ShopAPI.patch(`/api/admin/orders/${encodeURIComponent(id)}/status`, { status });
    toast(`ອັບເດດສະຖານະເປັນ "${data.order.statusLabel}" ແລ້ວ`, 'success');
    closeModal();
    await loadAll();
  } catch (err) {
    handleError(err, 'ອັບເດດສະຖານະບໍ່ສຳເລັດ');
    if (btn) { btn.disabled = false; btn.textContent = '💾 ອັບເດດສະຖານະ'; }
  }
}

/* ---------------- ສິນຄ້າ ---------------- */

function renderProducts() {
  const host = A('products-table');
  const q = adminState.productQuery.trim().toLowerCase();
  let list = [...adminState.products];
  if (q) {
    list = list.filter(
      (p) => String(p.name).toLowerCase().includes(q) || String(p.category || '').toLowerCase().includes(q)
    );
  }

  const countEl = A('product-count');
  if (countEl) countEl.textContent = `ທັງໝົດ ${adminState.products.length} ລາຍການ · ສະແດງ ${list.length}`;

  if (!list.length) {
    host.innerHTML = `
      <div class="empty-row">
        <div class="icon">📦</div>
        <h3>ຍັງບໍ່ມີສິນຄ້າ</h3>
        <p>ກົດ "ເພີ່ມສິນຄ້າ" ເພື່ອເລີ່ມຂາຍ</p>
      </div>`;
    return;
  }

  host.innerHTML = `
    <table class="data-table">
      <thead>
        <tr>
          <th>ຮູບ</th>
          <th>ຊື່ສິນຄ້າ</th>
          <th>ລາຄາ</th>
          <th>ສະຕັອກ</th>
          <th>ສະຖານະ</th>
          <th></th>
        </tr>
      </thead>
      <tbody>
        ${list.map((p) => {
          const badge = p.stock <= 0 ? 'badge-red' : p.stock <= (adminState.settings.lowStockThreshold || 10) ? 'badge-yellow' : 'badge-green';
          return `
            <tr style="${p.active === false ? 'opacity:.55' : ''}">
              <td><img class="thumb" src="${escapeHtml(mediaUrl(p.image))}" alt=""></td>
              <td class="name-cell">
                ${escapeHtml(p.name)}
                <div class="sub">${escapeHtml(p.category || 'ອື່ນໆ')}</div>
              </td>
              <td class="money">${formatKip(p.price)}</td>
              <td><span class="badge ${badge}">${p.stock} ຊິ້ນ</span></td>
              <td>${p.active === false ? '<span class="badge badge-gray">ປິດຂາຍ</span>' : '<span class="badge badge-green">ເປີດຂາຍ</span>'}</td>
              <td class="table-actions">
                <button type="button" class="btn btn-blue" data-edit-product="${escapeHtml(p.id)}">ແກ້ໄຂ</button>
                <button type="button" class="btn btn-red" data-delete-product="${escapeHtml(p.id)}">ລຶບ</button>
              </td>
            </tr>`;
        }).join('')}
      </tbody>
    </table>
  `;
}

function openProductModal(productId) {
  const product = productId ? adminState.products.find((p) => p.id === productId) : null;
  if (productId && !product) { toast('ບໍ່ພົບສິນຄ້າ', 'error'); return; }

  const isEdit = Boolean(product);
  const data = product || {
    name: '',
    category: '',
    price: '',
    stock: 0,
    description: '',
    image: '/img/seed/placeholder.svg'
  };

  openModal(`
    <div class="modal-head">
      <div>
        <h2>${isEdit ? 'ແກ້ໄຂສິນຄ້າ' : 'ເພີ່ມສິນຄ້າໃໝ່'}</h2>
        <div class="sub">${isEdit ? 'ປ່ຽນຂໍ້ມູນ ລາຄາ ຫຼື ສະຕັອກໄດ້' : 'ປ້ອນຂໍ້ມູນສິນຄ້າໃໝ່'}</div>
      </div>
      <button type="button" class="modal-close" data-close-modal aria-label="ປິດ">✕</button>
    </div>
    <div class="modal-body">
      <form id="product-form">
        <div class="modal-form-grid">
          <div class="form-field full">
            <label for="p-name">ຊື່ສິນຄ້າ <span class="req">*</span></label>
            <input id="p-name" type="text" maxlength="120" required>
          </div>

          <div class="form-field">
            <label for="p-category">ໝວດ</label>
            <input id="p-category" type="text" maxlength="60" list="category-list" placeholder="ເຊັ່ນ ເຄື່ອງດື່ມ">
            <datalist id="category-list">
              ${[...new Set([...adminState.categories, 'ເຄື່ອງດື່ມ', 'ອາຫານ', 'ຂອງໃຊ້', 'ຂອງຫວານ'])].map((c) => `<option value="${escapeHtml(c)}"></option>`).join('')}
            </datalist>
          </div>

          <div class="form-field">
            <label for="p-price">ລາຄາ (₭) <span class="req">*</span></label>
            <input id="p-price" type="number" min="0" step="1000" required>
          </div>

          <div class="form-field">
            <label for="p-stock">ຈຳນວນສະຕັອກ <span class="req">*</span></label>
            <input id="p-stock" type="number" min="0" step="1" required>
          </div>

          <div class="form-field">
            <label>ຮູບສິນຄ້າ</label>
            <div class="image-field">
              <img id="p-image-preview" src="${escapeHtml(mediaUrl(data.image))}" alt="ຮູບສິນຄ້າ">
              <div>
                <label class="btn btn-white btn-sm" for="p-image-input">📷 ອັບໂຫຼດຮູບ</label>
                <input id="p-image-input" type="file" accept="image/png,image/jpeg,image/webp,image/gif" hidden>
                <div class="form-hint" id="p-image-hint">JPG / PNG / WEBP ≤ 5MB</div>
              </div>
            </div>
          </div>

          <div class="form-field full">
            <label for="p-description">ລາຍລະອຽດ</label>
            <textarea id="p-description" rows="3" maxlength="1000" placeholder="ຄຸນສົມບັດ, ຂະໜາດ, ຂໍ້ມູນເພີ່ມເຕີມ..."></textarea>
          </div>
        </div>

        <div class="order-actions" style="justify-content:flex-end;margin-top:20px;padding-top:16px;border-top:1px solid #e5e7eb">
          <button type="button" class="btn btn-white" data-close-modal>ຍົກເລີກ</button>
          <button type="submit" class="btn btn-blue" id="p-submit">${isEdit ? '💾 ບັນທຶກ' : '＋ ເພີ່ມສິນຄ້າ'}</button>
        </div>
      </form>
    </div>
  `, { wide: true });

  A('p-name').value = data.name || '';
  A('p-category').value = data.category || '';
  A('p-price').value = data.price === 0 ? '0' : (data.price || '');
  A('p-stock').value = data.stock != null ? data.stock : 0;
  A('p-description').value = data.description || '';

  let imageUrl = data.image || '/img/seed/placeholder.svg';

  A('p-image-input').addEventListener('change', async (e) => {
    const file = e.target.files && e.target.files[0];
    if (!file) return;
    if (!file.type.startsWith('image/')) { toast('ກະລຸນາເລືອກໄຟລ໌ຮູບພາບ', 'error'); return; }
    if (file.size > 5 * 1024 * 1024) { toast('ຮູບໃຫຍ່ເກີນ 5MB', 'error'); return; }

    const hint = A('p-image-hint');
    hint.textContent = 'ກຳລັງອັບໂຫຼດ...';
    try {
      const res = await ShopAPI.upload('/api/admin/upload', file);
      imageUrl = res.url;
      A('p-image-preview').src = mediaUrl(res.url);
      hint.textContent = 'ອັບໂຫຼດຮູບສຳເລັດ ✓';
      toast('ອັບໂຫຼດຮູບສຳເລັດ', 'success');
    } catch (err) {
      hint.textContent = 'ອັບໂຫຼດບໍ່ສຳເລັດ';
      handleError(err, 'ອັບໂຫຼດຮູບບໍ່ສຳເລັດ');
    }
  });

  A('product-form').addEventListener('submit', async (e) => {
    e.preventDefault();
    const btn = A('p-submit');
    const payload = {
      name: A('p-name').value.trim(),
      category: A('p-category').value.trim(),
      price: Number(A('p-price').value),
      stock: Number(A('p-stock').value),
      description: A('p-description').value.trim(),
      image: imageUrl
    };

    if (payload.name.length < 2) { toast('ກະລຸນາປ້ອນຊື່ສິນຄ້າ', 'warning'); A('p-name').focus(); return; }
    if (!Number.isFinite(payload.price) || payload.price < 0) { toast('ລາຄາບໍ່ຖືກຕ້ອງ', 'warning'); A('p-price').focus(); return; }
    if (!Number.isInteger(payload.stock) || payload.stock < 0) { toast('ສະຕັອກຕ້ອງເປັນຈຳນວນເຕັມ', 'warning'); A('p-stock').focus(); return; }

    btn.disabled = true;
    btn.innerHTML = '<span class="spinner"></span> ກຳລັງບັນທຶກ...';

    try {
      if (isEdit) {
        await ShopAPI.put(`/api/admin/products/${encodeURIComponent(product.id)}`, payload);
        toast('ແກ້ໄຂສິນຄ້າສຳເລັດ', 'success');
      } else {
        await ShopAPI.post('/api/admin/products', payload);
        toast('ເພີ່ມສິນຄ້າສຳເລັດ', 'success');
      }
      closeModal();
      await loadAll();
    } catch (err) {
      handleError(err, 'ບັນທຶກສິນຄ້າບໍ່ສຳເລັດ');
      btn.disabled = false;
      btn.innerHTML = isEdit ? '💾 ບັນທຶກ' : '＋ ເພີ່ມສິນຄ້າ';
    }
  });
}

async function deleteProduct(id) {
  const product = adminState.products.find((p) => p.id === id);
  if (!product) return;
  if (!window.confirm(`ຕ້ອງການລຶບ "${product.name}" ບໍ?\n(ຖ້າສິນຄ້ານີ້ເຄີຍມີໃນອໍເດີ້ ລະບົບຈະປິດການຂາຍແທນການລຶບ)`)) return;

  try {
    const res = await ShopAPI.del(`/api/admin/products/${encodeURIComponent(id)}`);
    toast(res.softDeleted ? 'ປິດການຂາຍສິນຄ້າແລ້ວ (ຍັງເກັບປະຫວັດ)' : 'ລຶບສິນຄ້າແລ້ວ', 'success');
    await loadAll();
  } catch (err) {
    handleError(err, 'ລຶບສິນຄ້າບໍ່ສຳເລັດ');
  }
}

/* ---------------- ຕັ້ງຄ່າ ---------------- */

function renderSettings() {
  const s = adminState.settings;
  if (!s) return;

  A('set-shop-name').value = s.shopName || '';
  A('set-phone').value = s.phone || '';
  A('set-address').value = s.address || '';
  A('set-delivery-fee').value = s.deliveryFee != null ? s.deliveryFee : 0;
  A('set-low-stock').value = s.lowStockThreshold != null ? s.lowStockThreshold : 10;
  A('set-bank-name').value = s.bankName || '';
  A('set-bank-account-name').value = s.bankAccountName || '';
  A('set-bank-account-number').value = s.bankAccountNumber || '';
  A('qr-preview').src = mediaUrl(adminState.qrImage || '/img/seed/bank-qr.svg');
}

async function saveSettings(event) {
  event.preventDefault();
  const btn = A('save-settings-btn');
  btn.disabled = true;
  btn.innerHTML = '<span class="spinner"></span> ກຳລັງບັນທຶກ...';

  try {
    const payload = {
      shopName: A('set-shop-name').value.trim(),
      phone: A('set-phone').value.trim(),
      address: A('set-address').value.trim(),
      deliveryFee: Number(A('set-delivery-fee').value),
      lowStockThreshold: Number(A('set-low-stock').value),
      bankName: A('set-bank-name').value.trim(),
      bankAccountName: A('set-bank-account-name').value.trim(),
      bankAccountNumber: A('set-bank-account-number').value.trim(),
      qrImage: adminState.qrImage
    };

    const data = await ShopAPI.put('/api/admin/settings', payload);
    adminState.settings = data.settings;
    adminState.qrImage = data.settings.qrImage;
    A('settings-note').textContent = `✅ ບັນທຶກແລ້ວເມື່ອ ${formatDate(new Date().toISOString())}`;
    toast('ບັນທຶກການຕັ້ງຄ່າສຳເລັດ', 'success');
    renderAll();
  } catch (err) {
    handleError(err, 'ບັນທຶກການຕັ້ງຄ່າບໍ່ສຳເລັດ');
  } finally {
    btn.disabled = false;
    btn.innerHTML = '💾 ບັນທຶກການຕັ້ງຄ່າ';
  }
}

async function uploadQr(file) {
  if (!file) return;
  if (!file.type.startsWith('image/')) { toast('ກະລຸນາເລືອກໄຟລ໌ຮູບພາບ', 'error'); return; }
  if (file.size > 5 * 1024 * 1024) { toast('ຮູບໃຫຍ່ເກີນ 5MB', 'error'); return; }

  const note = A('settings-note');
  note.textContent = 'ກຳລັງອັບໂຫຼດ QR...';

  try {
    const res = await ShopAPI.upload('/api/admin/upload', file);
    adminState.qrImage = res.url;
    A('qr-preview').src = mediaUrl(res.url);
    note.textContent = 'ອັບໂຫຼດ QR ສຳເລັດ — ກົດ "ບັນທຶກການຕັ້ງຄ່າ" ເພື່ອຢືນຢັນ';
    toast('ອັບໂຫຼດ QR ສຳເລັດ', 'success');
  } catch (err) {
    note.textContent = 'ອັບໂຫຼດ QR ບໍ່ສຳເລັດ';
    handleError(err, 'ອັບໂຫຼດ QR ບໍ່ສຳເລັດ');
  }
}

/* ---------------- Modal ---------------- */

function openModal(html, options = {}) {
  const root = A('modal-root');
  root.innerHTML = `
    <div class="modal-backdrop" data-backdrop>
      <div class="modal ${options.wide ? 'modal-wide' : ''}" role="dialog" aria-modal="true">
        ${html}
      </div>
    </div>`;

  const backdrop = root.querySelector('[data-backdrop]');
  backdrop.addEventListener('click', (e) => {
    if (e.target === backdrop) closeModal();
  });
  root.querySelectorAll('[data-close-modal]').forEach((btn) => {
    btn.onclick = closeModal;
  });

  document.body.style.overflow = 'hidden';
}

function closeModal() {
  A('modal-root').innerHTML = '';
  document.body.style.overflow = '';
}

/* ---------------- Tabs ---------------- */

function switchTab(tab) {
  adminState.tab = tab;
  document.querySelectorAll('[data-tab]').forEach((btn) => {
    btn.classList.toggle('active', btn.dataset.tab === tab);
  });
  document.querySelectorAll('.tab-panel').forEach((panel) => {
    panel.hidden = panel.id !== `tab-${tab}`;
  });
  window.scrollTo({ top: 0, behavior: 'smooth' });
}

/* ---------------- ເລີ່ມຕົ້ນ ---------------- */

function bindEvents() {
  A('login-form').addEventListener('submit', doLogin);
  A('logout-btn').addEventListener('click', doLogout);
  A('settings-form').addEventListener('submit', saveSettings);
  A('qr-file').addEventListener('change', (e) => uploadQr(e.target.files && e.target.files[0]));
  A('add-product-btn').addEventListener('click', () => openProductModal(null));

  document.querySelectorAll('[data-tab]').forEach((btn) => {
    btn.addEventListener('click', () => switchTab(btn.dataset.tab));
  });
  document.querySelectorAll('[data-goto]').forEach((btn) => {
    btn.addEventListener('click', () => switchTab(btn.dataset.goto));
  });

  A('order-filters').addEventListener('click', (e) => {
    const chip = e.target.closest('[data-status]');
    if (!chip) return;
    adminState.orderFilter = chip.dataset.status;
    renderOrderFilters();
    renderOrders();
  });

  A('orders-table').addEventListener('click', (e) => {
    const btn = e.target.closest('[data-order-id]');
    if (btn) openOrderModal(btn.dataset.orderId);
  });

  A('recent-orders').addEventListener('click', (e) => {
    const btn = e.target.closest('[data-order-id]');
    if (btn) openOrderModal(btn.dataset.orderId);
  });

  A('low-stock-list').addEventListener('click', (e) => {
    const btn = e.target.closest('[data-edit-product]');
    if (btn) openProductModal(btn.dataset.editProduct);
  });

  A('products-table').addEventListener('click', (e) => {
    const edit = e.target.closest('[data-edit-product]');
    const del = e.target.closest('[data-delete-product]');
    if (edit) openProductModal(edit.dataset.editProduct);
    else if (del) deleteProduct(del.dataset.deleteProduct);
  });

  let orderTimer = null;
  A('order-search').addEventListener('input', (e) => {
    clearTimeout(orderTimer);
    const value = e.target.value;
    orderTimer = setTimeout(() => {
      adminState.orderQuery = value;
      renderOrders();
    }, 220);
  });

  let productTimer = null;
  A('product-search').addEventListener('input', (e) => {
    clearTimeout(productTimer);
    const value = e.target.value;
    productTimer = setTimeout(() => {
      adminState.productQuery = value;
      renderProducts();
    }, 220);
  });

  document.addEventListener('keydown', (e) => {
    if (e.key === 'Escape') closeModal();
  });
}

async function initAdmin() {
  bindEvents();

  const token = localStorage.getItem(ADMIN_TOKEN_KEY);
  if (!token) { showLogin(); return; }

  try {
    await ShopAPI.get('/api/admin/me');
    await showApp();
  } catch {
    localStorage.removeItem(ADMIN_TOKEN_KEY);
    showLogin();
  }
}

document.addEventListener('DOMContentLoaded', initAdmin);
