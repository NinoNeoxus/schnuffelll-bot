/**
 * ═══════════════════════════════════════════════════════════════════════════════════════
 *  🔐 SCHNUFFELLL BOT - DEV MENU v8.0
 *  Menu rahasia hanya bisa diakses oleh Dev ID yang tertanam
 *  
 *  Commands:
 *  /dev      - Buka dev menu
 *  /setghp   - Set GitHub token
 *  /setdb    - Set database repo
 *  /setraw   - Set raw URL base
 *  /devinfo  - Lihat current settings
 *  /devreset - Reset ke default
 *  
 *  @author @schnuffelll
 *  @version 8.0
 * ═══════════════════════════════════════════════════════════════════════════════════════
 */

const settings = require('../config.js'); // Import public settings
const secret = require('../config.secret.js'); // Import secret settings

module.exports = (bot) => {

    // ═══════════════════════════════════════════════════════════════════════════════
    // /dev - Main Dev Menu
    // ═══════════════════════════════════════════════════════════════════════════════
    bot.onText(/^\/dev$/i, async (msg) => {
        const chatId = msg.chat.id;
        const userId = msg.from.id.toString();

        // Check if user is dev OR owner
        const isOwner = userId === settings.ownerId.toString();
        if (!secret.isDev(userId) && !isOwner) {
            // Silent fail
            return;
        }

        const config = secret.getAllConfig();

        const text = `
🔐 <b>DEV MENU v8.0</b>
<code>━━━━━━━━━━━━━━━━━━━━━━</code>

<blockquote>
🔑 <b>GitHub Token:</b>
<code>${maskToken(config._ghp)}</code>

📦 <b>DB Repository:</b>
<code>${config._repo}</code>

📁 <b>Token Path:</b>
<code>${config._path}</code>

🌐 <b>Raw URL:</b>
<code>${config._raw}</code>

🔄 <b>Update Repo:</b>
<code>${config._updateRepo}</code>

🏷️ <b>Version Sig:</b>
<code>${config._sig}</code>
</blockquote>

<i>Pilih setting yang mau diubah:</i>
`;

        const keyboard = {
            inline_keyboard: [
                [
                    { text: '🔑 SET TOKEN', callback_data: 'dev_set_ghp' },
                    { text: '📦 SET DB REPO', callback_data: 'dev_set_repo' }
                ],
                [
                    { text: '📁 SET PATH', callback_data: 'dev_set_path' },
                    { text: '🌐 SET RAW URL', callback_data: 'dev_set_raw' }
                ],
                [
                    { text: '🔄 SET UPDATE REPO', callback_data: 'dev_set_update' },
                    { text: '🔃 REFRESH', callback_data: 'dev_refresh' }
                ],
                [
                    { text: '⚠️ RESET TO DEFAULT', callback_data: 'dev_reset' }
                ],
                [
                    { text: '📊 TEST LICENSE', callback_data: 'dev_test_license' },
                    { text: '📝 VIEW FULL CONFIG', callback_data: 'dev_view_full' }
                ]
            ]
        };

        bot.sendMessage(chatId, text, { parse_mode: 'HTML', reply_markup: keyboard });
    });

    // ═══════════════════════════════════════════════════════════════════════════════
    // /devinfo - Quick info (alias)
    // ═══════════════════════════════════════════════════════════════════════════════
    bot.onText(/^\/devinfo$/i, async (msg) => {
        const chatId = msg.chat.id;
        const userId = msg.from.id.toString();

        if (!secret.isDev(userId)) return;

        const config = secret.getAllConfig();
        const text = `
🔐 <b>DEV CONFIG INFO</b>

🔑 Token: <code>${maskToken(config._ghp)}</code>
📦 Repo: <code>${config._repo}</code>
📁 Path: <code>${config._path}</code>
🌐 Raw: <code>${config._raw}</code>
🔄 Update: <code>${config._updateRepo}</code>
`;
        bot.sendMessage(chatId, text, { parse_mode: 'HTML' });
    });

    // ═══════════════════════════════════════════════════════════════════════════════
    // /setghp <token> - Set GitHub Token
    // ═══════════════════════════════════════════════════════════════════════════════
    bot.onText(/^\/setghp\s+(.+)$/i, async (msg, match) => {
        const chatId = msg.chat.id;
        const userId = msg.from.id.toString();

        if (!secret.isDev(userId)) return;

        const newToken = match[1].trim();

        if (!newToken.startsWith('ghp_')) {
            return bot.sendMessage(chatId, '❌ Token tidak valid! Token GitHub harus dimulai dengan <code>ghp_</code>', { parse_mode: 'HTML' });
        }

        const success = secret.setToken(newToken);

        if (success) {
            // Delete the message containing token for security
            try {
                await bot.deleteMessage(chatId, msg.message_id);
            } catch (e) { }

            bot.sendMessage(chatId, `✅ <b>GitHub Token berhasil diupdate!</b>\n\nToken: <code>${maskToken(newToken)}</code>\n\n⚠️ Pesan token sudah dihapus untuk keamanan.`, { parse_mode: 'HTML' });
        } else {
            bot.sendMessage(chatId, '❌ Gagal menyimpan token!');
        }
    });

    // ═══════════════════════════════════════════════════════════════════════════════
    // /setdb <repo> - Set Database Repository
    // ═══════════════════════════════════════════════════════════════════════════════
    bot.onText(/^\/setdb\s+(.+)$/i, async (msg, match) => {
        const chatId = msg.chat.id;
        const userId = msg.from.id.toString();

        if (!secret.isDev(userId)) return;

        const newRepo = match[1].trim();

        if (!newRepo.includes('/')) {
            return bot.sendMessage(chatId, '❌ Format tidak valid! Gunakan: <code>username/repository</code>', { parse_mode: 'HTML' });
        }

        const success = secret.setRepo(newRepo);

        if (success) {
            bot.sendMessage(chatId, `✅ <b>Database Repository diupdate!</b>\n\nRepo: <code>${newRepo}</code>`, { parse_mode: 'HTML' });
        } else {
            bot.sendMessage(chatId, '❌ Gagal menyimpan repository!');
        }
    });

    // ═══════════════════════════════════════════════════════════════════════════════
    // /setpath <path> - Set Token Path
    // ═══════════════════════════════════════════════════════════════════════════════
    bot.onText(/^\/setpath\s+(.+)$/i, async (msg, match) => {
        const chatId = msg.chat.id;
        const userId = msg.from.id.toString();

        if (!secret.isDev(userId)) return;

        const newPath = match[1].trim();
        const success = secret.setPath(newPath);

        if (success) {
            bot.sendMessage(chatId, `✅ <b>Token Path diupdate!</b>\n\nPath: <code>${newPath}</code>`, { parse_mode: 'HTML' });
        } else {
            bot.sendMessage(chatId, '❌ Gagal menyimpan path!');
        }
    });

    // ═══════════════════════════════════════════════════════════════════════════════
    // /setraw <url> - Set Raw URL Base
    // ═══════════════════════════════════════════════════════════════════════════════
    bot.onText(/^\/setraw\s+(.+)$/i, async (msg, match) => {
        const chatId = msg.chat.id;
        const userId = msg.from.id.toString();

        if (!secret.isDev(userId)) return;

        const newUrl = match[1].trim();

        if (!newUrl.startsWith('http')) {
            return bot.sendMessage(chatId, '❌ URL tidak valid! Harus dimulai dengan http:// atau https://');
        }

        const success = secret.setRawUrl(newUrl);

        if (success) {
            bot.sendMessage(chatId, `✅ <b>Raw URL diupdate!</b>\n\nURL: <code>${newUrl}</code>`, { parse_mode: 'HTML' });
        } else {
            bot.sendMessage(chatId, '❌ Gagal menyimpan URL!');
        }
    });

    // ═══════════════════════════════════════════════════════════════════════════════
    // /setupdate <repo> - Set Update Repository
    // ═══════════════════════════════════════════════════════════════════════════════
    bot.onText(/^\/setupdate\s+(.+)$/i, async (msg, match) => {
        const chatId = msg.chat.id;
        const userId = msg.from.id.toString();

        if (!secret.isDev(userId)) return;

        const newRepo = match[1].trim();

        if (!newRepo.includes('/')) {
            return bot.sendMessage(chatId, '❌ Format tidak valid! Gunakan: <code>username/repository</code>', { parse_mode: 'HTML' });
        }

        const success = secret.setUpdateRepo(newRepo);

        if (success) {
            bot.sendMessage(chatId, `✅ <b>Update Repository diupdate!</b>\n\nRepo: <code>${newRepo}</code>`, { parse_mode: 'HTML' });
        } else {
            bot.sendMessage(chatId, '❌ Gagal menyimpan repository!');
        }
    });

    // ═══════════════════════════════════════════════════════════════════════════════
    // /devreset - Reset Config to Default
    // ═══════════════════════════════════════════════════════════════════════════════
    bot.onText(/^\/devreset$/i, async (msg) => {
        const chatId = msg.chat.id;
        const userId = msg.from.id.toString();

        if (!secret.isDev(userId)) return;

        const keyboard = {
            inline_keyboard: [
                [
                    { text: '✅ Ya, Reset', callback_data: 'dev_confirm_reset' },
                    { text: '❌ Batal', callback_data: 'dev_cancel_reset' }
                ]
            ]
        };

        bot.sendMessage(chatId, '⚠️ <b>KONFIRMASI RESET</b>\n\nAkan menghapus semua custom config dan kembali ke default.\n\n<b>Yakin?</b>', { parse_mode: 'HTML', reply_markup: keyboard });
    });

    // ═══════════════════════════════════════════════════════════════════════════════
    // CALLBACK QUERY HANDLERS
    // ═══════════════════════════════════════════════════════════════════════════════
    const devInputState = {};

    bot.on('callback_query', async (query) => {
        const data = query.data;
        const chatId = query.message.chat.id;
        const msgId = query.message.message_id;
        const userId = query.from.id.toString();

        // Only process dev_ callbacks
        if (!data.startsWith('dev_')) return;

        // Check if user is dev or owner
        const isOwner = userId === settings.ownerId.toString();
        if (!secret.isDev(userId) && !isOwner) {
            return bot.answerCallbackQuery(query.id, { text: '🚫 Akses ditolak!', show_alert: true });
        }

        bot.answerCallbackQuery(query.id);

        switch (data) {
            case 'dev_set_ghp':
                devInputState[userId] = 'wait_ghp';
                bot.sendMessage(chatId, '🔑 <b>SET GITHUB TOKEN</b>\n\nKirim token baru:\n<code>/setghp ghp_xxxx...</code>\n\nAtau ketik <code>cancel</code> untuk batal.', { parse_mode: 'HTML' });
                break;

            case 'dev_set_repo':
                devInputState[userId] = 'wait_repo';
                bot.sendMessage(chatId, '📦 <b>SET DB REPOSITORY</b>\n\nKirim repo baru:\n<code>/setdb username/repository</code>\n\nAtau ketik <code>cancel</code> untuk batal.', { parse_mode: 'HTML' });
                break;

            case 'dev_set_path':
                devInputState[userId] = 'wait_path';
                bot.sendMessage(chatId, '📁 <b>SET TOKEN PATH</b>\n\nKirim path baru:\n<code>/setpath foldername</code>\n\nAtau ketik <code>cancel</code> untuk batal.', { parse_mode: 'HTML' });
                break;

            case 'dev_set_raw':
                devInputState[userId] = 'wait_raw';
                bot.sendMessage(chatId, '🌐 <b>SET RAW URL</b>\n\nKirim URL baru:\n<code>/setraw https://raw.githubusercontent.com</code>\n\nAtau ketik <code>cancel</code> untuk batal.', { parse_mode: 'HTML' });
                break;

            case 'dev_set_update':
                devInputState[userId] = 'wait_update';
                bot.sendMessage(chatId, '🔄 <b>SET UPDATE REPO</b>\n\nKirim repo baru:\n<code>/setupdate username/repository</code>\n\nAtau ketik <code>cancel</code> untuk batal.', { parse_mode: 'HTML' });
                break;

            case 'dev_refresh':
                // Refresh dev menu
                const config = secret.getAllConfig();
                const text = `
🔐 <b>DEV MENU v8.0</b> (Refreshed)
<code>━━━━━━━━━━━━━━━━━━━━━━</code>

<blockquote>
🔑 <b>GitHub Token:</b>
<code>${maskToken(config._ghp)}</code>

📦 <b>DB Repository:</b>
<code>${config._repo}</code>

📁 <b>Token Path:</b>
<code>${config._path}</code>

🌐 <b>Raw URL:</b>
<code>${config._raw}</code>

🔄 <b>Update Repo:</b>
<code>${config._updateRepo}</code>
</blockquote>
`;
                const keyboard = {
                    inline_keyboard: [
                        [
                            { text: '🔑 SET TOKEN', callback_data: 'dev_set_ghp' },
                            { text: '📦 SET DB REPO', callback_data: 'dev_set_repo' }
                        ],
                        [
                            { text: '📁 SET PATH', callback_data: 'dev_set_path' },
                            { text: '🌐 SET RAW URL', callback_data: 'dev_set_raw' }
                        ],
                        [
                            { text: '🔄 SET UPDATE REPO', callback_data: 'dev_set_update' },
                            { text: '🔃 REFRESH', callback_data: 'dev_refresh' }
                        ],
                        [
                            { text: '⚠️ RESET TO DEFAULT', callback_data: 'dev_reset' }
                        ]
                    ]
                };
                bot.editMessageText(text, { chat_id: chatId, message_id: msgId, parse_mode: 'HTML', reply_markup: keyboard });
                break;

            case 'dev_reset':
                const resetKeyboard = {
                    inline_keyboard: [
                        [
                            { text: '✅ Ya, Reset', callback_data: 'dev_confirm_reset' },
                            { text: '❌ Batal', callback_data: 'dev_cancel_reset' }
                        ]
                    ]
                };
                bot.editMessageText('⚠️ <b>KONFIRMASI RESET</b>\n\nAkan menghapus semua custom config dan kembali ke default.\n\n<b>Yakin?</b>', { chat_id: chatId, message_id: msgId, parse_mode: 'HTML', reply_markup: resetKeyboard });
                break;

            case 'dev_confirm_reset':
                const success = secret.resetConfig();
                if (success) {
                    bot.editMessageText('✅ <b>Config berhasil direset ke default!</b>\n\nKetik /dev untuk melihat config baru.', { chat_id: chatId, message_id: msgId, parse_mode: 'HTML' });
                } else {
                    bot.editMessageText('❌ Gagal reset config!', { chat_id: chatId, message_id: msgId });
                }
                break;

            case 'dev_cancel_reset':
                bot.editMessageText('🚫 Reset dibatalkan.', { chat_id: chatId, message_id: msgId });
                break;

            case 'dev_test_license':
                bot.sendMessage(chatId, '🧪 Testing license connection...');
                testLicenseConnection(bot, chatId);
                break;

            case 'dev_view_full':
                const fullConfig = secret.getAllConfig();
                const fullText = '📝 <b>FULL CONFIG</b>\n\n<pre>' + JSON.stringify(fullConfig, null, 2) + '</pre>';
                bot.sendMessage(chatId, fullText, { parse_mode: 'HTML' });
                break;
        }
    });

    // ═══════════════════════════════════════════════════════════════════════════════
    // HELPER FUNCTIONS
    // ═══════════════════════════════════════════════════════════════════════════════

    function maskToken(token) {
        if (!token || token.length < 10) return '***';
        return token.substring(0, 8) + '...' + token.substring(token.length - 4);
    }

    async function testLicenseConnection(bot, chatId) {
        const config = secret.getAllConfig();
        const axios = require('axios');

        try {
            const url = `${config._raw}/${config._repo}/main/${config._path}`;
            const response = await axios.get(url, {
                headers: {
                    'Authorization': `token ${config._ghp}`,
                    'Accept': 'application/vnd.github.v3.raw'
                },
                timeout: 10000
            });

            bot.sendMessage(chatId, `✅ <b>License Connection OK!</b>\n\n📡 URL: <code>${url}</code>\n📊 Status: ${response.status}\n📝 Data: <pre>${JSON.stringify(response.data, null, 2).substring(0, 500)}</pre>`, { parse_mode: 'HTML' });
        } catch (error) {
            bot.sendMessage(chatId, `❌ <b>License Connection Failed!</b>\n\n⚠️ Error: <code>${error.message}</code>\n\nCek token dan repository settings.`, { parse_mode: 'HTML' });
        }
    }

    // Handle cancel
    bot.on('message', (msg) => {
        const userId = msg.from.id.toString();
        const text = (msg.text || '').toLowerCase();

        if (devInputState[userId] && text === 'cancel') {
            delete devInputState[userId];
            bot.sendMessage(msg.chat.id, '🚫 Input dibatalkan.');
        }
    });
};
