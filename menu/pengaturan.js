const fs = require('fs');
const settings = require('../config.js');

const OWNER_ID = settings.ownerId;
const SETTINGS_FILE = './db/owner_settings.json';

// Load settings
function loadSettings() {
    try {
        if (!fs.existsSync(SETTINGS_FILE)) return {};
        return JSON.parse(fs.readFileSync(SETTINGS_FILE));
    } catch (e) { return {}; }
}

// Save settings
function saveSettings(data) {
    fs.writeFileSync(SETTINGS_FILE, JSON.stringify(data, null, 2));
}

// State untuk menyimpan proses input (seperti set media/caption)
const inputState = {};

module.exports = (bot) => {

    // --- COMMAND /pengaturan ---
    bot.onText(/^\/pengaturan$/, (msg) => {
        const chatId = msg.chat.id;
        const userId = msg.from.id.toString();

        // Cek Owner
        if (userId !== OWNER_ID.toString()) {
            return bot.sendMessage(chatId, '❌ Menu ini khusus Owner Bot!');
        }

        const s = loadSettings();
        const type = s.menuType || 'text';

        // Format display type
        const typeDisplay = {
            'text': '📝 TEXT',
            'image': '🖼️ IMAGE',
            'video': '🎬 VIDEO',
            'audio': '🎵 AUDIO',
            'text_audio': '📝+🎵 TEXT + AUDIO',
            'image_audio': '🖼️+🎵 IMAGE + AUDIO',
            'video_audio': '🎬+🎵 VIDEO + AUDIO'
        };

        const text = `
<b>⚙️ 𝐏𝐄𝐍𝐆𝐀𝐓𝐔𝐑𝐀𝐍 𝐓𝐀𝐌𝐏𝐈𝐋𝐀𝐍 𝐁𝐎𝐓 v7.6</b>
<code>━━━━━━━━━━━━━━━━━━━━━━</code>

<blockquote>
🔧 <b>Menu Type:</b> ${typeDisplay[type] || type.toUpperCase()}
🖼️ <b>Media:</b> ${s.menuMedia ? '✅ Set' : '❌ Not Set'}
🎵 <b>Audio:</b> ${s.menuAudio ? '✅ Set' : '⚪ Not Set'}
📝 <b>Caption:</b> ${s.menuCaption ? '✅ Set' : '⚪ Default'}
</blockquote>

<i>Pilih tipe tampilan menu awal:</i>
`;

        const keyboard = {
            inline_keyboard: [
                [
                    { text: type === 'text' ? '✅ TEXT' : '📝 TEXT', callback_data: 'set_type_text' },
                    { text: type === 'image' ? '✅ IMAGE' : '🖼️ IMAGE', callback_data: 'set_type_image' },
                ],
                [
                    { text: type === 'video' ? '✅ VIDEO' : '🎬 VIDEO', callback_data: 'set_type_video' },
                    { text: type === 'audio' ? '✅ AUDIO' : '🎵 AUDIO', callback_data: 'set_type_audio' }
                ],
                [
                    { text: type === 'text_audio' ? '✅ TEXT+AUDIO' : '📝+🎵', callback_data: 'set_type_text_audio' },
                    { text: type === 'image_audio' ? '✅ IMG+AUDIO' : '🖼️+🎵', callback_data: 'set_type_image_audio' },
                    { text: type === 'video_audio' ? '✅ VID+AUDIO' : '🎬+🎵', callback_data: 'set_type_video_audio' }
                ],
                [
                    { text: '🖼️ SET MEDIA', callback_data: 'set_media' },
                    { text: '🎵 SET AUDIO', callback_data: 'set_audio' }
                ],
                [
                    { text: '📝 CAPTION', callback_data: 'set_caption' },
                    { text: '👁️ PREVIEW', callback_data: 'preview_menu' }
                ]
            ]
        };

        bot.sendMessage(chatId, text, { parse_mode: 'HTML', reply_markup: keyboard });
    });

    // --- CALLBACK QUERY ---
    bot.on('callback_query', async (query) => {
        const data = query.data;
        const chatId = query.message.chat.id;
        const msgId = query.message.message_id;
        const userId = query.from.id.toString();

        if (userId !== OWNER_ID.toString()) return;

        let s = loadSettings();

        // Handle type selection
        if (data.startsWith('set_type_')) {
            const newType = data.replace('set_type_', '');
            s.menuType = newType;
            saveSettings(s);

            // Untuk combo types (xxx_audio), minta setup sequential
            if (newType.endsWith('_audio')) {
                bot.answerCallbackQuery(query.id, { text: `✅ Tipe diubah ke ${newType.toUpperCase()}` });

                // Minta audio dulu, lalu media
                inputState[userId] = 'wait_combo_audio';

                bot.sendMessage(chatId, `
🎵 <b>SETUP COMBO ${newType.toUpperCase()}</b>

<b>Step 1/2:</b> Kirim file <b>AUDIO/MUSIK</b> dulu
• 🎵 Upload file MP3/Audio
• 🎤 Atau kirim Voice Note

<i>Setelah audio, akan diminta media (gambar/video)</i>

Ketik <code>cancel</code> untuk batal.
`, { parse_mode: 'HTML' });
                return;
            }

            bot.answerCallbackQuery(query.id, { text: `✅ Tipe menu diubah ke ${newType.toUpperCase()}` });

            // Refresh menu
            refreshSettingsMenu(bot, chatId, msgId, s);
        }

        // SET MEDIA
        else if (data === 'set_media') {
            bot.answerCallbackQuery(query.id);
            inputState[userId] = 'wait_media';
            bot.sendMessage(chatId, `
🖼️ <b>SET MEDIA</b>

Kirim salah satu:
• 📷 Upload Gambar
• 🎬 Upload Video
• 🔗 URL langsung (http://...)

Ketik <code>cancel</code> untuk batal.
`, { parse_mode: 'HTML' });
        }

        // SET AUDIO (untuk type audio saja atau combo)
        else if (data === 'set_audio') {
            bot.answerCallbackQuery(query.id);
            inputState[userId] = 'wait_audio';
            bot.sendMessage(chatId, `
🎵 <b>SET AUDIO</b>

Kirim file audio/musik:
• 🎵 Upload file MP3/Audio
• 🎤 Kirim Voice Note

Ketik <code>cancel</code> untuk batal.
`, { parse_mode: 'HTML' });
        }

        // SET CAPTION
        else if (data === 'set_caption') {
            bot.answerCallbackQuery(query.id);
            inputState[userId] = 'wait_caption';
            bot.sendMessage(chatId, '📝 <b>Kirim teks caption baru untuk menu utama!</b>\n\nKetik <code>cancel</code> untuk batal.', { parse_mode: 'HTML' });
        }

        // PREVIEW MENU
        else if (data === 'preview_menu') {
            bot.answerCallbackQuery(query.id);
            bot.sendMessage(chatId, '👁️ Silahkan ketik /start untuk melihat hasil perubahan.');
        }
    });

    // Helper: Refresh settings menu
    function refreshSettingsMenu(bot, chatId, msgId, s) {
        const type = s.menuType || 'text';

        const typeDisplay = {
            'text': '📝 TEXT',
            'image': '🖼️ IMAGE',
            'video': '🎬 VIDEO',
            'audio': '🎵 AUDIO',
            'text_audio': '📝+🎵 TEXT + AUDIO',
            'image_audio': '🖼️+🎵 IMAGE + AUDIO',
            'video_audio': '🎬+🎵 VIDEO + AUDIO'
        };

        const keyboard = {
            inline_keyboard: [
                [
                    { text: type === 'text' ? '✅ TEXT' : '📝 TEXT', callback_data: 'set_type_text' },
                    { text: type === 'image' ? '✅ IMAGE' : '🖼️ IMAGE', callback_data: 'set_type_image' },
                ],
                [
                    { text: type === 'video' ? '✅ VIDEO' : '🎬 VIDEO', callback_data: 'set_type_video' },
                    { text: type === 'audio' ? '✅ AUDIO' : '🎵 AUDIO', callback_data: 'set_type_audio' }
                ],
                [
                    { text: type === 'text_audio' ? '✅ TEXT+AUDIO' : '📝+🎵', callback_data: 'set_type_text_audio' },
                    { text: type === 'image_audio' ? '✅ IMG+AUDIO' : '🖼️+🎵', callback_data: 'set_type_image_audio' },
                    { text: type === 'video_audio' ? '✅ VID+AUDIO' : '🎬+🎵', callback_data: 'set_type_video_audio' }
                ],
                [
                    { text: '🖼️ SET MEDIA', callback_data: 'set_media' },
                    { text: '🎵 SET AUDIO', callback_data: 'set_audio' }
                ],
                [
                    { text: '📝 CAPTION', callback_data: 'set_caption' },
                    { text: '👁️ PREVIEW', callback_data: 'preview_menu' }
                ]
            ]
        };

        const text = `
<b>⚙️ 𝐏𝐄𝐍𝐆𝐀𝐓𝐔𝐑𝐀𝐍 𝐓𝐀𝐌𝐏𝐈𝐋𝐀𝐍 𝐁𝐎𝐓 v7.6</b>
<code>━━━━━━━━━━━━━━━━━━━━━━</code>

<blockquote>
🔧 <b>Menu Type:</b> ${typeDisplay[type] || type.toUpperCase()}
🖼️ <b>Media:</b> ${s.menuMedia ? '✅ Set' : '❌ Not Set'}
🎵 <b>Audio:</b> ${s.menuAudio ? '✅ Set' : '⚪ Not Set'}
📝 <b>Caption:</b> ${s.menuCaption ? '✅ Set' : '⚪ Default'}
</blockquote>

<i>Pilih tipe tampilan menu awal:</i>
`;
        bot.editMessageText(text, { chat_id: chatId, message_id: msgId, parse_mode: 'HTML', reply_markup: keyboard });
    }

    // --- HANDLE INPUT (MEDIA / AUDIO / CAPTION) ---
    bot.on('message', (msg) => {
        const chatId = msg.chat.id;
        const userId = msg.from.id.toString();
        const text = msg.text || '';

        if (inputState[userId]) {
            if (text.toLowerCase() === 'cancel') {
                delete inputState[userId];
                return bot.sendMessage(chatId, '🚫 Input dibatalkan. Ketik /pengaturan untuk kembali.');
            }

            let s = loadSettings();

            // WAIT MEDIA
            if (inputState[userId] === 'wait_media') {
                let mediaUrl = '';

                if (msg.photo) {
                    mediaUrl = msg.photo[msg.photo.length - 1].file_id;
                } else if (msg.video) {
                    mediaUrl = msg.video.file_id;
                } else if (msg.document) {
                    mediaUrl = msg.document.file_id;
                } else if (text.startsWith('http')) {
                    mediaUrl = text;
                } else {
                    return bot.sendMessage(chatId, '❌ Mohon kirim URL valid atau upload gambar/video!');
                }

                s.menuMedia = mediaUrl;
                saveSettings(s);
                delete inputState[userId];
                bot.sendMessage(chatId, '✅ Media berhasil disimpan!\n\nKetik /pengaturan untuk kembali.');
            }

            // WAIT AUDIO (standalone)
            else if (inputState[userId] === 'wait_audio') {
                let audioId = '';

                if (msg.audio) {
                    audioId = msg.audio.file_id;
                } else if (msg.voice) {
                    audioId = msg.voice.file_id;
                } else if (msg.document && msg.document.mime_type && msg.document.mime_type.startsWith('audio')) {
                    audioId = msg.document.file_id;
                } else {
                    return bot.sendMessage(chatId, '❌ Mohon kirim file audio/MP3 atau voice note!');
                }

                s.menuAudio = audioId;
                saveSettings(s);
                delete inputState[userId];
                bot.sendMessage(chatId, '✅ Audio berhasil disimpan!\n\nKetik /pengaturan untuk kembali.');
            }

            // WAIT COMBO AUDIO (Step 1 - Audio first)
            else if (inputState[userId] === 'wait_combo_audio') {
                let audioId = '';

                if (msg.audio) {
                    audioId = msg.audio.file_id;
                } else if (msg.voice) {
                    audioId = msg.voice.file_id;
                } else if (msg.document && msg.document.mime_type && msg.document.mime_type.startsWith('audio')) {
                    audioId = msg.document.file_id;
                } else {
                    return bot.sendMessage(chatId, '❌ Mohon kirim file audio/MP3 atau voice note!');
                }

                s.menuAudio = audioId;
                saveSettings(s);

                // Step 2 - Now ask for media
                inputState[userId] = 'wait_combo_media';

                bot.sendMessage(chatId, `
✅ <b>Audio tersimpan!</b>

<b>Step 2/2:</b> Sekarang kirim <b>MEDIA</b>
• 📷 Upload Gambar
• 🎬 Upload Video
• 🔗 URL langsung (http://...)

Ketik <code>cancel</code> untuk batal.
`, { parse_mode: 'HTML' });
            }

            // WAIT COMBO MEDIA (Step 2 - Media after audio)
            else if (inputState[userId] === 'wait_combo_media') {
                let mediaUrl = '';

                if (msg.photo) {
                    mediaUrl = msg.photo[msg.photo.length - 1].file_id;
                } else if (msg.video) {
                    mediaUrl = msg.video.file_id;
                } else if (msg.document) {
                    mediaUrl = msg.document.file_id;
                } else if (text.startsWith('http')) {
                    mediaUrl = text;
                } else {
                    return bot.sendMessage(chatId, '❌ Mohon kirim URL valid atau upload gambar/video!');
                }

                s.menuMedia = mediaUrl;
                saveSettings(s);
                delete inputState[userId];

                bot.sendMessage(chatId, `
✅ <b>SETUP COMBO SELESAI!</b>

🎵 Audio: ✅ Tersimpan
🖼️ Media: ✅ Tersimpan

Ketik /pengaturan untuk kembali atau /start untuk preview.
`, { parse_mode: 'HTML' });
            }

            // WAIT CAPTION
            else if (inputState[userId] === 'wait_caption') {
                if (!text) return bot.sendMessage(chatId, '❌ Mohon kirim teks caption!');

                s.menuCaption = text;
                saveSettings(s);
                delete inputState[userId];
                bot.sendMessage(chatId, '✅ Caption berhasil disimpan!\n\nKetik /pengaturan untuk kembali.');
            }
        }
    });
};
