# 🛒 ລະບົບຂາຍສິນຄ້າ POS — ຮ້ານ ສະບາຍດີ

ເວັບໄຊຂາຍສິນຄ້າອອນໄລ ພາສາລາວ 100% ປະກອບດ້ວຍ **ໜ້າຮ້ານລູກຄ້າ** ແລະ **ແອັດມິນແພນເນລ** ສ້າງດ້ວຍ Node.js + Express + ຖານຂໍ້ມູນ JSON (ບໍ່ຕ້ອງຕິດຕັ້ງ MySQL ຫຼື native module ໃດໆ).

---

## 1. ຄຸນສົມບັດ

### ໜ້າຮ້ານລູກຄ້າ
| ໜ້າ | ລາຍລະອຽດ |
| --- | --- |
| **ໜ້າຫຼັກ** (`/`) | ສະແດງສິນຄ້າທັງໝົດ, ຄົ້ນຫາ, ກັ່ນຕອງຕາມໝວດ, ຈັດລຽງຕາມລາຄາ/ຊື່/ໃໝ່ສຸດ |
| **ລາຍລະອຽດສິນຄ້າ** (`/product.html?id=...`) | ຮູບຂະຫຍາຍ/zoom ໄດ້, ຊື່, ລາຄາ, ສະຕັອກ, ລາຍລະອຽດ, ເພີ່ມໃສ່ກະຕ່າ, ຊື້ດຽວນີ້ |
| **ກະຕ່າ** (`/cart.html`) | ເພີ່ມ/ຫຼຸດຈຳນວນ, ລຶບ, ລ້າງກະຕ່າ, ຄິດໄລ່ຍອດອັດຕະໂນມັດ (ລວມ + ຄ່າສົ່ງ) |
| **ສັ່ງຊື້** (`/checkout.html`) | ຊື່, ເບີໂທ, ທີ່ຢູ່, **Get My Location (GPS)**, ປັກໝຸດເທິງແຜນທີ່, ຄົ້ນຫາສະຖານທີ່ຈາກ **ເບີໂທ** ຫຼື **ພິມທີ່ຢູ່**, ເລືອກ **COD** ຫຼື **ໂອນ QR + ອັບໂຫຼດສະລິບ** |
| **ສັ່ງຊື້ສຳເລັດ** (`/success.html`) | ສະແດງລະຫັດອໍເດີ້, ຍອດລວມ, ລິ້ງໄປຕິດຕາມ |
| **ຕິດຕາມອໍເດີ້** (`/track.html`) | ຄົ້ນຫາດ້ວຍລະຫັດ, timeline 3 ຂັ້ນ, ແຜນທີ່ຈຸດສົ່ງ, ສະລິບ, ປະຫວັດສະຖານະ |

### ແອັດມິນ (`/admin`)
- **ພາບລວມ** — ຍອດຂາຍລວມ, ອໍເດີ້ມື້ນີ້, ອໍເດີ້ລໍຖ້າດຳເນີນການ, ກຣາຟຍອດຂາຍ 7 ວັນ, ສິນຄ້າໃກ້ໝົດ, ອໍເດີ້ຫຼ້າສຸດ
- **ອໍເດີ້** — ເບິ່ງຂໍ້ມູນລູກຄ້າ, ລາຍການສິນຄ້າ, ສະລິບ, ແຜນທີ່ GPS; ປ່ຽນສະຖານະ **ກຳລັງກຽມເຄື່ອງ → ກຳລັງຈັດສົ່ງ → ຈັດສົ່ງສຳເລັດ** ຫຼື ຍົກເລີກ (ຄືນສະຕັອກອັດຕະໂນມັດ)
- **ສິນຄ້າ** — ເພີ່ມ / ແກ້ໄຂ / ລຶບ, ກຳນົດລາຄາ ແລະ ສະຕັອກ, **ອັບໂຫຼດຮູຈາກຄອມພິວເຕີ**
- **ຕັ້ງຄ່າ** — ຊື່ຮ້ານ, ເບີໂທ, ທີ່ຢູ່, ຄ່າຈັດສົ່ງ, ເກນເຕືອນສະຕັອກ, ຂໍ້ມູນທະນາຄານ ແລະ **QR ຮັບເງິນ**

### ຄວາມປອດໄພ / ຄຸນນະພາບ
- ລາຄາ ແລະ ຍອດລວມ **ຄິດຢູ່ server** ບໍ່ໄວ້ໃຈ client
- ກວດສະຕັອກກ່ອນສ້າງອໍເດີ້ ແລະ ຕັດສະຕັອກແບບ atomic ໃນຄຳຮ້ອງດຽວ
- Admin session ໝົດອາຍຸ 12 ຊົ່ວໂມງ, ມີ rate limit ກັນ brute force
- ອັບໂຫຼດຮູບຮັບສະເພາະ JPG/PNG/WEBP/GIF ຂະໜາດ ≤ 5MB
- escape HTML ທຸກຈຸດທີ່ສະແດງຂໍ້ມູນຜູ້ໃຊ້ (ກັນ XSS)

---

## 2. ຄວາມຕ້ອງການລະບົບ

- **Node.js 18 ຂຶ້ນໄປ** (ແນະນຳ 20+)
- ອິນເຕີເນັດ (ສຳລັບໂຫຼດແຜນທີ່ OpenStreetMap, ຄົ້ນຫາທີ່ຢູ່, ແລະ Google Fonts)
- Browser ທັນສະໄໝ (Chrome / Edge / Firefox / Safari)

---

## 3. ການຕິດຕັ້ງ ແລະ ເປີດໃຊ້

```bash
# 1) ຕິດຕັ້ງ dependencies
npm install

# 2) ເປີດເຊີບເວີ
npm start
```

ເປີດ browser ທີ່:

| ລິ້ງ | ຄຳອະທິບາຍ |
| --- | --- |
| **http://localhost:3000** | ໜ້າຮ້ານລູກຄ້າ |
| **http://localhost:3000/admin** | ແອັດມິນແພນເນລ |

**ບັນຊີແອັດມິນ:** ຜູ້ໃຊ້ `admin` / ລະຫັດຜ່ານ `admin`

> ເພື່ອໃຫ້ເພື່ອນຮ່ວມ Wi-Fi ເຂົ້າໄດ້ ໃຫ້ເປີດຜ່ານ IP ຂອງຄອມພິວເຕີ ເຊັ່ນ `http://10.81.44.146:3000` (ປ່ຽນ IP ຕາມເຄືອຂ່າຍຂອງທ່ານ — ເບິ່ງໄດ້ຕອນ `npm start` ຈະພິມລິ້ງ LAN ໃຫ້).

### ຄຳສັ່ງອື່ນໆ

```bash
npm run dev     # ເປີດແບບ watch (ແກ້ໄຂໂຄ້ດແລ້ວ restart ເອງ)
npm run reset   # ລຶບຂໍ້ມູນທັງໝົດ ແລ້ວ seed ສິນຄ້າຕົວຢ່າງ 9 ລາຍການໃໝ່
set PORT=3001 && npm start      # Windows CMD
$env:PORT=3001; npm start       # PowerShell
```

> `npm run reset` ຕ້ອງຢຸດ server ກ່ອນ ເພື່ອບໍ່ໃຫ້ຂໍ້ມູນໃນ memory ຖືກຂຽນທັບຄືນ. ຮູບໃນ `public/uploads/` ຈະບໍ່ຖືກລຶບ.

---

## 4. ໂຄງສ້າງໂປຣເຈັກ

```
├── server.js               # Express app + API ທັງໝົດ + static files
├── server/
│   └── db.js               # JSON DB, seed, hash ລະຫັດຜ່ານ, atomic save
├── scripts/
│   └── reset.js            # ລຶບ data/db.json ເພື່ອ seed ໃໝ່
├── data/
│   └── db.json             # ຂໍ້ມູນຈິງ (ສ້າງອັດຕະໂນມັດ, ບໍ່ commit)
├── public/
│   ├── index.html          # ໜ້າຫຼັກ
│   ├── product.html        # ລາຍລະອຽດສິນຄ້າ
│   ├── cart.html           # ກະຕ່າ
│   ├── checkout.html       # ສັ່ງຊື້ + ແຜນທີ່ + ຈ່າຍເງິນ
│   ├── success.html        # ສັ່ງຊື້ສຳເລັດ
│   ├── track.html          # ຕິດຕາມອໍເດີ້
│   ├── admin/index.html    # ແອັດມິນແພນເນລ (SPA)
│   ├── css/style.css       # ທີມຫຼັກ (ຂຽວເຂັ້ມ / ສົ້ມ / ແດງ-ຟ້າ-ເຫຼືອງ)
│   ├── css/admin.css       # ທີມແອັດມິນ
│   ├── js/common.js        # API client, ກະຕ່າ, header/footer, toast, lightbox
│   ├── js/*.js             # ໂລຈິກແຕ່ລະໜ້າ
│   ├── img/                # ໂລໂກ້ + ຮູບ seed (SVG)
│   └── uploads/            # ຮູບທີ່ອັບໂຫຼດ (ບໍ່ commit)
└── package.json
```

---

## 5. API ສຳຄັນ

### ສາທາລະນະ
| Method | Path | ລາຍລະອຽດ |
| --- | --- | --- |
| GET | `/api/health` | ກວດສະຖານະເຊີບເວີ |
| GET | `/api/settings` | ຂໍ້ມູນຮ້ານ (ຊື່, ຄ່າສົ່ງ, ບັນຊີ, QR) |
| GET | `/api/meta` | ລາຍການສະຖານະ + ໝວດສິນຄ້າ |
| GET | `/api/products` | ສິນຄ້າທັງໝົດ (`?q=&category=&sort=`) |
| GET | `/api/products/:id` | ລາຍລະອຽດ + ສິນຄ້າທີ່ກ່ຽວຂ້ອງ |
| POST | `/api/orders` | ສ້າງອໍເດີ້ (ຕັດສະຕັອກ) |
| GET | `/api/orders/track/:code` | ຕິດຕາມອໍເດີ້ |
| GET | `/api/customers/lookup?phone=` | ຄົ້ນຫາທີ່ຢູ່ລູກຄ້າເກົ່າຈາກເບີໂທ |
| POST | `/api/upload/slip` | ອັບໂຫຼດສະລິບ (multipart, field `image`) |

### ແອັດມິນ (ຕ້ອງສົ່ງ `Authorization: Bearer <token>`)
| Method | Path |
| --- | --- |
| POST | `/api/admin/login` · `/api/admin/logout` |
| GET | `/api/admin/me` · `/api/admin/stats` |
| GET | `/api/admin/orders` · `/api/admin/orders/:id` |
| PATCH | `/api/admin/orders/:id/status` |
| GET/POST | `/api/admin/products` |
| PUT/DELETE | `/api/admin/products/:id` |
| GET/PUT | `/api/admin/settings` |
| POST | `/api/admin/upload` |

---

## 6. ໝາຍເຫດສຳຄັນ

### 📍 GPS ແລະ ແຜນທີ່
- **GPS ໃຊ້ໄດ້ສະເພາະ `http://localhost` ຫຼື `https://`** ເທົ່ານັ້ນ (ຂໍ້ກຳນົດຄວາມປອດໄພຂອງ browser).
- ຖ້າເປີດຜ່ານ `http://IP:3000` ໃນມືຖື, ປຸ່ມ GPS ຈະຖືກປະຕິເສດ — ແຕ່ລູກຄ້າຍັງ **ປັກໝຸດເອງເທິງແຜນທີ່** ຫຼື **ພິມທີ່ຢູ່** ໄດ້ປົກກະຕິ.
- ແຜນທີ່ໃຊ້ **Leaflet + OpenStreetMap** (ບໍ່ຕ້ອງ API key) ແລະ ຄົ້ນຫາທີ່ຢູ່ໃຊ້ **Nominatim** — ຕ້ອງມີອິນເຕີເນັດ.
- ຖ້າຕ້ອງການ GPS ເທິງມືຖືໃນເຄືອຂ່າຍ LAN ໃຫ້ໃຊ້ HTTPS (ເຊັ່ນ tunnel ຜ່ານ Cloudflare Tunnel / ngrok ຫຼື ໃສ່ SSL ກັບ reverse proxy).

### 💳 QR ທະນາຄານ
- ໄປທີ່ **ແອັດມິນ → ຕັ້ງຄ່າ** ແລ້ວອັບໂຫຼດຮູບ QR ຈາກແອັບທະນາຄານຂອງທ່ານ (BCEL One, LDB, ຯລຯ).
- ລະບົບມີ QR ຕົວຢ່າງ (`public/img/seed/bank-qr.svg`) ໃຫ້ໃຊ້ທົດສອບ — **ກະລຸນາປ່ຽນເປັນ QR ຈິງກ່ອນເປີດຂາຍ**.

### 🔐 ປ່ຽນລະຫັດຜ່ານແອັດມິນ
ລະຫັດຜ່ານຖືກເກັບເປັນ hash scrypt ໃນ `data/db.json`. ປ່ຽນໄດ້ດ້ວຍຄຳສັ່ງ (ຢຸດ server ກ່ອນ):

```bash
node -e "const db=require('./server/db'); const fs=require('fs'); const p='./data/db.json'; const d=JSON.parse(fs.readFileSync(p,'utf8')); d.admin.passwordHash=db.hashPassword('ລະຫັດໃໝ່ຂອງທ່ານ'); fs.writeFileSync(p, JSON.stringify(d,null,2)); console.log('ປ່ຽນລະຫັດສຳເລັດ');"
```

### 💾 ຂໍ້ມູນ ແລະ ການສຳຮອງ
- ຂໍ້ມູນທັງໝົດຢູ່ `data/db.json` — **ສຳຮອງໄຟລ໌ນີ້ເປັນປະຈຳ**.
- ຮູບອັບໂຫຼດຢູ່ `public/uploads/` — ສຳຮອງພ້ອມກັນ.
- ການຂຽນເປັນແບບ atomic (tmp → rename) ກັນໄຟລ໌ເສຍຫາຍ.

### 🗑️ ການລຶບສິນຄ້າ
ຖ້າສິນຄ້ານັ້ນເຄີຍຢູ່ໃນອໍເດີ້ແລ້ວ ລະບົບຈະ **ປິດການຂາຍ** ແທນການລຶບ ເພື່ອຮັກສາປະຫວັດອໍເດີ້.

---

## 7. ການ Deploy ໃນເຊີບເວີຈິງ

1. ອັບໂຫຼດໂປຣເຈັກ (ບໍ່ຕ້ອງ `node_modules` ແລະ `data/`) ຂຶ້ນເຊີບເວີ.
2. `npm install --omit=dev` ແລ້ວຮັນ `npm start` ຜ່ານ PM2 ຫຼື systemd.
3. ໃຊ້ **reverse proxy (Nginx/Caddy) ໃສ່ HTTPS** ເພື່ອໃຫ້ GPS ເຮັດວຽກໄດ້.
4. ຕັ້ງ **persistent disk/volume** ໃຫ້ `data/` ແລະ `public/uploads/` (Render/Railway/Fly.io ຕ້ອງການອັນນີ້ ບໍ່ດັ່ງນັ້ນຂໍ້ມູນຈະຫາຍທຸກຄັ້ງທີ່ deploy).
5. ຖ້າຢູ່ຫຼັງ proxy ໃຫ້ຕັ້ງ `app.set('trust proxy', true)` (ມີໃຫ້ແລ້ວ) ເພື່ອ rate limit ເຫັນ IP ຈິງ.

---

## 8. ການທົດສອບທີ່ຜ່ານແລ້ວ

- ✅ ເປີດທຸກໜ້າໄດ້ (200) ແລະ ບໍ່ມີ console error
- ✅ ເພີ່ມສິນຄ້າໃສ່ກະຕ່າ → checkout → ອັບໂຫຼດສະລິບ → ສ້າງອໍເດີ້ → success → track
- ✅ ຕັດສະຕັອກຕອນສັ່ງຊື້ ແລະ ຄືນສະຕັອກຕອນຍົກເລີກ
- ✅ Admin login, dashboard, ອໍເດີ້ + ແຜນທີ່, ປ່ຽນສະຖານະ, CRUD ສິນຄ້າ, ບັນທຶກຕັ້ງຄ່າ
- ✅ ອັບໂຫຼດຮູບ/ສະລິບ (JPG/PNG/WEBP/GIF ≤ 5MB)

---

ສ້າງດ້ວຍ ❤️ ສຳລັບຮ້ານຄ້າລາວ — Node.js + Express + Leaflet/OpenStreetMap
