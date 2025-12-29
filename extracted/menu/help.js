/**
 * Comprehensive Help System for Schnuffelll Bot
 * Provides detailed explanations for ALL commands
 * 
 * @author @schnuffelll
 * @version 8.1
 */

const fs = require('fs');
const settings = require('../config.js');

const OWNER_ID = settings.ownerId;

// Database semua command dan penjelasannya
const HELP_DATABASE = {
    // === PANEL COMMANDS ===
    panel: {
        category: '🖥️ Panel Management',
        commands: {
            '/addpanel': {
                title: '➕ Tambah Panel',
                desc: 'Menambahkan panel Pterodactyl baru ke bot',
                usage: '/addpanel',
                steps: [
                    '1. Ketik /addpanel',
                    '2. Pilih versi panel (V1-V5)',
                    '3. Masukkan domain panel (contoh: panel.domain.com)',
                    '4. Masukkan API Key Admin (dari panel > API)',
                    '5. Masukkan API Key Client',
                    '6. Panel siap digunakan!'
                ],
                access: 'Owner'
            },
            '/delpanel': {
                title: '🗑️ Hapus Panel',
                desc: 'Menghapus panel dari bot',
                usage: '/delpanel',
                steps: [
                    '1. Ketik /delpanel',
                    '2. Pilih panel yang ingin dihapus',
                    '3. Konfirmasi penghapusan'
                ],
                access: 'Owner'
            },
            '/listpanel': {
                title: '📋 Daftar Panel',
                desc: 'Melihat semua panel yang terdaftar',
                usage: '/listpanel',
                access: 'Owner/Premium'
            },
            '/server': {
                title: '🖥️ Lihat Server',
                desc: 'Melihat daftar server di panel',
                usage: '/server',
                access: 'Premium/Reseller'
            }
        }
    },

    // === SERVER COMMANDS ===
    server: {
        category: '⚙️ Server Management',
        commands: {
            '/unli': {
                title: '♾️ Unlimited Resources',
                desc: 'Set server menjadi unlimited resources (RAM, CPU, Disk)',
                usage: '/unli <serverID>',
                example: '/unli abc123',
                steps: [
                    '1. Dapatkan Server ID dari /server',
                    '2. Ketik /unli diikuti Server ID',
                    '3. Server akan di-set unlimited'
                ],
                access: 'Premium'
            },
            '/rebuild': {
                title: '🔄 Rebuild Server',
                desc: 'Rebuild/reinstall server ke egg/image baru',
                usage: '/rebuild <serverID>',
                example: '/rebuild abc123',
                access: 'Premium'
            },
            '/suspend': {
                title: '⏸️ Suspend Server',
                desc: 'Suspend server (matikan sementara)',
                usage: '/suspend <serverID>',
                access: 'Owner'
            },
            '/unsuspend': {
                title: '▶️ Unsuspend Server',
                desc: 'Aktifkan kembali server yang di-suspend',
                usage: '/unsuspend <serverID>',
                access: 'Owner'
            },
            '/delete': {
                title: '🗑️ Delete Server',
                desc: 'Hapus server dari panel',
                usage: '/delete <serverID>',
                access: 'Owner'
            },
            '/create': {
                title: '➕ Create Server',
                desc: 'Buat server baru di panel',
                usage: '/create',
                steps: [
                    '1. Ketik /create',
                    '2. Pilih panel',
                    '3. Isi detail server (nama, user, egg, dll)',
                    '4. Server dibuat!'
                ],
                access: 'Owner'
            },
            '/node': {
                title: '📊 Node Info',
                desc: 'Lihat info dan status node',
                usage: '/node',
                access: 'Premium'
            },
            '/install': {
                title: '📥 Install Script',
                desc: 'Install script ke server via SSH',
                usage: '/install',
                access: 'Premium'
            }
        }
    },

    // === VPS DIGITALOCEAN ===
    vps: {
        category: '☁️ VPS DigitalOcean',
        commands: {
            '/cvps': {
                title: '➕ Create VPS',
                desc: 'Buat VPS baru di DigitalOcean',
                usage: '/cvps',
                steps: [
                    '1. Ketik /cvps',
                    '2. Pilih region (sgp1, nyc1, dll)',
                    '3. Pilih size (RAM/CPU)',
                    '4. VPS dibuat dalam 30-60 detik'
                ],
                access: 'Owner'
            },
            '/listvps': {
                title: '📋 List VPS',
                desc: 'Lihat semua VPS aktif',
                usage: '/listvps',
                access: 'Owner'
            },
            '/delvps': {
                title: '🗑️ Delete VPS',
                desc: 'Hapus VPS dari DigitalOcean',
                usage: '/delvps <id>',
                access: 'Owner'
            },
            '/infovps': {
                title: 'ℹ️ Info VPS',
                desc: 'Lihat detail VPS tertentu',
                usage: '/infovps <id>',
                access: 'Owner'
            },
            '/listdo': {
                title: '🔑 List DO Tokens',
                desc: 'Lihat daftar API token DigitalOcean',
                usage: '/listdo',
                access: 'Owner'
            },
            '/adddo': {
                title: '➕ Add DO Token',
                desc: 'Tambah API token DigitalOcean baru',
                usage: '/adddo <nama>|<token>',
                example: '/adddo Main|dop_v1_xxx...',
                access: 'Owner'
            },
            '/deldo': {
                title: '🗑️ Delete DO Token',
                desc: 'Hapus API token DigitalOcean',
                usage: '/deldo <nomor>',
                access: 'Owner'
            }
        }
    },

    // === USER MANAGEMENT ===
    user: {
        category: '👥 User Management',
        commands: {
            '/addprem': {
                title: '⭐ Add Premium',
                desc: 'Tambah user ke premium',
                usage: '/addprem <userID>',
                example: '/addprem 123456789',
                access: 'Owner'
            },
            '/delprem': {
                title: '❌ Delete Premium',
                desc: 'Hapus user dari premium',
                usage: '/delprem <userID>',
                access: 'Owner'
            },
            '/address': {
                title: '🏪 Add Reseller',
                desc: 'Tambah user ke reseller',
                usage: '/address <userID>',
                access: 'Owner'
            },
            '/delress': {
                title: '❌ Delete Reseller',
                desc: 'Hapus user dari reseller',
                usage: '/delress <userID>',
                access: 'Owner'
            },
            '/listuser': {
                title: '📋 List Users',
                desc: 'Lihat semua user terdaftar (premium/reseller)',
                usage: '/listuser',
                access: 'Owner'
            },
            '/cleanuser': {
                title: '🧹 Clean Users',
                desc: 'Hapus semua user kecuali owner',
                usage: '/cleanuser confirm',
                steps: [
                    '1. Ketik /cleanuser',
                    '2. Ketik /cleanuser confirm untuk eksekusi'
                ],
                access: 'Owner'
            },
            '/cekid': {
                title: '🆔 Cek ID',
                desc: 'Lihat Telegram ID kamu',
                usage: '/cekid',
                access: 'Semua'
            }
        }
    },

    // === CPU MONITORING ===
    monitor: {
        category: '📊 CPU Monitoring',
        commands: {
            '/cpumon': {
                title: '📊 CPU Monitor',
                desc: 'Monitoring CPU server dengan auto-stop',
                usage: '/cpumon [start/stop/status/set]',
                subcommands: [
                    '/cpumon - Lihat status & help',
                    '/cpumon start - Mulai monitoring',
                    '/cpumon stop - Stop monitoring',
                    '/cpumon status - Lihat violations aktif',
                    '/cpumon set limit 100 - Set CPU limit %',
                    '/cpumon set duration 30 - Set durasi (detik)',
                    '/cpumon set interval 300 - Set interval cek',
                    '/cpumon set group -123456 - Set notify group',
                    '/cpumon set panel V1 - Pilih panel'
                ],
                access: 'Owner'
            }
        }
    },

    // === BOT SETTINGS ===
    settings: {
        category: '⚙️ Pengaturan Bot',
        commands: {
            '/pengaturan': {
                title: '⚙️ Pengaturan Tampilan',
                desc: 'Atur tampilan menu /start (gambar/video/audio)',
                usage: '/pengaturan',
                steps: [
                    '1. Ketik /pengaturan',
                    '2. Pilih tipe: TEXT/IMAGE/VIDEO/AUDIO',
                    '3. Klik SET MEDIA URL untuk upload media',
                    '4. Klik SET CAPTION untuk ubah caption',
                    '5. Klik PREVIEW untuk lihat hasil'
                ],
                access: 'Owner'
            },
            '/broadcast': {
                title: '📢 Broadcast',
                desc: 'Kirim pesan ke semua user',
                usage: '/broadcast <pesan>',
                access: 'Owner'
            }
        }
    },

    // === UPDATE SYSTEM ===
    update: {
        category: '🔄 Update System',
        commands: {
            '/update': {
                title: '🔄 Auto Update',
                desc: 'Cek dan install update bot terbaru',
                usage: '/update',
                steps: [
                    '1. Ketik /update untuk cek',
                    '2. Jika ada update, ketik /update confirm',
                    '3. Bot download & install otomatis',
                    '4. Bot restart otomatis'
                ],
                access: 'Owner'
            },
            '/version': {
                title: '📦 Versi Bot',
                desc: 'Lihat versi bot saat ini',
                usage: '/version',
                access: 'Semua'
            },
            '/changelog': {
                title: '📋 Changelog',
                desc: 'Lihat perubahan di versi ini',
                usage: '/changelog',
                access: 'Semua'
            }
        }
    },

    // === GROUP GUARD ===
    guard: {
        category: '🛡️ Group Guard',
        commands: {
            '/guard': {
                title: '🛡️ Guard Settings',
                desc: 'Pengaturan keamanan grup',
                usage: '/guard',
                access: 'Admin Grup'
            },
            '/antispam': {
                title: '🚫 Anti Spam',
                desc: 'Aktifkan/matikan anti-spam',
                usage: '/antispam on/off',
                access: 'Admin Grup'
            },
            '/antilink': {
                title: '🔗 Anti Link',
                desc: 'Aktifkan/matikan anti-link',
                usage: '/antilink on/off',
                access: 'Admin Grup'
            },
            '/welcome': {
                title: '👋 Welcome Message',
                desc: 'Atur pesan selamat datang',
                usage: '/welcome <pesan>',
                access: 'Admin Grup'
            }
        }
    },

    // === OTHER ===
    other: {
        category: '📌 Lainnya',
        commands: {
            '/start': {
                title: '🏠 Start/Menu',
                desc: 'Tampilkan menu utama bot',
                usage: '/start',
                access: 'Semua'
            },
            '/help': {
                title: '❓ Help',
                desc: 'Tampilkan bantuan ini',
                usage: '/help atau /help <command>',
                example: '/help unli',
                access: 'Semua'
            },
            '/ping': {
                title: '🏓 Ping',
                desc: 'Cek status bot',
                usage: '/ping',
                access: 'Semua'
            }
        }
    },

    // === v8.5 PANEL MANAGEMENT ===
    panelmgmt: {
        category: '📦 Panel Management v8.5',
        commands: {
            '/panelinfo': {
                title: '📦 Panel Info',
                desc: 'Lihat informasi panel (users, servers, nodes)',
                usage: '/panelinfo [1-5]',
                example: '/panelinfo 2',
                access: 'Owner/Premium'
            },
            '/panelusers': {
                title: '👥 Panel Users',
                desc: 'List semua users di panel',
                usage: '/panelusers [1-5]',
                access: 'Owner/Premium'
            },
            '/panelservers': {
                title: '🖥️ Panel Servers',
                desc: 'List semua servers di panel',
                usage: '/panelservers [1-5]',
                access: 'Owner/Premium'
            },
            '/panelnodes': {
                title: '📡 Panel Nodes',
                desc: 'List semua nodes di panel',
                usage: '/panelnodes [1-5]',
                access: 'Owner/Premium'
            },
            '/panelstats': {
                title: '📊 Panel Stats',
                desc: 'Statistik lengkap panel',
                usage: '/panelstats [1-5]',
                access: 'Owner/Premium'
            },
            '/panelhealth': {
                title: '🏥 Panel Health',
                desc: 'Cek kesehatan/latency panel',
                usage: '/panelhealth [1-5]',
                access: 'Owner/Premium'
            },
            '/panelbackup': {
                title: '💾 Panel Backup',
                desc: 'Backup database panel',
                usage: '/panelbackup',
                access: 'Owner'
            },
            '/panelrestart': {
                title: '🔄 Panel Restart',
                desc: 'Restart services panel',
                usage: '/panelrestart',
                access: 'Owner'
            },
            '/panelclear': {
                title: '🧹 Panel Clear',
                desc: 'Clear cache panel',
                usage: '/panelclear',
                access: 'Owner'
            }
        }
    },

    // === v8.5 AUTOMATION ===
    automation: {
        category: '🤖 Automation v8.5',
        commands: {
            '/autolist': {
                title: '📋 Auto List',
                desc: 'List semua automation aktif',
                usage: '/autolist',
                access: 'Owner'
            },
            '/autobackup': {
                title: '💾 Auto Backup',
                desc: 'Setup auto backup server',
                usage: '/autobackup <interval_menit> <ip>',
                example: '/autobackup 60 192.168.1.1',
                access: 'Owner'
            },
            '/autorestart': {
                title: '🔄 Auto Restart',
                desc: 'Setup auto restart server',
                usage: '/autorestart <interval_menit> <ip>',
                example: '/autorestart 120 192.168.1.1',
                access: 'Owner'
            },
            '/autocheck': {
                title: '🏥 Auto Check',
                desc: 'Setup health check otomatis',
                usage: '/autocheck <interval_menit> <url>',
                example: '/autocheck 5 panel.domain.com',
                access: 'Owner'
            },
            '/autostop': {
                title: '⏹️ Auto Stop',
                desc: 'Stop automation tertentu',
                usage: '/autostop <job_id>',
                access: 'Owner'
            },
            '/broadcast': {
                title: '📢 Broadcast',
                desc: 'Kirim pesan ke semua users',
                usage: '/broadcast <pesan>',
                access: 'Owner'
            },
            '/schedule': {
                title: '⏰ Schedule',
                desc: 'Jadwalkan task satu kali',
                usage: '/schedule <delay_menit> <command>',
                example: '/schedule 30 /panelhealth',
                access: 'Owner'
            },
            '/reminder': {
                title: '🔔 Reminder',
                desc: 'Set pengingat',
                usage: '/reminder <delay_menit> <pesan>',
                example: '/reminder 15 Backup database!',
                access: 'Owner'
            },
            '/stats': {
                title: '📊 Bot Stats',
                desc: 'Statistik bot (uptime, memory, users)',
                usage: '/stats',
                access: 'Owner'
            }
        }
    },

    // === v8.5 LICENSE SYSTEM ===
    license: {
        category: '🔐 License System v8.5',
        commands: {
            '/licadd': {
                title: '➕ Add License',
                desc: 'Tambah lisensi ke user (DEV ONLY)',
                usage: '/licadd <userId> <type> [days]',
                example: '/licadd 123456789 PREMIUM 30',
                steps: [
                    'Types: OWNER, PREMIUM, BASIC, FREE',
                    'Days opsional (default permanent)'
                ],
                access: 'Developer Only'
            },
            '/licremove': {
                title: '❌ Remove License',
                desc: 'Hapus lisensi user (DEV ONLY)',
                usage: '/licremove <userId>',
                access: 'Developer Only'
            },
            '/liclist': {
                title: '📋 License List',
                desc: 'List semua lisensi (DEV ONLY)',
                usage: '/liclist',
                access: 'Developer Only'
            },
            '/liccheck': {
                title: '🔍 Check License',
                desc: 'Cek lisensi user (DEV ONLY)',
                usage: '/liccheck <userId>',
                access: 'Developer Only'
            },
            '/licgenerate': {
                title: '🎫 Generate Token',
                desc: 'Generate token baru (DEV ONLY)',
                usage: '/licgenerate <type>',
                example: '/licgenerate PREMIUM',
                access: 'Developer Only'
            },
            '/mylicense': {
                title: '📄 My License',
                desc: 'Cek lisensi sendiri',
                usage: '/mylicense',
                access: 'Semua'
            }
        }
    },

    // === v8.5 RPG EXPANSION ===
    rpg: {
        category: '🎮 RPG Expansion v8.5',
        commands: {
            '/shop': {
                title: '🛒 Shop',
                desc: 'Beli items dari toko',
                usage: '/shop',
                access: 'Semua'
            },
            '/buy': {
                title: '💰 Buy',
                desc: 'Beli item tertentu',
                usage: '/buy <item>',
                access: 'Semua'
            },
            '/sell': {
                title: '💸 Sell',
                desc: 'Jual item',
                usage: '/sell <item> [jumlah]',
                access: 'Semua'
            },
            '/inventory': {
                title: '🎒 Inventory',
                desc: 'Lihat inventory kamu',
                usage: '/inventory',
                access: 'Semua'
            },
            '/quest': {
                title: '📜 Quest',
                desc: 'Lihat quest aktif',
                usage: '/quest',
                access: 'Semua'
            },
            '/questlist': {
                title: '📋 Quest List',
                desc: 'Daftar semua quest tersedia',
                usage: '/questlist',
                access: 'Semua'
            },
            '/achievement': {
                title: '🏆 Achievement',
                desc: 'Lihat achievement kamu',
                usage: '/achievement',
                access: 'Semua'
            },
            '/guild': {
                title: '🏰 Guild',
                desc: 'Lihat info guild kamu',
                usage: '/guild',
                access: 'Semua'
            },
            '/guildcreate': {
                title: '🏗️ Create Guild',
                desc: 'Buat guild baru',
                usage: '/guildcreate <nama>',
                access: 'Semua'
            },
            '/guildjoin': {
                title: '🚪 Join Guild',
                desc: 'Gabung ke guild',
                usage: '/guildjoin <nama>',
                access: 'Semua'
            },
            '/leaderboard': {
                title: '🏅 Leaderboard',
                desc: 'Lihat ranking global',
                usage: '/leaderboard',
                access: 'Semua'
            },
            '/profile': {
                title: '👤 Profile',
                desc: 'Lihat profile RPG kamu',
                usage: '/profile',
                access: 'Semua'
            },
            '/daily': {
                title: '🎁 Daily',
                desc: 'Klaim hadiah harian',
                usage: '/daily',
                access: 'Semua'
            }
        }
    }
};

module.exports = (bot) => {

    // /help - Main help menu
    bot.onText(/^\/help$/i, async (msg) => {
        const chatId = msg.chat.id;

        let text = `
╭───❖ <b>SCHNUFFELLL HELP CENTER</b> ❖
│
│ <i>Selamat datang di pusat bantuan!</i>
│ <i>Pilih kategori di bawah untuk info detail.</i>
│
│ 💡 <b>Tips:</b>
│ <i>Ketik command langsung untuk eksekusi.</i>
│ <i>Gunakan tombol navigasi untuk jelajah.</i>
╰───────────────────────◊
`;

        const keyboard = {
            inline_keyboard: [
                [
                    { text: '🖥️ Panel', callback_data: 'help_panel' },
                    { text: '📦 Mgmt', callback_data: 'help_panelmgmt' }, // New
                    { text: '🎮 RPG', callback_data: 'help_rpg' }        // New
                ],
                [
                    { text: '⚙️ Server', callback_data: 'help_server' },
                    { text: '☁️ VPS', callback_data: 'help_vps' },
                    { text: '🤖 Auto', callback_data: 'help_automation' } // New
                ],
                [
                    { text: '👥 Users', callback_data: 'help_user' },
                    { text: '🔐 License', callback_data: 'help_license' }, // New
                    { text: '🛡️ Guard', callback_data: 'help_guard' }
                ],
                [
                    { text: '📊 Monitor', callback_data: 'help_monitor' },
                    { text: '🔄 Update', callback_data: 'help_update' },
                    { text: '⚙️ Ops', callback_data: 'help_settings' }
                ],
                [
                    { text: '📌 Others', callback_data: 'help_other' },
                    { text: '❌ Tutup', callback_data: 'closemenu' }
                ]
            ]
        };

        bot.sendMessage(chatId, text, {
            parse_mode: 'HTML',
            reply_markup: keyboard,
            reply_to_message_id: msg.message_id
        });
    });

    // /help <command> - Specific command help
    bot.onText(/^\/help (.+)$/i, async (msg, match) => {
        const chatId = msg.chat.id;
        const query = match[1].toLowerCase().replace('/', '');

        // Cari command di database
        let found = null;
        let cmdName = '';

        for (const category of Object.values(HELP_DATABASE)) {
            for (const [cmd, info] of Object.entries(category.commands)) {
                const cmdClean = cmd.replace('/', '').toLowerCase();
                if (cmdClean === query || cmdClean.includes(query)) {
                    found = info;
                    cmdName = cmd;
                    break;
                }
            }
            if (found) break;
        }

        if (!found) {
            return bot.sendMessage(chatId, `❌ Command <code>${query}</code> tidak ditemukan.

Coba <code>/help</code> untuk lihat semua command.`, { parse_mode: 'HTML' });
        }

        // Build detail help
        let text = `<b>${found.title}</b>
<code>━━━━━━━━━━━━━━━━━━━━━━</code>

📝 <b>Deskripsi:</b>
${found.desc}

💻 <b>Penggunaan:</b>
<code>${found.usage}</code>
`;

        if (found.example) {
            text += `\n📋 <b>Contoh:</b>\n<code>${found.example}</code>\n`;
        }

        if (found.steps) {
            text += `\n📖 <b>Langkah-langkah:</b>\n`;
            found.steps.forEach(step => {
                text += `${step}\n`;
            });
        }

        if (found.subcommands) {
            text += `\n🔧 <b>Sub-commands:</b>\n`;
            found.subcommands.forEach(sub => {
                text += `• <code>${sub}</code>\n`;
            });
        }

        text += `\n🔐 <b>Akses:</b> ${found.access}`;

        bot.sendMessage(chatId, text, {
            parse_mode: 'HTML',
            reply_to_message_id: msg.message_id
        });
    });

    // Callback query handler for help categories
    bot.on('callback_query', async (query) => {
        const data = query.data;
        const chatId = query.message.chat.id;
        const msgId = query.message.message_id;

        if (!data.startsWith('help_')) return;

        const categoryKey = data.replace('help_', '');
        const category = HELP_DATABASE[categoryKey];

        if (!category) {
            return bot.answerCallbackQuery(query.id, { text: 'Kategori tidak ditemukan' });
        }

        bot.answerCallbackQuery(query.id);

        let text = `<b>${category.category}</b>
<code>━━━━━━━━━━━━━━━━━━━━━━</code>

`;

        for (const [cmd, info] of Object.entries(category.commands)) {
            text += `<b>${cmd}</b> - ${info.desc}\n`;
            text += `   └ <i>${info.access}</i>\n\n`;
        }

        text += `<blockquote>💡 Ketik <code>/help [command]</code> untuk detail
Contoh: <code>/help ${Object.keys(category.commands)[0].replace('/', '')}</code></blockquote>`;

        const backKeyboard = {
            inline_keyboard: [
                [{ text: '⬅️ Kembali ke Menu Help', callback_data: 'help_back' }]
            ]
        };

        bot.editMessageText(text, {
            chat_id: chatId,
            message_id: msgId,
            parse_mode: 'HTML',
            reply_markup: backKeyboard
        });
    });

    // Back to main help
    bot.on('callback_query', async (query) => {
        if (query.data !== 'help_back') return;

        const chatId = query.message.chat.id;
        const msgId = query.message.message_id;

        bot.answerCallbackQuery(query.id);

        let text = `<b>❓ BANTUAN SCHNUFFELLL BOT v6.0</b>
<code>━━━━━━━━━━━━━━━━━━━━━━</code>

<i>Ketik</i> <code>/help [command]</code> <i>untuk detail</i>
<i>Contoh:</i> <code>/help unli</code>

`;

        for (const [key, category] of Object.entries(HELP_DATABASE)) {
            text += `\n<b>${category.category}</b>\n`;
            const cmds = Object.keys(category.commands).slice(0, 5).join(', ');
            text += `<code>${cmds}</code>\n`;
        }

        text += `\n<blockquote>💡 Ketik nama command untuk lihat detail lengkap</blockquote>`;

        const keyboard = {
            inline_keyboard: [
                [
                    { text: '🖥️ Panel', callback_data: 'help_panel' },
                    { text: '⚙️ Server', callback_data: 'help_server' },
                    { text: '☁️ VPS', callback_data: 'help_vps' }
                ],
                [
                    { text: '👥 Users', callback_data: 'help_user' },
                    { text: '📊 Monitor', callback_data: 'help_monitor' },
                    { text: '⚙️ Settings', callback_data: 'help_settings' }
                ],
                [
                    { text: '🔄 Update', callback_data: 'help_update' },
                    { text: '🛡️ Guard', callback_data: 'help_guard' },
                    { text: '📌 Other', callback_data: 'help_other' }
                ]
            ]
        };

        bot.editMessageText(text, {
            chat_id: chatId,
            message_id: msgId,
            parse_mode: 'HTML',
            reply_markup: keyboard
        });
    });

};
