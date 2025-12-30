
/**
 * ═══════════════════════════════════════════════════════════════════════════════════════
 *  📦 SCHNUFFELLL BOT - PANEL MANAGEMENT v8.0
 *  Commands for managing Pterodactyl panels (multi-panel support)
 *  
 *  Commands:
 *  /panelinfo          - Info panel & license
 *  /panelusers         - List users
 *  /panelservers       - List servers
 *  /panelnodes         - List nodes
 *  /panelstats         - Statistics
 *  /panelhealth        - Health check
 *  /panelrestart       - Restart panel services (SSH)
 *  /panelbackup        - Backup panel (SSH)
 *  /panelclear         - Clear cache (SSH)
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

    console.log('[PANEL] 📦 Panel Management Module v8.0 loaded');

    const OWNER_FILE = './db/users/adminID.json';
    const PREMIUM_FILE = './db/users/premiumUsers.json';

    // Helper: Check access
    function hasAccess(userId) {
        const owners = loadJsonData(OWNER_FILE);
        const premium = loadJsonData(PREMIUM_FILE);
        const hasRedeem = bot.checkRedeemAccess && bot.checkRedeemAccess(userId);
        return owners.includes(String(userId)) || premium.includes(String(userId)) || hasRedeem;
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

    // Helper: App API
    async function appApi(endpoint, version = 1) {
        const config = getPanelConfig(version);
        const url = `https://${config.domain}/api/application${endpoint}`;
        const headers = {
            'Authorization': `Bearer ${config.key}`,
            'Content-Type': 'application/json',
            'Accept': 'application/json'
        };
        const response = await axios.get(url, { headers, timeout: 10000 });
        return response.data;
    }

    // ═══════════════════════════════════════════════════════════════════════════════
    // /panel - Unified Panel Menu (NEW)
    // ═══════════════════════════════════════════════════════════════════════════════
    bot.onText(/^\/panel(?:\s+(\d))?$/i, async (msg, match) => {
        const chatId = msg.chat.id;
        const userId = msg.from.id.toString();

        if (!hasAccess(userId)) {
            return bot.sendMessage(chatId, '❌ ᴋʜᴜꜱᴜꜱ ᴏᴡɴᴇʀ/ᴘʀᴇᴍɪᴜᴍ!');
        }

        const version = match[1] ? parseInt(match[1]) : 1;
        const config = getPanelConfig(version);

        bot.sendMessage(chatId, `📦 <b>PANEL MANAGEMENT v${version}</b>
<code>━━━━━━━━━━━━━━━━━━━━━━</code>
🌐 Domain: ${config.domain}

Pilih operasi panel:`, {
            parse_mode: 'HTML',
            reply_markup: {
                inline_keyboard: [
                    [
                        { text: '📊 Info & Stats', callback_data: `pnl_info_${version}` },
                        { text: '🏥 Health Check', callback_data: `pnl_health_${version}` }
                    ],
                    [
                        { text: '👥 Users', callback_data: `pnl_users_${version}` },
                        { text: '🖥️ Servers', callback_data: `pnl_servers_${version}` }
                    ],
                    [
                        { text: '📡 Nodes', callback_data: `pnl_nodes_${version}` }
                    ],
                    [
                        { text: '🔙 MAIN MENU', callback_data: `openmainmenu` }
                    ]
                ]
            }
        });
    });

    // Handle pnl_info callback (redirect to /panelinfo logic)
    bot.on('callback_query', async (query) => {
        if (query.data.startsWith('pnl_info_')) {
            bot.emit('text', { ...query.message, from: query.from, text: `/panelinfo ${query.data.split('_')[2]}` });
            bot.answerCallbackQuery(query.id);
        }
    });

    // ═══════════════════════════════════════════════════════════════════════════════
    // /panelinfo [version] - Panel Information
    // ═══════════════════════════════════════════════════════════════════════════════
    bot.onText(/^\/panelinfo(?:\s+(\d))?$/i, async (msg, match) => {
        const chatId = msg.chat.id;
        const userId = msg.from.id.toString();

        if (!hasAccess(userId)) {
            return bot.sendMessage(chatId, '❌ ᴋʜᴜꜱᴜꜱ ᴏᴡɴᴇʀ/ᴘʀᴇᴍɪᴜᴍ!');
        }

        const version = match[1] ? parseInt(match[1]) : 1;
        const config = getPanelConfig(version);
        const wait = await bot.sendMessage(chatId, `⏳ Checking panel v${version}...`);

        try {
            // Fetch concurrent data
            const [users, servers, nodes] = await Promise.all([
                appApi('/users', version),
                appApi('/servers', version),
                appApi('/nodes', version)
            ]);

            const text = `
📦 <b>PANEL INFORMATION v${version}</b>
<code>━━━━━━━━━━━━━━━━━━━━━━</code>

<blockquote>
🌐 <b>Domain:</b> ${config.domain}
📊 <b>Stats:</b>
┣ 👥 Users: ${users.meta.pagination.total}
┣ 🖥️ Servers: ${servers.meta.pagination.total}
┗ 📡 Nodes: ${nodes.meta.pagination.total}

✅ <b>Status:</b> ONLINE
🕒 <b>Checked:</b> ${new Date().toLocaleString('id-ID')}
</blockquote>
`;

            bot.editMessageText(text, {
                chat_id: chatId,
                message_id: wait.message_id,
                parse_mode: 'HTML',
                reply_markup: {
                    inline_keyboard: [
                        [
                            { text: '👥 Users', callback_data: `pnl_users_${version}` },
                            { text: '🖥️ Servers', callback_data: `pnl_servers_${version}` }
                        ],
                        [
                            { text: '📡 Nodes', callback_data: `pnl_nodes_${version}` },
                            { text: '🏥 Health', callback_data: `pnl_health_${version}` }
                        ]
                    ]
                }
            });

        } catch (error) {
            bot.editMessageText(`❌ <b>Panel v${version} Error:</b>\n\n${error.message}`, {
                chat_id: chatId,
                message_id: wait.message_id,
                parse_mode: 'HTML'
            });
        }
    });

    // ═══════════════════════════════════════════════════════════════════════════════
    // /panelhealth [version] - Check system health
    // ═══════════════════════════════════════════════════════════════════════════════
    bot.onText(/^\/panelhealth(?:\s+(\d))?$/i, async (msg, match) => {
        const chatId = msg.chat.id;
        const version = match[1] ? parseInt(match[1]) : 1;

        try {
            const start = Date.now();
            await appApi('/users?per_page=1', version);
            const latency = Date.now() - start;

            let status = '🟢 Excellent';
            if (latency > 500) status = '🟡 Good';
            if (latency > 1500) status = '🟠 Lagging';
            if (latency > 3000) status = '🔴 Slow';

            bot.sendMessage(chatId, `🏥 <b>Panel Health v${version}</b>\n\n📶 Latency: ${latency}ms\n📊 Status: ${status}`, { parse_mode: 'HTML' });
        } catch (e) {
            bot.sendMessage(chatId, `🏥 <b>Panel Health v${version}</b>\n\n❌ Status: OFFLINE/ERROR\n⚠ Error: ${e.message}`, { parse_mode: 'HTML' });
        }
    });

    // ═══════════════════════════════════════════════════════════════════════════════
    // /panelusers [version] - List panel users
    // ═══════════════════════════════════════════════════════════════════════════════
    bot.onText(/^\/panelusers(?:\s+(\d))?$/i, async (msg, match) => {
        const chatId = msg.chat.id;
        const userId = msg.from.id.toString();

        if (!hasAccess(userId)) {
            return bot.sendMessage(chatId, '❌ ᴋʜᴜꜱᴜꜱ ᴏᴡɴᴇʀ/ᴘʀᴇᴍɪᴜᴍ!');
        }

        const version = match[1] ? parseInt(match[1]) : 1;
        const wait = await bot.sendMessage(chatId, `⏳ Loading users from panel v${version}...`);

        try {
            const res = await appApi('/users?sort=-created_at&per_page=50', version);
            const users = res.data;
            const total = res.meta.pagination.total;

            let text = `👥 <b>PANEL USERS v${version}</b> (${total} total)\n<code>━━━━━━━━━━━━━━━━━━━━━━</code>\n\n`;

            users.slice(0, 20).forEach((u, i) => {
                const attr = u.attributes;
                const admin = attr.root_admin ? '👑' : '👤';
                text += `${i + 1}. ${admin} <b>${attr.username}</b>\n`;
                text += `   📧 ${attr.email}\n`;
                text += `   🆔 ID: <code>${attr.id}</code>\n\n`;
            });

            if (total > 20) {
                text += `<i>...dan ${total - 20} user lainnya</i>`;
            }

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
    // /panelservers [version] - List panel servers
    // ═══════════════════════════════════════════════════════════════════════════════
    bot.onText(/^\/panelservers(?:\s+(\d))?$/i, async (msg, match) => {
        const chatId = msg.chat.id;
        const userId = msg.from.id.toString();

        if (!hasAccess(userId)) {
            return bot.sendMessage(chatId, '❌ ᴋʜᴜꜱᴜꜱ ᴏᴡɴᴇʀ/ᴘʀᴇᴍɪᴜᴍ!');
        }

        const version = match[1] ? parseInt(match[1]) : 1;
        const wait = await bot.sendMessage(chatId, `⏳ Loading servers from panel v${version}...`);

        try {
            const res = await appApi('/servers?sort=-created_at&per_page=50', version);
            const servers = res.data;
            const total = res.meta.pagination.total;

            let text = `🖥️ <b>PANEL SERVERS v${version}</b> (${total} total)\n<code>━━━━━━━━━━━━━━━━━━━━━━</code>\n\n`;

            servers.slice(0, 15).forEach((s, i) => {
                const attr = s.attributes;
                const status = attr.suspended ? '🔴' : '🟢';
                text += `${i + 1}. ${status} <b>${attr.name}</b>\n`;
                text += `   🆔 ${attr.identifier} | 💾 ${attr.limits?.memory || 0}MB\n`;
                text += `   👤 Owner ID: ${attr.user}\n\n`;
            });

            if (total > 15) {
                text += `<i>...dan ${total - 15} server lainnya</i>`;
            }

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
    // /panelnodes [version] - List panel nodes
    // ═══════════════════════════════════════════════════════════════════════════════
    bot.onText(/^\/panelnodes(?:\s+(\d))?$/i, async (msg, match) => {
        const chatId = msg.chat.id;
        const userId = msg.from.id.toString();

        if (!hasAccess(userId)) {
            return bot.sendMessage(chatId, '❌ ᴋʜᴜꜱᴜꜱ ᴏᴡɴᴇʀ/ᴘʀᴇᴍɪᴜᴍ!');
        }

        const version = match[1] ? parseInt(match[1]) : 1;
        const wait = await bot.sendMessage(chatId, `⏳ Loading nodes from panel v${version}...`);

        try {
            const res = await appApi('/nodes', version);
            const nodes = res.data;

            let text = `📡 <b>PANEL NODES v${version}</b> (${nodes.length} nodes)\n<code>━━━━━━━━━━━━━━━━━━━━━━</code>\n\n`;

            nodes.forEach((n, i) => {
                const attr = n.attributes;
                const maintenance = attr.maintenance_mode ? '🔧' : '🟢';
                text += `${i + 1}. ${maintenance} <b>${attr.name}</b>\n`;
                text += `   🌐 FQDN: ${attr.fqdn}\n`;
                text += `   💾 Memory: ${attr.memory}MB | 💽 Disk: ${attr.disk}MB\n`;
                text += `   🆔 ID: ${attr.id}\n\n`;
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
    // /panelstats [version] - Panel statistics
    // ═══════════════════════════════════════════════════════════════════════════════
    bot.onText(/^\/panelstats(?:\s+(\d))?$/i, async (msg, match) => {
        const chatId = msg.chat.id;
        const userId = msg.from.id.toString();

        if (!hasAccess(userId)) {
            return bot.sendMessage(chatId, '❌ ᴋʜᴜꜱᴜꜱ ᴏᴡɴᴇʀ/ᴘʀᴇᴍɪᴜᴍ!');
        }

        const version = match[1] ? parseInt(match[1]) : 1;
        const config = getPanelConfig(version);
        const wait = await bot.sendMessage(chatId, `⏳ Gathering stats for panel v${version}...`);

        try {
            const [users, servers, nodes] = await Promise.all([
                appApi('/users', version),
                appApi('/servers', version),
                appApi('/nodes', version)
            ]);

            // Count admins
            let adminCount = 0;
            users.data.forEach(u => {
                if (u.attributes.root_admin) adminCount++;
            });

            // Count suspended servers
            let suspendedCount = 0;
            servers.data.forEach(s => {
                if (s.attributes.suspended) suspendedCount++;
            });

            // Calculate node resources
            let totalMem = 0, totalDisk = 0;
            nodes.data.forEach(n => {
                totalMem += n.attributes.memory || 0;
                totalDisk += n.attributes.disk || 0;
            });

            const text = `
📊 <b>PANEL STATISTICS v${version}</b>
<code>━━━━━━━━━━━━━━━━━━━━━━</code>

<blockquote>
🌐 <b>Domain:</b> ${config.domain}

👥 <b>USERS</b>
┣ Total: ${users.meta.pagination.total}
┣ Admins: ${adminCount}
┗ Regular: ${users.meta.pagination.total - adminCount}

🖥️ <b>SERVERS</b>
┣ Total: ${servers.meta.pagination.total}
┣ Active: ${servers.meta.pagination.total - suspendedCount}
┗ Suspended: ${suspendedCount}

📡 <b>NODES</b>
┣ Total: ${nodes.data.length}
┣ Memory Pool: ${(totalMem / 1024).toFixed(1)} GB
┗ Disk Pool: ${(totalDisk / 1024).toFixed(1)} GB
</blockquote>

⏰ <i>${new Date().toLocaleString('id-ID')}</i>
`;

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
    // /panelclear [version] - Clear panel cache (needs SSH)
    // ═══════════════════════════════════════════════════════════════════════════════
    bot.onText(/^\/panelclear(?:\s+(\d))?$/i, async (msg, match) => {
        const chatId = msg.chat.id;
        const userId = msg.from.id.toString();
        const owners = loadJsonData(OWNER_FILE);

        if (!owners.includes(userId)) {
            return bot.sendMessage(chatId, '❌ ᴋʜᴜꜱᴜꜱ ᴏᴡɴᴇʀ!');
        }

        const version = match[1] ? parseInt(match[1]) : 1;

        bot.sendMessage(chatId, `
🧹 <b>CLEAR CACHE</b>

⚠️ Fitur ini membutuhkan akses SSH ke server panel.

<b>Manual command:</b>
<code>cd /var/www/pterodactyl && php artisan cache:clear && php artisan view:clear && php artisan config:clear</code>

Atau gunakan /vpsexec untuk menjalankan command SSH.
`, { parse_mode: 'HTML' });
    });

    // ═══════════════════════════════════════════════════════════════════════════════
    // /panelrestart [version] - Restart panel services (needs SSH)
    // ═══════════════════════════════════════════════════════════════════════════════
    bot.onText(/^\/panelrestart(?:\s+(\d))?$/i, async (msg, match) => {
        const chatId = msg.chat.id;
        const userId = msg.from.id.toString();
        const owners = loadJsonData(OWNER_FILE);

        if (!owners.includes(userId)) {
            return bot.sendMessage(chatId, '❌ ᴋʜᴜꜱᴜꜱ ᴏᴡɴᴇʀ!');
        }

        const version = match[1] ? parseInt(match[1]) : 1;

        bot.sendMessage(chatId, `
🔄 <b>RESTART PANEL SERVICES</b>

⚠️ Fitur ini membutuhkan akses SSH ke server panel.

<b>Manual commands:</b>
<code>systemctl restart pteroq</code>
<code>systemctl restart nginx</code>
<code>systemctl restart php8.1-fpm</code>
<code>systemctl restart redis</code>
<code>systemctl restart mariadb</code>

Atau gunakan /vpsexec untuk menjalankan command SSH.
`, { parse_mode: 'HTML' });
    });

    // ═══════════════════════════════════════════════════════════════════════════════
    // /panelbackup - Backup panel database
    // ═══════════════════════════════════════════════════════════════════════════════
    bot.onText(/^\/panelbackup$/i, async (msg) => {
        const chatId = msg.chat.id;
        const userId = msg.from.id.toString();
        const owners = loadJsonData(OWNER_FILE);

        if (!owners.includes(userId)) {
            return bot.sendMessage(chatId, '❌ ᴋʜᴜꜱᴜꜱ ᴏᴡɴᴇʀ!');
        }

        bot.sendMessage(chatId, `
💾 <b>BACKUP PANEL</b>

⚠️ Fitur ini membutuhkan akses SSH ke server panel.

<b>Manual command:</b>
<code>mysqldump -u pterodactyl -p pterodactyl > /root/panel_backup_$(date +%Y%m%d).sql</code>

<b>Backup .env:</b>
<code>cp /var/www/pterodactyl/.env /root/env_backup_$(date +%Y%m%d)</code>

Gunakan /vpsexec untuk menjalankan command SSH.
`, { parse_mode: 'HTML' });
    });

    // ═══════════════════════════════════════════════════════════════════════════════
    // Callback Query Handler
    // ═══════════════════════════════════════════════════════════════════════════════
    bot.on('callback_query', async (query) => {
        const data = query.data;
        const chatId = query.message.chat.id;

        if (!data.startsWith('pnl_')) return;

        const parts = data.split('_');
        const action = parts[1];
        const version = parseInt(parts[2]) || 1;

        bot.answerCallbackQuery(query.id, { text: '⏳ Loading...' });

        if (action === 'users') {
            try {
                const page = parseInt(parts[3]) || 1;
                const limit = 10;
                const offset = (page - 1) * limit;

                const res = await appApi(`/users?sort=-created_at&per_page=100`, version);
                const allUsers = res.data;
                const totalPage = Math.ceil(allUsers.length / limit);

                const paginatedUsers = allUsers.slice(offset, offset + limit);

                if (paginatedUsers.length === 0) return bot.sendMessage(chatId, "❌ No users found.");

                const keyboard = paginatedUsers.map(u => {
                    const admin = u.attributes.root_admin ? '👑' : '👤';
                    return [{
                        text: `${admin} ${u.attributes.username} | ${u.attributes.email}`,
                        callback_data: `pnl_usr_click_${u.attributes.id}_${version}`
                    }];
                });

                // Navigation
                const navRow = [];
                if (page > 1) navRow.push({ text: '⬅️ Prev', callback_data: `pnl_users_${version}_${page - 1}` });
                navRow.push({ text: `Page ${page}/${totalPage}`, callback_data: 'ignore' });
                if (page < totalPage) navRow.push({ text: 'Next ➡️', callback_data: `pnl_users_${version}_${page + 1}` });

                keyboard.push(navRow);
                keyboard.push([{ text: '🔙 Panel Menu', callback_data: `panel` }]);

                bot.editMessageText(`👥 <b>MANAGE USERS v${version}</b>\nTotal: ${allUsers.length} Users\n\n👇 <i>Click user to manage:</i>`, {
                    chat_id: chatId,
                    message_id: query.message.message_id,
                    parse_mode: 'HTML',
                    reply_markup: { inline_keyboard: keyboard }
                });
            } catch (e) {
                bot.sendMessage(chatId, `❌ Error: ${e.message}`);
            }
        }

        if (action === 'servers') {
            try {
                const page = parseInt(parts[3]) || 1;
                const limit = 10;
                const offset = (page - 1) * limit;

                const res = await appApi(`/servers?sort=-created_at&per_page=100`, version);
                const allServers = res.data;
                const totalPage = Math.ceil(allServers.length / limit);

                const paginatedServers = allServers.slice(offset, offset + limit);

                if (paginatedServers.length === 0) return bot.sendMessage(chatId, "❌ No servers found.");

                const keyboard = paginatedServers.map(s => {
                    const status = s.attributes.suspended ? '🔴' : '🟢';
                    const mem = s.attributes.limits.memory === 0 ? '∞' : s.attributes.limits.memory + 'MB';
                    return [{
                        text: `${status} ${s.attributes.name} | ${mem}`,
                        callback_data: `srv_main_${s.attributes.identifier}_${version}` // Links to servermgmt.js
                    }];
                });

                // Navigation
                const navRow = [];
                if (page > 1) navRow.push({ text: '⬅️ Prev', callback_data: `pnl_servers_${version}_${page - 1}` });
                navRow.push({ text: `Page ${page}/${totalPage}`, callback_data: 'ignore' });
                if (page < totalPage) navRow.push({ text: 'Next ➡️', callback_data: `pnl_servers_${version}_${page + 1}` });

                keyboard.push(navRow);
                keyboard.push([{ text: '🔙 Panel Menu', callback_data: `panel` }]);

                bot.editMessageText(`🖥️ <b>MANAGE SERVERS v${version}</b>\nTotal: ${allServers.length} Servers\n\n👇 <i>Click server to manage:</i>`, {
                    chat_id: chatId,
                    message_id: query.message.message_id,
                    parse_mode: 'HTML',
                    reply_markup: { inline_keyboard: keyboard }
                });
            } catch (e) {
                bot.sendMessage(chatId, `❌ Error: ${e.message}`);
            }
        }

        // Handle User Click (Manage User)
        if (action === 'usr') { // pnl_usr_click_id_version
            if (parts[2] === 'click') {
                const userId = parts[3];
                const version = parseInt(parts[4]) || 1;
                try {
                    const res = await appApi(`/users/${userId}`, version);
                    const u = res.attributes;

                    const text = `
👤 <b>USER DETAIL</b>
<code>━━━━━━━━━━━━━━━━━━━━</code>
📛 <b>User:</b> ${u.username}
📧 <b>Email:</b> ${u.email}
🆔 <b>ID:</b> <code>${u.id}</code>
👑 <b>Admin:</b> ${u.root_admin ? 'Yes' : 'No'}
📅 <b>Created:</b> ${u.created_at.split('T')[0]}
`;
                    const keyboard = [
                        [
                            { text: '🗑️ Delete User', callback_data: `pnl_usr_del_${userId}_${version}` },
                            { text: '🔑 Reset Pass', callback_data: `pnl_usr_rst_${userId}_${version}` }
                        ],
                        [
                            { text: '🔙 List Users', callback_data: `pnl_users_${version}_1` }
                        ]
                    ];

                    bot.editMessageText(text, {
                        chat_id: chatId,
                        message_id: query.message.message_id,
                        parse_mode: 'HTML',
                        reply_markup: { inline_keyboard: keyboard }
                    });
                } catch (e) {
                    bot.sendMessage(chatId, `❌ Error: ${e.message}`);
                }
            }
            // User Delete Confirm
            if (parts[2] === 'del') {
                const targetId = parts[3];
                const version = parseInt(parts[4]);
                bot.editMessageText(`⚠️ <b>CONFIRM DELETE USER ${targetId}?</b>`, {
                    chat_id: chatId,
                    message_id: query.message.message_id,
                    parse_mode: 'HTML',
                    reply_markup: {
                        inline_keyboard: [
                            [{ text: '✅ YES DELETE', callback_data: `pnl_usr_fixdel_${targetId}_${version}` }],
                            [{ text: '❌ CANCEL', callback_data: `pnl_usr_click_${targetId}_${version}` }]
                        ]
                    }
                });
            }
            // User Delete Action
            if (parts[2] === 'fixdel') {
                const targetId = parts[3];
                const version = parseInt(parts[4]);
                try {
                    await appApi(`/users/${targetId}`, 'DELETE', null, version);
                    bot.sendMessage(chatId, `✅ User ${targetId} Deleted!`);
                    bot.deleteMessage(chatId, query.message.message_id); // Remove menu
                } catch (e) {
                    bot.sendMessage(chatId, `❌ Gagal: ${e.message}`);
                }
            }
        }

        if (action === 'nodes') {
            try {
                const res = await appApi('/nodes', version);
                let text = `📡 <b>Nodes v${version}</b>\n\n`;
                res.data.forEach(n => {
                    const status = n.attributes.maintenance_mode ? '🔧' : '🟢';
                    text += `${status} <b>${n.attributes.name}</b> - ${n.attributes.fqdn}\n`;
                });
                bot.sendMessage(chatId, text, { parse_mode: 'HTML' });
            } catch (e) {
                bot.sendMessage(chatId, `❌ Error: ${e.message}`);
            }
        }

        if (action === 'health') {
            try {
                const start = Date.now();
                await appApi('/users?per_page=1', version);
                const latency = Date.now() - start;
                let status = '🟢 Excellent';
                if (latency > 500) status = '🟡 Good';
                if (latency > 1500) status = '🟠 Lagging';
                if (latency > 3000) status = '🔴 Slow';
                bot.sendMessage(chatId, `🏥 Panel v${version}: ${status}\n📶 Latency: ${latency}ms`);
            } catch (e) {
                bot.sendMessage(chatId, `🏥 Panel v${version}: ❌ OFFLINE\n⚠ ${e.message}`);
            }
        }
    });

};
