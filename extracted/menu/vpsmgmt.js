/**
 * ═══════════════════════════════════════════════════════════════════════════════════════
 *  ☁️ SCHNUFFELLL BOT - VPS & DIGITALOCEAN MANAGEMENT v8.0
 *  Comprehensive VPS and DigitalOcean management commands
 *  
 *  VPS Commands:
 *  /vpslist         - List semua VPS tersimpan
 *  /vpsadd          - Tambah VPS baru
 *  /vpsremove       - Hapus VPS
 *  /vpsinfo <ip>    - Info VPS
 *  /vpsexec <ip>    - Execute command di VPS
 *  /vpsreboot <ip>  - Reboot VPS
 *  
 *  DigitalOcean Commands:
 *  /dolist          - List droplets
 *  /docreate        - Create droplet
 *  /doreboot <id>   - Reboot droplet
 *  /dobalance       - Account balance
 *  /doregions       - List regions
 *  /dosizes         - List sizes
 *  
 *  @author @schnuffelll
 *  @version 8.0
 * ═══════════════════════════════════════════════════════════════════════════════════════
 */

const axios = require('axios');
const fs = require('fs');
const { Client } = require('ssh2');
const { loadJsonData, saveJsonData } = require('../lib/function');

const settings = require('../config.js');

module.exports = (bot) => {

    console.log('[VPS] ☁️ VPS & DigitalOcean Management Module v8.0 loaded');

    const OWNER_FILE = './db/users/adminID.json';
    const VPS_FILE = './db/vps_list.json';
    const DO_TOKENS_FILE = './db/do_tokens.json';

    // Helper: Check if user is owner
    function isOwner(userId) {
        const owners = loadJsonData(OWNER_FILE);
        return owners.includes(String(userId));
    }

    // Helper: Get DO token
    function getDoToken() {
        const tokens = loadJsonData(DO_TOKENS_FILE);
        if (tokens && tokens.length > 0) {
            const active = tokens.find(t => t.active);
            return active ? active.token : tokens[0].token;
        }
        return settings.apiDigitalOcean || null;
    }

    // Helper: DigitalOcean API request
    async function doApi(endpoint, method = 'GET', data = null) {
        const token = getDoToken();
        if (!token) throw new Error('Token DigitalOcean tidak ditemukan!');

        const url = `https://api.digitalocean.com/v2${endpoint}`;
        const headers = {
            'Authorization': `Bearer ${token}`,
            'Content-Type': 'application/json'
        };

        const response = await axios({ method, url, headers, data, timeout: 30000 });
        return response.data;
    }

    // ═══════════════════════════════════════════════════════════════════════════════
    // VPS MANAGEMENT
    // ═══════════════════════════════════════════════════════════════════════════════

    // /vpslist - List semua VPS tersimpan
    bot.onText(/^\/vpslist$/i, async (msg) => {
        const chatId = msg.chat.id;
        const userId = msg.from.id.toString();

        if (!isOwner(userId)) {
            return bot.sendMessage(chatId, '❌ ᴋʜᴜꜱᴜꜱ ᴏᴡɴᴇʀ!');
        }

        const vpsList = loadJsonData(VPS_FILE) || [];

        if (vpsList.length === 0) {
            return bot.sendMessage(chatId, '📋 Tidak ada VPS tersimpan.\n\nGunakan /vpsadd untuk menambah.');
        }

        let text = `☁️ <b>DAFTAR VPS</b> (${vpsList.length})\n<code>━━━━━━━━━━━━━━━━━━━━━━</code>\n\n`;

        vpsList.forEach((vps, i) => {
            text += `${i + 1}. 🖥️ <b>${vps.name || 'VPS'}</b>\n`;
            text += `   📍 IP: <code>${vps.ip}</code>\n`;
            text += `   💾 RAM: ${vps.ram || '-'}\n\n`;
        });

        text += `\n<i>Gunakan /vpsinfo &lt;ip&gt; untuk detail</i>`;

        bot.sendMessage(chatId, text, { parse_mode: 'HTML' });
    });

    // /vpsadd <name>,<ip>,<password> - Tambah VPS
    bot.onText(/^\/vpsadd\s+(.+)$/i, async (msg, match) => {
        const chatId = msg.chat.id;
        const userId = msg.from.id.toString();

        if (!isOwner(userId)) {
            return bot.sendMessage(chatId, '❌ ᴋʜᴜꜱᴜꜱ ᴏᴡɴᴇʀ!');
        }

        const parts = match[1].split(/[|,]/).map(x => x.trim());
        if (parts.length < 3) {
            return bot.sendMessage(chatId, '❌ Format: /vpsadd nama,ip,password');
        }

        const [name, ip, password] = parts;

        let vpsList = loadJsonData(VPS_FILE) || [];

        // Check if IP already exists
        if (vpsList.some(v => v.ip === ip)) {
            return bot.sendMessage(chatId, `⚠️ VPS dengan IP ${ip} sudah ada!`);
        }

        vpsList.push({
            name,
            ip,
            password,
            addedAt: new Date().toISOString()
        });

        saveJsonData(VPS_FILE, vpsList);

        bot.sendMessage(chatId, `✅ <b>VPS Ditambahkan!</b>\n\n📛 Name: ${name}\n📍 IP: <code>${ip}</code>`, { parse_mode: 'HTML' });
    });

    // /vpsremove <ip> - Hapus VPS
    bot.onText(/^\/vpsremove\s+(\S+)$/i, async (msg, match) => {
        const chatId = msg.chat.id;
        const userId = msg.from.id.toString();

        if (!isOwner(userId)) {
            return bot.sendMessage(chatId, '❌ ᴋʜᴜꜱᴜꜱ ᴏᴡɴᴇʀ!');
        }

        const ip = match[1];
        let vpsList = loadJsonData(VPS_FILE) || [];

        const index = vpsList.findIndex(v => v.ip === ip);
        if (index === -1) {
            return bot.sendMessage(chatId, `❌ VPS dengan IP ${ip} tidak ditemukan!`);
        }

        vpsList.splice(index, 1);
        saveJsonData(VPS_FILE, vpsList);

        bot.sendMessage(chatId, `✅ VPS ${ip} berhasil dihapus!`);
    });

    // /vpsinfo <ip> - Info VPS
    bot.onText(/^\/vpsinfo\s+(\S+)$/i, async (msg, match) => {
        const chatId = msg.chat.id;
        const userId = msg.from.id.toString();

        if (!isOwner(userId)) {
            return bot.sendMessage(chatId, '❌ ᴋʜᴜꜱᴜꜱ ᴏᴡɴᴇʀ!');
        }

        const ip = match[1];
        const vpsList = loadJsonData(VPS_FILE) || [];
        const vps = vpsList.find(v => v.ip === ip);

        if (!vps) {
            return bot.sendMessage(chatId, `❌ VPS ${ip} tidak ditemukan! Gunakan /vpslist`);
        }

        const wait = await bot.sendMessage(chatId, `⏳ Connecting to ${ip}...`);

        const conn = new Client();
        conn.on('ready', () => {
            const cmd = 'echo "====="; hostname; echo "====="; uptime; echo "====="; free -h | grep Mem; echo "====="; df -h / | tail -1';

            conn.exec(cmd, (err, stream) => {
                if (err) {
                    conn.end();
                    return bot.editMessageText(`❌ Error: ${err.message}`, {
                        chat_id: chatId,
                        message_id: wait.message_id
                    });
                }

                let output = '';
                stream.on('data', data => { output += data.toString(); });
                stream.stderr.on('data', data => { output += data.toString(); });

                stream.on('close', () => {
                    conn.end();

                    const lines = output.split('=====').filter(l => l.trim());
                    const hostname = lines[0]?.trim() || '-';
                    const uptime = lines[1]?.trim() || '-';
                    const memory = lines[2]?.trim() || '-';
                    const disk = lines[3]?.trim() || '-';

                    const text = `
🖥️ <b>VPS INFO</b>
<code>━━━━━━━━━━━━━━━━━━━━━━</code>

<blockquote>
📛 <b>Name:</b> ${vps.name}
📍 <b>IP:</b> <code>${ip}</code>
🏷️ <b>Hostname:</b> ${hostname}

⏱️ <b>Uptime:</b>
${uptime}

💾 <b>Memory:</b>
${memory}

💿 <b>Disk:</b>
${disk}
</blockquote>

✅ <i>Connected successfully</i>
`;

                    bot.editMessageText(text, {
                        chat_id: chatId,
                        message_id: wait.message_id,
                        parse_mode: 'HTML',
                        reply_markup: {
                            inline_keyboard: [
                                [
                                    { text: '🔄 Reboot', callback_data: `vps_reboot_${ip}` },
                                    { text: '🔃 Refresh', callback_data: `vps_info_${ip}` }
                                ]
                            ]
                        }
                    });
                });
            });
        });

        conn.on('error', err => {
            bot.editMessageText(`❌ SSH Error: ${err.message}`, {
                chat_id: chatId,
                message_id: wait.message_id
            });
        });

        conn.connect({
            host: ip,
            port: 22,
            username: 'root',
            password: vps.password,
            readyTimeout: 20000
        });
    });

    // /vpsexec <ip> <command> - Execute command
    bot.onText(/^\/vpsexec\s+(\S+)\s+(.+)$/i, async (msg, match) => {
        const chatId = msg.chat.id;
        const userId = msg.from.id.toString();

        if (!isOwner(userId)) {
            return bot.sendMessage(chatId, '❌ ᴋʜᴜꜱᴜꜱ ᴏᴡɴᴇʀ!');
        }

        const ip = match[1];
        const command = match[2];
        const vpsList = loadJsonData(VPS_FILE) || [];
        const vps = vpsList.find(v => v.ip === ip);

        if (!vps) {
            return bot.sendMessage(chatId, `❌ VPS ${ip} tidak ditemukan!`);
        }

        const wait = await bot.sendMessage(chatId, `⏳ Executing on ${ip}...`);

        const conn = new Client();
        conn.on('ready', () => {
            conn.exec(command, (err, stream) => {
                if (err) {
                    conn.end();
                    return bot.editMessageText(`❌ Error: ${err.message}`, {
                        chat_id: chatId,
                        message_id: wait.message_id
                    });
                }

                let output = '';
                stream.on('data', data => { output += data.toString(); });
                stream.stderr.on('data', data => { output += data.toString(); });

                stream.on('close', (code) => {
                    conn.end();

                    const truncated = output.length > 3000 ? output.slice(-3000) + '...' : output;

                    bot.editMessageText(`✅ <b>Command Executed</b>\n\n📍 IP: <code>${ip}</code>\n⌨️ CMD: <code>${command}</code>\n📤 Exit: ${code}\n\n<pre>${truncated || '(no output)'}</pre>`, {
                        chat_id: chatId,
                        message_id: wait.message_id,
                        parse_mode: 'HTML'
                    });
                });
            });
        });

        conn.on('error', err => {
            bot.editMessageText(`❌ SSH Error: ${err.message}`, {
                chat_id: chatId,
                message_id: wait.message_id
            });
        });

        conn.connect({
            host: ip,
            port: 22,
            username: 'root',
            password: vps.password,
            readyTimeout: 20000
        });
    });

    // /vpsreboot <ip> - Reboot VPS
    bot.onText(/^\/vpsreboot\s+(\S+)$/i, async (msg, match) => {
        const chatId = msg.chat.id;
        const userId = msg.from.id.toString();

        if (!isOwner(userId)) {
            return bot.sendMessage(chatId, '❌ ᴋʜᴜꜱᴜꜱ ᴏᴡɴᴇʀ!');
        }

        const ip = match[1];
        const vpsList = loadJsonData(VPS_FILE) || [];
        const vps = vpsList.find(v => v.ip === ip);

        if (!vps) {
            return bot.sendMessage(chatId, `❌ VPS ${ip} tidak ditemukan!`);
        }

        const wait = await bot.sendMessage(chatId, `⏳ Rebooting ${ip}...`);

        const conn = new Client();
        conn.on('ready', () => {
            conn.exec('reboot', (err, stream) => {
                conn.end();
                bot.editMessageText(`🔄 <b>Reboot command sent!</b>\n\n📍 IP: <code>${ip}</code>\n\n⚠️ VPS akan restart dalam beberapa detik.`, {
                    chat_id: chatId,
                    message_id: wait.message_id,
                    parse_mode: 'HTML'
                });
            });
        });

        conn.on('error', err => {
            bot.editMessageText(`❌ SSH Error: ${err.message}`, {
                chat_id: chatId,
                message_id: wait.message_id
            });
        });

        conn.connect({
            host: ip,
            port: 22,
            username: 'root',
            password: vps.password,
            readyTimeout: 20000
        });
    });

    // ═══════════════════════════════════════════════════════════════════════════════
    // DIGITALOCEAN MANAGEMENT
    // ═══════════════════════════════════════════════════════════════════════════════

    // /dolist - List droplets
    bot.onText(/^\/dolist$/i, async (msg) => {
        const chatId = msg.chat.id;
        const userId = msg.from.id.toString();

        if (!isOwner(userId)) {
            return bot.sendMessage(chatId, '❌ ᴋʜᴜꜱᴜꜱ ᴏᴡɴᴇʀ!');
        }

        const wait = await bot.sendMessage(chatId, '⏳ Fetching droplets...');

        try {
            const data = await doApi('/droplets');
            const droplets = data.droplets || [];

            if (droplets.length === 0) {
                return bot.editMessageText('📋 Tidak ada droplet ditemukan.', {
                    chat_id: chatId,
                    message_id: wait.message_id
                });
            }

            let text = `💧 <b>DIGITALOCEAN DROPLETS</b> (${droplets.length})\n<code>━━━━━━━━━━━━━━━━━━━━━━</code>\n\n`;

            droplets.forEach((d, i) => {
                const status = d.status === 'active' ? '🟢' : '🔴';
                const ip = d.networks?.v4?.[0]?.ip_address || '-';
                text += `${i + 1}. ${status} <b>${d.name}</b>\n`;
                text += `   🆔 ${d.id} | 📍 ${ip}\n`;
                text += `   💾 ${d.memory}MB | 📍 ${d.region?.slug}\n\n`;
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

    // /dobalance - Account balance
    bot.onText(/^\/dobalance$/i, async (msg) => {
        const chatId = msg.chat.id;
        const userId = msg.from.id.toString();

        if (!isOwner(userId)) {
            return bot.sendMessage(chatId, '❌ ᴋʜᴜꜱᴜꜱ ᴏᴡɴᴇʀ!');
        }

        const wait = await bot.sendMessage(chatId, '⏳ Fetching balance...');

        try {
            const data = await doApi('/customers/my/balance');

            const text = `
💰 <b>DIGITALOCEAN BALANCE</b>
<code>━━━━━━━━━━━━━━━━━━━━━━</code>

<blockquote>
💵 <b>Balance:</b> $${Math.abs(data.account_balance).toFixed(2)}
📅 <b>Month-to-date:</b> $${data.month_to_date_usage}
📆 <b>Last updated:</b> ${data.generated_at}
</blockquote>
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

    // /doregions - List regions
    bot.onText(/^\/doregions$/i, async (msg) => {
        const chatId = msg.chat.id;
        const userId = msg.from.id.toString();

        if (!isOwner(userId)) {
            return bot.sendMessage(chatId, '❌ ᴋʜᴜꜱᴜꜱ ᴏᴡɴᴇʀ!');
        }

        const wait = await bot.sendMessage(chatId, '⏳ Fetching regions...');

        try {
            const data = await doApi('/regions');
            const regions = data.regions || [];

            let text = `🌍 <b>DIGITALOCEAN REGIONS</b>\n<code>━━━━━━━━━━━━━━━━━━━━━━</code>\n\n`;

            regions.filter(r => r.available).forEach(r => {
                text += `📍 <code>${r.slug}</code> - ${r.name}\n`;
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

    // /dosizes - List sizes
    bot.onText(/^\/dosizes$/i, async (msg) => {
        const chatId = msg.chat.id;
        const userId = msg.from.id.toString();

        if (!isOwner(userId)) {
            return bot.sendMessage(chatId, '❌ ᴋʜᴜꜱᴜꜱ ᴏᴡɴᴇʀ!');
        }

        const wait = await bot.sendMessage(chatId, '⏳ Fetching sizes...');

        try {
            const data = await doApi('/sizes');
            const sizes = data.sizes || [];

            let text = `💾 <b>DIGITALOCEAN SIZES</b>\n<code>━━━━━━━━━━━━━━━━━━━━━━</code>\n\n`;

            sizes.slice(0, 20).filter(s => s.available).forEach(s => {
                text += `📦 <code>${s.slug}</code>\n`;
                text += `   💾 ${s.memory}MB | 💿 ${s.disk}GB | 💲${s.price_monthly}/mo\n\n`;
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

    // /doreboot <id> - Reboot droplet
    bot.onText(/^\/doreboot\s+(\d+)$/i, async (msg, match) => {
        const chatId = msg.chat.id;
        const userId = msg.from.id.toString();

        if (!isOwner(userId)) {
            return bot.sendMessage(chatId, '❌ ᴋʜᴜꜱᴜꜱ ᴏᴡɴᴇʀ!');
        }

        const dropletId = match[1];
        const wait = await bot.sendMessage(chatId, `⏳ Rebooting droplet ${dropletId}...`);

        try {
            await doApi(`/droplets/${dropletId}/actions`, 'POST', { type: 'reboot' });

            bot.editMessageText(`🔄 <b>Reboot initiated!</b>\n\n🆔 Droplet: ${dropletId}`, {
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

    // /docreate <name>,<region>,<size>,<image> - Create droplet
    bot.onText(/^\/docreate\s+(.+)$/i, async (msg, match) => {
        const chatId = msg.chat.id;
        const userId = msg.from.id.toString();

        if (!isOwner(userId)) {
            return bot.sendMessage(chatId, '❌ ᴋʜᴜꜱᴜꜱ ᴏᴡɴᴇʀ!');
        }

        const parts = match[1].split(/[|,]/).map(x => x.trim());
        if (parts.length < 3) {
            return bot.sendMessage(chatId, '❌ Format: /docreate name,region,size\n\nContoh: /docreate myserver,sgp1,s-1vcpu-1gb');
        }

        const [name, region, size] = parts;
        const image = parts[3] || 'ubuntu-22-04-x64';

        const wait = await bot.sendMessage(chatId, `⏳ Creating droplet ${name}...`);

        try {
            const data = await doApi('/droplets', 'POST', {
                name,
                region,
                size,
                image,
                monitoring: true
            });

            const droplet = data.droplet;

            bot.editMessageText(`✅ <b>Droplet Created!</b>\n\n📛 Name: ${droplet.name}\n🆔 ID: ${droplet.id}\n📍 Region: ${region}\n💾 Size: ${size}\n\n⏳ <i>IP akan tersedia dalam beberapa menit...</i>`, {
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
    // CALLBACK HANDLERS
    // ═══════════════════════════════════════════════════════════════════════════════
    bot.on('callback_query', async (query) => {
        const data = query.data;
        const chatId = query.message.chat.id;
        const userId = query.from.id.toString();

        if (!data.startsWith('vps_')) return;

        if (!isOwner(userId)) {
            return bot.answerCallbackQuery(query.id, { text: '❌ Akses ditolak!', show_alert: true });
        }

        const parts = data.split('_');
        const action = parts[1];
        const ip = parts[2];

        if (action === 'reboot' || action === 'info') {
            bot.answerCallbackQuery(query.id, { text: `⏳ ${action}...` });
            // Trigger the command
            const fakeMsg = { chat: { id: chatId }, from: { id: parseInt(userId) } };
            if (action === 'reboot') {
                bot.sendMessage(chatId, `Gunakan /vpsreboot ${ip} untuk reboot`);
            } else {
                bot.sendMessage(chatId, `Gunakan /vpsinfo ${ip} untuk refresh`);
            }
        }
    });

    // Initialize VPS file if not exists
    if (!fs.existsSync(VPS_FILE)) {
        saveJsonData(VPS_FILE, []);
    }

};
