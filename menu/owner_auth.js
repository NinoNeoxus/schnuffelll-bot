/**
 * Owner Auth Management Module
 * Commands for managing the dynamic access key system
 * 
 * @author @schnuffelll
 */

const axios = require('axios');
const crypto = require('crypto');

const settings = require('../config.js');
const secret = require('../config.secret.js');

// GitHub Config (Uses license config from secret)
const license = secret.getLicense();

module.exports = (bot) => {

    // Generate random password (12 chars alphanumeric)
    function generatePassword() {
        return crypto.randomBytes(6).toString('hex').toUpperCase();
    }

    // Update access key on GitHub
    async function updateGitHubKey(newKey) {
        const { githubToken, githubRepo } = license;
        const filePath = 'access_key.txt';
        const apiUrl = `https://api.github.com/repos/${githubRepo}/contents/${filePath}`;

        try {
            // 1. Get current file SHA (if exists)
            let sha = null;
            try {
                const getResponse = await axios.get(apiUrl, {
                    headers: {
                        'Authorization': `token ${githubToken}`,
                        'Accept': 'application/vnd.github.v3+json'
                    }
                });
                sha = getResponse.data.sha;
            } catch (e) {
                // File doesn't exist yet, that's okay
                if (e.response?.status !== 404) throw e;
            }

            // 2. Update/Create file
            const content = Buffer.from(newKey).toString('base64');
            const payload = {
                message: `[BOT] Update access key`,
                content: content
            };
            if (sha) payload.sha = sha;

            await axios.put(apiUrl, payload, {
                headers: {
                    'Authorization': `token ${githubToken}`,
                    'Accept': 'application/vnd.github.v3+json'
                }
            });

            return true;
        } catch (err) {
            console.error('[Auth] Failed to update GitHub key:', err.response?.data || err.message);
            return false;
        }
    }

    // ====== COMMANDS ======

    // /genpass - Generate new access key
    bot.onText(/^\/genpass$/i, async (msg) => {
        const chatId = msg.chat.id;
        const userId = msg.from.id;

        // Owner only
        if (userId !== settings.ownerId) {
            return bot.sendMessage(chatId, '❌ ᴋʜᴜꜱᴜꜱ ᴏᴡɴᴇʀ!');
        }

        const loadingMsg = await bot.sendMessage(chatId, '🔄 Generating new access key...');

        const newKey = generatePassword();
        const success = await updateGitHubKey(newKey);

        if (!success) {
            return bot.editMessageText('❌ Gagal update key ke GitHub. Cek GitHub Token!', {
                chat_id: chatId,
                message_id: loadingMsg.message_id
            });
        }

        return bot.editMessageText(`
✅ <b>ACCESS KEY UPDATED!</b>

🔑 New Key: <code>${newKey}</code>

<i>⚠️ Semua bot client akan MATI dalam 10 menit jika tidak di-restart dengan key baru.</i>

Kirim key ini ke buyer yang sudah bayar.
`, { chat_id: chatId, message_id: loadingMsg.message_id, parse_mode: 'HTML' });
    });

    // /viewkey - View current key (without regenerating)
    bot.onText(/^\/viewkey$/i, async (msg) => {
        const chatId = msg.chat.id;
        const userId = msg.from.id;

        if (userId !== settings.ownerId) {
            return bot.sendMessage(chatId, '❌ ᴋʜᴜꜱᴜꜱ ᴏᴡɴᴇʀ!');
        }

        try {
            const { githubRepo } = license;
            const rawUrl = `https://raw.githubusercontent.com/${githubRepo}/main/access_key.txt`;
            const response = await axios.get(rawUrl, { headers: { 'Cache-Control': 'no-cache' } });
            const currentKey = response.data.trim();

            return bot.sendMessage(chatId, `
🔑 <b>CURRENT ACCESS KEY</b>

Key: <code>${currentKey}</code>

<i>Gunakan /genpass untuk generate key baru.</i>
`, { parse_mode: 'HTML' });
        } catch (err) {
            return bot.sendMessage(chatId, '❌ Gagal membaca key. File mungkin belum ada atau GitHub error.');
        }
    });

};
