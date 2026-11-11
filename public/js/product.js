'use strict';

/* ລາຍລະອຽດສິນຄ້າ + ຮູບ zoom + ເພີ່ມໃສ່ກະຕ່າ */

let currentProduct = null;
let currentQty = 1;

function productDetailHtml(product) {
  const stock = stockLabel(product.stock);
  const out = product.stock <= 0;

  return `
    <div class="detail-grid">
      <div class="detail-media">
        <img data-zoom src="${escapeHtml(mediaUrl(product.image))}" alt="${escapeHtml(product.name)}">
        <span class="zoom-hint">🔍 ກົດເພື່ອຂະຫຍາຍ</span>
      </div>

      <div class="detail-info">
        <span class="tag">${escapeHtml(product.category || 'ອື່ນໆ')}</span>
        <h1>${escapeHtml(product.name)}</h1>
        <div class="detail-price">${formatKip(product.price)}</div>

        <div class="detail-desc">${escapeHtml(product.description || 'ສິນຄ້າຄຸນນະພາບດີ ຈາກຮ້ານ ສະບາຍດີ.')}</div>

        <div class="detail-meta">
          <div>ສະຖານະ<strong class="stock ${stock.cls}" style="font-size:15px">${stock.text}</strong></div>
          <div>ໝວດ<strong>${escapeHtml(product.category || 'ອື່ນໆ')}</strong></div>
          <div>ການຈ່າຍ<strong>COD / QR</strong></div>
        </div>

        ${out ? '<div class="notice notice-red">ສິນຄ້ານີ້ໝົດສະຕັອກແລ້ວ — ກະລຸນາເລືອກສິນຄ້າອື່ນ</div>' : ''}

        <div class="buy-row">
          <div class="qty-stepper">
            <button type="button" id="qty-minus" aria-label="ຫຼຸດ">−</button>
            <span id="qty-value">1</span>
            <button type="button" id="qty-plus" aria-label="ເພີ່ມ">+</button>
          </div>
          <button class="btn btn-yellow btn-lg" id="add-to-cart" ${out ? 'disabled' : ''}>🛒 ເພີ່ມໃສ່ກະຕ່າ</button>
          <button class="btn btn-blue btn-lg" id="buy-now" ${out ? 'disabled' : ''}>ຊື້ດຽວນີ້</button>
        </div>

        <div class="notice notice-blue" style="margin-top:20px">
          🚚 ຄ່າຈັດສົ່ງຄິດໄລ່ຕອນສັ່ງຊື້ · ສົ່ງທົ່ວນະຄອນຫຼວງວຽງຈັນ
        </div>
      </div>
    </div>
  `;
}

function relatedCard(product) {
  const out = product.stock <= 0;
  return `
    <article class="product-card">
      <a class="product-thumb" href="/product.html?id=${encodeURIComponent(product.id)}">
        <img src="${escapeHtml(mediaUrl(product.image))}" alt="${escapeHtml(product.name)}" loading="lazy">
      </a>
      <div class="product-body">
        <h3 class="product-name"><a href="/product.html?id=${encodeURIComponent(product.id)}">${escapeHtml(product.name)}</a></h3>
        <div class="product-meta">
          <span class="price">${formatKip(product.price)}</span>
          <span class="stock ${stockLabel(product.stock).cls}">${stockLabel(product.stock).text}</span>
        </div>
        <div class="product-actions">
          <button class="btn btn-yellow" data-add="${escapeHtml(product.id)}" ${out ? 'disabled' : ''}>${out ? 'ໝົດ' : 'ເພີ່ມໃສ່ກະຕ່າ'}</button>
        </div>
      </div>
    </article>
  `;
}

function bindProductActions() {
  const minus = document.getElementById('qty-minus');
  const plus = document.getElementById('qty-plus');
  const value = document.getElementById('qty-value');
  const max = Math.max(0, Number(currentProduct.stock) || 0);

  const paint = () => { value.textContent = String(currentQty); };
  paint();

  minus.onclick = () => { currentQty = Math.max(1, currentQty - 1); paint(); };
  plus.onclick = () => {
    if (currentQty >= max) { toast(`ສະຕັອກມີພຽງ ${max} ຊິ້ນ`, 'warning'); return; }
    currentQty = Math.min(max || 1, currentQty + 1);
    paint();
  };

  document.getElementById('add-to-cart').onclick = () => {
    if (Cart.add(currentProduct, currentQty)) {
      toast(`ເພີ່ມ ${currentQty} ຊິ້ນ ໃສ່ກະຕ່າແລ້ວ`, 'success');
    }
  };

  document.getElementById('buy-now').onclick = () => {
    if (Cart.add(currentProduct, currentQty)) {
      window.location.href = '/checkout.html';
    }
  };
}

async function loadProduct() {
  const params = new URLSearchParams(window.location.search);
  const id = params.get('id');
  const host = document.getElementById('product-detail');

  if (!id) {
    host.innerHTML = '<div class="empty-state"><div class="icon">❓</div><h3 style="color:#fff">ບໍ່ພົບສິນຄ້າ</h3><p>ກະລຸນາເລືອກສິນຄ້າຈາກໜ້າຫຼັກ</p><a class="btn btn-yellow" href="/index.html">ກັບໜ້າຫຼັກ</a></div>';
    return;
  }

  try {
    const data = await ShopAPI.get(`/api/products/${encodeURIComponent(id)}`);
    currentProduct = data.product;

    document.title = `${currentProduct.name} — ຮ້ານ ສະບາຍດີ`;
    document.getElementById('bc-category').textContent = currentProduct.category || 'ສິນຄ້າ';
    document.getElementById('bc-name').textContent = currentProduct.name;

    host.innerHTML = productDetailHtml(currentProduct);
    bindProductActions();

    const related = data.related || [];
    const section = document.getElementById('related-section');
    if (related.length) {
      section.innerHTML = `
        <h2 class="section-title">ສິນຄ້າ<span>ອື່ນໆ</span> ໃນໝວດດຽວກັນ</h2>
        <div class="product-grid" id="related-grid">${related.map(relatedCard).join('')}</div>
      `;
      section.querySelector('#related-grid').addEventListener('click', (e) => {
        const btn = e.target.closest('[data-add]');
        if (!btn || btn.disabled) return;
        const product = related.find((p) => p.id === btn.dataset.add);
        if (product && Cart.add(product, 1)) toast(`ເພີ່ມ "${product.name}" ແລ້ວ`, 'success');
      });
    } else {
      section.innerHTML = '';
    }
  } catch (err) {
    host.innerHTML = `
      <div class="empty-state" style="margin:40px 0">
        <div class="icon">⚠️</div>
        <h3 style="color:#fff">${escapeHtml(err.message)}</h3>
        <p>ສິນຄ້ານີ້ອາດຖືກລຶບ ຫຼື ບໍ່ມີໃນລະບົບແລ້ວ</p>
        <a class="btn btn-yellow" href="/index.html">ເບິ່ງສິນຄ້າທັງໝົດ</a>
      </div>`;
  }
}

document.addEventListener('DOMContentLoaded', () => {
  initChrome('home');
  loadProduct();
});
