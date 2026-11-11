'use strict';

/* ໜ້າຫຼັກ: ສະແດງສິນຄ້າ, ຄົ້ນຫາ, ຈັດລຽງ, ເພີ່ມໃສ່ກະຕ່າ */

const homeState = {
  products: [],
  categories: [],
  q: '',
  category: '',
  sort: 'newest'
};

function homeCard(product) {
  const stock = stockLabel(product.stock);
  const out = product.stock <= 0;
  return `
    <article class="product-card">
      <a class="product-thumb" href="/product.html?id=${encodeURIComponent(product.id)}">
        <img src="${escapeHtml(mediaUrl(product.image))}" alt="${escapeHtml(product.name)}" loading="lazy">
      </a>
      <div class="product-body">
        <span class="tag">${escapeHtml(product.category || 'ອື່ນໆ')}</span>
        <h3 class="product-name">
          <a href="/product.html?id=${encodeURIComponent(product.id)}">${escapeHtml(product.name)}</a>
        </h3>
        <div class="product-meta">
          <span class="price">${formatKip(product.price)}</span>
          <span class="stock ${stock.cls}">${stock.text}</span>
        </div>
        <div class="product-actions">
          <button class="btn btn-yellow" data-add="${escapeHtml(product.id)}" ${out ? 'disabled' : ''}>
            ${out ? 'ໝົດສະຕັອກ' : 'ເພີ່ມໃສ່ກະຕ່າ'}
          </button>
          <a class="btn btn-blue" href="/product.html?id=${encodeURIComponent(product.id)}">ເບິ່ງ</a>
        </div>
      </div>
    </article>
  `;
}

function renderChips() {
  const host = document.getElementById('category-chips');
  if (!host) return;
  const cats = ['', ...homeState.categories];
  host.innerHTML = cats
    .map((cat) => {
      const label = cat || 'ທັງໝົດ';
      return `<button type="button" class="chip ${homeState.category === cat ? 'active' : ''}" data-cat="${escapeHtml(cat)}">${escapeHtml(label)}</button>`;
    })
    .join('');
}

function applyHomeFilter() {
  const q = homeState.q.trim().toLowerCase();
  let list = [...homeState.products];

  if (homeState.category) list = list.filter((p) => p.category === homeState.category);
  if (q) {
    list = list.filter(
      (p) =>
        String(p.name).toLowerCase().includes(q) ||
        String(p.description || '').toLowerCase().includes(q) ||
        String(p.category || '').toLowerCase().includes(q)
    );
  }

  const sort = homeState.sort;
  if (sort === 'price-asc') list.sort((a, b) => a.price - b.price);
  else if (sort === 'price-desc') list.sort((a, b) => b.price - a.price);
  else if (sort === 'name') list.sort((a, b) => String(a.name).localeCompare(String(b.name), 'lo'));
  else list.sort((a, b) => new Date(b.createdAt) - new Date(a.createdAt));

  const grid = document.getElementById('product-grid');
  const count = document.getElementById('result-count');

  if (!list.length) {
    grid.innerHTML = `
      <div class="empty-state" style="grid-column:1/-1;background:rgba(255,255,255,.06);border-radius:20px">
        <div class="icon">🔎</div>
        <h3 style="color:#fff">ບໍ່ພົບສິນຄ້າ</h3>
        <p>ລອງປ່ຽນຄຳຄົ້ນຫາ ຫຼື ເລືອກໝວດອື່ນ</p>
        <button class="btn btn-yellow" id="reset-filter">ລຶບຕົວກອງ</button>
      </div>`;
    const reset = document.getElementById('reset-filter');
    if (reset) reset.onclick = () => resetHomeFilter();
  } else {
    grid.innerHTML = list.map(homeCard).join('');
  }

  if (count) count.textContent = `ພົບ ${list.length} ລາຍການ`;
}

function resetHomeFilter() {
  homeState.q = '';
  homeState.category = '';
  const input = document.getElementById('search-input');
  if (input) input.value = '';
  renderChips();
  applyHomeFilter();
}

async function loadHome() {
  const grid = document.getElementById('product-grid');
  grid.innerHTML = Array.from({ length: 8 })
    .map(() => '<div class="skeleton" style="height:330px;border-radius:20px"></div>')
    .join('');

  try {
    const data = await ShopAPI.get('/api/products');
    homeState.products = data.products || [];
    homeState.categories = data.categories || [];
    renderChips();
    applyHomeFilter();
  } catch (err) {
    grid.innerHTML = `
      <div class="empty-state" style="grid-column:1/-1">
        <div class="icon">⚠️</div>
        <h3 style="color:#fff">ໂຫຼດສິນຄ້າບໍ່ໄດ້</h3>
        <p>${escapeHtml(err.message)}</p>
        <button class="btn btn-blue" onclick="location.reload()">ລອງໃໝ່</button>
      </div>`;
  }
}

document.addEventListener('DOMContentLoaded', () => {
  initChrome('home');

  document.getElementById('category-chips').addEventListener('click', (e) => {
    const chip = e.target.closest('[data-cat]');
    if (!chip) return;
    homeState.category = chip.dataset.cat || '';
    renderChips();
    applyHomeFilter();
  });

  let timer = null;
  document.getElementById('search-input').addEventListener('input', (e) => {
    clearTimeout(timer);
    const value = e.target.value;
    timer = setTimeout(() => {
      homeState.q = value;
      applyHomeFilter();
    }, 220);
  });

  document.getElementById('sort-select').addEventListener('change', (e) => {
    homeState.sort = e.target.value;
    applyHomeFilter();
  });

  document.getElementById('product-grid').addEventListener('click', (e) => {
    const btn = e.target.closest('[data-add]');
    if (!btn || btn.disabled) return;
    const product = homeState.products.find((p) => p.id === btn.dataset.add);
    if (!product) return;
    if (Cart.add(product, 1)) {
      toast(`ເພີ່ມ "${product.name}" ໃສ່ກະຕ່າແລ້ວ`, 'success');
    }
  });

  loadHome();
});
