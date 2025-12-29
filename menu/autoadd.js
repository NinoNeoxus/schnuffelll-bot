/**
 * ═══════════════════════════════════════════════════════════════════════════════════════
 *  🔗 SCHNUFFELLL BOT - AUTO-ADD CHANNEL MEMBERSHIP v8.7
 *  Auto-add users to Premium/Reseller/Owner when they join required channel
 *  
 *  Flow:
 *  1. User says "add" in group → Bot checks channel membership
 *  2. If not member: Show "Join Channel First" with inline buttons
 *  3. If member: Show role selection (addpr, address, addowner)
 *  4. After role selected: Show group selection (groups where bot is member)
 *  5. Auto-add user to selected role in selected group
 *  
 *  Commands (Owner Only):
 *  /setautoadd <role>       - Set auto-add role for current group
 *  /setchannel <@channel>   - Set required channel
 *  /setpermission <type>    - Set permission type (join_channel)
 *  /autoaddinfo             - Show current auto-add settings
 *  /autoaddoff              - Disable auto-add for group
 *  /autoaddhelp             - Show detailed help for auto-add system
 *  /autoaddstats            - Show auto-add statistics
 *  
 *  @author @schnuffelll
 *  @version 8.7
 * ═══════════════════════════════════════════════════════════════════════════════════════
 */

const fs = require('fs');
const { loadJsonData, saveJsonData } = require('../lib/function');

const settings = require('../config.js');

module.exports = (bot) => {

    console.log('[AUTOADD] 🔗 Auto-Add Channel Membership v8.7 loaded');

    const OWNER_FILE = './db/users/adminID.json';
    const PREMIUM_FILE = './db/users/premiumUsers.json';
    const RESELLER_FILE = './db/users/resellerUsers.json';
    const AUTOADD_FILE = './db/autoadd_config.json';
    const AUTOADD_STATS_FILE = './db/autoadd_stats.json';

    // Initialize autoadd config
    if (!fs.existsSync(AUTOADD_FILE)) {
        saveJsonData(AUTOADD_FILE, { groups: {} });
    }

    // Initialize autoadd stats
    if (!fs.existsSync(AUTOADD_STATS_FILE)) {
        saveJsonData(AUTOADD_STATS_FILE, { 
            totalAdded: 0, 
            byRole: { premium: 0, reseller: 0, owner: 0 },
            byGroup: {},
            recentAdds: []
        });
    }

    // Track processed users to prevent spam (userId -> timestamp)
    const processedUsers = new Map();
    const PROCESS_COOLDOWN = 5 * 60 * 1000; // 5 menit cooldown

    // ═══════════════════════════════════════════════════════════════════════════════════
    // ERROR MESSAGES - Centralized for consistency
    // ═══════════════════════════════════════════════════════════════════════════════════
    const ERROR_MESSAGES = {
        CHANNEL_NOT_FOUND: '❌ <b>Channel tidak ditemukan!</b>\n\n' +
            '📌 Pastikan:\n' +
            '• Channel username benar (contoh: @channel_kamu)\n' +
            '• Channel bersifat public, atau\n' +
            '• Gunakan Channel ID untuk private channel\n\n' +
            '💡 Format: <code>/setchannel @channel_username</code>\n' +
            '💡 Format: <code>/setchannel -1001234567890</code>',

        GROUP_NOT_FOUND: '❌ <b>Grup tidak ditemukan!</b>\n\n' +
            '📌 Pastikan:\n' +
            '• Bot masih menjadi member di grup\n' +
            '• Grup belum dihapus atau di-banned\n' +
            '• ID grup benar',

        BOT_NOT_ADMIN_CHANNEL: '❌ <b>Bot bukan admin di channel!</b>\n\n' +
            '📌 Untuk menggunakan fitur auto-add:\n' +
            '1. Tambahkan bot ke channel\n' +
            '2. Jadikan bot sebagai admin\n' +
            '3. Bot butuh permission "Add Members"\n\n' +
            '⚠️ Tanpa akses admin, bot tidak bisa cek membership!',

        BOT_NOT_IN_CHANNEL: '❌ <b>Bot belum ada di channel!</b>\n\n' +
            '📌 Langkah yang perlu dilakukan:\n' +
            '1. Buka channel kamu\n' +
            '2. Tambahkan bot ke channel\n' +
            '3. Jadikan bot sebagai admin\n' +
            '4. Coba lagi command ini',

        BOT_NO_ACCESS_GROUP: '❌ <b>Bot tidak punya akses ke grup!</b>\n\n' +
            '📌 Pastikan:\n' +
            '• Bot masih ada di grup\n' +
            '• Bot punya permission yang cukup',

        USER_NEVER_CHATTED: '❌ <b>User belum pernah chat dengan bot!</b>\n\n' +
            '📌 User harus memulai chat dengan bot dulu agar bot bisa:\n' +
            '• Mengirim notifikasi\n' +
            '• Menambahkan ke role',

        OWNER_ONLY: '❌ <b>Akses Ditolak!</b>\n\n' +
            '🔒 Command ini hanya untuk Owner Bot.\n' +
            '📌 Hubungi owner jika kamu butuh akses.',

        GROUP_ONLY: '❌ <b>Command ini hanya untuk grup!</b>\n\n' +
            '📌 Gunakan command ini di grup, bukan private chat.',

        AUTOADD_NOT_CONFIGURED: '❌ <b>Auto-add belum dikonfigurasi!</b>\n\n' +
            '📌 Untuk mengaktifkan auto-add:\n' +
            '1. <code>/setautoadd premium</code> - Set role\n' +
            '2. <code>/setchannel @channel</code> - Set channel\n' +
            '3. <code>/setpermission join_channel</code> - Set permission\n\n' +
            '💡 Ketik <code>/autoaddhelp</code> untuk panduan lengkap.',

        SET_ROLE_FIRST: '❌ <b>Set role dulu!</b>\n\n' +
            '📌 Jalankan command ini dulu:\n' +
            '<code>/setautoadd premium</code>\n\n' +
            'Pilihan role: premium, reseller, owner',

        ALREADY_REGISTERED: '✅ <b>Kamu sudah terdaftar!</b>\n\n' +
            '📌 Kamu sudah memiliki akses. Tidak perlu mendaftar lagi.',

        VERIFICATION_FAILED: '❌ <b>Verifikasi gagal!</b>\n\n' +
            '📌 Pastikan kamu sudah:\n' +
            '1. Join channel yang diminta\n' +
            '2. Tunggu beberapa detik\n' +
            '3. Klik tombol "Sudah Join" lagi',

        REGISTRATION_FAILED: '❌ <b>Pendaftaran gagal!</b>\n\n' +
            '📌 Terjadi kesalahan saat mendaftarkan kamu.\n' +
            '💡 Coba lagi nanti atau hubungi admin.',

        NO_GROUPS_AVAILABLE: '❌ <b>Tidak ada grup yang tersedia!</b>\n\n' +
            '📌 Belum ada grup dengan auto-add aktif.\n' +
            '💡 Hubungi owner untuk mengaktifkan fitur ini.',

        NOT_YOUR_MESSAGE: '❌ <b>Bukan pesan kamu!</b>\n\n' +
            '📌 Tombol ini hanya bisa diklik oleh pengguna yang request.',

        AUTOADD_INACTIVE: '❌ <b>Auto-add tidak aktif!</b>\n\n' +
            '📌 Fitur auto-add sudah dinonaktifkan di grup ini.',
    };

    // ═══════════════════════════════════════════════════════════════════════════════════
    // HELPER: Check if user is owner
    // ═══════════════════════════════════════════════════════════════════════════════════
    function isOwner(userId) {
        const owners = loadJsonData(OWNER_FILE);
        return owners.includes(String(userId)) || String(userId) === String(settings.ownerId);
    }

    // ═══════════════════════════════════════════════════════════════════════════════════
    // HELPER: Check if bot is admin in channel
    // ═══════════════════════════════════════════════════════════════════════════════════
    async function isBotAdminInChannel(channelId) {
        try {
            const botInfo = await bot.getMe();
            const member = await bot.getChatMember(channelId, botInfo.id);
            return ['creator', 'administrator'].includes(member.status);
        } catch (e) {
            console.log('[AUTOADD] Bot admin check error:', e.message);
            return false;
        }
    }

    // ═══════════════════════════════════════════════════════════════════════════════════
    // HELPER: Validate channel and get info
    // ═══════════════════════════════════════════════════════════════════════════════════
    async function validateAndGetChannelInfo(channelId) {
        try {
            const chat = await bot.getChat(channelId);
            
            // Check if it's actually a channel
            if (chat.type !== 'channel') {
                return {
                    success: false,
                    error: '❌ <b>Ini bukan channel!</b>\n\n📌 Yang kamu masukkan adalah grup, bukan channel.\nGunakan username/ID channel yang benar.',
                    chat: null
                };
            }

            // Check if bot is admin
            const isAdmin = await isBotAdminInChannel(channelId);
            
            return {
                success: true,
                error: null,
                chat: chat,
                isAdmin: isAdmin,
                memberCount: chat.linked_chat_id ? 'N/A' : (await bot.getChatMemberCount(channelId).catch(() => 'N/A'))
            };
        } catch (e) {
            console.log('[AUTOADD] Channel validation error:', e.message);
            
            if (e.message.includes('chat not found')) {
                return { success: false, error: ERROR_MESSAGES.CHANNEL_NOT_FOUND, chat: null };
            } else if (e.message.includes('bot is not a member')) {
                return { success: false, error: ERROR_MESSAGES.BOT_NOT_IN_CHANNEL, chat: null };
            } else if (e.message.includes('have no rights')) {
                return { success: false, error: ERROR_MESSAGES.BOT_NOT_ADMIN_CHANNEL, chat: null };
            } else {
                return { 
                    success: false, 
                    error: `❌ <b>Error!</b>\n\n📌 ${e.message}`, 
                    chat: null 
                };
            }
        }
    }

    // ═══════════════════════════════════════════════════════════════════════════════════
    // HELPER: Check channel membership with detailed error
    // ═══════════════════════════════════════════════════════════════════════════════════
    async function checkChannelMembership(userId, channelId) {
        try {
            const member = await bot.getChatMember(channelId, userId);
            const isMember = ['creator', 'administrator', 'member'].includes(member.status);
            return {
                success: true,
                isMember: isMember,
                status: member.status,
                error: null
            };
        } catch (e) {
            console.log('[AUTOADD] Membership check error:', e.message);
            
            if (e.message.includes('user not found')) {
                return { success: true, isMember: false, status: 'not_member', error: null };
            } else if (e.message.includes('chat not found')) {
                return { success: false, isMember: false, status: null, error: ERROR_MESSAGES.CHANNEL_NOT_FOUND };
            } else if (e.message.includes('bot is not a member')) {
                return { success: false, isMember: false, status: null, error: ERROR_MESSAGES.BOT_NOT_IN_CHANNEL };
            } else {
                return { success: false, isMember: false, status: null, error: `❌ Error: ${e.message}` };
            }
        }
    }

    // Legacy helper for backward compatibility
    async function isChannelMember(userId, channelId) {
        const result = await checkChannelMembership(userId, channelId);
        return result.isMember;
    }

    // ═══════════════════════════════════════════════════════════════════════════════════
    // HELPER: Add user to role with stats tracking
    // ═══════════════════════════════════════════════════════════════════════════════════
    function addUserToRole(userId, role, groupId = null) {
        const userIdStr = String(userId);
        let added = false;

        if (role === 'premium') {
            let premium = loadJsonData(PREMIUM_FILE) || [];
            if (!premium.includes(userIdStr)) {
                premium.push(userIdStr);
                saveJsonData(PREMIUM_FILE, premium);
                added = true;
            }
        } else if (role === 'reseller') {
            let resellers = loadJsonData(RESELLER_FILE) || [];
            if (!resellers.includes(userIdStr)) {
                resellers.push(userIdStr);
                saveJsonData(RESELLER_FILE, resellers);
                added = true;
            }
        } else if (role === 'owner') {
            let owners = loadJsonData(OWNER_FILE) || [];
            if (!owners.includes(userIdStr)) {
                owners.push(userIdStr);
                saveJsonData(OWNER_FILE, owners);
                added = true;
            }
        }

        // Update stats if added successfully
        if (added) {
            updateStats(userId, role, groupId);
        }

        return added;
    }

    // ═══════════════════════════════════════════════════════════════════════════════════
    // HELPER: Update statistics
    // ═══════════════════════════════════════════════════════════════════════════════════
    function updateStats(userId, role, groupId) {
        try {
            let stats = loadJsonData(AUTOADD_STATS_FILE);
            
            // Initialize if needed
            if (!stats.totalAdded) stats.totalAdded = 0;
            if (!stats.byRole) stats.byRole = { premium: 0, reseller: 0, owner: 0 };
            if (!stats.byGroup) stats.byGroup = {};
            if (!stats.recentAdds) stats.recentAdds = [];

            // Update counters
            stats.totalAdded++;
            stats.byRole[role] = (stats.byRole[role] || 0) + 1;
            
            if (groupId) {
                stats.byGroup[groupId] = (stats.byGroup[groupId] || 0) + 1;
            }

            // Add to recent (keep last 50)
            stats.recentAdds.unshift({
                userId: String(userId),
                role: role,
                groupId: groupId,
                timestamp: new Date().toISOString()
            });
            stats.recentAdds = stats.recentAdds.slice(0, 50);

            saveJsonData(AUTOADD_STATS_FILE, stats);
        } catch (e) {
            console.log('[AUTOADD] Stats update error:', e.message);
        }
    }

    // ═══════════════════════════════════════════════════════════════════════════════════
    // HELPER: Check if user already has role
    // ═══════════════════════════════════════════════════════════════════════════════════
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

    // ═══════════════════════════════════════════════════════════════════════════════════
    // HELPER: Get all groups where bot is member with enhanced error handling
    // ═══════════════════════════════════════════════════════════════════════════════════
    async function getBotGroups() {
        const config = loadJsonData(AUTOADD_FILE);
        const groups = [];
        const invalidGroups = [];
        
        for (const [groupId, groupConfig] of Object.entries(config.groups || {})) {
            if (groupConfig.enabled && groupConfig.channel) {
                try {
                    const chat = await bot.getChat(groupId);
                    if (chat && (chat.type === 'group' || chat.type === 'supergroup')) {
                        groups.push({
                            id: groupId,
                            title: chat.title || 'Unknown Group',
                            config: groupConfig
                        });
                    }
                } catch (e) {
                    console.log(`[AUTOADD] Cannot access group ${groupId}: ${e.message}`);
                    invalidGroups.push(groupId);
                }
            }
        }

        // Clean up invalid groups (optional - uncomment if you want auto-cleanup)
        // if (invalidGroups.length > 0) {
        //     for (const gid of invalidGroups) {
        //         config.groups[gid].enabled = false;
        //     }
        //     saveJsonData(AUTOADD_FILE, config);
        // }
        
        return groups;
    }

    // ═══════════════════════════════════════════════════════════════════════════════════
    // HELPER: Generate channel join link
    // ═══════════════════════════════════════════════════════════════════════════════════
    function getChannelLink(channelId, channelUsername = null) {
        if (channelUsername && channelUsername.startsWith('@')) {
            return `https://t.me/${channelUsername.replace('@', '')}`;
        }
        
        // For private channels with numeric ID
        if (channelId && String(channelId).startsWith('-100')) {
            // Private channel - user needs invite link
            return null;
        }
        
        return channelUsername ? `https://t.me/${channelUsername.replace('@', '')}` : null;
    }

    // ═══════════════════════════════════════════════════════════════════════════════════
    // HELPER: Check if user already joined channel AND has role (anti-spam)
    // ═══════════════════════════════════════════════════════════════════════════════════
    async function isUserAlreadyProcessed(userId, groupConfig) {
        if (!groupConfig || !groupConfig.channel) return false;
        
        const memberCheck = await checkChannelMembership(userId, groupConfig.channel);
        const hasAnyRole = hasRole(userId, 'premium') || hasRole(userId, 'reseller') || hasRole(userId, 'owner');
        
        return memberCheck.isMember && hasAnyRole;
    }

    // ═══════════════════════════════════════════════════════════════════════════════════
    // /setautoadd <role> - Set auto-add role for current group
    // ═══════════════════════════════════════════════════════════════════════════════════
    bot.onText(/^\/setautoadd\s+(premium|reseller|owner)$/i, async (msg, match) => {
        const chatId = msg.chat.id;
        const userId = msg.from.id.toString();

        if (msg.chat.type === 'private') {
            return bot.sendMessage(chatId, ERROR_MESSAGES.GROUP_ONLY, { parse_mode: 'HTML' });
        }

        if (!isOwner(userId)) {
            return bot.sendMessage(chatId, ERROR_MESSAGES.OWNER_ONLY, { parse_mode: 'HTML' });
        }

        const role = match[1].toLowerCase();
        const config = loadJsonData(AUTOADD_FILE);

        if (!config.groups[chatId]) {
            config.groups[chatId] = {};
        }

        config.groups[chatId].role = role;
        config.groups[chatId].enabled = true;
        config.groups[chatId].groupTitle = msg.chat.title;
        config.groups[chatId].updatedAt = new Date().toISOString();
        config.groups[chatId].updatedBy = userId;
        saveJsonData(AUTOADD_FILE, config);

        const roleEmoji = { premium: '⭐', reseller: '🏪', owner: '👑' };

        bot.sendMessage(chatId, `✅ <b>Auto-Add Configured!</b>

${roleEmoji[role]} <b>Role:</b> ${role.toUpperCase()}
📍 <b>Group:</b> ${msg.chat.title}

<b>Langkah Selanjutnya:</b>
1️⃣ Set channel: <code>/setchannel @channel_username</code>
2️⃣ Set permission: <code>/setpermission join_channel</code>

⚠️ <b>PENTING:</b>
• Bot HARUS jadi admin di channel
• User yang ketik "add" akan diproses otomatis

💡 Ketik <code>/autoaddhelp</code> untuk panduan lengkap.`, { parse_mode: 'HTML' });
    });

    // ═══════════════════════════════════════════════════════════════════════════════════
    // /setchannel <@channel> - Set required channel with validation
    // ═══════════════════════════════════════════════════════════════════════════════════
    bot.onText(/^\/setchannel\s+(@\S+|-\d+)$/i, async (msg, match) => {
        const chatId = msg.chat.id;
        const userId = msg.from.id.toString();

        if (msg.chat.type === 'private') {
            return bot.sendMessage(chatId, ERROR_MESSAGES.GROUP_ONLY, { parse_mode: 'HTML' });
        }

        if (!isOwner(userId)) {
            return bot.sendMessage(chatId, ERROR_MESSAGES.OWNER_ONLY, { parse_mode: 'HTML' });
        }

        const channelId = match[1];
        const config = loadJsonData(AUTOADD_FILE);

        if (!config.groups[chatId]) {
            return bot.sendMessage(chatId, ERROR_MESSAGES.SET_ROLE_FIRST, { parse_mode: 'HTML' });
        }

        // Send "checking..." message
        const checkMsg = await bot.sendMessage(chatId, '⏳ <b>Memvalidasi channel...</b>', { parse_mode: 'HTML' });

        // Validate channel
        const validation = await validateAndGetChannelInfo(channelId);

        if (!validation.success) {
            return bot.editMessageText(validation.error, {
                chat_id: chatId,
                message_id: checkMsg.message_id,
                parse_mode: 'HTML'
            });
        }

        // Check if bot is admin
        if (!validation.isAdmin) {
            return bot.editMessageText(ERROR_MESSAGES.BOT_NOT_ADMIN_CHANNEL, {
                chat_id: chatId,
                message_id: checkMsg.message_id,
                parse_mode: 'HTML'
            });
        }

        // Save channel config
        config.groups[chatId].channel = channelId;
        config.groups[chatId].channelTitle = validation.chat.title;
        config.groups[chatId].channelUsername = validation.chat.username ? `@${validation.chat.username}` : null;
        config.groups[chatId].updatedAt = new Date().toISOString();
        saveJsonData(AUTOADD_FILE, config);

        const memberCount = validation.memberCount;
        const channelLink = getChannelLink(channelId, validation.chat.username ? `@${validation.chat.username}` : null);

        bot.editMessageText(`✅ <b>Channel Set Successfully!</b>

📢 <b>Channel:</b> ${validation.chat.title}
🆔 <b>ID:</b> <code>${channelId}</code>
${validation.chat.username ? `🔗 <b>Username:</b> @${validation.chat.username}` : '🔒 <b>Type:</b> Private Channel'}
👥 <b>Members:</b> ${memberCount}
✅ <b>Bot Admin:</b> Ya

<b>Status:</b>
• Role: <b>${config.groups[chatId].role?.toUpperCase() || 'Not Set'}</b>
• Permission: <b>${config.groups[chatId].permissionType || 'Not Set'}</b>

${!config.groups[chatId].permissionType ? `⚠️ <b>Langkah terakhir:</b>\n<code>/setpermission join_channel</code>` : '✅ <b>Auto-add siap digunakan!</b>'}

💡 User bisa ketik <code>/daftar</code> atau "add" untuk mendaftar.`, {
            chat_id: chatId,
            message_id: checkMsg.message_id,
            parse_mode: 'HTML'
        });
    });

    // ═══════════════════════════════════════════════════════════════════════════════════
    // /setpermission <type> - Set permission type
    // ═══════════════════════════════════════════════════════════════════════════════════
    bot.onText(/^\/setpermission\s+(join_channel|none)$/i, async (msg, match) => {
        const chatId = msg.chat.id;
        const userId = msg.from.id.toString();

        if (msg.chat.type === 'private') {
            return bot.sendMessage(chatId, ERROR_MESSAGES.GROUP_ONLY, { parse_mode: 'HTML' });
        }

        if (!isOwner(userId)) {
            return bot.sendMessage(chatId, ERROR_MESSAGES.OWNER_ONLY, { parse_mode: 'HTML' });
        }

        const permissionType = match[1].toLowerCase();
        const config = loadJsonData(AUTOADD_FILE);

        if (!config.groups[chatId]) {
            config.groups[chatId] = {};
        }

        config.groups[chatId].permissionType = permissionType;
        config.groups[chatId].updatedAt = new Date().toISOString();
        saveJsonData(AUTOADD_FILE, config);

        if (permissionType === 'join_channel') {
            const groupConfig = config.groups[chatId];
            const isComplete = groupConfig.role && groupConfig.channel;

            bot.sendMessage(chatId, `✅ <b>Permission Type Set!</b>

🔐 <b>Type:</b> Wajib Join Channel

<b>Status Konfigurasi:</b>
${groupConfig.role ? `✅ Role: ${groupConfig.role.toUpperCase()}` : '❌ Role: Belum diset'}
${groupConfig.channel ? `✅ Channel: ${groupConfig.channelTitle || groupConfig.channel}` : '❌ Channel: Belum diset'}
${isComplete ? '\n✅ <b>Auto-add siap digunakan!</b>' : '\n⚠️ <b>Lengkapi konfigurasi yang belum!</b>'}

💡 User bisa ketik "add" atau <code>/daftar</code> untuk mendaftar.`, { parse_mode: 'HTML' });
        } else {
            bot.sendMessage(chatId, `✅ <b>Permission Type Set!</b>

🔓 <b>Type:</b> None (Tanpa syarat)

⚠️ Dengan setting ini, auto-add tidak akan aktif.
Ganti ke <code>/setpermission join_channel</code> untuk mengaktifkan.`, { parse_mode: 'HTML' });
        }
    });

    // ═══════════════════════════════════════════════════════════════════════════════════
    // /autoaddinfo - Show current settings
    // ═══════════════════════════════════════════════════════════════════════════════════
    bot.onText(/^\/autoaddinfo$/i, async (msg) => {
        const chatId = msg.chat.id;
        const userId = msg.from.id.toString();

        if (!isOwner(userId)) {
            return bot.sendMessage(chatId, ERROR_MESSAGES.OWNER_ONLY, { parse_mode: 'HTML' });
        }

        const config = loadJsonData(AUTOADD_FILE);
        const groupConfig = config.groups[chatId];

        if (!groupConfig || !groupConfig.enabled) {
            return bot.sendMessage(chatId, `📋 <b>AUTO-ADD CONFIG</b>

❌ <b>Status:</b> Disabled

<b>Cara Setup:</b>
1️⃣ <code>/setautoadd premium</code> - Set role
2️⃣ <code>/setchannel @channel</code> - Set channel
3️⃣ <code>/setpermission join_channel</code> - Aktifkan

💡 Ketik <code>/autoaddhelp</code> untuk panduan lengkap.`, { parse_mode: 'HTML' });
        }

        const roleEmoji = { premium: '⭐', reseller: '🏪', owner: '👑' };
        const isComplete = groupConfig.role && groupConfig.channel && groupConfig.permissionType === 'join_channel';

        // Get stats for this group
        const stats = loadJsonData(AUTOADD_STATS_FILE);
        const groupStats = stats.byGroup?.[chatId] || 0;

        bot.sendMessage(chatId, `📋 <b>AUTO-ADD CONFIG</b>

${isComplete ? '✅' : '⚠️'} <b>Status:</b> ${groupConfig.enabled ? 'Enabled' : 'Disabled'}

<b>Konfigurasi:</b>
${roleEmoji[groupConfig.role] || '📦'} <b>Role:</b> ${groupConfig.role?.toUpperCase() || 'Belum diset'}
📢 <b>Channel:</b> ${groupConfig.channelTitle || 'Belum diset'}
🆔 <b>Channel ID:</b> <code>${groupConfig.channel || '-'}</code>
🔐 <b>Permission:</b> ${groupConfig.permissionType || 'Belum diset'}

<b>Statistik:</b>
👥 <b>Total Add:</b> ${groupStats} user

<b>Commands:</b>
• <code>/setautoadd role</code> - Ubah role
• <code>/setchannel @ch</code> - Ubah channel
• <code>/setpermission type</code> - Ubah permission
• <code>/autoaddoff</code> - Nonaktifkan
• <code>/autoaddstats</code> - Lihat statistik lengkap`, { parse_mode: 'HTML' });
    });

    // ═══════════════════════════════════════════════════════════════════════════════════
    // /autoaddoff - Disable auto-add
    // ═══════════════════════════════════════════════════════════════════════════════════
    bot.onText(/^\/autoaddoff$/i, async (msg) => {
        const chatId = msg.chat.id;
        const userId = msg.from.id.toString();

        if (!isOwner(userId)) {
            return bot.sendMessage(chatId, ERROR_MESSAGES.OWNER_ONLY, { parse_mode: 'HTML' });
        }

        const config = loadJsonData(AUTOADD_FILE);

        if (config.groups[chatId]) {
            config.groups[chatId].enabled = false;
            config.groups[chatId].disabledAt = new Date().toISOString();
            config.groups[chatId].disabledBy = userId;
            saveJsonData(AUTOADD_FILE, config);
        }

        bot.sendMessage(chatId, `✅ <b>Auto-Add Dinonaktifkan!</b>

📍 <b>Grup:</b> ${msg.chat.title}

⚠️ User tidak bisa lagi mendaftar otomatis.
Untuk mengaktifkan kembali, jalankan:
<code>/setautoadd premium</code>`, { parse_mode: 'HTML' });
    });

    // ═══════════════════════════════════════════════════════════════════════════════════
    // /autoaddhelp - Show detailed help
    // ═══════════════════════════════════════════════════════════════════════════════════
    bot.onText(/^\/autoaddhelp$/i, async (msg) => {
        const chatId = msg.chat.id;

        bot.sendMessage(chatId, `📚 <b>PANDUAN AUTO-ADD SYSTEM v8.7</b>

═══════════════════════════════════

<b>🔗 APA ITU AUTO-ADD?</b>
Sistem untuk menambahkan user ke role (Premium/Reseller/Owner) secara otomatis setelah mereka join channel yang ditentukan.

═══════════════════════════════════

<b>⚙️ SETUP (OWNER ONLY)</b>

<b>Step 1:</b> Set Role Default
<code>/setautoadd premium</code>
<code>/setautoadd reseller</code>
<code>/setautoadd owner</code>

<b>Step 2:</b> Set Channel Wajib Join
<code>/setchannel @channel_username</code>
<code>/setchannel -1001234567890</code>
⚠️ Bot HARUS jadi admin di channel!

<b>Step 3:</b> Aktifkan Permission
<code>/setpermission join_channel</code>

═══════════════════════════════════

<b>👥 UNTUK USER</b>

<b>Cara 1:</b> Ketik "add" di grup
→ Bot akan cek membership channel
→ Jika belum join, akan diminta join dulu
→ Jika sudah join, pilih role

<b>Cara 2:</b> Ketik <code>/daftar</code>
→ Langsung daftar dengan role default

═══════════════════════════════════

<b>📋 COMMAND LAINNYA</b>

<code>/autoaddinfo</code> - Lihat konfigurasi
<code>/autoaddstats</code> - Lihat statistik
<code>/autoaddoff</code> - Nonaktifkan auto-add

═══════════════════════════════════

<b>❌ TROUBLESHOOTING</b>

<b>Bot tidak bisa cek membership?</b>
→ Pastikan bot jadi admin di channel

<b>Channel tidak ditemukan?</b>
→ Cek username channel sudah benar
→ Untuk private channel, gunakan ID numerik

<b>User sudah join tapi gagal verifikasi?</b>
→ Tunggu beberapa detik, coba lagi

💡 <b>Butuh bantuan?</b> Hubungi @${settings.dev}`, { parse_mode: 'HTML' });
    });

    // ═══════════════════════════════════════════════════════════════════════════════════
    // /autoaddstats - Show statistics
    // ═══════════════════════════════════════════════════════════════════════════════════
    bot.onText(/^\/autoaddstats$/i, async (msg) => {
        const chatId = msg.chat.id;
        const userId = msg.from.id.toString();

        if (!isOwner(userId)) {
            return bot.sendMessage(chatId, ERROR_MESSAGES.OWNER_ONLY, { parse_mode: 'HTML' });
        }

        const stats = loadJsonData(AUTOADD_STATS_FILE);
        const config = loadJsonData(AUTOADD_FILE);

        // Count active groups
        const activeGroups = Object.values(config.groups || {}).filter(g => g.enabled).length;

        // Get recent adds
        const recent = (stats.recentAdds || []).slice(0, 5);
        const recentText = recent.length > 0 
            ? recent.map((r, i) => `${i+1}. ${r.role.toUpperCase()} - ${new Date(r.timestamp).toLocaleDateString('id-ID')}`).join('\n')
            : 'Belum ada data';

        bot.sendMessage(chatId, `📊 <b>AUTO-ADD STATISTICS</b>

═══════════════════════════════════

<b>📈 TOTAL STATISTICS</b>
👥 Total User Added: <b>${stats.totalAdded || 0}</b>
📍 Active Groups: <b>${activeGroups}</b>

<b>📊 BY ROLE</b>
⭐ Premium: <b>${stats.byRole?.premium || 0}</b>
🏪 Reseller: <b>${stats.byRole?.reseller || 0}</b>
👑 Owner: <b>${stats.byRole?.owner || 0}</b>

<b>🕐 RECENT ADDS</b>
${recentText}

═══════════════════════════════════

💡 Data statistik diupdate otomatis setiap ada user baru.`, { parse_mode: 'HTML' });
    });

    // ═══════════════════════════════════════════════════════════════════════════════════
    // /daftar - Register as Premium/Reseller (User Command)
    // ═══════════════════════════════════════════════════════════════════════════════════
    bot.onText(/^\/daftar$/i, async (msg) => {
        const chatId = msg.chat.id;
        const userId = msg.from.id;
        const userName = msg.from.first_name || 'User';

        if (msg.chat.type === 'private') {
            return bot.sendMessage(chatId, ERROR_MESSAGES.GROUP_ONLY, { parse_mode: 'HTML' });
        }

        const config = loadJsonData(AUTOADD_FILE);
        const groupConfig = config.groups[chatId];

        // Check if auto-add is configured
        if (!groupConfig || !groupConfig.enabled || !groupConfig.channel) {
            return bot.sendMessage(chatId, ERROR_MESSAGES.AUTOADD_NOT_CONFIGURED, { parse_mode: 'HTML' });
        }

        const role = groupConfig.role;

        // Check if already has role
        if (hasRole(userId, role)) {
            const roleEmoji = { premium: '⭐', reseller: '🏪', owner: '👑' };
            return bot.sendMessage(chatId, `✅ <b>${userName}</b>, kamu sudah terdaftar sebagai ${roleEmoji[role]} <b>${role.toUpperCase()}</b>!

Kamu sudah bisa menggunakan semua fitur ${role}. 🎉`, { parse_mode: 'HTML' });
        }

        // Check channel membership
        const memberCheck = await checkChannelMembership(userId, groupConfig.channel);

        if (!memberCheck.success) {
            return bot.sendMessage(chatId, memberCheck.error, { parse_mode: 'HTML' });
        }

        if (memberCheck.isMember) {
            // Auto-add user
            const added = addUserToRole(userId, role, chatId);

            if (added) {
                const roleEmoji = { premium: '⭐', reseller: '🏪', owner: '👑' };
                bot.sendMessage(chatId, `🎉 <b>SELAMAT ${userName}!</b>

✅ Kamu berhasil terdaftar sebagai ${roleEmoji[role]} <b>${role.toUpperCase()}</b>!

📌 Sekarang kamu bisa menggunakan semua fitur ${role}.
💡 Ketik <code>/menu</code> untuk melihat menu.`, { parse_mode: 'HTML' });
            } else {
                bot.sendMessage(chatId, ERROR_MESSAGES.REGISTRATION_FAILED, { parse_mode: 'HTML' });
            }
        } else {
            // Not a member - show join button
            const channelLink = getChannelLink(groupConfig.channel, groupConfig.channelUsername);

            const keyboard = {
                inline_keyboard: []
            };

            // Add join button if we have a valid link
            if (channelLink) {
                keyboard.inline_keyboard.push([
                    { text: '📢 Join Channel', url: channelLink }
                ]);
            } else {
                // Private channel - show info
                keyboard.inline_keyboard.push([
                    { text: '🔒 Minta Link Channel ke Admin', callback_data: 'autoadd_request_link' }
                ]);
            }

            keyboard.inline_keyboard.push([
                { text: '✅ Sudah Join', callback_data: `autoadd_verify_${chatId}` }
            ]);

            bot.sendMessage(chatId, `⚠️ <b>${userName}, kamu belum join channel!</b>

Untuk mendaftar sebagai <b>${role.toUpperCase()}</b>, kamu harus:

1️⃣ Join channel: <b>${groupConfig.channelTitle || 'Channel'}</b>
2️⃣ Klik tombol "✅ Sudah Join" di bawah

Setelah terverifikasi, kamu akan otomatis terdaftar! 🚀`, {
                parse_mode: 'HTML',
                reply_markup: keyboard
            });
        }
    });

    // ═══════════════════════════════════════════════════════════════════════════════════
    // Detect kata "add" di grup dan trigger auto-add flow
    // ═══════════════════════════════════════════════════════════════════════════════════
    bot.on('message', async (msg) => {
        // Skip private chat, commands, and non-text messages
        if (msg.chat.type === 'private') return;
        if (msg.text?.startsWith('/')) return;
        if (!msg.text) return;

        const text = msg.text.toLowerCase().trim();
        
        // Check if message contains "add" (case insensitive)
        if (!text.includes('add')) return;

        const chatId = msg.chat.id;
        const userId = msg.from.id;
        const userName = msg.from.first_name || 'User';

        const config = loadJsonData(AUTOADD_FILE);
        const groupConfig = config.groups[chatId];

        // Check if auto-add is configured and enabled
        if (!groupConfig || !groupConfig.enabled) return;

        // Check permission type
        if (groupConfig.permissionType !== 'join_channel') return;

        // Check if channel is set
        if (!groupConfig.channel) return;

        // Anti-spam: Check if user already processed recently
        const userKey = `${userId}_${chatId}`;
        const lastProcessed = processedUsers.get(userKey);
        if (lastProcessed && Date.now() - lastProcessed < PROCESS_COOLDOWN) {
            return; // Skip, user was processed recently
        }

        // Check if user already joined channel AND has role (anti-spam)
        const alreadyProcessed = await isUserAlreadyProcessed(userId, groupConfig);
        if (alreadyProcessed) {
            processedUsers.set(userKey, Date.now());
            return; // Don't reply, user already has access
        }

        // Check channel membership
        const memberCheck = await checkChannelMembership(userId, groupConfig.channel);
        
        if (!memberCheck.success) {
            // Channel error - log but don't spam user
            console.log(`[AUTOADD] Channel check failed for user ${userId}: ${memberCheck.error}`);
            return;
        }

        if (!memberCheck.isMember) {
            // Not a member - show join button
            const channelLink = getChannelLink(groupConfig.channel, groupConfig.channelUsername);

            const keyboard = {
                inline_keyboard: []
            };

            if (channelLink) {
                keyboard.inline_keyboard.push([
                    { text: '📢 Join Channel', url: channelLink }
                ]);
            }

            keyboard.inline_keyboard.push([
                { text: '✅ Sudah Join', callback_data: `autoadd_join_${chatId}_${userId}` }
            ]);

            bot.sendMessage(chatId, `⚠️ <b>${userName}, kamu belum join channel!</b>

Untuk menggunakan fitur bot, kamu harus:

1️⃣ Join channel: <b>${groupConfig.channelTitle || groupConfig.channel}</b>
2️⃣ Klik tombol "✅ Sudah Join" di bawah

Setelah terverifikasi, kamu bisa pilih role yang diinginkan! 🚀`, {
                parse_mode: 'HTML',
                reply_to_message_id: msg.message_id,
                reply_markup: keyboard
            });
            
            processedUsers.set(userKey, Date.now());
            return;
        }

        // User is member - show role selection
        const keyboard = {
            inline_keyboard: [
                [
                    { text: '⭐ Add Premium', callback_data: `autoadd_role_${chatId}_${userId}_premium` },
                    { text: '🏪 Add Reseller', callback_data: `autoadd_role_${chatId}_${userId}_reseller` }
                ],
                [
                    { text: '👑 Add Owner', callback_data: `autoadd_role_${chatId}_${userId}_owner` }
                ]
            ]
        };

        bot.sendMessage(chatId, `✅ <b>${userName}, kamu sudah join channel!</b>

Pilih role yang ingin kamu dapatkan:

⭐ <b>Premium</b> - Akses fitur premium
🏪 <b>Reseller</b> - Akses fitur reseller  
👑 <b>Owner</b> - Akses fitur owner

Setelah pilih role, kamu akan diminta pilih grup untuk aktivasi. 🎯`, {
            parse_mode: 'HTML',
            reply_to_message_id: msg.message_id,
            reply_markup: keyboard
        });

        processedUsers.set(userKey, Date.now());
    });

    // ═══════════════════════════════════════════════════════════════════════════════════
    // Callback Query Handler
    // ═══════════════════════════════════════════════════════════════════════════════════
    bot.on('callback_query', async (query) => {
        const data = query.data;

        // ─────────────────────────────────────────────────────────────────────────────
        // Handle request link for private channel
        // ─────────────────────────────────────────────────────────────────────────────
        if (data === 'autoadd_request_link') {
            return bot.answerCallbackQuery(query.id, {
                text: '📢 Hubungi admin grup untuk mendapatkan link invite channel!',
                show_alert: true
            });
        }

        // ─────────────────────────────────────────────────────────────────────────────
        // Handle "Sudah Join" button
        // ─────────────────────────────────────────────────────────────────────────────
        if (data.startsWith('autoadd_join_')) {
            const parts = data.replace('autoadd_join_', '').split('_');
            const groupId = parts[0];
            const userId = parseInt(parts[1]);

            if (query.from.id !== userId) {
                return bot.answerCallbackQuery(query.id, {
                    text: ERROR_MESSAGES.NOT_YOUR_MESSAGE.replace(/<[^>]*>/g, ''),
                    show_alert: true
                });
            }

            const config = loadJsonData(AUTOADD_FILE);
            const groupConfig = config.groups[groupId];

            if (!groupConfig || !groupConfig.enabled) {
                return bot.answerCallbackQuery(query.id, {
                    text: '❌ Auto-add tidak aktif di grup ini.',
                    show_alert: true
                });
            }

            // Verify channel membership
            const memberCheck = await checkChannelMembership(userId, groupConfig.channel);

            if (!memberCheck.success) {
                return bot.answerCallbackQuery(query.id, {
                    text: '❌ Tidak bisa verifikasi. Coba lagi nanti.',
                    show_alert: true
                });
            }

            if (!memberCheck.isMember) {
                return bot.answerCallbackQuery(query.id, {
                    text: '❌ Kamu belum join channel! Join dulu, tunggu beberapa detik, lalu klik lagi.',
                    show_alert: true
                });
            }

            // Show role selection
            const keyboard = {
                inline_keyboard: [
                    [
                        { text: '⭐ Add Premium', callback_data: `autoadd_role_${groupId}_${userId}_premium` },
                        { text: '🏪 Add Reseller', callback_data: `autoadd_role_${groupId}_${userId}_reseller` }
                    ],
                    [
                        { text: '👑 Add Owner', callback_data: `autoadd_role_${groupId}_${userId}_owner` }
                    ]
                ]
            };

            bot.answerCallbackQuery(query.id, {
                text: '✅ Verifikasi berhasil! Pilih role sekarang.',
                show_alert: false
            });

            bot.editMessageText(`✅ <b>${query.from.first_name}, kamu sudah join channel!</b>

Pilih role yang ingin kamu dapatkan:

⭐ <b>Premium</b> - Akses fitur premium
🏪 <b>Reseller</b> - Akses fitur reseller  
👑 <b>Owner</b> - Akses fitur owner

🎯 Setelah pilih role, kamu akan diminta pilih grup untuk aktivasi.`, {
                chat_id: query.message.chat.id,
                message_id: query.message.message_id,
                parse_mode: 'HTML',
                reply_markup: keyboard
            });
            return;
        }

        // ─────────────────────────────────────────────────────────────────────────────
        // Handle role selection
        // ─────────────────────────────────────────────────────────────────────────────
        if (data.startsWith('autoadd_role_')) {
            const parts = data.replace('autoadd_role_', '').split('_');
            const groupId = parts[0];
            const userId = parseInt(parts[1]);
            const role = parts[2];

            if (query.from.id !== userId) {
                return bot.answerCallbackQuery(query.id, {
                    text: ERROR_MESSAGES.NOT_YOUR_MESSAGE.replace(/<[^>]*>/g, ''),
                    show_alert: true
                });
            }

            // Check if already has role
            if (hasRole(userId, role)) {
                return bot.answerCallbackQuery(query.id, {
                    text: `⚠️ Kamu sudah menjadi ${role.toUpperCase()}!`,
                    show_alert: true
                });
            }

            // Get all groups where bot is member
            const groups = await getBotGroups();

            if (groups.length === 0) {
                return bot.answerCallbackQuery(query.id, {
                    text: ERROR_MESSAGES.NO_GROUPS_AVAILABLE.replace(/<[^>]*>/g, ''),
                    show_alert: true
                });
            }

            // Create group selection keyboard
            const keyboard = {
                inline_keyboard: groups.slice(0, 10).map(group => [
                    { text: `📍 ${group.title}`, callback_data: `autoadd_final_${groupId}_${userId}_${role}_${group.id}` }
                ])
            };

            const roleEmoji = { premium: '⭐', reseller: '🏪', owner: '👑' };

            bot.answerCallbackQuery(query.id, {
                text: `Pilih grup untuk aktivasi ${roleEmoji[role]} ${role.toUpperCase()}`,
                show_alert: false
            });

            bot.editMessageText(`✅ <b>Role Dipilih: ${roleEmoji[role]} ${role.toUpperCase()}</b>

Pilih grup di mana kamu ingin diaktifkan:

${groups.slice(0, 10).map((g, i) => `${i + 1}. 📍 ${g.title}`).join('\n')}

💡 Klik salah satu grup untuk melanjutkan.`, {
                chat_id: query.message.chat.id,
                message_id: query.message.message_id,
                parse_mode: 'HTML',
                reply_markup: keyboard
            });
            return;
        }

        // ─────────────────────────────────────────────────────────────────────────────
        // Handle final group selection and add user
        // ─────────────────────────────────────────────────────────────────────────────
        if (data.startsWith('autoadd_final_')) {
            const parts = data.replace('autoadd_final_', '').split('_');
            const originalGroupId = parts[0];
            const userId = parseInt(parts[1]);
            const role = parts[2];
            const targetGroupId = parts.slice(3).join('_'); // Handle negative IDs

            if (query.from.id !== userId) {
                return bot.answerCallbackQuery(query.id, {
                    text: ERROR_MESSAGES.NOT_YOUR_MESSAGE.replace(/<[^>]*>/g, ''),
                    show_alert: true
                });
            }

            // Add user to role
            const added = addUserToRole(userId, role, targetGroupId);

            if (added) {
                const roleEmoji = { premium: '⭐', reseller: '🏪', owner: '👑' };

                bot.answerCallbackQuery(query.id, {
                    text: `🎉 Berhasil! Kamu sekarang ${roleEmoji[role]} ${role.toUpperCase()}!`,
                    show_alert: true
                });

                // Get target group info
                let targetGroupTitle = 'Grup';
                try {
                    const targetChat = await bot.getChat(targetGroupId);
                    targetGroupTitle = targetChat.title;
                } catch (e) {
                    // Ignore
                }

                bot.editMessageText(`🎉 <b>BERHASIL DITAMBAHKAN!</b>

✅ <b>${query.from.first_name}</b> berhasil didaftarkan sebagai ${roleEmoji[role]} <b>${role.toUpperCase()}</b>!

📍 <b>Grup:</b> ${targetGroupTitle}
🆔 <b>User ID:</b> <code>${userId}</code>

🚀 Selamat menggunakan bot! Ketik <code>/menu</code> untuk melihat fitur.`, {
                    chat_id: query.message.chat.id,
                    message_id: query.message.message_id,
                    parse_mode: 'HTML'
                });

                // Send notification to target group
                try {
                    bot.sendMessage(targetGroupId, `🎉 <b>User Baru Ditambahkan!</b>

👤 <b>User:</b> ${query.from.first_name} ${query.from.username ? `(@${query.from.username})` : ''}
🆔 <b>ID:</b> <code>${userId}</code>
${roleEmoji[role]} <b>Role:</b> ${role.toUpperCase()}

<i>Via Auto-Add System</i>`, {
                        parse_mode: 'HTML'
                    });
                } catch (e) {
                    console.log(`[AUTOADD] Cannot send notification to ${targetGroupId}: ${e.message}`);
                }
            } else {
                bot.answerCallbackQuery(query.id, {
                    text: `⚠️ Kamu sudah menjadi ${role.toUpperCase()}!`,
                    show_alert: true
                });
            }
            return;
        }

        // ─────────────────────────────────────────────────────────────────────────────
        // Handle existing autoadd_verify callback (backward compatibility)
        // ─────────────────────────────────────────────────────────────────────────────
        if (!data.startsWith('autoadd_verify_')) return;

        const userId = query.from.id;
        const userName = query.from.first_name;
        const groupId = data.replace('autoadd_verify_', '');

        const config = loadJsonData(AUTOADD_FILE);
        const groupConfig = config.groups[groupId];

        if (!groupConfig || !groupConfig.enabled) {
            return bot.answerCallbackQuery(query.id, {
                text: '❌ Auto-add tidak aktif di grup ini.',
                show_alert: true
            });
        }

        // Verify channel membership
        const memberCheck = await checkChannelMembership(userId, groupConfig.channel);

        if (!memberCheck.success) {
            return bot.answerCallbackQuery(query.id, {
                text: '❌ Tidak bisa verifikasi. Coba lagi nanti.',
                show_alert: true
            });
        }

        if (!memberCheck.isMember) {
            return bot.answerCallbackQuery(query.id, {
                text: '❌ Kamu belum join channel! Join dulu, tunggu beberapa detik, lalu klik lagi.',
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
        const added = addUserToRole(userId, groupConfig.role, groupId);

        if (added) {
            const roleEmoji = { premium: '⭐', reseller: '🏪', owner: '👑' };

            bot.answerCallbackQuery(query.id, {
                text: `🎉 Selamat! Kamu sekarang ${groupConfig.role.toUpperCase()}!`,
                show_alert: true
            });

            // Update the message
            bot.editMessageText(`🎉 <b>VERIFIKASI BERHASIL!</b>

✅ <b>${userName}</b> berhasil terdaftar sebagai ${roleEmoji[groupConfig.role]} <b>${groupConfig.role.toUpperCase()}</b>!

🚀 Selamat menggunakan bot! Ketik <code>/menu</code> untuk melihat fitur.`, {
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

    // ═══════════════════════════════════════════════════════════════════════════════════
    // END OF MODULE
    // ═══════════════════════════════════════════════════════════════════════════════════
    console.log('[AUTOADD] ✅ All handlers registered successfully');

};
