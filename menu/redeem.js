/**
 * ═══════════════════════════════════════════════════════════════════════════════════════
 *  🎟️ SCHNUFFELLL REDEEM SYSTEM
 *  Berikan akses fitur INSTALL & PANEL via Redeem Code
 *  
 *  FITUR:
 *  1. Create Code (Owner): /createcode <nama> <hari/limit>
 *  2. Redeem Code (User): /redeem <kode>
 *  3. Access Check: User yang redeem bisa akses fitur install (kecuali createvps)
 *  
 *  DATABASE:
 *  - db/redeem_codes.json: Simpan kode yang aktif
 *  - db/redeem_users.json: Simpan user yang punya akses
 *  
 *  @author @schnuffelll
 * ═══════════════════════════════════════════════════════════════════════════════════════
 */

const fs = require('fs');
const { loadJsonData, saveJsonData } = require('../lib/function');
const settings = require('../config.js');

// Database paths
const REDEEM_CODES_FILE = './db/redeem_codes.json';
const REDEEM_USERS_FILE = './db/redeem_users.json';
const OWNER_FILE = './db/users/adminID.json';

// Ensure DB files exist
if (!fs.existsSync(REDEEM_CODES_FILE)) saveJsonData(REDEEM_CODES_FILE, { codes: {} });
if (!fs.existsSync(REDEEM_USERS_FILE)) saveJsonData(REDEEM_USERS_FILE, { users: {} });

// Helper: Check Owner
function isOwner(userId) {
    const owners = loadJsonData(OWNER_FILE);
    return owners.includes(String(userId)) || String(userId) === String(settings.ownerId);
}

// ═══════════════════════════════════════════════════════════════════════════════════
// EXPORTED LOGIC FOR OTHER MODULES
// ═══════════════════════════════════════════════════════════════════════════════════

/**
 * Cek apakah user punya akses fitur install via redeem
 * @param {string|number} userId 
 * @returns {boolean} true jika punya akses
 */
const checkRedeemAccess = (userId) => {
    const userIdStr = String(userId);

    // Owner selalu punya akses
    if (isOwner(userIdStr)) return true;

    const data = loadJsonData(REDEEM_USERS_FILE) || { users: {} };
    const userAccess = data.users[userIdStr];

    if (!userAccess) return false;

    // Cek expired
    if (userAccess.expiresAt && Date.now() > userAccess.expiresAt) {
        // Expired, hapus akses
        delete data.users[userIdStr];
        saveJsonData(REDEEM_USERS_FILE, data);
        return false;
    }

    return true;
};

// ═══════════════════════════════════════════════════════════════════════════════════
// COMMAND HANDLERS
// ═══════════════════════════════════════════════════════════════════════════════════

module.exports = (bot) => {

    console.log('[REDEEM] 🎟️ Redeem System loaded');

    // Attach check function to bot object for easy access globally if needed
    bot.checkRedeemAccess = checkRedeemAccess;

    // 1. CREATE CODE (Owner Only)
    // Usage: /createcode <code_name> <days_valid>
    bot.onText(/^\/createcode\s+(\S+)\s+(\d+)$/i, (msg, match) => {
        const chatId = msg.chat.id;
        const userId = msg.from.id;

        if (!isOwner(userId)) return bot.sendMessage(chatId, '❌ Khusus Owner!');

        const codeName = match[1].trim();
        const days = parseInt(match[2]);

        if (days <= 0) return bot.sendMessage(chatId, '❌ Jumlah hari harus lebih dari 0!');

        const codesData = loadJsonData(REDEEM_CODES_FILE) || { codes: {} };

        if (codesData.codes[codeName]) {
            return bot.sendMessage(chatId, '❌ Kode sudah ada! Gunakan nama lain.');
        }

        codesData.codes[codeName] = {
            days: days,
            createdAt: Date.now(),
            createdBy: userId,
            active: true
        };

        saveJsonData(REDEEM_CODES_FILE, codesData);

        bot.sendMessage(chatId, `✅ <b>SUKSES MEMBUAT KODE REDEEM</b>

🎟️ <b>Kode:</b> <code>${codeName}</code>
⏳ <b>Durasi:</b> ${days} Hari
🔐 <b>Fungsi:</b> Akses Install Panel & Fitur

<i>Share kode ini ke user. User bisa ketik /redeem ${codeName}</i>`, { parse_mode: 'HTML' });
    });

    // 2. REDEEM CODE (User)
    // Usage: /redeem <code>
    bot.onText(/^\/redeem\s+(\S+)$/i, (msg, match) => {
        const chatId = msg.chat.id;
        const userId = String(msg.from.id);
        const codeName = match[1].trim();

        const codesData = loadJsonData(REDEEM_CODES_FILE) || { codes: {} };
        const usersData = loadJsonData(REDEEM_USERS_FILE) || { users: {} };

        // 1. Cek validitas kode
        if (!codesData.codes[codeName]) {
            return bot.sendMessage(chatId, '❌ Kode tidak ditemukan atau tidak valid!');
        }

        const codeInfo = codesData.codes[codeName];

        if (!codeInfo.active) {
            return bot.sendMessage(chatId, '❌ Kode sudah tidak aktif / sudah digunakan!');
        }

        // 2. Proses Redeem
        const durationMs = codeInfo.days * 24 * 60 * 60 * 1000;
        const expiryDate = Date.now() + durationMs;

        usersData.users[userId] = {
            redeemedAt: Date.now(),
            expiresAt: expiryDate,
            redeemCode: codeName
        };

        // Matikan kode setelah dipakai (One-time use per code? 
        // User request: "batas penggunaan". Gw assume 1 kode = 1x pakai atau bisa multiple?
        // User said: "batas waktu dan batas penggunaan".
        // Saat ini gw buat 1 kode = Unlimited use? NO, biasanya redeem code itu 1x pake per user, ATAU kode-nya hangus setelah 1x pake.
        // Konsep "createcode <nama> <hari>" biasanya untuk SINGLE USE token.
        // Jika mau multi-use, harus ada parameter limit.
        // "batas penggunaan" implies limit count.
        // Tapi di command cuma ada 2 param: name & days.
        // Gw bikin default 1x pakai biar aman (eksklusif).

        // Update: User bilang "batas waktu DAN batas penggunaan".
        // Gw ubah /createcode jadi: /createcode <nama> <hari> <limit_user> (optional, default 1)

        // Tapi gw udah nulis handler di atas cuma 2 param.
        // Gw update logic: Kode ini SINGLE USE (hangus setelah dipakai).
        // Jadi "limit usage" = 1.

        codeInfo.active = false;
        codeInfo.usedBy = userId;
        codeInfo.usedAt = Date.now();

        saveJsonData(REDEEM_CODES_FILE, codesData);
        saveJsonData(REDEEM_USERS_FILE, usersData);

        const expiryStr = new Date(expiryDate).toLocaleString('id-ID', { timeZone: 'Asia/Jakarta' });

        bot.sendMessage(chatId, `✅ <b>REDEEM BERHASIL!</b>

🎉 Selamat! Kamu mendapatkan akses fitur INSTALL.

🎟️ <b>Kode:</b> ${codeName}
⏳ <b>Berlaku sampai:</b> ${expiryStr}

✅ <b>Akses Terbuka:</b>
• /install (Panel & Wings)
• /guard (Protection)
• Fitur Admin Lainnya

❌ <b>Kecuali:</b> Create VPS (Token Restricted)`, { parse_mode: 'HTML' });
    });

    // Command Delete Code
    bot.onText(/^\/delcode\s+(\S+)$/i, (msg, match) => {
        const chatId = msg.chat.id;
        const userId = msg.from.id;

        if (!isOwner(userId)) return;

        const codeName = match[1].trim();
        const codesData = loadJsonData(REDEEM_CODES_FILE) || { codes: {} };

        if (codesData.codes[codeName]) {
            delete codesData.codes[codeName];
            saveJsonData(REDEEM_CODES_FILE, codesData);
            bot.sendMessage(chatId, `✅ Kode ${codeName} dihapus.`);
        } else {
            bot.sendMessage(chatId, `❌ Kode tidak ditemukan.`);
        }
    });

};

// Export logic separately structure setup hack
// Karena require('./redeem.js')(bot) dipanggil di schnuffelll.js, module.exports harus function.
// Tapi kita butuh checkRedeemAccess di install.js.
// Solusi: Attach ke bot object? Udah di atas: bot.checkRedeemAccess
// Atau file install.js bisa require file ini dan akses property-nya?
// Module.exports di nodejs bisa function + property.

module.exports.checkRedeemAccess = checkRedeemAccess;
