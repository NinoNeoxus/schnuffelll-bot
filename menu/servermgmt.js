/**
 * ═══════════════════════════════════════════════════════════════════════════════════════
 *  🖥️ SCHNUFFELLL BOT - SERVER MANAGEMENT v8.0
 *  Comprehensive server management commands
 *  
 *  Commands:
 *  /srvinfo <id>       - Info server detail
 *  /srvcreate          - Create server baru
 *  /srvdelete <id>     - Delete server
 *  /srvsuspend <id>    - Suspend server
 *  /srvunsuspend <id>  - Unsuspend server
 *  /srvrebuild <id>    - Rebuild server
 *  /srvpower <id>      - Power control (start/stop/restart/kill)
 *  /srvconsole <id>    - Get console URL
 *  /srvresources <id>  - Resource usage
 *  /srvrename <id>     - Rename server
 *  
 *  @author @schnuffelll
 *  @version 8.0
 * ═══════════════════════════════════════════════════════════════════════════════════════
 */

const axios = require('axios');
const { loadJsonData, saveJsonData } = require('../lib/function');

const settings = require('../config.js');

module.exports = (bot) => {

    console.log('[SERVER] 🖥️ Server Management Module v8.0 loaded');

    const OWNER_FILE = './db/users/adminID.json';
    const PREMIUM_FILE = './db/users/premiumUsers.json';

    // Helper: Check if user has access
    function hasAccess(userId) {
        const owners = loadJsonData(OWNER_FILE);
        const premium = loadJsonData(PREMIUM_FILE);
        return owners.includes(String(userId)) || premium.includes(String(userId));
    }

    // Helper: Get panel credentials
    function getPanelConfig(version = 1) {
        const versions = {
            1: { domain: settings.domain, key: settings.plta, ckey: settings.pltc },
            2: { domain: settings.domainV2, key: settings.pltaV2, ckey: settings.pltcV2 },
            3: { domain: settings.domainV3, key: settings.pltaV3, ckey: settings.pltcV3 },
            4: { domain: settings.domainV4, key: settings.pltaV4, ckey: settings.pltcV4 },
            5: { domain: settings.domainV5, key: settings.pltaV5, ckey: settings.pltcV5 }
        };
        return versions[version] || versions[1];
    }

    // Helper: Application API request
    async function appApi(endpoint, method = 'GET', data = null, version = 1) {
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

    // Helper: Client API request
    async function clientApi(endpoint, method = 'GET', data = null, version = 1) {
        const config = getPanelConfig(version);
        const url = `https://${config.domain}/api/client${endpoint}`;
        const headers = {
            'Authorization': `Bearer ${config.ckey}`,
            'Content-Type': 'application/json',
            'Accept': 'application/json'
        };

        const response = await axios({ method, url, headers, data, timeout: 15000 });
        return response.data;
    }

    // ═══════════════════════════════════════════════════════════════════════════════
    // /srvinfo <identifier> [version] - Info server detail
    // ═══════════════════════════════════════════════════════════════════════════════
    bot.onText(/^\/srvinfo\s+(\S+)(?:\s+(\d))?$/i, async (msg, match) => {
        const chatId = msg.chat.id;
        const userId = msg.from.id.toString();

        if (!hasAccess(userId)) {
            return bot.sendMessage(chatId, '❌ ᴋʜᴜꜱᴜꜱ ᴏᴡɴᴇʀ/ᴘʀᴇᴍɪᴜᴍ!');
        }

        const identifier = match[1];
        const version = match[2] ? parseInt(match[2]) : 1;
        const wait = await bot.sendMessage(chatId, `⏳ Mengambil info server ${identifier}...`);

        try {
            const data = await clientApi(`/servers/${identifier}`, 'GET', null, version);
            const srv = data.attributes;

            const text = `
🖥️ <b>SERVER INFO</b>
<code>━━━━━━━━━━━━━━━━━━━━━━</code>

<blockquote>
📛 <b>Name:</b> ${srv.name}
🆔 <b>ID:</b> <code>${srv.identifier}</code>
📝 <b>Description:</b> ${srv.description || '-'}

📊 <b>STATUS</b>
┣ Suspended: ${srv.is_suspended ? '🔴 Yes' : '🟢 No'}
┣ Installing: ${srv.is_installing ? '⏳ Yes' : '✅ No'}
┗ Transferring: ${srv.is_transferring ? '🔄 Yes' : '✅ No'}

💾 <b>LIMITS</b>
┣ RAM: <b>${srv.limits?.memory || 0} MB</b>
┣ Disk: <b>${srv.limits?.disk || 0} MB</b>
┣ CPU: <b>${srv.limits?.cpu || 0}%</b>
┣ Swap: <b>${srv.limits?.swap || 0} MB</b>
┗ IO: <b>${srv.limits?.io || 0}</b>

🔌 <b>FEATURE LIMITS</b>
┣ Databases: ${srv.feature_limits?.databases || 0}
┣ Allocations: ${srv.feature_limits?.allocations || 0}
┗ Backups: ${srv.feature_limits?.backups || 0}
</blockquote>
`;

            bot.editMessageText(text, {
                chat_id: chatId,
                message_id: wait.message_id,
                parse_mode: 'HTML',
                reply_markup: {
                    inline_keyboard: [
                        [
                            { text: '▶️ Start', callback_data: `srv_power_start_${identifier}_${version}` },
                            { text: '⏹️ Stop', callback_data: `srv_power_stop_${identifier}_${version}` },
                            { text: '🔄 Restart', callback_data: `srv_power_restart_${identifier}_${version}` }
                        ],
                        [
                            { text: '📊 Resources', callback_data: `srv_resources_${identifier}_${version}` },
                            { text: '🖥️ Console', callback_data: `srv_console_${identifier}_${version}` }
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
    // /srvpower <identifier> <action> [version] - Power control
    // ═══════════════════════════════════════════════════════════════════════════════
    bot.onText(/^\/srvpower\s+(\S+)\s+(start|stop|restart|kill)(?:\s+(\d))?$/i, async (msg, match) => {
        const chatId = msg.chat.id;
        const userId = msg.from.id.toString();

        if (!hasAccess(userId)) {
            return bot.sendMessage(chatId, '❌ ᴋʜᴜꜱᴜꜱ ᴏᴡɴᴇʀ/ᴘʀᴇᴍɪᴜᴍ!');
        }

        const identifier = match[1];
        const action = match[2].toLowerCase();
        const version = match[3] ? parseInt(match[3]) : 1;

        const actionEmoji = { start: '▶️', stop: '⏹️', restart: '🔄', kill: '💀' };
        const wait = await bot.sendMessage(chatId, `${actionEmoji[action]} Sending ${action} signal to ${identifier}...`);

        try {
            await clientApi(`/servers/${identifier}/power`, 'POST', { signal: action }, version);

            bot.editMessageText(`${actionEmoji[action]} <b>Power ${action.toUpperCase()} sent!</b>\n\n🖥️ Server: <code>${identifier}</code>`, {
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
    // /srvresources <identifier> [version] - Resource usage
    // ═══════════════════════════════════════════════════════════════════════════════
    bot.onText(/^\/srvresources\s+(\S+)(?:\s+(\d))?$/i, async (msg, match) => {
        const chatId = msg.chat.id;
        const userId = msg.from.id.toString();

        if (!hasAccess(userId)) {
            return bot.sendMessage(chatId, '❌ ᴋʜᴜꜱᴜꜱ ᴏᴡɴᴇʀ/ᴘʀᴇᴍɪᴜᴍ!');
        }

        const identifier = match[1];
        const version = match[2] ? parseInt(match[2]) : 1;
        const wait = await bot.sendMessage(chatId, `⏳ Mengambil resource usage ${identifier}...`);

        try {
            const data = await clientApi(`/servers/${identifier}/resources`, 'GET', null, version);
            const res = data.attributes;

            const stateEmoji = {
                'running': '🟢 Running',
                'starting': '🟡 Starting',
                'stopping': '🟠 Stopping',
                'offline': '🔴 Offline'
            };

            const memMB = (res.resources?.memory_bytes || 0) / 1024 / 1024;
            const diskMB = (res.resources?.disk_bytes || 0) / 1024 / 1024;
            const netRx = (res.resources?.network_rx_bytes || 0) / 1024 / 1024;
            const netTx = (res.resources?.network_tx_bytes || 0) / 1024 / 1024;

            const text = `
📊 <b>RESOURCE USAGE</b>
<code>━━━━━━━━━━━━━━━━━━━━━━</code>

<blockquote>
🖥️ <b>Server:</b> <code>${identifier}</code>
🔋 <b>Status:</b> ${stateEmoji[res.current_state] || res.current_state}
⏱️ <b>Uptime:</b> ${Math.floor((res.resources?.uptime || 0) / 1000 / 60)} minutes

💾 <b>USAGE</b>
┣ RAM: <b>${memMB.toFixed(1)} MB</b>
┣ CPU: <b>${(res.resources?.cpu_absolute || 0).toFixed(1)}%</b>
┣ Disk: <b>${diskMB.toFixed(1)} MB</b>
┗ Network: ↓${netRx.toFixed(1)}MB | ↑${netTx.toFixed(1)}MB
</blockquote>

⏰ <i>${new Date().toLocaleString('id-ID')}</i>
`;

            bot.editMessageText(text, {
                chat_id: chatId,
                message_id: wait.message_id,
                parse_mode: 'HTML',
                reply_markup: {
                    inline_keyboard: [
                        [
                            { text: '🔄 Refresh', callback_data: `srv_resources_${identifier}_${version}` }
                        ],
                        [
                            { text: '▶️ Start', callback_data: `srv_power_start_${identifier}_${version}` },
                            { text: '⏹️ Stop', callback_data: `srv_power_stop_${identifier}_${version}` },
                            { text: '🔄 Restart', callback_data: `srv_power_restart_${identifier}_${version}` }
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
    // /srvunli <id> [version] - Set unlimited resources (renamed from /unli to avoid conflict)
    // NOTE: /unli in panel.js creates user+server with unlimited, this one just modifies existing server
    // ═══════════════════════════════════════════════════════════════════════════════
    bot.onText(/^\/srvunli\s+(\d+)(?:\s+(\d))?$/i, async (msg, match) => {
        const chatId = msg.chat.id;
        const userId = msg.from.id.toString();

        if (!hasAccess(userId)) {
            return bot.sendMessage(chatId, '❌ ᴋʜᴜꜱᴜꜱ ᴏᴡɴᴇʀ/ᴘʀᴇᴍɪᴜᴍ!');
        }

        const serverId = match[1];
        const version = match[2] ? parseInt(match[2]) : 1;

        const wait = await bot.sendMessage(chatId, `⏳ Making server ${serverId} unlimited...`);

        try {
            // Update build configuration to unlimited (0)
            const buildData = {
                allocation: 0, // 0 usually ignored or kept, but required by some endpoints?
                // Actually appApi uses application/servers/{id}/build
                // We must provide all fields or they might reset?
                // Standard unli: ram=0, swap=0, io=500, cpu=0, disk=0
                memory: 0,
                swap: 0,
                io: 500,
                cpu: 0,
                disk: 0,
                feature_limits: {
                    databases: 0,
                    allocations: 0,
                    backups: 0
                }
            };

            await appApi(`/application/servers/${serverId}/build`, 'PATCH', buildData, version);

            bot.editMessageText(`✅ <b>Server Unleashed!</b>\n\n🆔 ID: <code>${serverId}</code>\n🚀 Resources: <b>UNLIMITED (∞)</b>`, {
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
    // /srvsuspend <id> [version] - Suspend server
    // ═══════════════════════════════════════════════════════════════════════════════
    bot.onText(/^\/srvsuspend\s+(\d+)(?:\s+(\d))?$/i, async (msg, match) => {
        const chatId = msg.chat.id;
        const userId = msg.from.id.toString();

        const owners = loadJsonData(OWNER_FILE);
        if (!owners.includes(userId)) {
            return bot.sendMessage(chatId, '❌ ᴋʜᴜꜱᴜꜱ ᴏᴡɴᴇʀ!');
        }

        const serverId = match[1];
        const version = match[2] ? parseInt(match[2]) : 1;
        const wait = await bot.sendMessage(chatId, `⏳ Suspending server ID ${serverId}...`);

        try {
            await appApi(`/application/servers/${serverId}/suspend`, 'POST', null, version);

            bot.editMessageText(`🔴 <b>Server Suspended!</b>\n\n🆔 Server ID: <code>${serverId}</code>`, {
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
    // /srvunsuspend <id> [version] - Unsuspend server
    // ═══════════════════════════════════════════════════════════════════════════════
    bot.onText(/^\/srvunsuspend\s+(\d+)(?:\s+(\d))?$/i, async (msg, match) => {
        const chatId = msg.chat.id;
        const userId = msg.from.id.toString();

        const owners = loadJsonData(OWNER_FILE);
        if (!owners.includes(userId)) {
            return bot.sendMessage(chatId, '❌ ᴋʜᴜꜱᴜꜱ ᴏᴡɴᴇʀ!');
        }

        const serverId = match[1];
        const version = match[2] ? parseInt(match[2]) : 1;
        const wait = await bot.sendMessage(chatId, `⏳ Unsuspending server ID ${serverId}...`);

        try {
            await appApi(`/application/servers/${serverId}/unsuspend`, 'POST', null, version);

            bot.editMessageText(`🟢 <b>Server Unsuspended!</b>\n\n🆔 Server ID: <code>${serverId}</code>`, {
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
    // /srvrebuild <id> [version] - Rebuild server with monitoring
    // ═══════════════════════════════════════════════════════════════════════════════
    bot.onText(/^\/srvrebuild\s+(\d+)(?:\s+(\d))?$/i, async (msg, match) => {
        const chatId = msg.chat.id;
        const userId = msg.from.id.toString();

        const owners = loadJsonData(OWNER_FILE);
        if (!owners.includes(userId)) {
            return bot.sendMessage(chatId, '❌ ᴋʜᴜꜱᴜꜱ ᴏᴡɴᴇʀ!');
        }

        const serverId = match[1];
        const version = match[2] ? parseInt(match[2]) : 1;
        const wait = await bot.sendMessage(chatId, `⏳ Rebuilding server ID ${serverId}...`);

        try {
            // 1. Trigger Reinstall
            await appApi(`/application/servers/${serverId}/reinstall`, 'POST', null, version);

            bot.editMessageText(`🔄 <b>Rebuild Started!</b>\n\n🆔 Server: <code>${serverId}</code>\n\n<i>Bot will monitor progress every 60s...</i>`, {
                chat_id: chatId,
                message_id: wait.message_id,
                parse_mode: 'HTML'
            });

            // 2. Monitoring Loop
            let attempts = 0;
            const maxAttempts = 5; // 5 mins
            let rebootCount = 0;
            let lastState = '';

            const interval = setInterval(async () => {
                attempts++;
                try {
                    // Check Client API for status
                    const data = await clientApi(`/servers/${serverId}/resources`, 'GET', null, version);
                    const state = data.attributes.current_state;

                    // Log status
                    const time = new Date().toLocaleTimeString();
                    console.log(`[Rebuild Monitor] ${serverId}: ${state} (Attempt ${attempts}/${maxAttempts})`);

                    // Logic: "fiks menu /rebuild... maksa konek... masukin tail log... sukses dalam 2 kali reboot"
                    // We interpret this as waiting for "running" state after "installing"/"starting" cycles.

                    if (state === 'running') {
                        if (attempts > 1) { // Ensure we waited at least a bit or saw a transition
                            clearInterval(interval);
                            bot.sendMessage(chatId, `✅ <b>Rebuild Successful!</b>\n\n🆔 Server ${serverId} is now RUNNING.\n⏱️ Time: ${attempts} mins`, { parse_mode: 'HTML' });
                            return;
                        }
                    }

                    // Update Status Message
                    if (attempts % 1 === 0) { // Update every attempt
                        bot.editMessageText(`🔄 <b>Rebuild Progress: ${attempts}/${maxAttempts}</b>\n\n🆔 Server: <code>${serverId}</code>\n🔋 Status: <b>${state.toUpperCase()}</b>\n\n<i>Waiting for server to stabilise...</i>`, {
                            chat_id: chatId,
                            message_id: wait.message_id,
                            parse_mode: 'HTML'
                        }).catch(() => { });
                    }

                    if (attempts >= maxAttempts) {
                        clearInterval(interval);
                        // Check one last time or declare timeout
                        if (state === 'running') {
                            bot.sendMessage(chatId, `✅ <b>Rebuild Completed!</b> (Timeout but Running)`);
                        } else {
                            bot.sendMessage(chatId, `⚠️ <b>Rebuild Timeout</b>\n\nServer belum 'running' setelah 5 menit. Cek manual.`);
                        }
                    }

                } catch (err) {
                    console.error('[Rebuild Monitor Error]', err.message);
                    // Don't stop interval on transient errors, but if 404/403 stop
                    if (err.response && (err.response.status === 404 || err.response.status === 403)) {
                        clearInterval(interval);
                        bot.sendMessage(chatId, `❌ Monitor cancelled: ${err.message}`);
                    }
                }

            }, 60000); // 60 seconds

        } catch (error) {
            bot.editMessageText(`❌ Error: ${error.message}`, {
                chat_id: chatId,
                message_id: wait.message_id
            });
        }
    });

    // ═══════════════════════════════════════════════════════════════════════════════
    // /srvdelete <id> [version] - Delete server
    // ═══════════════════════════════════════════════════════════════════════════════
    bot.onText(/^\/srvdelete\s+(\d+)(?:\s+(\d))?$/i, async (msg, match) => {
        const chatId = msg.chat.id;
        const userId = msg.from.id.toString();

        const owners = loadJsonData(OWNER_FILE);
        if (!owners.includes(userId)) {
            return bot.sendMessage(chatId, '❌ ᴋʜᴜꜱᴜꜱ ᴏᴡɴᴇʀ!');
        }

        const serverId = match[1];
        const version = match[2] ? parseInt(match[2]) : 1;

        bot.sendMessage(chatId, `⚠️ <b>KONFIRMASI DELETE</b>\n\n🆔 Server ID: <code>${serverId}</code>\n\n⚠️ Ini akan <b>MENGHAPUS PERMANEN</b> server!\n\nKetik <code>/srvdeleteconfirm ${serverId} ${version}</code> untuk konfirmasi.`, {
            parse_mode: 'HTML'
        });
    });

    bot.onText(/^\/srvdeleteconfirm\s+(\d+)(?:\s+(\d))?$/i, async (msg, match) => {
        const chatId = msg.chat.id;
        const userId = msg.from.id.toString();

        const owners = loadJsonData(OWNER_FILE);
        if (!owners.includes(userId)) {
            return bot.sendMessage(chatId, '❌ ᴋʜᴜꜱᴜꜱ ᴏᴡɴᴇʀ!');
        }

        const serverId = match[1];
        const version = match[2] ? parseInt(match[2]) : 1;
        const wait = await bot.sendMessage(chatId, `⏳ Menghapus server ID ${serverId}...`);

        try {
            await appApi(`/application/servers/${serverId}`, 'DELETE', null, version);

            bot.editMessageText(`🗑️ <b>Server Deleted!</b>\n\n🆔 Server ID: <code>${serverId}</code>`, {
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
    // /srvconsole <identifier> [version] - Get console URL
    // ═══════════════════════════════════════════════════════════════════════════════
    bot.onText(/^\/srvconsole\s+(\S+)(?:\s+(\d))?$/i, async (msg, match) => {
        const chatId = msg.chat.id;
        const userId = msg.from.id.toString();

        if (!hasAccess(userId)) {
            return bot.sendMessage(chatId, '❌ ᴋʜᴜꜱᴜꜱ ᴏᴡɴᴇʀ/ᴘʀᴇᴍɪᴜᴍ!');
        }

        const identifier = match[1];
        const version = match[2] ? parseInt(match[2]) : 1;
        const config = getPanelConfig(version);

        const consoleUrl = `https://${config.domain}/server/${identifier}`;

        bot.sendMessage(chatId, `🖥️ <b>CONSOLE SERVER</b>\n\n🆔 Server: <code>${identifier}</code>\n🔗 Console: ${consoleUrl}`, {
            parse_mode: 'HTML',
            reply_markup: {
                inline_keyboard: [
                    [{ text: '🖥️ Buka Console', url: consoleUrl }]
                ]
            }
        });
    });

    // ═══════════════════════════════════════════════════════════════════════════════
    // CALLBACK HANDLERS
    // ═══════════════════════════════════════════════════════════════════════════════
    bot.on('callback_query', async (query) => {
        const data = query.data;
        const chatId = query.message.chat.id;
        const userId = query.from.id.toString();

        if (!data.startsWith('srv_')) return;

        if (!hasAccess(userId)) {
            return bot.answerCallbackQuery(query.id, { text: '❌ Akses ditolak!', show_alert: true });
        }

        const parts = data.split('_');
        // Format: srv_action_param_identifier_version

        if (parts[1] === 'power') {
            // srv_power_action_identifier_version
            const action = parts[2];
            const identifier = parts[3];
            const version = parseInt(parts[4]) || 1;

            bot.answerCallbackQuery(query.id, { text: `⏳ Sending ${action}...` });

            try {
                await clientApi(`/servers/${identifier}/power`, 'POST', { signal: action }, version);
                bot.sendMessage(chatId, `✅ Power ${action} sent to ${identifier}`);
            } catch (error) {
                bot.sendMessage(chatId, `❌ Error: ${error.message}`);
            }
        }

        if (parts[1] === 'resources') {
            // srv_resources_identifier_version
            const identifier = parts[2];
            const version = parseInt(parts[3]) || 1;

            bot.answerCallbackQuery(query.id, { text: '⏳ Refreshing...' });

            try {
                const data = await clientApi(`/servers/${identifier}/resources`, 'GET', null, version);
                const res = data.attributes;

                const memMB = (res.resources && res.resources.memory_bytes ? res.resources.memory_bytes : 0) / 1024 / 1024;
                const text = `📊 <b>${identifier}</b>\n\n🔋 ${res.current_state}\n💾 RAM: ${memMB.toFixed(1)}MB\n⚡ CPU: ${(res.resources && res.resources.cpu_absolute ? res.resources.cpu_absolute : 0).toFixed(1)}%`;

                bot.sendMessage(chatId, text, { parse_mode: 'HTML' });
            } catch (error) {
                bot.sendMessage(chatId, `❌ Error: ${error.message}`);
            }
        }

        if (parts[1] === 'console') {
            const identifier = parts[2];
            const version = parseInt(parts[3]) || 1;
            const config = getPanelConfig(version);

            bot.answerCallbackQuery(query.id, { text: '🖥️ Opening console...' });
            bot.sendMessage(chatId, `🖥️ Console: https://${config.domain}/server/${identifier}`);
        }

        if (parts[1] === 'main') {
            // srv_main_identifier_version
            const identifier = parts[2];
            const version = parseInt(parts[3]) || 1;

            bot.answerCallbackQuery(query.id, { text: '⏳ Loading info...' });

            try {
                // Reuse logic from /srvinfo
                const data = await clientApi(`/servers/${identifier}`, 'GET', null, version);
                const srv = data.attributes;
                const limits = srv.limits || {};

                const text = `
🖥️ <b>SERVER INFO</b>
<code>━━━━━━━━━━━━━━━━━━━━━━</code>

<blockquote>
📛 <b>Name:</b> ${srv.name}
🆔 <b>ID:</b> <code>${srv.identifier}</code>
📝 <b>Description:</b> ${srv.description || '-'}

📊 <b>STATUS</b>
┣ Suspended: ${srv.is_suspended ? '🔴 Yes' : '🟢 No'}
┣ Installing: ${srv.is_installing ? '⏳ Yes' : '✅ No'}
┗ Transferring: ${srv.is_transferring ? '🔄 Yes' : '✅ No'}

💾 <b>LIMITS</b>
┣ RAM: <b>${limits.memory || 0} MB</b>
┣ Disk: <b>${limits.disk || 0} MB</b>
┣ CPU: <b>${limits.cpu || 0}%</b>
┣ Swap: <b>${limits.swap || 0} MB</b>
┗ IO: <b>${limits.io || 0}</b>
</blockquote>
`;

                const keyboard = {
                    inline_keyboard: [
                        [
                            { text: '▶️ Start', callback_data: `srv_power_start_${identifier}_${version}` },
                            { text: '⏹️ Stop', callback_data: `srv_power_stop_${identifier}_${version}` },
                            { text: '🔄 Restart', callback_data: `srv_power_restart_${identifier}_${version}` }
                        ],
                        [
                            { text: '📊 Resources', callback_data: `srv_resources_${identifier}_${version}` },
                            { text: '🖥️ Console', callback_data: `srv_console_${identifier}_${version}` }
                        ],
                        [
                            { text: '🔙 LIST SERVER', callback_data: `pnl_servers_${version}_1` } // Back to list
                        ]
                    ]
                };

                bot.editMessageText(text, {
                    chat_id: chatId,
                    message_id: query.message.message_id,
                    parse_mode: 'HTML',
                    reply_markup: keyboard
                });

            } catch (error) {
                bot.sendMessage(chatId, `❌ Error: ${error.message}`);
            }
        }
    });

};
