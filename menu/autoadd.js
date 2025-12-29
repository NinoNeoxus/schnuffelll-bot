/**
 * ═══════════════════════════════════════════════════════════════════════════════════════
 *  🔗 SCHNUFFELLL BOT - AUTO-ADD SYSTEM v9.0
 *  Setup di PRIVATE CHAT, auto-add tanpa pilih role
 *  
 *  SETUP FLOW (Owner di Private Chat):
 *  1. /autoadd → Bot minta channel
 *  2. Ketik channel → Bot cek admin, lanjut minta role
 *  3. Pilih role (address/addpr/addown/prem) → Bot tampilkan grup
 *  4. Pilih grup → AKTIF!
 *  
 *  USER FLOW (di Grup):
 *  1. User ketik "add" atau /daftar
 *  2. Bot cek channel membership
 *  3. Kalau sudah join → LANGSUNG di-add ke role yang sudah di-set
 *  4. Kalau belum join → Kasih link channel, minta join
 *  
 *  Commands:
 *  /autoadd         - Setup auto-add (PRIVATE ONLY)
 *  /autoaddinfo     - Lihat konfigurasi aktif
 *  /autoaddoff      - Matikan auto-add untuk grup tertentu
 *  /cleanmem        - Hapus semua user yang di-auto-add dari database
 *  
 *  @author @schnuffelll
 *  @version 9.0
 * ═══════════════════════════════════════════════════════════════════════════════════════
 */

const fs = require('fs');
const { loadJsonData, saveJsonData } = require('../lib/function');
const settings = require('../config.js');

module.exports = (bot) => {

    console.log('[AUTOADD] 🔗 Auto-Add System v9.0 loaded');

    // Files
    const OWNER_FILE = './db/users/adminID.json';
    const PREMIUM_FILE = './db/users/premiumUsers.json';
    const RESELLER_FILE = './db/users/resellerUsers.json';
    const AUTOADD_FILE = './db/autoadd_config.json';
    const AUTOADD_MEMBERS_FILE = './db/autoadd_members.json'; // Track siapa yang di-add

    // Initialize files
    if (!fs.existsSync(AUTOADD_FILE)) {
        saveJsonData(AUTOADD_FILE, { configs: {} });
    }
    if (!fs.existsSync(AUTOADD_MEMBERS_FILE)) {
        saveJsonData(AUTOADD_MEMBERS_FILE, { members: [] });
    }

    // Setup wizard state (for private chat setup)
    const setupState = new Map();

    // Cooldown untuk anti-spam
    const userCooldown = new Map();
    const COOLDOWN_MS = 60000; // 1 menit

    // ═══════════════════════════════════════════════════════════════════════════════════
    // HELPER FUNCTIONS
    // ═══════════════════════════════════════════════════════════════════════════════════

    function isOwner(userId) {
        const owners = loadJsonData(OWNER_FILE);
        return owners.includes(String(userId)) || String(userId) === String(settings.ownerId);
    }

    async function isBotAdminInChannel(channelId) {
        try {
            const botInfo = await bot.getMe();
            const member = await bot.getChatMember(channelId, botInfo.id);
            return ['creator', 'administrator'].includes(member.status);
        } catch (e) {
            return false;
        }
    }

    async function isUserInChannel(userId, channelId) {
        try {
            const member = await bot.getChatMember(channelId, userId);
            return ['creator', 'administrator', 'member'].includes(member.status);
        } catch (e) {
            return false;
        }
    }

    async function getChannelLink(channelId) {
        try {
            const chat = await bot.getChat(channelId);
            if (chat.username) {
                return `https://t.me/${chat.username}`;
            }
            // Private channel - try to get invite link
            try {
                const inviteLink = await bot.exportChatInviteLink(channelId);
                return inviteLink;
            } catch (e) {
                return null;
            }
        } catch (e) {
            return null;
        }
    }

    function addUserToRole(userId, role) {
        const userIdStr = String(userId);
        let added = false;

        if (role === 'address' || role === 'reseller') {
            // Reseller only
            let resellers = loadJsonData(RESELLER_FILE) || [];
            if (!resellers.includes(userIdStr)) {
                resellers.push(userIdStr);
                saveJsonData(RESELLER_FILE, resellers);
                added = true;
            }
        } else if (role === 'addpr' || role === 'premres') {
            // Premium + Reseller
            let premium = loadJsonData(PREMIUM_FILE) || [];
            let resellers = loadJsonData(RESELLER_FILE) || [];

            if (!premium.includes(userIdStr)) {
                premium.push(userIdStr);
                saveJsonData(PREMIUM_FILE, premium);
                added = true;
            }
            if (!resellers.includes(userIdStr)) {
                resellers.push(userIdStr);
                saveJsonData(RESELLER_FILE, resellers);
                added = true;
            }
        } else if (role === 'addown' || role === 'owner') {
            // Owner
            let owners = loadJsonData(OWNER_FILE) || [];
            if (!owners.includes(userIdStr)) {
                owners.push(userIdStr);
                saveJsonData(OWNER_FILE, owners);
                added = true;
            }
        } else if (role === 'prem' || role === 'premium') {
            // Premium only
            let premium = loadJsonData(PREMIUM_FILE) || [];
            if (!premium.includes(userIdStr)) {
                premium.push(userIdStr);
                saveJsonData(PREMIUM_FILE, premium);
                added = true;
            }
        }

        // Track member yang di-add
        if (added) {
            let membersData = loadJsonData(AUTOADD_MEMBERS_FILE) || { members: [] };
            membersData.members.push({
                oderId: userIdStr,
                role: role,
                addedAt: new Date().toISOString()
            });
            saveJsonData(AUTOADD_MEMBERS_FILE, membersData);
        }

        return added;
    }

    function getRoleName(role) {
        const roleNames = {
            'address': '📦 Reseller',
            'reseller': '📦 Reseller',
            'addpr': '⭐ Premium + Reseller',
            'premres': '⭐ Premium + Reseller',
            'addown': '👑 Owner',
            'owner': '👑 Owner',
            'prem': '💎 Premium',
            'premium': '💎 Premium'
        };
        return roleNames[role] || role;
    }

    // ═══════════════════════════════════════════════════════════════════════════════════
    // /autoadd - SETUP di Private Chat
    // ═══════════════════════════════════════════════════════════════════════════════════
    bot.onText(/^\/autoadd$/i, async (msg) => {
        const chatId = msg.chat.id;
        const userId = msg.from.id;

        // Must be owner
        if (!isOwner(userId)) {
            return bot.sendMessage(chatId, '❌ Khusus Owner Bot!');
        }

        // Must be private chat
        if (msg.chat.type !== 'private') {
            return bot.sendMessage(chatId, '❌ Command ini harus dijalankan di <b>Private Chat</b> dengan bot!\n\n📌 Chat bot secara private untuk setup auto-add.', { parse_mode: 'HTML' });
        }

        // Start setup wizard
        setupState.set(userId, { step: 'channel', data: {} });

        bot.sendMessage(chatId, `🔧 <b>SETUP AUTO-ADD</b>

<blockquote>Step 1 of 3: Channel</blockquote>

📢 <b>Masukkan Channel yang harus di-join:</b>

Contoh:
• <code>@nama_channel</code>
• <code>-1001234567890</code>

💡 Bot harus menjadi <b>admin</b> di channel tersebut!`, { parse_mode: 'HTML' });
    });

    // ═══════════════════════════════════════════════════════════════════════════════════
    // Handle setup wizard steps
    // ═══════════════════════════════════════════════════════════════════════════════════
    bot.on('message', async (msg) => {
        if (msg.chat.type !== 'private') return;
        if (!msg.text || msg.text.startsWith('/')) return;

        const userId = msg.from.id;
        const chatId = msg.chat.id;
        const text = msg.text.trim();

        const state = setupState.get(userId);
        if (!state) return;

        // Step 1: Channel
        if (state.step === 'channel') {
            const channelId = text;

            const wait = await bot.sendMessage(chatId, '⏳ Mengecek channel...');

            try {
                const chat = await bot.getChat(channelId);

                if (chat.type !== 'channel') {
                    return bot.editMessageText('❌ Ini bukan channel! Masukkan username/ID channel yang benar.', {
                        chat_id: chatId, message_id: wait.message_id
                    });
                }

                const isAdmin = await isBotAdminInChannel(channelId);
                if (!isAdmin) {
                    return bot.editMessageText(`❌ <b>Bot bukan admin di channel!</b>

📢 Channel: ${chat.title}

📌 Langkah yang perlu dilakukan:
1. Buka channel <b>${chat.title}</b>
2. Tambahkan bot sebagai admin
3. Ketik ulang channel ID/username`, {
                        chat_id: chatId, message_id: wait.message_id, parse_mode: 'HTML'
                    });
                }

                // Save channel data
                state.data.channelId = chat.id;
                state.data.channelTitle = chat.title;
                state.data.channelUsername = chat.username;
                state.step = 'role';
                setupState.set(userId, state);

                // Ask for role
                bot.editMessageText(`✅ <b>Channel Valid!</b>

📢 Channel: <b>${chat.title}</b>
👥 Bot Status: Admin ✓

<blockquote>Step 2 of 3: Role</blockquote>

🎯 <b>Pilih Role untuk auto-add:</b>`, {
                    chat_id: chatId,
                    message_id: wait.message_id,
                    parse_mode: 'HTML',
                    reply_markup: {
                        inline_keyboard: [
                            [{ text: '📦 /address - Reseller', callback_data: 'aa_role_address' }],
                            [{ text: '⭐ /addpr - Premium + Reseller', callback_data: 'aa_role_addpr' }],
                            [{ text: '👑 /addown - Owner Panel', callback_data: 'aa_role_addown' }],
                            [{ text: '💎 /prem - Premium Only', callback_data: 'aa_role_prem' }],
                            [{ text: '❌ Batal', callback_data: 'aa_cancel' }]
                        ]
                    }
                });

            } catch (e) {
                bot.editMessageText(`❌ <b>Channel tidak ditemukan!</b>

Error: ${e.message}

📌 Pastikan:
• Username/ID channel benar
• Channel masih ada
• Bot sudah ditambahkan ke channel`, {
                    chat_id: chatId, message_id: wait.message_id, parse_mode: 'HTML'
                });
            }
        }
    });

    // ═══════════════════════════════════════════════════════════════════════════════════
    // Handle callback queries for setup
    // ═══════════════════════════════════════════════════════════════════════════════════
    bot.on('callback_query', async (query) => {
        const data = query.data;
        const userId = query.from.id;
        const chatId = query.message.chat.id;
        const msgId = query.message.message_id;

        if (!data.startsWith('aa_')) return;

        // Cancel
        if (data === 'aa_cancel') {
            setupState.delete(userId);
            return bot.editMessageText('❌ Setup dibatalkan.', { chat_id: chatId, message_id: msgId });
        }

        // Role selection
        if (data.startsWith('aa_role_')) {
            const role = data.replace('aa_role_', '');
            const state = setupState.get(userId);

            if (!state || state.step !== 'role') {
                return bot.answerCallbackQuery(query.id, { text: 'Session expired. Ketik /autoadd lagi.', show_alert: true });
            }

            state.data.role = role;
            state.step = 'group';
            setupState.set(userId, state);

            // Get list of groups bot is member of
            bot.answerCallbackQuery(query.id, { text: '⏳ Mengambil daftar grup...' });

            // Fetch groups from autoadd config or manual list
            // Since we can't list all groups bot is in, we ask user to forward a message from the target group
            bot.editMessageText(`✅ <b>Role Dipilih:</b> ${getRoleName(role)}

<blockquote>Step 3 of 3: Target Grup</blockquote>

📋 <b>Pilih grup untuk mengaktifkan auto-add:</b>

💡 <b>Forward pesan dari grup target ke sini</b>, atau ketik ID grup:

Contoh: <code>-1001234567890</code>`, {
                chat_id: chatId,
                message_id: msgId,
                parse_mode: 'HTML'
            });
        }

        // Group selection from list (if we have it)
        if (data.startsWith('aa_group_')) {
            const groupId = data.replace('aa_group_', '');
            const state = setupState.get(userId);

            if (!state) {
                return bot.answerCallbackQuery(query.id, { text: 'Session expired.', show_alert: true });
            }

            await activateAutoAdd(chatId, msgId, userId, groupId, state.data, query);
        }

        // Verify join callback (for users in group)
        if (data.startsWith('aa_verify_')) {
            const parts = data.split('_');
            const targetUserId = parts[2];
            const groupId = parts[3];

            if (String(query.from.id) !== String(targetUserId)) {
                return bot.answerCallbackQuery(query.id, { text: '❌ Tombol ini bukan untuk kamu!', show_alert: true });
            }

            await verifyAndAddUser(query, groupId);
        }
    });

    // Handle forwarded message or group ID for step 3
    bot.on('message', async (msg) => {
        if (msg.chat.type !== 'private') return;

        const userId = msg.from.id;
        const chatId = msg.chat.id;
        const state = setupState.get(userId);

        if (!state || state.step !== 'group') return;

        let groupId = null;
        let groupTitle = null;

        // Check if forwarded from group
        if (msg.forward_from_chat && (msg.forward_from_chat.type === 'group' || msg.forward_from_chat.type === 'supergroup')) {
            groupId = msg.forward_from_chat.id;
            groupTitle = msg.forward_from_chat.title;
        } else if (msg.text && msg.text.match(/^-\d+$/)) {
            // Direct group ID input
            groupId = msg.text.trim();
            try {
                const chat = await bot.getChat(groupId);
                groupTitle = chat.title;
            } catch (e) {
                return bot.sendMessage(chatId, `❌ Grup tidak ditemukan atau bot tidak ada di grup tersebut!\n\nError: ${e.message}`);
            }
        } else if (msg.text && !msg.text.startsWith('/')) {
            return; // Not relevant input, ignore
        }

        if (!groupId) return;

        await activateAutoAdd(chatId, null, userId, groupId, { ...state.data, groupTitle }, null);
    });

    // ═══════════════════════════════════════════════════════════════════════════════════
    // Activate auto-add for group
    // ═══════════════════════════════════════════════════════════════════════════════════
    async function activateAutoAdd(chatId, msgId, userId, groupId, data, query) {
        // Save config
        let config = loadJsonData(AUTOADD_FILE) || { configs: {} };

        config.configs[groupId] = {
            channelId: data.channelId,
            channelTitle: data.channelTitle,
            channelUsername: data.channelUsername,
            role: data.role,
            groupTitle: data.groupTitle,
            createdBy: userId,
            createdAt: new Date().toISOString(),
            enabled: true
        };

        saveJsonData(AUTOADD_FILE, config);
        setupState.delete(userId);

        const successMsg = `✅ <b>AUTO-ADD AKTIF!</b>

📢 <b>Channel:</b> ${data.channelTitle}
🎯 <b>Role:</b> ${getRoleName(data.role)}
📋 <b>Grup:</b> ${data.groupTitle || groupId}

<blockquote>⚙️ Cara kerja:
1. User ketik "add" atau /daftar di grup
2. Bot cek apakah sudah join channel
3. Kalau sudah → OTOMATIS di-add ke ${getRoleName(data.role)}
4. Kalau belum → Kasih link channel</blockquote>

💡 Gunakan <code>/autoaddoff</code> untuk mematikan.`;

        if (msgId) {
            bot.editMessageText(successMsg, { chat_id: chatId, message_id: msgId, parse_mode: 'HTML' });
        } else {
            bot.sendMessage(chatId, successMsg, { parse_mode: 'HTML' });
        }

        if (query) {
            bot.answerCallbackQuery(query.id, { text: '✅ Auto-add aktif!' });
        }

        console.log(`[AUTOADD] Activated for group ${groupId} with role ${data.role}`);
    }

    // ═══════════════════════════════════════════════════════════════════════════════════
    // Verify user joined channel and add to role
    // ═══════════════════════════════════════════════════════════════════════════════════
    async function verifyAndAddUser(query, groupId) {
        const userId = query.from.id;
        const chatId = query.message.chat.id;
        const msgId = query.message.message_id;

        const config = loadJsonData(AUTOADD_FILE) || { configs: {} };
        const groupConfig = config.configs[groupId];

        if (!groupConfig || !groupConfig.enabled) {
            return bot.answerCallbackQuery(query.id, { text: '❌ Auto-add tidak aktif!', show_alert: true });
        }

        // Check if user is in channel
        const isInChannel = await isUserInChannel(userId, groupConfig.channelId);

        if (!isInChannel) {
            return bot.answerCallbackQuery(query.id, {
                text: '❌ Kamu belum join channel! Join dulu, tunggu beberapa detik, lalu klik lagi.',
                show_alert: true
            });
        }

        // Add user to role
        const added = addUserToRole(userId, groupConfig.role);

        if (added) {
            bot.editMessageText(`✅ <b>BERHASIL TERDAFTAR!</b>

👤 User: ${query.from.first_name}
🎯 Role: ${getRoleName(groupConfig.role)}

<i>Selamat! Kamu sekarang memiliki akses ${getRoleName(groupConfig.role)}.</i>`, {
                chat_id: chatId,
                message_id: msgId,
                parse_mode: 'HTML'
            });

            bot.answerCallbackQuery(query.id, { text: '✅ Berhasil terdaftar!' });

            // Notify in group
            bot.sendMessage(groupId, `🎉 <b>${query.from.first_name}</b> berhasil terdaftar sebagai ${getRoleName(groupConfig.role)}!`, { parse_mode: 'HTML' }).catch(() => { });
        } else {
            bot.answerCallbackQuery(query.id, { text: '⚠️ Kamu sudah terdaftar sebelumnya!', show_alert: true });
        }
    }

    // ═══════════════════════════════════════════════════════════════════════════════════
    // Handle "add" or /daftar in groups - AUTO ADD without role selection!
    // ═══════════════════════════════════════════════════════════════════════════════════
    bot.on('message', async (msg) => {
        // Only in groups
        if (msg.chat.type === 'private') return;
        if (!msg.text) return;

        const text = msg.text.toLowerCase().trim();
        const chatId = msg.chat.id;
        const userId = msg.from.id;

        // Check if it's add request
        if (!text.includes('add') && !text.startsWith('/daftar')) return;

        // Load config
        const config = loadJsonData(AUTOADD_FILE) || { configs: {} };
        const groupConfig = config.configs[chatId];

        if (!groupConfig || !groupConfig.enabled) return; // No config for this group

        // Cooldown check
        const lastRequest = userCooldown.get(userId);
        if (lastRequest && Date.now() - lastRequest < COOLDOWN_MS) {
            const remaining = Math.ceil((COOLDOWN_MS - (Date.now() - lastRequest)) / 1000);
            return bot.sendMessage(chatId, `⏳ Tunggu ${remaining} detik sebelum mencoba lagi.`, { reply_to_message_id: msg.message_id });
        }
        userCooldown.set(userId, Date.now());

        // Check if user is in required channel
        const isInChannel = await isUserInChannel(userId, groupConfig.channelId);

        if (isInChannel) {
            // AUTO ADD - No role selection needed!
            const added = addUserToRole(userId, groupConfig.role);

            if (added) {
                bot.sendMessage(chatId, `✅ <b>BERHASIL!</b>

👤 ${msg.from.first_name} berhasil terdaftar sebagai ${getRoleName(groupConfig.role)}!

<i>Selamat datang!</i>`, { parse_mode: 'HTML', reply_to_message_id: msg.message_id });

                console.log(`[AUTOADD] Added user ${userId} as ${groupConfig.role} in group ${chatId}`);
            } else {
                bot.sendMessage(chatId, `✅ ${msg.from.first_name}, kamu sudah terdaftar sebelumnya!`, { reply_to_message_id: msg.message_id });
            }
        } else {
            // Not in channel - show join prompt
            const channelLink = await getChannelLink(groupConfig.channelId);

            const keyboard = [];
            if (channelLink) {
                keyboard.push([{ text: '📢 Join Channel', url: channelLink }]);
            }
            keyboard.push([{ text: '✅ Sudah Join', callback_data: `aa_verify_${userId}_${chatId}` }]);

            bot.sendMessage(chatId, `⚠️ <b>${msg.from.first_name}</b>, kamu belum join channel!

📢 Join channel <b>${groupConfig.channelTitle || 'yang diminta'}</b> dulu, lalu klik tombol "Sudah Join".`, {
                parse_mode: 'HTML',
                reply_to_message_id: msg.message_id,
                reply_markup: { inline_keyboard: keyboard }
            });
        }
    });

    // ═══════════════════════════════════════════════════════════════════════════════════
    // /autoaddinfo - Show current config
    // ═══════════════════════════════════════════════════════════════════════════════════
    bot.onText(/^\/autoaddinfo$/i, async (msg) => {
        const chatId = msg.chat.id;
        const userId = msg.from.id;

        if (!isOwner(userId)) {
            return bot.sendMessage(chatId, '❌ Khusus Owner!');
        }

        const config = loadJsonData(AUTOADD_FILE) || { configs: {} };
        const configs = config.configs || {};

        if (Object.keys(configs).length === 0) {
            return bot.sendMessage(chatId, '📭 Belum ada konfigurasi auto-add.\n\nKetik /autoadd untuk setup.', { parse_mode: 'HTML' });
        }

        let text = '📋 <b>AUTO-ADD CONFIGURATIONS</b>\n\n';

        for (const [groupId, cfg] of Object.entries(configs)) {
            const status = cfg.enabled ? '🟢 Aktif' : '🔴 Nonaktif';
            text += `<b>Grup:</b> ${cfg.groupTitle || groupId}\n`;
            text += `📢 Channel: ${cfg.channelTitle || cfg.channelId}\n`;
            text += `🎯 Role: ${getRoleName(cfg.role)}\n`;
            text += `📊 Status: ${status}\n`;
            text += `─────────────\n`;
        }

        bot.sendMessage(chatId, text, { parse_mode: 'HTML' });
    });

    // ═══════════════════════════════════════════════════════════════════════════════════
    // /autoaddoff - Disable auto-add for a group
    // ═══════════════════════════════════════════════════════════════════════════════════
    bot.onText(/^\/autoaddoff(?:\s+(.+))?$/i, async (msg, match) => {
        const chatId = msg.chat.id;
        const userId = msg.from.id;

        if (!isOwner(userId)) {
            return bot.sendMessage(chatId, '❌ Khusus Owner!');
        }

        const config = loadJsonData(AUTOADD_FILE) || { configs: {} };
        let targetGroupId = match[1] ? match[1].trim() : null;

        // If in group, use current group
        if (!targetGroupId && msg.chat.type !== 'private') {
            targetGroupId = String(chatId);
        }

        if (!targetGroupId) {
            // Show list of groups to disable
            const configs = config.configs || {};
            if (Object.keys(configs).length === 0) {
                return bot.sendMessage(chatId, '📭 Tidak ada auto-add yang aktif.');
            }

            const keyboard = Object.entries(configs).map(([gid, cfg]) => [{
                text: `❌ ${cfg.groupTitle || gid}`,
                callback_data: `aa_off_${gid}`
            }]);

            return bot.sendMessage(chatId, '🔧 <b>Pilih grup untuk menonaktifkan auto-add:</b>', {
                parse_mode: 'HTML',
                reply_markup: { inline_keyboard: keyboard }
            });
        }

        if (config.configs[targetGroupId]) {
            config.configs[targetGroupId].enabled = false;
            saveJsonData(AUTOADD_FILE, config);
            bot.sendMessage(chatId, `✅ Auto-add untuk grup ${config.configs[targetGroupId].groupTitle || targetGroupId} dinonaktifkan.`);
        } else {
            bot.sendMessage(chatId, '❌ Konfigurasi tidak ditemukan untuk grup tersebut.');
        }
    });

    // Handle autoaddoff callback
    bot.on('callback_query', async (query) => {
        if (!query.data.startsWith('aa_off_')) return;

        const groupId = query.data.replace('aa_off_', '');
        const userId = query.from.id;
        const chatId = query.message.chat.id;
        const msgId = query.message.message_id;

        if (!isOwner(userId)) {
            return bot.answerCallbackQuery(query.id, { text: '❌ Khusus Owner!', show_alert: true });
        }

        const config = loadJsonData(AUTOADD_FILE) || { configs: {} };

        if (config.configs[groupId]) {
            config.configs[groupId].enabled = false;
            saveJsonData(AUTOADD_FILE, config);

            bot.editMessageText(`✅ Auto-add untuk <b>${config.configs[groupId].groupTitle || groupId}</b> dinonaktifkan.`, {
                chat_id: chatId,
                message_id: msgId,
                parse_mode: 'HTML'
            });
            bot.answerCallbackQuery(query.id, { text: '✅ Dinonaktifkan!' });
        }
    });

    // ═══════════════════════════════════════════════════════════════════════════════════
    // /cleanmem - Clean all auto-added members from database
    // ═══════════════════════════════════════════════════════════════════════════════════
    bot.onText(/^\/cleanmem$/i, async (msg) => {
        const chatId = msg.chat.id;
        const userId = msg.from.id;

        if (!isOwner(userId)) {
            return bot.sendMessage(chatId, '❌ Khusus Owner!');
        }

        const membersData = loadJsonData(AUTOADD_MEMBERS_FILE) || { members: [] };
        const count = membersData.members.length;

        if (count === 0) {
            return bot.sendMessage(chatId, '📭 Tidak ada member yang di-auto-add.');
        }

        bot.sendMessage(chatId, `⚠️ <b>KONFIRMASI CLEAN MEMBER</b>

📊 Total member yang akan dihapus: <b>${count}</b>

<blockquote>Ini akan menghapus semua user yang di-add via auto-add dari:
• Premium list
• Reseller list  
• Owner list</blockquote>

Ketik <code>/cleanmem confirm</code> untuk melanjutkan.`, { parse_mode: 'HTML' });
    });

    bot.onText(/^\/cleanmem confirm$/i, async (msg) => {
        const chatId = msg.chat.id;
        const userId = msg.from.id;

        if (!isOwner(userId)) {
            return bot.sendMessage(chatId, '❌ Khusus Owner!');
        }

        const wait = await bot.sendMessage(chatId, '⏳ Menghapus member...');

        try {
            const membersData = loadJsonData(AUTOADD_MEMBERS_FILE) || { members: [] };
            let removedCount = 0;

            // Load all role files
            let premium = loadJsonData(PREMIUM_FILE) || [];
            let resellers = loadJsonData(RESELLER_FILE) || [];
            let owners = loadJsonData(OWNER_FILE) || [];

            // Remove each member
            for (const member of membersData.members) {
                const uid = String(member.userId);

                if (premium.includes(uid)) {
                    premium = premium.filter(id => id !== uid);
                    removedCount++;
                }
                if (resellers.includes(uid)) {
                    resellers = resellers.filter(id => id !== uid);
                    removedCount++;
                }
                if (owners.includes(uid) && uid !== String(settings.ownerId)) {
                    owners = owners.filter(id => id !== uid);
                    removedCount++;
                }
            }

            // Save updated files
            saveJsonData(PREMIUM_FILE, premium);
            saveJsonData(RESELLER_FILE, resellers);
            saveJsonData(OWNER_FILE, owners);

            // Clear members list
            saveJsonData(AUTOADD_MEMBERS_FILE, { members: [] });

            bot.editMessageText(`✅ <b>CLEAN COMPLETE!</b>

📊 Total dihapus: <b>${removedCount}</b> entries
🗑️ Member list: Cleared

<i>Database auto-add sudah bersih.</i>`, {
                chat_id: chatId,
                message_id: wait.message_id,
                parse_mode: 'HTML'
            });

        } catch (e) {
            bot.editMessageText(`❌ Error: ${e.message}`, { chat_id: chatId, message_id: wait.message_id });
        }
    });

};
