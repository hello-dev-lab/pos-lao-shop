'use strict';

/**
 * ລຶບຂໍ້ມູນທັງໝົດ (ສິນຄ້າ, ອໍເດີ້, ຕັ້ງຄ່າ) ແລ້ວສ້າງຂໍ້ມູນຕົວຢ່າງໃໝ່
 * ການໃຊ້:  npm run reset
 */
const fs = require('fs');
const path = require('path');

const dbFile = path.join(__dirname, '..', 'data', 'db.json');

if (fs.existsSync(dbFile)) {
  fs.rmSync(dbFile, { force: true });
  console.log('✔ ລຶບ data/db.json ແລ້ວ — ລະບົບຈະສ້າງຂໍ້ມູນໃໝ່ໃນເທື່ອຕໍ່ໄປທີ່ເປີດ server');
} else {
  console.log('ℹ ບໍ່ພົບ data/db.json — ບໍ່ມີຫຍັງຕ້ອງລຶບ');
}

// ໝາຍເຫດ: ຮູບທີ່ອັບໂຫຼດໃນ public/uploads ຈະບໍ່ຖືກລຶບ
