/**
 * ═══════════════════════════════════════════════════════════════
 *  🛡️ SCHNUFFELLL GROUP GUARD - Ultimate Telegram Group Protection
 *  Developer: @schnuffelll
 *  Version: 3.0 ULTIMATE
 *  Features: 50+ Protection Features
 * ═══════════════════════════════════════════════════════════════
 */

const fs = require('fs');
const path = require('path');
const settings = require('../config.js');

const OWNER_ID = settings.ownerId;
const GUARD_DB = './db/guard_settings.json';
const WARN_DB = './db/warn_users.json';
const MUTE_DB = './db/mute_users.json';
const FILTER_DB = './db/word_filters.json';
const AUTOREPLY_DB = './db/auto_replies.json';

// ═══════════════════════════════════════════════════════════════
// DATABASE FUNCTIONS
// ═══════════════════════════════════════════════════════════════

function ensureDBFiles() {
    const dbs = [GUARD_DB, WARN_DB, MUTE_DB, FILTER_DB, AUTOREPLY_DB];
    dbs.forEach(db => {
        if (!fs.existsSync(db)) fs.writeFileSync(db, '{}');
    });
}

function loadDB(file) {
    try {
        if (fs.existsSync(file)) return JSON.parse(fs.readFileSync(file, 'utf8'));
    } catch (e) { console.error('DB Error:', e); }
    return {};
}

function saveDB(file, data) {
    try {
        fs.writeFileSync(file, JSON.stringify(data, null, 2));
        return true;
    } catch (e) { return false; }
}

function getGroupSettings(chatId) {
    const db = loadDB(GUARD_DB);
    if (!db[chatId]) {
        db[chatId] = {
            // Anti Features
            antilink: false,
            antispam: false,
            antibot: false,
            antisticker: false,
            antigif: false,
            antiforward: false,
            antiarab: false,
            antichinese: false,
            antinsfw: false,
            antivirtex: false,
            antitagall: false,
            antiflood: false,
            antiphoto: false,
            antivideo: false,
            antiaudio: false,
            antidoc: false,
            antivoice: false,
            antilocation: false,
            anticontact: false,
            antigame: false,
            antipoll: false,
            antidice: false,
            antiinline: false,
            antitoxic: false,
            antilongtext: false,
            antichannelpost: false,
            // Group Settings
            welcome: true,
            goodbye: true,
            welcomeMsg: '👋 Selamat datang {user} di {group}!\n\n📌 Rules: Jangan spam, jangan toxic!',
            goodbyeMsg: '👋 Sampai jumpa {user}!',
            warnLimit: 3,
            muteTime: 10,
            locked: false,
            slowmode: 0,
            onlyAdmin: false,
            captcha: false,
            maxWarn: 3,
            floodCount: 5,
            floodTime: 10,
            maxTextLength: 4000,
            autoDeleteWarn: true,
            autoKick: false
        };
        saveDB(GUARD_DB, db);
    }
    return db[chatId];
}

function updateSetting(chatId, key, value) {
    const db = loadDB(GUARD_DB);
    if (!db[chatId]) db[chatId] = getGroupSettings(chatId);
    db[chatId][key] = value;
    saveDB(GUARD_DB, db);
    return db[chatId];
}

// Warning System
function addWarning(chatId, userId) {
    const db = loadDB(WARN_DB);
    const key = `${chatId}_${userId}`;
    db[key] = (db[key] || 0) + 1;
    saveDB(WARN_DB, db);
    return db[key];
}

function getWarnings(chatId, userId) {
    return loadDB(WARN_DB)[`${chatId}_${userId}`] || 0;
}

function resetWarnings(chatId, userId) {
    const db = loadDB(WARN_DB);
    delete db[`${chatId}_${userId}`];
    saveDB(WARN_DB, db);
}

// Word Filter System
function getFilters(chatId) {
    const db = loadDB(FILTER_DB);
    return db[chatId] || [];
}

function addFilter(chatId, word) {
    const db = loadDB(FILTER_DB);
    if (!db[chatId]) db[chatId] = [];
    if (!db[chatId].includes(word.toLowerCase())) {
        db[chatId].push(word.toLowerCase());
        saveDB(FILTER_DB, db);
        return true;
    }
    return false;
}

function removeFilter(chatId, word) {
    const db = loadDB(FILTER_DB);
    if (!db[chatId]) return false;
    const idx = db[chatId].indexOf(word.toLowerCase());
    if (idx > -1) {
        db[chatId].splice(idx, 1);
        saveDB(FILTER_DB, db);
        return true;
    }
    return false;
}

// Auto Reply System
function getAutoReplies(chatId) {
    const db = loadDB(AUTOREPLY_DB);
    return db[chatId] || {};
}

function addAutoReply(chatId, trigger, response) {
    const db = loadDB(AUTOREPLY_DB);
    if (!db[chatId]) db[chatId] = {};
    db[chatId][trigger.toLowerCase()] = response;
    saveDB(AUTOREPLY_DB, db);
}

function removeAutoReply(chatId, trigger) {
    const db = loadDB(AUTOREPLY_DB);
    if (!db[chatId]) return false;
    if (db[chatId][trigger.toLowerCase()]) {
        delete db[chatId][trigger.toLowerCase()];
        saveDB(AUTOREPLY_DB, db);
        return true;
    }
    return false;
}

// Flood Detection
const floodMap = new Map();
function checkFlood(chatId, userId, maxCount, timeWindow) {
    const key = `${chatId}_${userId}`;
    const now = Date.now();
    if (!floodMap.has(key)) {
        floodMap.set(key, [now]);
        return false;
    }
    const times = floodMap.get(key).filter(t => now - t < timeWindow * 1000);
    times.push(now);
    floodMap.set(key, times);
    return times.length > maxCount;
}

// ═══════════════════════════════════════════════════════════════
// HELPER FUNCTIONS
// ═══════════════════════════════════════════════════════════════

async function isAdmin(bot, chatId, userId) {
    try {
        const member = await bot.getChatMember(chatId, userId);
        return ['creator', 'administrator'].includes(member.status);
    } catch (e) { return false; }
}

async function isBotAdmin(bot, chatId) {
    try {
        const me = await bot.getMe();
        return await isAdmin(bot, chatId, me.id);
    } catch (e) { return false; }
}

const linkRegex = /(https?:\/\/[^\s]+)|(t\.me\/[^\s]+)|(bit\.ly\/[^\s]+)|(wa\.me\/[^\s]+)/gi;
const arabicRegex = /[\u0600-\u06FF]/;
const chineseRegex = /[\u4e00-\u9fff]/;
const virtexRegex = /[\u0300-\u036f\u1ab0-\u1aff\u1dc0-\u1dff\u20d0-\u20ff\ufe20-\ufe2f]{3,}/;
const toxicWords = ['anjing', 'bangsat', 'kontol', 'memek', 'goblok', 'tolol', 'babi', 'tai', 'asu', 'jancok'];

// ═══════════════════════════════════════════════════════════════
// MAIN MODULE
// ═══════════════════════════════════════════════════════════════

module.exports = (bot) => {

    ensureDBFiles();

    // ═══════════════════════════════════════════════════════════
    // GUARD PANEL - Main Menu
    // ═══════════════════════════════════════════════════════════

    bot.onText(/^\/guard$/i, async (msg) => {
        const chatId = msg.chat.id;
        const userId = msg.from.id;

        if (msg.chat.type === 'private') {
            return bot.sendMessage(chatId, '❌ Perintah ini hanya bisa digunakan di grup!');
        }

        const isUserAdmin = await isAdmin(bot, chatId, userId);
        if (!isUserAdmin && userId.toString() !== OWNER_ID.toString()) {
            return bot.sendMessage(chatId, '❌ Hanya admin grup yang bisa mengakses panel guard!');
        }

        const s = getGroupSettings(chatId);
        const menuText = generateMainMenu(s);

        bot.sendMessage(chatId, menuText, {
            parse_mode: 'HTML',
            reply_markup: generateMainKeyboard(chatId, s)
        });
    });

    // Generate Main Menu Text
    function generateMainMenu(s) {
        return `
╔══════════════════════════════════╗
║  🛡️ <b>GUARD CONTROL PANEL v3.0</b>  ║
╠══════════════════════════════════╣
║ Ultimate Group Protection System ║
╚══════════════════════════════════╝

┌─「 📊 <b>STATUS OVERVIEW</b> 」
│
│ 🔒 Group: ${s.locked ? '🟢 LOCKED' : '🔴 UNLOCKED'}
│ 👤 Only Admin: ${s.onlyAdmin ? '🟢 ON' : '🔴 OFF'}
│ ⏱️ Slowmode: ${s.slowmode}s
│ ⚠️ Warn Limit: ${s.warnLimit}x
│
└───────────────────────

<i>💡 Pilih kategori di bawah untuk mengatur fitur!</i>`;
    }

    // Generate Main Keyboard
    function generateMainKeyboard(chatId, s) {
        return {
            inline_keyboard: [
                [
                    { text: '🛡️ ANTI FEATURES', callback_data: `grd_anti1_${chatId}` },
                    { text: '🛡️ ANTI MORE', callback_data: `grd_anti2_${chatId}` }
                ],
                [
                    { text: '⚙️ SETTINGS', callback_data: `grd_settings_${chatId}` },
                    { text: '📝 FILTERS', callback_data: `grd_filters_${chatId}` }
                ],
                [
                    { text: '👮 MODERASI', callback_data: `grd_mod_${chatId}` },
                    { text: '🤖 AUTO REPLY', callback_data: `grd_autoreply_${chatId}` }
                ],
                [
                    { text: s.locked ? '🔓 UNLOCK GRUP' : '🔒 LOCK GRUP', callback_data: `grd_lock_${chatId}` }
                ],
                [
                    { text: '🔄 REFRESH', callback_data: `grd_refresh_${chatId}` },
                    { text: '❓ HELP', callback_data: `grd_help_${chatId}` }
                ]
            ]
        };
    }

    // ═══════════════════════════════════════════════════════════
    // CALLBACK QUERY HANDLER
    // ═══════════════════════════════════════════════════════════

    bot.on('callback_query', async (query) => {
        const data = query.data;
        if (!data.startsWith('grd_')) return;

        const chatId = query.message.chat.id;
        const msgId = query.message.message_id;
        const userId = query.from.id;

        const isUserAdmin = await isAdmin(bot, chatId, userId);
        if (!isUserAdmin && userId.toString() !== OWNER_ID.toString()) {
            return bot.answerCallbackQuery(query.id, { text: '❌ Kamu bukan admin!', show_alert: true });
        }

        const parts = data.split('_');
        const action = parts[1];
        // FIX: Jika action 't' (toggle), chatId ada di index 3. Jika bukan, di index 2.
        const targetChat = (action === 't') ? parts[3] : parts[2];
        const s = getGroupSettings(targetChat);

        try {
            // ANTI FEATURES PAGE 1
            if (action === 'anti1') {
                const menuText = `
╔══════════════════════════════════╗
║  🛡️ <b>ANTI FEATURES (1/2)</b>  ║
╚══════════════════════════════════╝

┌─「 🔒 <b>PROTECTION STATUS</b> 」
│
│ ${s.antilink ? '🟢' : '🔴'} Anti-Link
│ ${s.antispam ? '🟢' : '🔴'} Anti-Spam
│ ${s.antibot ? '🟢' : '🔴'} Anti-Bot
│ ${s.antisticker ? '🟢' : '🔴'} Anti-Sticker
│ ${s.antigif ? '🟢' : '🔴'} Anti-GIF
│ ${s.antiforward ? '🟢' : '🔴'} Anti-Forward
│ ${s.antiarab ? '🟢' : '🔴'} Anti-Arab
│ ${s.antichinese ? '🟢' : '🔴'} Anti-Chinese
│
└───────────────────────

<i>💡 Tekan tombol untuk toggle ON/OFF</i>`;

                await bot.editMessageText(menuText, {
                    chat_id: chatId,
                    message_id: msgId,
                    parse_mode: 'HTML',
                    reply_markup: {
                        inline_keyboard: [
                            [
                                { text: s.antilink ? '🟢 AntiLink' : '🔴 AntiLink', callback_data: `grd_t_antilink_${targetChat}` },
                                { text: s.antispam ? '🟢 AntiSpam' : '🔴 AntiSpam', callback_data: `grd_t_antispam_${targetChat}` }
                            ],
                            [
                                { text: s.antibot ? '🟢 AntiBot' : '🔴 AntiBot', callback_data: `grd_t_antibot_${targetChat}` },
                                { text: s.antisticker ? '🟢 AntiSticker' : '🔴 AntiSticker', callback_data: `grd_t_antisticker_${targetChat}` }
                            ],
                            [
                                { text: s.antigif ? '🟢 AntiGIF' : '🔴 AntiGIF', callback_data: `grd_t_antigif_${targetChat}` },
                                { text: s.antiforward ? '🟢 AntiForward' : '🔴 AntiForward', callback_data: `grd_t_antiforward_${targetChat}` }
                            ],
                            [
                                { text: s.antiarab ? '🟢 AntiArab' : '🔴 AntiArab', callback_data: `grd_t_antiarab_${targetChat}` },
                                { text: s.antichinese ? '🟢 AntiChinese' : '🔴 AntiChinese', callback_data: `grd_t_antichinese_${targetChat}` }
                            ],
                            [
                                { text: '➡️ NEXT PAGE', callback_data: `grd_anti2_${targetChat}` },
                                { text: '⬅️ BACK', callback_data: `grd_main_${targetChat}` }
                            ]
                        ]
                    }
                });
                bot.answerCallbackQuery(query.id);
            }

            // ANTI FEATURES PAGE 2
            else if (action === 'anti2') {
                const menuText = `
╔══════════════════════════════════╗
║  🛡️ <b>ANTI FEATURES (2/2)</b>  ║
╚══════════════════════════════════╝

┌─「 🔒 <b>ADVANCED PROTECTION</b> 」
│
│ ${s.antivirtex ? '🟢' : '🔴'} Anti-Virtex
│ ${s.antiflood ? '🟢' : '🔴'} Anti-Flood
│ ${s.antitagall ? '🟢' : '🔴'} Anti-Tagall
│ ${s.antitoxic ? '🟢' : '🔴'} Anti-Toxic
│ ${s.antiphoto ? '🟢' : '🔴'} Anti-Photo
│ ${s.antivideo ? '🟢' : '🔴'} Anti-Video
│ ${s.antiaudio ? '🟢' : '🔴'} Anti-Audio
│ ${s.antidoc ? '🟢' : '🔴'} Anti-Document
│ ${s.antivoice ? '🟢' : '🔴'} Anti-Voice
│ ${s.antiinline ? '🟢' : '🔴'} Anti-Inline
│
└───────────────────────`;

                await bot.editMessageText(menuText, {
                    chat_id: chatId,
                    message_id: msgId,
                    parse_mode: 'HTML',
                    reply_markup: {
                        inline_keyboard: [
                            [
                                { text: s.antivirtex ? '🟢 AntiVirtex' : '🔴 AntiVirtex', callback_data: `grd_t_antivirtex_${targetChat}` },
                                { text: s.antiflood ? '🟢 AntiFlood' : '🔴 AntiFlood', callback_data: `grd_t_antiflood_${targetChat}` }
                            ],
                            [
                                { text: s.antitagall ? '🟢 AntiTagall' : '🔴 AntiTagall', callback_data: `grd_t_antitagall_${targetChat}` },
                                { text: s.antitoxic ? '🟢 AntiToxic' : '🔴 AntiToxic', callback_data: `grd_t_antitoxic_${targetChat}` }
                            ],
                            [
                                { text: s.antiphoto ? '🟢 AntiPhoto' : '🔴 AntiPhoto', callback_data: `grd_t_antiphoto_${targetChat}` },
                                { text: s.antivideo ? '🟢 AntiVideo' : '🔴 AntiVideo', callback_data: `grd_t_antivideo_${targetChat}` }
                            ],
                            [
                                { text: s.antiaudio ? '🟢 AntiAudio' : '🔴 AntiAudio', callback_data: `grd_t_antiaudio_${targetChat}` },
                                { text: s.antidoc ? '🟢 AntiDoc' : '🔴 AntiDoc', callback_data: `grd_t_antidoc_${targetChat}` }
                            ],
                            [
                                { text: s.antivoice ? '🟢 AntiVoice' : '🔴 AntiVoice', callback_data: `grd_t_antivoice_${targetChat}` },
                                { text: s.antiinline ? '🟢 AntiInline' : '🔴 AntiInline', callback_data: `grd_t_antiinline_${targetChat}` }
                            ],
                            [
                                { text: '⬅️ PREV PAGE', callback_data: `grd_anti1_${targetChat}` },
                                { text: '🏠 MAIN', callback_data: `grd_main_${targetChat}` }
                            ]
                        ]
                    }
                });
                bot.answerCallbackQuery(query.id);
            }

            // SETTINGS MENU
            else if (action === 'settings') {
                const menuText = `
╔══════════════════════════════════╗
║  ⚙️ <b>SETTINGS MENU</b>  ║
╚══════════════════════════════════╝

┌─「 🔧 <b>GROUP SETTINGS</b> 」
│
│ 🔒 Lock Status: ${s.locked ? '🟢 LOCKED' : '🔴 UNLOCKED'}
│ 👤 Only Admin: ${s.onlyAdmin ? '🟢 ON' : '🔴 OFF'}
│ 👋 Welcome: ${s.welcome ? '🟢 ON' : '🔴 OFF'}
│ 👋 Goodbye: ${s.goodbye ? '🟢 ON' : '🔴 OFF'}
│ ⏱️ Slowmode: ${s.slowmode}s
│ ⚠️ Warn Limit: ${s.warnLimit}x
│ 🔇 Mute Time: ${s.muteTime}m
│ 📏 Max Text: ${s.maxTextLength} chars
│ 🚀 Flood: ${s.floodCount} msg/${s.floodTime}s
│
└───────────────────────

<i>💡 Gunakan command untuk mengatur nilai</i>`;

                await bot.editMessageText(menuText, {
                    chat_id: chatId,
                    message_id: msgId,
                    parse_mode: 'HTML',
                    reply_markup: {
                        inline_keyboard: [
                            [
                                { text: s.locked ? '🔓 UNLOCK' : '🔒 LOCK', callback_data: `grd_lock_${targetChat}` },
                                { text: s.onlyAdmin ? '👤 ADMIN ONLY: ON' : '👥 ADMIN ONLY: OFF', callback_data: `grd_t_onlyAdmin_${targetChat}` }
                            ],
                            [
                                { text: s.welcome ? '👋 Welcome: ON' : '👋 Welcome: OFF', callback_data: `grd_t_welcome_${targetChat}` },
                                { text: s.goodbye ? '👋 Goodbye: ON' : '👋 Goodbye: OFF', callback_data: `grd_t_goodbye_${targetChat}` }
                            ],
                            [
                                { text: '⏱️ Slowmode', callback_data: `grd_slowmode_${targetChat}` },
                                { text: '⚠️ Warn Limit', callback_data: `grd_warnlimit_${targetChat}` }
                            ],
                            [
                                { text: '📝 SET WELCOME', callback_data: `grd_setwelcome_${targetChat}` },
                                { text: '📝 SET GOODBYE', callback_data: `grd_setgoodbye_${targetChat}` }
                            ],
                            [
                                { text: '⬅️ BACK', callback_data: `grd_main_${targetChat}` }
                            ]
                        ]
                    }
                });
                bot.answerCallbackQuery(query.id);
            }

            // FILTERS MENU
            else if (action === 'filters') {
                const filters = getFilters(targetChat);
                const filterList = filters.length > 0 ? filters.slice(0, 10).join(', ') : 'Belum ada filter';

                const menuText = `
╔══════════════════════════════════╗
║  📝 <b>WORD FILTER MENU</b>  ║
╚══════════════════════════════════╝

┌─「 🔤 <b>BADWORD FILTER</b> 」
│
│ Total Filter: ${filters.length} kata
│ 
│ 📋 Daftar Filter:
│ ${filterList}${filters.length > 10 ? '...' : ''}
│
├─「 📌 <b>COMMANDS</b> 」
│
│ /addfilter &lt;kata&gt; - Tambah filter
│ /delfilter &lt;kata&gt; - Hapus filter
│ /listfilter - Lihat semua filter
│ /clearfilter - Hapus semua filter
│
└───────────────────────`;

                await bot.editMessageText(menuText, {
                    chat_id: chatId,
                    message_id: msgId,
                    parse_mode: 'HTML',
                    reply_markup: {
                        inline_keyboard: [
                            [
                                { text: '📋 LIST FILTER', callback_data: `grd_listfilter_${targetChat}` },
                                { text: '🗑️ CLEAR ALL', callback_data: `grd_clearfilter_${targetChat}` }
                            ],
                            [
                                { text: '⬅️ BACK', callback_data: `grd_main_${targetChat}` }
                            ]
                        ]
                    }
                });
                bot.answerCallbackQuery(query.id);
            }

            // MODERATION MENU
            else if (action === 'mod') {
                const menuText = `
╔══════════════════════════════════╗
║  👮 <b>MODERASI MENU</b>  ║
╚══════════════════════════════════╝

┌─「 🔨 <b>MODERATION COMMANDS</b> 」
│
│ /kick - Kick user (reply/id)
│ /ban - Ban user (reply/id)
│ /unban &lt;id&gt; - Unban user
│ /mute [menit] - Mute user
│ /unmute - Unmute user
│ /warn - Warn user
│ /unwarn - Reset warning
│
├─「 👑 <b>ADMIN COMMANDS</b> 」
│
│ /promote - Jadikan admin
│ /demote - Cabut admin
│ /pin - Pin pesan (reply)
│ /unpin - Unpin semua
│
├─「 🧹 <b>CLEAN COMMANDS</b> 」
│
│ /del - Hapus pesan (reply)
│ /purge &lt;n&gt; - Hapus n pesan
│ /kickall - Kick semua member
│
└───────────────────────

<i>💡 Semua command support reply!</i>`;

                await bot.editMessageText(menuText, {
                    chat_id: chatId,
                    message_id: msgId,
                    parse_mode: 'HTML',
                    reply_markup: {
                        inline_keyboard: [
                            [
                                { text: '🧹 CLEAN BOTS', callback_data: `grd_cleanbots_${targetChat}` },
                                { text: '👥 MEMBER COUNT', callback_data: `grd_membercount_${targetChat}` }
                            ],
                            [
                                { text: '⬅️ BACK', callback_data: `grd_main_${targetChat}` }
                            ]
                        ]
                    }
                });
                bot.answerCallbackQuery(query.id);
            }

            // AUTO REPLY MENU
            else if (action === 'autoreply') {
                const replies = getAutoReplies(targetChat);
                const triggers = Object.keys(replies);
                const replyList = triggers.length > 0 ? triggers.slice(0, 5).join(', ') : 'Belum ada auto reply';

                const menuText = `
╔══════════════════════════════════╗
║  🤖 <b>AUTO REPLY MENU</b>  ║
╚══════════════════════════════════╝

┌─「 💬 <b>AUTO REPLY STATUS</b> 」
│
│ Total: ${triggers.length} auto reply
│
│ 📋 Triggers:
│ ${replyList}${triggers.length > 5 ? '...' : ''}
│
├─「 📌 <b>COMMANDS</b> 」
│
│ /addreply &lt;trigger&gt;|&lt;balasan&gt;
│ /delreply &lt;trigger&gt;
│ /listreply - Lihat semua
│
└───────────────────────`;

                await bot.editMessageText(menuText, {
                    chat_id: chatId,
                    message_id: msgId,
                    parse_mode: 'HTML',
                    reply_markup: {
                        inline_keyboard: [
                            [
                                { text: '📋 LIST REPLY', callback_data: `grd_listreply_${targetChat}` },
                                { text: '🗑️ CLEAR ALL', callback_data: `grd_clearreply_${targetChat}` }
                            ],
                            [
                                { text: '⬅️ BACK', callback_data: `grd_main_${targetChat}` }
                            ]
                        ]
                    }
                });
                bot.answerCallbackQuery(query.id);
            }

            // TOGGLE FEATURES
            else if (action === 't') {
                const feature = parts[2];
                const newSettings = updateSetting(targetChat, feature, !s[feature]);
                bot.answerCallbackQuery(query.id, {
                    text: `✅ ${feature} ${newSettings[feature] ? 'AKTIF' : 'NONAKTIF'}!`
                });
                // Refresh current page
                if (['antilink', 'antispam', 'antibot', 'antisticker', 'antigif', 'antiforward', 'antiarab', 'antichinese'].includes(feature)) {
                    query.data = `grd_anti1_${targetChat}`;
                } else if (['antivirtex', 'antiflood', 'antitagall', 'antitoxic', 'antiphoto', 'antivideo', 'antiaudio', 'antidoc', 'antivoice', 'antiinline'].includes(feature)) {
                    query.data = `grd_anti2_${targetChat}`;
                } else {
                    query.data = `grd_settings_${targetChat}`;
                }
                // Recursive call to refresh
                bot.emit('callback_query', query);
            }

            // LOCK/UNLOCK GROUP
            else if (action === 'lock') {
                const newLocked = !s.locked;
                updateSetting(targetChat, 'locked', newLocked);

                try {
                    await bot.setChatPermissions(targetChat, {
                        can_send_messages: !newLocked,
                        can_send_media_messages: !newLocked,
                        can_send_polls: !newLocked,
                        can_send_other_messages: !newLocked,
                        can_add_web_page_previews: !newLocked,
                        can_change_info: false,
                        can_invite_users: !newLocked,
                        can_pin_messages: false
                    });
                    bot.answerCallbackQuery(query.id, {
                        text: newLocked ? '🔒 Grup TERKUNCI!' : '🔓 Grup TERBUKA!',
                        show_alert: true
                    });
                } catch (e) {
                    bot.answerCallbackQuery(query.id, { text: '❌ Gagal! Bot butuh jadi admin.', show_alert: true });
                }

                query.data = `grd_main_${targetChat}`;
                bot.emit('callback_query', query);
            }

            // MAIN MENU (BACK)
            else if (action === 'main') {
                const menuText = generateMainMenu(s);
                await bot.editMessageText(menuText, {
                    chat_id: chatId,
                    message_id: msgId,
                    parse_mode: 'HTML',
                    reply_markup: generateMainKeyboard(targetChat, s)
                });
                bot.answerCallbackQuery(query.id);
            }

            // REFRESH
            else if (action === 'refresh') {
                const newS = getGroupSettings(targetChat);
                const menuText = generateMainMenu(newS);
                await bot.editMessageText(menuText, {
                    chat_id: chatId,
                    message_id: msgId,
                    parse_mode: 'HTML',
                    reply_markup: generateMainKeyboard(targetChat, newS)
                });
                bot.answerCallbackQuery(query.id, { text: '🔄 Refreshed!' });
            }

            // HELP
            else if (action === 'help') {
                const menuText = `
╔══════════════════════════════════╗
║  ❓ <b>GUARD HELP</b>  ║
╚══════════════════════════════════╝

<b>🛡️ ANTI FEATURES:</b>
Toggle perlindungan otomatis untuk grup

<b>⚙️ SETTINGS:</b>
Pengaturan grup seperti welcome, goodbye, slowmode

<b>📝 FILTERS:</b>
Blacklist kata-kata terlarang

<b>👮 MODERASI:</b>
Perintah untuk kick, ban, mute, warn

<b>🤖 AUTO REPLY:</b>
Balasan otomatis berdasarkan trigger

<b>📌 TIPS:</b>
• Semua perintah moderasi support reply
• Bot harus jadi admin dengan izin penuh
• Gunakan /guardhelp untuk bantuan lengkap`;

                await bot.editMessageText(menuText, {
                    chat_id: chatId,
                    message_id: msgId,
                    parse_mode: 'HTML',
                    reply_markup: {
                        inline_keyboard: [
                            [{ text: '⬅️ BACK', callback_data: `grd_main_${targetChat}` }]
                        ]
                    }
                });
                bot.answerCallbackQuery(query.id);
            }

            // SET WELCOME/GOODBYE INFO
            else if (action === 'setwelcome') {
                bot.answerCallbackQuery(query.id);
                bot.sendMessage(chatId, `📝 <b>Set Welcome Message</b>\n\nGunakan:\n<code>/setwelcome [pesan]</code>\n\n<b>Variables:</b>\n• {user} - Mention user\n• {group} - Nama grup\n• {id} - User ID\n• {count} - Jumlah member`, { parse_mode: 'HTML' });
            }

            else if (action === 'setgoodbye') {
                bot.answerCallbackQuery(query.id);
                bot.sendMessage(chatId, `📝 <b>Set Goodbye Message</b>\n\nGunakan:\n<code>/setgoodbye [pesan]</code>\n\n<b>Variables:</b>\n• {user} - Nama user\n• {group} - Nama grup`, { parse_mode: 'HTML' });
            }

            // SLOWMODE OPTIONS
            else if (action === 'slowmode') {
                const menuText = `⏱️ <b>Set Slowmode</b>\n\nPilih durasi slowmode:`;
                await bot.editMessageText(menuText, {
                    chat_id: chatId,
                    message_id: msgId,
                    parse_mode: 'HTML',
                    reply_markup: {
                        inline_keyboard: [
                            [
                                { text: '🚫 OFF', callback_data: `grd_sm_0_${targetChat}` },
                                { text: '10s', callback_data: `grd_sm_10_${targetChat}` },
                                { text: '30s', callback_data: `grd_sm_30_${targetChat}` }
                            ],
                            [
                                { text: '1m', callback_data: `grd_sm_60_${targetChat}` },
                                { text: '5m', callback_data: `grd_sm_300_${targetChat}` },
                                { text: '15m', callback_data: `grd_sm_900_${targetChat}` }
                            ],
                            [
                                { text: '1h', callback_data: `grd_sm_3600_${targetChat}` }
                            ],
                            [{ text: '⬅️ BACK', callback_data: `grd_settings_${targetChat}` }]
                        ]
                    }
                });
                bot.answerCallbackQuery(query.id);
            }

            // SET SLOWMODE VALUE
            else if (action === 'sm') {
                const seconds = parseInt(parts[2]);
                try {
                    await bot.setChatSlowMode ? await bot.setChatSlowMode(targetChat, seconds) : null;
                    updateSetting(targetChat, 'slowmode', seconds);
                    bot.answerCallbackQuery(query.id, { text: `✅ Slowmode: ${seconds}s`, show_alert: true });
                } catch (e) {
                    // Fallback if method not available
                    updateSetting(targetChat, 'slowmode', seconds);
                    bot.answerCallbackQuery(query.id, { text: `✅ Slowmode saved: ${seconds}s`, show_alert: true });
                }
                query.data = `grd_settings_${targetChat}`;
                bot.emit('callback_query', query);
            }

            // WARN LIMIT OPTIONS
            else if (action === 'warnlimit') {
                const menuText = `⚠️ <b>Set Warn Limit</b>\n\nBerapa warning sebelum auto-ban?`;
                await bot.editMessageText(menuText, {
                    chat_id: chatId,
                    message_id: msgId,
                    parse_mode: 'HTML',
                    reply_markup: {
                        inline_keyboard: [
                            [
                                { text: '2x', callback_data: `grd_wl_2_${targetChat}` },
                                { text: '3x', callback_data: `grd_wl_3_${targetChat}` },
                                { text: '5x', callback_data: `grd_wl_5_${targetChat}` }
                            ],
                            [
                                { text: '7x', callback_data: `grd_wl_7_${targetChat}` },
                                { text: '10x', callback_data: `grd_wl_10_${targetChat}` }
                            ],
                            [{ text: '⬅️ BACK', callback_data: `grd_settings_${targetChat}` }]
                        ]
                    }
                });
                bot.answerCallbackQuery(query.id);
            }

            // SET WARN LIMIT VALUE
            else if (action === 'wl') {
                const limit = parseInt(parts[2]);
                updateSetting(targetChat, 'warnLimit', limit);
                bot.answerCallbackQuery(query.id, { text: `✅ Warn limit: ${limit}x`, show_alert: true });
                query.data = `grd_settings_${targetChat}`;
                bot.emit('callback_query', query);
            }

            // LIST FILTER
            else if (action === 'listfilter') {
                const filters = getFilters(targetChat);
                if (filters.length === 0) {
                    bot.answerCallbackQuery(query.id, { text: 'Belum ada filter!', show_alert: true });
                } else {
                    bot.answerCallbackQuery(query.id);
                    bot.sendMessage(chatId, `📝 <b>Daftar Filter:</b>\n\n${filters.map((f, i) => `${i + 1}. ${f}`).join('\n')}`, { parse_mode: 'HTML' });
                }
            }

            // CLEAR FILTER
            else if (action === 'clearfilter') {
                const db = loadDB(FILTER_DB);
                db[targetChat] = [];
                saveDB(FILTER_DB, db);
                bot.answerCallbackQuery(query.id, { text: '✅ Semua filter dihapus!', show_alert: true });
            }

            // LIST REPLY
            else if (action === 'listreply') {
                const replies = getAutoReplies(targetChat);
                const triggers = Object.keys(replies);
                if (triggers.length === 0) {
                    bot.answerCallbackQuery(query.id, { text: 'Belum ada auto reply!', show_alert: true });
                } else {
                    bot.answerCallbackQuery(query.id);
                    bot.sendMessage(chatId, `🤖 <b>Auto Replies:</b>\n\n${triggers.map((t, i) => `${i + 1}. "${t}" → "${replies[t]}"`).join('\n')}`, { parse_mode: 'HTML' });
                }
            }

            // CLEAR REPLY
            else if (action === 'clearreply') {
                const db = loadDB(AUTOREPLY_DB);
                db[targetChat] = {};
                saveDB(AUTOREPLY_DB, db);
                bot.answerCallbackQuery(query.id, { text: '✅ Semua auto reply dihapus!', show_alert: true });
            }

            // MEMBER COUNT
            else if (action === 'membercount') {
                try {
                    const count = await bot.getChatMemberCount(targetChat);
                    bot.answerCallbackQuery(query.id, { text: `👥 Total Member: ${count}`, show_alert: true });
                } catch (e) {
                    bot.answerCallbackQuery(query.id, { text: '❌ Gagal mendapatkan jumlah member', show_alert: true });
                }
            }

        } catch (e) {
            console.error('Callback error:', e);
            bot.answerCallbackQuery(query.id, { text: '❌ Error occurred', show_alert: true });
        }
    });

    // ═══════════════════════════════════════════════════════════
    // TEXT COMMANDS
    // ═══════════════════════════════════════════════════════════

    // Set Welcome
    bot.onText(/^\/setwelcome (.+)/is, async (msg, match) => {
        const chatId = msg.chat.id;
        if (msg.chat.type === 'private') return;
        if (!(await isAdmin(bot, chatId, msg.from.id))) return bot.sendMessage(chatId, '❌ Hanya admin!');
        updateSetting(chatId, 'welcomeMsg', match[1]);
        bot.sendMessage(chatId, '✅ Welcome message berhasil diubah!', { reply_to_message_id: msg.message_id });
    });

    // Set Goodbye
    bot.onText(/^\/setgoodbye (.+)/is, async (msg, match) => {
        const chatId = msg.chat.id;
        if (msg.chat.type === 'private') return;
        if (!(await isAdmin(bot, chatId, msg.from.id))) return bot.sendMessage(chatId, '❌ Hanya admin!');
        updateSetting(chatId, 'goodbyeMsg', match[1]);
        bot.sendMessage(chatId, '✅ Goodbye message berhasil diubah!', { reply_to_message_id: msg.message_id });
    });

    // Add Filter
    bot.onText(/^\/addfilter (.+)$/i, async (msg, match) => {
        const chatId = msg.chat.id;
        if (msg.chat.type === 'private') return;
        if (!(await isAdmin(bot, chatId, msg.from.id))) return bot.sendMessage(chatId, '❌ Hanya admin!');
        if (addFilter(chatId, match[1])) {
            bot.sendMessage(chatId, `✅ Filter "${match[1]}" ditambahkan!`, { reply_to_message_id: msg.message_id });
        } else {
            bot.sendMessage(chatId, '❌ Filter sudah ada!', { reply_to_message_id: msg.message_id });
        }
    });

    // Del Filter
    bot.onText(/^\/delfilter (.+)$/i, async (msg, match) => {
        const chatId = msg.chat.id;
        if (msg.chat.type === 'private') return;
        if (!(await isAdmin(bot, chatId, msg.from.id))) return bot.sendMessage(chatId, '❌ Hanya admin!');
        if (removeFilter(chatId, match[1])) {
            bot.sendMessage(chatId, `✅ Filter "${match[1]}" dihapus!`, { reply_to_message_id: msg.message_id });
        } else {
            bot.sendMessage(chatId, '❌ Filter tidak ditemukan!', { reply_to_message_id: msg.message_id });
        }
    });

    // List Filter
    bot.onText(/^\/listfilter$/i, async (msg) => {
        const chatId = msg.chat.id;
        if (msg.chat.type === 'private') return;
        const filters = getFilters(chatId);
        if (filters.length === 0) {
            bot.sendMessage(chatId, '📝 Belum ada filter kata.');
        } else {
            bot.sendMessage(chatId, `📝 <b>Daftar Filter (${filters.length}):</b>\n\n${filters.map((f, i) => `${i + 1}. ${f}`).join('\n')}`, { parse_mode: 'HTML' });
        }
    });

    // Add Auto Reply
    bot.onText(/^\/addreply (.+)\|(.+)$/i, async (msg, match) => {
        const chatId = msg.chat.id;
        if (msg.chat.type === 'private') return;
        if (!(await isAdmin(bot, chatId, msg.from.id))) return bot.sendMessage(chatId, '❌ Hanya admin!');
        addAutoReply(chatId, match[1], match[2]);
        bot.sendMessage(chatId, `✅ Auto reply ditambahkan!\nTrigger: "${match[1]}"\nBalasan: "${match[2]}"`, { reply_to_message_id: msg.message_id });
    });

    // Del Auto Reply
    bot.onText(/^\/delreply (.+)$/i, async (msg, match) => {
        const chatId = msg.chat.id;
        if (msg.chat.type === 'private') return;
        if (!(await isAdmin(bot, chatId, msg.from.id))) return bot.sendMessage(chatId, '❌ Hanya admin!');
        if (removeAutoReply(chatId, match[1])) {
            bot.sendMessage(chatId, `✅ Auto reply "${match[1]}" dihapus!`, { reply_to_message_id: msg.message_id });
        } else {
            bot.sendMessage(chatId, '❌ Auto reply tidak ditemukan!', { reply_to_message_id: msg.message_id });
        }
    });

    // List Auto Reply
    bot.onText(/^\/listreply$/i, async (msg) => {
        const chatId = msg.chat.id;
        if (msg.chat.type === 'private') return;
        const replies = getAutoReplies(chatId);
        const triggers = Object.keys(replies);
        if (triggers.length === 0) {
            bot.sendMessage(chatId, '🤖 Belum ada auto reply.');
        } else {
            bot.sendMessage(chatId, `🤖 <b>Auto Replies (${triggers.length}):</b>\n\n${triggers.map((t, i) => `${i + 1}. "${t}" → "${replies[t]}"`).join('\n')}`, { parse_mode: 'HTML' });
        }
    });

    // ═══════════════════════════════════════════════════════════
    // MODERATION COMMANDS
    // ═══════════════════════════════════════════════════════════

    // KICK
    bot.onText(/^\/kick(?:\s+(\d+))?$/i, async (msg, match) => {
        const chatId = msg.chat.id;
        if (msg.chat.type === 'private') return;
        if (!(await isAdmin(bot, chatId, msg.from.id))) return bot.sendMessage(chatId, '❌ Hanya admin!');
        if (!(await isBotAdmin(bot, chatId))) return bot.sendMessage(chatId, '❌ Bot harus jadi admin!');

        let targetId = match[1], targetName = match[1];
        if (msg.reply_to_message) {
            targetId = msg.reply_to_message.from.id;
            targetName = msg.reply_to_message.from.first_name;
        }
        if (!targetId) return bot.sendMessage(chatId, '❌ Reply pesan atau: /kick <user_id>');

        try {
            await bot.banChatMember(chatId, targetId);
            await bot.unbanChatMember(chatId, targetId);
            bot.sendMessage(chatId, `✅ [${targetName}](tg://user?id=${targetId}) telah di-kick!`, { parse_mode: 'Markdown', reply_to_message_id: msg.message_id });
        } catch (e) { bot.sendMessage(chatId, `❌ Gagal: ${e.message}`); }
    });

    // BAN
    bot.onText(/^\/ban(?:\s+(\d+))?$/i, async (msg, match) => {
        const chatId = msg.chat.id;
        if (msg.chat.type === 'private') return;
        if (!(await isAdmin(bot, chatId, msg.from.id))) return bot.sendMessage(chatId, '❌ Hanya admin!');
        if (!(await isBotAdmin(bot, chatId))) return bot.sendMessage(chatId, '❌ Bot harus jadi admin!');

        let targetId = match[1], targetName = match[1];
        if (msg.reply_to_message) {
            targetId = msg.reply_to_message.from.id;
            targetName = msg.reply_to_message.from.first_name;
        }
        if (!targetId) return bot.sendMessage(chatId, '❌ Reply pesan atau: /ban <user_id>');

        try {
            await bot.banChatMember(chatId, targetId);
            bot.sendMessage(chatId, `🚫 [${targetName}](tg://user?id=${targetId}) telah di-banned!`, { parse_mode: 'Markdown', reply_to_message_id: msg.message_id });
        } catch (e) { bot.sendMessage(chatId, `❌ Gagal: ${e.message}`); }
    });

    // UNBAN
    bot.onText(/^\/unban(?:\s+(\d+))?$/i, async (msg, match) => {
        const chatId = msg.chat.id;
        if (msg.chat.type === 'private') return;
        if (!(await isAdmin(bot, chatId, msg.from.id))) return bot.sendMessage(chatId, '❌ Hanya admin!');

        let targetId = match[1];
        if (msg.reply_to_message) targetId = msg.reply_to_message.from.id;
        if (!targetId) return bot.sendMessage(chatId, '❌ Gunakan: /unban <user_id>');

        try {
            await bot.unbanChatMember(chatId, targetId);
            bot.sendMessage(chatId, `✅ User ${targetId} di-unban!`, { reply_to_message_id: msg.message_id });
        } catch (e) { bot.sendMessage(chatId, `❌ Gagal: ${e.message}`); }
    });

    // MUTE
    bot.onText(/^\/mute(?:\s+(\d+))?(?:\s+(\d+))?$/i, async (msg, match) => {
        const chatId = msg.chat.id;
        if (msg.chat.type === 'private') return;
        if (!(await isAdmin(bot, chatId, msg.from.id))) return bot.sendMessage(chatId, '❌ Hanya admin!');
        if (!(await isBotAdmin(bot, chatId))) return bot.sendMessage(chatId, '❌ Bot harus jadi admin!');

        let targetId = match[1], duration = match[2] || 10, targetName = match[1];
        if (msg.reply_to_message) {
            targetId = msg.reply_to_message.from.id;
            targetName = msg.reply_to_message.from.first_name;
            duration = match[1] || 10;
        }
        if (!targetId) return bot.sendMessage(chatId, '❌ Reply pesan atau: /mute <user_id> [menit]');

        try {
            const until = Math.floor(Date.now() / 1000) + (parseInt(duration) * 60);
            await bot.restrictChatMember(chatId, targetId, {
                can_send_messages: false,
                can_send_media_messages: false,
                can_send_other_messages: false,
                until_date: until
            });
            bot.sendMessage(chatId, `🔇 [${targetName}](tg://user?id=${targetId}) di-mute ${duration} menit!`, { parse_mode: 'Markdown', reply_to_message_id: msg.message_id });
        } catch (e) { bot.sendMessage(chatId, `❌ Gagal: ${e.message}`); }
    });

    // UNMUTE
    bot.onText(/^\/unmute(?:\s+(\d+))?$/i, async (msg, match) => {
        const chatId = msg.chat.id;
        if (msg.chat.type === 'private') return;
        if (!(await isAdmin(bot, chatId, msg.from.id))) return bot.sendMessage(chatId, '❌ Hanya admin!');

        let targetId = match[1], targetName = match[1];
        if (msg.reply_to_message) {
            targetId = msg.reply_to_message.from.id;
            targetName = msg.reply_to_message.from.first_name;
        }
        if (!targetId) return bot.sendMessage(chatId, '❌ Reply pesan atau: /unmute <user_id>');

        try {
            await bot.restrictChatMember(chatId, targetId, {
                can_send_messages: true,
                can_send_media_messages: true,
                can_send_other_messages: true
            });
            bot.sendMessage(chatId, `🔊 [${targetName}](tg://user?id=${targetId}) di-unmute!`, { parse_mode: 'Markdown', reply_to_message_id: msg.message_id });
        } catch (e) { bot.sendMessage(chatId, `❌ Gagal: ${e.message}`); }
    });

    // WARN
    bot.onText(/^\/warn(?:\s+(\d+))?$/i, async (msg, match) => {
        const chatId = msg.chat.id;
        if (msg.chat.type === 'private') return;
        if (!(await isAdmin(bot, chatId, msg.from.id))) return bot.sendMessage(chatId, '❌ Hanya admin!');

        let targetId = match[1], targetName = match[1];
        if (msg.reply_to_message) {
            targetId = msg.reply_to_message.from.id;
            targetName = msg.reply_to_message.from.first_name;
        }
        if (!targetId) return bot.sendMessage(chatId, '❌ Reply pesan atau: /warn <user_id>');

        const s = getGroupSettings(chatId);
        const warns = addWarning(chatId, targetId);

        if (warns >= s.warnLimit) {
            try {
                await bot.banChatMember(chatId, targetId);
                resetWarnings(chatId, targetId);
                bot.sendMessage(chatId, `🚫 [${targetName}](tg://user?id=${targetId}) di-ban! (${s.warnLimit}x warning)`, { parse_mode: 'Markdown' });
            } catch (e) { bot.sendMessage(chatId, `⚠️ ${warns}/${s.warnLimit} warning, gagal ban: ${e.message}`); }
        } else {
            bot.sendMessage(chatId, `⚠️ [${targetName}](tg://user?id=${targetId}) mendapat warning!\n📊 ${warns}/${s.warnLimit}`, { parse_mode: 'Markdown', reply_to_message_id: msg.message_id });
        }
    });

    // UNWARN
    bot.onText(/^\/unwarn(?:\s+(\d+))?$/i, async (msg, match) => {
        const chatId = msg.chat.id;
        if (msg.chat.type === 'private') return;
        if (!(await isAdmin(bot, chatId, msg.from.id))) return bot.sendMessage(chatId, '❌ Hanya admin!');

        let targetId = match[1];
        if (msg.reply_to_message) targetId = msg.reply_to_message.from.id;
        if (!targetId) return bot.sendMessage(chatId, '❌ Reply pesan atau: /unwarn <user_id>');

        resetWarnings(chatId, targetId);
        bot.sendMessage(chatId, `✅ Warning user ${targetId} direset!`, { reply_to_message_id: msg.message_id });
    });

    // PIN
    bot.onText(/^\/pin$/i, async (msg) => {
        const chatId = msg.chat.id;
        if (msg.chat.type === 'private') return;
        if (!msg.reply_to_message) return bot.sendMessage(chatId, '❌ Reply pesan yang ingin di-pin!');
        if (!(await isAdmin(bot, chatId, msg.from.id))) return bot.sendMessage(chatId, '❌ Hanya admin!');

        try {
            await bot.pinChatMessage(chatId, msg.reply_to_message.message_id);
            bot.sendMessage(chatId, '📌 Pesan di-pin!');
        } catch (e) { bot.sendMessage(chatId, `❌ Gagal: ${e.message}`); }
    });

    // UNPIN
    bot.onText(/^\/unpin$/i, async (msg) => {
        const chatId = msg.chat.id;
        if (msg.chat.type === 'private') return;
        if (!(await isAdmin(bot, chatId, msg.from.id))) return bot.sendMessage(chatId, '❌ Hanya admin!');

        try {
            await bot.unpinAllChatMessages(chatId);
            bot.sendMessage(chatId, '📌 Semua pin dihapus!');
        } catch (e) { bot.sendMessage(chatId, `❌ Gagal: ${e.message}`); }
    });

    // PROMOTE
    bot.onText(/^\/promote(?:\s+(\d+))?$/i, async (msg, match) => {
        const chatId = msg.chat.id;
        if (msg.chat.type === 'private') return;
        if (!(await isAdmin(bot, chatId, msg.from.id))) return bot.sendMessage(chatId, '❌ Hanya admin!');

        let targetId = match[1], targetName = match[1];
        if (msg.reply_to_message) {
            targetId = msg.reply_to_message.from.id;
            targetName = msg.reply_to_message.from.first_name;
        }
        if (!targetId) return bot.sendMessage(chatId, '❌ Reply pesan atau: /promote <user_id>');

        try {
            await bot.promoteChatMember(chatId, targetId, {
                can_manage_chat: true, can_delete_messages: true,
                can_restrict_members: true, can_change_info: true,
                can_invite_users: true, can_pin_messages: true
            });
            bot.sendMessage(chatId, `👑 [${targetName}](tg://user?id=${targetId}) jadi admin!`, { parse_mode: 'Markdown', reply_to_message_id: msg.message_id });
        } catch (e) { bot.sendMessage(chatId, `❌ Gagal: ${e.message}`); }
    });

    // DEMOTE
    bot.onText(/^\/demote(?:\s+(\d+))?$/i, async (msg, match) => {
        const chatId = msg.chat.id;
        if (msg.chat.type === 'private') return;
        if (!(await isAdmin(bot, chatId, msg.from.id))) return bot.sendMessage(chatId, '❌ Hanya admin!');

        let targetId = match[1], targetName = match[1];
        if (msg.reply_to_message) {
            targetId = msg.reply_to_message.from.id;
            targetName = msg.reply_to_message.from.first_name;
        }
        if (!targetId) return bot.sendMessage(chatId, '❌ Reply pesan atau: /demote <user_id>');

        try {
            await bot.promoteChatMember(chatId, targetId, {
                can_manage_chat: false, can_delete_messages: false,
                can_restrict_members: false, can_change_info: false,
                can_invite_users: false, can_pin_messages: false
            });
            bot.sendMessage(chatId, `📉 [${targetName}](tg://user?id=${targetId}) di-demote!`, { parse_mode: 'Markdown', reply_to_message_id: msg.message_id });
        } catch (e) { bot.sendMessage(chatId, `❌ Gagal: ${e.message}`); }
    });

    // DELETE MESSAGE
    bot.onText(/^\/del$/i, async (msg) => {
        const chatId = msg.chat.id;
        if (msg.chat.type === 'private') return;
        if (!msg.reply_to_message) return;
        if (!(await isAdmin(bot, chatId, msg.from.id))) return;

        try {
            await bot.deleteMessage(chatId, msg.reply_to_message.message_id);
            await bot.deleteMessage(chatId, msg.message_id);
        } catch (e) { }
    });

    // ═══════════════════════════════════════════════════════════
    // AUTO-MODERATION
    // ═══════════════════════════════════════════════════════════

    bot.on('message', async (msg) => {
        if (!msg.chat || msg.chat.type === 'private') return;
        if (!msg.from) return;

        const chatId = msg.chat.id;
        const userId = msg.from.id;
        const s = getGroupSettings(chatId);

        if (await isAdmin(bot, chatId, userId)) return;
        if (!(await isBotAdmin(bot, chatId))) return;

        const deleteAndWarn = async (reason) => {
            try {
                await bot.deleteMessage(chatId, msg.message_id);
                const warns = addWarning(chatId, userId);
                if (warns >= s.warnLimit) {
                    await bot.banChatMember(chatId, userId);
                    resetWarnings(chatId, userId);
                    bot.sendMessage(chatId, `🚫 [${msg.from.first_name}](tg://user?id=${userId}) di-ban! (${s.warnLimit}x pelanggaran)`, { parse_mode: 'Markdown' });
                } else {
                    const warnMsg = await bot.sendMessage(chatId, `⚠️ [${msg.from.first_name}](tg://user?id=${userId}) ${reason}\n📊 ${warns}/${s.warnLimit}`, { parse_mode: 'Markdown' });
                    if (s.autoDeleteWarn) setTimeout(() => bot.deleteMessage(chatId, warnMsg.message_id).catch(() => { }), 5000);
                }
            } catch (e) { }
        };

        // Anti-Link
        if (s.antilink && msg.text && linkRegex.test(msg.text)) return deleteAndWarn('kirim link!');

        // Anti-Forward
        if (s.antiforward && msg.forward_date) return deleteAndWarn('forward pesan!');

        // Anti-Sticker
        if (s.antisticker && msg.sticker) return deleteAndWarn('kirim sticker!');

        // Anti-GIF
        if (s.antigif && msg.animation) return deleteAndWarn('kirim GIF!');

        // Anti-Arab
        if (s.antiarab && msg.text && arabicRegex.test(msg.text)) return deleteAndWarn('kirim teks Arab!');

        // Anti-Chinese
        if (s.antichinese && msg.text && chineseRegex.test(msg.text)) return deleteAndWarn('kirim teks China!');

        // Anti-Virtex
        if (s.antivirtex && msg.text && virtexRegex.test(msg.text)) return deleteAndWarn('kirim virtex!');

        // Anti-Photo
        if (s.antiphoto && msg.photo) return deleteAndWarn('kirim foto!');

        // Anti-Video
        if (s.antivideo && msg.video) return deleteAndWarn('kirim video!');

        // Anti-Audio
        if (s.antiaudio && msg.audio) return deleteAndWarn('kirim audio!');

        // Anti-Document
        if (s.antidoc && msg.document) return deleteAndWarn('kirim dokumen!');

        // Anti-Voice
        if (s.antivoice && msg.voice) return deleteAndWarn('kirim voice!');

        // Anti-Inline
        if (s.antiinline && msg.via_bot) return deleteAndWarn('pakai inline bot!');

        // Anti-Flood
        if (s.antiflood && checkFlood(chatId, userId, s.floodCount, s.floodTime)) return deleteAndWarn('spam/flood!');

        // Anti-Toxic
        if (s.antitoxic && msg.text) {
            const lower = msg.text.toLowerCase();
            if (toxicWords.some(w => lower.includes(w))) return deleteAndWarn('toxic/kasar!');
        }

        // Anti-Tagall
        if (s.antitagall && msg.entities) {
            const mentions = msg.entities.filter(e => e.type === 'mention' || e.type === 'text_mention');
            if (mentions.length >= 5) return deleteAndWarn('tag banyak orang!');
        }

        // Anti-Long Text
        if (s.antilongtext && msg.text && msg.text.length > s.maxTextLength) return deleteAndWarn('pesan terlalu panjang!');

        // Word Filter
        const filters = getFilters(chatId);
        if (filters.length > 0 && msg.text) {
            const lower = msg.text.toLowerCase();
            if (filters.some(f => lower.includes(f))) return deleteAndWarn('kata terlarang!');
        }

        // Auto Reply
        const replies = getAutoReplies(chatId);
        if (msg.text && Object.keys(replies).length > 0) {
            const lower = msg.text.toLowerCase();
            for (const trigger in replies) {
                if (lower.includes(trigger)) {
                    bot.sendMessage(chatId, replies[trigger], { reply_to_message_id: msg.message_id });
                    break;
                }
            }
        }
    });

    // ═══════════════════════════════════════════════════════════
    // WELCOME & GOODBYE
    // ═══════════════════════════════════════════════════════════

    bot.on('new_chat_members', async (msg) => {
        const chatId = msg.chat.id;
        const s = getGroupSettings(chatId);

        for (const member of msg.new_chat_members) {
            // Anti-Bot
            if (s.antibot && member.is_bot) {
                const me = await bot.getMe();
                if (member.id !== me.id) {
                    try {
                        await bot.banChatMember(chatId, member.id);
                        bot.sendMessage(chatId, `🤖 Bot @${member.username || 'unknown'} di-kick! (Anti-Bot)`);
                    } catch (e) { }
                }
                continue;
            }

            // Welcome
            if (s.welcome && !member.is_bot) {
                try {
                    const count = await bot.getChatMemberCount(chatId);
                    const text = s.welcomeMsg
                        .replace(/{user}/g, `[${member.first_name}](tg://user?id=${member.id})`)
                        .replace(/{group}/g, msg.chat.title || 'grup')
                        .replace(/{id}/g, member.id)
                        .replace(/{count}/g, count);
                    bot.sendMessage(chatId, text, { parse_mode: 'Markdown' });
                } catch (e) { }
            }
        }
    });

    bot.on('left_chat_member', async (msg) => {
        const chatId = msg.chat.id;
        const s = getGroupSettings(chatId);
        const member = msg.left_chat_member;

        if (s.goodbye && !member.is_bot) {
            const text = s.goodbyeMsg
                .replace(/{user}/g, member.first_name)
                .replace(/{group}/g, msg.chat.title || 'grup');
            bot.sendMessage(chatId, text);
        }
    });

    // ═══════════════════════════════════════════════════════════
    // GUARD HELP
    // ═══════════════════════════════════════════════════════════

    bot.onText(/^\/guardhelp$/i, (msg) => {
        const help = `
╔══════════════════════════════════╗
║  🛡️ <b>GUARD HELP v3.0</b>  ║
╚══════════════════════════════════╝

<b>⚙️ SETUP:</b>
/guard - Panel kontrol utama
/setwelcome &lt;msg&gt; - Set welcome
/setgoodbye &lt;msg&gt; - Set goodbye

<b>👮 MODERASI:</b>
/kick /ban /unban /mute /unmute
/warn /unwarn /promote /demote
/pin /unpin /del

<b>📝 FILTER:</b>
/addfilter &lt;kata&gt; - Tambah filter
/delfilter &lt;kata&gt; - Hapus filter
/listfilter - Lihat filter

<b>🤖 AUTO REPLY:</b>
/addreply trigger|balasan
/delreply &lt;trigger&gt;
/listreply

<b>💡 TIPS:</b>
Semua command moderasi support reply!
Bot harus jadi admin dengan full permission.

<i>© 2025 Schnuffelll Guard System</i>`;

        bot.sendMessage(msg.chat.id, help, { parse_mode: 'HTML' });
    });

};
