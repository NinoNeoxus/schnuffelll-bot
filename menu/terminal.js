/**
 * ═══════════════════════════════════════════════════════════════════════════════════════
 *  🖥️ SCHNUFFELLL BOT - SSH TERMINAL v1.0
 *  Like Termius but via Telegram - For Developer Only
 *  
 *  Features:
 *  - /terminal - Start SSH session (asks IP, password)
 *  - /cmd <command> - Execute command
 *  - /logs - View pterodactyl logs (wings)
 *  - /yaml - View config.yml
 *  - /exit - Close session
 *  
 *  @author @schnuffelll
 *  @version 1.0
 * ═══════════════════════════════════════════════════════════════════════════════════════
 */

const { Client } = require('ssh2');
const settings = require('../config.js');

module.exports = (bot) => {
    // Developer ID - Only this user can access terminal
    const DEV_ID = 1126396317;

    // Active SSH sessions per chat
    const activeSessions = new Map();

    console.log('[TERMINAL] 🖥️ SSH Terminal Module v1.0 loaded');

    // ═══════════════════════════════════════════════════════════════════════════════
    // HELPER FUNCTIONS
    // ═══════════════════════════════════════════════════════════════════════════════

    function isDev(userId) {
        return parseInt(userId) === DEV_ID;
    }

    function getSession(chatId) {
        return activeSessions.get(chatId);
    }

    function setSession(chatId, session) {
        activeSessions.set(chatId, session);
    }

    function clearSession(chatId) {
        const session = activeSessions.get(chatId);
        if (session && session.conn) {
            try { session.conn.end(); } catch (e) { }
        }
        activeSessions.delete(chatId);
    }

    // Execute SSH command and return output
    function execSSH(conn, command, timeout = 30000) {
        return new Promise((resolve, reject) => {
            const timer = setTimeout(() => {
                reject(new Error('Command timeout'));
            }, timeout);

            conn.exec(command, (err, stream) => {
                if (err) {
                    clearTimeout(timer);
                    return reject(err);
                }

                let stdout = '';
                let stderr = '';

                stream.on('data', (data) => {
                    stdout += data.toString();
                });

                stream.stderr.on('data', (data) => {
                    stderr += data.toString();
                });

                stream.on('close', (code) => {
                    clearTimeout(timer);
                    resolve({ stdout, stderr, code });
                });
            });
        });
    }

    // Format output for Telegram (with code block)
    function formatOutput(output, maxLen = 4000) {
        if (!output || output.trim() === '') {
            return '<i>No output</i>';
        }

        let text = output.trim();
        if (text.length > maxLen) {
            text = text.substring(0, maxLen) + '\n... (truncated)';
        }

        // Escape HTML
        text = text
            .replace(/&/g, '&amp;')
            .replace(/</g, '&lt;')
            .replace(/>/g, '&gt;');

        return `<pre>${text}</pre>`;
    }

    // ═══════════════════════════════════════════════════════════════════════════════
    // /terminal - Start SSH session
    // ═══════════════════════════════════════════════════════════════════════════════
    bot.onText(/^\/terminal$/i, async (msg) => {
        const chatId = msg.chat.id;
        const userId = msg.from.id;

        if (!isDev(userId)) {
            return bot.sendMessage(chatId, '❌ Developer only command.');
        }

        // Clear any existing session
        clearSession(chatId);

        // Start new session wizard
        setSession(chatId, { step: 'ip', data: {} });

        bot.sendMessage(chatId, `🖥️ <b>SSH TERMINAL</b>

<blockquote>Mode: Interactive SSH Session
Like Termius, but via Telegram!</blockquote>

📍 <b>Masukkan IP VPS:</b>`, { parse_mode: 'HTML' });
    });

    // ═══════════════════════════════════════════════════════════════════════════════
    // /terminal <ip>,<password> - Quick connect
    // ═══════════════════════════════════════════════════════════════════════════════
    bot.onText(/^\/terminal\s+(.+),(.+)$/i, async (msg, match) => {
        const chatId = msg.chat.id;
        const userId = msg.from.id;

        if (!isDev(userId)) {
            return bot.sendMessage(chatId, '❌ Developer only command.');
        }

        const ip = match[1].trim();
        const password = match[2].trim();

        await connectSSH(chatId, ip, password, msg);
    });

    // ═══════════════════════════════════════════════════════════════════════════════
    // Handle session wizard (IP -> Password -> Connect)
    // ═══════════════════════════════════════════════════════════════════════════════
    bot.on('message', async (msg) => {
        const chatId = msg.chat.id;
        const userId = msg.from.id;
        const text = msg.text || '';

        if (!isDev(userId)) return;
        if (text.startsWith('/')) return;

        const session = getSession(chatId);
        if (!session) return;

        if (session.step === 'ip') {
            session.data.ip = text.trim();
            session.step = 'password';
            setSession(chatId, session);

            return bot.sendMessage(chatId, `📍 IP: <code>${session.data.ip}</code>

🔑 <b>Masukkan Password root:</b>`, { parse_mode: 'HTML' });
        }

        if (session.step === 'password') {
            session.data.password = text.trim();

            // Delete password message for security
            try { await bot.deleteMessage(chatId, msg.message_id); } catch (e) { }

            await connectSSH(chatId, session.data.ip, session.data.password, msg);
        }
    });

    // ═══════════════════════════════════════════════════════════════════════════════
    // Connect to SSH
    // ═══════════════════════════════════════════════════════════════════════════════
    async function connectSSH(chatId, ip, password, msg) {
        const wait = await bot.sendMessage(chatId, `⏳ Connecting to <code>${ip}</code>...`, { parse_mode: 'HTML' });

        const conn = new Client();

        conn.on('ready', async () => {
            console.log(`[TERMINAL] Connected to ${ip}`);

            // Get hostname
            try {
                const result = await execSSH(conn, 'hostname');
                const hostname = result.stdout.trim();

                setSession(chatId, {
                    step: 'connected',
                    data: { ip, password },
                    conn,
                    hostname
                });

                bot.editMessageText(`✅ <b>SSH Connected!</b>

🖥️ Host: <code>${hostname}</code>
📍 IP: <code>${ip}</code>

<b>Commands:</b>
• <code>/cmd [command]</code> - Execute command
• <code>/logs</code> - View Wings logs
• <code>/yaml</code> - View Wings config.yml
• <code>/exit</code> - Close session

<i>Session active. Send commands!</i>`, {
                    chat_id: chatId,
                    message_id: wait.message_id,
                    parse_mode: 'HTML'
                });

            } catch (e) {
                setSession(chatId, { step: 'connected', data: { ip, password }, conn, hostname: 'unknown' });
                bot.editMessageText(`✅ Connected to <code>${ip}</code>\n\nUse /cmd [command] to execute commands.`, {
                    chat_id: chatId,
                    message_id: wait.message_id,
                    parse_mode: 'HTML'
                });
            }
        });

        conn.on('error', (err) => {
            console.error(`[TERMINAL] Connection error:`, err.message);
            clearSession(chatId);
            bot.editMessageText(`❌ <b>Connection Failed!</b>

<code>${err.message}</code>

<b>Possible causes:</b>
• Wrong IP address
• Wrong password
• Port 22 blocked
• VPS is down`, {
                chat_id: chatId,
                message_id: wait.message_id,
                parse_mode: 'HTML'
            });
        });

        conn.on('close', () => {
            console.log(`[TERMINAL] Connection closed for ${ip}`);
        });

        conn.connect({
            host: ip,
            port: 22,
            username: 'root',
            password: password,
            readyTimeout: 15000
        });
    }

    // ═══════════════════════════════════════════════════════════════════════════════
    // /cmd <command> - Execute command
    // ═══════════════════════════════════════════════════════════════════════════════
    bot.onText(/^\/cmd\s+(.+)$/is, async (msg, match) => {
        const chatId = msg.chat.id;
        const userId = msg.from.id;
        const command = match[1].trim();

        if (!isDev(userId)) {
            return bot.sendMessage(chatId, '❌ Developer only command.');
        }

        const session = getSession(chatId);
        if (!session || !session.conn) {
            return bot.sendMessage(chatId, '❌ No active SSH session. Use /terminal first.');
        }

        const wait = await bot.sendMessage(chatId, `⏳ Executing: <code>${command}</code>`, { parse_mode: 'HTML' });

        try {
            const result = await execSSH(session.conn, command);

            let output = result.stdout || result.stderr || 'No output';

            bot.editMessageText(`💻 <b>Command:</b> <code>${command}</code>

${formatOutput(output)}

<i>Exit code: ${result.code}</i>`, {
                chat_id: chatId,
                message_id: wait.message_id,
                parse_mode: 'HTML'
            });

        } catch (e) {
            bot.editMessageText(`❌ Error: ${e.message}`, {
                chat_id: chatId,
                message_id: wait.message_id
            });
        }
    });

    // ═══════════════════════════════════════════════════════════════════════════════
    // /logs - View Wings/Panel logs
    // ═══════════════════════════════════════════════════════════════════════════════
    bot.onText(/^\/logs(?:\s+(\d+))?$/i, async (msg, match) => {
        const chatId = msg.chat.id;
        const userId = msg.from.id;
        const lines = match[1] ? parseInt(match[1]) : 50;

        if (!isDev(userId)) {
            return bot.sendMessage(chatId, '❌ Developer only command.');
        }

        const session = getSession(chatId);
        if (!session || !session.conn) {
            return bot.sendMessage(chatId, '❌ No active SSH session. Use /terminal first.');
        }

        const wait = await bot.sendMessage(chatId, `⏳ Fetching logs (last ${lines} lines)...`);

        try {
            // Try Wings logs first, then Panel logs
            const commands = [
                `journalctl -u wings --no-pager -n ${lines} 2>/dev/null || tail -n ${lines} /var/log/pterodactyl/wings.log 2>/dev/null`,
                `tail -n ${lines} /var/www/pterodactyl/storage/logs/laravel-$(date +%Y-%m-%d).log 2>/dev/null`
            ];

            let output = '';

            for (const cmd of commands) {
                const result = await execSSH(session.conn, cmd);
                if (result.stdout && result.stdout.trim()) {
                    output += result.stdout;
                    break;
                }
            }

            if (!output.trim()) {
                output = 'No logs found or log files are empty.';
            }

            bot.editMessageText(`📋 <b>LOGS (last ${lines} lines)</b>

${formatOutput(output, 3500)}`, {
                chat_id: chatId,
                message_id: wait.message_id,
                parse_mode: 'HTML'
            });

        } catch (e) {
            bot.editMessageText(`❌ Error: ${e.message}`, {
                chat_id: chatId,
                message_id: wait.message_id
            });
        }
    });

    // ═══════════════════════════════════════════════════════════════════════════════
    // /yaml - View Wings config.yml
    // ═══════════════════════════════════════════════════════════════════════════════
    bot.onText(/^\/yaml$/i, async (msg) => {
        const chatId = msg.chat.id;
        const userId = msg.from.id;

        if (!isDev(userId)) {
            return bot.sendMessage(chatId, '❌ Developer only command.');
        }

        const session = getSession(chatId);
        if (!session || !session.conn) {
            return bot.sendMessage(chatId, '❌ No active SSH session. Use /terminal first.');
        }

        const wait = await bot.sendMessage(chatId, `⏳ Fetching config.yml...`);

        try {
            const result = await execSSH(session.conn, 'cat /etc/pterodactyl/config.yml 2>/dev/null || cat /etc/wings/config.yml 2>/dev/null');

            if (!result.stdout.trim()) {
                return bot.editMessageText(`❌ config.yml not found at /etc/pterodactyl/ or /etc/wings/`, {
                    chat_id: chatId,
                    message_id: wait.message_id
                });
            }

            bot.editMessageText(`📄 <b>WINGS CONFIG.YML</b>

${formatOutput(result.stdout, 3500)}`, {
                chat_id: chatId,
                message_id: wait.message_id,
                parse_mode: 'HTML'
            });

        } catch (e) {
            bot.editMessageText(`❌ Error: ${e.message}`, {
                chat_id: chatId,
                message_id: wait.message_id
            });
        }
    });

    // ═══════════════════════════════════════════════════════════════════════════════
    // /status - Quick VPS status
    // ═══════════════════════════════════════════════════════════════════════════════
    bot.onText(/^\/status$/i, async (msg) => {
        const chatId = msg.chat.id;
        const userId = msg.from.id;

        if (!isDev(userId)) {
            return bot.sendMessage(chatId, '❌ Developer only command.');
        }

        const session = getSession(chatId);
        if (!session || !session.conn) {
            return bot.sendMessage(chatId, '❌ No active SSH session. Use /terminal first.');
        }

        const wait = await bot.sendMessage(chatId, `⏳ Getting VPS status...`);

        try {
            const commands = {
                uptime: 'uptime -p',
                cpu: "top -bn1 | grep 'Cpu(s)' | awk '{print $2}'",
                mem: "free -m | awk 'NR==2{printf \"%s/%sMB (%.1f%%)\", $3,$2,$3*100/$2}'",
                disk: "df -h / | awk 'NR==2{print $3\"/\"$2\" (\"$5\")\"}'",
                wingsStatus: 'systemctl is-active wings 2>/dev/null || echo "not installed"',
                panelCheck: 'test -d /var/www/pterodactyl && echo "installed" || echo "not found"'
            };

            const results = {};
            for (const [key, cmd] of Object.entries(commands)) {
                try {
                    const r = await execSSH(session.conn, cmd, 5000);
                    results[key] = r.stdout.trim() || 'N/A';
                } catch (e) {
                    results[key] = 'Error';
                }
            }

            const wingsEmoji = results.wingsStatus === 'active' ? '🟢' : '🔴';
            const panelEmoji = results.panelCheck === 'installed' ? '🟢' : '🔴';

            bot.editMessageText(`📊 <b>VPS STATUS</b>

<blockquote>
🖥️ <b>Host:</b> ${session.hostname || session.data.ip}
⏱️ <b>Uptime:</b> ${results.uptime}

💻 <b>CPU:</b> ${results.cpu}%
💾 <b>RAM:</b> ${results.mem}
💿 <b>Disk:</b> ${results.disk}

${wingsEmoji} <b>Wings:</b> ${results.wingsStatus}
${panelEmoji} <b>Panel:</b> ${results.panelCheck}
</blockquote>`, {
                chat_id: chatId,
                message_id: wait.message_id,
                parse_mode: 'HTML'
            });

        } catch (e) {
            bot.editMessageText(`❌ Error: ${e.message}`, {
                chat_id: chatId,
                message_id: wait.message_id
            });
        }
    });

    // ═══════════════════════════════════════════════════════════════════════════════
    // /exit - Close SSH session
    // ═══════════════════════════════════════════════════════════════════════════════
    bot.onText(/^\/exit$/i, async (msg) => {
        const chatId = msg.chat.id;
        const userId = msg.from.id;

        if (!isDev(userId)) return;

        const session = getSession(chatId);
        if (session) {
            const ip = session.data?.ip || 'unknown';
            clearSession(chatId);
            bot.sendMessage(chatId, `👋 SSH session closed.\n\n📍 Disconnected from: <code>${ip}</code>`, { parse_mode: 'HTML' });
        } else {
            bot.sendMessage(chatId, '❌ No active SSH session.');
        }
    });

    // ═══════════════════════════════════════════════════════════════════════════════
    // /sessions - List active sessions (for debugging)
    // ═══════════════════════════════════════════════════════════════════════════════
    bot.onText(/^\/sessions$/i, async (msg) => {
        const chatId = msg.chat.id;
        const userId = msg.from.id;

        if (!isDev(userId)) return;

        if (activeSessions.size === 0) {
            return bot.sendMessage(chatId, '📭 No active SSH sessions.');
        }

        let text = '📋 <b>Active SSH Sessions:</b>\n\n';
        for (const [cid, session] of activeSessions) {
            text += `• Chat: ${cid}\n  IP: ${session.data?.ip || 'N/A'}\n  Step: ${session.step}\n\n`;
        }

        bot.sendMessage(chatId, text, { parse_mode: 'HTML' });
    });

};
