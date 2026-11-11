'use strict';

/* ໜ້າຕິດຕາມອໍເດີ້ */

const TRACK_STEPS = [
  { id: 'preparing', label: 'ກຳລັງກຽມເຄື່ອງ', icon: '📦' },
  { id: 'shipping', label: 'ກຳລັງຈັດສົ່ງ', icon: '🚚' },
  { id: 'delivered', label: 'ຈັດສົ່ງສຳເລັດ', icon: '✅' }
];

const STATUS_LABEL = {
  preparing: 'ກຳລັງກຽມເຄື່ອງ',
  shipping: 'ກຳລັງຈັດສົ່ງ',
  delivered: 'ຈັດສົ່ງສຳເລັດແລ້ວ',
  cancelled: 'ຍົກເລີກ'
};

function timelineHtml(order) {
  if (order.status === 'cancelled') {
    return '<div class="notice notice-red">❌ ອໍເດີ້ນີ້ຖືກຍົກເລີກແລ້ວ — ຖ້າມີຄຳຖາມ ກະລຸນາຕິດຕໍ່ຮ້ານ</div>';
  }

  const idx = TRACK_STEPS.findIndex((s) => s.id === order.status);
  return `
    <div class="timeline">
      ${TRACK_STEPS.map((step, i) => `
        <div class="timeline-step ${i <= idx ? 'done' : ''} ${i === idx ? 'current' : ''}">
          <div class="timeline-dot">${i < idx ? '✓' : step.icon}</div>
          <div class="timeline-label">${step.label}</div>
        </div>`).join('')}
    </div>`;
}

function trackOrderHtml(order) {
  const itemCount = order.items.reduce((sum, i) => sum + i.qty, 0);
  const history = (order.history || [])
    .slice()
    .reverse()
    .map((h) => `<div class="summary-row" style="padding:4px 0;font-size:13px">
        <span>${escapeHtml(STATUS_LABEL[h.status] || h.status)}</span>
        <span class="muted">${formatDate(h.at)}</span>
      </div>`)
    .join('');

  return `
    <div class="card">
      <div class="card-head">
        <div>
          <div class="muted" style="font-size:12px">ລະຫັດອໍເດີ້</div>
          <div class="order-code">${escapeHtml(order.code)}</div>
        </div>
        <span class="status-pill status-${escapeHtml(order.statusColor)}">${escapeHtml(order.statusLabel)}</span>
      </div>

      ${timelineHtml(order)}

      <div class="notice notice-blue" style="margin-top:14px">
        ສັ່ງເມື່ອ: <strong>${formatDate(order.createdAt)}</strong>
        · ອັບເດດລ່າສຸດ: <strong>${formatDate(order.updatedAt)}</strong>
      </div>

      <div class="form-grid" style="margin-top:18px">
        <div>
          <h3 style="font-size:16px;margin-bottom:10px">ຂໍ້ມູນລູກຄ້າ</h3>
          <dl class="kv">
            <dt>ຊື່</dt><dd>${escapeHtml(order.customer.name)}</dd>
            <dt>ເບີໂທ</dt><dd>${escapeHtml(order.customer.phone)}</dd>
            <dt>ທີ່ຢູ່</dt><dd>${escapeHtml(order.customer.address)}</dd>
            <dt>ການຈ່າຍ</dt><dd>${escapeHtml(order.paymentLabel)}</dd>
            ${order.note ? `<dt>ໝາຍເຫດ</dt><dd>${escapeHtml(order.note)}</dd>` : ''}
          </dl>
        </div>
        <div>
          <h3 style="font-size:16px;margin-bottom:10px">ສະຖານະ (${itemCount} ຊິ້ນ)</h3>
          <div>
            ${order.items.map((i) => `
              <div class="mini-item">
                <img src="${escapeHtml(mediaUrl(i.image || '/img/seed/placeholder.svg'))}" alt="${escapeHtml(i.name)}">
                <div class="name">${escapeHtml(i.name)}<div class="qty">× ${i.qty} · ${formatKip(i.price)}</div></div>
                <div class="line">${formatKip(i.lineTotal)}</div>
              </div>`).join('')}
          </div>
          <div class="summary-row" style="margin-top:8px"><span>ລວມສິນຄ້າ</span><span>${formatKip(order.subtotal)}</span></div>
          <div class="summary-row"><span>ຄ່າຈັດສົ່ງ</span><span>${formatKip(order.deliveryFee)}</span></div>
          <div class="summary-total"><span>ຍອດລວມ</span><span class="amount">${formatKip(order.total)}</span></div>
        </div>
      </div>

      ${order.payment.method === 'bank' && order.payment.slip ? `
        <div style="margin-top:18px">
          <h3 style="font-size:16px;margin-bottom:8px">ສະລິບການໂອນເງິນ</h3>
          <img src="${escapeHtml(mediaUrl(order.payment.slip))}" alt="ສະລິບ" data-zoom
               style="width:150px;border-radius:12px;border:1px solid #e5e7eb;cursor:zoom-in">
        </div>` : ''}

      <div style="margin-top:18px">
        <h3 style="font-size:16px;margin-bottom:8px">ຈຸດຈັດສົ່ງ</h3>
        ${order.location
          ? `<div id="track-map" style="height:300px;border-radius:16px;overflow:hidden;border:1px solid #e5e7eb"></div>
             <div class="map-coords"><span>📍 ${order.location.lat.toFixed(6)}, ${order.location.lng.toFixed(6)}</span>
             <a href="https://www.openstreetmap.org/?mlat=${order.location.lat}&mlon=${order.location.lng}#map=17/${order.location.lat}/${order.location.lng}"
                target="_blank" rel="noopener">ເປີດໃນ OpenStreetMap ↗</a></div>`
          : '<div class="notice notice-yellow" style="margin:0">ອໍເດີ້ນີ້ບໍ່ມີພິກັດ GPS — ຈະຈັດສົ່ງຕາມທີ່ຢູ່ທີ່ໃຫ້ໄວ້</div>'}
      </div>

      ${history ? `
        <div style="margin-top:18px">
          <h3 style="font-size:16px;margin-bottom:6px">ປະຫວັດສະຖານະ</h3>
          ${history}
        </div>` : ''}
    </div>
  `;
}

function initTrackMap(order) {
  if (!order.location || !window.L) return;
  const host = document.getElementById('track-map');
  if (!host) return;

  const map = L.map(host).setView([order.location.lat, order.location.lng], 16);
  L.tileLayer('https://server.arcgisonline.com/ArcGIS/rest/services/World_Street_Map/MapServer/tile/{z}/{y}/{x}', {
    maxZoom: 19,
    attribution: 'Tiles &copy; Esri &mdash; Esri, DeLorme, NAVTEQ'
  }).addTo(map);
  L.marker([order.location.lat, order.location.lng]).addTo(map);
  setTimeout(() => map.invalidateSize(), 200);
}

async function trackOrder(code) {
  const result = document.getElementById('track-result');
  const errorHost = document.getElementById('track-error');
  errorHost.innerHTML = '';

  if (!code) {
    toast('ກະລຸນາປ້ອນລະຫັດອໍເດີ້', 'warning');
    return;
  }

  result.innerHTML = '<div class="skeleton" style="height:320px;border-radius:20px"></div>';

  try {
    const { order } = await ShopAPI.get(`/api/orders/track/${encodeURIComponent(code)}`);
    result.innerHTML = trackOrderHtml(order);
    initTrackMap(order);
    localStorage.setItem('pos_last_order', order.code);
    document.title = `ອໍເດີ້ ${order.code} — ຕິດຕາມ`;
  } catch (err) {
    errorHost.innerHTML = `<div class="notice notice-red">${escapeHtml(err.message)}</div>`;
    result.innerHTML = `
      <div class="card">
        <div class="empty-state">
          <div class="icon">🔎</div>
          <h3>ບໍ່ພົບອໍເດີ້</h3>
          <p>ກວດສອບລະຫັດອໍເດີ້ອີກຄັ້ງ ຫຼື ຕິດຕໍ່ຮ້ານ</p>
          <a class="btn btn-blue" href="/index.html">ກັບໜ້າຫຼັກ</a>
        </div>
      </div>`;
  }
}

document.addEventListener('DOMContentLoaded', () => {
  initChrome('track');

  const input = document.getElementById('track-code');
  const params = new URLSearchParams(window.location.search);
  const fromUrl = params.get('code');
  const saved = localStorage.getItem('pos_last_order');

  input.value = (fromUrl || saved || '').toUpperCase();

  document.getElementById('track-btn').onclick = () => {
    trackOrder(input.value.trim().toUpperCase());
  };
  input.addEventListener('keydown', (e) => {
    if (e.key === 'Enter') {
      e.preventDefault();
      trackOrder(input.value.trim().toUpperCase());
    }
  });

  if (fromUrl) trackOrder(fromUrl.trim().toUpperCase());
});
