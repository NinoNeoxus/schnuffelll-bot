/**
 * ═══════════════════════════════════════════════════════════════════════════════════════
 *  🔗 SCHNUFFELLL BOT - AUTO-ADD CHANNEL MEMBERSHIP v8.1
 *  Auto-add users to Premium/Reseller when they join required channel
 *  
 *  Flow:
 *  1. User tries to use command in configured group
 *  2. Bot checks if user is in database
 *  3. If not: Check channel membership
 *  4. If not member: Show "Join Channel First" with inline buttons
 *  5. If member: Auto-add to role (Premium/Reseller) based on group config
 *  
 *  Commands (Owner Only):
 *  /setautoadd <role>       - Set auto-add role for current group
 *  /setchannel <@channel>   - Set required channel
 *  /autoaddinfo             - Show current auto-add settings
 *  /autoaddoff              - Disable auto-add for group
 *  
 *  @author @schnuffelll
 *  @version 8.1
 * ═══════════════════════════════════════════════════════════════════════════════════════
 */

const fs = require('fs');
const { loadJsonData, saveJsonData } = require('../lib/function');

const settings = require('../config.js');

module.exports = (bot) => {

    console.log('[AUTOADD] 🔗 Auto-Add Channel Membership v8.1 loaded');

    const OWNER_FILE = './db/users/adminID.json';
    const PREMIUM_FILE = './db/users/premiumUsers.json';
    const RESELLER_FILE = './db/users/resellerUsers.json';
    const AUTOADD_FILE = './db/autoadd_config.json';

    // Initialize autoadd config
    if (!fs.existsSync(AUTOADD_FILE)) {
        saveJsonData(AUTOADD_FILE, { groups: {} });
    }

    // Helper: Check if user is owner
    function isOwner(userId) {
        const owners = loadJsonData(OWNER_FILE);
        return owners.includes(String(userId));
    }

    // Helper: Check channel membership
    async function isChannelMember(userId, channelId) {
        try {
            const member = await bot.getChatMember(channelId, userId);
            return ['creator', 'administrator', 'member'].includes(member.status);
        } catch (e) {
            console.log('[AUTOADD] Channel check error:', e.message);
            return false;
        }
    }

    // Helper: Add user to role
    function addUserToRole(userId, role) {
        const userIdStr = String(userId);

        if (role === 'premium') {
            let premium = loadJsonData(PREMIUM_FILE) || [];
            if (!premium.includes(userIdStr)) {
                premium.push(userIdStr);
                saveJsonData(PREMIUM_FILE, premium);
                return true;
            }
        } else if (role === 'reseller') {
            let resellers = loadJsonData(RESELLER_FILE) || [];
            if (!resellers.includes(userIdStr)) {
                resellers.push(userIdStr);
                saveJsonData(RESELLER_FILE, resellers);
                return true;
            }
        } else if (role === 'owner') {
            let owners = loadJsonData(OWNER_FILE) || [];
            if (!owners.includes(userIdStr)) {
                owners.push(userIdStr);
                saveJsonData(OWNER_FILE, owners);
                return true;
            }
        }
        return false;
    }

    // Helper: Check if user already has role
    function hasRole(userId, role) {
        const userIdStr = String(userId);

        if (role === 'premium') {
            const premium = loadJsonData(PREMIUM_FILE) || [];
            return premium.includes(userIdStr);
        } else if (role === 'reseller') {
            const resellers = loadJsonData(RESELLER_FILE) || [];
            return resellers.includes(userIdStr);
        } else if (role === 'owner') {
            const owners = loadJsonData(OWNER_FILE) || [];
            return owners.includes(userIdStr);
        }
        return false;
    }

    // ═══════════════════════════════════════════════════════════════════════════════
    // /setautoadd <role> - Set auto-add role for current group
    // ═══════════════════════════════════════════════════════════════════════════════
    bot.onText(/^\/setautoadd\s+(premium|reseller|owner)$/i, async (msg, match) => {
        const chatId = msg.chat.id;
        const userId = msg.from.id.toString();

        if (msg.chat.type === 'private') {
            return bot.sendMessage(chatId, '❌ Command ini hanya untuk grup!');
        }

        if (!isOwner(userId)) {
            return bot.sendMessage(chatId, '❌ ᴋʜᴜꜱᴜꜱ ᴏᴡɴᴇʀ!');
        }

        const role = match[1].toLowerCase();
        const config = loadJsonData(AUTOADD_FILE);

        if (!config.groups[chatId]) {
            config.groups[chatId] = {};
        }

        config.groups[chatId].role = role;
        config.groups[chatId].enabled = true;
        saveJsonData(AUTOADD_FILE, config);

        const roleEmoji = { premium: '⭐', reseller: '🏪', owner: '👑' };

        bot.sendMessage(chatId, `✅ <b>Auto-Add Configured!</b>

${roleEmoji[role]} <b>Role:</b> ${role.toUpperCase()}
📍 <b>Group:</b> ${msg.chat.title}

⚠️ Sekarang set channel dengan:
<code>/setchannel @channel_username</code>`, { parse_mode: 'HTML' });
    });

    // ═══════════════════════════════════════════════════════════════════════════════
    // /setchannel <@channel> - Set required channel
    // ═══════════════════════════════════════════════════════════════════════════════
    bot.onText(/^\/setchannel\s+(@\S+|-\d+)$/i, async (msg, match) => {
        const chatId = msg.chat.id;
        const userId = msg.from.id.toString();

        if (msg.chat.type === 'private') {
            return bot.sendMessage(chatId, '❌ Command ini hanya untuk grup!');
        }

        if (!isOwner(userId)) {
            return bot.sendMessage(chatId, '❌ ᴋʜᴜꜱᴜꜱ ᴏᴡɴᴇʀ!');
        }

        const channelId = match[1];
        const config = loadJsonData(AUTOADD_FILE);

        if (!config.groups[chatId]) {
            return bot.sendMessage(chatId, '❌ Set role dulu dengan /setautoadd <role>');
        }

        // Try to get channel info
        try {
            const chat = await bot.getChat(channelId);
            config.groups[chatId].channel = channelId;
            config.groups[chatId].channelTitle = chat.title;
            saveJsonData(AUTOADD_FILE, config);

            bot.sendMessage(chatId, `✅ <b>Channel Set!</b>

📢 <b>Channel:</b> ${chat.title}
🆔 <b>ID:</b> <code>${channelId}</code>

⚠️ <b>PENTING:</b>
1. Bot HARUS jadi admin di channel
2. User yang join akan auto-add sebagai <b>${config.groups[chatId].role.toUpperCase()}</b>`, { parse_mode: 'HTML' });
        } catch (e) {
            bot.sendMessage(chatId, `❌ Gagal akses channel: ${e.message}\n\nPastikan bot sudah jadi admin di channel!`);
        }
    });

    // ═══════════════════════════════════════════════════════════════════════════════
    // /autoaddinfo - Show current settings
    // ═══════════════════════════════════════════════════════════════════════════════
    bot.onText(/^\/autoaddinfo$/i, async (msg) => {
        const chatId = msg.chat.id;
        const userId = msg.from.id.toString();

        if (!isOwner(userId)) {
            return bot.sendMessage(chatId, '❌ ᴋʜᴜꜱᴜꜱ ᴏᴡɴᴇʀ!');
        }

        const config = loadJsonData(AUTOADD_FILE);
        const groupConfig = config.groups[chatId];

        if (!groupConfig || !groupConfig.enabled) {
            return bot.sendMessage(chatId, `📋 <b>AUTO-ADD CONFIG</b>

❌ <b>Status:</b> Disabled

<b>Setup:</b>
1. <code>/setautoadd premium</code> atau <code>reseller</code>
2. <code>/setchannel @channel_username</code>`, { parse_mode: 'HTML' });
        }

        const roleEmoji = { premium: '⭐', reseller: '🏪', owner: '👑' };

        bot.sendMessage(chatId, `📋 <b>AUTO-ADD CONFIG</b>

✅ <b>Status:</b> Enabled
${roleEmoji[groupConfig.role] || '📦'} <b>Role:</b> ${groupConfig.role?.toUpperCase() || 'Not set'}
📢 <b>Channel:</b> ${groupConfig.channelTitle || 'Not set'}
🆔 <b>Channel ID:</b> <code>${groupConfig.channel || '-'}</code>

<b>Commands:</b>
• <code>/setautoadd role</code> - Change role
• <code>/setchannel @ch</code> - Change channel
• <code>/autoaddoff</code> - Disable`, { parse_mode: 'HTML' });
    });

    // ═══════════════════════════════════════════════════════════════════════════════
    // /autoaddoff - Disable auto-add
    // ═══════════════════════════════════════════════════════════════════════════════
    bot.onText(/^\/autoaddoff$/i, async (msg) => {
        const chatId = msg.chat.id;
        const userId = msg.from.id.toString();

        if (!isOwner(userId)) {
            return bot.sendMessage(chatId, '❌ ᴋʜᴜꜱᴜꜱ ᴏᴡɴᴇʀ!');
        }

        const config = loadJsonData(AUTOADD_FILE);

        if (config.groups[chatId]) {
            config.groups[chatId].enabled = false;
            saveJsonData(AUTOADD_FILE, config);
        }

        bot.sendMessage(chatId, '✅ Auto-Add disabled untuk grup ini.');
    });

    // ═══════════════════════════════════════════════════════════════════════════════
    // /daftar - Register as Premium/Reseller (User Command)
    // ═══════════════════════════════════════════════════════════════════════════════
    bot.onText(/^\/daftar$/i, async (msg) => {
        const chatId = msg.chat.id;
        const userId = msg.from.id;
        const userName = msg.from.first_name;

        if (msg.chat.type === 'private') {
            return bot.sendMessage(chatId, '❌ Gunakan command ini di grup!');
        }

        const config = loadJsonData(AUTOADD_FILE);
        const groupConfig = config.groups[chatId];

        // Check if auto-add is configured
        if (!groupConfig || !groupConfig.enabled || !groupConfig.channel) {
            return bot.sendMessage(chatId, '❌ Auto-add belum dikonfigurasi di grup ini.');
        }

        const role = groupConfig.role;

        // Check if already has role
        if (hasRole(userId, role)) {
            const roleEmoji = { premium: '⭐', reseller: '🏪', owner: '👑' };
            return bot.sendMessage(chatId, `✅ ${userName}, kamu sudah terdaftar sebagai ${roleEmoji[role]} <b>${role.toUpperCase()}</b>!`, { parse_mode: 'HTML' });
        }

        // Check channel membership
        const isMember = await isChannelMember(userId, groupConfig.channel);

        if (isMember) {
            // Auto-add user
            const added = addUserToRole(userId, role);

            if (added) {
                const roleEmoji = { premium: '⭐', reseller: '🏪', owner: '👑' };
                bot.sendMessage(chatId, `🎉 <b>SELAMAT ${userName}!</b>

✅ Kamu berhasil terdaftar sebagai ${roleEmoji[role]} <b>${role.toUpperCase()}</b>!

Sekarang kamu bisa menggunakan semua fitur ${role}.`, { parse_mode: 'HTML' });
            } else {
                bot.sendMessage(chatId, '❌ Gagal mendaftarkan. Coba lagi nanti.');
            }
        } else {
            // Not a member - show join button
            const channelLink = groupConfig.channel.startsWith('@')
                ? `https://t.me/${groupConfig.channel.replace('@', '')}`
                : null;

            const keyboard = {
                inline_keyboard: [
                    [
                        { text: '📢 Join Channel', url: channelLink || `https://t.me/c/${groupConfig.channel.replace('-100', '')}` }
                    ],
                    [
                        { text: '✅ Sudah Join', callback_data: `autoadd_verify_${chatId}` }
                    ]
                ]
            };

            bot.sendMessage(chatId, `⚠️ <b>${userName}, kamu belum join channel!</b>

Untuk mendaftar sebagai <b>${role.toUpperCase()}</b>, kamu harus:

1️⃣ Join channel: <b>${groupConfig.channelTitle}</b>
2️⃣ Klik tombol "Sudah Join" di bawah

Setelah terverifikasi, kamu akan otomatis terdaftar!`, {
                parse_mode: 'HTML',
                reply_markup: keyboard
            });
        }
    });

    // ═══════════════════════════════════════════════════════════════════════════════
    // Callback: Verify channel membership
    // ═══════════════════════════════════════════════════════════════════════════════
    bot.on('callback_query', async (query) => {
        const data = query.data;

        if (!data.startsWith('autoadd_verify_')) return;

        const userId = query.from.id;
        const userName = query.from.first_name;
        const groupId = data.replace('autoadd_verify_', '');

        const config = loadJsonData(AUTOADD_FILE);
        const groupConfig = config.groups[groupId];

        if (!groupConfig || !groupConfig.enabled) {
            return bot.answerCallbackQuery(query.id, {
                text: '❌ Auto-add tidak aktif',
                show_alert: true
            });
        }

        // Verify channel membership
        const isMember = await isChannelMember(userId, groupConfig.channel);

        if (!isMember) {
            return bot.answerCallbackQuery(query.id, {
                text: '❌ Kamu belum join channel! Join dulu ya.',
                show_alert: true
            });
        }

        // Check if already registered
        if (hasRole(userId, groupConfig.role)) {
            return bot.answerCallbackQuery(query.id, {
                text: `✅ Kamu sudah terdaftar sebagai ${groupConfig.role.toUpperCase()}!`,
                show_alert: true
            });
        }

        // Add user to role
        const added = addUserToRole(userId, groupConfig.role);

        if (added) {
            const roleEmoji = { premium: '⭐', reseller: '🏪', owner: '👑' };

            bot.answerCallbackQuery(query.id, {
                text: `🎉 Selamat! Kamu sekarang ${groupConfig.role.toUpperCase()}!`,
                show_alert: true
            });

            // Update the message
            bot.editMessageText(`🎉 <b>VERIFIKASI BERHASIL!</b>

✅ <b>${userName}</b> berhasil terdaftar sebagai ${roleEmoji[groupConfig.role]} <b>${groupConfig.role.toUpperCase()}</b>!

Selamat menggunakan bot!`, {
                chat_id: query.message.chat.id,
                message_id: query.message.message_id,
                parse_mode: 'HTML'
            });
        } else {
            bot.answerCallbackQuery(query.id, {
                text: '❌ Gagal mendaftarkan. Hubungi admin.',
                show_alert: true
            });
        }
    });

    // ═══════════════════════════════════════════════════════════════════════════════
    // Auto-check on any message (optional - for stricter enforcement)
    // ═══════════════════════════════════════════════════════════════════════════════
    // Uncomment if you want to prompt every unregistered user
    /*
    bot.on('message', async (msg) => {
        if (msg.chat.type === 'private') return;
        if (msg.text?.startsWith('/')) return; // Skip commands
        
        const config = loadJsonData(AUTOADD_FILE);
        const groupConfig = config.groups[msg.chat.id];
        
        if (!groupConfig || !groupConfig.enabled) return;
        
        const userId = msg.from.id;
        const role = groupConfig.role;
        
        if (!hasRole(userId, role)) {
            // Silently remind or auto-delete message
            // Implementation depends on desired strictness
        }
    });
    */

};
