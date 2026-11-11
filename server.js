'use strict';

const express = require('express');
const path = require('path');
const fs = require('fs');
const os = require('os');
const crypto = require('crypto');
const multer = require('multer');

const db = require('./server/db');

const app = express();
const PORT = Number(process.env.PORT) || 3001;
const ROOT = __dirname;
const PUBLIC_DIR = path.join(ROOT, 'public');
const UPLOAD_DIR = process.env.UPLOAD_DIR ? path.resolve(process.env.UPLOAD_DIR) : path.join(PUBLIC_DIR, 'uploads');
const SESSION_TTL = 12 * 60 * 60 * 1000; // 12 ຊົ່ວໂມງ

fs.mkdirSync(UPLOAD_DIR, { recursive: true });
db.load();

app.disable('x-powered-by');
app.set('trust proxy', true);

/* ------------------------------------------------------------------ */
/*  CORS — ໃຫ້ frontend ຢູ່ໂຮດອື່ນ (Cloudflare Pages) ເອີ້ນ API ໄດ້  */
/* ------------------------------------------------------------------ */

const CORS_ORIGINS = String(process.env.CORS_ORIGINS || '*')
  .split(',')
  .map((s) => s.trim())
  .filter(Boolean);

app.use((req, res, next) => {
  const origin = req.headers.origin;
  if (!origin) return next();

  const allowAll = CORS_ORIGINS.includes('*');
  const allowed = allowAll || CORS_ORIGINS.includes(origin);

  if (allowed) {
    res.setHeader('Access-Control-Allow-Origin', allowAll ? '*' : origin);
    res.setHeader('Vary', 'Origin');
    res.setHeader('Access-Control-Allow-Methods', 'GET,POST,PUT,PATCH,DELETE,OPTIONS');
    res.setHeader('Access-Control-Allow-Headers', 'Content-Type, Authorization');
    res.setHeader('Access-Control-Max-Age', '86400');
    res.setHeader('Access-Control-Expose-Headers', 'Content-Length');
  }

  if (req.method === 'OPTIONS') return res.status(204).end();
  next();
});

const ORDER_STATUSES = [
  { id: 'preparing', label: 'ກຳລັງກຽມເຄື່ອງ', color: 'yellow' },
  { id: 'shipping', label: 'ກຳລັງຈັດສົ່ງ', color: 'blue' },
  { id: 'delivered', label: 'ຈັດສົ່ງສຳເລັດແລ້ວ', color: 'green' },
  { id: 'cancelled', label: 'ຍົກເລີກ', color: 'red' }
];

/* ------------------------------------------------------------------ */
/*  ເຄື່ອງມືຊ່ວຍ                                                  */
/* ------------------------------------------------------------------ */

const str = (v, max = 300) => (typeof v === 'string' ? v.trim().slice(0, max) : '');
const digits = (v) => String(v || '').replace(/\D/g, '');
const nowIso = () => new Date().toISOString();
const isInt = (v) => Number.isInteger(v);

function localDate(d = new Date()) {
  return new Date(d.getTime() - d.getTimezoneOffset() * 60000).toISOString().slice(0, 10);
}

function badRequest(message, status = 400) {
  const err = new Error(message);
  err.status = status;
  err.expose = true;
  return err;
}

function safeLocalPath(value) {
  const p = str(value, 500);
  if (!p) return '';
  if (!p.startsWith('/') || p.startsWith('//') || p.includes('..') || /\s/.test(p)) return '';
  return p;
}

/* ---- rate limit ແບບງ່າຍໆ (in-memory) ---- */
const buckets = new Map();
function isLimited(key, max, windowMs) {
  const now = Date.now();
  let b = buckets.get(key);
  if (!b || b.resetAt <= now) {
    b = { count: 0, resetAt: now + windowMs };
    buckets.set(key, b);
  }
  b.count += 1;
  return b.count > max;
}
setInterval(() => {
  const now = Date.now();
  for (const [k, v] of buckets) if (v.resetAt <= now) buckets.delete(k);
}, 10 * 60 * 1000).unref();

/* ---- session ---- */
const sessions = new Map();
setInterval(() => {
  const now = Date.now();
  for (const [k, v] of sessions) if (v.expires <= now) sessions.delete(k);
}, 30 * 60 * 1000).unref();

function createSession() {
  const token = crypto.randomBytes(32).toString('hex');
  sessions.set(token, { createdAt: Date.now(), expires: Date.now() + SESSION_TTL });
  return token;
}

function requireAdmin(req, res, next) {
  const header = req.headers.authorization || '';
  const token = header.startsWith('Bearer ') ? header.slice(7).trim() : '';
  const session = token ? sessions.get(token) : null;
  if (!session || session.expires <= Date.now()) {
    if (token) sessions.delete(token);
    return res.status(401).json({ error: 'ກະລຸນາເຂົ້າສູ່ລະບົບຄືນໃໝ່' });
  }
  session.expires = Date.now() + SESSION_TTL;
  req.adminToken = token;
  next();
}

/* ------------------------------------------------------------------ */
/*  ອັບໂຫຼດຮູບ                                                      */
/* ------------------------------------------------------------------ */

const IMAGE_EXT = {
  'image/jpeg': '.jpg',
  'image/png': '.png',
  'image/webp': '.webp',
  'image/gif': '.gif'
};

const storage = multer.diskStorage({
  destination: (_req, _file, cb) => cb(null, UPLOAD_DIR),
  filename: (_req, file, cb) => {
    const ext = IMAGE_EXT[file.mimetype] || '.bin';
    cb(null, `${Date.now()}-${crypto.randomBytes(5).toString('hex')}${ext}`);
  }
});

const upload = multer({
  storage,
  limits: { fileSize: 5 * 1024 * 1024, files: 1 },
  fileFilter: (_req, file, cb) => {
    if (!IMAGE_EXT[file.mimetype]) {
      const err = new Error('ຮອງຮັບສະເພາະຮູບ JPG, PNG, WEBP ຫຼື GIF');
      err.code = 'INVALID_TYPE';
      return cb(err);
    }
    cb(null, true);
  }
});

function uploadSingle(field) {
  return (req, res, next) => {
    upload.single(field)(req, res, (err) => {
      if (!err) return next();
      if (err.code === 'LIMIT_FILE_SIZE') {
        return res.status(400).json({ error: 'ຮູບໃຫຍ່ເກີນ 5MB' });
      }
      return res.status(400).json({ error: err.message || 'ອັບໂຫຼດຮູບບໍ່ສຳເລັດ' });
    });
  };
}

/* ------------------------------------------------------------------ */
/*  ຕົວຊ່ວຍສຳລັບ order                                              */
/* ------------------------------------------------------------------ */

function statusInfo(id) {
  return ORDER_STATUSES.find((s) => s.id === id) || ORDER_STATUSES[0];
}

function presentOrder(order) {
  const s = statusInfo(order.status);
  return {
    ...order,
    statusLabel: s.label,
    statusColor: s.color,
    paymentLabel: order.payment.method === 'bank' ? 'ໂອນທະນາຄານ (QR)' : 'ຈ່າຍປາຍທາງ (COD)'
  };
}

function newOrderCode() {
  const d = new Date();
  const ymd =
    String(d.getFullYear()).slice(2) +
    String(d.getMonth() + 1).padStart(2, '0') +
    String(d.getDate()).padStart(2, '0');
  let code;
  do {
    code = `ORD${ymd}-${String(Math.floor(Math.random() * 9000) + 1000)}`;
  } while (db.data.orders.some((o) => o.code === code));
  return code;
}

/* ------------------------------------------------------------------ */
/*  Middleware                                                       */
/* ------------------------------------------------------------------ */

app.use(express.json({ limit: '1mb' }));
app.use((req, res, next) => {
  res.setHeader('X-Content-Type-Options', 'nosniff');
  res.setHeader('Referrer-Policy', 'same-origin');
  next();
});

/* ------------------------------------------------------------------ */
/*  API — ສາທາລະນະ                                                  */
/* ------------------------------------------------------------------ */

app.get('/api/health', (_req, res) => res.json({ ok: true, time: nowIso() }));

app.get('/api/settings', (_req, res) => {
  const s = db.data.settings;
  res.json({
    shopName: s.shopName,
    phone: s.phone,
    address: s.address,
    deliveryFee: s.deliveryFee,
    currency: s.currency,
    bankName: s.bankName,
    bankAccountName: s.bankAccountName,
    bankAccountNumber: s.bankAccountNumber,
    qrImage: s.qrImage,
    mapCenter: s.mapCenter,
    lowStockThreshold: s.lowStockThreshold
  });
});

app.get('/api/meta', (_req, res) => {
  res.json({
    statuses: ORDER_STATUSES,
    categories: [...new Set(db.data.products.filter((p) => p.active).map((p) => p.category))],
    currency: db.data.settings.currency
  });
});

app.get('/api/products', (req, res) => {
  const q = str(req.query.q, 100).toLowerCase();
  const category = str(req.query.category, 60);
  const sort = str(req.query.sort, 20);

  let list = db.data.products.filter((p) => p.active !== false);
  if (category) list = list.filter((p) => p.category === category);
  if (q) {
    list = list.filter(
      (p) =>
        p.name.toLowerCase().includes(q) ||
        (p.description || '').toLowerCase().includes(q) ||
        (p.category || '').toLowerCase().includes(q)
    );
  }

  if (sort === 'price-asc') list = list.sort((a, b) => a.price - b.price);
  else if (sort === 'price-desc') list = list.sort((a, b) => b.price - a.price);
  else if (sort === 'name') list = list.sort((a, b) => a.name.localeCompare(b.name, 'lo'));
  else list = list.sort((a, b) => new Date(b.createdAt) - new Date(a.createdAt));

  res.json({
    products: list,
    categories: [...new Set(db.data.products.filter((p) => p.active).map((p) => p.category))]
  });
});

app.get('/api/products/:id', (req, res, next) => {
  const product = db.data.products.find((p) => p.id === req.params.id && p.active !== false);
  if (!product) return next(badRequest('ບໍ່ພົບສິນຄ້ານີ້', 404));
  const related = db.data.products
    .filter((p) => p.active !== false && p.id !== product.id && p.category === product.category)
    .slice(0, 4);
  res.json({ product, related });
});

/* ---- ສ້າງອໍເດີ້ ---- */
app.post('/api/orders', (req, res, next) => {
  try {
    const body = req.body || {};
    const customerName = str(body.customer && body.customer.name, 100);
    const phoneDigits = digits(body.customer && body.customer.phone);
    const address = str(body.customer && body.customer.address, 300);
    const note = str(body.note, 300);

    if (customerName.length < 2) throw badRequest('ກະລຸນາປ້ອນຊື່ລູກຄ້າ');
    if (phoneDigits.length < 6 || phoneDigits.length > 15) throw badRequest('ເບີໂທລະສັບບໍ່ຖືກຕ້ອງ');
    if (address.length < 5) throw badRequest('ກະລຸນາປ້ອນທີ່ຢູ່ຈັດສົ່ງໃຫ້ຊັດເຈນ');

    const rawItems = Array.isArray(body.items) ? body.items : [];
    if (!rawItems.length) throw badRequest('ກະຕ່າສິນຄ້າຫວ່າງເປົ່າ');
    if (rawItems.length > 50) throw badRequest('ຈຳນວນລາຍການໃນກະຕ່າຫຼາຍເກີນໄປ');

    const merged = new Map();
    for (const item of rawItems) {
      const productId = str(item && item.productId, 80);
      const qty = Math.floor(Number(item && item.qty));
      if (!productId || !isInt(qty) || qty < 1 || qty > 999) {
        throw badRequest('ຂໍ້ມູນສິນຄ້າໃນກະຕ່າບໍ່ຖືກຕ້ອງ');
      }
      merged.set(productId, (merged.get(productId) || 0) + qty);
    }

    const items = [];
    for (const [productId, qty] of merged) {
      const product = db.data.products.find((p) => p.id === productId && p.active !== false);
      if (!product) throw badRequest('ມີສິນຄ້າໃນກະຕ່າທີ່ບໍ່ມີໃນລະບົບແລ້ວ');
      if (product.stock < qty) {
        throw badRequest(`ສິນຄ້າ "${product.name}" ສະຕັອກບໍ່ພຽງພໍ (ຍັງເຫຼືອ ${product.stock})`);
      }
      items.push({
        productId: product.id,
        name: product.name,
        price: product.price,
        image: product.image,
        qty,
        lineTotal: product.price * qty
      });
    }

    let location = null;
    if (body.location && Number.isFinite(Number(body.location.lat)) && Number.isFinite(Number(body.location.lng))) {
      const lat = Number(body.location.lat);
      const lng = Number(body.location.lng);
      if (lat >= -90 && lat <= 90 && lng >= -180 && lng <= 180) location = { lat, lng };
    }

    const method = body.payment && body.payment.method === 'bank' ? 'bank' : 'cod';
    const slip = method === 'bank' ? safeLocalPath(body.payment && body.payment.slip) : '';
    if (method === 'bank' && !slip) throw badRequest('ກະລຸນາອັບໂຫຼດສະລິບຫຼັກຖານການໂອນເງິນ');

    const subtotal = items.reduce((sum, i) => sum + i.lineTotal, 0);
    const feeSetting = Number(db.data.settings.deliveryFee);
    const deliveryFee = Number.isFinite(feeSetting) && feeSetting >= 0 ? feeSetting : 0;
    const total = subtotal + deliveryFee;

    // ຕັດສະຕັອກ
    for (const item of items) {
      const product = db.data.products.find((p) => p.id === item.productId);
      product.stock -= item.qty;
      product.updatedAt = nowIso();
    }

    const ts = nowIso();
    const order = {
      id: db.newId('ord_'),
      code: newOrderCode(),
      items,
      subtotal,
      deliveryFee,
      total,
      customer: { name: customerName, phone: phoneDigits, address },
      location,
      payment: { method, slip },
      note,
      status: 'preparing',
      history: [{ status: 'preparing', at: ts }],
      createdAt: ts,
      updatedAt: ts
    };

    db.data.orders.push(order);
    db.save();

    res.status(201).json({ order: presentOrder(order) });
  } catch (err) {
    next(err);
  }
});

/* ---- ຕິດຕາມອໍເດີ້ ---- */
app.get('/api/orders/track/:code', (req, res, next) => {
  const code = str(req.params.code, 40).toUpperCase();
  const order = db.data.orders.find((o) => o.code.toUpperCase() === code);
  if (!order) return next(badRequest('ບໍ່ພົບອໍເດີ້ລະຫັດນີ້', 404));
  res.json({ order: presentOrder(order) });
});

/* ---- ຄົ້ນຫາຂໍ້ມູນລູກຄ້າຈາກເບີໂທ (ໃຊ້ຕອນ checkout) ---- */
app.get('/api/customers/lookup', (req, res) => {
  const phone = digits(req.query.phone);
  if (phone.length < 6) return res.status(400).json({ error: 'ເບີໂທບໍ່ຖືກຕ້ອງ' });

  const found = db.data.orders
    .filter((o) => digits(o.customer.phone) === phone)
    .sort((a, b) => new Date(b.createdAt) - new Date(a.createdAt))[0];

  if (!found) return res.json({ found: false });
  res.json({
    found: true,
    customer: {
      name: found.customer.name,
      address: found.customer.address,
      location: found.location
    }
  });
});

/* ---- ອັບໂຫຼດສະລິບ (ສາທາລະນະ) ---- */
app.post(
  '/api/upload/slip',
  (req, res, next) => {
    if (isLimited(`slip:${req.ip}`, 30, 60 * 60 * 1000)) {
      return res.status(429).json({ error: 'ອັບໂຫຼດຫຼາຍເກີນໄປ ກະລຸນາລອງໃໝ່ພາຍຫຼັງ' });
    }
    next();
  },
  uploadSingle('image'),
  (req, res) => {
    if (!req.file) return res.status(400).json({ error: 'ບໍ່ພົບຮູບທີ່ອັບໂຫຼດ' });
    res.status(201).json({ url: `/uploads/${req.file.filename}` });
  }
);

/* ------------------------------------------------------------------ */
/*  API — ແອັດມິນ                                                   */
/* ------------------------------------------------------------------ */

app.post('/api/admin/login', (req, res) => {
  if (isLimited(`login:${req.ip}`, 15, 15 * 60 * 1000)) {
    return res.status(429).json({ error: 'ພະຍາຍາມເຂົ້າສູ່ລະບົບຫຼາຍເກີນໄປ ກະລຸນາລໍຖ້າ 15 ນາທີ' });
  }
  const username = str(req.body && req.body.username, 60);
  const password = typeof (req.body && req.body.password) === 'string' ? req.body.password : '';

  if (username !== db.data.admin.username || !db.checkPassword(password, db.data.admin.passwordHash)) {
    return res.status(401).json({ error: 'ຊື່ຜູ້ໃຊ້ ຫຼື ລະຫັດຜ່ານບໍ່ຖືກຕ້ອງ' });
  }

  const token = createSession();
  res.json({ token, admin: { username: db.data.admin.username, name: db.data.admin.name } });
});

app.post('/api/admin/logout', requireAdmin, (req, res) => {
  sessions.delete(req.adminToken);
  res.json({ ok: true });
});

app.get('/api/admin/me', requireAdmin, (_req, res) => {
  res.json({ admin: { username: db.data.admin.username, name: db.data.admin.name } });
});

app.get('/api/admin/stats', requireAdmin, (_req, res) => {
  const orders = db.data.orders;
  const products = db.data.products.filter((p) => p.active !== false);
  const today = localDate();
  const activeOrders = orders.filter((o) => o.status !== 'cancelled');

  const last7 = [];
  for (let i = 6; i >= 0; i -= 1) {
    const d = new Date();
    d.setDate(d.getDate() - i);
    const key = localDate(d);
    const dayOrders = activeOrders.filter((o) => localDate(new Date(o.createdAt)) === key);
    last7.push({
      date: key,
      label: `${d.getDate()}/${d.getMonth() + 1}`,
      orders: dayOrders.length,
      total: dayOrders.reduce((s, o) => s + o.total, 0)
    });
  }

  const threshold = Number(db.data.settings.lowStockThreshold) || 10;
  const todayOrders = orders.filter((o) => localDate(new Date(o.createdAt)) === today);

  res.json({
    totals: {
      revenue: activeOrders.reduce((s, o) => s + o.total, 0),
      deliveredRevenue: orders.filter((o) => o.status === 'delivered').reduce((s, o) => s + o.total, 0),
      orders: orders.length,
      preparing: orders.filter((o) => o.status === 'preparing').length,
      shipping: orders.filter((o) => o.status === 'shipping').length,
      delivered: orders.filter((o) => o.status === 'delivered').length,
      cancelled: orders.filter((o) => o.status === 'cancelled').length,
      products: products.length,
      lowStock: products.filter((p) => p.stock <= threshold).length,
      todayOrders: todayOrders.length,
      todayRevenue: todayOrders.filter((o) => o.status !== 'cancelled').reduce((s, o) => s + o.total, 0)
    },
    last7,
    recentOrders: [...orders]
      .sort((a, b) => new Date(b.createdAt) - new Date(a.createdAt))
      .slice(0, 5)
      .map(presentOrder),
    lowStockProducts: products
      .filter((p) => p.stock <= threshold)
      .sort((a, b) => a.stock - b.stock)
      .slice(0, 5)
  });
});

app.get('/api/admin/orders', requireAdmin, (req, res) => {
  const status = str(req.query.status, 30);
  const q = str(req.query.q, 100).toLowerCase();
  let list = [...db.data.orders];

  if (status && status !== 'all') list = list.filter((o) => o.status === status);
  if (q) {
    list = list.filter(
      (o) =>
        o.code.toLowerCase().includes(q) ||
        o.customer.name.toLowerCase().includes(q) ||
        digits(o.customer.phone).includes(digits(q) || q)
    );
  }
  list.sort((a, b) => new Date(b.createdAt) - new Date(a.createdAt));
  res.json({ orders: list.map(presentOrder) });
});

app.get('/api/admin/orders/:id', requireAdmin, (req, res, next) => {
  const order = db.data.orders.find((o) => o.id === req.params.id || o.code === req.params.id);
  if (!order) return next(badRequest('ບໍ່ພົບອໍເດີ້', 404));
  res.json({ order: presentOrder(order) });
});

app.patch('/api/admin/orders/:id/status', requireAdmin, (req, res, next) => {
  try {
    const order = db.data.orders.find((o) => o.id === req.params.id || o.code === req.params.id);
    if (!order) throw badRequest('ບໍ່ພົບອໍເດີ້', 404);

    const status = str(req.body && req.body.status, 30);
    if (!ORDER_STATUSES.some((s) => s.id === status)) throw badRequest('ສະຖານະບໍ່ຖືກຕ້ອງ');
    if (order.status === status) return res.json({ order: presentOrder(order) });

    // ຖ້າຍົກເລີກ -> ຄືນສະຕັອກ ; ຖ້າເປີດຄືນຈາກຍົກເລີກ -> ຕັດສະຕັອກຄືນ
    if (status === 'cancelled' && order.status !== 'cancelled') {
      for (const item of order.items) {
        const product = db.data.products.find((p) => p.id === item.productId);
        if (product) {
          product.stock += item.qty;
          product.updatedAt = nowIso();
        }
      }
    } else if (order.status === 'cancelled' && status !== 'cancelled') {
      for (const item of order.items) {
        const product = db.data.products.find((p) => p.id === item.productId);
        if (!product || product.stock < item.qty) {
          throw badRequest(`ສະຕັອກ "${item.name}" ບໍ່ພຽງພໍທີ່ຈະເປີດອໍເດີ້ຄືນ`);
        }
      }
      for (const item of order.items) {
        const product = db.data.products.find((p) => p.id === item.productId);
        product.stock -= item.qty;
        product.updatedAt = nowIso();
      }
    }

    order.status = status;
    order.updatedAt = nowIso();
    order.history = order.history || [];
    order.history.push({ status, at: order.updatedAt });
    db.save();
    res.json({ order: presentOrder(order) });
  } catch (err) {
    next(err);
  }
});

/* ---- ສິນຄ້າ (ແອັດມິນ) ---- */
app.get('/api/admin/products', requireAdmin, (req, res) => {
  const q = str(req.query.q, 100).toLowerCase();
  let list = [...db.data.products];
  if (q) {
    list = list.filter(
      (p) => p.name.toLowerCase().includes(q) || (p.category || '').toLowerCase().includes(q)
    );
  }
  list.sort((a, b) => new Date(b.createdAt) - new Date(a.createdAt));
  res.json({
    products: list,
    categories: [...new Set(db.data.products.map((p) => p.category))]
  });
});

function readProductInput(body) {
  const name = str(body.name, 120);
  const category = str(body.category, 60) || 'ອື່ນໆ';
  const price = Number(body.price);
  const stock = Number(body.stock);
  const image = safeLocalPath(body.image) || '/img/seed/placeholder.svg';
  const description = str(body.description, 1000);

  if (name.length < 2) throw badRequest('ກະລຸນາປ້ອນຊື່ສິນຄ້າ (ຢ່າງໜ້ອຍ 2 ຕົວອັກສອນ)');
  if (!Number.isFinite(price) || price < 0 || price > 1e12) throw badRequest('ລາຄາບໍ່ຖືກຕ້ອງ');
  if (!isInt(stock) || stock < 0 || stock > 1000000) throw badRequest('ຈຳນວນສະຕັອກຕ້ອງເປັນຈຳນວນເຕັມ 0 ຫຼື ຫຼາຍກວ່າ');

  return { name, category, price: Math.round(price), stock, image, description };
}

app.post('/api/admin/products', requireAdmin, (req, res, next) => {
  try {
    const input = readProductInput(req.body || {});
    const ts = nowIso();
    const product = {
      id: db.newId('prd_'),
      ...input,
      active: true,
      createdAt: ts,
      updatedAt: ts
    };
    db.data.products.push(product);
    db.save();
    res.status(201).json({ product });
  } catch (err) {
    next(err);
  }
});

app.put('/api/admin/products/:id', requireAdmin, (req, res, next) => {
  try {
    const product = db.data.products.find((p) => p.id === req.params.id);
    if (!product) throw badRequest('ບໍ່ພົບສິນຄ້າ', 404);
    const input = readProductInput(req.body || {});
    Object.assign(product, input, { updatedAt: nowIso() });
    db.save();
    res.json({ product });
  } catch (err) {
    next(err);
  }
});

app.delete('/api/admin/products/:id', requireAdmin, (req, res, next) => {
  try {
    const index = db.data.products.findIndex((p) => p.id === req.params.id);
    if (index === -1) throw badRequest('ບໍ່ພົບສິນຄ້າ', 404);
    const product = db.data.products[index];
    const used = db.data.orders.some((o) => o.items.some((i) => i.productId === product.id));

    if (used) {
      // ມີໃນອໍເດີ້ແລ້ວ -> ເກັບປະຫວັດໄວ້ ແລະ ສະຫຼັບເປັນ "ບໍ່ເປີດຂາຍ"
      product.active = false;
      product.updatedAt = nowIso();
      db.save();
      return res.json({ ok: true, softDeleted: true, product });
    }

    db.data.products.splice(index, 1);
    db.save();
    res.json({ ok: true, softDeleted: false });
  } catch (err) {
    next(err);
  }
});

/* ---- ຕັ້ງຄ່າຮ້ານ ---- */
app.get('/api/admin/settings', requireAdmin, (_req, res) => {
  res.json({ settings: db.data.settings, admin: { username: db.data.admin.username, name: db.data.admin.name } });
});

app.put('/api/admin/settings', requireAdmin, (req, res, next) => {
  try {
    const body = req.body || {};
    const s = db.data.settings;
    const nextSettings = {
      shopName: str(body.shopName, 120),
      phone: str(body.phone, 40),
      address: str(body.address, 300),
      bankName: str(body.bankName, 120),
      bankAccountName: str(body.bankAccountName, 120),
      bankAccountNumber: str(body.bankAccountNumber, 60),
      deliveryFee: Number(body.deliveryFee),
      lowStockThreshold: Number(body.lowStockThreshold),
      qrImage: safeLocalPath(body.qrImage) || s.qrImage
    };

    if (nextSettings.shopName.length < 2) throw badRequest('ກະລຸນາປ້ອນຊື່ຮ້ານ');
    if (!Number.isFinite(nextSettings.deliveryFee) || nextSettings.deliveryFee < 0) {
      throw badRequest('ຄ່າຈັດສົ່ງບໍ່ຖືກຕ້ອງ');
    }
    if (!isInt(nextSettings.lowStockThreshold) || nextSettings.lowStockThreshold < 0) {
      throw badRequest('ເກນເຕືອນສະຕັອກຕ້ອງເປັນຈຳນວນເຕັມ');
    }

    Object.assign(s, nextSettings, { deliveryFee: Math.round(nextSettings.deliveryFee) });
    db.save();
    res.json({ settings: s });
  } catch (err) {
    next(err);
  }
});

/* ---- ອັບໂຫຼດຮູບ (ແອັດມິນ) ---- */
app.post('/api/admin/upload', requireAdmin, uploadSingle('image'), (req, res) => {
  if (!req.file) return res.status(400).json({ error: 'ບໍ່ພົບຮູບທີ່ອັບໂຫຼດ' });
  res.status(201).json({ url: `/uploads/${req.file.filename}` });
});

/* ------------------------------------------------------------------ */
/*  Static + error handling                                          */
/* ------------------------------------------------------------------ */

app.use('/uploads', express.static(UPLOAD_DIR, { maxAge: '7d', fallthrough: true }));
app.use(express.static(PUBLIC_DIR, { extensions: ['html'] }));

app.use('/api', (_req, res) => res.status(404).json({ error: 'ບໍ່ພົບ API ນີ້' }));

app.use((err, _req, res, _next) => {
  if (err && err.type === 'entity.parse.failed') {
    return res.status(400).json({ error: 'ຂໍ້ມູນທີ່ສົ່ງມາບໍ່ຖືກຮູບແບບ JSON' });
  }
  if (err && err.status && err.expose) {
    return res.status(err.status).json({ error: err.message });
  }
  console.error('❌', err);
  res.status(500).json({ error: 'ເກີດຂໍ້ຜິດພາດໃນລະບົບ ກະລຸນາລອງໃໝ່' });
});

/* ------------------------------------------------------------------ */
/*  ເປີດ server                                                      */
/* ------------------------------------------------------------------ */

const server = app.listen(PORT, () => {
  const nets = os.networkInterfaces();
  const lanIps = [];
  for (const list of Object.values(nets)) {
    for (const net of list || []) {
      if (net.family === 'IPv4' && !net.internal) lanIps.push(net.address);
    }
  }

  console.log('');
  console.log('  ╔══════════════════════════════════════════════╗');
  console.log('  ║   🛒  ລະບົບຂາຍສິນຄ້າ POS — ຮ້ານ ສະບາຍດີ          ║');
  console.log('  ╚══════════════════════════════════════════════╝');
  console.log(`  ໜ້າຮ້ານ   : http://localhost:${PORT}`);
  console.log(`  ແອັດມິນ  : http://localhost:${PORT}/admin`);
  if (lanIps.length) {
    console.log(`  ໃນເຄືອຂ່າຍ: ${lanIps.map((ip) => `http://${ip}:${PORT}`).join('  ')}`);
  }
  console.log('  ຜູ້ໃຊ້   : admin / admin');
  console.log('');
});

server.on('error', (err) => {
  if (err.code === 'EADDRINUSE') {
    console.error(`\n❌ ພອດ ${PORT} ຖືກໃຊ້ຢູ່ແລ້ວ. ລອງໃຊ້: set PORT=3001 && npm start\n`);
    process.exit(1);
  }
  throw err;
});

for (const sig of ['SIGINT', 'SIGTERM']) {
  process.on(sig, () => {
    try { db.save(); } catch { }
    server.close(() => process.exit(0));
  });
}
