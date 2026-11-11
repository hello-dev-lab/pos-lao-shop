'use strict';

/* ໜ້າສັ່ງຊື້ສຳເລັດ */

async function loadSuccess() {
  const code = new URLSearchParams(window.location.search).get('code');
  const host = document.getElementById('success-card');
  const trackLink = document.getElementById('track-link');

  if (!code) {
    host.innerHTML = `
      <div class="empty-state" style="padding:26px 10px">
        <div class="icon">🧾</div>
        <h3>ບໍ່ພົບລະຫັດອໍເດີ້</h3>
        <p>ຖ້າທ່ານຫາກໍ່ສັ່ງຊື້ ກະລຸນາເບິ່ງລະຫັດໃນໜ້າຕິດຕາມອໍເດີ້</p>
      </div>`;
    trackLink.href = '/track.html';
    return;
  }

  trackLink.href = `/track.html?code=${encodeURIComponent(code)}`;

  try {
    const { order } = await ShopAPI.get(`/api/orders/track/${encodeURIComponent(code)}`);
    document.title = `ອໍເດີ້ ${order.code} — ສຳເລັດ`;

    host.innerHTML = `
      <div style="display:flex;justify-content:space-between;gap:12px;flex-wrap:wrap;align-items:center;margin-bottom:14px">
        <span class="muted" style="font-size:13px">ລະຫັດອໍເດີ້</span>
        <span class="status-pill status-${escapeHtml(order.statusColor)}">${escapeHtml(order.statusLabel)}</span>
      </div>
      <div class="order-code" style="margin-bottom:16px">${escapeHtml(order.code)}</div>

      <dl class="kv">
        <dt>ລູກຄ້າ</dt><dd>${escapeHtml(order.customer.name)}</dd>
        <dt>ເບີໂທ</dt><dd>${escapeHtml(order.customer.phone)}</dd>
        <dt>ທີ່ຢູ່</dt><dd>${escapeHtml(order.customer.address)}</dd>
        <dt>ການຈ່າຍເງິນ</dt><dd>${escapeHtml(order.paymentLabel)}</dd>
        <dt>ຈຳນວນສິນຄ້າ</dt><dd>${order.items.reduce((s, i) => s + i.qty, 0)} ຊິ້ນ</dd>
      </dl>

      <div class="summary-row" style="margin-top:12px"><span>ລວມສິນຄ້າ</span><span>${formatKip(order.subtotal)}</span></div>
      <div class="summary-row"><span>ຄ່າຈັດສົ່ງ</span><span>${formatKip(order.deliveryFee)}</span></div>
      <div class="summary-total"><span>ຍອດລວມ</span><span class="amount">${formatKip(order.total)}</span></div>

      <div class="notice notice-blue" style="margin-top:16px;margin-bottom:0">
        ທ່ານສາມາດຕິດຕາມສະຖານະອໍເດີ້ໄດ້ທຸກເວລາ ດ້ວຍລະຫັດ <strong>${escapeHtml(order.code)}</strong>
      </div>
    `;
  } catch (err) {
    host.innerHTML = `
      <div class="empty-state" style="padding:26px 10px">
        <div class="icon">⚠️</div>
        <h3>ໂຫຼດຂໍ້ມູນອໍເດີ້ບໍ່ໄດ້</h3>
        <p>${escapeHtml(err.message)}</p>
      </div>`;
  }
}

document.addEventListener('DOMContentLoaded', () => {
  initChrome('track');
  loadSuccess();
});
