'use strict';

/**
 * ຖານຂໍ້ມູນແບບໄຟລ໌ JSON (ບໍ່ຕ້ອງຕິດຕັ້ງ native module)
 * - ຂໍ້ມູນທັງໝົດຢູ່ໃນ data/db.json
 * - ຂຽນແບບ atomic (tmp -> rename) ເພື່ອກັນໄຟລ໌ເສຍຫາຍ
 */

const fs = require('fs');
const path = require('path');
const crypto = require('crypto');

const ROOT = path.join(__dirname, '..');
const DATA_DIR = process.env.DATA_DIR ? path.resolve(process.env.DATA_DIR) : path.join(ROOT, 'data');
const DB_FILE = path.join(DATA_DIR, 'db.json');

let data = null;

const nowIso = () => new Date().toISOString();
const newId = (prefix = '') => prefix + crypto.randomBytes(6).toString('hex');

function hashPassword(password, salt = crypto.randomBytes(16).toString('hex')) {
  const hash = crypto.scryptSync(String(password), salt, 64).toString('hex');
  return `${salt}:${hash}`;
}

function checkPassword(password, stored) {
  try {
    const [salt, hash] = String(stored).split(':');
    if (!salt || !hash) return false;
    const expected = Buffer.from(hash, 'hex');
    const actual = crypto.scryptSync(String(password), salt, expected.length);
    return expected.length === actual.length && crypto.timingSafeEqual(expected, actual);
  } catch {
    return false;
  }
}

const seedProducts = [
  {
    name: 'ກາເຟລາວ ບໍ່ບົດ 500g',
    category: 'ເຄື່ອງດື່ມ',
    price: 68000,
    stock: 24,
    image: '/img/seed/coffee.svg',
    description: 'ກາເຟອາຣາບິກາຈາກພູເບັ້ຍ ບໍ່ບົດ ຄົວແບບມີເອກະລັກ ຫອມ ຝາດ ກົມກຽວ.'
  },
  {
    name: 'ເຂົ້າຈີ່ຝຣັ່ງ',
    category: 'ອາຫານ',
    price: 12000,
    stock: 40,
    image: '/img/seed/bread.svg',
    description: 'ເຂົ້າຈີ່ສົດໃໝ່ທຸກເຊົ້າ ກອບນອກ ນຸ້ມໃນ ເໝາະກັບອາຫານເຊົ້າ.'
  },
  {
    name: 'ນ້ຳດື່ມດີສະຕິນ 600ml',
    category: 'ເຄື່ອງດື່ມ',
    price: 4000,
    stock: 120,
    image: '/img/seed/water.svg',
    description: 'ນ້ຳດື່ມສະອາດ ບໍລິສຸດ ຂະໜາດ 600ml ສຳລັບໃຊ້ປະຈຳວັນ.'
  },
  {
    name: 'ນ້ຳຜຶ້ງດອກລຳໄຍ 350g',
    category: 'ອາຫານ',
    price: 45000,
    stock: 15,
    image: '/img/seed/honey.svg',
    description: 'ນ້ຳຜຶ້ງທຳມະຊາດ 100% ຈາກດອກລຳໄຍ ຫວານກົມ ກິ່ນຫອມ ໃຊ້ໄດ້ທັງອາຫານ ແລະ ສຸຂະພາບ.'
  },
  {
    name: 'ຊາໄຂ່ມຸກ',
    category: 'ເຄື່ອງດື່ມ',
    price: 20000,
    stock: 30,
    image: '/img/seed/boba.svg',
    description: 'ຊານົມໄຂ່ມຸກ ຫວານພໍດີ ມີໄຂ່ມຸກໜຽວ ດື່ມແລ້ວສົດຊື່ນ.'
  },
  {
    name: 'ເຂົ້າສານຫອມມະລິ 5kg',
    category: 'ອາຫານ',
    price: 32000,
    stock: 18,
    image: '/img/seed/rice.svg',
    description: 'ເຂົ້າສານຫອມມະລິ ຄຸນນະພາບດີ ຫຸ້ງງ່າຍ ນຸ້ມຫອມ ຂະໜາດ 5 ກິໂລ.'
  },
  {
    name: 'ສະບູສະໝຸນໄພ',
    category: 'ຂອງໃຊ້',
    price: 15000,
    stock: 25,
    image: '/img/seed/soap.svg',
    description: 'ສະບູສະໝຸນໄພ ອ່ອນໂຍນຕໍ່ຜິວ ສຳລັບຜິວແຫ້ງ ຫຼື ຜິວອ່ອນໄຫວ.'
  },
  {
    name: 'ຂະໜົມຄຸກກີ້ ຊັອກໂກແລັດ',
    category: 'ຂອງຫວານ',
    price: 25000,
    stock: 22,
    image: '/img/seed/cookie.svg',
    description: 'ຄຸກກີ້ຊັອກໂກແລັດ ອົບສົດໆ ກອບນອກ ນຸ້ມໃນ ຫວານກຳລັງດີ.'
  },
  {
    name: 'ເບີສົດ 200g',
    category: 'ອາຫານ',
    price: 18000,
    stock: 5,
    image: '/img/seed/butter.svg',
    description: 'ເບີສົດຈາກນົມ ສຳລັບທຳເຂົ້າຈີ່ ແລະ ຂະໜົມ ຂະໜາດ 200g.'
  }
];

function defaultData() {
  const ts = nowIso();
  return {
    version: 1,
    admin: {
      username: 'admin',
      passwordHash: hashPassword('admin'),
      name: 'ຜູ້ດູແລລະບົບ'
    },
    settings: {
      shopName: 'ຮ້ານ ສະບາຍດີ ມິນິມາດ',
      phone: '020 5555 1234',
      address: 'ບ້ານ ສີສະຫວາດ, ເມືອງຈັນທະບູລີ, ນະຄອນຫຼວງວຽງຈັນ',
      deliveryFee: 15000,
      currency: '₭',
      bankName: 'BCEL ທະນາຄານການຄ້າຕ່າງປະເທດລາວ',
      bankAccountName: 'ຮ້ານ ສະບາຍດີ ມິນິມາດ',
      bankAccountNumber: '010-110-1234567',
      qrImage: '/img/seed/bank-qr.svg',
      mapCenter: { lat: 17.9757, lng: 102.6331 },
      lowStockThreshold: 10
    },
    products: seedProducts.map((p, i) => ({
      id: newId('prd_'),
      ...p,
      active: true,
      createdAt: new Date(Date.now() - (seedProducts.length - i) * 60000).toISOString(),
      updatedAt: ts
    })),
    orders: []
  };
}

function ensureShape(d) {
  if (!d || typeof d !== 'object') return defaultData();
  d.version = d.version || 1;
  if (!d.admin) d.admin = defaultData().admin;
  if (!d.settings) d.settings = defaultData().settings;
  if (!Array.isArray(d.products)) d.products = defaultData().products;
  if (!Array.isArray(d.orders)) d.orders = [];
  return d;
}

function load() {
  fs.mkdirSync(DATA_DIR, { recursive: true });
  if (fs.existsSync(DB_FILE)) {
    try {
      data = ensureShape(JSON.parse(fs.readFileSync(DB_FILE, 'utf8')));
    } catch (err) {
      // ໄຟລ໌ເສຍຫາຍ -> ສຳຮອງໄວ້ ແລ້ວເລີ່ມໃໝ່
      const backup = `${DB_FILE}.broken-${Date.now()}`;
      try { fs.renameSync(DB_FILE, backup); } catch { }
      console.error(`⚠️  ອ່ານ data/db.json ບໍ່ໄດ້ (${err.message}) — ສຳຮອງໄວ້ທີ່ ${backup}`);
      data = defaultData();
    }
  } else {
    data = defaultData();
  }
  save();
  return data;
}

function save() {
  if (!data) return;
  fs.mkdirSync(DATA_DIR, { recursive: true });
  const tmp = `${DB_FILE}.tmp`;
  fs.writeFileSync(tmp, JSON.stringify(data, null, 2), 'utf8');
  fs.renameSync(tmp, DB_FILE);
}

module.exports = {
  get data() { return data; },
  load,
  save,
  DB_FILE,
  hashPassword,
  checkPassword,
  newId,
  nowIso
};
