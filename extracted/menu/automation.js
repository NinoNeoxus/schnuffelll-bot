/**
 * ═══════════════════════════════════════════════════════════════════════════════════════
 *  🤖 SCHNUFFELLL BOT - AUTOMATION v8.0
 *  Automation and scheduling features
 *  
 *  Commands:
 *  /autobackup      - Setup auto backup
 *  /autorestart     - Setup auto restart
 *  /autoclean       - Setup auto cleanup
 *  /autocheck       - Setup health check
 *  /autolist        - List all automations
 *  /autostop        - Stop automation
 *  /schedule        - Schedule one-time task
 *  /cron            - View/manage cron jobs
 *  /broadcast       - Broadcast message ke semua users
 *  
 *  @author @schnuffelll
 *  @version 8.0
 * ═══════════════════════════════════════════════════════════════════════════════════════
 */

const fs = require('fs');
const { loadJsonData, saveJsonData } = require('../lib/function');

module.exports = (bot) => {

    console.log('[AUTO] 🤖 Automation Module v8.0 loaded');

    const OWNER_FILE = './db/users/adminID.json';
    const AUTO_FILE = './db/automations.json';
    const USERS_FILE = './db/users/users.json';

    // Active intervals storage
    const activeJobs = new Map();

    // Helper: Check owner
    function isOwner(userId) {
        const owners = loadJsonData(OWNER_FILE);
        return owners.includes(String(userId));
    }

    // Initialize automation file
    if (!fs.existsSync(AUTO_FILE)) {
        saveJsonData(AUTO_FILE, { jobs: [] });
    }

    // ═══════════════════════════════════════════════════════════════════════════════
    // /autolist - List all automations
    // ═══════════════════════════════════════════════════════════════════════════════
    bot.onText(/^\/autolist$/i, async (msg) => {
        const chatId = msg.chat.id;
        const userId = msg.from.id.toString();

        if (!isOwner(userId)) {
            return bot.sendMessage(chatId, '❌ ᴋʜᴜꜱᴜꜱ ᴏᴡɴᴇʀ!');
        }

        const autoData = loadJsonData(AUTO_FILE) || { jobs: [] };
        const jobs = autoData.jobs || [];

        if (jobs.length === 0) {
            return bot.sendMessage(chatId, '📋 Tidak ada automation aktif.\n\nGunakan:\n/autobackup\n/autorestart\n/autoclean\n/autocheck');
        }

        let text = `🤖 <b>ACTIVE AUTOMATIONS</b> (${jobs.length})\n<code>━━━━━━━━━━━━━━━━━━━━━━</code>\n\n`;

        jobs.forEach((job, i) => {
            const status = activeJobs.has(job.id) ? '🟢' : '🔴';
            text += `${i + 1}. ${status} <b>${job.type}</b>\n`;
            text += `   ⏰ Interval: ${job.interval}min\n`;
            text += `   📍 Target: ${job.target || 'All'}\n`;
            text += `   🆔 ID: <code>${job.id}</code>\n\n`;
        });

        text += `\n<i>Gunakan /autostop &lt;id&gt; untuk stop</i>`;

        bot.sendMessage(chatId, text, { parse_mode: 'HTML' });
    });

    // ═══════════════════════════════════════════════════════════════════════════════
    // /autobackup <interval_minutes> <ip> - Setup auto backup
    // ═══════════════════════════════════════════════════════════════════════════════
    bot.onText(/^\/autobackup\s+(\d+)\s+(\S+)$/i, async (msg, match) => {
        const chatId = msg.chat.id;
        const userId = msg.from.id.toString();

        if (!isOwner(userId)) {
            return bot.sendMessage(chatId, '❌ ᴋʜᴜꜱᴜꜱ ᴏᴡɴᴇʀ!');
        }

        const interval = parseInt(match[1]);
        const ip = match[2];

        if (interval < 5) {
            return bot.sendMessage(chatId, '❌ Interval minimal 5 menit!');
        }

        const jobId = `backup_${Date.now()}`;
        const autoData = loadJsonData(AUTO_FILE) || { jobs: [] };

        autoData.jobs.push({
            id: jobId,
            type: 'backup',
            interval,
            target: ip,
            chatId,
            createdAt: new Date().toISOString()
        });

        saveJsonData(AUTO_FILE, autoData);

        bot.sendMessage(chatId, `✅ <b>Auto Backup Scheduled!</b>\n\n🆔 Job ID: <code>${jobId}</code>\n⏰ Interval: ${interval} menit\n📍 Target: ${ip}\n\n⚠️ <i>Backup akan jalan setiap ${interval} menit.</i>`, { parse_mode: 'HTML' });
    });

    // ═══════════════════════════════════════════════════════════════════════════════
    // /autorestart <interval_minutes> <ip> - Setup auto restart
    // ═══════════════════════════════════════════════════════════════════════════════
    bot.onText(/^\/autorestart\s+(\d+)\s+(\S+)$/i, async (msg, match) => {
        const chatId = msg.chat.id;
        const userId = msg.from.id.toString();

        if (!isOwner(userId)) {
            return bot.sendMessage(chatId, '❌ ᴋʜᴜꜱᴜꜱ ᴏᴡɴᴇʀ!');
        }

        const interval = parseInt(match[1]);
        const ip = match[2];

        if (interval < 30) {
            return bot.sendMessage(chatId, '❌ Interval restart minimal 30 menit!');
        }

        const jobId = `restart_${Date.now()}`;
        const autoData = loadJsonData(AUTO_FILE) || { jobs: [] };

        autoData.jobs.push({
            id: jobId,
            type: 'restart',
            interval,
            target: ip,
            chatId,
            createdAt: new Date().toISOString()
        });

        saveJsonData(AUTO_FILE, autoData);

        bot.sendMessage(chatId, `✅ <b>Auto Restart Scheduled!</b>\n\n🆔 Job ID: <code>${jobId}</code>\n⏰ Interval: ${interval} menit\n📍 Target: ${ip}`, { parse_mode: 'HTML' });
    });

    // ═══════════════════════════════════════════════════════════════════════════════
    // /autocheck <interval_minutes> <target> - Setup health check
    // ═══════════════════════════════════════════════════════════════════════════════
    bot.onText(/^\/autocheck\s+(\d+)\s+(\S+)$/i, async (msg, match) => {
        const chatId = msg.chat.id;
        const userId = msg.from.id.toString();

        if (!isOwner(userId)) {
            return bot.sendMessage(chatId, '❌ ᴋʜᴜꜱᴜꜱ ᴏᴡɴᴇʀ!');
        }

        const interval = parseInt(match[1]);
        const target = match[2]; // URL or IP

        if (interval < 1) {
            return bot.sendMessage(chatId, '❌ Interval minimal 1 menit!');
        }

        const jobId = `check_${Date.now()}`;
        const autoData = loadJsonData(AUTO_FILE) || { jobs: [] };

        autoData.jobs.push({
            id: jobId,
            type: 'healthcheck',
            interval,
            target,
            chatId,
            createdAt: new Date().toISOString()
        });

        saveJsonData(AUTO_FILE, autoData);

        bot.sendMessage(chatId, `✅ <b>Auto Health Check Scheduled!</b>\n\n🆔 Job ID: <code>${jobId}</code>\n⏰ Interval: ${interval} menit\n📍 Target: ${target}`, { parse_mode: 'HTML' });
    });

    // ═══════════════════════════════════════════════════════════════════════════════
    // /autostop <job_id> - Stop automation
    // ═══════════════════════════════════════════════════════════════════════════════
    bot.onText(/^\/autostop\s+(\S+)$/i, async (msg, match) => {
        const chatId = msg.chat.id;
        const userId = msg.from.id.toString();

        if (!isOwner(userId)) {
            return bot.sendMessage(chatId, '❌ ᴋʜᴜꜱᴜꜱ ᴏᴡɴᴇʀ!');
        }

        const jobId = match[1];
        const autoData = loadJsonData(AUTO_FILE) || { jobs: [] };

        const index = autoData.jobs.findIndex(j => j.id === jobId);
        if (index === -1) {
            return bot.sendMessage(chatId, `❌ Job ${jobId} tidak ditemukan!`);
        }

        // Clear interval if running
        if (activeJobs.has(jobId)) {
            clearInterval(activeJobs.get(jobId));
            activeJobs.delete(jobId);
        }

        autoData.jobs.splice(index, 1);
        saveJsonData(AUTO_FILE, autoData);

        bot.sendMessage(chatId, `✅ Automation <code>${jobId}</code> dihentikan!`, { parse_mode: 'HTML' });
    });

    // ═══════════════════════════════════════════════════════════════════════════════
    // /broadcast <message> - Broadcast ke semua users
    // ═══════════════════════════════════════════════════════════════════════════════
    bot.onText(/^\/broadcast\s+(.+)$/is, async (msg, match) => {
        const chatId = msg.chat.id;
        const userId = msg.from.id.toString();

        if (!isOwner(userId)) {
            return bot.sendMessage(chatId, '❌ ᴋʜᴜꜱᴜꜱ ᴏᴡɴᴇʀ!');
        }

        const message = match[1];
        const users = loadJsonData(USERS_FILE) || [];

        if (users.length === 0) {
            return bot.sendMessage(chatId, '❌ Tidak ada user terdaftar!');
        }

        const wait = await bot.sendMessage(chatId, `⏳ Broadcasting ke ${users.length} users...`);

        let success = 0, failed = 0;

        for (const uid of users) {
            try {
                await bot.sendMessage(uid, `📢 <b>BROADCAST</b>\n\n${message}`, { parse_mode: 'HTML' });
                success++;
            } catch (e) {
                failed++;
            }
            // Small delay to avoid flooding
            await new Promise(r => setTimeout(r, 50));
        }

        bot.editMessageText(`✅ <b>Broadcast Complete!</b>\n\n✅ Success: ${success}\n❌ Failed: ${failed}`, {
            chat_id: chatId,
            message_id: wait.message_id,
            parse_mode: 'HTML'
        });
    });

    // ═══════════════════════════════════════════════════════════════════════════════
    // /schedule <delay_minutes> <command> - Schedule one-time task
    // ═══════════════════════════════════════════════════════════════════════════════
    bot.onText(/^\/schedule\s+(\d+)\s+(.+)$/i, async (msg, match) => {
        const chatId = msg.chat.id;
        const userId = msg.from.id.toString();

        if (!isOwner(userId)) {
            return bot.sendMessage(chatId, '❌ ᴋʜᴜꜱᴜꜱ ᴏᴡɴᴇʀ!');
        }

        const delay = parseInt(match[1]);
        const command = match[2];

        if (delay < 1) {
            return bot.sendMessage(chatId, '❌ Delay minimal 1 menit!');
        }

        const executeAt = new Date(Date.now() + delay * 60000);

        setTimeout(() => {
            bot.sendMessage(chatId, `⏰ <b>Scheduled Task Running!</b>\n\n⌨️ <code>${command}</code>`, { parse_mode: 'HTML' });
            // Could add actual command execution here
        }, delay * 60000);

        bot.sendMessage(chatId, `✅ <b>Task Scheduled!</b>\n\n⌨️ Command: <code>${command}</code>\n⏰ Execute at: ${executeAt.toLocaleString('id-ID')}`, { parse_mode: 'HTML' });
    });

    // ═══════════════════════════════════════════════════════════════════════════════
    // /reminder <delay_minutes> <message> - Set reminder
    // ═══════════════════════════════════════════════════════════════════════════════
    bot.onText(/^\/reminder\s+(\d+)\s+(.+)$/i, async (msg, match) => {
        const chatId = msg.chat.id;
        const userId = msg.from.id.toString();

        if (!isOwner(userId)) {
            return bot.sendMessage(chatId, '❌ ᴋʜᴜꜱᴜꜱ ᴏᴡɴᴇʀ!');
        }

        const delay = parseInt(match[1]);
        const message = match[2];

        if (delay < 1) {
            return bot.sendMessage(chatId, '❌ Delay minimal 1 menit!');
        }

        const executeAt = new Date(Date.now() + delay * 60000);

        setTimeout(() => {
            bot.sendMessage(chatId, `⏰ <b>REMINDER!</b>\n\n${message}`, { parse_mode: 'HTML' });
        }, delay * 60000);

        bot.sendMessage(chatId, `✅ <b>Reminder Set!</b>\n\n📝 Message: ${message}\n⏰ Remind at: ${executeAt.toLocaleString('id-ID')}`, { parse_mode: 'HTML' });
    });

    // ═══════════════════════════════════════════════════════════════════════════════
    // /stats - Bot statistics
    // ═══════════════════════════════════════════════════════════════════════════════
    bot.onText(/^\/stats$/i, async (msg) => {
        const chatId = msg.chat.id;
        const userId = msg.from.id.toString();

        if (!isOwner(userId)) {
            return bot.sendMessage(chatId, '❌ ᴋʜᴜꜱᴜꜱ ᴏᴡɴᴇʀ!');
        }

        const users = loadJsonData(USERS_FILE) || [];
        const owners = loadJsonData(OWNER_FILE) || [];
        const premium = loadJsonData('./db/users/premiumUsers.json') || [];
        const resellers = loadJsonData('./db/users/resellerUsers.json') || [];
        const autoData = loadJsonData(AUTO_FILE) || { jobs: [] };

        const uptime = process.uptime();
        const uptimeStr = `${Math.floor(uptime / 86400)}d ${Math.floor((uptime % 86400) / 3600)}h ${Math.floor((uptime % 3600) / 60)}m`;

        const memUsage = process.memoryUsage();
        const memMB = (memUsage.heapUsed / 1024 / 1024).toFixed(1);

        const text = `
📊 <b>BOT STATISTICS</b>
<code>━━━━━━━━━━━━━━━━━━━━━━</code>

<blockquote>
👥 <b>USERS</b>
┣ Total: ${users.length}
┣ Owners: ${owners.length}
┣ Premium: ${premium.length}
┗ Resellers: ${resellers.length}

⚙️ <b>SYSTEM</b>
┣ Uptime: ${uptimeStr}
┣ Memory: ${memMB} MB
┣ Node: ${process.version}
┗ Platform: ${process.platform}

🤖 <b>AUTOMATION</b>
┣ Active Jobs: ${autoData.jobs.length}
┗ Running: ${activeJobs.size}
</blockquote>

⏰ <i>${new Date().toLocaleString('id-ID')}</i>
`;

        bot.sendMessage(chatId, text, { parse_mode: 'HTML' });
    });

};
