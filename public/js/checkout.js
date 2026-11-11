'use strict';

/* Checkout: ຂໍ້ມູນລູກຄ້າ, GPS + ແຜນທີ່, ຈ່າຍເງິນ, ສະລິບ */

const checkoutState = {
  settings: {},
  map: null,
  marker: null,
  location: null,
  slipUrl: '',
  submitting: false
};

const el = (id) => document.getElementById(id);

/* ---------------- ສະຫຼຸບອໍເດີ້ ---------------- */

function checkoutTotals() {
  const items = Cart.read();
  const subtotal = items.reduce((sum, i) => sum + i.price * i.qty, 0);
  const fee = Math.max(0, Number(checkoutState.settings.deliveryFee) || 0);
  return { items, subtotal, fee, total: subtotal + fee };
}

function renderSummary() {
  const host = el('checkout-summary');
  const { items, subtotal, fee, total } = checkoutTotals();
  if (!items.length) return;

  host.innerHTML = `
    <h2>ສະຫຼຸບອໍເດີ້</h2>
    <div>
      ${items.map((i) => `
        <div class="mini-item">
          <img src="${escapeHtml(mediaUrl(i.image || '/img/seed/placeholder.svg'))}" alt="${escapeHtml(i.name)}">
          <div class="name">${escapeHtml(i.name)}<div class="qty">× ${i.qty}</div></div>
          <div class="line">${formatKip(i.price * i.qty)}</div>
        </div>`).join('')}
    </div>
    <div class="summary-row" style="margin-top:10px"><span>ລວມສິນຄ້າ (${Cart.count()} ຊິ້ນ)</span><span>${formatKip(subtotal)}</span></div>
    <div class="summary-row"><span>ຄ່າຈັດສົ່ງ</span><span>${formatKip(fee)}</span></div>
    <div class="summary-total"><span>ຍອດລວມທັງໝົດ</span><span class="amount">${formatKip(total)}</span></div>
    <div id="checkout-alert"></div>
    <button class="btn btn-blue btn-lg btn-block" id="place-order" style="margin-top:16px">✅ ຢືນຢັນສັ່ງຊື້</button>
    <div class="summary-note" style="text-align:center">ກົດສັ່ງຊື້ ແລ້ວທາງຮ້ານຈະໂທຢືນຢັນອີກຄັ້ງ</div>
  `;

  el('place-order').onclick = placeOrder;
  updateBankAmount();
}

function updateBankAmount() {
  const host = el('bank-amount');
  if (!host) return;
  const { total } = checkoutTotals();
  host.textContent = formatKip(total);
}

/* ---------------- ແຜນທີ່ ---------------- */

function initMap() {
  const mapEl = el('map');
  if (!window.L) {
    mapEl.innerHTML = '<div class="notice notice-yellow" style="margin:14px">ໂຫຼດແຜນທີ່ບໍ່ໄດ້ — ກະລຸນາເຊື່ອມຕໍ່ອິນເຕີເນັດ ເພື່ອໃຊ້ OpenStreetMap</div>';
    return;
  }

  const center = (checkoutState.settings && checkoutState.settings.mapCenter) || { lat: 17.9757, lng: 102.6331 };
  const map = L.map('map', { scrollWheelZoom: true, zoomControl: true }).setView([center.lat, center.lng], 14);
  L.tileLayer('https://server.arcgisonline.com/ArcGIS/rest/services/World_Street_Map/MapServer/tile/{z}/{y}/{x}', {
    maxZoom: 19,
    attribution: 'Tiles &copy; Esri &mdash; Esri, DeLorme, NAVTEQ'
  }).addTo(map);

  checkoutState.map = map;
  map.on('click', (e) => {
    setLocation(e.latlng, { pan: false, fillAddressIfEmpty: true });
  });

  setTimeout(() => map.invalidateSize(), 250);
}

async function reverseGeocode(lat, lng) {
  try {
    const url = `https://nominatim.openstreetmap.org/reverse?format=jsonv2&lat=${lat}&lon=${lng}&accept-language=lo,en`;
    const res = await fetch(url, { headers: { Accept: 'application/json' } });
    if (!res.ok) return '';
    const data = await res.json();
    return String(data.display_name || '').slice(0, 280);
  } catch {
    return '';
  }
}

async function setLocation(latlng, options = {}) {
  const lat = Number(latlng.lat);
  const lng = Number(latlng.lng);
  if (!Number.isFinite(lat) || !Number.isFinite(lng)) return;

  checkoutState.location = { lat, lng };

  if (checkoutState.map) {
    if (!checkoutState.marker) {
      checkoutState.marker = L.marker([lat, lng], { draggable: true }).addTo(checkoutState.map);
      checkoutState.marker.on('dragend', () => {
        setLocation(checkoutState.marker.getLatLng(), { fillAddressIfEmpty: true });
      });
    } else {
      checkoutState.marker.setLatLng([lat, lng]);
    }
    if (options.pan) checkoutState.map.setView([lat, lng], 16);
  }

  const coords = el('coords-text');
  if (coords) coords.innerHTML = `📍 ພິກັດ: <strong>${lat.toFixed(6)}, ${lng.toFixed(6)}</strong>`;

  if (options.address) {
    el('customer-address').value = options.address;
  } else if (options.fillAddressIfEmpty && !el('customer-address').value.trim()) {
    const addr = await reverseGeocode(lat, lng);
    if (addr && !el('customer-address').value.trim()) el('customer-address').value = addr;
  }
}

async function searchPlace() {
  const input = el('place-search');
  const q = input.value.trim();
  if (!q) { toast('ກະລຸນາພິມທີ່ຢູ່ ຫຼື ເບີໂທ', 'warning'); input.focus(); return; }

  const btn = el('place-search-btn');
  const raw = q.replace(/[\s\-().+]/g, '');

  // ຖ້າເປັນເບີໂທ -> ຄົ້ນຫາລູກຄ້າເກົ່າ
  if (/^\d{6,15}$/.test(raw)) {
    btn.disabled = true;
    btn.innerHTML = '<span class="spinner"></span>';
    try {
      const data = await ShopAPI.get(`/api/customers/lookup?phone=${encodeURIComponent(raw)}`);
      if (!data.found) {
        toast('ບໍ່ພົບເບີນີ້ໃນລະບົບ — ກະລຸນາປ້ອນທີ່ຢູ່ເອງ', 'info');
      } else {
        if (!el('customer-name').value.trim() && data.customer.name) el('customer-name').value = data.customer.name;
        if (data.customer.address) el('customer-address').value = data.customer.address;
        if (data.customer.location) {
          checkoutState.map && checkoutState.map.setView([data.customer.location.lat, data.customer.location.lng], 16);
          setLocation(data.customer.location, {});
        }
        toast('ພົບຂໍ້ມູນລູກຄ້າເກົ່າແລ້ວ', 'success');
      }
    } catch (err) {
      toast(err.message, 'error');
    } finally {
      btn.disabled = false;
      btn.innerHTML = '🔎 ຄົ້ນຫາ';
    }
    return;
  }

  // ຄົ້ນຫາທີ່ຢູ່ດ້ວຍ OpenStreetMap
  btn.disabled = true;
  btn.innerHTML = '<span class="spinner"></span>';
  try {
    const url = `https://nominatim.openstreetmap.org/search?format=jsonv2&limit=1&accept-language=lo,en&q=${encodeURIComponent(q)}`;
    const res = await fetch(url, { headers: { Accept: 'application/json' } });
    if (!res.ok) throw new Error('ຄົ້ນຫາທີ່ຢູ່ບໍ່ສຳເລັດ ກະລຸນາລອງໃໝ່');
    const results = await res.json();
    if (!results.length) {
      toast('ບໍ່ພົບສະຖານທີ່ນີ້ — ລອງພິມໃຫ້ຊັດເຈນຂຶ້ນ', 'warning');
      return;
    }
    const r = results[0];
    const latlng = { lat: Number(r.lat), lng: Number(r.lon) };
    const address = String(r.display_name || q).slice(0, 280);
    if (checkoutState.map) checkoutState.map.setView([latlng.lat, latlng.lng], 16);
    await setLocation(latlng, { address });
    toast('ພົບສະຖານທີ່ ແລະ ປັກໝຸດແລ້ວ', 'success');
  } catch (err) {
    toast(err.message, 'error');
  } finally {
    btn.disabled = false;
    btn.innerHTML = '🔎 ຄົ້ນຫາ';
  }
}

function getMyLocation() {
  const note = el('geo-note');
  const btn = el('get-location');

  if (!window.isSecureContext) note.hidden = false;
  if (!navigator.geolocation) {
    note.hidden = false;
    note.textContent = '⚠️ ອຸປະກອນນີ້ບໍ່ຮອງຮັບ HTML5 Geolocation — ກະລຸນາປັກໝຸດເອງເທິງແຜນທີ່.';
    return;
  }

  const old = btn.innerHTML;
  btn.disabled = true;
  btn.innerHTML = '<span class="spinner"></span> ກຳລັງຫາຕຳແໜ່ງ...';

  navigator.geolocation.getCurrentPosition(
    (pos) => {
      const latlng = { lat: pos.coords.latitude, lng: pos.coords.longitude };
      if (checkoutState.map) checkoutState.map.setView([latlng.lat, latlng.lng], 17);
      setLocation(latlng, { fillAddressIfEmpty: true });
      toast('ດຶງຕຳແໜ່ງ GPS ສຳເລັດ', 'success');
      btn.disabled = false;
      btn.innerHTML = old;
    },
    (err) => {
      const msg = {
        1: 'ທ່ານປະຕິເສດການໃຊ້ GPS — ກະລຸນາອະນຸຍາດ Location ໃນ browser',
        2: 'ຫາຕຳແໜ່ງບໍ່ໄດ້ — ກະລຸນາເປີດ GPS',
        3: 'ໝົດເວລາໃນການຫາຕຳແໜ່ງ — ລອງໃໝ່ອີກຄັ້ງ'
      }[err.code] || 'ດຶງ GPS ບໍ່ສຳເລັດ';
      note.hidden = false;
      note.textContent = `⚠️ ${msg}`;
      toast(msg, 'error');
      btn.disabled = false;
      btn.innerHTML = old;
    },
    { enableHighAccuracy: true, timeout: 12000, maximumAge: 30000 }
  );
}

function clearLocation() {
  checkoutState.location = null;
  if (checkoutState.map && checkoutState.marker) {
    checkoutState.map.removeLayer(checkoutState.marker);
    checkoutState.marker = null;
  }
  el('coords-text').textContent = '📍 ຍັງບໍ່ໄດ້ປັກໝຸດ — ກົດແຜນທີ່ ຫຼື ໃຊ້ GPS';
  toast('ລຶບພິກັດແລ້ວ', 'info');
}

/* ---------------- ການຈ່າຍເງິນ ---------------- */

function paymentMethod() {
  const checked = document.querySelector('input[name="payment"]:checked');
  return checked ? checked.value : 'cod';
}

function updatePaymentUI() {
  const isBank = paymentMethod() === 'bank';
  el('bank-panel').hidden = !isBank;
}

async function handleSlip(file) {
  if (!file) return;
  if (!file.type.startsWith('image/')) { toast('ກະລຸນາເລືອກໄຟລ໌ຮູບພາບ', 'error'); return; }
  if (file.size > 5 * 1024 * 1024) { toast('ຮູບໃຫຍ່ເກີນ 5MB', 'error'); return; }

  const label = el('slip-label');
  const original = label.textContent;
  label.textContent = 'ກຳລັງອັບໂຫຼດ...';

  try {
    const data = await ShopAPI.upload('/api/upload/slip', file);
    checkoutState.slipUrl = data.url;
    el('slip-img').src = mediaUrl(data.url);
    el('slip-preview').hidden = false;
    label.textContent = 'ປ່ຽນຮູບສະລິບ';
    toast('ອັບໂຫຼດສະລິບສຳເລັດ', 'success');
  } catch (err) {
    label.textContent = original;
    toast(err.message, 'error');
  }
}

function removeSlip() {
  checkoutState.slipUrl = '';
  el('slip-input').value = '';
  el('slip-preview').hidden = true;
  el('slip-img').removeAttribute('src');
  el('slip-label').textContent = 'ອັບໂຫຼດສະລິບການໂອນເງິນ';
  toast('ລຶບສະລິບແລ້ວ', 'info');
}

/* ---------------- ສັ່ງຊື້ ---------------- */

async function placeOrder() {
  if (checkoutState.submitting) return;

  const name = el('customer-name').value.trim();
  const phone = el('customer-phone').value.trim();
  const address = el('customer-address').value.trim();
  const note = el('order-note').value.trim();
  const method = paymentMethod();

  const fail = (message) => {
    const host = el('checkout-alert');
    if (host) host.innerHTML = `<div class="notice notice-red">${escapeHtml(message)}</div>`;
    toast(message, 'error');
    return false;
  };

  if (name.length < 2) { el('customer-name').focus(); return fail('ກະລຸນາປ້ອນຊື່ລູກຄ້າ'); }
  if (phone.replace(/\D/g, '').length < 6) { el('customer-phone').focus(); return fail('ກະລຸນາປ້ອນເບີໂທໃຫ້ຖືກຕ້ອງ'); }
  if (address.length < 5) { el('customer-address').focus(); return fail('ກະລຸນາປ້ອນທີ່ຢູ່ຈັດສົ່ງໃຫ້ຊັດເຈນ'); }
  if (method === 'bank' && !checkoutState.slipUrl) return fail('ກະລຸນາອັບໂຫຼດສະລິບການໂອນເງິນກ່ອນ');

  const items = Cart.read().map((i) => ({ productId: i.id, qty: i.qty }));
  if (!items.length) { window.location.href = '/cart.html'; return; }

  const btn = el('place-order');
  checkoutState.submitting = true;
  btn.disabled = true;
  btn.innerHTML = '<span class="spinner"></span> ກຳລັງສົ່ງອໍເດີ້...';

  try {
    const data = await ShopAPI.post('/api/orders', {
      items,
      customer: { name, phone, address },
      location: checkoutState.location,
      payment: { method, slip: checkoutState.slipUrl },
      note
    });

    Cart.clear();
    localStorage.setItem('pos_customer', JSON.stringify({ name, phone, address }));
    localStorage.setItem('pos_last_order', data.order.code);
    window.location.href = `/success.html?code=${encodeURIComponent(data.order.code)}`;
  } catch (err) {
    fail(err.message);
    btn.disabled = false;
    btn.innerHTML = '✅ ຢືນຢັນສັ່ງຊື້';
    checkoutState.submitting = false;
  }
}

/* ---------------- ເລີ່ມຕົ້ນ ---------------- */

function prefillCustomer() {
  try {
    const saved = JSON.parse(localStorage.getItem('pos_customer') || 'null');
    if (!saved) return;
    if (saved.name) el('customer-name').value = saved.name;
    if (saved.phone) el('customer-phone').value = saved.phone;
    if (saved.address) el('customer-address').value = saved.address;
  } catch { /* ignore */ }
}

document.addEventListener('DOMContentLoaded', async () => {
  initChrome('cart');

  if (!Cart.count()) {
    window.location.replace('/cart.html');
    return;
  }

  prefillCustomer();
  renderSummary();

  document.querySelectorAll('input[name="payment"]').forEach((radio) => {
    radio.addEventListener('change', updatePaymentUI);
  });
  el('place-search-btn').onclick = searchPlace;
  el('place-search').addEventListener('keydown', (e) => {
    if (e.key === 'Enter') { e.preventDefault(); searchPlace(); }
  });
  el('get-location').onclick = getMyLocation;
  el('clear-location').onclick = clearLocation;
  el('slip-input').addEventListener('change', (e) => handleSlip(e.target.files && e.target.files[0]));
  el('slip-remove').onclick = removeSlip;

  try {
    const settings = await getShopSettings();
    checkoutState.settings = settings || {};
    if (settings) {
      el('qr-image').src = mediaUrl(settings.qrImage || '/img/seed/bank-qr.svg');
      el('bank-name').textContent = settings.bankName || '—';
      el('bank-account-name').textContent = settings.bankAccountName || '—';
      el('bank-account-number').textContent = settings.bankAccountNumber || '—';
    }
  } catch {
    /* ໃຊ້ຄ່າເລີ່ມຕົ້ນ */
  }

  renderSummary();
  updatePaymentUI();
  initMap();
});
