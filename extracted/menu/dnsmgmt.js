/**
 * ═══════════════════════════════════════════════════════════════════════════════════════
 *  🌐 SCHNUFFELLL BOT - DNS SUBDOMAIN MANAGEMENT v8.1
 *  Manage Cloudflare DNS records and cleanup unused subdomains
 *  
 *  Features:
 *  - List all DNS records/subdomains
 *  - Check dead subdomains (no response)
 *  - Toggle Cloudflare proxy (orange cloud) on/off
 *  - Delete unused/dead subdomains
 *  - Batch operations
 *  
 *  Commands:
 *  /dnslist              - List all DNS records
 *  /dnscheck             - Check dead subdomains
 *  /dnsproxy <on/off>    - Toggle proxy for subdomain
 *  /dnsadd <sub> <ip>    - Add new subdomain
 *  /dnsdelete <sub>      - Delete subdomain
 *  /dnsclean             - Clean all dead subdomains
 *  /dnssettings          - DNS settings menu
 *  
 *  @author @schnuffelll
 *  @version 8.1
 * ═══════════════════════════════════════════════════════════════════════════════════════
 */

const axios = require('axios');
const fs = require('fs');
const { loadJsonData, saveJsonData } = require('../lib/function');

const settings = require('../config.js');

module.exports = (bot) => {

    console.log('[DNS] 🌐 DNS Subdomain Management v8.1 loaded');

    const OWNER_ID = settings.ownerId; // Owner ID from config.js
    const DNS_SETTINGS_FILE = './db/dns_settings.json';

    // Initialize DNS settings
    if (!fs.existsSync(DNS_SETTINGS_FILE)) {
        saveJsonData(DNS_SETTINGS_FILE, {
            autoDisableProxy: true,  // Disable proxy before check
            checkTimeout: 5000,      // 5 seconds timeout
            batchDelay: 500          // Delay between batch operations
        });
    }

    // Get Cloudflare credentials from config
    function getCfCredentials() {
        return {
            token: settings.cfToken || settings.cloudflareToken || settings.CF_TOKEN,
            zoneId: settings.cfZoneId || settings.cloudflareZoneId || settings.CF_ZONE_ID,
            email: settings.cfEmail || settings.cloudflareEmail
        };
    }

    // Helper: Check if user is owner (config.js ownerId ONLY)
    function isOwner(userId) {
        return String(userId) === String(OWNER_ID);
    }

    // Helper: Cloudflare API request
    async function cfApi(endpoint, method = 'GET', data = null) {
        const creds = getCfCredentials();

        if (!creds.token || !creds.zoneId) {
            throw new Error('Cloudflare credentials not configured! Set cfToken and cfZoneId in config.js');
        }

        const url = `https://api.cloudflare.com/client/v4/zones/${creds.zoneId}${endpoint}`;
        const headers = {
            'Authorization': `Bearer ${creds.token}`,
            'Content-Type': 'application/json'
        };

        const config = { method, url, headers, timeout: 15000 };
        if (data) config.data = data;

        const response = await axios(config);
        return response.data;
    }

    // Helper: Check if subdomain is alive
    async function checkSubdomainAlive(subdomain) {
        const dnsSettings = loadJsonData(DNS_SETTINGS_FILE);
        const timeout = dnsSettings.checkTimeout || 5000;

        try {
            const response = await axios.get(`http://${subdomain}`, {
                timeout,
                validateStatus: () => true // Accept any status
            });
            return { alive: true, status: response.status };
        } catch (e) {
            // Try HTTPS
            try {
                const response = await axios.get(`https://${subdomain}`, {
                    timeout,
                    validateStatus: () => true
                });
                return { alive: true, status: response.status };
            } catch (e2) {
                return { alive: false, error: e2.code || e2.message };
            }
        }
    }

    // ═══════════════════════════════════════════════════════════════════════════════
    // /dnslist - List all DNS records
    // ═══════════════════════════════════════════════════════════════════════════════
    bot.onText(/^\/dnslist$/i, async (msg) => {
        const chatId = msg.chat.id;
        const userId = msg.from.id.toString();

        if (!isOwner(userId)) {
            return bot.sendMessage(chatId, '❌ ᴋʜᴜꜱᴜꜱ ᴏᴡɴᴇʀ!');
        }

        const wait = await bot.sendMessage(chatId, '⏳ Fetching DNS records...');

        try {
            const result = await cfApi('/dns_records?per_page=100');
            const records = result.result || [];

            if (records.length === 0) {
                return bot.editMessageText('📋 Tidak ada DNS record.', {
                    chat_id: chatId,
                    message_id: wait.message_id
                });
            }

            // Group by type
            const aRecords = records.filter(r => r.type === 'A');
            const cnameRecords = records.filter(r => r.type === 'CNAME');

            let text = `🌐 <b>DNS RECORDS</b> (${records.length} total)\n<code>━━━━━━━━━━━━━━━━━━━━━━</code>\n\n`;

            text += `<b>📍 A Records (${aRecords.length})</b>\n`;
            aRecords.slice(0, 15).forEach((r, i) => {
                const proxy = r.proxied ? '🟠' : '⚪';
                text += `${i + 1}. ${proxy} <code>${r.name}</code>\n`;
                text += `   → ${r.content}\n`;
            });

            if (aRecords.length > 15) {
                text += `   <i>...dan ${aRecords.length - 15} lainnya</i>\n`;
            }

            text += `\n<b>🔗 CNAME Records (${cnameRecords.length})</b>\n`;
            cnameRecords.slice(0, 10).forEach((r, i) => {
                const proxy = r.proxied ? '🟠' : '⚪';
                text += `${i + 1}. ${proxy} <code>${r.name}</code>\n`;
            });

            text += `\n<blockquote>🟠 = Proxy ON | ⚪ = Proxy OFF</blockquote>`;

            bot.editMessageText(text, {
                chat_id: chatId,
                message_id: wait.message_id,
                parse_mode: 'HTML',
                reply_markup: {
                    inline_keyboard: [
                        [
                            { text: '🔍 Check Dead', callback_data: 'dns_checkdead' },
                            { text: '🔄 Refresh', callback_data: 'dns_refresh' }
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
    // /dnscheck - Check dead subdomains
    // ═══════════════════════════════════════════════════════════════════════════════
    bot.onText(/^\/dnscheck$/i, async (msg) => {
        const chatId = msg.chat.id;
        const userId = msg.from.id.toString();

        if (!isOwner(userId)) {
            return bot.sendMessage(chatId, '❌ ᴋʜᴜꜱᴜꜱ ᴏᴡɴᴇʀ!');
        }

        const dnsSettings = loadJsonData(DNS_SETTINGS_FILE);
        const wait = await bot.sendMessage(chatId, '⏳ Checking subdomains... This may take a while.');

        try {
            const result = await cfApi('/dns_records?type=A&per_page=100');
            const records = result.result || [];

            if (records.length === 0) {
                return bot.editMessageText('📋 Tidak ada A records.', {
                    chat_id: chatId,
                    message_id: wait.message_id
                });
            }

            // If auto-disable proxy is on, temporarily disable for accurate check
            const recordsToCheck = [];
            for (const record of records) {
                if (dnsSettings.autoDisableProxy && record.proxied) {
                    // Temporarily disable proxy
                    try {
                        await cfApi(`/dns_records/${record.id}`, 'PATCH', { proxied: false });
                        recordsToCheck.push({ ...record, wasProxied: true });
                    } catch (e) {
                        recordsToCheck.push(record);
                    }
                } else {
                    recordsToCheck.push(record);
                }
                await new Promise(r => setTimeout(r, dnsSettings.batchDelay || 200));
            }

            // Wait a bit for DNS propagation
            await new Promise(r => setTimeout(r, 2000));

            // Check each subdomain
            const dead = [];
            const alive = [];
            let checked = 0;

            for (const record of recordsToCheck) {
                checked++;
                if (checked % 5 === 0) {
                    bot.editMessageText(`⏳ Checking... ${checked}/${recordsToCheck.length}`, {
                        chat_id: chatId,
                        message_id: wait.message_id
                    }).catch(() => { });
                }

                const status = await checkSubdomainAlive(record.name);

                if (status.alive) {
                    alive.push({ ...record, status: status.status });
                } else {
                    dead.push({ ...record, error: status.error });
                }

                // Restore proxy if it was enabled
                if (record.wasProxied) {
                    try {
                        await cfApi(`/dns_records/${record.id}`, 'PATCH', { proxied: true });
                    } catch (e) { }
                }

                await new Promise(r => setTimeout(r, dnsSettings.batchDelay || 200));
            }

            let text = `🔍 <b>SUBDOMAIN CHECK RESULT</b>\n<code>━━━━━━━━━━━━━━━━━━━━━━</code>\n\n`;
            text += `✅ <b>Alive:</b> ${alive.length}\n`;
            text += `❌ <b>Dead:</b> ${dead.length}\n\n`;

            if (dead.length > 0) {
                text += `<b>💀 DEAD SUBDOMAINS:</b>\n`;
                dead.slice(0, 15).forEach((r, i) => {
                    text += `${i + 1}. <code>${r.name}</code>\n`;
                    text += `   → ${r.content} (${r.error})\n`;
                });

                if (dead.length > 15) {
                    text += `   <i>...dan ${dead.length - 15} lainnya</i>\n`;
                }
            }

            const keyboard = dead.length > 0 ? {
                inline_keyboard: [
                    [{ text: '🗑️ Delete All Dead', callback_data: 'dns_deleteall_dead' }]
                ]
            } : undefined;

            bot.editMessageText(text, {
                chat_id: chatId,
                message_id: wait.message_id,
                parse_mode: 'HTML',
                reply_markup: keyboard
            });

        } catch (error) {
            bot.editMessageText(`❌ Error: ${error.message}`, {
                chat_id: chatId,
                message_id: wait.message_id
            });
        }
    });

    // ═══════════════════════════════════════════════════════════════════════════════
    // /dnsadd <subdomain> <ip> [proxy] - Add new subdomain
    // ═══════════════════════════════════════════════════════════════════════════════
    bot.onText(/^\/dnsadd\s+(\S+)\s+(\d+\.\d+\.\d+\.\d+)(?:\s+(on|off))?$/i, async (msg, match) => {
        const chatId = msg.chat.id;
        const userId = msg.from.id.toString();

        if (!isOwner(userId)) {
            return bot.sendMessage(chatId, '❌ ᴋʜᴜꜱᴜꜱ ᴏᴡɴᴇʀ!');
        }

        const subdomain = match[1];
        const ip = match[2];
        const proxied = match[3]?.toLowerCase() !== 'off';

        const wait = await bot.sendMessage(chatId, `⏳ Adding ${subdomain}...`);

        try {
            // Get zone info for domain name
            const zoneInfo = await cfApi('');
            const domain = zoneInfo.result?.name || 'domain.com';

            const fullName = subdomain.includes('.') ? subdomain : `${subdomain}.${domain}`;

            await cfApi('/dns_records', 'POST', {
                type: 'A',
                name: fullName,
                content: ip,
                ttl: 1,  // Auto
                proxied: proxied
            });

            const proxyStatus = proxied ? '🟠 ON' : '⚪ OFF';

            bot.editMessageText(`✅ <b>DNS Record Added!</b>

🌐 <b>Subdomain:</b> <code>${fullName}</code>
📍 <b>IP:</b> <code>${ip}</code>
☁️ <b>Proxy:</b> ${proxyStatus}`, {
                chat_id: chatId,
                message_id: wait.message_id,
                parse_mode: 'HTML'
            });

        } catch (error) {
            const errMsg = error.response?.data?.errors?.[0]?.message || error.message;
            bot.editMessageText(`❌ Error: ${errMsg}`, {
                chat_id: chatId,
                message_id: wait.message_id
            });
        }
    });

    // ═══════════════════════════════════════════════════════════════════════════════
    // /dnsdelete <subdomain> - Delete subdomain
    // ═══════════════════════════════════════════════════════════════════════════════
    bot.onText(/^\/dnsdelete\s+(\S+)$/i, async (msg, match) => {
        const chatId = msg.chat.id;
        const userId = msg.from.id.toString();

        if (!isOwner(userId)) {
            return bot.sendMessage(chatId, '❌ ᴋʜᴜꜱᴜꜱ ᴏᴡɴᴇʀ!');
        }

        const subdomain = match[1];
        const wait = await bot.sendMessage(chatId, `⏳ Finding ${subdomain}...`);

        try {
            // Find the record
            const result = await cfApi(`/dns_records?name=${subdomain}`);
            const records = result.result || [];

            if (records.length === 0) {
                return bot.editMessageText(`❌ Subdomain <code>${subdomain}</code> tidak ditemukan.`, {
                    chat_id: chatId,
                    message_id: wait.message_id,
                    parse_mode: 'HTML'
                });
            }

            // Delete record
            await cfApi(`/dns_records/${records[0].id}`, 'DELETE');

            bot.editMessageText(`✅ <b>Deleted!</b>\n\n🗑️ <code>${subdomain}</code>`, {
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
    // /dnsproxy <subdomain> <on/off> - Toggle proxy
    // ═══════════════════════════════════════════════════════════════════════════════
    bot.onText(/^\/dnsproxy\s+(\S+)\s+(on|off)$/i, async (msg, match) => {
        const chatId = msg.chat.id;
        const userId = msg.from.id.toString();

        if (!isOwner(userId)) {
            return bot.sendMessage(chatId, '❌ ᴋʜᴜꜱᴜꜱ ᴏᴡɴᴇʀ!');
        }

        const subdomain = match[1];
        const proxied = match[2].toLowerCase() === 'on';
        const wait = await bot.sendMessage(chatId, `⏳ Updating proxy...`);

        try {
            // Find the record
            const result = await cfApi(`/dns_records?name=${subdomain}`);
            const records = result.result || [];

            if (records.length === 0) {
                return bot.editMessageText(`❌ Subdomain tidak ditemukan.`, {
                    chat_id: chatId,
                    message_id: wait.message_id
                });
            }

            // Update proxy
            await cfApi(`/dns_records/${records[0].id}`, 'PATCH', { proxied });

            const status = proxied ? '🟠 ON' : '⚪ OFF';
            bot.editMessageText(`✅ <b>Proxy Updated!</b>\n\n🌐 <code>${subdomain}</code>\n☁️ Proxy: ${status}`, {
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
    // /dnssettings - DNS settings menu
    // ═══════════════════════════════════════════════════════════════════════════════
    bot.onText(/^\/dnssettings$/i, async (msg) => {
        const chatId = msg.chat.id;
        const userId = msg.from.id.toString();

        if (!isOwner(userId)) {
            return bot.sendMessage(chatId, '❌ ᴋʜᴜꜱᴜꜱ ᴏᴡɴᴇʀ!');
        }

        const dnsSettings = loadJsonData(DNS_SETTINGS_FILE);
        const creds = getCfCredentials();

        const text = `⚙️ <b>DNS SETTINGS</b>
<code>━━━━━━━━━━━━━━━━━━━━━━</code>

<b>🔧 Cloudflare Config:</b>
📍 Zone ID: <code>${creds.zoneId ? creds.zoneId.slice(0, 10) + '...' : 'Not set'}</code>
🔑 Token: <code>${creds.token ? '✅ Set' : '❌ Not set'}</code>

<b>⚙️ Check Settings:</b>
☁️ Auto Disable Proxy: ${dnsSettings.autoDisableProxy ? '✅ ON' : '❌ OFF'}
⏱️ Timeout: ${dnsSettings.checkTimeout}ms
⏳ Batch Delay: ${dnsSettings.batchDelay}ms

<b>Commands:</b>
• <code>/dnslist</code> - List records
• <code>/dnscheck</code> - Check dead
• <code>/dnsadd sub ip</code> - Add record
• <code>/dnsdelete sub</code> - Delete
• <code>/dnsproxy sub on/off</code> - Toggle proxy`;

        bot.sendMessage(chatId, text, {
            parse_mode: 'HTML',
            reply_markup: {
                inline_keyboard: [
                    [
                        { text: dnsSettings.autoDisableProxy ? '☁️ Auto-Off Proxy: ON' : '☁️ Auto-Off Proxy: OFF', callback_data: 'dns_toggle_autoproxy' }
                    ],
                    [
                        { text: '📋 List Records', callback_data: 'dns_refresh' },
                        { text: '🔍 Check Dead', callback_data: 'dns_checkdead' }
                    ]
                ]
            }
        });
    });

    // ═══════════════════════════════════════════════════════════════════════════════
    // Callback Handler
    // ═══════════════════════════════════════════════════════════════════════════════
    bot.on('callback_query', async (query) => {
        const data = query.data;
        const chatId = query.message.chat.id;
        const userId = query.from.id.toString();

        if (!data.startsWith('dns_')) return;

        if (!isOwner(userId)) {
            return bot.answerCallbackQuery(query.id, { text: '❌ Access denied', show_alert: true });
        }

        if (data === 'dnsmenu') {
            bot.emit('text', { ...query.message, from: query.from, text: '/dnssettings' });
        }

        bot.answerCallbackQuery(query.id, { text: '⏳ Processing...' });

        if (data === 'dns_refresh') {
            // Trigger /dnslist
            bot.emit('text', { ...query.message, from: query.from, text: '/dnslist' });
        }

        if (data === 'dns_checkdead') {
            bot.emit('text', { ...query.message, from: query.from, text: '/dnscheck' });
        }

        if (data === 'dns_toggle_autoproxy') {
            const dnsSettings = loadJsonData(DNS_SETTINGS_FILE);
            dnsSettings.autoDisableProxy = !dnsSettings.autoDisableProxy;
            saveJsonData(DNS_SETTINGS_FILE, dnsSettings);

            bot.sendMessage(chatId, `☁️ Auto-Disable Proxy: ${dnsSettings.autoDisableProxy ? '✅ ON' : '❌ OFF'}`);
        }

        if (data === 'dns_deleteall_dead') {
            bot.sendMessage(chatId, `⚠️ Untuk menghapus semua dead subdomains, jalankan:\n<code>/dnsclean confirm</code>`, { parse_mode: 'HTML' });
        }
    });

    // ═══════════════════════════════════════════════════════════════════════════════
    // /dnsclean confirm - Delete all dead subdomains
    // ═══════════════════════════════════════════════════════════════════════════════
    bot.onText(/^\/dnsclean\s+confirm$/i, async (msg) => {
        const chatId = msg.chat.id;
        const userId = msg.from.id.toString();

        if (!isOwner(userId)) {
            return bot.sendMessage(chatId, '❌ ᴋʜᴜꜱᴜꜱ ᴏᴡɴᴇʀ!');
        }

        const wait = await bot.sendMessage(chatId, '⏳ Checking and cleaning dead subdomains...');

        try {
            const result = await cfApi('/dns_records?type=A&per_page=100');
            const records = result.result || [];

            let deleted = 0;
            let failed = 0;

            for (const record of records) {
                const status = await checkSubdomainAlive(record.name);

                if (!status.alive) {
                    try {
                        await cfApi(`/dns_records/${record.id}`, 'DELETE');
                        deleted++;
                    } catch (e) {
                        failed++;
                    }
                }

                await new Promise(r => setTimeout(r, 500));
            }

            bot.editMessageText(`🧹 <b>DNS CLEANUP COMPLETE!</b>

✅ Deleted: ${deleted} records
❌ Failed: ${failed} records`, {
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

};
