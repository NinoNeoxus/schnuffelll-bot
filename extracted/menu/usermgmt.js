/**
 * ═══════════════════════════════════════════════════════════════════════════════════════
 *  👥 SCHNUFFELLL BOT - USER MANAGEMENT v8.0
 *  Advanced user management commands
 *  
 *  Commands:
 *  /userinfo <id>    - Info user detail
 *  /useradd          - Add user ke panel
 *  /userdelete <id>  - Delete user dari panel
 *  /usersearch       - Search user
 *  /userservers <id> - List servers milik user
 *  /userpromote      - Promote user ke admin
 *  /userdemote       - Demote admin ke user
 *  /userban <id>     - Ban user (bot level)
 *  /userunban <id>   - Unban user
 *  /userexport       - Export user list
 *  
 *  @author @schnuffelll
 *  @version 8.0
 * ═══════════════════════════════════════════════════════════════════════════════════════
 */

const axios = require('axios');
const fs = require('fs');
const { loadJsonData, saveJsonData } = require('../lib/function');

const settings = require('../config.js');

module.exports = (bot) => {

    console.log('[USER] 👥 User Management Module v8.0 loaded');

    const OWNER_FILE = './db/users/adminID.json';
    const PREMIUM_FILE = './db/users/premiumUsers.json';
    const RESS_FILE = './db/users/resellerUsers.json';
    const BANNED_FILE = './db/users/banned.json';

    // Helper: Check owner
    function isOwner(userId) {
        const owners = loadJsonData(OWNER_FILE);
        return owners.includes(String(userId));
    }

    // Helper: Get panel config
    function getPanelConfig(version = 1) {
        const versions = {
            1: { domain: settings.domain, key: settings.plta },
            2: { domain: settings.domainV2, key: settings.pltaV2 },
            3: { domain: settings.domainV3, key: settings.pltaV3 },
            4: { domain: settings.domainV4, key: settings.pltaV4 },
            5: { domain: settings.domainV5, key: settings.pltaV5 }
        };
        return versions[version] || versions[1];
    }

    // Helper: Panel API
    async function panelApi(endpoint, method = 'GET', data = null, version = 1) {
        const config = getPanelConfig(version);
        const url = `https://${config.domain}/api${endpoint}`;
        const headers = {
            'Authorization': `Bearer ${config.key}`,
            'Content-Type': 'application/json',
            'Accept': 'application/json'
        };

        const response = await axios({ method, url, headers, data, timeout: 15000 });
        return response.data;
    }

    // Initialize banned file
    if (!fs.existsSync(BANNED_FILE)) {
        saveJsonData(BANNED_FILE, []);
    }

    // ═══════════════════════════════════════════════════════════════════════════════
    // /userinfo <panel_user_id> [version] - Info user panel detail
    // ═══════════════════════════════════════════════════════════════════════════════
    bot.onText(/^\/userinfo\s+(\d+)(?:\s+(\d))?$/i, async (msg, match) => {
        const chatId = msg.chat.id;
        const userId = msg.from.id.toString();

        if (!isOwner(userId)) {
            return bot.sendMessage(chatId, '❌ ᴋʜᴜꜱᴜꜱ ᴏᴡɴᴇʀ!');
        }

        const panelUserId = match[1];
        const version = match[2] ? parseInt(match[2]) : 1;
        const wait = await bot.sendMessage(chatId, `⏳ Fetching user ${panelUserId}...`);

        try {
            const data = await panelApi(`/application/users/${panelUserId}?include=servers`, 'GET', null, version);
            const user = data.attributes;
            const servers = data.attributes?.relationships?.servers?.data || [];

            const text = `
👤 <b>USER INFO</b>
<code>━━━━━━━━━━━━━━━━━━━━━━</code>

<blockquote>
🆔 <b>ID:</b> ${user.id}
👤 <b>Username:</b> ${user.username}
📧 <b>Email:</b> ${user.email}
📛 <b>Name:</b> ${user.first_name} ${user.last_name}
👑 <b>Admin:</b> ${user.root_admin ? '✅ Yes' : '❌ No'}
🔐 <b>2FA:</b> ${user['2fa'] ? '✅ Enabled' : '❌ Disabled'}

🖥️ <b>Servers:</b> ${servers.length}
📅 <b>Created:</b> ${user.created_at?.split('T')[0] || '-'}
</blockquote>
`;

            bot.editMessageText(text, {
                chat_id: chatId,
                message_id: wait.message_id,
                parse_mode: 'HTML',
                reply_markup: {
                    inline_keyboard: [
                        [
                            { text: '🖥️ Servers', callback_data: `user_servers_${panelUserId}_${version}` },
                            { text: user.root_admin ? '👤 Demote' : '👑 Promote', callback_data: `user_toggle_admin_${panelUserId}_${version}` }
                        ],
                        [
                            { text: '🗑️ Delete', callback_data: `user_delete_${panelUserId}_${version}` }
                        ]
                    ]
                }
            });

        } catch (error) {
            bot.editMessageText(`❌ Error: ${error.message}`, {
                chat_id: chatId,
                message_id: wait.message_id
            });
        }
    });

    // ═══════════════════════════════════════════════════════════════════════════════
    // /usersearch <query> [version] - Search user
    // ═══════════════════════════════════════════════════════════════════════════════
    bot.onText(/^\/usersearch\s+(\S+)(?:\s+(\d))?$/i, async (msg, match) => {
        const chatId = msg.chat.id;
        const userId = msg.from.id.toString();

        if (!isOwner(userId)) {
            return bot.sendMessage(chatId, '❌ ᴋʜᴜꜱᴜꜱ ᴏᴡɴᴇʀ!');
        }

        const query = match[1].toLowerCase();
        const version = match[2] ? parseInt(match[2]) : 1;
        const wait = await bot.sendMessage(chatId, `⏳ Searching "${query}"...`);

        try {
            const data = await panelApi('/application/users?per_page=100', 'GET', null, version);
            const users = data.data || [];

            const matches = users.filter(u => {
                const attr = u.attributes;
                return attr.username?.toLowerCase().includes(query) ||
                    attr.email?.toLowerCase().includes(query) ||
                    attr.first_name?.toLowerCase().includes(query);
            });

            if (matches.length === 0) {
                return bot.editMessageText(`📋 Tidak ada user ditemukan untuk "${query}"`, {
                    chat_id: chatId,
                    message_id: wait.message_id
                });
            }

            let text = `🔍 <b>SEARCH RESULTS</b> (${matches.length})\n<code>━━━━━━━━━━━━━━━━━━━━━━</code>\n\n`;

            matches.slice(0, 15).forEach((u, i) => {
                const attr = u.attributes;
                text += `${i + 1}. ${attr.root_admin ? '👑' : '👤'} <b>${attr.username}</b>\n`;
                text += `   🆔 ${attr.id} | 📧 ${attr.email}\n\n`;
            });

            bot.editMessageText(text, {
                chat_id: chatId,
                message_id: wait.message_id,
                parse_mode: 'HTML'
            });

        } catch (error) {
            bot.editMessageText(`❌ Error: ${error.message}`, {
                chat_id: chatId,
                message_id: wait.message_id
            });
        }
    });

    // ═══════════════════════════════════════════════════════════════════════════════
    // /userservers <user_id> [version] - List servers milik user
    // ═══════════════════════════════════════════════════════════════════════════════
    bot.onText(/^\/userservers\s+(\d+)(?:\s+(\d))?$/i, async (msg, match) => {
        const chatId = msg.chat.id;
        const userId = msg.from.id.toString();

        if (!isOwner(userId)) {
            return bot.sendMessage(chatId, '❌ ᴋʜᴜꜱᴜꜱ ᴏᴡɴᴇʀ!');
        }

        const panelUserId = match[1];
        const version = match[2] ? parseInt(match[2]) : 1;
        const wait = await bot.sendMessage(chatId, `⏳ Fetching servers for user ${panelUserId}...`);

        try {
            const data = await panelApi(`/application/users/${panelUserId}?include=servers`, 'GET', null, version);
            const servers = data.attributes?.relationships?.servers?.data || [];

            if (servers.length === 0) {
                return bot.editMessageText(`📋 User ${panelUserId} tidak punya server.`, {
                    chat_id: chatId,
                    message_id: wait.message_id
                });
            }

            let text = `🖥️ <b>SERVERS MILIK USER ${panelUserId}</b>\n<code>━━━━━━━━━━━━━━━━━━━━━━</code>\n\n`;

            servers.forEach((s, i) => {
                const attr = s.attributes;
                text += `${i + 1}. ${attr.suspended ? '🔴' : '🟢'} <b>${attr.name}</b>\n`;
                text += `   🆔 ${attr.identifier} | 💾 ${attr.limits?.memory}MB\n\n`;
            });

            bot.editMessageText(text, {
                chat_id: chatId,
                message_id: wait.message_id,
                parse_mode: 'HTML'
            });

        } catch (error) {
            bot.editMessageText(`❌ Error: ${error.message}`, {
                chat_id: chatId,
                message_id: wait.message_id
            });
        }
    });

    // ═══════════════════════════════════════════════════════════════════════════════
    // /useradd <username>,<email>,<password> [version] - Create panel user
    // ═══════════════════════════════════════════════════════════════════════════════
    bot.onText(/^\/useradd\s+(.+)$/i, async (msg, match) => {
        const chatId = msg.chat.id;
        const userId = msg.from.id.toString();

        if (!isOwner(userId)) {
            return bot.sendMessage(chatId, '❌ ᴋʜᴜꜱᴜꜱ ᴏᴡɴᴇʀ!');
        }

        const parts = match[1].split(/[|,]/).map(x => x.trim());
        if (parts.length < 3) {
            return bot.sendMessage(chatId, '❌ Format: /useradd username,email,password\n\nContoh: /useradd john,john@mail.com,password123');
        }

        const [username, email, password] = parts;
        const version = parts[3] ? parseInt(parts[3]) : 1;

        const wait = await bot.sendMessage(chatId, `⏳ Creating user ${username}...`);

        try {
            const data = await panelApi('/application/users', 'POST', {
                username,
                email,
                first_name: username,
                last_name: 'User',
                password
            }, version);

            const user = data.attributes;

            bot.editMessageText(`✅ <b>User Created!</b>\n\n👤 Username: ${user.username}\n🆔 ID: ${user.id}\n📧 Email: ${user.email}\n🔑 Password: <code>${password}</code>`, {
                chat_id: chatId,
                message_id: wait.message_id,
                parse_mode: 'HTML'
            });

        } catch (error) {
            const errMsg = error.response?.data?.errors?.[0]?.detail || error.message;
            bot.editMessageText(`❌ Error: ${errMsg}`, {
                chat_id: chatId,
                message_id: wait.message_id
            });
        }
    });

    // ═══════════════════════════════════════════════════════════════════════════════
    // /userdelete <id> [version] - Delete panel user
    // ═══════════════════════════════════════════════════════════════════════════════
    bot.onText(/^\/userdelete\s+(\d+)(?:\s+(\d))?$/i, async (msg, match) => {
        const chatId = msg.chat.id;
        const userId = msg.from.id.toString();

        if (!isOwner(userId)) {
            return bot.sendMessage(chatId, '❌ ᴋʜᴜꜱᴜꜱ ᴏᴡɴᴇʀ!');
        }

        const panelUserId = match[1];
        const version = match[2] ? parseInt(match[2]) : 1;

        bot.sendMessage(chatId, `⚠️ <b>KONFIRMASI DELETE USER</b>\n\n🆔 User ID: ${panelUserId}\n\n⚠️ Ketik <code>/userdeleteconfirm ${panelUserId} ${version}</code> untuk hapus.`, { parse_mode: 'HTML' });
    });

    bot.onText(/^\/userdeleteconfirm\s+(\d+)(?:\s+(\d))?$/i, async (msg, match) => {
        const chatId = msg.chat.id;
        const userId = msg.from.id.toString();

        if (!isOwner(userId)) {
            return bot.sendMessage(chatId, '❌ ᴋʜᴜꜱᴜꜱ ᴏᴡɴᴇʀ!');
        }

        const panelUserId = match[1];
        const version = match[2] ? parseInt(match[2]) : 1;
        const wait = await bot.sendMessage(chatId, `⏳ Deleting user ${panelUserId}...`);

        try {
            await panelApi(`/application/users/${panelUserId}`, 'DELETE', null, version);

            bot.editMessageText(`🗑️ <b>User Deleted!</b>\n\n🆔 User ID: ${panelUserId}`, {
                chat_id: chatId,
                message_id: wait.message_id,
                parse_mode: 'HTML'
            });

        } catch (error) {
            bot.editMessageText(`❌ Error: ${error.message}`, {
                chat_id: chatId,
                message_id: wait.message_id
            });
        }
    });

    // ═══════════════════════════════════════════════════════════════════════════════
    // /userban <telegram_id> - Ban user (bot level)
    // ═══════════════════════════════════════════════════════════════════════════════
    bot.onText(/^\/userban\s+(\d+)$/i, async (msg, match) => {
        const chatId = msg.chat.id;
        const userId = msg.from.id.toString();

        if (!isOwner(userId)) {
            return bot.sendMessage(chatId, '❌ ᴋʜᴜꜱᴜꜱ ᴏᴡɴᴇʀ!');
        }

        const targetId = match[1];
        let banned = loadJsonData(BANNED_FILE) || [];

        if (banned.includes(targetId)) {
            return bot.sendMessage(chatId, `⚠️ User ${targetId} sudah dibanned!`);
        }

        banned.push(targetId);
        saveJsonData(BANNED_FILE, banned);

        bot.sendMessage(chatId, `🚫 <b>User Banned!</b>\n\n🆔 Telegram ID: <code>${targetId}</code>\n\nUser tidak bisa menggunakan bot.`, { parse_mode: 'HTML' });
    });

    // /userunban <telegram_id> - Unban user
    bot.onText(/^\/userunban\s+(\d+)$/i, async (msg, match) => {
        const chatId = msg.chat.id;
        const userId = msg.from.id.toString();

        if (!isOwner(userId)) {
            return bot.sendMessage(chatId, '❌ ᴋʜᴜꜱᴜꜱ ᴏᴡɴᴇʀ!');
        }

        const targetId = match[1];
        let banned = loadJsonData(BANNED_FILE) || [];

        if (!banned.includes(targetId)) {
            return bot.sendMessage(chatId, `⚠️ User ${targetId} tidak ada di ban list!`);
        }

        banned = banned.filter(id => id !== targetId);
        saveJsonData(BANNED_FILE, banned);

        bot.sendMessage(chatId, `✅ <b>User Unbanned!</b>\n\n🆔 Telegram ID: <code>${targetId}</code>`, { parse_mode: 'HTML' });
    });

    // /userbanned - List banned users
    bot.onText(/^\/userbanned$/i, async (msg) => {
        const chatId = msg.chat.id;
        const userId = msg.from.id.toString();

        if (!isOwner(userId)) {
            return bot.sendMessage(chatId, '❌ ᴋʜᴜꜱᴜꜱ ᴏᴡɴᴇʀ!');
        }

        const banned = loadJsonData(BANNED_FILE) || [];

        if (banned.length === 0) {
            return bot.sendMessage(chatId, '📋 Tidak ada user yang dibanned.');
        }

        let text = `🚫 <b>BANNED USERS</b> (${banned.length})\n<code>━━━━━━━━━━━━━━━━━━━━━━</code>\n\n`;
        banned.forEach((id, i) => {
            text += `${i + 1}. <code>${id}</code>\n`;
        });

        bot.sendMessage(chatId, text, { parse_mode: 'HTML' });
    });

    // ═══════════════════════════════════════════════════════════════════════════════
    // /cadp <name>,<id_tele> [version] - Create Admin Panel (Legacy Support)
    // ═══════════════════════════════════════════════════════════════════════════════
    bot.onText(/^\/cadp(?:\s+(.+))?$/i, async (msg, match) => {
        const chatId = msg.chat.id;
        const userId = msg.from.id.toString();

        if (!isOwner(userId) && userId !== settings.ownerId.toString()) {
            return bot.sendMessage(chatId, '❌ ᴋʜᴜꜱᴜꜱ ᴏᴡɴᴇʀ!');
        }

        if (!match[1]) {
            return bot.sendMessage(chatId, '❌ Format: /cadp name,telegram_id [version]\n\nContoh: /cadp john,123456789 1');
        }

        const parts = match[1].split(',').map(x => x.trim());
        if (parts.length < 2) {
            return bot.sendMessage(chatId, '❌ Format: /cadp name,telegram_id [version]\n\nContoh: /cadp john,123456789 1');
        }

        const panelName = parts[0];
        const targetId = parts[1];
        // Check for version in the last part or implicitly
        // If parts[2] exists, it might be version
        let version = 1;
        if (parts[2]) version = parseInt(parts[2]);
        // Or if the input style was "/cadp name,id 2" (space separated version) - match regex handles space after command
        // But match[1] is the whole string. 
        // Let's refine parsing.

        // Split by space to check for version at the end
        const args = match[1].split(/\s+/);
        // This is tricky if comma is used. Let's stick to simple comma splitting and valid int check
        const lastPart = parts[parts.length - 1];
        const possibleVersion = lastPart.split(' ')[1]; // "id 2"
        if (possibleVersion) {
            version = parseInt(possibleVersion);
            parts[parts.length - 1] = lastPart.split(' ')[0]; // clean id
        } else if (parts[2] && !isNaN(parts[2])) {
            version = parseInt(parts[2]);
        }

        const password = panelName + Math.random().toString(36).slice(2, 6);
        const config = getPanelConfig(version);
        const wait = await bot.sendMessage(chatId, `⏳ Creating admin for ${panelName}...`);

        try {
            const data = await panelApi('/application/users', 'POST', {
                email: `${panelName}@admin.schnuffelll`,
                username: panelName,
                first_name: panelName,
                last_name: 'Admin',
                language: 'en',
                root_admin: true,
                password: password
            }, version);

            const user = data.attributes;
            const caption = `🔐 <b>Sukses Created Admin Panel v${version}!</b>

👤 Username: <code>${user.username}</code>
🔑 Password: <code>${password}</code>
🌐 Login: ${config.domain}

<blockquote>📌 Catatan :
Simpan informasi data ini dengan aman
dan jangan bagikan ke orang lain!</blockquote>
`;

            // Try sending to target
            try {
                if (settings.panel) {
                    await bot.sendPhoto(targetId, settings.panel, { caption, parse_mode: 'HTML' });
                } else {
                    await bot.sendMessage(targetId, caption, { parse_mode: 'HTML' });
                }
                bot.editMessageText(`✅ <b>Admin Created!</b>\n\nSent to: <code>${targetId}</code>`, {
                    chat_id: chatId,
                    message_id: wait.message_id,
                    parse_mode: 'HTML'
                });
            } catch (sendErr) {
                bot.editMessageText(`✅ <b>Admin Created!</b> (Gagal kirim ke user)\n\n👤 User: <code>${user.username}</code>\n🔑 Pass: <code>${password}</code>`, {
                    chat_id: chatId,
                    message_id: wait.message_id,
                    parse_mode: 'HTML'
                });
            }

        } catch (error) {
            const errMsg = error.response?.data?.errors?.[0]?.detail || error.message;
            bot.editMessageText(`❌ Error: ${errMsg}`, {
                chat_id: chatId,
                message_id: wait.message_id
            });
        }
    });

    // ═══════════════════════════════════════════════════════════════════════════════
    // /userexport [version] - Export user list
    // ═══════════════════════════════════════════════════════════════════════════════
    bot.onText(/^\/userexport(?:\s+(\d))?$/i, async (msg, match) => {
        const chatId = msg.chat.id;
        const userId = msg.from.id.toString();

        if (!isOwner(userId)) {
            return bot.sendMessage(chatId, '❌ ᴋʜᴜꜱᴜꜱ ᴏᴡɴᴇʀ!');
        }

        const version = match[1] ? parseInt(match[1]) : 1;
        const wait = await bot.sendMessage(chatId, `⏳ Exporting users from Panel V${version}...`);

        try {
            const data = await panelApi('/application/users?per_page=500', 'GET', null, version);
            const users = data.data || [];

            let csv = 'ID,Username,Email,FirstName,LastName,Admin,2FA,CreatedAt\n';
            users.forEach(u => {
                const a = u.attributes;
                csv += `${a.id},${a.username},${a.email},${a.first_name || ''},${a.last_name || ''},${a.root_admin},${a['2fa']},${a.created_at}\n`;
            });

            const filename = `users_v${version}_${Date.now()}.csv`;
            fs.writeFileSync(`./${filename}`, csv);

            await bot.sendDocument(chatId, `./${filename}`, {
                caption: `📊 Export ${users.length} users dari Panel V${version}`
            });

            fs.unlinkSync(`./${filename}`);

            bot.deleteMessage(chatId, wait.message_id).catch(() => { });

        } catch (error) {
            bot.editMessageText(`❌ Error: ${error.message}`, {
                chat_id: chatId,
                message_id: wait.message_id
            });
        }
    });

    // ═══════════════════════════════════════════════════════════════════════════════
    // CALLBACK HANDLERS
    // ═══════════════════════════════════════════════════════════════════════════════
    bot.on('callback_query', async (query) => {
        const data = query.data;
        const chatId = query.message.chat.id;
        const userId = query.from.id.toString();

        if (!data.startsWith('user_')) return;

        if (!isOwner(userId)) {
            return bot.answerCallbackQuery(query.id, { text: '❌ Akses ditolak!', show_alert: true });
        }

        const parts = data.split('_');
        const action = parts[1];

        if (action === 'servers') {
            const panelUserId = parts[2];
            const version = parseInt(parts[3]) || 1;
            bot.answerCallbackQuery(query.id, { text: '⏳ Loading...' });
            bot.sendMessage(chatId, `Gunakan /userservers ${panelUserId} ${version}`);
        }

        if (action === 'delete') {
            const panelUserId = parts[2];
            const version = parseInt(parts[3]) || 1;
            bot.answerCallbackQuery(query.id, { text: '⚠️ Confirm delete', show_alert: true });
            bot.sendMessage(chatId, `⚠️ Ketik /userdeleteconfirm ${panelUserId} ${version} untuk hapus user.`);
        }

        if (action === 'toggle') {
            // user_toggle_admin_id_version
            const panelUserId = parts[3];
            const version = parseInt(parts[4]) || 1;
            bot.answerCallbackQuery(query.id, { text: '⏳ Toggling admin...', show_alert: false });

            try {
                // Get current user
                const userData = await panelApi(`/application/users/${panelUserId}`, 'GET', null, version);
                const isAdmin = userData.attributes.root_admin;

                // Toggle admin
                await panelApi(`/application/users/${panelUserId}`, 'PATCH', {
                    root_admin: !isAdmin
                }, version);

                bot.sendMessage(chatId, `✅ User ${panelUserId} sekarang ${!isAdmin ? 'Admin 👑' : 'User biasa 👤'}`);
            } catch (error) {
                bot.sendMessage(chatId, `❌ Error: ${error.message}`);
            }
        }
    });

};
