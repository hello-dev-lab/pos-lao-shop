# 🚀 ຄູ່ມື Deploy: Cloudflare Pages + Render

ເປົ້າໝາຍ: ໃຫ້ເວັບມີລິ້ງ `https://xxx.pages.dev` ແບບຄົງທີ່ ແລະ ອໍເດີ້ຍັງໃຊ້ໄດ້ຈິງ.

## ສະຖາປັດຕະຍະກຳ

```
ລູກຄ້າ ──► https://xxx.pages.dev        (Cloudflare Pages = HTML/CSS/JS)
                    │
                    │  fetch /api/...  (CORS)
                    ▼
             https://xxx.onrender.com      (Node.js + Express + db.json + uploads)
```

- `public/js/config.js` ເປັນບ່ອນຕັ້ງທີ່ຢູ່ API (`apiBase`)
- ຮູບທີ່ອັບໂຫຼດ (`/uploads/...`) ຈະຖືກຕໍ່ `apiBase` ອັດຕະໂນມັດຜ່ານ `mediaUrl()`

---

## ຂັ້ນຕອນ 1 — ອັບໂຄ້ດຂຶ້ນ GitHub

```powershell
cd "C:\Users\Developer\Documents\Default Project"
git add -A
git commit -m "feat: split frontend/backend for Cloudflare Pages + Render"
```

ຈາກນັ້ນສ້າງ repo ໃໝ່ (private ກໍ່ໄດ້) ຢູ່ https://github.com/new ແລ້ວ:

```powershell
git remote add origin https://github.com/<ຊື່ຜູ້ໃຊ້>/pos-lao-shop.git
git branch -M main
git push -u origin main
```

> `data/db.json` ແລະ `public/uploads/*` ຖືກ gitignore ໄວ້ແລ້ວ → ບໍ່ມີຂໍ້ມູນລູກຄ້າຂຶ້ນ GitHub.

---

## ຂັ້ນຕອນ 2 — ສ້າງ Backend ເທິງ Render (ຟຣີ)

1. ໄປ https://render.com → Sign in with GitHub
2. **New → Web Service** → ເລືອກ repo `pos-lao-shop`
3. ຕັ້ງຄ່າ:
   - **Runtime**: Node
   - **Build Command**: `npm install`
   - **Start Command**: `npm start`
   - **Plan**: Free
   - **Environment Variables**:
     - `NODE_VERSION` = `20`
     - `CORS_ORIGINS` = `*` (ຫຼື `https://xxx.pages.dev` ຖ້າຮູ້ແລ້ວ)
4. ກົດ **Create Web Service** ແລ້ວລໍ ~3 ນາທີ
5. ຈົດລິ້ງທີ່ໄດ້ ເຊັ່ນ `https://pos-lao-shop-api.onrender.com`
6. ທົດສອບ: ເປີດ `https://pos-lao-shop-api.onrender.com/api/meta`

> ທາງເລືອກ: ຖ້າໃຊ້ `render.yaml` ທີ່ມີຢູ່ ໃຫ້ເລືອກ **New → Blueprint** ແທນ.

---

## ຂັ້ນຕອນ 3 — ຕັ້ງ API base ໃນ frontend

ແກ້ໄຟລ໌ `public/js/config.js`:

```js
window.APP_CONFIG = {
  apiBase: 'https://pos-lao-shop-api.onrender.com'
};
```

---

## ຂັ້ນຕອນ 4 — Deploy ຂຶ້ນ Cloudflare Pages

```powershell
cd "C:\Users\Developer\Documents\Default Project"
npx --yes wrangler login          # ເປີດ browser ໃຫ້ກົດ Allow (ເຮັດຄັ້ງດຽວ)
npm run pages:deploy              # ອັບ public/ ຂຶ້ນ Pages
```

ຈະໄດ້ລິ້ງ: `https://pos-lao-shop.pages.dev`

> ຢາກໄດ້ຊື່ອື່ນ: `npx wrangler pages deploy public --project-name=ຊື່ທີ່ຕ້ອງການ`
> ແລ້ວກັບໄປແກ້ `CORS_ORIGINS` ໃນ Render ໃຫ້ກົງກັບ `https://ຊື່ນັ້ນ.pages.dev`

---

## ⚠️ ຂໍ້ຄວນລະວັງ

| ເລື່ອງ | ລາຍລະອຽດ |
|---|---|
| **ຂໍ້ມູນຫາຍ** | Render ແຜນຟຣີບໍ່ມີ disk ຖາວອນ — ອໍເດີ້/ຮູບຈະຣີເຊັດທຸກຄັ້ງທີ່ deploy ຫຼື restart |
| **ແກ້ຖາວອນ** | ຍົກເປັນ Starter ($7/ເດືອນ) + disk → ຕັ້ງ `DATA_DIR=/var/data`, `UPLOAD_DIR=/var/data/uploads` |
| **ຫຼື** | ຍ້າຍໄປຖານຂໍ້ມູນຟຣີ (Supabase / Neon / MongoDB Atlas) — ຕ້ອງແກ້ `server/db.js` |
| **ຊ້າຄັ້ງທຳອິດ** | Render ຟຣີ sleep ຫຼັງບໍ່ມີຄົນໃຊ້ 15 ນາທີ → ເປີດທຳອິດຈະຊ້າ ~30 ວິນາທີ |
| **ລະຫັດແອັດມິນ** | ປ່ຽນຈາກ `admin`/`admin` ກ່ອນເປີດສາທາລະນະ |

---

## ທົດສອບຫຼັງ deploy

1. ເປີດ `https://xxx.pages.dev` → ເຫັນສິນຄ້າ
2. ກົດເພີ່ມກະຕ່າ → checkout → ສ້າງອໍເດີ້
3. ເປີດ `https://xxx.pages.dev/admin/` → login → ເຫັນອໍເດີ້ໃໝ່
4. ຖ້າບໍ່ຂຶ້ນ: ກວດ Console (F12) ວ່າ error CORS ຫຼື `apiBase` ຜິດ
