/**
 * ═══════════════════════════════════════════════════════════════════════════════════════
 *  🔐 SCHNUFFELLL BOT - LICENSE MANAGEMENT v8.1
 *  Commands for managing user licenses (DEV ONLY)
 *  
 *  Commands (DEV ONLY - ID: 1126396317):
 *  /licadd <userId> <type>        - Add license to user
 *  /licremove <userId>            - Remove license from user
 *  /liclist                       - List all licenses
 *  /liccheck <userId>             - Check user's license
 *  /licgenerate <type>            - Generate new token
 *  
 *  @author @schnuffelll
 *  @version 8.1
 * ═══════════════════════════════════════════════════════════════════════════════════════
 */

const license = require('../lib/license');

// HARDCODED DEV ID - ONLY THIS ID CAN MANAGE LICENSES
const DEV_ID = '1126396317';

module.exports = (bot) => {

    console.log('[LICENSE] 🔐 License Management v8.1 loaded - DEV Only: ' + DEV_ID);

    // Helper: Check if user is DEV
    function isDev(userId) {
        return String(userId) === DEV_ID;
    }

    // ═══════════════════════════════════════════════════════════════════════════════
    // /licadd <userId> <type> - Add license to user (DEV ONLY)
    // Types: OWNER, PREMIUM, BASIC, FREE
    // ═══════════════════════════════════════════════════════════════════════════════
    bot.onText(/^\/licadd\s+(\d+)\s+(OWNER|PREMIUM|BASIC|FREE)(?:\s+(\d+))?$/i, async (msg, match) => {
        const chatId = msg.chat.id;
        const userId = msg.from.id.toString();

        if (!isDev(userId)) {
            return bot.sendMessage(chatId, '🚫 <b>ACCESS DENIED</b>\n\nHanya Developer yang bisa menambah lisensi.', { parse_mode: 'HTML' });
        }

        const targetUserId = match[1];
        const licenseType = match[2].toUpperCase();
        const days = match[3] ? parseInt(match[3]) : null;

        // Calculate expiry
        let expiry = null;
        if (days) {
            const exp = new Date();
            exp.setDate(exp.getDate() + days);
            expiry = exp.toISOString().split('T')[0];
        }

        // Generate token
        const token = license.generateToken(licenseType);

        // Add license
        const success = license.addLicense(token, targetUserId, licenseType, license.LICENSE_PRESETS[licenseType], expiry);

        if (success) {
            let text = `✅ <b>LICENSE ADDED</b>

🎫 <b>Token:</b> <code>${token}</code>
👤 <b>User ID:</b> <code>${targetUserId}</code>
📦 <b>Type:</b> ${licenseType}
📅 <b>Expiry:</b> ${expiry || 'Never'}

<b>Features:</b>
`;
            const features = license.LICENSE_PRESETS[licenseType];
            for (const [key, value] of Object.entries(features)) {
                text += `${value ? '✅' : '❌'} ${key}\n`;
            }

            bot.sendMessage(chatId, text, { parse_mode: 'HTML' });
        } else {
            bot.sendMessage(chatId, '❌ Gagal menambah lisensi!');
        }
    });

    // ═══════════════════════════════════════════════════════════════════════════════
    // /licremove <userId> - Remove license (DEV ONLY)
    // ═══════════════════════════════════════════════════════════════════════════════
    bot.onText(/^\/licremove\s+(\d+)$/i, async (msg, match) => {
        const chatId = msg.chat.id;
        const userId = msg.from.id.toString();

        if (!isDev(userId)) {
            return bot.sendMessage(chatId, '🚫 <b>ACCESS DENIED</b>\n\nHanya Developer yang bisa menghapus lisensi.', { parse_mode: 'HTML' });
        }

        const targetUserId = match[1];

        // Prevent removing own license
        if (targetUserId === DEV_ID) {
            return bot.sendMessage(chatId, '⚠️ Tidak bisa menghapus lisensi Developer!');
        }

        const success = license.removeLicense(targetUserId);

        if (success) {
            bot.sendMessage(chatId, `✅ <b>LICENSE REMOVED</b>\n\n👤 User ID: <code>${targetUserId}</code>`, { parse_mode: 'HTML' });
        } else {
            bot.sendMessage(chatId, `❌ User <code>${targetUserId}</code> tidak punya lisensi.`, { parse_mode: 'HTML' });
        }
    });

    // ═══════════════════════════════════════════════════════════════════════════════
    // /liclist - List all licenses (DEV ONLY)
    // ═══════════════════════════════════════════════════════════════════════════════
    bot.onText(/^\/liclist$/i, async (msg) => {
        const chatId = msg.chat.id;
        const userId = msg.from.id.toString();

        if (!isDev(userId)) {
            return bot.sendMessage(chatId, '🚫 <b>ACCESS DENIED</b>', { parse_mode: 'HTML' });
        }

        const licenses = license.getAllLicenses();

        if (licenses.length === 0) {
            return bot.sendMessage(chatId, '📋 Tidak ada lisensi terdaftar.');
        }

        let text = `🔐 <b>LICENSE DATABASE</b> (${licenses.length})\n<code>━━━━━━━━━━━━━━━━━━━━━━</code>\n\n`;

        licenses.forEach((lic, i) => {
            const typeEmoji = {
                'OWNER': '👑',
                'PREMIUM': '⭐',
                'BASIC': '📦',
                'FREE': '🆓'
            };

            text += `${i + 1}. ${typeEmoji[lic.type] || '📄'} <b>${lic.type}</b>\n`;
            text += `   👤 ID: <code>${lic.userId}</code>\n`;
            text += `   📅 Exp: ${lic.expiry || 'Never'}\n\n`;
        });

        bot.sendMessage(chatId, text, { parse_mode: 'HTML' });
    });

    // ═══════════════════════════════════════════════════════════════════════════════
    // /liccheck <userId> - Check specific user license
    // ═══════════════════════════════════════════════════════════════════════════════
    bot.onText(/^\/liccheck\s+(\d+)$/i, async (msg, match) => {
        const chatId = msg.chat.id;
        const userId = msg.from.id.toString();

        if (!isDev(userId)) {
            return bot.sendMessage(chatId, '🚫 <b>ACCESS DENIED</b>', { parse_mode: 'HTML' });
        }

        const targetUserId = match[1];
        const lic = license.getLicense(targetUserId);

        if (!lic) {
            return bot.sendMessage(chatId, `❌ User <code>${targetUserId}</code> tidak punya lisensi.`, { parse_mode: 'HTML' });
        }

        let text = `🔐 <b>LICENSE INFO</b>

🎫 <b>Token:</b> <code>${lic.token}</code>
👤 <b>User ID:</b> <code>${lic.userId}</code>
📦 <b>Type:</b> ${lic.type}
📅 <b>Created:</b> ${lic.createdAt}
⏰ <b>Expiry:</b> ${lic.expiry || 'Never'}

<b>Features:</b>
`;
        for (const [key, value] of Object.entries(lic.features || {})) {
            text += `${value ? '✅' : '❌'} ${key}\n`;
        }

        bot.sendMessage(chatId, text, { parse_mode: 'HTML' });
    });

    // ═══════════════════════════════════════════════════════════════════════════════
    // /licgenerate <type> - Generate new token (DEV ONLY)
    // ═══════════════════════════════════════════════════════════════════════════════
    bot.onText(/^\/licgenerate\s+(OWNER|PREMIUM|BASIC|FREE)$/i, async (msg, match) => {
        const chatId = msg.chat.id;
        const userId = msg.from.id.toString();

        if (!isDev(userId)) {
            return bot.sendMessage(chatId, '🚫 <b>ACCESS DENIED</b>', { parse_mode: 'HTML' });
        }

        const licenseType = match[1].toUpperCase();
        const token = license.generateToken(licenseType);

        bot.sendMessage(chatId, `🎫 <b>GENERATED TOKEN</b>

📦 Type: ${licenseType}
🔑 Token: <code>${token}</code>

<i>Gunakan /licadd userId ${licenseType} untuk assign ke user.</i>`, { parse_mode: 'HTML' });
    });

    // ═══════════════════════════════════════════════════════════════════════════════
    // /mylicense - Check own license (PUBLIC)
    // ═══════════════════════════════════════════════════════════════════════════════
    bot.onText(/^\/mylicense$/i, async (msg) => {
        const chatId = msg.chat.id;
        const userId = msg.from.id.toString();

        const lic = license.getLicense(userId);

        if (!lic) {
            return bot.sendMessage(chatId, `📋 <b>NO LICENSE</b>

Anda belum memiliki lisensi.
Hubungi @schnuffelll untuk membeli.

<b>Tipe Lisensi:</b>
👑 OWNER - Full access
⭐ PREMIUM - Update + All features
📦 BASIC - Manual update only
🆓 FREE - RPG only`, {
                parse_mode: 'HTML',
                reply_markup: {
                    inline_keyboard: [
                        [{ text: '💬 Contact Dev', url: 'https://t.me/schnuffelll' }]
                    ]
                }
            });
        }

        const typeEmoji = { 'OWNER': '👑', 'PREMIUM': '⭐', 'BASIC': '📦', 'FREE': '🆓' };

        let text = `🔐 <b>YOUR LICENSE</b>

${typeEmoji[lic.type] || '📄'} <b>Type:</b> ${lic.type}
📅 <b>Expiry:</b> ${lic.expiry || 'Never'}

<b>Features:</b>
`;
        for (const [key, value] of Object.entries(lic.features || {})) {
            text += `${value ? '✅' : '❌'} ${key}\n`;
        }

        bot.sendMessage(chatId, text, { parse_mode: 'HTML' });
    });

};
