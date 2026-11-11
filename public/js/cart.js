'use strict';

/* ໜ້າກະຕ່າ: ເພີ່ມ/ຫຼຸດຈຳນວນ, ລຶບ, ຄິດໄລ່ຍອດອັດຕະໂນມັດ */

let cartSettings = { deliveryFee: 0 };

function renderCart() {
  const items = Cart.read();
  const itemsHost = document.getElementById('cart-items');
  const summaryHost = document.getElementById('cart-summary');
  const clearBtn = document.getElementById('clear-cart');

  clearBtn.style.display = items.length ? '' : 'none';

  if (!items.length) {
    itemsHost.innerHTML = `
      <div class="empty-state">
        <div class="icon">🛒</div>
        <h3>ກະຕ່າຂອງທ່ານຫວ່າງເປົ່າ</h3>
        <p>ເລືອກສິນຄ້າທີ່ທ່ານຕ້ອງການ ແລ້ວເພີ່ມໃສ່ກະຕ່າໄດ້ເລີຍ</p>
        <a class="btn btn-yellow btn-lg" href="/index.html">🛍️ ໄປເລືອກສິນຄ້າ</a>
      </div>`;
    summaryHost.style.display = 'none';
    return;
  }

  summaryHost.style.display = '';

  itemsHost.innerHTML = items
    .map((item) => {
      const over = item.stock > 0 && item.qty > item.stock;
      return `
        <div class="cart-item">
          <a href="/product.html?id=${encodeURIComponent(item.id)}">
            <img src="${escapeHtml(mediaUrl(item.image || '/img/seed/placeholder.svg'))}" alt="${escapeHtml(item.name)}">
          </a>
          <div class="cart-item-info">
            <h3><a href="/product.html?id=${encodeURIComponent(item.id)}">${escapeHtml(item.name)}</a></h3>
            <div class="unit">ລາຄາ ${formatKip(item.price)} / ຊິ້ນ</div>
            ${over ? `<div class="stock out">ສະຕັອກມີພຽງ ${item.stock} ຊິ້ນ</div>` : ''}
            <div class="cart-item-price" style="margin-top:4px">${formatKip(item.price * item.qty)}</div>
          </div>
          <div class="cart-item-right">
            <div class="cart-qty">
              <button type="button" data-dec="${escapeHtml(item.id)}" aria-label="ຫຼຸດ">−</button>
              <span>${item.qty}</span>
              <button type="button" data-inc="${escapeHtml(item.id)}" aria-label="ເພີ່ມ">+</button>
            </div>
            <button class="btn btn-red btn-sm" data-remove="${escapeHtml(item.id)}">ລຶບ</button>
          </div>
        </div>`;
    })
    .join('');

  const subtotal = items.reduce((sum, i) => sum + i.price * i.qty, 0);
  const fee = Number(cartSettings.deliveryFee) || 0;
  const total = subtotal + fee;

  summaryHost.innerHTML = `
    <h2>ສະຫຼຸບຍອດ</h2>
    <div class="summary-row"><span>ຈຳນວນສິນຄ້າ</span><span>${Cart.count()} ຊິ້ນ</span></div>
    <div class="summary-row"><span>ລວມສິນຄ້າ</span><span>${formatKip(subtotal)}</span></div>
    <div class="summary-row"><span>ຄ່າຈັດສົ່ງ</span><span>${formatKip(fee)}</span></div>
    <div class="summary-total"><span>ຍອດລວມທັງໝົດ</span><span class="amount">${formatKip(total)}</span></div>
    <p class="summary-note">ຄ່າຈັດສົ່ງອາດປ່ຽນແປງຕາມພື້ນທີ່ — ຈະຢືນຢັນອີກຄັ້ງຕອນຕິດຕໍ່.</p>
    <button class="btn btn-blue btn-lg btn-block" id="go-checkout">ສັ່ງຊື້ → ປ້ອນຂໍ້ມູນຈັດສົ່ງ</button>
    <a class="btn btn-ghost btn-block" href="/index.html" style="margin-top:10px">ເລືອກສິນຄ້າຕື່ມ</a>
  `;

  document.getElementById('go-checkout').onclick = () => {
    window.location.href = '/checkout.html';
  };
}

function bindCartEvents() {
  document.getElementById('cart-items').addEventListener('click', (e) => {
    const inc = e.target.closest('[data-inc]');
    const dec = e.target.closest('[data-dec]');
    const rem = e.target.closest('[data-remove]');

    if (inc) {
      const item = Cart.read().find((i) => i.id === inc.dataset.inc);
      if (!item) return;
      const max = item.stock || 999;
      if (item.qty >= max) { toast(`ສະຕັອກມີພຽງ ${max} ຊິ້ນ`, 'warning'); return; }
      Cart.setQty(item.id, item.qty + 1);
      renderCart();
    } else if (dec) {
      const item = Cart.read().find((i) => i.id === dec.dataset.dec);
      if (!item) return;
      Cart.setQty(item.id, item.qty - 1);
      renderCart();
    } else if (rem) {
      const item = Cart.read().find((i) => i.id === rem.dataset.remove);
      Cart.remove(rem.dataset.remove);
      if (item) toast(`ລຶບ "${item.name}" ອອກຈາກກະຕ່າແລ້ວ`, 'info');
      renderCart();
    }
  });

  document.getElementById('clear-cart').addEventListener('click', () => {
    if (!Cart.count()) return;
    if (!window.confirm('ຕ້ອງການລ້າງກະຕ່າທັງໝົດບໍ?')) return;
    Cart.clear();
    toast('ລ້າງກະຕ່າແລ້ວ', 'info');
    renderCart();
  });
}

document.addEventListener('DOMContentLoaded', async () => {
  initChrome('cart');
  bindCartEvents();
  renderCart();

  try {
    const s = await getShopSettings();
    cartSettings = s || {};
    renderCart();
  } catch {
    /* ໃຊ້ຄ່າເລີ່ມຕົ້ນ */
  }
});
