# 🚀 ຄູ່ມືເຮັດໃຫ້ເວັບມີລິ້ງຖາວອນ

## ສະຖານະປັດຈຸບັນ

| ຢ່າງ | ສະຖານະ |
|---|---|
| ໂຄ້ດ | ✅ ຢູ່ https://github.com/hello-dev-lab/pos-lao-shop |
| Frontend + Backend | ✅ ຢູ່ repo ດຽວກັນ (Express ເສີບ `public/`) |
| ລິ້ງຖາວອນ | ⏳ ຕ້ອງ deploy ຂຶ້ນ Render (2 ນາທີ) |

---

## ຂັ້ນຕອນດຽວ — Deploy ຂຶ້ນ Render (ຟຣີ)

### ກົດລິ້ງນີ້

**https://render.com/deploy?repo=https://github.com/hello-dev-lab/pos-lao-shop**

1. ກົດ **Sign in with GitHub** (ຖ້າຍັງບໍ່ມີ account ມັນຈະໃຫ້ສ້າງ — ຟຣີ)
2. ອະນຸຍາດໃຫ້ Render ເຂົ້າ repo `pos-lao-shop`
3. ກົດ **Apply** / **Create**
4. ລໍ 2-3 ນາທີ

ຈະໄດ້ລິ້ງຖາວອນ:

```
https://pos-lao-shop-api.onrender.com
```

> ຊື່ອາດຕ່າງຈາກນີ້ໜ້ອຍໜຶ່ງ ຖ້າຊື່ຊ້ຳ — ເບິ່ງໃນ Render dashboard.

### ທົດສອບ

- `https://pos-lao-shop-api.onrender.com` → ໜ້າຮ້ານ
- `https://pos-lao-shop-api.onrender.com/admin/` → ແອັດມິນ (`admin` / `admin`)
- `https://pos-lao-shop-api.onrender.com/track.html` → ຕິດຕາມອໍເດີ້

---

## 🎯 ເຮັດທຳອິດຫຼັງ deploy

1. ເຂົ້າ `/admin/` → ແລ້ວ **ປ່ຽນລະຫັດຜ່ານ** ຈາກ `admin`/`admin`
2. ໃສ່ **ເລກບັນຊີທະນາຄານ + ອັບຮູບ QR** ໃນໜ້າຕັ້ງຄ່າ
3. ອັບຮູບສິນຄ້າຕົວຈິງ

---

## ⚠️ ຂໍ້ຈຳກັດຂອງ Render ຟຣີ

| ເລື່ອງ | ລາຍລະອຽດ |
|---|---|
| **ລິ້ງ** | ✅ ຖາວອນ ບໍ່ປ່ຽນ |
| **Sleep** | ບໍ່ມີຄົນໃຊ້ 15 ນາທີ → ຫຼັບ. ເປີດທຳອິດຊ້າ ~30-50 ວິນາທີ |
| **ຂໍ້ມູນ** | ❌ ບໍ່ມີ disk ຖາວອນ — ອໍເດີ້/ຮູບຈະຣີເຊັດທຸກຄັ້ງທີ່ deploy ໃໝ່ |
| **ແກ້ຂໍ້ມູນ** | ຍົກເປັນ Starter $7/ເດືອນ + disk 1GB → ຕັ້ງ `DATA_DIR=/var/data`, `UPLOAD_DIR=/var/data/uploads` |

> ຖ້າຕ້ອງການຂໍ້ມູນຖາວອນແທ້ໂດຍບໍ່ເສຍເງິນ → ຍ້າຍໄປ Supabase / Neon (ຟຣີ) ແລ້ວແກ້ `server/db.js`.

---

## 🔁 ທາງເລືອກ: ໃຊ້ PC ເປັນເຊີບເວີ ແຕ່ໄດ້ໂດເມນຄົງທີ່

ຖ້າຢາກໃຊ້ເຄື່ອງນີ້ຕໍ່ (ບໍ່ຂຶ້ນ Render):

1. ສະໝັກຟຣີ https://ngrok.com
2. ຄັດລອກ **authtoken** ມາໃຫ້
3. ngrok ຟຣີໃຫ້ **1 ໂດເມນຄົງທີ່** ຮູບແບບ `https://xxxx-yyyy.ngrok-free.app`
4. ຂ້ອຍຕັ້ງ watchdog ໃຫ້ຮັນຕະຫຼອດ

ຂໍ້ເສຍ: PC ຕ້ອງເປີດຕະຫຼອດ ແລະ ອິນເຕີເນັດຕ້ອງຕໍ່.

---

## 🧰 ເຄື່ອງມືທີ່ມີໃນໂປຣເຈັກ

| ໄຟລ໌ | ໜ້າທີ່ |
|---|---|
| `render.yaml` | Blueprint ສຳລັບ Render |
| `scripts/tunnel-watch.ps1` | ເຝົ້າເຊີບເວີ + tunnel ໃຫ້ຢູ່ຕະຫຼອດ (ໃຊ້ກັບ PC) |
| `public/js/config.js` | ທີ່ຢູ່ API (`apiBase: ''` = ເຊີບເວີດຽວກັນ) |
| `logs/public-url.txt` | ລິ້ງ tunnel ປັດຈຸບັນ (ຖ້າໃຊ້ PC) |
