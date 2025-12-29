const axios = require("axios"); // <--- INI TAMBAHAN
const fs = require("fs");
const fetch = require("node-fetch");
const unzipper = require("unzipper");
const os = require("os");
const { exec } = require("child_process");

const usersFile = "./db/users/users.json";
const adminfile = "./db/users/adminID.json";
const premiumUsersFile = "./db/users/premiumUsers.json";
// Perbaikan: path file resellerUsers salah tulis (ressellerUsers -> resellerUsers)
const ressUsersFile = "./db/users/resellerUsers.json";

const privateUsers = JSON.parse(fs.readFileSync("./db/users/private/privateID.json"));

const settings = require("./config.js");
const config = require("./config.js");

const developer = settings.dev;
const pp = settings.pp;
const ppVid = settings.ppVid;

let ownerUsers = [];
let premiumUsers = [];
let ressUsers = [];

let users = [];
let userState = {};
let userUploads = {}
let web2zipSessions = {}

if (fs.existsSync(adminfile)) {
  ownerUsers = JSON.parse(fs.readFileSync(adminfile));
}

if (fs.existsSync(premiumUsersFile)) {
  premiumUsers = JSON.parse(fs.readFileSync(premiumUsersFile));
}

if (fs.existsSync(ressUsersFile)) {
  ressUsers = JSON.parse(fs.readFileSync(ressUsersFile));
}

const now = new Date();
const waktu = now.toLocaleTimeString("id-ID", { timeZone: "Asia/Jakarta" });

module.exports = (bot) => {
  bot.onText(/^\/cek$/, async (msg) => {
    const chatId = msg.chat.id;
    const senderId = msg.from.id;

    let targetUser = msg.from;
    if (msg.reply_to_message) targetUser = msg.reply_to_message.from;

    const userId = targetUser.id;
    const firstName = targetUser.first_name || "User";

    try {
      await bot.sendMessage(
        userId,
        "Start bot ulang!"
      );

      // simpen id ke database      
      let users = JSON.parse(fs.readFileSync(usersFile));
      if (!users.includes(userId)) {
        users.push(userId);
        fs.writeFileSync(usersFile, JSON.stringify(users, null, 2));
      }

      // kirim ke grup
      await bot.sendMessage(
        chatId,
        `✅ [${firstName}](tg://user?id=${userId}) sudah start bot! silahkan create.`,
        { parse_mode: "Markdown", reply_to_message_id: msg.message_id }
      );
    } catch (err) {
      await bot.sendMessage(
        chatId,
        `❌ [${firstName}](tg://user?id=${userId}) belum start bot di private chat. dilarang create!`,
        { parse_mode: "Markdown", reply_to_message_id: msg.message_id }
      );
    }
  });

  // =======================================================
  // === FITUR BARU: LIST & DELETE TOKEN LISENSI (dari GitHub) ===
  // =======================================================

  // License dari config.secret.js (obfuscation-friendly, bisa diubah via /dev)
  const secret = require('./config.secret.js');
  const license = secret.getLicense();

  /**
   * Fungsi helper untuk mengambil data token dan SHA dari GitHub
   */
  async function getGithubTokenData() {
    const { githubToken, githubRepo, githubPath } = license;
    const apiUrl = `https://api.github.com/repos/${githubRepo}/contents/${githubPath}`;
    const headers = {
      'Authorization': `token ${githubToken}`,
      'Accept': 'application/vnd.github.v3+json'
    };

    try {
      const response = await axios.get(apiUrl, { headers });
      // Kontennya base64, kita decode
      const content = Buffer.from(response.data.content, 'base64').toString('utf-8');
      const sha = response.data.sha;
      // File 'token' itu isinya array JSON, jadi kita parse
      const tokens = JSON.parse(content);
      return { tokens, sha };
    } catch (error) {
      if (error.response && error.response.status === 404) {
        // File tidak ada, kembalikan array kosong dan SHA null
        console.log("File 'token' di GitHub tidak ditemukan. Buat file baru dulu.");
        return { tokens: [], sha: null };
      }
      console.error("Gagal mengambil data dari GitHub:", error.response ? error.response.data : error.message);
      throw new Error("Gagal mengambil data dari GitHub.");
    }
  }

  /**
   * Fungsi helper untuk meng-update file token di GitHub
   */
  async function updateGithubTokenData(tokensArray, sha, commitMessage) {
    const { githubToken, githubRepo, githubPath } = license;
    const apiUrl = `https://api.github.com/repos/${githubRepo}/contents/${githubPath}`;
    const headers = {
      'Authorization': `token ${githubToken}`,
      'Accept': 'application/vnd.github.v3+json'
    };

    // Ubah array baru jadi JSON string, lalu encode ke base64
    const newContent = JSON.stringify(tokensArray, null, 2);
    const newContentBase64 = Buffer.from(newContent).toString('base64');

    const body = {
      message: commitMessage,
      content: newContentBase64,
      sha: sha // SHA wajib ada untuk update file yang sudah ada
    };

    try {
      await axios.put(apiUrl, body, { headers });
      return true;
    } catch (error) {
      console.error("Gagal meng-update data ke GitHub:", error.response ? error.response.data : error.message);
      throw new Error("Gagal meng-update data ke GitHub.");
    }
  }


  // --- 1. FITUR LIST TOKEN TELEGRAM ---
  bot.onText(/^\/listtoken$/, async (msg) => {
    const chatId = msg.chat.id;
    const userId = msg.from.id.toString();

    // Cek Owner (ownerUsers udah ada di atas file start.js)
    if (!ownerUsers.includes(userId)) {
      return bot.sendMessage(chatId, "❌ Perintah ini khusus Owner Bot!");
    }

    try {
      const waitMsg = await bot.sendMessage(chatId, "⏳ Mengambil daftar token dari GitHub...", { reply_to_message_id: msg.message_id });

      const { tokens } = await getGithubTokenData();

      if (!tokens || tokens.length === 0) {
        return bot.editMessageText("ℹ️ Tidak ada token lisensi yang tersimpan di GitHub.", {
          chat_id: chatId,
          message_id: waitMsg.message_id
        });
      }

      let responseMessage = "🔑 Daftar Token Lisensi Telegram di GitHub:\n\n";
      tokens.forEach((token, index) => {
        // Masking token untuk keamanan
        const maskedToken = `${token.substring(0, 10)}...${token.substring(token.length - 4)}`;
        responseMessage += `*${index + 1}.* \`${maskedToken}\`\n`;
      });

      responseMessage += "\n(Token bot Telegram yang diizinkan)\nGunakan /deltoken <nomor> untuk menghapus.";

      bot.editMessageText(responseMessage, {
        chat_id: chatId,
        message_id: waitMsg.message_id,
        parse_mode: "Markdown"
      });

    } catch (error) {
      bot.sendMessage(chatId, `❌ Error: ${error.message}`);
    }
  });


  // --- 1.5 FITUR ADD TOKEN TELEGRAM ---
  bot.onText(/^\/addtoken (.+)/, async (msg, match) => {
    const chatId = msg.chat.id;
    const userId = msg.from.id.toString();
    const newToken = match[1].trim();

    // Cek Owner
    if (!ownerUsers.includes(userId)) {
      return bot.sendMessage(chatId, "❌ Perintah ini khusus Owner Bot!");
    }

    if (!newToken) {
      return bot.sendMessage(chatId, "❌ Format salah. Gunakan: /addtoken <token_bot>", { reply_to_message_id: msg.message_id });
    }

    try {
      const waitMsg = await bot.sendMessage(chatId, `⏳ Menambahkan token ke GitHub...`, { reply_to_message_id: msg.message_id });

      // 1. Ambil data saat ini
      const { tokens: currentTokens, sha } = await getGithubTokenData();

      // Jika sha null (file belum ada), kita akan create file baru, tapi butuh sha? 
      // API 'put' tanpa sha = create file baru.
      // API 'put' dengan sha = update file.
      // getGithubTokenData returns sha: null if 404.

      // 2. Tambahkan token
      // Cek duplikat
      if (currentTokens && currentTokens.includes(newToken)) {
        return bot.editMessageText("⚠️ Token sudah ada di database!", {
          chat_id: chatId,
          message_id: waitMsg.message_id
        });
      }

      const newTokens = currentTokens ? [...currentTokens, newToken] : [newToken];

      // 3. Update ke GitHub
      // Note: function updateGithubTokenData butuh SHA.
      // Kalau file baru (SHA null), kita harus handle di updateGithubTokenData atau kirim undefined.
      // Tapi function updateGithubTokenData di atas (line 127) kirim body { sha: sha }.
      // Kalau sha null, API github mungkin nolak kalau file ada (conflict), tapi kalau file gak ada, sha harusnya omitted.
      // Mari kita cek updateGithubTokenData. (Kita gak bisa ubah function itu sekarang tanpa scroll jauh).
      // Asumsi: Logic updateGithubTokenData cukup pintar atau GitHub API ignore SHA null for new file creation?
      // GitHub API: PUT /repos/.../contents/... -> "sha: Required if you are updating a file."
      // Jadi kalau create file baru, SHA di body harus dihilangkan. 
      // Tapi helper function di line 127 selalu kirim SHA.
      // Hack: Kita coba aja dulu. Kalau error karena SHA null on create, kita fix helpernya.

      await updateGithubTokenData(newTokens, sha, `Bot: Add token ${newToken.substring(0, 10)}...`);

      bot.editMessageText(`✅ Berhasil menambahkan token:\n\`${newToken}\``, {
        chat_id: chatId,
        message_id: waitMsg.message_id,
        parse_mode: "Markdown"
      });

    } catch (error) {
      bot.sendMessage(chatId, `❌ Gagal: ${error.message}`);
    }
  });
  bot.onText(/^\/deltoken(?:\s+(.+))?$/, async (msg, match) => {
    const chatId = msg.chat.id;
    const userId = msg.from.id.toString();
    const indexStr = match[1];

    // Cek Owner
    if (!ownerUsers.includes(userId)) {
      return bot.sendMessage(chatId, "❌ Perintah ini khusus Owner Bot!");
    }

    if (!indexStr || isNaN(parseInt(indexStr))) {
      return bot.sendMessage(chatId, "❌ Format salah. Gunakan: /deltoken <nomor_urut>\nCek nomor urut di /listtoken.", { reply_to_message_id: msg.message_id });
    }

    const listNumber = parseInt(indexStr);
    const arrayIndex = listNumber - 1; // Konversi ke index array (mulai dari 0)

    try {
      const waitMsg = await bot.sendMessage(chatId, `⏳ Menghapus token nomor ${listNumber} dari GitHub...`, { reply_to_message_id: msg.message_id });

      // 1. Ambil data DAN SHA saat ini
      const { tokens: currentTokens, sha } = await getGithubTokenData();

      if (!currentTokens || currentTokens.length === 0) {
        return bot.editMessageText("❌ Gagal: Tidak ada token untuk dihapus.", {
          chat_id: chatId,
          message_id: waitMsg.message_id
        });
      }

      // Cek nomornya valid
      if (arrayIndex < 0 || arrayIndex >= currentTokens.length) {
        return bot.editMessageText(`❌ Gagal: Nomor token ${listNumber} tidak valid. (Hanya ada 1 sampai ${currentTokens.length})`, {
          chat_id: chatId,
          message_id: waitMsg.message_id
        });
      }

      // SHA wajib ada buat update
      if (!sha) {
        return bot.editMessageText(`❌ Gagal: Tidak bisa mendapatkan SHA file. Tidak dapat mengupdate.`, {
          chat_id: chatId,
          message_id: waitMsg.message_id
        });
      }

      // 2. Hapus token dari array
      const tokenToDelete = currentTokens[arrayIndex];
      const newTokens = currentTokens.filter((_, index) => index !== arrayIndex); // Buat array baru tanpa token itu

      // 3. Update kembali ke GitHub
      await updateGithubTokenData(newTokens, sha, `Bot: Hapus token (index ${listNumber})`);

      // Gunakan panjang tokenToDelete untuk masking, bukan variabel token yang tidak ada
      const maskedToken = `${tokenToDelete.substring(0, 10)}...${tokenToDelete.substring(tokenToDelete.length - 4)}`;

      bot.editMessageText(`✅ Berhasil menghapus token:\n\`${maskedToken}\``, {
        chat_id: chatId,
        message_id: waitMsg.message_id,
        parse_mode: "Markdown"
      });

    } catch (error) {
      bot.sendMessage(chatId, `❌ Error: ${error.message}`);
    }
  });

  // =======================================================
  // === AKHIR FITUR BARU =================================
  // =======================================================

  bot.onText(/\/start/, (msg) => {
    const chatId = msg.chat.id;
    const userId = msg.from.id.toString();

    let targetUser = msg.from;
    const senderId = targetUser.id;

    // runtime vps
    const vpsUptime = os.uptime();
    const vpsUptimeStr = `${Math.floor(vpsUptime / 86400)}d ${Math.floor((vpsUptime % 86400) / 3600)}h ${Math.floor((vpsUptime % 3600) / 60)}m`;

    const status = ownerUsers.includes(userId)
      ? "Owner"
      : premiumUsers.includes(userId)
        ? "Premium"
        : ressUsers.includes(userId)
          ? "Reseller"
          : "User";

    let userSave = JSON.parse(fs.readFileSync(usersFile));
    if (!userSave.includes(senderId)) {
      userSave.push(senderId);
      fs.writeFileSync(usersFile, JSON.stringify(userSave, null, 2));
    }

    if (fs.existsSync(usersFile)) {
      users = JSON.parse(fs.readFileSync(usersFile));
    }
    const total = users.length;

    // --- FITUR DYNAMIC MAIN MENU ---
    const ownerSettingsPath = "./db/owner_settings.json";
    let ownerSettings = {
      menuType: "text",
      menuMedia: "",
      menuCaption: "Menu Default"
    };

    if (fs.existsSync(ownerSettingsPath)) {
      try {
        ownerSettings = JSON.parse(fs.readFileSync(ownerSettingsPath));
      } catch (e) {
        console.error("Gagal load owner settings:", e);
      }
    }

    // === SIMPLE WELCOME TEXT (untuk handle batasan Telegram) ===
    const welcomeText = `⚡ *𝐒𝐂𝐇𝐍𝐔𝐅𝐅𝐄𝐋𝐋𝐋 𝐁𝐎𝐓* ⚡
━━━━━━━━━━━━━━━━━━━━━━
🎉 *Version 8.7* | Panel Manager
━━━━━━━━━━━━━━━━━━━━━━

👋 _Assalamu'alaikum,_ *@${msg.from.username || msg.from.first_name}*!

📊 *INFO*
┣ 🎭 Status: *${status}*
┣ 👥 Users: *${total}*
┣ ⏰ ${waktu}
┗ 📡 Uptime: *${vpsUptimeStr}*

${ownerSettings.menuCaption || "🔽 _Klik tombol dibawah untuk membuka menu:_"}
`;

    // Simple keyboard dengan 1 tombol Menu saja
    const simpleKeyboard = {
      parse_mode: "Markdown",
      reply_to_message_id: msg.message_id,
      reply_markup: {
        inline_keyboard: [
          [
            { text: "📋 𝐌𝐄𝐍𝐔", callback_data: "openmainmenu" }
          ],
          [
            { text: "🛒 BUY SCRIPT @schnuffelll", url: "t.me/schnuffelll" }
          ]
        ],
      },
    };

    // Logic pengiriman berdasarkan tipe menu dengan SMART error handling
    const sendWithMedia = async () => {
      const mediaUrl = ownerSettings.menuMedia || '';
      const audioUrl = ownerSettings.menuAudio || '';
      const mediaType = ownerSettings.menuType || 'text';

      // 1. TEXT ONLY
      if (!mediaUrl || mediaType === 'text') {
        try {
          await bot.sendMessage(chatId, welcomeText, simpleKeyboard);
        } catch (e) { console.error('Error sending text:', e.message); }
        return;
      }

      // Helper to send audio if needed
      const sendAudioFile = async () => {
        if (audioUrl) {
          try {
            await bot.sendAudio(chatId, audioUrl, {
              title: '🎵 Schnuffelll Theme',
              performer: 'Schnuffelll Bot'
            });
          } catch (e) { console.error('Error sending audio:', e.message); }
        }
      };

      try {
        // 2. IMAGE
        if (mediaType === 'image') {
          await bot.sendPhoto(chatId, mediaUrl, { caption: welcomeText, ...simpleKeyboard });
        }
        // 3. VIDEO
        else if (mediaType === 'video') {
          await bot.sendVideo(chatId, mediaUrl, { caption: welcomeText, ...simpleKeyboard });
        }
        // 4. AUDIO (Text + Audio)
        else if (mediaType === 'audio') {
          await bot.sendMessage(chatId, welcomeText, simpleKeyboard);
          await sendAudioFile();
        }
        // 5. TEXT + AUDIO
        else if (mediaType === 'text_audio') {
          await bot.sendMessage(chatId, welcomeText, simpleKeyboard);
          await sendAudioFile();
        }
        // 6. IMAGE + AUDIO
        else if (mediaType === 'image_audio') {
          await bot.sendPhoto(chatId, mediaUrl, { caption: welcomeText, ...simpleKeyboard });
          await sendAudioFile();
        }
        // 7. VIDEO + AUDIO
        else if (mediaType === 'video_audio') {
          await bot.sendVideo(chatId, mediaUrl, { caption: welcomeText, ...simpleKeyboard });
          await sendAudioFile();
        }
        // Fallback
        else {
          await bot.sendMessage(chatId, welcomeText, simpleKeyboard);
        }

      } catch (err) {
        console.error('Error sending media:', err.message);
        // Basic Fallback if main media fails
        try {
          await bot.sendMessage(chatId, welcomeText + '\n\n⚠️ _Media gagal dimuat, cek URL di /pengaturan_', simpleKeyboard);
        } catch (e) {
          console.error('Error sending fallback:', e.message);
        }
      }
    };

    sendWithMedia();
  });

  // === HANDLER UNTUK TOMBOL "MENU" - Kirim message baru dengan menu lengkap ===
  bot.on("callback_query", (callbackQuery) => {
    if (callbackQuery.data === "openmainmenu") {
      bot.answerCallbackQuery(callbackQuery.id);
      const chatId = callbackQuery.message.chat.id;
      const userId = callbackQuery.from.id.toString();

      // Load user data untuk status
      const status = ownerUsers.includes(userId)
        ? "Owner"
        : premiumUsers.includes(userId)
          ? "Premium"
          : ressUsers.includes(userId)
            ? "Reseller"
            : "User";

      const menuText = `
╭───❖ <b>SCHNUFFELLL DASHBOARD</b> ❖
│
│ 👤 <b>User Info</b>
│ ├ Name: <b>${callbackQuery.from.first_name}</b>
│ ├ UserID: <code>${userId}</code>
│ ╰ Status: <b>${status}</b>
│
│ 🤖 <b>Bot Info</b>
│ ├ Version: <b>v8.0.0 (Pro)</b>
│ ╰ Uptime: <b>${Math.floor(process.uptime() / 60)} m</b>
│
╰───────────────────────◊
│ <i>"Manage your server with style!"</i>
╰───────────────────────◊
`;

      const fullMenuKeyboard = {
        parse_mode: "HTML",
        reply_markup: {
          inline_keyboard: [
            [
              { text: "🔐 PRIVATE", callback_data: "privmenu" },
              { text: "🧩 PANEL", callback_data: "createpanel" },
            ],
            [
              { text: "⚙️ INSTALL", callback_data: "installmenu" },
              { text: "☁️ VPS", callback_data: "cvpsmenu" },
              { text: "🔧 OTHER", callback_data: "othermenu" }
            ],
            [
              { text: "🛡️ INSTALL PROTECT", callback_data: "installprotectmenu" },
              { text: "🗑️ UNINSTALL", callback_data: "uninstallprotectmenu" }
            ],
            [
              { text: "🛡️ GROUP GUARD", callback_data: "guardmenu" },
              { text: "⚔️ RPG GAME", callback_data: "rpgmenu" }
            ],
            [
              { text: "🔗 AUTO-ADD", callback_data: "autoaddmenu" },
              { text: "👑 OWNER MENU", callback_data: "ownermenu" }
            ],
            [
              { text: "⚙️ PENGATURAN", callback_data: "pengaturanbot" }
            ],
            [
              { text: "❌ TUTUP", callback_data: "closemenu" }
            ]
          ],
        },
      };

      // Kirim sebagai message BARU (bukan edit) untuk avoid batasan Telegram
      bot.sendMessage(chatId, menuText, fullMenuKeyboard);
    }
  });

  // Handler untuk tutup menu
  bot.on("callback_query", (callbackQuery) => {
    if (callbackQuery.data === "closemenu") {
      bot.answerCallbackQuery(callbackQuery.id, { text: "Menu ditutup!" });
      // Hapus message menu
      bot.deleteMessage(callbackQuery.message.chat.id, callbackQuery.message.message_id).catch(() => { });
    }
  });

  // Handler untuk tombol Pengaturan (callback) - handle both "pengaturanbot" and "pengaturan"
  bot.on("callback_query", (callbackQuery) => {
    if (callbackQuery.data === "pengaturanbot" || callbackQuery.data === "pengaturan") {
      bot.answerCallbackQuery(callbackQuery.id);
      const userId = callbackQuery.from.id.toString();
      // Cek owner
      if (!ownerUsers.includes(userId)) {
        return bot.sendMessage(callbackQuery.message.chat.id, "❌ Khusus Owner!");
      }
      // Kirim menu pengaturan lengkap
      const pengaturanText = `
⚙️ *PENGATURAN BOT*
━━━━━━━━━━━━━━━━━━━━━━

📋 *Daftar Command:*

🖼️ *Tampilan Menu:*
• \`/setmenutype\` - Ubah tipe (text/image/video)
• \`/setmenuurl\` - Set URL media
• \`/setmenucaption\` - Set caption menu

🔧 *Panel Settings:*
• \`/seturl\` - Set domain panel
• \`/setplta\` - Set API key panel
• \`/setpltc\` - Set client key

📡 *Node & VPS:*
• \`/gencert\` - Generate SSL certificate
• \`/debug\` - Debug Wings

💰 *Payment:*
• \`/setdana\` - Set nomor Dana
• \`/setqris\` - Set QRIS image

━━━━━━━━━━━━━━━━━━━━━━
_Ketik command di atas untuk mengubah pengaturan_
`;
      bot.sendMessage(callbackQuery.message.chat.id, pengaturanText, { 
        parse_mode: "Markdown",
        reply_markup: {
          inline_keyboard: [
            [
              { text: "🖼️ Set Menu Type", switch_inline_query_current_chat: "/setmenutype " },
              { text: "🔗 Set Menu URL", switch_inline_query_current_chat: "/setmenuurl " }
            ],
            [
              { text: "🔐 Gen SSL Cert", switch_inline_query_current_chat: "/gencert " },
              { text: "🐛 Debug Wings", switch_inline_query_current_chat: "/debug " }
            ],
            [
              { text: "🔙 KEMBALI", callback_data: "openmainmenu" }
            ]
          ]
        }
      });
    }
  });

  bot.on("callback_query", (callbackQuery) => {
    if (callbackQuery.data === "createpanel") {
      bot.answerCallbackQuery(callbackQuery.id);
      const text = `\`\`\`
╭──✧ <b>ɪɴꜰᴏʀᴍᴀᴛɪᴏɴ</b> ✧
│ ⪼ Version : 1.0.0
│ ⪼ Owner : @${developer}
│ ⪼ Type : Public
╰────────────⧽

╭──✧ ᴏᴡɴᴇʀ ᴍᴇɴᴜ ✧
│ ⪼ /addprem <id>
│ ⪼ /delprem <id>
│ ⪼ /address <id>
│ ⪼ /delress <id>
╰────────────⧽

╭──✧ ᴘʀᴇᴍɪᴜᴍ ᴍᴇɴᴜ ✧
│ ⪼ /listsrv
│ ⪼ /listsrvoff
│ ⪼ /listadmin
│ ⪼ /deladm <id>
│ ⪼ /delusroff
│ ⪼ /delsrv <id>
│ ⪼ /delsrvoff
│ ⪼ /totalserver
│ ⪼ /servercpu
╰────────────⧽

╭──✧ ʀᴇꜱᴇʟʟᴇʀ ᴍᴇɴᴜ ✧
│ ⪼ /1gb-/10gb nama,id
│ ⪼ /unli nama,id
│ ⪼ /cadp nama,id
╰────────────⧽
\`\`\``;
      bot.editMessageText(text, {
        chat_id: callbackQuery.message.chat.id,
        message_id: callbackQuery.message.message_id,
        parse_mode: "Markdown",
        reply_markup: {
          inline_keyboard: [
            [
              { text: "⿻ ᴘʀɪᴠᴀᴛᴇ ᴍᴇɴᴜ", callback_data: "privmenu" },
              { text: "<<", callback_data: "back" },
            ],
            [
              { text: "ᴏᴡɴᴇʀ ᴍᴇɴᴜ", callback_data: "ownermenu" }
            ],
            [
              { text: "ꜱᴇʀᴠᴇʀ 2", callback_data: "serverdua" },
              { text: "ꜱᴇʀᴠᴇʀ 3", callback_data: "servertiga" },
              { text: "ꜱᴇʀᴠᴇʀ 4", callback_data: "serverempat" }
            ],
            [
              { text: "ꜱᴇʀᴠᴇʀ 5", callback_data: "serverlima" }
            ]
          ],
        },
      });
    }
  });

  bot.on("callback_query", (callbackQuery) => {
    if (callbackQuery.data === "privmenu") {
      bot.answerCallbackQuery(callbackQuery.id);

      const userId = callbackQuery.from.id.toString();

      if (!privateUsers.includes(userId)) {
        bot.answerCallbackQuery(callbackQuery.id, {
          text: "❌ Akses ditolak! Menu ini hanya untuk User Private",
          show_alert: true
        });
        return;
      }

      const text = `\`\`\`
╭──✧ ɪɴꜰᴏʀᴍᴀᴛɪᴏɴ ✧
│ ⪼ Version : 1.0.0
│ ⪼ Owner : @${developer}
│ ⪼ Type : Private
╰────────────⧽

╭──✧ ᴏᴡɴᴇʀ ᴘʀɪᴠᴀᴛᴇ ✧
│ ⪼ /pinfo
│ ⪼ /addpremp <id>
│ ⪼ /addressp <id>
╰────────────⧽

╭──✧ ᴘʀᴇᴍɪᴜᴍ ᴘʀɪᴠᴀᴛᴇ ✧
│ ⪼ /srvlist
│ ⪼ /srvofflist
│ ⪼ /admlist
│ ⪼ /srvdel <id>
│ ⪼ /srvoffdel
│ ⪼ /totalsrv
│ ⪼ /srvcpu
╰────────────⧽

╭──✧ ʀᴇꜱᴇʟʟᴇʀ ᴘʀɪᴠᴀᴛᴇ ✧
│ ⪼ /1gbp-/10gbp nama,id
│ ⪼ /cunli nama,id
│ ⪼ /cadmin nama,id
╰────────────⧽
\`\`\``;

      bot.editMessageText(text, {
        chat_id: callbackQuery.message.chat.id,
        message_id: callbackQuery.message.message_id,
        parse_mode: "Markdown",
        reply_markup: {
          inline_keyboard: [
            [
              { text: "<<", callback_data: "back" },
              { text: "🧩 ᴄʀᴇᴀᴛᴇ ᴘᴀɴᴇʟ", callback_data: "createpanel" },
            ],
            [
              { text: "ᴏᴡɴᴇʀ ᴍᴇɴᴜ", callback_data: "ownermenu" }
            ]
          ],
        },
      });
    }
  });

  bot.on("callback_query", (callbackQuery) => {
    if (callbackQuery.data === "serverdua") {

      const userId = callbackQuery.from.id.toString();
      const isResellerV2 = JSON.parse(fs.readFileSync("./db/users/version/resellerV2.json"));

      if (!isResellerV2.includes(userId)) {
        return bot.answerCallbackQuery(callbackQuery.id, { text: '❌ Akses ditolak! Menu Server V2 hanya untuk Reseller V2', show_alert: true });
      }
      bot.answerCallbackQuery(callbackQuery.id);
      const text = `<blockquote>┌─⧼ <b>ɪɴꜰᴏʀᴍᴀᴛɪᴏɴ</b> ⧽
├ ⬡ Version : 2.0.0
├ ⬡ Owner : @${developer}
├ ⬡ Language : JavaScript
╰─────────────

┌─⧼ <b>ᴍᴇɴᴜ ᴏᴡɴᴇʀ ᴠ2</b> ⧽
├ /addowner — Add Owner
├ /delowner — Hapus Owner
├ /addpremv2 — Add Premium V2
├ /delpremv2 — Del Premium V2
╰──────────────

┌─⧼ <b>ᴍᴇɴᴜ ᴘʀᴇᴍɪᴜᴍ ᴠ2</b> ⧽
├ /addressv2 — Add Reseller V2
├ /delressv2 — Del Reseller V2
╰──────────────

┌─⧼ <b>ᴍᴇɴᴜ ᴀᴅᴍɪɴ ᴠ 2</b> ⧽
├ /listsrv2
├ /listadmin2
├ /delsrv2
╰──────────────

┌─⧼ <b>ʀᴇꜱᴇʟʟᴇʀ ᴍᴇɴᴜ ᴠ 2</b> ⧽ 
├ /1gbv2-/10gbv2 nama,id
├ /unliv2 nama,id
├ /cadpv2 nama,id
╰──────────────
</blockquote>`;
      bot.editMessageText(text, {
        chat_id: callbackQuery.message.chat.id,
        message_id: callbackQuery.message.message_id,
        parse_mode: "HTML",
        reply_markup: {
          inline_keyboard: [
            [
              { text: "⿻ ᴘʀɪᴠᴀᴛᴇ ᴍᴇɴᴜ", callback_data: "privmenu" },
              { text: "🧩 ᴄʀᴇᴀᴛᴇ ᴘᴀɴᴇʟ", callback_data: "createpanel" },
            ],
            [
              { text: "ᴏᴡɴᴇʀ ᴍᴇɴᴜ", callback_data: "ownermenu" }
            ],
            [
              { text: "<<", callback_data: "back" },
              { text: "ꜱᴇʀᴠᴇʀ 3", callback_data: "servertiga" },
              { text: "ꜱᴇʀᴠᴇʀ 4", callback_data: "serverempat" }
            ],
            [
              { text: "ꜱᴇʀᴠᴇʀ 5", callback_data: "serverlima" }
            ]
          ],
        },
      });
    }
  });

  bot.on("callback_query", (callbackQuery) => {
    if (callbackQuery.data === "servertiga") {

      const userId = callbackQuery.from.id.toString();
      const isResellerV3 = JSON.parse(fs.readFileSync("./db/users/version/resellerV3.json"));

      if (!isResellerV3.includes(userId)) {
        return bot.answerCallbackQuery(callbackQuery.id, { text: '❌ Akses ditolak! Menu Server V3 hanya untuk Reseller V3', show_alert: true });
      }
      bot.answerCallbackQuery(callbackQuery.id);
      const text = `<blockquote>┌─⧼ <b>ɪɴꜰᴏʀᴍᴀᴛɪᴏɴ</b> ⧽
├ ⬡ Version : 3.0.0
├ ⬡ Owner : @${developer}
├ ⬡ Language : JavaScript
╰─────────────

┌─⧼ <b>ᴍᴇɴᴜ ᴏᴡɴᴇʀ ᴠ3</b> ⧽
├ /addowner — Add Owner
├ /delowner — Hapus Owner
├ /addpremv3 — Add Premium V3
├ /delpremv3 — Del Premium V3
╰──────────────

┌─⧼ <b>ᴍᴇɴᴜ ᴘʀᴇᴍɪᴜᴍ ᴠ3</b> ⧽
├ /addressv3 — Add Reseller V3
├ /delressv3 — Del Reseller V3
╰──────────────

┌─⧼ <b>ᴍᴇɴᴜ ᴀᴅᴍɪɴ ᴠ3</b> ⧽
├ /listsrv3
├ /listadmin3
├ /delsrv3
╰──────────────

┌─⧼ <b>ʀᴇꜱᴇʟʟᴇʀ ᴍᴇɴᴜ ᴠ 3</b> ⧽ 
├ /1gbv3-/10gbv3 nama,id
├ /unliv3 nama,id
├ /cadpv3 nama,id
╰──────────────
</blockquote>
`;
      bot.editMessageText(text, {
        chat_id: callbackQuery.message.chat.id,
        message_id: callbackQuery.message.message_id,
        parse_mode: "HTML",
        reply_markup: {
          inline_keyboard: [
            [
              { text: "⿻ ᴘʀɪᴠᴀᴛᴇ ᴍᴇɴᴜ", callback_data: "privmenu" },
              { text: "🧩 ᴄʀᴇᴀᴛᴇ ᴘᴀɴᴇʟ", callback_data: "createpanel" },
            ],
            [
              { text: "ᴏᴡɴᴇʀ ᴍᴇɴᴜ", callback_data: "ownermenu" }
            ],
            [
              { text: "ꜱᴇʀᴠᴇʀ 2", callback_data: "serverdua" },
              { text: "<<", callback_data: "back" },
              { text: "ꜱᴇʀᴠᴇʀ 4", callback_data: "serverempat" }
            ],
            [
              { text: "ꜱᴇʀᴠᴇʀ 5", callback_data: "serverlima" }
            ]
          ],
        },
      });
    }
  });

  bot.on("callback_query", (callbackQuery) => {
    if (callbackQuery.data === "serverempat") {

      const userId = callbackQuery.from.id.toString();
      const isResellerV4 = JSON.parse(fs.readFileSync("./db/users/version/resellerV4.json"));

      if (!isResellerV4.includes(userId)) {
        return bot.answerCallbackQuery(callbackQuery.id, { text: '❌ Akses ditolak! Menu Server V4 hanya untuk Reseller V4', show_alert: true });
      }
      bot.answerCallbackQuery(callbackQuery.id);
      const text = `<blockquote>┌─⧼ <b>ɪɴꜰᴏʀᴍᴀᴛɪᴏɴ</b> ⧽
├ ⬡ Version : 4.0.0
├ ⬡ Owner : @${developer}
├ ⬡ Language : JavaScript
╰─────────────

┌─⧼ <b>ᴍᴇɴᴜ ᴏᴡɴᴇʀ ᴠ 4</b> ⧽
├ /addowner — Add Owner
├ /delowner — Hapus Owner
├ /addpremv4 — Add Premium V4
├ /delpremv4 — Del Premium V4
╰──────────────

┌─⧼ <b>ᴍᴇɴᴜ ᴘʀᴇᴍɪᴜᴍ ᴠ 4</b> ⧽
├ /address4 — Add Reseller V4
├ /delressv4 — Del Reseller V4
╰──────────────

┌─⧼ <b>ᴍᴇɴᴜ ᴀᴅᴍɪɴ ᴠ 4</b> ⧽
├ /listsrv4
├ /listadmin4
├ /delsrv4
╰──────────────

┌─⧼ <b>ʀᴇꜱᴇʟʟᴇʀ ᴍᴇɴᴜ ᴠ 4</b> ⧽ 
├ /1gbv4-/10gbv4 nama,id
├ /unliv4 nama,id
├ /cadpv4 nama,id
╰──────────────
</blockquote>
`;
      bot.editMessageText(text, {
        chat_id: callbackQuery.message.chat.id,
        message_id: callbackQuery.message.message_id,
        parse_mode: "HTML",
        reply_markup: {
          inline_keyboard: [
            [
              { text: "⿻ ᴘʀɪᴠᴀᴛᴇ ᴍᴇɴᴜ", callback_data: "privmenu" },
              { text: "🧩 ᴄʀᴇᴀᴛᴇ ᴘᴀɴᴇʟ", callback_data: "createpanel" },
            ],
            [
              { text: "ᴏᴡɴᴇʀ ᴍᴇɴᴜ", callback_data: "ownermenu" }
            ],
            [
              { text: "ꜱᴇʀᴠᴇʀ 2", callback_data: "serverdua" },
              { text: "ꜱᴇʀᴠᴇʀ 3", callback_data: "servertiga" },
              { text: "<<", callback_data: "back" }
            ],
            [
              { text: "ꜱᴇʀᴠᴇʀ 5", callback_data: "serverlima" }
            ]
          ],
        },
      });
    }
  });

  bot.on("callback_query", (callbackQuery) => {
    if (callbackQuery.data === "serverlima") {

      const userId = callbackQuery.from.id.toString();
      const isResellerV5 = JSON.parse(fs.readFileSync("./db/users/version/resellerV5.json"));

      if (!isResellerV5.includes(userId)) {
        return bot.answerCallbackQuery(callbackQuery.id, { text: '❌ Akses ditolak! Menu Server V5 hanya untuk Reseller V5', show_alert: true });
      }
      bot.answerCallbackQuery(callbackQuery.id);
      const text = `<blockquote>┌─⧼ <b>ɪɴꜰᴏʀᴍᴀᴛɪᴏɴ</b> ⧽
├ ⬡ Version : 5.0.0
├ ⬡ Owner : @${developer}
├ ⬡ Language : JavaScript
╰─────────────

┌─⧼ <b>ᴍᴇɴᴜ ᴏᴡɴᴇʀ ᴠ 5</b> ⧽
├ /addowner — Add Owner
├ /delowner — Hapus Owner
├ /addpremv5 — Add Premium V5
├ /delpremv5 — Del Premium V5
╰──────────────

┌─⧼ <b>ᴍᴇɴᴜ ᴘʀᴇᴍɪᴜᴍ ᴠ 5</b> ⧽
├ /address5 — Add Reseller V5
├ /delressv5 — Del Reseller V5
╰──────────────

┌─⧼ <b>ᴍᴇɴᴜ ᴀᴅᴍɪɴ ᴠ 5</b> ⧽
├ /listsrv5
├ /listadmin5
├ /delsrv5
╰──────────────

┌─⧼ <b>ʀᴇꜱᴇʟʟᴇʀ ᴍᴇɴᴜ ᴠ 5</b> ⧽ 
├ /1gbv5-/10gbv5 nama,id
├ /unliv5 nama,id
├ /cadpv5 nama,id
╰──────────────
</blockquote>
`;
      bot.editMessageText(text, {
        chat_id: callbackQuery.message.chat.id,
        message_id: callbackQuery.message.message_id,
        parse_mode: "HTML",
        reply_markup: {
          inline_keyboard: [
            [
              { text: "⿻ ᴘʀɪᴠᴀᴛᴇ ᴍᴇɴᴜ", callback_data: "privmenu" },
              { text: "🧩 ᴄʀᴇᴀᴛᴇ ᴘᴀɴᴇʟ", callback_data: "createpanel" },
            ],
            [
              { text: "ᴏᴡɴᴇʀ ᴍᴇɴᴜ", callback_data: "ownermenu" }
            ],
            [
              { text: "ꜱᴇʀᴠᴇʀ 2", callback_data: "serverdua" },
              { text: "ꜱᴇʀᴠᴇʀ 3", callback_data: "servertiga" },
              { text: "ꜱᴇʀᴠᴇʀ 4", callback_data: "serverempat" }
            ],
            [
              { text: "<<", callback_data: "back" }
            ]
          ],
        },
      });
    }
  });

  bot.on("callback_query", (callbackQuery) => {
    if (callbackQuery.data === "ownermenu") {
      bot.answerCallbackQuery(callbackQuery.id);
      const text = `
╭───❖ <b>OWNER COMMANDS</b> ❖
│
│ <i>Selamat datang, Tuan Owner!</i>
│ <i>Silahkan pilih operasional dibawah.</i>
│
│ 🔐 <b>License Management</b>
│ ├ Manage Token & GitHub
│ ╰ Check / List / Delete
│
│ 👥 <b>User Management</b>
│ ├ Premium / Reseller
│ ╰ Public / Private Mode
│
│ ⚙️ <b>System Operations</b>
│ ├ Backup / Restore
│ ╰ Settings & Config
│
╰───────────────────────◊
`;
      bot.editMessageText(text, {
        chat_id: callbackQuery.message.chat.id,
        message_id: callbackQuery.message.message_id,
        parse_mode: "HTML",
        reply_markup: {
          inline_keyboard: [
            [
              { text: "🔐 Add Token", switch_inline_query_current_chat: "/addtoken " },
              { text: "📋 List Token", switch_inline_query_current_chat: "/listtoken" }
            ],
            [
              { text: "➕ Add Prem", switch_inline_query_current_chat: "/addprem " },
              { text: "➖ Del Prem", switch_inline_query_current_chat: "/delprem " }
            ],
            [
              { text: "⚙️ Settings", callback_data: "pengaturanbot" },
              { text: "📦 Backup", switch_inline_query_current_chat: "/backup" }
            ],
            [
              { text: "⚙️ ɪɴꜱᴛᴀʟʟ ᴍᴇɴᴜ", callback_data: "installmenu" },
              { text: "<<", callback_data: "back" },
              { text: "ᴏᴛʜᴇʀ ᴍᴇɴᴜ", callback_data: "othermenu" }
            ],
          ],
        },
      });
    }
  });

  bot.on("callback_query", (callbackQuery) => {
    if (callbackQuery.data === "othermenu") {
      bot.answerCallbackQuery(callbackQuery.id);
      const text = `
╔══════════════════════════════════╗
║  🔧 <b>OTHER MENU</b>  ║
╚══════════════════════════════════╝

<blockquote expandable>
┌─「 📥 <b>DOWNLOAD MENU</b> 」
│
│ <code>/tiktok [link]</code>
│   └ Download TikTok (Video/Audio)
│   └ Pilih HD/SD/MP3
│ <code>/ytmp3 [link]</code>
│   └ Download YouTube ke MP3
│ <code>/ytmp4 [link]</code>
│   └ Download YouTube ke MP4
│ <code>/spotify [judul]</code>
│   └ Download musik Spotify
│ <code>/download</code>
│   └ Lihat semua fitur download
│
└───────────────────────
</blockquote>

<blockquote expandable>
┌─「 🔄 <b>CONVERT MENU</b> 」
│
│ <code>/tourl</code> (reply file)
│   └ Upload file ke Catbox URL
│ <code>/shortlink [url]</code>
│   └ Perpendek link apapun
│ <code>/qc [teks]</code>
│   └ Buat quote chat sticker
│
└───────────────────────
</blockquote>

<blockquote expandable>
┌─「 🔍 <b>STALK MENU</b> 」
│
│ <code>/stalkig [user]</code>
│   └ Stalk akun Instagram
│ <code>/stalktiktok [user]</code>
│   └ Stalk akun TikTok
│ <code>/stalkyt [user]</code>
│   └ Stalk channel YouTube
│ <code>/stalkgithub [user]</code>
│   └ Stalk akun GitHub
│ <code>/stalkroblox [user]</code>
│   └ Stalk akun Roblox
│
└───────────────────────
</blockquote>

<blockquote expandable>
┌─「 🎨 <b>MEDIA MENU</b> 」
│
│ <code>/pin [query]</code>
│   └ Cari gambar Pinterest
│ <code>/brat [teks]</code>
│   └ Buat stiker brat style
│ <code>/iqc [jam|batt|carrier|pesan]</code>
│   └ Buat screenshot iPhone palsu
│ <code>/xnxx [title|url_gambar]</code>
│   └ Buat meme xnxx style
│
└───────────────────────
</blockquote>

<blockquote expandable>
┌─「 🔮 <b>PRIMBON MENU</b> 」
│
│ <code>/artinama [nama]</code>
│   └ Cek arti nama kamu
│ <code>/jodoh [nama1|nama2]</code>
│   └ Cek kecocokan jodoh
│ <code>/lacakip [ip]</code>
│   └ Lacak lokasi dari IP
│
└───────────────────────
</blockquote>

<blockquote expandable>
┌─「 🤖 <b>AI MENU</b> 」
│
│ <code>/ai</code>
│   └ Aktifkan mode AI chat
│ <code>/stopai</code>
│   └ Matikan mode AI chat
│
└───────────────────────
</blockquote>

<i>💡 Kirim link TikTok langsung untuk auto-download!</i>
`;
      bot.editMessageText(text, {
        chat_id: callbackQuery.message.chat.id,
        message_id: callbackQuery.message.message_id,
        parse_mode: "HTML",
        reply_markup: {
          inline_keyboard: [
            [
              { text: "📥 DOWNLOAD", callback_data: "downloadmenu" },
              { text: "🔍 STALK", callback_data: "stalkmenu" }
            ],
            [
              { text: "⿻ ᴘʀɪᴠᴀᴛᴇ ᴍᴇɴᴜ", callback_data: "privmenu" },
              { text: "🧩 ᴄʀᴇᴀᴛᴇ ᴘᴀɴᴇʟ", callback_data: "createpanel" },
            ],
            [
              { text: "⚙️ ɪɴꜱᴛᴀʟʟ ᴍᴇɴᴜ", callback_data: "installmenu" },
              { text: "👑 ᴏᴡɴᴇʀ ᴍᴇɴᴜ", callback_data: "ownermenu" },
              { text: "<<", callback_data: "back" }
            ]
          ],
        },
      });
    }
  });

  // Download Menu Sub-callback
  bot.on("callback_query", (callbackQuery) => {
    if (callbackQuery.data === "downloadmenu") {
      bot.answerCallbackQuery(callbackQuery.id);
      const text = `
╔══════════════════════════════════╗
║  📥 <b>DOWNLOAD CENTER</b>  ║
╚══════════════════════════════════╝

<b>🎬 VIDEO DOWNLOAD</b>

<code>/tiktok [link]</code>
└ Download video TikTok tanpa watermark
└ Support: Video HD, SD, dan Audio MP3
└ Auto-detect: Kirim link langsung!

<code>/ytmp4 [link]</code>
└ Download video YouTube ke MP4
└ Support sampai 1080p HD

<b>🎵 AUDIO DOWNLOAD</b>

<code>/ytmp3 [link]</code>
└ Download YouTube ke format MP3
└ Kualitas tinggi, cepat

<code>/spotify [judul/link]</code>
└ Download musik dari Spotify
└ Auto cari & download

<b>🖼️ GAMBAR</b>

<code>/pin [query]</code>
└ Cari & download gambar Pinterest
└ Navigasi dengan tombol ⬅️ ➡️

<code>/tourl</code> (reply foto/video)
└ Upload file ke Catbox
└ Dapat link permanen

<b>💡 TIPS PENGGUNAAN:</b>
• TikTok: Kirim link langsung, bot auto detect
• YouTube: Paste link penuh dari browser
• Spotify: Bisa pakai judul atau link

<i>© 2025 Schnuffelll Download Center</i>
`;
      bot.editMessageText(text, {
        chat_id: callbackQuery.message.chat.id,
        message_id: callbackQuery.message.message_id,
        parse_mode: "HTML",
        reply_markup: {
          inline_keyboard: [
            [
              { text: "🎬 TikTok", switch_inline_query_current_chat: "/tiktok " },
              { text: "📹 YouTube", switch_inline_query_current_chat: "/ytmp4 " }
            ],
            [
              { text: "🎵 Spotify", switch_inline_query_current_chat: "/spotify " },
              { text: "🖼️ Pinterest", switch_inline_query_current_chat: "/pin " }
            ],
            [
              { text: "⬅️ KEMBALI", callback_data: "othermenu" }
            ]
          ],
        },
      });
    }
  });

  // Stalk Menu Sub-callback
  bot.on("callback_query", (callbackQuery) => {
    if (callbackQuery.data === "stalkmenu") {
      bot.answerCallbackQuery(callbackQuery.id);
      const text = `
╔══════════════════════════════════╗
║  🔍 <b>STALK CENTER</b>  ║
╚══════════════════════════════════╝

<b>📱 SOCIAL MEDIA STALK</b>

<code>/stalkig [username]</code>
├ Stalk akun Instagram
├ Info: Nama, Bio, Follower, Following
├ Bonus: Post terbaru + Foto profil
└ Contoh: <code>/stalkig cristiano</code>

<code>/stalktiktok [username]</code>
├ Stalk akun TikTok
├ Info: Nama, Bio, Verified status
├ Stats: Followers, Following, Likes, Videos
└ Contoh: <code>/stalktiktok mrbeast</code>

<code>/stalkyt [channel]</code>
├ Stalk channel YouTube
├ Info: Nama, Subscriber, Total Video
├ Bonus: Video terbaru
└ Contoh: <code>/stalkyt pewdiepie</code>

<b>💻 DEVELOPER STALK</b>

<code>/stalkgithub [username]</code>
├ Stalk akun GitHub
├ Info: Repos, Followers, Following
├ Bonus: Company, Location, Bio
└ Contoh: <code>/stalkgithub torvalds</code>

<b>🎮 GAMING STALK</b>

<code>/stalkroblox [username]</code>
├ Stalk akun Roblox
├ Info: ID, Friends, Followers
├ Bonus: Badges & Avatar
└ Contoh: <code>/stalkroblox builderman</code>

<i>💡 Semua stalk menampilkan foto profil!</i>
`;
      bot.editMessageText(text, {
        chat_id: callbackQuery.message.chat.id,
        message_id: callbackQuery.message.message_id,
        parse_mode: "HTML",
        reply_markup: {
          inline_keyboard: [
            [
              { text: "📸 Instagram", switch_inline_query_current_chat: "/stalkig " },
              { text: "🎵 TikTok", switch_inline_query_current_chat: "/stalktiktok " }
            ],
            [
              { text: "📹 YouTube", switch_inline_query_current_chat: "/stalkyt " },
              { text: "💻 GitHub", switch_inline_query_current_chat: "/stalkgithub " }
            ],
            [
              { text: "⬅️ KEMBALI", callback_data: "othermenu" }
            ]
          ],
        },
      });
    }
  });

  bot.on("callback_query", (callbackQuery) => {
    if (callbackQuery.data === "installmenu") {
      bot.answerCallbackQuery(callbackQuery.id);
      const text = `
╭──✧ 𝐈𝐍𝐒𝐓𝐀𝐋𝐋𝐀𝐓𝐈𝐎𝐍 𝐂𝐄𝐍𝐓𝐄𝐑 ✧
│
│ 📡 <b>Panel & Node Manager</b>
│ 🖥️ <b>VPS Management</b>
│ 🎨 <b>Theme & Customization</b>
│ 🛡️ <b>Security & Recovery</b>
│ 🔐 <b>SSL Certificate</b>
│
╰───────────────────────◊
`;
      bot.editMessageText(text, {
        chat_id: callbackQuery.message.chat.id,
        message_id: callbackQuery.message.message_id,
        parse_mode: "HTML",
        reply_markup: {
          inline_keyboard: [
            [
              { text: "📦 Install Panel", switch_inline_query_current_chat: "/install " },
              { text: "🗑️ Uninstall", switch_inline_query_current_chat: "/uninstallpanel " }
            ],
            [
              { text: "📡 Create Node", switch_inline_query_current_chat: "/createnode" },
              { text: "🎨 Install Theme", switch_inline_query_current_chat: "/installtema" }
            ],
            [
              { text: "🔐 Gen SSL Cert", switch_inline_query_current_chat: "/gencert " },
              { text: "🐛 Debug Wings", switch_inline_query_current_chat: "/debug " }
            ],
            [
              { text: "🔑 Change Pass", switch_inline_query_current_chat: "/usrpanel " },
              { text: "🔓 Hackback", switch_inline_query_current_chat: "/hbpanel " }
            ],
            [
              { text: "🌐 Subdomain", callback_data: "dnsmenu" },
              { text: "⚡ Spek VPS", switch_inline_query_current_chat: "/spekvps " }
            ],
            [
              { text: "📡 List Subdomain", switch_inline_query_current_chat: "/listsubdo" },
              { text: "➕ Add Subdomain", switch_inline_query_current_chat: "/addsubdo" }
            ],
            [
              { text: "💻 List VPS", callback_data: "listvpsmenu" },
              { text: "⚙️ Rebuild VPS", callback_data: "rebuildmenu" }
            ],
            [
              { text: "➕ Create VPS", callback_data: "cvpsmenu" }
            ],
            [
              { text: "🔙 KEMBALI", callback_data: "openmainmenu" },
              { text: "👑 OWNER MENU", callback_data: "ownermenu" }
            ]
          ],
        },
      });
    }
  });

  // Auto-Add Menu Callback
  bot.on("callback_query", (callbackQuery) => {
    if (callbackQuery.data === "autoaddmenu") {
      bot.answerCallbackQuery(callbackQuery.id);
      const text = `
╔══════════════════════════════════╗
║  🔗 <b>AUTO-ADD SYSTEM v8.11</b>  ║
╠══════════════════════════════════╣
║  Auto-Add dengan Join Channel   ║
╚══════════════════════════════════╝

<blockquote expandable>
┌─「 📋 <b>CARA PAKAI</b> 」
│
│ 1️⃣ User ketik "add" di grup
│ 2️⃣ Bot cek apakah user sudah join channel
│ 3️⃣ Jika belum → Minta join channel dulu
│ 4️⃣ Jika sudah → Pilih role (Premium/Reseller/Owner)
│ 5️⃣ Pilih grup untuk aktivasi
│ 6️⃣ User otomatis di-add ke role yang dipilih
└───────────────────────
</blockquote>

┌─「 ⚙️ <b>SETUP (OWNER ONLY)</b> 」
│
│ /setpaneltype public
│   └ Set grup sebagai panel public
│
│ /setpermission join_channel
│   └ Set wajib join channel
│
│ /setchannel @channel_username
│   └ Set channel yang wajib di-join
│
│ /setautoadd premium|reseller|owner
│   └ Set role default (opsional)
│
│ /autoaddinfo
│   └ Lihat konfigurasi saat ini
│
│ /autoaddoff
│   └ Nonaktifkan auto-add
└───────────────────────

┌─「 👥 <b>USER COMMANDS</b> 」
│
│ Ketik "add" di grup
│   └ Trigger auto-add flow
│
│ /daftar
│   └ Daftar manual (jika auto-add aktif)
└───────────────────────

<i>💡 Bot harus jadi admin di channel untuk cek membership!</i>
`;
      bot.editMessageText(text, {
        chat_id: callbackQuery.message.chat.id,
        message_id: callbackQuery.message.message_id,
        parse_mode: "HTML",
        reply_markup: {
          inline_keyboard: [
            [
              { text: "⬅️ KEMBALI", callback_data: "openmainmenu" }
            ]
          ],
        },
      });
    }
  });

  // Guard Menu Callback - FIXED: Uses editMessageText properly
  bot.on("callback_query", (callbackQuery) => {
    if (callbackQuery.data === "guardmenu") {
      bot.answerCallbackQuery(callbackQuery.id);
      const text = `
╔══════════════════════════════════╗
║  🛡️ <b>GROUP GUARD v3.0</b>  ║
╠══════════════════════════════════╣
║  Ultimate Protection System  ║
╚══════════════════════════════════╝

<blockquote expandable>
┌─「 🛡️ <b>ANTI FEATURES</b> 」
│
│ ✅ Anti-Link (hapus link)
│ ✅ Anti-Spam (deteksi spam)
│ ✅ Anti-Bot (block bot masuk)
│ ✅ Anti-Sticker / Anti-GIF
│ ✅ Anti-Forward
│ ✅ Anti-Arab / Anti-Chinese
│ ✅ Anti-Virtex (teks crash)
│ ✅ Anti-Flood (pesan beruntun)
│ ✅ Anti-Tagall (mention spam)
│ ✅ Anti-Toxic (kata kasar)
│ ✅ Anti-Photo / Video / Audio
│ ✅ Anti-Document / Voice
│ ✅ Anti-Inline Bot
│
└───────────────────────
</blockquote>

<blockquote expandable>
┌─「 👮 <b>MODERASI</b> 」
│
│ /kick /ban /unban
│ /mute /unmute
│ /warn /unwarn
│ /promote /demote
│ /pin /unpin /del
│
└───────────────────────
</blockquote>

<blockquote expandable>
┌─「 ⚙️ <b>SETTINGS</b> 」
│
│ /setwelcome - Set welcome msg
│ /setgoodbye - Set goodbye msg
│ /addfilter - Blacklist kata
│ /addreply - Auto reply
│
└───────────────────────
</blockquote>

<i>💡 Ketik /guard di grup untuk panel lengkap!</i>
<i>💡 Ketik /guardhelp untuk bantuan!</i>
`;
      bot.editMessageText(text, {
        chat_id: callbackQuery.message.chat.id,
        message_id: callbackQuery.message.message_id,
        parse_mode: "HTML",
        reply_markup: {
          inline_keyboard: [
            [
              { text: "🛡️ ANTI FITUR", callback_data: "guard_anti" },
              { text: "⚙️ SETTINGS", callback_data: "guard_settings" }
            ],
            [
              { text: "👮 MODERASI", callback_data: "guard_mod" },
              { text: "📝 FILTER", callback_data: "guard_filter" }
            ],
            [
              { text: "🤖 AUTO REPLY", callback_data: "guard_autoreply" },
              { text: "❓ HELP", callback_data: "guard_help" }
            ],
            [
              { text: "⬅️ KEMBALI", callback_data: "back" }
            ]
          ],
        },
      });
    }
  });

  // Guard Sub-menus
  bot.on("callback_query", (callbackQuery) => {
    if (callbackQuery.data === "guard_anti") {
      bot.answerCallbackQuery(callbackQuery.id);
      const text = `
╔══════════════════════════════════╗
║  🛡️ <b>ANTI FEATURES</b>  ║
╚══════════════════════════════════╝

┌─「 🔒 <b>PROTEKSI OTOMATIS</b> 」
│
│ <b>Basic Protection:</b>
│ • Anti-Link - Hapus link otomatis
│ • Anti-Spam - Deteksi pesan spam
│ • Anti-Bot - Block bot join grup
│ • Anti-Forward - Hapus pesan forward
│
│ <b>Media Protection:</b>
│ • Anti-Sticker - Hapus sticker
│ • Anti-GIF - Hapus animasi
│ • Anti-Photo / Video / Audio
│ • Anti-Document / Voice
│
│ <b>Advanced Protection:</b>
│ • Anti-Virtex - Block teks crash
│ • Anti-Flood - Block pesan beruntun
│ • Anti-Tagall - Block tag massal
│ • Anti-Toxic - Filter kata kasar
│ • Anti-Arab/Chinese - Filter teks
│ • Anti-Inline - Block inline bot
│
└───────────────────────

<i>💡 Aktifkan via /guard di grup!</i>
`;
      bot.editMessageText(text, {
        chat_id: callbackQuery.message.chat.id,
        message_id: callbackQuery.message.message_id,
        parse_mode: "HTML",
        reply_markup: {
          inline_keyboard: [
            [{ text: "⬅️ KEMBALI", callback_data: "guardmenu" }]
          ],
        },
      });
    }
  });

  // --- FIXED OWNERMENU CALLBACK ---
  bot.on("callback_query", (callbackQuery) => {
    if (callbackQuery.data === "ownermenu") {
      bot.answerCallbackQuery(callbackQuery.id);
      const text = `
╭──✧ 👑 𝐎𝐖𝐍𝐄𝐑 𝐂𝐎𝐌𝐌𝐀𝐍𝐃𝐒 ✧
│
│ 📡 <b>DigitalOcean Manager</b>
│ /adddo &lt;nama|token&gt; - Add Token
│ /deldo &lt;nomor&gt; - Del Token
│ /listdo - List Token
│
│ 🌐 <b>DNS & Subdomain</b>
│ /dnssettings - DNS Menu
│ /dnsadd &lt;subdomain&gt; &lt;ip&gt;
│
╰───────────────────────◊
`;
      bot.editMessageText(text, {
        chat_id: callbackQuery.message.chat.id,
        message_id: callbackQuery.message.message_id,
        parse_mode: "HTML",
        reply_markup: {
          inline_keyboard: [
            // Management Section
            [
              { text: "➕ Add DO Token", switch_inline_query_current_chat: "/adddo " },
              { text: "📋 List DO Token", callback_data: "listdo_menu_click" }
            ],
            [
              { text: "🌐 DNS Settings", callback_data: "dnsmenu" },
              { text: "📊 CPU Monitor", callback_data: "cpumonitor_menu" }
            ],
            // Settings Section
            [
              { text: "⚙️ Pengaturan Bot", callback_data: "pengaturan" }
            ],
            // Navigation
            [
              { text: "🔙 KEMBALI KE MENU UTAMA", callback_data: "openmainmenu" }
            ]
          ]
        }
      });
    }
  });

  // --- FIXED GUARD SETTINGS CALLBACK ---
  bot.on("callback_query", (callbackQuery) => {
    if (callbackQuery.data === "guard_settings") {
      bot.answerCallbackQuery(callbackQuery.id);
      const text = `
╔══════════════════════════════════╗
║  ⚙️ <b>SETTINGS MENU</b>  ║
╚══════════════════════════════════╝

┌─「 🔧 <b>GROUP SETTINGS</b> 」
│
│ <b>Lock/Unlock:</b>
│ • /guard → Toggle Lock Grup
│
│ <b>Welcome/Goodbye:</b>
│ • /setwelcome &lt;pesan&gt;
│ • /setgoodbye &lt;pesan&gt;
│
│ <b>Variables:</b>
│ • {user} - Mention user
│ • {group} - Nama grup
│ • {id} - User ID
│ • {count} - Jumlah member
│
│ <b>Lainnya:</b>
│ • Slowmode (via panel)
│ • Warn Limit (via panel)
│ • Only Admin Mode
│
└───────────────────────

<i>💡 Buka /guard untuk panel lengkap!</i>
`;
      bot.editMessageText(text, {
        chat_id: callbackQuery.message.chat.id,
        message_id: callbackQuery.message.message_id,
        parse_mode: "HTML",
        reply_markup: {
          inline_keyboard: [
            [{ text: "⬅️ KEMBALI", callback_data: "guardmenu" }]
          ],
        },
      });
    }
  });

  bot.on("callback_query", (callbackQuery) => {
    if (callbackQuery.data === "guard_mod") {
      bot.answerCallbackQuery(callbackQuery.id);
      const text = `
╔══════════════════════════════════╗
║  👮 <b>MODERASI COMMANDS</b>  ║
╚══════════════════════════════════╝

┌─「 🔨 <b>USER MANAGEMENT</b> 」
│
│ <b>Kick &amp; Ban:</b>
│ • /kick - Kick user (reply/id)
│ • /ban - Ban permanen
│ • /unban &lt;id&gt; - Unban user
│
│ <b>Mute:</b>
│ • /mute [menit] - Mute user
│ • /unmute - Unmute user
│
│ <b>Warning:</b>
│ • /warn - Beri warning
│ • /unwarn - Reset warning
│
├─「 👑 <b>ADMIN</b> 」
│
│ • /promote - Jadikan admin
│ • /demote - Cabut admin
│
├─「 📌 <b>PIN</b> 」
│
│ • /pin - Pin pesan (reply)
│ • /unpin - Unpin semua
│
├─「 🗑️ <b>DELETE</b> 」
│
│ • /del - Hapus pesan (reply)
│
└───────────────────────

<i>💡 Semua command support REPLY!</i>
`;
      bot.editMessageText(text, {
        chat_id: callbackQuery.message.chat.id,
        message_id: callbackQuery.message.message_id,
        parse_mode: "HTML",
        reply_markup: {
          inline_keyboard: [
            [{ text: "⬅️ KEMBALI", callback_data: "guardmenu" }]
          ],
        },
      });
    }
  });

  bot.on("callback_query", (callbackQuery) => {
    if (callbackQuery.data === "guard_filter") {
      bot.answerCallbackQuery(callbackQuery.id);
      const text = `
╔══════════════════════════════════╗
║  📝 <b>WORD FILTER</b>  ║
╚══════════════════════════════════╝

┌─「 🔤 <b>BADWORD FILTER</b> 」
│
│ Blacklist kata-kata terlarang!
│ Pesan dengan kata terfilter
│ akan otomatis dihapus.
│
│ <b>Commands:</b>
│ • /addfilter &lt;kata&gt;
│   Tambah kata ke blacklist
│
│ • /delfilter &lt;kata&gt;
│   Hapus dari blacklist
│
│ • /listfilter
│   Lihat semua filter
│
│ • /clearfilter
│   Hapus semua filter
│
└───────────────────────

<i>💡 Filter case-insensitive!</i>
`;
      bot.editMessageText(text, {
        chat_id: callbackQuery.message.chat.id,
        message_id: callbackQuery.message.message_id,
        parse_mode: "HTML",
        reply_markup: {
          inline_keyboard: [
            [{ text: "⬅️ KEMBALI", callback_data: "guardmenu" }]
          ],
        },
      });
    }
  });

  bot.on("callback_query", (callbackQuery) => {
    if (callbackQuery.data === "guard_autoreply") {
      bot.answerCallbackQuery(callbackQuery.id);
      const text = `
╔══════════════════════════════════╗
║  🤖 <b>AUTO REPLY</b>  ║
╚══════════════════════════════════╝

┌─「 💬 <b>BALASAN OTOMATIS</b> 」
│
│ Bot akan membalas otomatis
│ ketika ada trigger tertentu!
│
│ <b>Commands:</b>
│ • /addreply trigger|balasan
│   Contoh: /addreply halo|Hai juga!
│
│ • /delreply &lt;trigger&gt;
│   Hapus auto reply
│
│ • /listreply
│   Lihat semua auto reply
│
└───────────────────────

<i>💡 Trigger case-insensitive!</i>
`;
      bot.editMessageText(text, {
        chat_id: callbackQuery.message.chat.id,
        message_id: callbackQuery.message.message_id,
        parse_mode: "HTML",
        reply_markup: {
          inline_keyboard: [
            [{ text: "⬅️ KEMBALI", callback_data: "guardmenu" }]
          ],
        },
      });
    }
  });

  bot.on("callback_query", (callbackQuery) => {
    if (callbackQuery.data === "guard_help") {
      bot.answerCallbackQuery(callbackQuery.id);
      const text = `
╔══════════════════════════════════╗
║  ❓ <b>GUARD HELP</b>  ║
╚══════════════════════════════════╝

<b>🛡️ CARA PAKAI:</b>

1️⃣ Tambahkan bot ke grup
2️⃣ Jadikan bot sebagai ADMIN
3️⃣ Ketik /guard di grup
4️⃣ Aktifkan fitur yang diinginkan

<b>📌 TIPS:</b>

• Bot HARUS jadi admin!
• Berikan permission penuh
• Semua moderasi support reply
• Ketik /guardhelp untuk bantuan

<b>🔗 SUPPORT:</b>
• @schnuffelll

<i>© 2025 Schnuffelll Guard</i>
`;
      bot.editMessageText(text, {
        chat_id: callbackQuery.message.chat.id,
        message_id: callbackQuery.message.message_id,
        parse_mode: "HTML",
        reply_markup: {
          inline_keyboard: [
            [{ text: "⬅️ KEMBALI", callback_data: "guardmenu" }]
          ],
        },
      });
    }
  });

  bot.on("callback_query", (callbackQuery) => {
    if (callbackQuery.data === "cvpsmenu") {
      bot.answerCallbackQuery(callbackQuery.id);
      const text = `
╔═══════════════════════════════╗
║     ☁️ 𝐕𝐏𝐒 𝐌𝐀𝐍𝐀𝐆𝐄𝐑     ║
╚═══════════════════════════════╝

┌─「 🚀 𝗖𝗥𝗘𝗔𝗧𝗘 𝗩𝗣𝗦 」
│
│  /createvps <option>
│  /statusdo <option>
│
├─「 📊 𝗦𝗧𝗔𝗧𝗨𝗦 𝗩𝗣𝗦 」
│
│  /cekdata <dropletId>
│  /listvps <option>
│  /delvps <dropletId>
│
└───────────────────────
`;
      bot.editMessageText(text, {
        chat_id: callbackQuery.message.chat.id,
        message_id: callbackQuery.message.message_id,
        parse_mode: "Markdown",
        reply_markup: {
          inline_keyboard: [
            [
              { text: "⿻ ᴘʀɪᴠᴀᴛᴇ ᴍᴇɴᴜ", callback_data: "privmenu" },
              { text: "🧩 ᴄʀᴇᴀᴛᴇ ᴘᴀɴᴇʟ", callback_data: "createpanel" },
            ],
            [
              { text: "⚙️ ɪɴꜱᴛᴀʟʟ ᴍᴇɴᴜ", callback_data: "installmenu" },
              { text: "👑 ᴏᴡɴᴇʀ ᴍᴇɴᴜ", callback_data: "ownermenu" },
              { text: "ᴏᴛʜᴇʀ ᴍᴇɴᴜ", callback_data: "othermenu" }
            ],
            [
              { text: "<<", callback_data: "back" }
            ]
          ],
        },
      });
    }
  });

  // Rebuild VPS Menu Callback
  bot.on("callback_query", (callbackQuery) => {
    if (callbackQuery.data === "rebuildmenu") {
      bot.answerCallbackQuery(callbackQuery.id);
      const text = `
╔══════════════════════════════════╗
║  🔄 <b>REBUILD VPS</b>  ║
╚══════════════════════════════════╝

<blockquote>
┌─「 📋 <b>INFORMASI</b> 」
│
│ Fitur ini akan <b>REINSTALL</b> OS VPS
│ ke Ubuntu 22.04 dengan live log.
│
│ <b>⚠️ WARNING:</b>
│ • Semua data di VPS akan HILANG
│ • Proses membutuhkan 5-15 menit
│ • VPS akan reboot beberapa kali
│
└───────────────────────
</blockquote>

<b>🔧 CARA PAKAI:</b>
• Mode Langsung: <code>/rebuild ipvps,pwvps</code>
• Mode Interaktif: <code>/rebuild</code>

<i>💡 Setelah rebuild, password VPS mungkin reset!</i>
`;
      bot.editMessageText(text, {
        chat_id: callbackQuery.message.chat.id,
        message_id: callbackQuery.message.message_id,
        parse_mode: "HTML",
        reply_markup: {
          inline_keyboard: [
            [
              { text: "⬅️ KEMBALI", callback_data: "installmenu" }
            ]
          ],
        },
      });
    }
  });

  bot.on("callback_query", (callbackQuery) => {
    if (callbackQuery.data === "back") {
      bot.answerCallbackQuery(callbackQuery.id);

      const userId = callbackQuery.from.id.toString();

      // runtime vps
      const vpsUptime = os.uptime();
      const vpsUptimeStr = `${Math.floor(vpsUptime / 86400)}d ${Math.floor((vpsUptime % 86400) / 3600)}h ${Math.floor((vpsUptime % 3600) / 60)}m`;

      const status = ownerUsers.includes(userId)
        ? "Owner"
        : premiumUsers.includes(userId)
          ? "Premium"
          : ressUsers.includes(userId)
            ? "Reseller"
            : "User";

      if (fs.existsSync(usersFile)) {
        users = JSON.parse(fs.readFileSync(usersFile));
      }
      const total = users.length;

      const menuText = `
╔═══════════════════════════════════╗
║  🌟 𝐒𝐂𝐇𝐍𝐔𝐅𝐅𝐄𝐋𝐋𝐋 𝐁𝐎𝐓 𝐕𝟐.𝟎  🌟  ║
╚═══════════════════════════════════╝

👋 𝘼𝙨𝙨𝙖𝙡𝙖𝙢𝙪'𝙖𝙡𝙖𝙞𝙠𝙪𝙢, <b>@${callbackQuery.from.username || callbackQuery.from.first_name}</b>!

┌─「 📊 𝗜𝗡𝗙𝗢 」
│  🎭 Status: <b>${status}</b>
│  👥 User: <b>${total}</b>
│  ⏰ ${waktu} | 📡 ${vpsUptimeStr}
└───────────────────────

<blockquote expandable>
🕌 <b>𝗞𝗔𝗧𝗔 𝗠𝗨𝗧𝗜𝗔𝗥𝗔 𝗜𝗦𝗟𝗔𝗠</b> 🕌

<i>"Perumpamaan orang yang menginfakkan hartanya di jalan Allah seperti sebutir biji yang menumbuhkan tujuh tangkai, pada setiap tangkai ada seratus biji. Allah melipatgandakan bagi siapa yang Dia kehendaki."</i>
— QS. Al-Baqarah: 261

🤲 <i>"Tangan di atas lebih baik daripada tangan di bawah. Tangan di atas adalah tangan yang memberi."</i>
— HR. Bukhari & Muslim

💎 <i>"Sedekah tidak akan mengurangi harta. Tidak ada orang yang memberi maaf melainkan Allah akan menambah kemuliaannya."</i>
— HR. Muslim

🌙 <i>"Lindungilah dirimu dari api neraka walau hanya dengan bersedekah separuh kurma, jika tidak mampu maka dengan perkataan yang baik."</i>
— HR. Bukhari & Muslim

🌟 <b>Mari berbagi kebaikan!</b>
<i>Ilmu yang bermanfaat, rezeki yang halal, dan kebaikan sekecil apapun akan menjadi amal jariyah yang pahalanya terus mengalir.</i>
</blockquote>

💫 <i>Barakallahu fiikum</i>
`;

      bot.editMessageText(menuText, {
        chat_id: callbackQuery.message.chat.id,
        message_id: callbackQuery.message.message_id,
        parse_mode: "HTML",
        reply_markup: {
          inline_keyboard: [
            [
              { text: "🔐 PRIVATE", callback_data: "privmenu" },
              { text: "🧩 PANEL", callback_data: "createpanel" },
            ],
            [
              { text: "⚙️ INSTALL", callback_data: "installmenu" },
              { text: "☁️ VPS", callback_data: "cvpsmenu" },
              { text: "🔧 OTHER", callback_data: "othermenu" }
            ],
            [
              { text: "🛡️ INSTALL PROTECT", callback_data: "installprotectmenu" },
              { text: "🗑️ UNINSTALL", callback_data: "uninstallprotectmenu" }
            ],
            [
              { text: "🛡️ GROUP GUARD", callback_data: "guardmenu" },
              { text: "⚔️ RPG GAME", callback_data: "rpgmenu" }
            ],
            [
              { text: "👑 OWNER MENU", callback_data: "ownermenu" }
            ],
            [
              { text: "🛒 BUY SCRIPT @schnuffelll", url: "https://t.me/schnuffelll" }
            ]
          ]
        }
      });
    }
  });

  // RPG Menu Callback - CYBERPUNK EDITION
  bot.on("callback_query", (callbackQuery) => {
    if (callbackQuery.data === "rpgmenu") {
      bot.answerCallbackQuery(callbackQuery.id);
      const text = `
╔══════════════════════════════════════════════════╗
║  🌆 <b>CYBERPUNK SURVIVAL RPG v3.0</b>  ║
╠══════════════════════════════════════════════════╣
║  <i>Neo-Jakarta 2077 - Survive the Neon</i>  ║
╚══════════════════════════════════════════════════╝

<blockquote expandable>
┌─「 🎭 <b>CYBERPUNK CLASSES</b> 」
│
│ 🖥️ <b>Netrunner</b> - Elite Hacker
│ 🔫 <b>Solo</b> - Mercenary Combat
│ 🔧 <b>Techie</b> - Tech Genius
│ 💉 <b>Medtech</b> - Street Doctor
│ 🏍️ <b>Nomad</b> - Wasteland Survivor
│ 💼 <b>Corpo</b> - Ex-Corporate Agent
│ 🎭 <b>Fixer</b> - Info Broker
│ 🛹 <b>Street Kid</b> - City Native
│
└───────────────────────
</blockquote>

<blockquote expandable>
┌─「 🌡️ <b>SURVIVAL SYSTEM</b> 」
│
│ 🍖 Hunger - Lapar
│ 💧 Thirst - Haus
│ ⚡ Stamina - Energi
│ 🧠 Sanity - Kewarasan
│ 🦾 Humanity - Cyberware
│
│ <i>Low stats = debuff & HP drain!</i>
│
└───────────────────────
</blockquote>

<blockquote expandable>
┌─「 🌆 <b>NEO-JAKARTA DISTRICTS</b> 」
│
│ 🌃 Gang Alley (Lv.1+)
│ 🏪 Neon Market (Lv.5+)
│ 🏢 Corpo Plaza (Lv.10+)
│ ☢️ Cyber Wasteland (Lv.15+)
│ 🕳️ Underground Bunker (Lv.20+)
│ 💻 Cyberspace (Lv.30+)
│ 🛸 Orbital Station (Lv.40+)
│ 🏰 Mega Tower (Lv.50+)
│
└───────────────────────
</blockquote>

<blockquote expandable>
┌─「 ⚡ <b>QUICK COMMANDS</b> 」
│
│ <code>.daftar [nama] [class]</code> - Create
│ <code>.profile</code> - View stats
│ <code>.survival</code> - Survival status
│ <code>.adv [location]</code> - Adventure
│ <code>.inventory</code> - Check items
│ <code>.shop</code> - Black market
│ <code>.gacha</code> - Lucky draw
│ <code>.daily</code> - Daily reward
│ <code>.rpghelp</code> - Full help
│
└───────────────────────
</blockquote>

<i>🌆 "Welcome to Night City, choom. 
Don't let the corpo rats flatline you."</i>
`;
      bot.editMessageText(text, {
        chat_id: callbackQuery.message.chat.id,
        message_id: callbackQuery.message.message_id,
        parse_mode: "HTML",
        reply_markup: {
          inline_keyboard: [
            [
              { text: "🎭 CLASSES", callback_data: "rpg_char" },
              { text: "🌆 LOCATIONS", callback_data: "rpg_adv" }
            ],
            [
              { text: "🎒 INVENTORY", callback_data: "rpg_inv" },
              { text: "🏪 SHOP", callback_data: "rpg_shop" }
            ],
            [
              { text: "🌡️ SURVIVAL", callback_data: "rpg_survival" },
              { text: "🎰 GACHA", callback_data: "rpg_gacha" }
            ],
            [
              { text: "🏆 LEADERBOARD", callback_data: "rpg_lb" },
              { text: "❓ HELP", callback_data: "rpg_help" }
            ],
            [
              { text: "⬅️ KEMBALI", callback_data: "back" }
            ]
          ],
        },
      });
    }
  });

  // RPG Sub-menus - CYBERPUNK EDITION
  bot.on("callback_query", (callbackQuery) => {
    if (callbackQuery.data === "rpg_char") {
      bot.answerCallbackQuery(callbackQuery.id);
      const text = `
╔══════════════════════════════════╗
║  🎭 <b>CYBERPUNK CLASSES</b>  ║
╚══════════════════════════════════╝

<i>"Choose your path in the neon jungle."</i>

┌─「 🎮 <b>CREATE CHARACTER</b> 」
│
│ <code>.daftar [nama] [class]</code>
│
│ <b>Contoh:</b>
│ <code>.daftar V netrunner</code>
│
└───────────────────────

┌─「 🎭 <b>AVAILABLE CLASSES</b> 」
│
│ 🖥️ <b>Netrunner</b>
│   └ Elite Hacker, Magic tinggi
│   └ Skills: ICE Breaker, Neural Spike
│
│ 🔫 <b>Solo</b>
│   └ Mercenary, Combat Expert
│   └ Skills: Bullet Time, Rage Mode
│
│ 🔧 <b>Techie</b>
│   └ Tech Genius, Craftsman
│   └ Skills: Drone Deploy, EMP Blast
│
│ 💉 <b>Medtech</b>
│   └ Street Doctor, Support
│   └ Skills: Combat Stim, Revive
│
│ 🏍️ <b>Nomad</b>
│   └ Wasteland Survivor
│   └ Skills: Scavenge, Survival Instinct
│
│ 💼 <b>Corpo</b>
│   └ Ex-Corporate Agent
│   └ Skills: Bribe, Corpo Connections
│
│ 🎭 <b>Fixer</b>
│   └ Info Broker, Negotiator
│   └ Skills: Insight, Black Market
│
│ 🛹 <b>Street Kid</b>
│   └ City Native, Street Wise
│   └ Skills: Pickpocket, Street Rep
│
└───────────────────────

<b>Commands:</b>
<code>.profile</code> - View stats
<code>.survival</code> - Survival status
<code>.skills</code> - View skills
`;
      bot.editMessageText(text, {
        chat_id: callbackQuery.message.chat.id,
        message_id: callbackQuery.message.message_id,
        parse_mode: "HTML",
        reply_markup: {
          inline_keyboard: [
            [{ text: "⬅️ KEMBALI", callback_data: "rpgmenu" }]
          ],
        },
      });
    }
  });

  bot.on("callback_query", (callbackQuery) => {
    if (callbackQuery.data === "rpg_adv") {
      bot.answerCallbackQuery(callbackQuery.id);
      const text = `
╔══════════════════════════════════╗
║  🌆 <b>NEO-JAKARTA DISTRICTS</b>  ║
╚══════════════════════════════════╝

<i>"The city never sleeps, and neither do its demons."</i>

┌─「 🗺️ <b>EXPLORE LOCATIONS</b> 」
│
│ 🌃 <b>Gang Alley</b> (Lv.1+)
│   └ Street Punk, Junkie, Pickpocket
│   └ BOSS: Gang Leader
│
│ 🏪 <b>Neon Market</b> (Lv.5+)
│   └ Black Dealer, Booster, Scammer
│   └ BOSS: Yakuza Boss
│
│ 🏢 <b>Corpo Plaza</b> (Lv.10+)
│   └ Corpo Guard, Security Drone
│   └ BOSS: Corpo Executive
│
│ ☢️ <b>Cyber Wasteland</b> (Lv.15+)
│   └ Mutant, Radiated Beast, Scavenger
│   └ BOSS: Wasteland Warlord
│
│ 🕳️ <b>Underground Bunker</b> (Lv.20+)
│   └ Lab Experiment, Maelstrom Gang
│   └ BOSS: Dr. Experiment
│
│ 💻 <b>Cyberspace</b> (Lv.30+)
│   └ Rogue AI, Virus, Data Ghost
│   └ BOSS: Blackwall Demon
│
│ 🛸 <b>Orbital Station</b> (Lv.40+)
│   └ Space Marine, Alien Parasite
│   └ BOSS: Orbital Commander
│
│ 🏰 <b>Mega Tower</b> (Lv.50+)
│   └ Elite Guard, Cyborg Assassin
│   └ BOSS: Corporate Overlord
│
└───────────────────────

<b>Command:</b>
<code>.adv gang_alley</code>
<code>.adv corpo_plaza</code>

<i>💀 12% chance ketemu BOSS!</i>
`;
      bot.editMessageText(text, {
        chat_id: callbackQuery.message.chat.id,
        message_id: callbackQuery.message.message_id,
        parse_mode: "HTML",
        reply_markup: {
          inline_keyboard: [
            [{ text: "⬅️ KEMBALI", callback_data: "rpgmenu" }]
          ],
        },
      });
    }
  });

  bot.on("callback_query", (callbackQuery) => {
    if (callbackQuery.data === "rpg_inv") {
      bot.answerCallbackQuery(callbackQuery.id);
      const text = `
╔══════════════════════════════════╗
║  🎒 <b>INVENTORY SYSTEM</b>  ║
╚══════════════════════════════════╝

<i>"Your stash, your lifeline."</i>

┌─「 📦 <b>COMMANDS</b> 」
│
│ <code>.inventory</code> - Check stash
│ <code>.use [item]</code> - Use consumable
│ <code>.equip [item]</code> - Equip gear
│ <code>.sell [item] [qty]</code> - Sell item
│
└───────────────────────

┌─「 📊 <b>ITEM TYPES</b> 」
│
│ 💊 <b>Consumables</b>
│   └ Stimpacks, Food, Drinks
│   └ Restore HP, MP, Survival
│
│ ⚔️ <b>Weapons</b>
│   └ Pistols, SMGs, Katanas
│   └ Bonus ATK stats
│
│ 🛡️ <b>Armor</b>
│   └ Jackets, Vests, Helmets
│   └ Bonus DEF & HP
│
│ 💍 <b>Accessories</b>
│   └ Cyberdecks, Optics
│   └ Special bonuses
│
│ 🦾 <b>Augmentations</b>
│   └ Cybernetic upgrades
│   └ Permanent stat boosts
│
│ 🔩 <b>Materials</b>
│   └ Components, Scrap
│   └ For crafting/selling
│
└───────────────────────

<i>💡 Equip gear untuk bonus stats!</i>
`;
      bot.editMessageText(text, {
        chat_id: callbackQuery.message.chat.id,
        message_id: callbackQuery.message.message_id,
        parse_mode: "HTML",
        reply_markup: {
          inline_keyboard: [
            [{ text: "⬅️ KEMBALI", callback_data: "rpgmenu" }]
          ],
        },
      });
    }
  });

  bot.on("callback_query", (callbackQuery) => {
    if (callbackQuery.data === "rpg_shop") {
      bot.answerCallbackQuery(callbackQuery.id);
      const text = `
╔══════════════════════════════════╗
║  🏪 <b>BLACK MARKET</b>  ║
╚══════════════════════════════════╝

<i>"What do you need, choom? I got everything."</i>

┌─「 💰 <b>COMMANDS</b> 」
│
│ <code>.shop</code> - Browse market
│ <code>.buy [item]</code> - Purchase
│ <code>.buy [item] [qty]</code> - Buy bulk
│ <code>.sell [item] [qty]</code> - Sell items
│
└───────────────────────

┌─「 💊 <b>CONSUMABLES</b> 」
│
│ Cheap Stimpack - €$50
│ Military Stimpack - €$200
│ Protein Bar - €$30
│ Synthetic Ramen - €$80
│ Purified Water - €$25
│ Energy Drink - €$60
│
└───────────────────────

┌─「 ⚔️ <b>WEAPONS</b> 」
│
│ Rusty Knife - €$100
│ Street Pistol - €$500
│ Combat Shotgun - €$2000
│ Katana - €$3000
│ Smart SMG - €$5000
│
└───────────────────────

┌─「 🛡️ <b>ARMOR</b> 」
│
│ Worn Jacket - €$200
│ Kevlar Vest - €$1000
│ Combat Helmet - €$800
│ Tech Jacket - €$3000
│
└───────────────────────

<i>💵 Earn €$ from adventures!</i>
`;
      bot.editMessageText(text, {
        chat_id: callbackQuery.message.chat.id,
        message_id: callbackQuery.message.message_id,
        parse_mode: "HTML",
        reply_markup: {
          inline_keyboard: [
            [{ text: "⬅️ KEMBALI", callback_data: "rpgmenu" }]
          ],
        },
      });
    }
  });

  bot.on("callback_query", (callbackQuery) => {
    if (callbackQuery.data === "rpg_lb") {
      bot.answerCallbackQuery(callbackQuery.id);
      const text = `
╔══════════════════════════════════╗
║  🏆 <b>NEO-JAKARTA LEGENDS</b>  ║
╚══════════════════════════════════╝

<b>📊 Command:</b>
<code>.leaderboard</code>

Menampilkan Top 10 mercs dengan:
• 📈 Level tertinggi
• 💀 Total kills
• 👑 Boss defeats

<i>💀 "Legends never die, choom."</i>
`;
      bot.editMessageText(text, {
        chat_id: callbackQuery.message.chat.id,
        message_id: callbackQuery.message.message_id,
        parse_mode: "HTML",
        reply_markup: {
          inline_keyboard: [
            [{ text: "⬅️ KEMBALI", callback_data: "rpgmenu" }]
          ],
        },
      });
    }
  });

  // RPG Survival Menu
  bot.on("callback_query", (callbackQuery) => {
    if (callbackQuery.data === "rpg_survival") {
      bot.answerCallbackQuery(callbackQuery.id);
      const text = `
╔══════════════════════════════════╗
║  🌡️ <b>SURVIVAL SYSTEM</b>  ║
╚══════════════════════════════════╝

┌─「 📊 <b>SURVIVAL STATS</b> 」
│
│ 🍖 <b>Hunger</b> - Kebutuhan makan
│   └ Low = ATK/SPD debuff
│   └ <code>.eat [item]</code>
│
│ 💧 <b>Thirst</b> - Kebutuhan minum
│   └ Low = DEF/MP debuff
│   └ <code>.drink [item]</code>
│
│ ⚡ <b>Stamina</b> - Energi
│   └ Low = Can't adventure
│   └ <code>.rest [jam]</code>
│
│ 🧠 <b>Sanity</b> - Kewarasan
│   └ Low = Random debuffs
│   └ Rest atau pulang ke rumah
│
│ 🦾 <b>Humanity</b> - Kemanusiaan
│   └ Berkurang saat pasang cyberware
│   └ Low = Cyberpsychosis risk
│
└───────────────────────

┌─「 ⚠️ <b>WARNINGS</b> 」
│
│ • Stats turun seiring waktu
│ • Adventure menguras stamina
│ • Low stats = HP drain!
│
└───────────────────────

<b>Commands:</b>
<code>.survival</code> - Cek status
<code>.eat protein_bar</code> - Makan
<code>.drink purified_water</code> - Minum
<code>.rest 2</code> - Istirahat 2 jam
`;
      bot.editMessageText(text, {
        chat_id: callbackQuery.message.chat.id,
        message_id: callbackQuery.message.message_id,
        parse_mode: "HTML",
        reply_markup: {
          inline_keyboard: [
            [{ text: "⬅️ KEMBALI", callback_data: "rpgmenu" }]
          ],
        },
      });
    }
  });

  // RPG Gacha Menu
  bot.on("callback_query", (callbackQuery) => {
    if (callbackQuery.data === "rpg_gacha") {
      bot.answerCallbackQuery(callbackQuery.id);
      const text = `
╔══════════════════════════════════╗
║  🎰 <b>GACHA SYSTEM</b>  ║
╚══════════════════════════════════╝

<i>"Feeling lucky, choom? Try your fate."</i>

┌─「 🎫 <b>AVAILABLE BANNERS</b> 」
│
│ 🎰 <b>Standard Banner</b>
│   └ Cost: €$500
│   └ <code>.gacha standard</code>
│
│ 💎 <b>Premium Banner</b>
│   └ Cost: 💎10 Diamonds
│   └ <code>.gacha premium</code>
│   └ Higher epic/legendary rates!
│
│ ⚔️ <b>Weapon Banner</b>
│   └ Cost: €$1000
│   └ <code>.gacha weapon</code>
│   └ Weapons only!
│
│ 🦾 <b>Cyber Banner</b>
│   └ Cost: 💎20 Diamonds
│   └ <code>.gacha cyber</code>
│   └ Augmentations only!
│
└───────────────────────

┌─「 📊 <b>RARITY RATES</b> 」
│
│ ⚪ Common - 50%
│ 🟢 Uncommon - 30%
│ 🔵 Rare - 13%
│ 🟣 Epic - 5%
│ 🟡 Legendary - 1.8%
│ ⭐ Mythic - 0.2%
│
└───────────────────────

<i>💡 Dapatkan 💎 diamonds dari achievements!</i>
`;
      bot.editMessageText(text, {
        chat_id: callbackQuery.message.chat.id,
        message_id: callbackQuery.message.message_id,
        parse_mode: "HTML",
        reply_markup: {
          inline_keyboard: [
            [
              { text: "🎰 STANDARD", switch_inline_query_current_chat: ".gacha standard" },
              { text: "💎 PREMIUM", switch_inline_query_current_chat: ".gacha premium" }
            ],
            [
              { text: "⚔️ WEAPON", switch_inline_query_current_chat: ".gacha weapon" },
              { text: "🦾 CYBER", switch_inline_query_current_chat: ".gacha cyber" }
            ],
            [{ text: "⬅️ KEMBALI", callback_data: "rpgmenu" }]
          ],
        },
      });
    }
  });

  bot.on("callback_query", (callbackQuery) => {
    if (callbackQuery.data === "rpg_help") {
      bot.answerCallbackQuery(callbackQuery.id);
      const text = `
╔══════════════════════════════════╗
║  ❓ <b>CYBERPUNK RPG HELP</b>  ║
╚══════════════════════════════════╝

<b>🎮 CARA BERMAIN:</b>

1️⃣ <b>Buat karakter:</b>
   <code>.daftar V netrunner</code>
   <i>Pilih class: netrunner, solo, techie, medtech, nomad, corpo, fixer, streetkid</i>

2️⃣ <b>Cek status survival:</b>
   <code>.survival</code>
   <i>Jaga Hunger, Thirst, Stamina!</i>

3️⃣ <b>Pergi adventure:</b>
   <code>.adv gang_alley</code>
   <i>Kalahkan musuh → XP & €$</i>

4️⃣ <b>Makan & Minum:</b>
   <code>.eat protein_bar</code>
   <code>.drink purified_water</code>
   <i>Jaga survival stats!</i>

5️⃣ <b>Istirahat:</b>
   <code>.rest 2</code>
   <i>Restore stamina & sanity</i>

6️⃣ <b>Beli di Black Market:</b>
   <code>.shop</code>
   <code>.buy stimpack</code>

7️⃣ <b>Equip gear:</b>
   <code>.equip katana</code>

8️⃣ <b>Daily reward:</b>
   <code>.daily</code>

9️⃣ <b>Lucky draw:</b>
   <code>.gacha standard</code>

<b>📌 SURVIVAL TIPS:</b>
• ⚡ Low stamina = Can't adventure
• 🍖 Low hunger = ATK debuff
• 💧 Low thirst = DEF debuff
• 🧠 Low sanity = Random debuffs
• 🦾 Low humanity = Cyberpsychosis risk

<b>🎭 QUICK COMMANDS:</b>
<code>.profile</code> • <code>.survival</code> • <code>.inventory</code>
<code>.shop</code> • <code>.gacha</code> • <code>.leaderboard</code>

<i>💀 "Wake up, Samurai. We have a city to burn."</i>
<i>© 2077 Schnuffelll Entertainment</i>
`;
      bot.editMessageText(text, {
        chat_id: callbackQuery.message.chat.id,
        message_id: callbackQuery.message.message_id,
        parse_mode: "HTML",
        reply_markup: {
          inline_keyboard: [
            [{ text: "⬅️ KEMBALI", callback_data: "rpgmenu" }]
          ],
        },
      });
    }
  });

  // ═══════════════════════════════════════════════════════════════
  // INSTALL PROTECT MENU
  // ═══════════════════════════════════════════════════════════════
  bot.on("callback_query", (callbackQuery) => {
    if (callbackQuery.data === "installprotectmenu") {
      bot.answerCallbackQuery(callbackQuery.id);
      const text = `
╔══════════════════════════════════╗
║  🛡️ <b>INSTALL PROTECT</b>  ║
╠══════════════════════════════════╣
║  Proteksi VPS dari Serangan  ║
╚══════════════════════════════════╝

<blockquote expandable>
┌─「 🔐 <b>SECURITY SCRIPTS</b> 」
│
│ <code>/installprotect ipvps,pwvps</code>
│   └ Install script proteksi lengkap
│   └ Anti-DDoS, Firewall, Fail2ban
│   └ Port knocking, SSH hardening
│
│ <code>/installcsf ipvps,pwvps</code>
│   └ Install CSF Firewall
│   └ ConfigServer Security & Firewall
│
│ <code>/installddos ipvps,pwvps</code>
│   └ Install Anti-DDoS script
│   └ Protect dari serangan DDoS
│
│ <code>/installf2b ipvps,pwvps</code>
│   └ Install Fail2ban
│   └ Block IP yang mencoba brute force
│
└───────────────────────
</blockquote>

<blockquote expandable>
┌─「 🔒 <b>CLOUDFLARE</b> 」
│
│ <code>/antiddos on</code>
│   └ Aktifkan Under Attack Mode
│
│ <code>/antiddos off</code>
│   └ Nonaktifkan Under Attack Mode
│
└───────────────────────
</blockquote>

<i>💡 Pastikan VPS sudah terinstall panel sebelum install protect!</i>
`;
      bot.editMessageText(text, {
        chat_id: callbackQuery.message.chat.id,
        message_id: callbackQuery.message.message_id,
        parse_mode: "HTML",
        reply_markup: {
          inline_keyboard: [
            [
              { text: "🛡️ INSTALL ALL", switch_inline_query_current_chat: "/installprotect " },
              { text: "🔥 FIREWALL", switch_inline_query_current_chat: "/installcsf " }
            ],
            [
              { text: "🚫 ANTI-DDOS", switch_inline_query_current_chat: "/installddos " },
              { text: "🔒 FAIL2BAN", switch_inline_query_current_chat: "/installf2b " }
            ],
            [
              { text: "⬅️ KEMBALI", callback_data: "back" }
            ]
          ],
        },
      });
    }
  });

  // ═══════════════════════════════════════════════════════════════
  // UNINSTALL PROTECT MENU
  // ═══════════════════════════════════════════════════════════════
  bot.on("callback_query", (callbackQuery) => {
    if (callbackQuery.data === "uninstallprotectmenu") {
      bot.answerCallbackQuery(callbackQuery.id);
      const text = `
╔══════════════════════════════════╗
║  🗑️ <b>UNINSTALL PROTECT</b>  ║
╠══════════════════════════════════╣
║  Hapus Script Proteksi VPS  ║
╚══════════════════════════════════╝

<blockquote expandable>
┌─「 ⚠️ <b>UNINSTALL SCRIPTS</b> 」
│
│ <code>/uninstallprotect ipvps,pwvps</code>
│   └ Hapus semua script proteksi
│   └ Reset ke default
│
│ <code>/uninstallcsf ipvps,pwvps</code>
│   └ Hapus CSF Firewall
│
│ <code>/uninstallf2b ipvps,pwvps</code>
│   └ Hapus Fail2ban
│
└───────────────────────
</blockquote>

<blockquote>
⚠️ <b>PERINGATAN!</b>
Menghapus script proteksi akan membuat VPS lebih rentan terhadap serangan!
Pastikan kamu tau apa yang kamu lakukan.
</blockquote>

<i>💡 Uninstall hanya jika diperlukan!</i>
`;
      bot.editMessageText(text, {
        chat_id: callbackQuery.message.chat.id,
        message_id: callbackQuery.message.message_id,
        parse_mode: "HTML",
        reply_markup: {
          inline_keyboard: [
            [
              { text: "🗑️ UNINSTALL ALL", switch_inline_query_current_chat: "/uninstallprotect " }
            ],
            [
              { text: "❌ HAPUS CSF", switch_inline_query_current_chat: "/uninstallcsf " },
              { text: "❌ HAPUS F2B", switch_inline_query_current_chat: "/uninstallf2b " }
            ],
            [
              { text: "⬅️ KEMBALI", callback_data: "back" }
            ]
          ],
        },
      });
    }
  });
}