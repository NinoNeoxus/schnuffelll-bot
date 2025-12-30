/**
 * CPU Monitoring Module for Pterodactyl Panel
 * Auto-stop server jika CPU melebihi batas dalam kurun waktu tertentu
 * 
 * @author @schnuffelll
 */

const axios = require('axios');
const fs = require('fs');

const settings = require('../config.js');
const { loadJsonData, saveJsonData } = require('../lib/function');

const CPU_MONITOR_FILE = './db/cpu_monitor_settings.json';
const PANEL_SETTINGS_FILE = './db/panel_settings.json';

// Tracking CPU violations per server
const cpuViolations = new Map();

// Monitoring interval reference
let monitorInterval = null;

module.exports = (bot) => {

    // Helper: Load CPU monitor settings
    function loadCpuSettings() {
        try {
            if (fs.existsSync(CPU_MONITOR_FILE)) {
                return JSON.parse(fs.readFileSync(CPU_MONITOR_FILE, 'utf8'));
            }
        } catch (e) {
            console.error('Error loading CPU settings:', e);
        }
        return {
            enabled: false,
            cpuLimit: 100,
            duration: 30,
            checkInterval: 300000,
            notifyGroupId: settings.exGroupId || '',
            activePanel: 'V1'
        };
    }

    // Helper: Save CPU monitor settings
    function saveCpuSettings(data) {
        try {
            fs.writeFileSync(CPU_MONITOR_FILE, JSON.stringify(data, null, 2));
            return true;
        } catch (e) {
            console.error('Error saving CPU settings:', e);
            return false;
        }
    }

    // Helper: Get panel credentials based on version
    function getPanelCredentials(version = 'V1') {
        const panelSettings = loadJsonData(PANEL_SETTINGS_FILE) || {};

        switch (version) {
            case 'V2':
                return { domain: panelSettings.domainV2, pltc: panelSettings.pltcV2, plta: panelSettings.pltaV2 };
            case 'V3':
                return { domain: panelSettings.domainV3, pltc: panelSettings.pltcV3, plta: panelSettings.pltaV3 };
            case 'V4':
                return { domain: panelSettings.domainV4, pltc: panelSettings.pltcV4, plta: panelSettings.pltaV4 };
            case 'V5':
                return { domain: panelSettings.domainV5, pltc: panelSettings.pltcV5, plta: panelSettings.pltaV5 };
            default:
                return { domain: panelSettings.domain, pltc: panelSettings.pltc, plta: panelSettings.plta };
        }
    }

    // Get all servers from panel (USING APPLICATION API - PLTA)
    async function getAllServers(domain, plta) {
        if (!plta || plta === '-') {
            console.log('[CPU Monitor] Missing PLTA (Application Key) - Cannot list all servers!');
            return [];
        }

        try {
            // Need to handle pagination
            let allServers = [];
            let page = 1;
            let totalPages = 1;

            console.log(`[CPU Monitor] Fetching server list from ${domain} via Application API...`);

            do {
                const response = await axios.get(`${domain}/api/application/servers?page=${page}`, {
                    headers: {
                        'Authorization': `Bearer ${plta}`,
                        'Accept': 'application/json',
                        'Content-Type': 'application/json'
                    }
                });

                const data = response.data;
                allServers = allServers.concat(data.data);
                totalPages = data.meta.pagination.total_pages;
                page++;

            } while (page <= totalPages);

            console.log(`[CPU Monitor] Found ${allServers.length} total servers on panel.`);
            return allServers;
        } catch (err) {
            console.error('[CPU Monitor] Error getting server list:', err.response?.status, err.message);
            // Fallback: If 403, maybe PLTA is invalid.
            return [];
        }
    }

    // Get server resources (CPU, RAM, etc) (USING CLIENT API - PLTC)
    async function getServerResources(domain, pltc, serverId) {
        try {
            const response = await axios.get(`${domain}/api/client/servers/${serverId}/resources`, {
                headers: {
                    'Authorization': `Bearer ${pltc}`,
                    'Accept': 'application/json',
                    'Content-Type': 'application/json'
                }
            });
            return response.data.attributes || null;
        } catch (err) {
            // If 403/404, we don't have access to this server
            // console.error(`Debug access error for ${serverId}:`, err.response?.status);
            return null;
        }
    }

    // Stop a server
    async function stopServer(domain, pltc, serverId) {
        try {
            await axios.post(`${domain}/api/client/servers/${serverId}/power`,
                { signal: 'stop' },
                {
                    headers: {
                        'Authorization': `Bearer ${pltc}`,
                        'Accept': 'application/json',
                        'Content-Type': 'application/json'
                    }
                }
            );
            return true;
        } catch (err) {
            console.error(`Error stopping server ${serverId}:`, err.message);
            return false;
        }
    }

    // Send alert to group
    async function sendAlert(cpuSettings, serverInfo, cpuUsage, duration) {
        const alertText = `
⚠️ <b>CPU OVERLOAD DETECTED!</b>

<blockquote>
📛 Server: <b>${serverInfo.name || 'Unknown'}</b>
🆔 Server ID: <code>${serverInfo.identifier || serverInfo.uuid}</code>
👤 Owner: ${serverInfo.user || 'Unknown'}

📊 CPU Usage: <b>${cpuUsage.toFixed(1)}%</b>
⏱️ Duration: <b>${duration} detik</b>
⚙️ Limit: ${cpuSettings.cpuLimit}%
</blockquote>

🛑 <b>Server telah di-STOP otomatis!</b>

<i>Gunakan /cpumon status untuk cek monitoring</i>
`;

        try {
            if (cpuSettings.notifyGroupId) {
                await bot.sendMessage(cpuSettings.notifyGroupId, alertText, { parse_mode: 'HTML' });
            }
        } catch (err) {
            console.error('Error sending alert:', err.message);
        }
    }

    // Main monitoring function
    async function runMonitoring() {
        const cpuSettings = loadCpuSettings();

        if (!cpuSettings.enabled) {
            console.log('[CPU Monitor] Monitoring disabled');
            return;
        }

        const credentials = getPanelCredentials(cpuSettings.activePanel);

        if (!credentials.domain || !credentials.plta) {
            console.log('[CPU Monitor] Config incomplete. PLTA (App Key) required to list servers.');
            return;
        }

        console.log(`[CPU Monitor] Checking servers on ${cpuSettings.activePanel}...`);

        // Use PLTA (App Key) to list ALL servers
        const servers = await getAllServers(credentials.domain, credentials.plta);

        if (servers.length === 0) {
            console.log('[CPU Monitor] No servers found or Access Denied.');
            return;
        }

        let accessDeniedCount = 0;
        let checkedCount = 0;

        for (const server of servers) {
            const serverAttrs = server.attributes;
            const serverId = serverAttrs.identifier; // Short UUID for Client API

            // Note: Application API returns 'identifier' as the short UUID used for Client API

            // Try to get resources using Client Key (PLTC)
            const resources = await getServerResources(credentials.domain, credentials.pltc, serverId);

            if (!resources) {
                accessDeniedCount++;
                continue;
            }

            checkedCount++;
            const cpuUsage = resources.resources.cpu_absolute || 0;
            const serverName = serverAttrs.name;

            // console.log(`[CPU Monitor] ${serverName}: ${cpuUsage.toFixed(1)}% CPU`);

            // Check if CPU exceeds limit
            if (cpuUsage > cpuSettings.cpuLimit) {
                // Track violation
                if (!cpuViolations.has(serverId)) {
                    cpuViolations.set(serverId, {
                        startTime: Date.now(),
                        serverInfo: {
                            name: serverName,
                            identifier: serverId,
                            uuid: serverAttrs.uuid,
                            user: serverAttrs.user // Int ID
                        }
                    });
                    console.log(`[CPU Monitor] ${serverName} started exceeding limit (${cpuUsage.toFixed(1)}%)`);
                } else {
                    const violation = cpuViolations.get(serverId);
                    const durationSeconds = Math.floor((Date.now() - violation.startTime) / 1000);

                    console.log(`[CPU Monitor] ${serverName} exceeding limit for ${durationSeconds}s (${cpuUsage.toFixed(1)}%)`);

                    // Check if duration exceeded
                    if (durationSeconds >= cpuSettings.duration) {
                        console.log(`[CPU Monitor] STOPPING ${serverName} - exceeded limit`);

                        // Stop the server
                        const stopped = await stopServer(credentials.domain, credentials.pltc, serverId);

                        if (stopped) {
                            await sendAlert(cpuSettings, violation.serverInfo, cpuUsage, durationSeconds);
                            cpuViolations.delete(serverId);
                        }
                    }
                }
            } else {
                if (cpuViolations.has(serverId)) {
                    cpuViolations.delete(serverId);
                }
            }
        }

        // REPORTING FEATURE (Updated)
        if (cpuSettings.notifyGroupId) {
            const activeViolations = cpuViolations.size;

            // Only report "Clean" if no violations AND we actually checked something
            if (activeViolations === 0) {
                const reportMsg = `
✅ <b>CPU MONITOR STATUS: AMAN</b>
    
🕒 Waktu: <b>${new Date().toLocaleTimeString('id-ID')}</b>
🖥️ Server Found: <b>${servers.length}</b>
✅ Access OK: <b>${checkedCount}</b>
🚫 Access Denied: <b>${accessDeniedCount}</b>
⚙️ Limit: <b>${cpuSettings.cpuLimit}%</b>
    
<i>Tidak ada server overload.</i>
`;
                try {
                    await bot.sendMessage(cpuSettings.notifyGroupId, reportMsg, { parse_mode: 'HTML' });
                } catch (e) { console.error('[CPU Monitor] Failed to send report:', e.message); }
            }
        }
    }

    // Start monitoring
    function startMonitoring() {
        const cpuSettings = loadCpuSettings();

        if (monitorInterval) {
            clearInterval(monitorInterval);
        }

        cpuSettings.enabled = true;
        saveCpuSettings(cpuSettings);

        // Run immediately
        runMonitoring();

        // Then run periodically
        monitorInterval = setInterval(runMonitoring, cpuSettings.checkInterval);

        console.log(`[CPU Monitor] Started with interval ${cpuSettings.checkInterval}ms`);
        return true;
    }

    // Stop monitoring
    function stopMonitoring() {
        const cpuSettings = loadCpuSettings();

        if (monitorInterval) {
            clearInterval(monitorInterval);
            monitorInterval = null;
        }

        cpuSettings.enabled = false;
        saveCpuSettings(cpuSettings);
        cpuViolations.clear();

        console.log('[CPU Monitor] Stopped');
        return true;
    }

    // =================================================================
    // BOT COMMANDS
    // =================================================================

    // /cpumon - Main command
    bot.onText(/^\/cpumon(?:\s+(.+))?$/i, async (msg, match) => {
        const chatId = msg.chat.id;
        const userId = msg.from.id;
        const subCommand = match[1] ? match[1].trim().toLowerCase() : '';

        // Owner only
        if (userId !== settings.ownerId) {
            return bot.sendMessage(chatId, '❌ ᴋʜᴜꜱᴜꜱ ᴏᴡɴᴇʀ!');
        }

        const cpuSettings = loadCpuSettings();

        // No subcommand - show help
        if (!subCommand) {
            return bot.sendMessage(chatId, `
📊 <b>CPU MONITORING PANEL</b>

<b>Status:</b> ${cpuSettings.enabled ? '🟢 AKTIF' : '🔴 NONAKTIF'}
<b>Panel:</b> ${cpuSettings.activePanel}
<b>CPU Limit:</b> ${cpuSettings.cpuLimit}%
<b>Duration:</b> ${cpuSettings.duration} detik
<b>Check Interval:</b> ${cpuSettings.checkInterval / 1000} detik
<b>Notify Group:</b> <code>${cpuSettings.notifyGroupId || 'Belum diset'}</code>

<b>Commands:</b>
• <code>/cpumon start</code> - Mulai monitoring
• <code>/cpumon stop</code> - Stop monitoring
• <code>/cpumon status</code> - Lihat status
• <code>/cpumon set limit [value]</code> - Set CPU limit
• <code>/cpumon set duration [value]</code> - Set duration (detik)
• <code>/cpumon set interval [value]</code> - Set check interval (detik)
• <code>/cpumon set group [id]</code> - Set notify group
• <code>/cpumon set panel [V1-V5]</code> - Set active panel
`, { parse_mode: 'HTML', reply_to_message_id: msg.message_id });
        }

        // /cpumon start
        if (subCommand === 'start') {
            const credentials = getPanelCredentials(cpuSettings.activePanel);

            if (!credentials.domain || !credentials.pltc || credentials.pltc === '-') {
                return bot.sendMessage(chatId, `❌ Panel ${cpuSettings.activePanel} belum dikonfigurasi!
        
Gunakan /seturl, /setpltc, /setplta untuk setup panel dulu.
(Pastikan juga PLTA/Application Key sudah diset)`, { parse_mode: 'HTML' });
            }

            startMonitoring();
            return bot.sendMessage(chatId, `✅ <b>CPU Monitoring STARTED!</b>

Panel: <b>${cpuSettings.activePanel}</b>
CPU Limit: <b>${cpuSettings.cpuLimit}%</b>
Duration: <b>${cpuSettings.duration} detik</b>
Check setiap: <b>${cpuSettings.checkInterval / 1000} detik</b>

Bot akan auto-stop server yang melebihi batas!`, { parse_mode: 'HTML', reply_to_message_id: msg.message_id });
        }

        // /cpumon stop
        if (subCommand === 'stop') {
            stopMonitoring();
            return bot.sendMessage(chatId, `🛑 <b>CPU Monitoring STOPPED!</b>

Monitoring sudah dinonaktifkan.`, { parse_mode: 'HTML', reply_to_message_id: msg.message_id });
        }

        // /cpumon status
        if (subCommand === 'status') {
            const violations = [];
            cpuViolations.forEach((v, id) => {
                const duration = Math.floor((Date.now() - v.startTime) / 1000);
                violations.push(`• ${v.serverInfo.name}: ${duration}s`);
            });

            return bot.sendMessage(chatId, `
📊 <b>CPU MONITORING STATUS</b>

<b>Status:</b> ${cpuSettings.enabled ? '🟢 AKTIF' : '🔴 NONAKTIF'}
<b>Panel:</b> ${cpuSettings.activePanel}
<b>Active Violations:</b> ${cpuViolations.size}
${violations.length > 0 ? '\n' + violations.join('\n') : ''}
`, { parse_mode: 'HTML', reply_to_message_id: msg.message_id });
        }

        // /cpumon set [option] [value]
        if (subCommand.startsWith('set ')) {
            const parts = subCommand.split(' ').slice(1);
            const option = parts[0];
            const value = parts.slice(1).join(' ');

            if (!option || !value) {
                return bot.sendMessage(chatId, '❌ Format: /cpumon set [option] [value]');
            }

            switch (option) {
                case 'limit':
                    const limit = parseInt(value);
                    if (isNaN(limit) || limit < 1 || limit > 500) {
                        return bot.sendMessage(chatId, '❌ Limit harus angka antara 1-500');
                    }
                    cpuSettings.cpuLimit = limit;
                    saveCpuSettings(cpuSettings);
                    return bot.sendMessage(chatId, `✅ CPU Limit diset ke <b>${limit}%</b>`, { parse_mode: 'HTML' });

                case 'duration':
                    const duration = parseInt(value);
                    if (isNaN(duration) || duration < 5 || duration > 600) {
                        return bot.sendMessage(chatId, '❌ Duration harus angka antara 5-600 detik');
                    }
                    cpuSettings.duration = duration;
                    saveCpuSettings(cpuSettings);
                    return bot.sendMessage(chatId, `✅ Duration diset ke <b>${duration} detik</b>`, { parse_mode: 'HTML' });

                case 'interval':
                    const interval = parseInt(value);
                    if (isNaN(interval) || interval < 10 || interval > 3600) {
                        return bot.sendMessage(chatId, '❌ Interval harus angka antara 10-3600 detik');
                    }
                    cpuSettings.checkInterval = interval * 1000;
                    saveCpuSettings(cpuSettings);

                    // Restart monitoring if active
                    if (cpuSettings.enabled) {
                        stopMonitoring();
                        startMonitoring();
                    }
                    return bot.sendMessage(chatId, `✅ Check Interval diset ke <b>${interval} detik</b>`, { parse_mode: 'HTML' });

                case 'group':
                    cpuSettings.notifyGroupId = value;
                    saveCpuSettings(cpuSettings);
                    return bot.sendMessage(chatId, `✅ Notify Group diset ke <code>${value}</code>`, { parse_mode: 'HTML' });

                case 'panel':
                    const validPanels = ['V1', 'V2', 'V3', 'V4', 'V5'];
                    if (!validPanels.includes(value.toUpperCase())) {
                        return bot.sendMessage(chatId, '❌ Panel harus V1, V2, V3, V4, atau V5');
                    }
                    cpuSettings.activePanel = value.toUpperCase();
                    saveCpuSettings(cpuSettings);
                    return bot.sendMessage(chatId, `✅ Active Panel diset ke <b>${value.toUpperCase()}</b>`, { parse_mode: 'HTML' });

                default:
                    return bot.sendMessage(chatId, '❌ Option tidak valid! Gunakan: limit, duration, interval, group, panel');
            }
        }

        // Unknown subcommand
        return bot.sendMessage(chatId, '❌ Subcommand tidak dikenal. Ketik /cpumon untuk bantuan.');
    });

    // Auto-start monitoring if was enabled before restart
    const cpuSettings = loadCpuSettings();
    if (cpuSettings.enabled) {
        console.log('[CPU Monitor] Auto-starting from previous session...');
        setTimeout(() => {
            startMonitoring();
        }, 5000); // Delay 5 seconds to let bot fully initialize
    }

};
