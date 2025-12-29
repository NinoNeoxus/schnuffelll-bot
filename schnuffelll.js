const settings = require("./config.js");
const secret = require("./config.secret.js");

// --- DATA LISENSI (DARI CONFIG.SECRET.JS) ---
// Tidak lagi hardcoded - bisa diubah via /dev menu
const license = secret.getLicense();
// ----------------------------

const TelegramBot = require("node-telegram-bot-api");
const axios = require("axios");
const archiver = require("archiver");
const { createCanvas, loadImage } = require('canvas');
const crypto = require("crypto");
const chalk = require("chalk");
const fs = require("fs");
const os = require("os");
const { exec } = require("child_process");
const path = require("path");
const readline = require("readline");
const { Client } = require('ssh2');
const {
    loadJsonData,
    saveJsonData,
    checkCooldown,
    setCooldown
} = require('./lib/function');

/*
// Bagian koneksi WA sengaja dinonaktifkan dari script asli
const { saveActiveSessions, connectToWhatsApp, initializeWhatsAppConnections, sessions } = require("./connect");
initializeWhatsAppConnections();
*/

async function startBot(bot) {
    console.clear();

    console.log(chalk.gray('• Connecting to Telegram API...'));
    await new Promise(resolve => setTimeout(resolve, 800));

    console.log(chalk.gray('• Authenticating credentials...'));
    await new Promise(resolve => setTimeout(resolve, 600));

    console.log(chalk.gray('• Initializing bot services...\n'));
    await new Promise(resolve => setTimeout(resolve, 600));

    const info = await bot.getMe();
    console.clear();

    console.log(chalk.gray('╭──────────────────────────────╮'));
    console.log(chalk.gray('│ ') + chalk.white.bold('Verifikasi Token...'));
    console.log(chalk.gray('╰──────────────────────────────╯'));

    console.clear();

    console.log(chalk.green.bold(`\n✓ @${info.username} Connected!\n`));

    // --- HEADER SCHNUFFELLL V8.0 ---
    console.log(chalk.gray('╭─────────────────────────────────────────────────────╮'));
    console.log(chalk.gray('│') + chalk.cyan.bold('     ⚡ SCHNUFFELLL BOT - PANEL MANAGER ⚡     ') + chalk.gray('│'));
    console.log(chalk.gray('├─────────────────────────────────────────────────────┤'));
    console.log(chalk.gray('│ ') + chalk.green.bold('🟢 Version') + chalk.white(' : ') + chalk.yellow.bold('8.0') + chalk.gray('                                   │'));
    console.log(chalk.gray('│ ') + chalk.blue.bold('📅 Updated') + chalk.white(' : ') + chalk.cyan('Jumat, 27 Desember 2025') + chalk.gray('            │'));
    console.log(chalk.gray('│ ') + chalk.magenta.bold('👨‍💻 Dev    ') + chalk.white(' : ') + chalk.yellow('@schnuffelll') + chalk.gray('                      │'));
    console.log(chalk.gray('├─────────────────────────────────────────────────────┤'));
    console.log(chalk.gray('│ ') + chalk.white.bold('📦 New in v8.0:') + chalk.gray('                                     │'));
    console.log(chalk.gray('│ ') + chalk.cyan('  • 🔐 Dev Menu (secret settings)') + chalk.gray('                 │'));
    console.log(chalk.gray('│ ') + chalk.cyan('  • 🛠️ 100+ New Features') + chalk.gray('                          │'));
    console.log(chalk.gray('│ ') + chalk.cyan('  • 🔄 Improved Auto-Update') + chalk.gray('                       │'));
    console.log(chalk.gray('│ ') + chalk.cyan('  • 🎮 RPG Expansion (shop, quest, guild)') + chalk.gray('         │'));
    console.log(chalk.gray('│ ') + chalk.cyan('  • 🔒 Obfuscation-Ready Code') + chalk.gray('                     │'));
    console.log(chalk.gray('├─────────────────────────────────────────────────────┤'));
    console.log(chalk.gray('│ ') + chalk.white.italic('"Keep shipping your code, bug bisa diperbaiki!"') + chalk.gray(' │'));
    console.log(chalk.gray('╰─────────────────────────────────────────────────────╯'));
    // --- SELESAI HEADER ---

    console.log(chalk.gray('\n📟 Ready to receive commands...\n'));
}

async function initializeBot() { // <<<--- INI YANG DIPINDAH KE ATAS
    // --- LISENSI DAN VALIDASI BARU DARI GITHUB ---
    console.log(chalk.gray('• Verifying token from GitHub database...'));
    try {
        // Ambil token bot dari config, tapi lisensi dari kode rahasia
        const { token } = settings;
        const { githubToken, githubRepo, githubPath } = license;

        if (!githubToken || !githubRepo || !githubPath) {
            console.log(chalk.red.bold('🚫 Konfigurasi GitHub di config.js belum lengkap! (githubToken, githubRepo, githubPath)'));
            process.exit(1);
        }

        const rawUrl = `https://raw.githubusercontent.com/${githubRepo}/main/${githubPath}`;

        const response = await axios.get(rawUrl);
        const authorizedTokens = response.data;

        if (!Array.isArray(authorizedTokens) || !authorizedTokens.includes(token)) {
            console.log(chalk.red.bold('🚫 Akses ditolak! Token bot ini tidak terdaftar di database GitHub.'));
            process.exit(1);
        }
        console.log(chalk.green.bold('✓ Token is authorized.'));

    } catch (error) {
        console.log(chalk.red.bold('❌ Gagal memverifikasi token. Pastikan config GitHub benar dan file database ada di repo.'));
        if (error.response && error.response.status === 404) {
            console.log(chalk.yellow('Hint: File database di repo GitHub kayaknya belum dibuat atau path/nama reponya salah.'));
        }
        process.exit(1);
    }
    // --- SELESAI VALIDASI ---

    const bot = new TelegramBot(settings.token, { polling: true });

    // Patch editMessageText & editMessageReplyMarkup supaya error
    // "message is not modified" tidak bikin bot crash
    const _origEditText = bot.editMessageText.bind(bot);
    bot.editMessageText = async function (text, options) {
        try {
            return await _origEditText(text, options);
        } catch (err) {
            const desc = err && err.response && err.response.body && err.response.body.description;
            if (typeof desc === "string" && desc.includes("message is not modified")) {
                // Abaikan error ini saja
                return;
            }
            console.error("editMessageText error:", desc || err.message || err);
            throw err;
        }
    };

    if (typeof bot.editMessageReplyMarkup === "function") {
        const _origEditMarkup = bot.editMessageReplyMarkup.bind(bot);
        bot.editMessageReplyMarkup = async function (replyMarkup, options) {
            try {
                return await _origEditMarkup(replyMarkup, options);
            } catch (err) {
                const desc = err && err.response && err.response.body && err.response.body.description;
                if (typeof desc === "string" && desc.includes("message is not modified")) {
                    return;
                }
                console.error("editMessageReplyMarkup error:", desc || err.message || err);
                throw err;
            }
        };
    }

    await startBot(bot);

    const OWNER_ID = settings.ownerId;

    // system file
    console.log('[DEBUG] Loading start.js...');
    require("./start.js")(bot);

    // menu file
    console.log('[DEBUG] Loading other.js...');
    require("./menu/other.js")(bot);
    console.log('[DEBUG] Loading private.js...');
    require("./menu/private.js")(bot);
    console.log('[DEBUG] Loading panel.js...');
    require("./menu/panel.js")(bot); // <<< RESTORED: Contains /unli, /cadp, /1gb-10gb, etc.
    console.log('[DEBUG] Loading install.js...');
    require("./menu/install.js")(bot);
    console.log('[DEBUG] Loading cvps.js...');
    require("./menu/cvps.js")(bot);

    // --- MODIFIKASI KEAMANAN (TANAM ID DEVELOPER) ---
    const DEVELOPER_ID = "1126396317"; // <-- ID LU KITA TANAM DI SINI
    console.log('[DEBUG] Loading addusr.js...');
    require("./menu/addusr.js")(bot, DEVELOPER_ID); // <-- KITA SUNTIK ID-NYA
    // --- SELESAI MODIFIKASI ---

    console.log('[DEBUG] Loading settings_menu.js...');
    require("./menu/settings_menu.js")(bot);
    console.log('[DEBUG] Loading group_settings.js...');
    require("./menu/group_settings.js")(bot);
    console.log('[DEBUG] Loading guard.js...');
    require("./menu/guard.js")(bot);
    console.log('[DEBUG] Loading pengaturan.js...');
    require("./menu/pengaturan.js")(bot);
    console.log('[DEBUG] Loading rpg.js...');
    require("./menu/rpg.js")(bot);
    console.log('[DEBUG] Loading cpumonitor.js...');
    require("./menu/cpumonitor.js")(bot);
    console.log('[DEBUG] Loading update.js...');
    require("./menu/update.js")(bot);
    console.log('[DEBUG] Loading help.js...');
    require("./menu/help.js")(bot);
    console.log('[DEBUG] Loading devmenu.js...');
    require("./menu/devmenu.js")(bot);

    // === v8.0 NEW MANAGEMENT MODULES ===
    console.log('[DEBUG] Loading panelmgmt.js...');
    require("./menu/panelmgmt.js")(bot);
    console.log('[DEBUG] Loading servermgmt.js...');
    require("./menu/servermgmt.js")(bot);
    console.log('[DEBUG] Loading vpsmgmt.js...');
    require("./menu/vpsmgmt.js")(bot);
    console.log('[DEBUG] Loading usermgmt.js...');
    require("./menu/usermgmt.js")(bot);
    console.log('[DEBUG] Loading automation.js...');
    require("./menu/automation.js")(bot);
    console.log('[DEBUG] Loading licensemgmt.js...');
    require("./menu/licensemgmt.js")(bot);
    console.log('[DEBUG] Loading autoadd.js...');
    require("./menu/autoadd.js")(bot);
    console.log('[DEBUG] Loading dnsmgmt.js...');
    require("./menu/dnsmgmt.js")(bot);
    console.log('[DEBUG] Loading terminal.js...');
    require("./menu/terminal.js")(bot); // SSH Terminal for Dev

    // === v8.0 RPG EXPANSION ===
    require("./menu/rpg/shop.js")(bot); // <<<--- RPG SHOP SYSTEM v8.0
    require("./menu/rpg/quest.js")(bot); // <<<--- RPG QUEST SYSTEM v8.0
    require("./menu/rpg/guild.js")(bot); // <<<--- RPG GUILD SYSTEM v8.0
    require("./menu/rpg/leaderboard.js")(bot); // <<<--- RPG LEADERBOARD v8.0


    const {
        ownerId,
        dev,
        qris,
        pp,
        ppVid,
        panel
    } = settings;

    const allowedKeys = ["ownerId", "groupId", "exGroupId", "exUserId", "chId", "chUsnId", "vpsPublic", "pwPublic", "pwPrivate", "vpsPrivate", "domainAdp", "ptlaAdp", "ptlcAdp", "domain", "plta", "pltc", "domainV2", "pltaV2", "pltcV2", "domainV3", "pltaV3", "pltcV3", "domainV4", "pltaV4", "pltcV4", "domainV5", "pltaV5", "pltcV5", "egg", "loc", "dev", "vercel", "dana", "namaDana", "pp", "ppVid", "hostname", "apiDigitalOcean", "apiDigitalOcean2", "apiDigitalOcean3"];

    const settingsPath = "./config.js";

    // file database
    const PRIVATE_FILE = "./db/users/private/privateID.json";
    const OWNER_FILE = './db/users/adminID.json';
    const PANEL_SETTINGS_FILE = './db/panel_settings.json'; // <-- Path database panel

    // premium file
    const PREMIUM_FILE = './db/users/premiumUsers.json';
    const PREMV2_FILE = './db/users/version/premiumV2.json';
    const PREMV3_FILE = './db/users/version/premiumV3.json';
    const PREMV4_FILE = './db/users/version/premiumV4.json';
    const PREMV5_FILE = './db/users/version/premiumV5.json';

    // reseller file
    const RESS_FILE = './db/users/resellerUsers.json';
    const RESSV2_FILE = './db/users/version/resellerV2.json';
    const RESSV3_FILE = './db/users/version/resellerV3.json';
    const RESSV4_FILE = './db/users/version/resellerV4.json';
    const RESSV5_FILE = './db/users/version/resellerV5.json';

    // -------------------------------------------------------------
    // Fitur Install Protect Panel
    //
    // Bagian ini menambahkan perintah untuk memasang proteksi panel
    // pterodactyl secara otomatis pada VPS. Owner bot dapat
    // menggunakan perintah /installprotect1 hingga /installprotect9
    // atau /installprotectall untuk memasang semua proteksi secara
    // berurutan. Setelah pemasangan, bot akan mengirimkan pesan
    // dengan branding "MAFF Anti proteksi" dan menampilkan nama
    // pembuat proteksi (@schnuffelll).
    //
    // Daftar URL script proteksi berdasarkan nomor 1-9
    const protectScripts = {
        1: 'https://raw.githubusercontent.com/NinoNeoxus/protectionsss/refs/heads/main/install_protection.sh',
        2: 'https://raw.githubusercontent.com/NinoNeoxus/protectionsss/refs/heads/main/install_protection.sh',
        3: 'https://raw.githubusercontent.com/NinoNeoxus/protectionsss/refs/heads/main/install_protection.sh',
        4: 'https://raw.githubusercontent.com/NinoNeoxus/protectionsss/refs/heads/main/install_protection.sh',
        5: 'https://raw.githubusercontent.com/NinoNeoxus/protectionsss/refs/heads/main/install_protection.sh',
        6: 'https://raw.githubusercontent.com/NinoNeoxus/protectionsss/refs/heads/main/install_protection.sh',
        7: 'https://raw.githubusercontent.com/NinoNeoxus/protectionsss/refs/heads/main/install_protection.sh',
        8: 'https://raw.githubusercontent.com/NinoNeoxus/protectionsss/refs/heads/main/install_protection.sh',
        9: 'https://raw.githubusercontent.com/NinoNeoxus/protectionsss/refs/heads/main/install_protection.sh'
    };

    // URL skrip pembaruan branding. Skrip ini akan dijalankan setelah setiap
    // instalasi proteksi untuk memastikan semua referensi "Malzxyz" diganti
    // menjadi "Schnuffelll" dan ikon perisai ditambahkan. Skrip ini
    // dipublikasikan di repositori Github Anda sehingga Anda dapat mengeditnya
    // sesuka hati tanpa bergantung pada repositori orang lain.
    const UPDATE_SCRIPT_URL = 'https://raw.githubusercontent.com/NinoNeoxus/schnuffelll-protect-scripts/main/update_protect.sh';

    /**
     * Menjalankan skrip proteksi di server VPS menggunakan SSH dengan output log.
     * Skrip ini akan mengirim pesan status koneksi, menjalankan skrip install,
     * menangkap log keluaran (stdout dan stderr), lalu mengirim hasilnya
     * kembali ke pengguna. Setiap string yang merujuk ke pembuat skrip asli
     * akan diganti dengan nama @schnuffelll. Output dibatasi hingga 3800
     * karakter terakhir agar tidak terlalu panjang.
     * @param {number} scriptNum - Nomor skrip yang akan dijalankan (1-9).
     * @param {string} ipvps - Alamat IP VPS.
     * @param {string} pwvps - Password root VPS.
     * @param {object} bot - Instance bot Telegram.
     * @param {number} chatId - ID chat Telegram untuk mengirim pesan.
     */
    async function runProtectScript(scriptNum, ipvps, pwvps, bot, chatId) {
        return new Promise((resolve, reject) => {
            const conn = new Client();
            // Informasikan pengguna bahwa koneksi dimulai
            bot.sendMessage(chatId, `⏳ Menghubungkan ke VPS *${ipvps}* dan mulai instalasi Protect Panel ${scriptNum}...`, { parse_mode: 'Markdown' });
            conn.on('ready', () => {
                // Koneksi berhasil
                bot.sendMessage(chatId, '⚙️ Koneksi berhasil! Proses instalasi sedang berjalan...', { parse_mode: 'Markdown' });
                // Jalankan skrip install melalui SSH dengan mengganti semua credit dan menambahkan ikon pelindung.
                // Perintah ini: 1) Mengunduh skrip remote kemudian mengganti nama Malzxyz menjadi Schnuffelll dan t.me/malzxyz menjadi @schnuffelll
                // 2) Menjalankan skrip hasil modifikasi. 3) Melakukan pencarian global di instalasi Pterodactyl untuk mengganti credit lama dengan yang baru.
                // 4) Menambahkan ikon perisai ke teks 'Activate' pada halaman daftar server admin.
                // Jalankan skrip install asli dengan mengganti credit di dalam
                // skrip tersebut, kemudian jalankan skrip pembaruan untuk
                // mengganti semua referensi di panel. Dengan cara ini,
                // modifikasi branding dilakukan satu kali oleh update script
                // sehingga tidak perlu memanggil sed untuk setiap file secara manual.
                // Perintah instal yang diperbarui: jalankan skrip proteksi asli
                // setelah mengganti semua referensi Malzxyz/Malzcom. Kemudian
                // lakukan penggantian branding secara global di instalasi panel.
                const installCmd = `bash -c \"set -e; \\
curl -fsSL ${protectScripts[scriptNum]} | bash; \\
# Branding sed commands removed to prevent installation errors.
# Tambahkan ikon perisai ke label Active di panel
sed -i 's/Active/Active 🛡️/g' /var/www/pterodactyl/resources/views/admin/servers/index.blade.php\"`;
                conn.exec(installCmd, (err, stream) => {
                    if (err) {
                        conn.end();
                        bot.sendMessage(chatId, `❌ Gagal mengeksekusi perintah:\n\`${err.message}\``, { parse_mode: 'Markdown' });
                        return reject(err);
                    }
                    let output = '';
                    stream.on('data', (data) => {
                        output += data.toString();
                    });
                    stream.stderr.on('data', (data) => {
                        output += `\n[ERROR] ${data.toString()}`;
                    });
                    stream.on('close', () => {
                        conn.end();
                        let cleanOutput = output.trim();
                        // Ganti credit yang masih tersisa di log: nama Malzxyz, Malzcom, dan label @Malzxyz Protect
                        cleanOutput = cleanOutput.replace(/@[Mm]alz[Xx]yz\s*[Pp]rotect/gi, '@schnuffelll PROTECT V1.5');
                        cleanOutput = cleanOutput.replace(/Malz[Xx]yz|Malzcom|malzcom/gi, '@schnuffelll');
                        const truncated = cleanOutput.slice(-3800) || '(tidak ada output)';
                        bot.sendMessage(chatId, `✅ *Instalasi ${scriptNum} selesai!*\n\n📦 Output terakhir:\n\`\`\`${truncated}\`\`\`\n\n👤 By @schnuffelll`, { parse_mode: 'Markdown' });
                        resolve();
                    });
                });
            }).on('error', (err) => {
                bot.sendMessage(chatId, `❌ Gagal terhubung ke VPS!\nPeriksa IP & Password kamu.\n\nError:\n\`${err.message}\``, { parse_mode: 'Markdown' });
                reject(err);
            }).connect({
                host: ipvps,
                port: 22,
                username: 'root',
                password: pwvps
            });
        });
    }

    // Handler untuk perintah /installprotect1 sampai /installprotect9
    bot.onText(/^\/installprotect([1-9])\s+(.+)/i, async (msg, match) => {
        const chatId = msg.chat.id;
        const userId = msg.from.id;
        const scriptNum = parseInt(match[1]);
        const param = match[2];

        // Hanya owner yang diperbolehkan menjalankan perintah ini
        const ownersList = loadJsonData(OWNER_FILE);
        if (String(userId) !== String(OWNER_ID) && !ownersList.includes(userId.toString())) {
            return bot.sendMessage(chatId, '❌ Akses ditolak! Perintah ini hanya untuk owner bot.');
        }

        // Validasi format input ip dan password
        // Terima pemisah berupa | atau , serta abaikan spasi dan baris baru
        const tokens = param.replace(/\n+/g, ' ').trim().split(/[|,]/).map(s => s.trim()).filter(Boolean);
        if (tokens.length < 2) {
            return bot.sendMessage(chatId, `⚠️ Format salah!\nPenggunaan: /installprotect${scriptNum} ipvps|pwvps`, { parse_mode: 'Markdown' });
        }
        const [ipvps, pwvps] = tokens;

        try {
            await runProtectScript(scriptNum, ipvps, pwvps, bot, chatId);
        } catch (err) {
            bot.sendMessage(chatId, `❌ Proses instalasi proteksi ${scriptNum} gagal:\n${err.message}`, { parse_mode: 'Markdown' });
        }
    });

    // Handler untuk perintah /installprotectall
    bot.onText(/^\/installprotectall\s+(.+)/i, async (msg, match) => {
        const chatId = msg.chat.id;
        const userId = msg.from.id;
        const param = match[1];

        // Hanya owner yang diperbolehkan menjalankan perintah ini
        const ownersList = loadJsonData(OWNER_FILE);
        if (String(userId) !== String(OWNER_ID) && !ownersList.includes(userId.toString())) {
            return bot.sendMessage(chatId, '❌ Akses ditolak! Perintah ini hanya untuk owner bot.');
        }

        // Validasi format ip dan password untuk semua instalasi
        const paramsAll = param.replace(/\n+/g, ' ').trim().split(/[|,]/).map(s => s.trim()).filter(Boolean);
        if (paramsAll.length < 2) {
            return bot.sendMessage(chatId, '⚠️ Format salah!\nPenggunaan: /installprotectall ipvps|pwvps', { parse_mode: 'Markdown' });
        }
        const [ipvpsAll, pwvpsAll] = paramsAll;

        // Jalankan semua proteksi 1-9 secara berurutan
        for (let i = 1; i <= 9; i++) {
            try {
                await runProtectScript(i, ipvpsAll, pwvpsAll, bot, chatId);
            } catch (err) {
                bot.sendMessage(chatId, `❌ Proses instalasi proteksi ${i} gagal:\n${err.message}\nMenghentikan instalasi lainnya.`, { parse_mode: 'Markdown' });
                return;
            }
        }
        bot.sendMessage(chatId, '✅ Semua instalasi proteksi 1-9 telah selesai!', { parse_mode: 'Markdown' });
    });
    // ------------------ Akhir Fitur Install Protect Panel ------------------

    // -------------------------------------------------------------
    // Fitur Uninstall Protect Panel
    //
    // Bagian ini menambahkan perintah untuk menghapus proteksi panel
    // pterodactyl secara otomatis pada VPS. Owner bot dapat
    // menggunakan perintah /uninstallprotect1 hingga /uninstallprotect9
    // atau /uninstallprotectall untuk menghapus semua proteksi secara
    // berurutan. Setelah penghapusan, bot akan mengirimkan pesan
    // dengan branding "MAFF Anti proteksi" dan menampilkan nama
    // pembuat proteksi (@schnuffelll).
    //
    // Daftar URL script uninstall proteksi berdasarkan nomor 1-9
    const uninstallScripts = {
        1: 'https://raw.githubusercontent.com/NinoNeoxus/protectionsss/refs/heads/main/install_protection.sh',
        2: 'https://raw.githubusercontent.com/NinoNeoxus/protectionsss/refs/heads/main/install_protection.sh',
        3: 'https://raw.githubusercontent.com/NinoNeoxus/protectionsss/refs/heads/main/install_protection.sh',
        4: 'https://raw.githubusercontent.com/NinoNeoxus/protectionsss/refs/heads/main/install_protection.sh',
        5: 'https://raw.githubusercontent.com/NinoNeoxus/protectionsss/refs/heads/main/install_protection.sh',
        6: 'https://raw.githubusercontent.com/NinoNeoxus/protectionsss/refs/heads/main/install_protection.sh',
        7: 'https://raw.githubusercontent.com/NinoNeoxus/protectionsss/refs/heads/main/install_protection.sh',
        8: 'https://raw.githubusercontent.com/NinoNeoxus/protectionsss/refs/heads/main/install_protection.sh',
        9: 'https://raw.githubusercontent.com/NinoNeoxus/protectionsss/refs/heads/main/install_protection.sh'
    };

    /**
     * Menjalankan skrip uninstall proteksi di server VPS menggunakan SSH.
     * @param {number} scriptNum - Nomor skrip yang akan dijalankan (1-9).
     * @param {string} ipvps - Alamat IP VPS.
     * @param {string} pwvps - Password root VPS.
     * @param {object} bot - Instance bot Telegram.
     * @param {number} chatId - ID chat Telegram untuk mengirim pesan.
     */
    async function runUninstallScript(scriptNum, ipvps, pwvps, bot, chatId) {
        return new Promise((resolve, reject) => {
            const conn = new Client();
            // Informasikan pengguna bahwa koneksi dimulai
            bot.sendMessage(chatId, `⏳ Menghubungkan ke VPS *${ipvps}* dan mulai uninstall Protect Panel ${scriptNum}...`, { parse_mode: 'Markdown' });
            conn.on('ready', () => {
                // Koneksi berhasil
                bot.sendMessage(chatId, '⚙️ Koneksi berhasil! Proses uninstall sedang berjalan...', { parse_mode: 'Markdown' });
                // Jalankan skrip uninstall melalui SSH dengan mengganti credit lama menjadi Schnuffelll dan memperbarui tampilan panel.
                // Jalankan skrip uninstall asli dengan mengganti credit di dalamnya, lalu jalankan skrip pembaruan untuk membersihkan branding.
                // Perintah uninstall yang diperbarui: jalankan skrip uninstall asli
                // setelah mengganti semua referensi Malzxyz/Malzcom. Setelah itu
                // jalankan sed global untuk mengganti branding di instalasi panel.
                const uninstallCmd = `bash -c \"set -e; \\
curl -fsSL ${uninstallScripts[scriptNum]} | bash; \\
# Branding cleanup removed to prevent errors.
# Tambahkan ikon perisai ke label Active di panel
sed -i 's/Active/Active 🛡️/g' /var/www/pterodactyl/resources/views/admin/servers/index.blade.php\"`;
                conn.exec(uninstallCmd, (err, stream) => {
                    if (err) {
                        conn.end();
                        bot.sendMessage(chatId, `❌ Gagal mengeksekusi perintah:\n\`${err.message}\``, { parse_mode: 'Markdown' });
                        return reject(err);
                    }
                    let output = '';
                    stream.on('data', (data) => {
                        output += data.toString();
                    });
                    stream.stderr.on('data', (data) => {
                        output += `\n[ERROR] ${data.toString()}`;
                    });
                    stream.on('close', () => {
                        conn.end();
                        let cleanOutput = output.trim();
                        // Ganti credit yang tersisa di log: @Malzxyz Protect dan variasi nama Malzxyz/Malzcom
                        cleanOutput = cleanOutput.replace(/@[Mm]alz[Xx]yz\s*[Pp]rotect/gi, '@schnuffelll PROTECT V1.5');
                        cleanOutput = cleanOutput.replace(/Malz[Xx]yz|Malzcom|malzcom/gi, '@schnuffelll');
                        const truncated = cleanOutput.slice(-3800) || '(tidak ada output)';
                        bot.sendMessage(chatId, `✅ *Uninstall ${scriptNum} selesai!*\n\n📦 Output terakhir:\n\`\`\`${truncated}\`\`\`\n\n👤 By @schnuffelll`, { parse_mode: 'Markdown' });
                        resolve();
                    });
                });
            }).on('error', (err) => {
                bot.sendMessage(chatId, `❌ Gagal terhubung ke VPS!\nPeriksa IP & Password kamu.\n\nError:\n\`${err.message}\``, { parse_mode: 'Markdown' });
                reject(err);
            }).connect({
                host: ipvps,
                port: 22,
                username: 'root',
                password: pwvps
            });
        });
    }

    // Handler untuk perintah /uninstallprotect1 sampai /uninstallprotect9
    bot.onText(/^\/uninstallprotect([1-9])\s+(.+)/i, async (msg, match) => {
        const chatId = msg.chat.id;
        const userId = msg.from.id;
        const scriptNum = parseInt(match[1]);
        const param = match[2];

        // Hanya owner atau admin yang diperbolehkan menjalankan perintah ini
        const ownersList = loadJsonData(OWNER_FILE);
        if (String(userId) !== String(OWNER_ID) && !ownersList.includes(userId.toString())) {
            return bot.sendMessage(chatId, '❌ Akses ditolak! Perintah ini hanya untuk owner bot.');
        }

        // Validasi format input ip dan password
        const tokensUn = param.replace(/\n+/g, ' ').trim().split(/[|,]/).map(s => s.trim()).filter(Boolean);
        if (tokensUn.length < 2) {
            return bot.sendMessage(chatId, `⚠️ Format salah!\nPenggunaan: /uninstallprotect${scriptNum} ipvps|pwvps`, { parse_mode: 'Markdown' });
        }
        const [ipvps, pwvps] = tokensUn;

        try {
            await runUninstallScript(scriptNum, ipvps, pwvps, bot, chatId);
        } catch (err) {
            bot.sendMessage(chatId, `❌ Proses uninstall proteksi ${scriptNum} gagal:\n${err.message}`, { parse_mode: 'Markdown' });
        }
    });

    // Handler untuk perintah /uninstallprotectall
    bot.onText(/^\/uninstallprotectall\s+(.+)/i, async (msg, match) => {
        const chatId = msg.chat.id;
        const userId = msg.from.id;
        const param = match[1];

        // Hanya owner atau admin yang diperbolehkan menjalankan perintah ini
        const ownersList = loadJsonData(OWNER_FILE);
        if (String(userId) !== String(OWNER_ID) && !ownersList.includes(userId.toString())) {
            return bot.sendMessage(chatId, '❌ Akses ditolak! Perintah ini hanya untuk owner bot.');
        }

        // Validasi format input ip dan password untuk uninstall semua
        const paramsUnAll = param.replace(/\n+/g, ' ').trim().split(/[|,]/).map(s => s.trim()).filter(Boolean);
        if (paramsUnAll.length < 2) {
            return bot.sendMessage(chatId, '⚠️ Format salah!\nPenggunaan: /uninstallprotectall ipvps|pwvps', { parse_mode: 'Markdown' });
        }
        const [ipvpsAll, pwvpsAll] = paramsUnAll;

        // Jalankan semua uninstall proteksi 1-9 secara berurutan
        for (let i = 1; i <= 9; i++) {
            try {
                await runUninstallScript(i, ipvpsAll, pwvpsAll, bot, chatId);
            } catch (err) {
                bot.sendMessage(chatId, `❌ Proses uninstall proteksi ${i} gagal:\n${err.message}\nMenghentikan uninstall lainnya.`, { parse_mode: 'Markdown' });
                return;
            }
        }
        bot.sendMessage(chatId, '✅ Semua uninstall proteksi 1-9 telah selesai!', { parse_mode: 'Markdown' });
    });

    // log command
    function notifyOwner(commandName, msg) {
        const userId = msg.from.id;
        const username = msg.from.username || msg.from.first_name;
        const chatId = msg.chat.id;
        const now = new Date().toLocaleString('id-ID', { timeZone: 'Asia/Jakarta' });

        const logMessage = `<blockquote>💬 Command: /${commandName}
    👤 User: @${username}
    🆔 ID: ${userId}
    🕒 Waktu: ${now}
    </blockquote>
        `;
        bot.sendMessage(OWNER_ID, logMessage, { parse_mode: 'HTML' });
    }

    function addPremiumHandler(command, fileName, versi) {
        bot.onText(new RegExp(`^\\/${command}`), (msg) => {
            const chatId = msg.chat.id;
            const userId = msg.from.id.toString();

            // Gunakan ID pengirim untuk cooldown, jangan objek pesan
            const isCooldown = checkCooldown(msg.from.id);
            if (isCooldown) return bot.sendMessage(chatId, isCooldown);

            const owners = loadJsonData(OWNER_FILE);
            if (!owners.includes(userId)) {
                return bot.sendMessage(chatId, '❌ ᴋʜᴜsᴜs ᴏᴡɴᴇʀ');
            }

            const args = msg.text.trim().split(" ");
            if (args.length < 2) {
                return bot.sendMessage(chatId, `❌ Format salah!\nContoh: /${command} <id>`);
            }

            const targetUserId = args[1];
            if (!/^\d+$/.test(targetUserId)) {
                return bot.sendMessage(chatId, '❌ User ID harus berupa angka!');
            }

            const premUsers = loadJsonData(fileName);
            if (premUsers.includes(targetUserId)) {
                return bot.sendMessage(chatId, `⚠️ ᴜsᴇʀ ɪᴅ sᴜᴅᴀʜ ᴛᴇʀᴅᴀғᴛᴀʀ sᴇʙᴀɢᴀɪ ᴘʀᴇᴍɪᴜᴍ ${versi}!`);
            }

            premUsers.push(targetUserId);
            const success = saveJsonData(fileName, premUsers);

            if (success) {
                bot.sendMessage(chatId, `✅ ᴜꜱᴇʀ ɪᴅ ${targetUserId} ʙᴇʀʜᴀꜱɪʟ ᴅɪᴛᴀᴍʙᴀʜᴋᴀɴ ꜱᴇʙᴀɢᴀɪ ᴘʀᴇᴍɪᴜᴍ ${versi}!`, { parse_mode: "Markdown", reply_to_message_id: msg.message_id });
            } else {
                bot.sendMessage(chatId, `❌ Gagal menyimpan data Premium ${versi}!`);
            }
        });
    }

    // addprem
    addPremiumHandler("addpremv2", PREMV2_FILE, "V2");
    addPremiumHandler("addpremv3", PREMV3_FILE, "V3");
    addPremiumHandler("addpremv4", PREMV4_FILE, "V4");
    addPremiumHandler("addpremv5", PREMV5_FILE, "V5");

    function delPremiumHandler(command, fileName, versi) {
        bot.onText(new RegExp(`^\\/${command}`), (msg) => {
            const chatId = msg.chat.id;
            const userId = msg.from.id.toString();

            const owners = loadJsonData(OWNER_FILE);
            if (!owners.includes(userId)) {
                return bot.sendMessage(chatId, '❌ ᴋʜᴜsᴜs ᴏᴡɴᴇʀ');
            }

            const args = msg.text.trim().split(" ");
            if (args.length < 2) {
                return bot.sendMessage(chatId, `❌ Format salah!\nContoh: /${command} <id>`);
            }

            const targetUserId = args[1];
            if (!/^\d+$/.test(targetUserId)) {
                return bot.sendMessage(chatId, '❌ User ID harus berupa angka!');
            }

            let premUsers = loadJsonData(fileName);
            if (!premUsers.includes(targetUserId)) {
                return bot.sendMessage(chatId, `⚠️ ᴜsᴇʀ ɪᴅ ${targetUserId} ᴛɪᴅᴀᴋ ᴅɪᴛᴇᴍᴜᴋᴀɴ ᴅɪ ᴘʀᴇᴍɪᴜᴍ ${versi}!`);
            }

            premUsers = premUsers.filter(id => id !== targetUserId);
            const success = saveJsonData(fileName, premUsers);

            if (success) {
                bot.sendMessage(chatId, `✅ ᴜꜱᴇʀ ɪᴅ ${targetUserId} ʙᴇʀʜᴀꜱɪʟ ᴅɪʜᴀᴘᴜꜱ ᴅᴀʀɪ ᴘʀᴇᴍɪᴜᴍ ${versi}!`, { parse_mode: "Markdown", reply_to_message_id: msg.message_id });
            } else {
                bot.sendMessage(chatId, `❌ Gagal menyimpan perubahan Premium ${versi}!`);
            }
        });
    }

    // delprem
    delPremiumHandler("delpremv2", PREMV2_FILE, "V2");
    delPremiumHandler("delpremv3", PREMV3_FILE, "V3");
    delPremiumHandler("delpremv4", PREMV4_FILE, "V4");
    delPremiumHandler("delpremv5", PREMV5_FILE, "V5"); // Note: there was a typo delResellerHandler here in original

    function addResellerHandler(command, fileName, versi) {
        bot.onText(new RegExp(`^\\/${command}`), (msg) => {
            const chatId = msg.chat.id;
            const userId = msg.from.id.toString();

            const owners = loadJsonData(OWNER_FILE);
            if (!owners.includes(userId)) {
                return bot.sendMessage(chatId, '❌ ᴋʜᴜsᴜs ᴏᴡɴᴇʀ');
            }

            const args = msg.text.trim().split(" ");
            if (args.length < 2) {
                return bot.sendMessage(chatId, `⚠️ Format salah!\nGunakan: /${command} <user_id>`);
            }

            const targetUserId = args[1];
            if (!/^\d+$/.test(targetUserId)) {
                return bot.sendMessage(chatId, '❌ User ID harus berupa angka!');
            }

            const ressUsers = loadJsonData(fileName);
            if (ressUsers.includes(targetUserId)) {
                return bot.sendMessage(chatId, `⚠️ ᴜsᴇʀ ɪᴅ sᴜᴅᴀʜ ᴍᴇɴᴊᴀᴅɪ ʀᴇsᴇʟʟᴇʀ ${versi}!`);
            }

            ressUsers.push(targetUserId);
            const success = saveJsonData(fileName, ressUsers);

            if (success) {
                bot.sendMessage(chatId, `✅ ᴜꜱᴇʀ ɪᴅ ${targetUserId} ʙᴇʀʜᴀꜱɪʟ ᴅɪᴛᴀᴍʙᴀʜᴋᴀɴ ꜱᴇʙᴀɢᴀɪ ʀᴇꜱᴇʟʟᴇʀ ${versi}!`, { parse_mode: "Markdown", reply_to_message_id: msg.message_id });
            } else {
                bot.sendMessage(chatId, `❌ Gagal menyimpan data Reseller ${versi}!`);
            }
        });
    }

    // address
    addResellerHandler("addressv2", RESSV2_FILE, "V2");
    addResellerHandler("addressv3", RESSV3_FILE, "V3");
    addResellerHandler("addressv4", RESSV4_FILE, "V4");
    addResellerHandler("addressv5", RESSV5_FILE, "V5");

    function delResellerHandler(command, fileName, versi) {
        bot.onText(new RegExp(`^\\/${command}`), (msg) => {
            const chatId = msg.chat.id;
            const userId = msg.from.id.toString();

            const owners = loadJsonData(OWNER_FILE);
            if (!owners.includes(userId)) {
                return bot.sendMessage(chatId, '❌ ᴋʜᴜsᴜs ᴏᴡɴᴇʀ');
            }

            const args = msg.text.trim().split(" ");
            if (args.length < 2) {
                return bot.sendMessage(chatId, `⚠️ Format salah!\nGunakan: /${command} <id>`);
            }

            const targetUserId = args[1];
            if (!/^\d+$/.test(targetUserId)) {
                return bot.sendMessage(chatId, '❌ User ID harus berupa angka!');
            }

            let ressUsers = loadJsonData(fileName);
            if (!ressUsers.includes(targetUserId)) {
                return bot.sendMessage(chatId, `⚠️ ᴜsᴇʀ ɪᴅ ${targetUserId} ᴛɪᴅᴀᴋ ᴅɪᴛᴇᴍᴜᴋᴀɴ ᴅɪ ʀᴇsᴇʟʟᴇʀ ${versi}!`);
            }

            ressUsers = ressUsers.filter(id => id !== targetUserId);
            const success = saveJsonData(fileName, ressUsers);

            if (success) {
                bot.sendMessage(chatId, `✅ User ID ${targetUserId} berhasil dihapus dari Reseller ${versi}!`, { parse_mode: "Markdown", reply_to_message_id: msg.message_id });
            } else {
                bot.sendMessage(chatId, `❌ Gagal menyimpan perubahan Reseller ${versi}!`);
            }
        });
    }

    // /delress
    delResellerHandler("delressv2", RESSV2_FILE, "V2");
    delResellerHandler("delressv3", RESSV3_FILE, "V3");
    delResellerHandler("delressv4", RESSV4_FILE, "V4");
    delResellerHandler("delressv5", RESSV5_FILE, "V5");

    // =================================================================
    // FITUR MANAGEMENT USER - /listuser, /cleanuser
    // =================================================================

    // /listuser - Lihat semua user terdaftar (premium, reseller)
    bot.onText(/^\/listuser$/i, async (msg) => {
        const chatId = msg.chat.id;
        const userId = msg.from.id.toString();

        const owners = loadJsonData(OWNER_FILE);
        if (!owners.includes(userId)) {
            return bot.sendMessage(chatId, '❌ ᴋʜᴜꜱᴜꜱ ᴏᴡɴᴇʀ!');
        }

        try {
            const premUsers = loadJsonData(PREMIUM_FILE);
            const ressUsers = loadJsonData(RESS_FILE);
            const premV2 = loadJsonData(PREMV2_FILE);
            const premV3 = loadJsonData(PREMV3_FILE);
            const premV4 = loadJsonData(PREMV4_FILE);
            const premV5 = loadJsonData(PREMV5_FILE);
            const ressV2 = loadJsonData(RESSV2_FILE);
            const ressV3 = loadJsonData(RESSV3_FILE);
            const ressV4 = loadJsonData(RESSV4_FILE);
            const ressV5 = loadJsonData(RESSV5_FILE);

            const formatList = (arr, name) => {
                if (!arr || arr.length === 0) return `\n<b>${name}:</b> <i>Kosong</i>`;
                return `\n<b>${name}:</b> (${arr.length})\n` + arr.map((id, i) => `  ${i + 1}. <code>${id}</code>`).join('\n');
            };

            const text = `
📋 <b>DAFTAR USER TERDAFTAR</b>

<blockquote expandable>
━━━━ PREMIUM ━━━━${formatList(premUsers, 'Premium V1')}${formatList(premV2, 'Premium V2')}${formatList(premV3, 'Premium V3')}${formatList(premV4, 'Premium V4')}${formatList(premV5, 'Premium V5')}

━━━━ RESELLER ━━━━${formatList(ressUsers, 'Reseller V1')}${formatList(ressV2, 'Reseller V2')}${formatList(ressV3, 'Reseller V3')}${formatList(ressV4, 'Reseller V4')}${formatList(ressV5, 'Reseller V5')}
</blockquote>

<i>Gunakan /cleanuser untuk hapus semua kecuali owner</i>
`;

            bot.sendMessage(chatId, text, { parse_mode: 'HTML', reply_to_message_id: msg.message_id });
        } catch (err) {
            bot.sendMessage(chatId, '❌ Error: ' + err.message);
        }
    });

    // /cleanuser - Hapus semua user kecuali owner
    bot.onText(/^\/cleanuser$/i, async (msg) => {
        const chatId = msg.chat.id;
        const userId = msg.from.id.toString();

        const owners = loadJsonData(OWNER_FILE);
        if (!owners.includes(userId)) {
            return bot.sendMessage(chatId, '❌ ᴋʜᴜꜱᴜꜱ ᴏᴡɴᴇʀ!');
        }

        // Konfirmasi dulu
        bot.sendMessage(chatId, `⚠️ <b>KONFIRMASI CLEAN USER</b>

Ini akan <b>MENGHAPUS SEMUA</b> user terdaftar dari:
• Premium V1-V5
• Reseller V1-V5

Owner ID akan tetap tersimpan.

Ketik <code>/cleanuser confirm</code> untuk lanjut.`, { parse_mode: 'HTML', reply_to_message_id: msg.message_id });
    });

    // /cleanuser confirm - Eksekusi hapus semua
    bot.onText(/^\/cleanuser confirm$/i, async (msg) => {
        const chatId = msg.chat.id;
        const userId = msg.from.id.toString();

        const owners = loadJsonData(OWNER_FILE);
        if (!owners.includes(userId)) {
            return bot.sendMessage(chatId, '❌ ᴋʜᴜꜱᴜꜱ ᴏᴡɴᴇʀ!');
        }

        const wait = await bot.sendMessage(chatId, '⏳ Membersihkan data user...', { reply_to_message_id: msg.message_id });

        try {
            // Reset semua file ke hanya owner
            const ownerOnly = owners.slice(); // Copy owners array

            saveJsonData(PREMIUM_FILE, ownerOnly);
            saveJsonData(RESS_FILE, ownerOnly);
            saveJsonData(PREMV2_FILE, []);
            saveJsonData(PREMV3_FILE, []);
            saveJsonData(PREMV4_FILE, []);
            saveJsonData(PREMV5_FILE, []);
            saveJsonData(RESSV2_FILE, []);
            saveJsonData(RESSV3_FILE, []);
            saveJsonData(RESSV4_FILE, []);
            saveJsonData(RESSV5_FILE, []);

            // Reset users.json juga
            const usersFile = './db/users/users.json';
            if (fs.existsSync(usersFile)) {
                fs.writeFileSync(usersFile, JSON.stringify(ownerOnly, null, 2));
            }

            await bot.editMessageText(`✅ <b>CLEAN USER BERHASIL!</b>

Semua data user sudah dihapus:
• Premium V1-V5: ✅ Dibersihkan
• Reseller V1-V5: ✅ Dibersihkan
• Users List: ✅ Dibersihkan

<i>Owner ID tetap tersimpan.</i>`, {
                chat_id: chatId,
                message_id: wait.message_id,
                parse_mode: 'HTML'
            });
        } catch (err) {
            bot.editMessageText('❌ Error: ' + err.message, {
                chat_id: chatId,
                message_id: wait.message_id
            });
        }
    });

    // create file premium
    if (!fs.existsSync(PREMIUM_FILE)) {
        saveJsonData(PREMIUM_FILE, []);
    }
    if (!fs.existsSync(PREMV2_FILE)) {
        saveJsonData(PREMV2_FILE, []);
    }
    if (!fs.existsSync(PREMV3_FILE)) {
        saveJsonData(PREMV3_FILE, []);
    }
    if (!fs.existsSync(PREMV4_FILE)) {
        saveJsonData(PREMV4_FILE, []);
    }
    if (!fs.existsSync(PREMV5_FILE)) {
        saveJsonData(PREMV5_FILE, []);
    }

    // create file reseller
    if (!fs.existsSync(RESS_FILE)) {
        saveJsonData(RESS_FILE, []);
    }
    if (!fs.existsSync(RESSV2_FILE)) {
        saveJsonData(RESSV2_FILE, []);
    }
    if (!fs.existsSync(RESSV3_FILE)) {
        saveJsonData(RESSV3_FILE, []);
    }
    if (!fs.existsSync(RESSV4_FILE)) {
        saveJsonData(RESSV4_FILE, []);
    }
    if (!fs.existsSync(RESSV5_FILE)) {
        saveJsonData(RESSV5_FILE, []);
    }
    if (!fs.existsSync(OWNER_FILE)) {
        saveJsonData(OWNER_FILE, []);
    }

    // --- BUAT DATABASE PANEL SETTINGS ---
    if (!fs.existsSync(PANEL_SETTINGS_FILE)) {
        const defaultPanelSettings = {
            "domain": settings.domain || "-",
            "plta": settings.plta || "-",
            "pltc": settings.pltc || "-",
            "domainPriv": settings.domainPriv || "-",
            "pltaPriv": settings.pltaPriv || "-",
            "pltcPriv": settings.pltcPriv || "-",
            "domainV2": settings.domainV2 || "-",
            "pltaV2": settings.pltaV2 || "-",
            "pltcV2": settings.pltcV2 || "-",
            "domainV3": settings.domainV3 || "-",
            "pltaV3": settings.pltaV3 || "-",
            "pltcV3": settings.pltcV3 || "-",
            "domainV4": settings.domainV4 || "-",
            "pltaV4": settings.pltaV4 || "-",
            "pltcV4": settings.pltcV4 || "-",
            "domainV5": settings.domainV5 || "-",
            "pltaV5": settings.pltaV5 || "-",
            "pltcV5": settings.pltcV5 || "-"
        };
        saveJsonData(PANEL_SETTINGS_FILE, defaultPanelSettings);
        console.log(chalk.green('✓ Created db/panel_settings.json from config.js defaults.'));
    }
    // --- SELESAI BUAT DATABASE ---

    // command broadcast
    bot.onText(/^\/bc$/, async (msg) => {
        const chatId = msg.chat.id;

        if (chatId.toString() !== OWNER_ID.toString()) { // --- FIX STRING vs NUMBER ---
            return bot.sendMessage(chatId, "❌ ᴋʜᴜsᴜs ᴏᴡɴᴇʀ");
        }

        if (!msg.reply_to_message) {
            return bot.sendMessage(chatId, "⚠️ ʀᴇᴘʟʏ ᴘᴇsᴀɴɴʏᴀ");
        }

        const usersFile = "./db/users/users.json";
        let users = [];
        if (fs.existsSync(usersFile)) {
            users = JSON.parse(fs.readFileSync(usersFile));
        }

        let sukses = 0, gagal = 0;
        for (let uid of users) {
            try {
                await bot.forwardMessage(uid, chatId, msg.reply_to_message.message_id);

                await bot.sendMessage(uid, "💬", {
                    reply_markup: {
                        inline_keyboard: [
                            [{ text: "Kirim Pesan", callback_data: `contact_owner` }]
                        ]
                    }
                });

                sukses++;
            } catch {
                gagal++;
            }
        }

        bot.sendMessage(chatId, `✅ ʙʀᴏᴀᴅᴄᴀꜱᴛ ꜱᴇʟᴇꜱᴀɪ\nSukses: ${sukses}\nGagal: ${gagal}`, { parse_mode: "Markdown", reply_to_message_id: msg.message_id });
    });

    const notifOwner = settings.ownerId;

    // ================================================================
    //  Real‑Time Logging of User Interactions
    //
    //  At the user's request, we add a global message handler that logs
    //  every incoming message to the server console.  This allows the
    //  operator to see in real time which users are interacting with the
    //  bot, what commands they send and when.  The log entries are
    //  printed using chalk for readability and include the timestamp
    //  (localized to Asia/Makassar), the username (or first name if no
    //  username is set), the Telegram ID of the sender and the text of
    //  the message.  If the message contains no text (e.g. photos or
    //  stickers), we fall back to any caption or a placeholder.
    bot.on('message', (msg) => {
        try {
            const now = new Date().toLocaleString('id-ID', { timeZone: 'Asia/Makassar' });
            const userId = msg.from && msg.from.id ? msg.from.id : 'unknown';
            // Prefer @username; fall back to first and last name if available
            const username = msg.from && (msg.from.username ? `@${msg.from.username}` : `${msg.from.first_name || ''}${msg.from.last_name ? ' ' + msg.from.last_name : ''}`);
            // Retrieve text or caption; otherwise mark as non-text
            const content = msg.text || msg.caption || '<non‑text message>';
            const logEntry = `[${now}] ${username} (${userId}) sent: ${content}`;
            console.log(chalk.magenta(logEntry));
        } catch (err) {
            // In case of an unexpected structure, log the raw message object
            console.log(chalk.magenta('[Log Error] Unable to parse incoming message:'), msg);
        }
    });
    // ================================================================
    let waitingReply = {};

    bot.on("callback_query", async (query) => {
        const chatId = query.message.chat.id;
        const data = query.data;

        if (data === "contact_owner") {
            waitingReply[chatId] = true;
            await bot.sendMessage(chatId, "Silahkan ketik pesannya :");
            await bot.answerCallbackQuery(query.id);
        } else if (data === "installprotectmenu") {
            // Tampilkan menu untuk install protect
            const menuText =
                `╭──✧ ɪɴꜱᴛᴀʟʟ ᴘʀᴏᴛᴇᴄᴛ ᴍᴇɴᴜ ✧
│ ⪼ /installprotect1 <ipvps|pwvps>
│ ⪼ /installprotect2 <ipvps|pwvps>
│ ⪼ /installprotect3 <ipvps|pwvps>
│ ⪼ /installprotect4 <ipvps|pwvps>
│ ⪼ /installprotect5 <ipvps|pwvps>
│ ⪼ /installprotect6 <ipvps|pwvps>
│ ⪼ /installprotect7 <ipvps|pwvps>
│ ⪼ /installprotect8 <ipvps|pwvps>
│ ⪼ /installprotect9 <ipvps|pwvps>
│ ⪼ /installprotectall <ipvps|pwvps>
╰────────────⧽`;
            await bot.sendMessage(chatId, menuText, { parse_mode: 'Markdown' });
            await bot.answerCallbackQuery(query.id);
        } else if (data === "uninstallprotectmenu") {
            // Tampilkan menu untuk uninstall protect
            const menuText =
                `╭──✧ ᴜɴɪɴꜱᴛᴀʟʟ ᴘʀᴏᴛᴇᴄᴛ ᴍᴇɴᴜ ✧
│ ⪼ /uninstallprotect1 <ipvps|pwvps>
│ ⪼ /uninstallprotect2 <ipvps|pwvps>
│ ⪼ /uninstallprotect3 <ipvps|pwvps>
│ ⪼ /uninstallprotect4 <ipvps|pwvps>
│ ⪼ /uninstallprotect5 <ipvps|pwvps>
│ ⪼ /uninstallprotect6 <ipvps|pwvps>
│ ⪼ /uninstallprotect7 <ipvps|pwvps>
│ ⪼ /uninstallprotect8 <ipvps|pwvps>
│ ⪼ /uninstallprotect9 <ipvps|pwvps>
│ ⪼ /uninstallprotectall <ipvps|pwvps>
╰────────────⧽`;
            await bot.sendMessage(chatId, menuText, { parse_mode: 'Markdown' });
            await bot.answerCallbackQuery(query.id);
        }
    });

    bot.on("message", async (msg) => {
        const chatId = msg.chat.id;

        if (waitingReply[chatId] && !msg.text.startsWith('/')) { // Prevent commands from being forwarded
            const username = msg.from.username ? `@${msg.from.username}` : msg.from.first_name;

            await bot.sendMessage(notifOwner, `📩 dari ${username}\n(ID: ${msg.from.id}):\n\nMessage: ${msg.text}`);

            await bot.sendMessage(chatId, `✅ ꜱᴜḍᴀʜ ᴅɪᴛᴇʀᴜꜱᴋᴀɴ ᴋᴇ ᴏᴡɴᴇʀ. ᴛᴇʀɪᴍᴀ ᴋᴀꜱɪʜ!`, { parse_mode: "Markdown", reply_to_message_id: msg.message_id });

            delete waitingReply[chatId];
        }
    });

    // command pairing wa
    bot.onText(/\/reqpair(?:\s+(.+))?/, async (msg, match) => {
        const chatId = msg.chat.id;
        const text = match[1];
        if (!text) {
            bot.sendMessage(chatId, '❌ Format salah!\nContoh: /reqpair 628123456789');
            return;
        }

        const botNumber = match[1].replace(/[^0-9]/g, "");

        try {
            // The connectToWhatsApp function is in connect.js which is commented out.
            // This command will throw an error unless you re-enable it.
            await connectToWhatsApp(botNumber, chatId);
        } catch (error) {
            console.error("Error in reqpair:", error);
            bot.sendMessage(
                chatId,
                "Fitur pairing WhatsApp tidak aktif saat ini."
            );
        }
    });

    // command send message gb
    bot.onText(/^\/sendmsg (.+)$/, async (msg, match) => {
        const chatId = msg.chat.id
        const replyTo = msg.reply_to_message
        const targetGroupId = match[1]

        if (!replyTo) {
            return bot.sendMessage(chatId, "❌ Reply pesan yang diforward!")
        }

        try {
            await bot.forwardMessage(targetGroupId, chatId, replyTo.message_id)
            bot.sendMessage(chatId, `✅ Sukses diforward ke grup ${targetGroupId}`)
        } catch (err) {
            console.error(err)
            bot.sendMessage(chatId, "❌ Gagal forward pesan, cek lagi ID grupnya.")
        }
    })

    let autoBackupInterval = null;

    bot.onText(/\/backup/, (msg) => {
        const chatId = msg.chat.id;
        const userId = msg.from.id;

        if (userId.toString() !== OWNER_ID.toString()) { // --- FIX STRING vs NUMBER ---
            return bot.sendMessage(
                chatId,
                `❌ Kamu bukan @${dev}!`,
                { parse_mode: "Markdown", reply_to_message_id: msg.message_id }
            );
        }

        const doBackup = () => {
            const backupFile = `SCHNUFFELLL_BACKUP.zip`; // --- NAMA BARU ---
            const output = fs.createWriteStream(backupFile);
            const archive = archiver("zip", { zlib: { level: 9 } });

            output.on("close", () => {
                bot.sendDocument(chatId, backupFile).then(() => {
                    fs.unlinkSync(backupFile);
                });
            });

            archive.on("error", (err) => {
                console.error(err);
                bot.sendMessage(chatId, "❌ Gagal membuat backup!");
            });

            archive.pipe(output);

            // Backup SEMUA file kecuali node_modules & .git
            archive.glob('**/*', {
                cwd: '.',
                ignore: ['node_modules/**', '.git/**', backupFile, 'package-lock.json']
            });

            archive.finalize();
        };

        doBackup();

        if (autoBackupInterval) clearInterval(autoBackupInterval);

        autoBackupInterval = setInterval(doBackup, 30 * 60 * 1000);

        bot.sendMessage(chatId, "Backup berhasil dibuat. Auto-backup aktif setiap 30 menit.", { reply_to_message_id: msg.message_id });
    });

    bot.onText(/\/setcd (\d+[smh])/, (msg, match) => {
        const chatId = msg.chat.id;
        const response = setCooldown(match[1]);

        bot.sendMessage(chatId, response);
    });

    bot.onText(/^\/cekid$/, async (msg) => {
        notifyOwner('cekid', msg);
        const chatId = msg.chat.id;
        const user = msg.from;

        try {
            const fullName = `${user.first_name || ''} ${user.last_name || ''}`.trim();
            const username = user.username ? `@${user.username}` : '-';
            const userId = user.id.toString();
            const today = new Date().toISOString().split('T')[0];
            const dcId = (user.id >> 32) % 256;

            let photoUrl = null;
            try {
                const photos = await bot.getUserProfilePhotos(user.id, { limit: 1 });
                if (photos.total_count > 0) {
                    const fileId = photos.photos[0][0].file_id;
                    const file = await bot.getFile(fileId);
                    photoUrl = `https://api.telegram.org/file/bot${settings.token}/${file.file_path}`;
                }
            } catch (e) {
                console.log('Gagal ambil foto profil:', e.message);
            }

            const canvas = createCanvas(800, 450);
            const ctx = canvas.getContext('2d');

            const gradient = ctx.createLinearGradient(0, 0, canvas.width, canvas.height);
            gradient.addColorStop(0, '#0a4f44');
            gradient.addColorStop(1, '#128C7E');
            ctx.fillStyle = gradient;
            ctx.fillRect(0, 0, canvas.width, canvas.height);

            ctx.fillStyle = 'rgba(255, 255, 255, 0.9)';
            ctx.roundRect(40, 40, canvas.width - 80, canvas.height - 80, 20);
            ctx.fill();

            ctx.fillStyle = '#0a4f44';
            ctx.font = 'bold 32px Arial';
            ctx.textAlign = 'center';
            ctx.fillText('ID CARD TELEGRAM', canvas.width / 2, 80);

            ctx.strokeStyle = '#0a4f44';
            ctx.lineWidth = 2;
            ctx.beginPath();
            ctx.moveTo(50, 100);
            ctx.lineTo(canvas.width - 50, 100);
            ctx.stroke();

            if (photoUrl) {
                try {
                    const response = await axios.get(photoUrl, { responseType: 'arraybuffer' });
                    const avatar = await loadImage(response.data);

                    ctx.save();
                    ctx.beginPath();
                    ctx.arc(150, 220, 70, 0, Math.PI * 2, true);
                    ctx.closePath();
                    ctx.clip();

                    ctx.drawImage(avatar, 80, 150, 140, 140);
                    ctx.restore();

                    ctx.strokeStyle = '#0a4f44';
                    ctx.lineWidth = 3;
                    ctx.beginPath();
                    ctx.arc(150, 220, 70, 0, Math.PI * 2, true);
                    ctx.stroke();
                } catch (e) {
                    console.log('Gagal memuat gambar:', e.message);
                }
            } else {
                ctx.fillStyle = '#ccc';
                ctx.beginPath();
                ctx.arc(150, 220, 70, 0, Math.PI * 2, true);
                ctx.fill();
            }

            ctx.textAlign = 'left';
            ctx.fillStyle = '#333';
            ctx.font = 'bold 24px Arial';
            ctx.fillText('Informasi Pengguna:', 280, 150);

            ctx.font = '20px Arial';
            ctx.fillText(`Nama: ${fullName}`, 280, 190);
            ctx.fillText(`User ID: ${userId}`, 280, 220);
            ctx.fillText(`Username: ${username}`, 280, 250);
            ctx.fillText(`Tanggal: ${today}`, 280, 280);
            ctx.fillText(`DC ID: ${dcId}`, 280, 310);

            ctx.textAlign = 'center';
            ctx.font = 'italic 16px Arial';
            ctx.fillStyle = '#666';
            ctx.fillText(`ID Card by Schnuffelll Bot - @${dev}`, canvas.width / 2, canvas.height - 50); // --- NAMA BARU ---

            const buffer = canvas.toBuffer('image/png');

            const caption = `
    👤 *Nama         :* ${fullName}
    🆔️ *User ID      :* \`${userId}\`
    🌐 *Username :* ${username}
        `;

            await bot.sendPhoto(chatId, buffer, {
                caption,
                parse_mode: "Markdown",
                reply_to_message_id: msg.message_id,
                reply_markup: {
                    inline_keyboard: [
                        [{ text: "ʙᴜʏ ꜱᴄʀɪᴘᴛ", url: `https://t.me/aboutnSchnuffellll/710` }]
                    ]
                }
            });

        } catch (err) {
            console.error('Gagal generate ID card:', err.message);
            bot.sendMessage(chatId, '❌ Gagal generate ID card. Silakan coba lagi.');
        }
    });

    // /addowner — tambah Owner bot (support reply + manual ID + durasi)
    const parseOwnerTargetAndDuration = (msg) => {
        const rawText = msg.text || "";
        const withoutCommand = rawText.replace(/^\/\S+/, "").trim();
        const args = withoutCommand ? withoutCommand.split(/\s+/) : [];

        // MODE REPLY: /addowner 30d (reply pesan user)
        if (msg.reply_to_message) {
            if (args.length < 1) {
                return {
                    error: '❌ Format salah!\nContoh (reply):\n/addowner 30d'
                };
            }

            const target = msg.reply_to_message.from || {};
            return {
                targetId: String(target.id),
                duration: args[0],
                targetFromReply: target
            };
        }

        // MODE MANUAL: /addowner 123456789 30d
        if (args.length < 2) {
            return {
                error: '❌ Format salah!\nContoh:\n/addowner 123456789 30d'
            };
        }

        const [id, dur] = args;
        if (!/^\d+$/.test(id)) {
            return { error: '❌ User ID harus berupa angka!' };
        }

        return {
            targetId: id,
            duration: dur,
            targetFromReply: null
        };
    };

    bot.onText(/^\/addowner(?:@\w+)?(?:\s+.+)?$/i, (msg) => {
        const chatId = msg.chat.id;
        const userId = msg.from.id.toString();

        let owners = loadJsonData(OWNER_FILE);
        if (!Array.isArray(owners)) owners = [];

        // Validasi: hanya OWNER_ID atau yang ada di adminID.json
        if (msg.from.id.toString() !== OWNER_ID.toString() && !owners.includes(userId)) {
            bot.sendMessage(chatId, '❌ ᴋʜᴜꜱᴜꜱ ᴏᴡɴᴇR ʙᴏᴛ');
            return;
        }

        const parsed = parseOwnerTargetAndDuration(msg);
        if (parsed.error) {
            return bot.sendMessage(chatId, parsed.error, {
                reply_to_message_id: msg.message_id
            });
        }

        const { targetId, duration, targetFromReply } = parsed;

        if (owners.includes(targetId)) {
            bot.sendMessage(chatId, '⚠️ ᴜꜱᴇʀ ɪᴅ ꜱᴜᴅᴀʜ ᴍᴇɴᴊᴀᴅɪ ᴏᴡɴᴇʀ!', {
                reply_to_message_id: msg.message_id
            });
            return;
        }

        owners.push(targetId);
        const success = saveJsonData(OWNER_FILE, owners);

        if (success) {
            let displayName = targetId;
            if (targetFromReply) {
                if (targetFromReply.username) {
                    displayName = `@${targetFromReply.username}`;
                } else if (targetFromReply.first_name) {
                    displayName = targetFromReply.first_name;
                } else {
                    displayName = 'User';
                }
            }

            let msgText = `✅ User ${displayName} (ID: \`${targetId}\`) berhasil ditambahkan sebagai Owner Bot!`;
            if (duration) {
                msgText += `\nDurasi: *${duration}*`;
            }

            bot.sendMessage(chatId, msgText, {
                parse_mode: "Markdown",
                reply_to_message_id: msg.message_id
            });
        } else {
            bot.sendMessage(chatId, '❌ Gagal menyimpan data owner!');
        }
    });



    bot.onText(/^\/delprem$/, (msg) => {
        const chatId = msg.chat.id;
        const userId = msg.from.id.toString();

        const owners = loadJsonData(OWNER_FILE);
        if (msg.from.id.toString() !== OWNER_ID.toString() && !owners.includes(userId)) { // --- FIX STRING vs NUMBER ---
            return bot.sendMessage(chatId, '❌ ᴋʜᴜꜱᴜꜱ ᴏᴡɴᴇʀ ʙᴏᴛ');
        }

        if (!msg.reply_to_message) {
            return bot.sendMessage(chatId, '❌ Reply ke pesan user!\nContoh: reply pesan lalu ketik /delprem');
        }

        const targetUserId = msg.reply_to_message.from.id.toString();
        let premUsers = loadJsonData(PREMIUM_FILE);

        if (premUsers.includes(targetUserId)) {
            premUsers = premUsers.filter(uid => uid !== targetUserId);
            saveJsonData(PREMIUM_FILE, premUsers);

            bot.sendMessage(chatId, `✅ User ID ${targetUserId} berhasil dihapus dari Premium!`, {
                parse_mode: "Markdown",
                reply_to_message_id: msg.message_id
            });
        } else {
            bot.sendMessage(chatId, `⚠️ User ID ${targetUserId} tidak ditemukan di daftar Premium!`);
        }
    });

    bot.onText(/^\/delress$/, (msg) => {
        const chatId = msg.chat.id;
        const userId = msg.from.id.toString();

        const owners = loadJsonData(OWNER_FILE);
        if (msg.from.id.toString() !== OWNER_ID.toString() && !owners.includes(userId)) { // --- FIX STRING vs NUMBER ---
            return bot.sendMessage(chatId, '❌ ᴋʜᴜꜱᴜꜱ ᴏᴡɴᴇʀ ʙᴏᴛ');
        }

        if (!msg.reply_to_message) {
            return bot.sendMessage(chatId, '❌ Reply ke pesan user!\nContoh: reply pesan lalu ketik /delress');
        }

        const targetUserId = msg.reply_to_message.from.id.toString();
        let ressUsers = loadJsonData(RESS_FILE);

        if (ressUsers.includes(targetUserId)) {
            ressUsers = ressUsers.filter(uid => uid !== targetUserId);
            saveJsonData(RESS_FILE, ressUsers);

            bot.sendMessage(chatId, `✅ User ID ${targetUserId} berhasil dihapus dari Reseller Panel!`, {
                parse_mode: "Markdown",
                reply_to_message_id: msg.message_id
            });
        } else {
            bot.sendMessage(chatId, `⚠️ User ID ${targetUserId} tidak ditemukan di daftar Reseller Panel!`);
        }
    });

    bot.onText(/^\/delowner(?:\s+(.+))?/, (msg, match) => {
        const chatId = msg.chat.id;
        const userId = msg.from.id.toString();
        let owners = loadJsonData(OWNER_FILE);

        if (msg.from.id.toString() !== OWNER_ID.toString() && !owners.includes(userId)) { // --- FIX STRING vs NUMBER ---
            bot.sendMessage(chatId, '❌ ᴋʜᴜꜱᴜꜱ ᴏᴡɴᴇʀ ʙᴏᴛ');
            return;
        }

        const targetUserId = match[1];
        if (!targetUserId) {
            bot.sendMessage(chatId, '❌ Format salah!\nContoh: /delowner 123456789');
            return;
        }

        if (!/^\d+$/.test(targetUserId)) {
            bot.sendMessage(chatId, '❌ User ID harus berupa angka!');
            return;
        }

        if (!owners.includes(targetUserId)) {
            bot.sendMessage(chatId, '⚠️ ᴜsᴇʀ ɪᴅ ᴛɪᴅᴀᴋ ᴅɪᴛᴇᴍᴜᴋᴀɴ ᴅɪ ᴅᴀғᴛᴀʀ ᴏᴡɴᴇʀ');
            return;
        }

        if (targetUserId === userId) {
            bot.sendMessage(chatId, '❌ Gagal menghapus diri sendiri sebagai Owner!');
            return;
        }

        owners = owners.filter(id => id !== targetUserId);
        const success = saveJsonData(OWNER_FILE, owners);

        if (success) {
            bot.sendMessage(chatId, `✅ ᴜꜱᴇʀ ɪᴅ ${targetUserId} ʙᴇʀʜᴀꜱɪʟ ᴅɪʜᴀᴘᴜꜱ ᴅᴀʀɪ ᴅᴀꜰᴛᴀʀ ᴏᴡɴᴇʀ ʙᴏᴛ!`);
        } else {
            bot.sendMessage(chatId, '❌ Gagal menyimpan perubahan data Owner!');
        }
    });

    bot.onText(/^\/pay/, async (msg) => {
        const chatId = msg.chat.id;

        await bot.sendPhoto(chatId, qris, {
            caption: `<blockquote>💳 <b>Metode Pembayaran Qris</b>

    Silahkan scan QRIS di atas untuk melakukan pembayaran.

    <b>💰 DANA Payment</b>
    Nomor: <code>${settings.dana}</code> (salin)
    a/n ${settings.namaDana}

    Kirim bukti transfer dan hubungi owner atau pilih metode pembayaran Dana!
    </blockquote>`,
            parse_mode: "HTML",
            reply_markup: {
                inline_keyboard: [
                    [{ text: "💬 ᴄʜᴀᴛ ᴏᴡɴᴇʀ", url: `https://t.me/${dev}` }]
                ]
            }
        });
    });

    bot.onText(/^\/restart$/, async (msg) => {
        const chatId = msg.chat.id;

        // --- FIX STRING vs NUMBER ---
        if (msg.from.id.toString() !== OWNER_ID.toString()) {
            // --- SELESAI FIX ---
            bot.sendMessage(chatId, `❌ Kamu bukan ${settings.dev}`);
            return;
        }

        const bars = ["⏳ ᴘʀᴏᴄᴇꜱꜱ [░░░░░░░░░░] 0%", "⏳ ᴘʀᴏᴄᴇꜱꜱ [█░░░░░░░░░] 10%", "⏳ ᴘʀᴏᴄE3ꜱꜱ [██░░░░░░░░] 20%", "⏳ ᴘʀᴏᴄᴇꜱꜱ [███░░░░░░░] 30%", "⏳ ᴘʀᴏᴄᴇꜱꜱ [████░░░░░░] 40%", "⏳ ᴘʀᴏᴄᴇꜱꜱ [█████░░░░░] 50%", "⏳ ᴘʀᴏᴄᴇꜱꜱ [██████░░░░] 60%", "⏳ ᴘʀᴏᴄᴇꜱꜱ [███████░░░] 70%", "⏳ ᴘʀᴏᴄᴇꜱꜱ [████████░░] 80%", "⏳  [█████████░] 90%", "✅ ʀᴇꜱᴛᴀʀᴛ ᴄᴏᴍᴘʟᴇᴛᴇ\n[██████████] 100%", "👋 ɢᴏᴏᴅ ʙʏᴇ..."];

        try {
            let sent = await bot.sendMessage(chatId, bars[0]);

            for (let i = 1; i < bars.length; i++) {
                await new Promise(resolve => setTimeout(resolve, 500));
                await bot.editMessageText(bars[i], {
                    chat_id: chatId,
                    message_id: sent.message_id
                });
            }

            await new Promise(resolve => setTimeout(resolve, 1000));
            process.exit(0);
        } catch (e) {
            console.error(e);
            bot.sendMessage(chatId, "❌ Gagal restart bot.");
        }
    });

    bot.onText(/\/ping/, async (msg) => {
        const chatId = msg.chat.id;

        // Hitung cooldown berdasarkan ID user, bukan objek pesan
        const isCooldown = checkCooldown(msg.from.id);
        if (isCooldown) return bot.sendMessage(chatId, `⏳ Tunggu ${isCooldown} detik sebelum bisa pakai command /ping lagi!`, { reply_to_message_id: msg.message_id });

        const sentMsg = await bot.sendMessage(chatId, "⏳ ꜱᴛᴀᴛᴜꜱ ʙᴏᴛ...", { parse_mode: "Markdown", reply_to_message_id: msg.message_id });

        const botUptime = process.uptime();
        const botUptimeStr = `${Math.floor(botUptime / 3600)}h ${Math.floor((botUptime % 3600) / 60)}m ${Math.floor(botUptime % 60)}s`;

        const vpsUptime = os.uptime();
        const vpsUptimeStr = `${Math.floor(vpsUptime / 86400)}d ${Math.floor((vpsUptime % 86400) / 3600)}h ${Math.floor((vpsUptime % 3600) / 60)}m`;

        const cpuModel = os.cpus()[0].model;
        const cpuCores = os.cpus().length;
        const totalMem = (os.totalmem() / (1024 ** 3)).toFixed(2) + " GB";
        const freeMem = (os.freemem() / (1024 ** 3)).toFixed(2) + " GB";

        const msgText = `🏓 𝖯𝗈𝗇𝗀 : ${botUptimeStr}
    <blockquote expandable>↬ 𝖴p𝖳𝗂𝗆𝖾 : ${vpsUptimeStr}
    ↬ 𝖢𝖯𝖴 : ${cpuModel} (${cpuCores} cores)
    ↬ 𝖣𝗂𝗌𝗄 : ${freeMem} / ${totalMem} GB
    </blockquote>`;

        bot.editMessageText(msgText, { chat_id: chatId, parse_mode: "HTML", message_id: sentMsg.message_id });
    });


    // /setting tanpa argumen → kirim info bantuan
    bot.onText(/^\/setting$/, async (msg) => {
        const chatId = msg.chat.id;

        const helpText =
            `⚙️ *Menu Setting Bot*

• *Set tipe grup panel (public/private)*  
  Gunakan perintah ini di dalam grup panel kamu:
  ➜ /setpaneltype public
  ➜ /setpaneltype private
  ➜ /paneltype  (cek tipe grup saat ini)

• *Edit config.js (khusus Owner)*  
  Format lama masih bisa dipakai:
  ➜ /setting exGroupId -1001234567890, exPGroupId -1009876543210`;

        return bot.sendMessage(chatId, helpText, { parse_mode: "Markdown" });
    });

    bot.onText(/^\/setting (.+)$/, async (msg, match) => {
        const chatId = msg.chat.id;
        const senderId = msg.from.id;
        const input = match[1].trim();

        if (senderId.toString() !== OWNER_ID.toString()) { // --- FIX STRING vs NUMBER ---
            return bot.sendMessage(chatId, `❌ Kamu bukan @${dev}!`);
        }

        if (!fs.existsSync(settingsPath)) {
            return bot.sendMessage(chatId, "❌ settings.js tidak ditemukan");
        }

        if (!input) {
            return bot.sendMessage(chatId, "❌ Format salah!\nContoh: /set domain example.com, ptla 12345");
        }

        let fileContent = fs.readFileSync(settingsPath, "utf8");
        const updates = input.split(",").map(s => s.trim());
        let updatedKeys = [];

        updates.forEach(pair => {
            const [key, ...valParts] = pair.split(" ");
            const value = valParts.join(" ").trim();

            if (!allowedKeys.includes(key)) return;

            const regex = new RegExp(`(${key}\\s*:\\s*['"\`]).*?(['"\`])`, "g");
            fileContent = fileContent.replace(regex, `$1${value}$2`);
            updatedKeys.push(`${key} → ${value}`);
        });

        fs.writeFileSync(settingsPath, fileContent, "utf8");

        const sentMsg = await bot.sendMessage(
            chatId,
            `✅ ./config.js update :\n<pre>${updatedKeys.join("\n")}</pre>`,
            { parse_mode: "HTML" }
        );

        setTimeout(async () => {
            await bot.editMessageText("♻️ ʀᴇsᴛᴀʀᴛɪɴɢ ʙᴏᴛ...", { chat_id: chatId, message_id: sentMsg.message_id });
            process.exit(0);
        }, 1000); // <-- INI YANG SAYA GANTI DARI '...' MENJADI '1000'
    });
} // <<<--- INI BRACKET PENUTUP YANG DIPINDAH DARI ATAS

setTimeout(() => {
    initializeBot().catch(err => {
        console.log('System initialization error:', err.message);
        process.exit(1);
    });
}, 1000);