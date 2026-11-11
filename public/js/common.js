'use strict';

/* =========================================================
   ໂຄ້ດກາງທີ່ທຸກໜ້າໃຊ້ຮ່ວມກັນ: API, ກະຕ່າ, ຫົວໜ້າ, toast
   ========================================================= */

const ADMIN_TOKEN_KEY = 'pos_admin_token';

/* ທີ່ຢູ່ເຊີບເວີ API — ຖ້າ frontend ຢູ່ຄົນລະໂຮດ (Cloudflare Pages) ໃຫ້ຕັ້ງໃນ js/config.js */
const APP_CONFIG = window.APP_CONFIG || {};
const API_BASE = String(APP_CONFIG.apiBase || '').replace(/\/+$/, '');

function isAbsoluteUrl(value) {
  return /^https?:\/\//i.test(String(value || ''));
}

/** ຕໍ່ URL ຂອງ API ເຂົ້າກັບ base (ຖ້າຕັ້ງໄວ້) */
function apiUrl(path) {
  const p = String(path || '');
  if (!p || isAbsoluteUrl(p)) return p;
  return API_BASE + p;
}

/** ຮູບທີ່ຢູ່ເທິງເຊີບເວີ (/uploads/...) ຕ້ອງຕໍ່ base; ຮູບໃນ public (/img/...) ບໍ່ຕ້ອງ */
function mediaUrl(path) {
  const p = String(path || '');
  if (!p || isAbsoluteUrl(p)) return p;
  if (p.startsWith('/uploads/')) return API_BASE + p;
  return p;
}

const ShopAPI = {
  async request(url, options = {}) {
    const headers = { ...(options.headers || {}) };
    const isForm = options.body instanceof FormData;
    if (options.body && !isForm) headers['Content-Type'] = 'application/json';

    if (url.startsWith('/api/admin')) {
      const token = localStorage.getItem(ADMIN_TOKEN_KEY);
      if (token) headers.Authorization = `Bearer ${token}`;
    }

    let res;
    try {
      res = await fetch(apiUrl(url), { ...options, headers });
    } catch {
      throw new Error('ເຊື່ອມຕໍ່ເຊີບເວີບໍ່ໄດ້ ກະລຸນາກວດສອບອິນເຕີເນັດ');
    }

    let data = null;
    try { data = await res.json(); } catch { /* ບໍ່ແມ່ນ JSON */ }

    if (!res.ok) {
      const error = new Error((data && data.error) || `ເກີດຂໍ້ຜິດພາດ (${res.status})`);
      error.status = res.status;
      throw error;
    }
    return data;
  },

  get(url) { return this.request(url); },
  post(url, body) { return this.request(url, { method: 'POST', body: JSON.stringify(body) }); },
  put(url, body) { return this.request(url, { method: 'PUT', body: JSON.stringify(body) }); },
  patch(url, body) { return this.request(url, { method: 'PATCH', body: JSON.stringify(body) }); },
  del(url) { return this.request(url, { method: 'DELETE' }); },

  async upload(url, file) {
    const fd = new FormData();
    fd.append('image', file);
    return this.request(url, { method: 'POST', body: fd });
  }
};

/* ---------------- ຕົວຊ່ວຍທົ່ວໄປ ---------------- */

function escapeHtml(value) {
  return String(value == null ? '' : value)
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;')
    .replace(/'/g, '&#39;');
}

function formatKip(value) {
  const n = Number(value) || 0;
  return `${n.toLocaleString('en-US')} ₭`;
}

function formatNumber(value) {
  return (Number(value) || 0).toLocaleString('en-US');
}

function formatDate(iso) {
  if (!iso) return '-';
  const d = new Date(iso);
  if (Number.isNaN(d.getTime())) return '-';
  return d.toLocaleString('en-GB', {
    day: '2-digit', month: '2-digit', year: 'numeric',
    hour: '2-digit', minute: '2-digit'
  });
}

function stockLabel(stock) {
  const n = Number(stock) || 0;
  if (n <= 0) return { cls: 'out', text: 'ໝົດ' };
  if (n <= 5) return { cls: 'low', text: `ເຫຼືອ ${n}` };
  return { cls: '', text: `ສະຕັອກ ${n}` };
}

let toastTimer = null;
function toast(message, type = 'info') {
  let el = document.getElementById('app-toast');
  if (!el) {
    el = document.createElement('div');
    el.id = 'app-toast';
    el.className = 'toast';
    document.body.appendChild(el);
  }
  clearTimeout(toastTimer);
  el.textContent = message;
  el.className = `toast show toast-${type}`;
  toastTimer = setTimeout(() => {
    el.className = 'toast';
  }, 3200);
}

async function getShopSettings() {
  if (!getShopSettings._promise) {
    getShopSettings._promise = ShopAPI.get('/api/settings').catch(() => ({}));
  }
  return getShopSettings._promise;
}

/* ---------------- ກະຕ່າສິນຄ້າ ---------------- */

const Cart = {
  KEY: 'pos_cart_v1',

  read() {
    try {
      const arr = JSON.parse(localStorage.getItem(this.KEY) || '[]');
      if (!Array.isArray(arr)) return [];
      return arr
        .filter((i) => i && i.id && Number(i.qty) > 0)
        .map((i) => ({
          id: String(i.id),
          name: String(i.name || ''),
          price: Number(i.price) || 0,
          image: String(i.image || ''),
          stock: Number(i.stock) || 0,
          qty: Math.max(1, Math.floor(Number(i.qty) || 1))
        }));
    } catch {
      return [];
    }
  },

  write(items) {
    localStorage.setItem(this.KEY, JSON.stringify(items));
    this.updateBadge();
  },

  count() {
    return this.read().reduce((sum, i) => sum + i.qty, 0);
  },

  subtotal() {
    return this.read().reduce((sum, i) => sum + i.price * i.qty, 0);
  },

  add(product, qty = 1) {
    const items = this.read();
    const max = Number.isFinite(Number(product.stock)) ? Math.max(0, Number(product.stock)) : 999;
    if (max <= 0) {
      toast('ສິນຄ້ານີ້ໝົດສະຕັອກແລ້ວ', 'warning');
      return false;
    }

    const existing = items.find((i) => i.id === product.id);
    if (existing) {
      const want = existing.qty + qty;
      if (want > max) {
        toast(`ສະຕັອກມີພຽງ ${max} ຊິ້ນ`, 'warning');
        existing.qty = max;
      } else {
        existing.qty = want;
      }
      existing.name = product.name;
      existing.price = Number(product.price) || 0;
      existing.image = product.image || '';
      existing.stock = max;
    } else {
      items.push({
        id: String(product.id),
        name: product.name,
        price: Number(product.price) || 0,
        image: product.image || '',
        stock: max,
        qty: Math.min(Math.max(1, qty), max)
      });
    }

    this.write(items);
    return true;
  },

  setQty(id, qty) {
    const items = this.read();
    const item = items.find((i) => i.id === id);
    if (!item) return;
    const next = Math.max(0, Math.floor(Number(qty) || 0));
    if (next <= 0) {
      this.write(items.filter((i) => i.id !== id));
      return;
    }
    item.qty = Math.min(next, Math.max(1, item.stock || next));
    this.write(items);
  },

  remove(id) {
    this.write(this.read().filter((i) => i.id !== id));
  },

  clear() {
    this.write([]);
  },

  updateBadge() {
    document.querySelectorAll('[data-cart-badge]').forEach((el) => {
      const n = this.count();
      el.textContent = n > 99 ? '99+' : String(n);
      el.classList.toggle('show', n > 0);
    });
  }
};

/* ---------------- ຫົວໜ້າ ແລະ ລາຍລະອຽດທ້າຍໜ້າ ---------------- */

function renderHeader(active = '') {
  const host = document.getElementById('site-header');
  if (!host) return;

  const tabs = [
    { key: 'home', href: '/index.html', label: 'ໜ້າຫຼັກ' },
    { key: 'cart', href: '/cart.html', label: 'ກະຕ່າສິນຄ້າ' },
    { key: 'track', href: '/track.html', label: 'ຕິດຕາມອໍເດີ້' },
    { key: 'admin', href: '/admin/', label: 'ແອັດມິນ' }
  ];

  host.innerHTML = `
    <div class="topbar">
      <a class="brand" href="/index.html">
        <img src="/img/logo.svg" alt="ໂລໂກ້ຮ້ານ">
        <span>
          <span class="brand-name" data-shop-name>ຮ້ານ ສະບາຍດີ</span>
          <span class="brand-sub">ຮ້ານຄ້າອອນໄລ • ສົ່ງໄວທົ່ວວຽງຈັນ</span>
        </span>
      </a>
      <nav class="main-nav" aria-label="ເມນູຫຼັກ">
        ${tabs.map((t) => `<a class="nav-tab ${active === t.key ? 'active' : ''}" href="${t.href}">${t.label}</a>`).join('')}
      </nav>
      <div class="header-actions">
        <a class="cart-btn" href="/cart.html" aria-label="ກະຕ່າສິນຄ້າ">
          <span>🛒</span><span class="cart-label">ກະຕ່າ</span>
          <span class="cart-badge" data-cart-badge>0</span>
        </a>
      </div>
    </div>
  `;

  host.querySelector('a.brand').addEventListener('click', () => { });
  getShopSettings().then((s) => {
    if (!s || !s.shopName) return;
    const el = host.querySelector('[data-shop-name]');
    if (el) el.textContent = s.shopName;
    const sub = host.querySelector('.brand-sub');
    if (sub && s.address) sub.textContent = s.address;
  });
}

function renderFooter() {
  const host = document.getElementById('site-footer');
  if (!host) return;

  host.innerHTML = `
    <div class="footer-inner">
      <div>
        <h4 data-shop-name>ຮ້ານ ສະບາຍດີ ມິນິມາດ</h4>
        <div data-shop-address>ນະຄອນຫຼວງວຽງຈັນ, ສປປ ລາວ</div>
        <div style="margin-top:6px">ໂທ: <a href="tel:02055551234" data-shop-phone>020 5555 1234</a></div>
      </div>
      <div>
        <h4>ບໍລິການ</h4>
        <div><a href="/index.html">ສິນຄ້າທັງໝົດ</a></div>
        <div><a href="/cart.html">ກະຕ່າສິນຄ້າ</a></div>
        <div><a href="/track.html">ຕິດຕາມອໍເດີ້</a></div>
      </div>
      <div>
        <h4>ການຈ່າຍເງິນ</h4>
        <div>💵 ຈ່າຍປາຍທາງ (COD)</div>
        <div>🏦 ໂອນທະນາຄານ / QR Code</div>
        <div>📞 ສອບຖາມ: <a href="tel:02055551234" data-shop-phone>020 5555 1234</a></div>
      </div>
    </div>
    <div class="footer-bottom">
      <span>© ${new Date().getFullYear()} <span data-shop-name>ຮ້ານ ສະບາຍດີ</span> — ລະບົບຂາຍສິນຄ້າ POS</span>
      <span>ສ້າງດ້ວຍ Node.js + Express</span>
    </div>
  `;

  getShopSettings().then((s) => {
    if (!s) return;
    if (s.shopName) {
      host.querySelectorAll('[data-shop-name]').forEach((el) => { el.textContent = s.shopName; });
    }
    if (s.address) {
      host.querySelectorAll('[data-shop-address]').forEach((el) => { el.textContent = s.address; });
    }
    if (s.phone) {
      host.querySelectorAll('[data-shop-phone]').forEach((el) => {
        el.textContent = s.phone;
        if (el.tagName === 'A') el.href = `tel:${String(s.phone).replace(/\s/g, '')}`;
      });
    }
  });
}

function initChrome(active) {
  renderHeader(active);
  renderFooter();
  Cart.updateBadge();
}

/* ---------------- ຮູບພາບ / lightbox ---------------- */

function openImageLightbox(src, caption = '') {
  const existing = document.querySelector('.lightbox');
  if (existing) existing.remove();

  const box = document.createElement('div');
  box.className = 'lightbox';
  box.innerHTML = `
    <div class="lightbox-tools">
      <button type="button" data-zoom-in title="ຂະຫຍາຍ">＋</button>
      <button type="button" data-zoom-out title="ຫຍໍ້">－</button>
      <button type="button" data-zoom-reset title="ປົກກະຕິ">⟲</button>
      <button type="button" data-close title="ປິດ">✕</button>
    </div>
    <img src="${escapeHtml(src)}" alt="${escapeHtml(caption || 'ຮູບສິນຄ້າ')}">
    ${caption ? `<div class="lightbox-caption">${escapeHtml(caption)} · ລາກເພື່ອເລື່ອນ · ສະກອນເພື່ອ zoom</div>` : '<div class="lightbox-caption">ລາກເພື່ອເລື່ອນ · ສະກອນເພື່ອ zoom</div>'}
  `;
  document.body.appendChild(box);

  const img = box.querySelector('img');
  let scale = 1;
  let x = 0;
  let y = 0;
  let dragging = false;
  let startX = 0;
  let startY = 0;

  const apply = () => {
    img.style.transform = `translate(${x}px, ${y}px) scale(${scale})`;
  };

  box.querySelector('[data-zoom-in]').onclick = () => { scale = Math.min(5, scale + 0.35); apply(); };
  box.querySelector('[data-zoom-out]').onclick = () => { scale = Math.max(0.4, scale - 0.35); apply(); };
  box.querySelector('[data-zoom-reset]').onclick = () => { scale = 1; x = 0; y = 0; apply(); };
  box.querySelector('[data-close]').onclick = () => box.remove();

  box.addEventListener('click', (e) => { if (e.target === box) box.remove(); });

  box.addEventListener('wheel', (e) => {
    e.preventDefault();
    scale = Math.min(5, Math.max(0.4, scale + (e.deltaY < 0 ? 0.18 : -0.18)));
    apply();
  }, { passive: false });

  img.addEventListener('pointerdown', (e) => {
    dragging = true;
    startX = e.clientX - x;
    startY = e.clientY - y;
    img.setPointerCapture(e.pointerId);
  });
  img.addEventListener('pointermove', (e) => {
    if (!dragging) return;
    x = e.clientX - startX;
    y = e.clientY - startY;
    apply();
  });
  img.addEventListener('pointerup', () => { dragging = false; });
  img.addEventListener('pointercancel', () => { dragging = false; });

  const onKey = (e) => {
    if (e.key === 'Escape') { box.remove(); document.removeEventListener('keydown', onKey); }
  };
  document.addEventListener('keydown', onKey);
}

/* ເປີດ lightbox ຈາກຮູບໃດໆ ທີ່ມີ data-zoom */
document.addEventListener('click', (e) => {
  const target = e.target.closest('[data-zoom]');
  if (!target) return;
  const img = target.tagName === 'IMG' ? target : target.querySelector('img');
  if (!img) return;
  openImageLightbox(img.getAttribute('src'), img.getAttribute('alt') || '');
});

document.addEventListener('keydown', (e) => {
  const box = document.querySelector('.lightbox');
  if (box && e.key === 'Escape') box.remove();
});
