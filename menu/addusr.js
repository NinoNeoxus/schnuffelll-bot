const fs = require('fs');
const axios = require("axios"); // Import axios

// --- DATA LISENSI (DARI CONFIG.SECRET.JS) ---
// Bisa diubah via /dev menu - tidak lagi hardcoded
const secret = require('../config.secret.js');
const license = secret.getLicense();
// ----------------------------

const { loadJsonData, saveJsonData } = require('../lib/function');
const settings = require('../config.js');

// ID Owner ini akan dipakai oleh BUYER (dari config.js)
const OWNER_ID = settings.ownerId;
const OWNER_FILE = './db/users/adminID.json';

const OWNERP_FILE = './db/users/ownerID.json';
const PREMIUM_FILE = './db/users/premiumUsers.json';
const RESS_FILE = './db/users/resellerUsers.json';
const RESSVPS_FILE = './db/users/resellerVps.json';
const BUYERVPS_FILE = './db/users/buyerVps.json';

// --- MODIFIKASI 1: MENERIMA SUNTIKAN ID DEVELOPER ---
module.exports = (bot, DEVELOPER_ID) => {
  // --- SELESAI MODIFIKASI 1 ---

  // command /addprem, /addsewa, /address (support reply & manual ID + durasi)

  // ═══════════════════════════════════════════════════════════════
  // HELPER: Ambil target dari REPLY atau manual ID
  // Sekarang support: 
  //   1. Reply pesan tanpa argumen apapun (langsung ambil ID)
  //   2. Reply pesan + durasi optional
  //   3. Manual ID + durasi optional
  // ═══════════════════════════════════════════════════════════════
  const parseTargetAndDuration = (msg, commandName) => {
    const rawText = msg.text || "";
    const withoutCommand = rawText.replace(/^\/\S+/, "").trim();
    const args = withoutCommand ? withoutCommand.split(/\s+/) : [];

    // MODE REPLY: Cukup reply pesan user (durasi optional)
    if (msg.reply_to_message) {
      const target = msg.reply_to_message.from || {};
      return {
        targetId: String(target.id),
        duration: args[0] || null, // durasi optional
        targetFromReply: target
      };
    }

    // MODE MANUAL: /command 123456789 [durasi]
    if (args.length < 1) {
      return {
        error: `❌ Format salah!\n\n📌 *Cara Pakai:*\n• Reply pesan user + ketik /${commandName}\n• Atau: /${commandName} <user_id> [durasi]`
      };
    }

    const [id, dur] = args;
    if (!/^\d+$/.test(id)) {
      return {
        error: '❌ User ID harus berupa angka!'
      };
    }

    return {
      targetId: id,
      duration: dur || null,
      targetFromReply: null
    };
  };

  // ═══════════════════════════════════════════════════════════════
  // HELPER: Register command add user ke JSON (Support Reply!)
  // ═══════════════════════════════════════════════════════════════
  function registerAddUserCommand(commandName, filePath, roleName) {
    // Support: /command atau /command dengan argumen atau reply
    bot.onText(new RegExp(`^\\/${commandName}(?:@\\w+)?(?:\\s+.*)?$`, "i"), async (msg) => {
      const chatId = msg.chat.id;
      const senderId = msg.from.id.toString();

      // Validasi Owner Panel (OWNER_ID + ownerID.json)
      const owners = loadJsonData(OWNERP_FILE);
      if (msg.from.id !== OWNER_ID && !owners.includes(senderId)) {
        return bot.sendMessage(chatId, '❌ ᴋʜᴜꜱᴜꜱ ᴏᴡɴᴇʀ ᴘᴀɴᴇʟ');
      }

      const parsed = parseTargetAndDuration(msg, commandName);
      if (parsed.error) {
        return bot.sendMessage(chatId, parsed.error, {
          parse_mode: "Markdown",
          reply_to_message_id: msg.message_id
        });
      }

      const { targetId, duration, targetFromReply } = parsed;

      let list = loadJsonData(filePath);
      if (!Array.isArray(list)) list = [];

      if (list.includes(targetId)) {
        let displayName = targetId;
        if (targetFromReply) {
          displayName = targetFromReply.username ? `@${targetFromReply.username}` : targetFromReply.first_name || 'User';
        }
        return bot.sendMessage(
          chatId,
          `⚠️ *${displayName}* sudah terdaftar sebagai ${roleName}!`,
          { parse_mode: "Markdown", reply_to_message_id: msg.message_id }
        );
      }

      list.push(targetId);
      const success = saveJsonData(filePath, list);

      if (!success) {
        return bot.sendMessage(chatId, `❌ Gagal menyimpan data ${roleName}!`);
      }

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

      let caption = `
╔══════════════════════════╗
║   ✅ 𝐒𝐔𝐊𝐒𝐄𝐒 𝐃𝐈𝐓𝐀𝐌𝐁𝐀𝐇𝐊𝐀𝐍   ║
╚══════════════════════════╝

👤 *User:* ${displayName}
🆔 *ID:* \`${targetId}\`
🏷️ *Role:* ${roleName}`;

      if (duration) {
        caption += `\n⏳ *Durasi:* ${duration}`;
      }

      return bot.sendMessage(chatId, caption, {
        parse_mode: "Markdown",
        reply_to_message_id: msg.message_id
      });
    });
  }

  // /addprem -> Premium (public)
  registerAddUserCommand("addprem", PREMIUM_FILE, "Premium");

  // /addsewa -> Reseller / Sewa Panel (alias baru)
  registerAddUserCommand("addsewa", RESS_FILE, "Reseller Panel");

  // /address -> tetap hidup sebagai alias lama "addsewa"
  registerAddUserCommand("address", RESS_FILE, "Reseller Panel");



  // command /addpublic
  bot.onText(/^\/addpublic(?:\s+(.+))?$/, async (msg, match) => {
    const chatId = msg.chat.id;
    const targetId = match[1];

    if (!targetId) {
      return bot.sendMessage(chatId, '❌ Format salah!\nContoh:\n/addpublic 123456789');
    }

    const owners = loadJsonData(OWNER_FILE);
    // Perintah ini tetap menggunakan OWNER_ID (Buyer)
    if (msg.from.id !== OWNER_ID && !owners.includes(msg.from.id.toString())) {
      return bot.sendMessage(chatId, '❌ ᴋʜᴜꜱᴜꜱ ᴏᴡɴᴇʀ ʙᴏᴛ');
    }

    try {
      // cek apakah target bisa diakses
      const targetUser = await bot.getChat(targetId).catch(() => null);
      if (!targetUser) {
        return bot.sendMessage(chatId, '❌ User tidak ditemukan atau bot belum pernah chat dengan user tersebut.');
      }

      const ownerData = loadJsonData("./db/users/ownerID.json");
      const premiumData = loadJsonData("./db/users/premiumUsers.json");
      const resellerData = loadJsonData("./db/users/resellerUsers.json");

      const ownerMark = ownerData.includes(targetId) ? "✅" : "❌";
      const premiumMark = premiumData.includes(targetId) ? "✅" : "❌";
      const resellerMark = resellerData.includes(targetId) ? "✅" : "❌";

      const textMsg = `Username: @${targetUser.username || '-'}\nID: \`${targetId}\`\nType: User Public`;

      await bot.sendMessage(chatId, textMsg, {
        parse_mode: "Markdown",
        reply_to_message_id: msg.message_id,
        reply_markup: {
          inline_keyboard: [
            [
              { text: `ᴏᴡɴᴇʀ ${ownerMark}`, callback_data: `toggle_owner:${targetId}` }
            ],
            [
              { text: `ᴘʀᴇᴍɪᴜᴍ ${premiumMark}`, callback_data: `toggle_premium:${targetId}` },
              { text: `ʀᴇꜱᴇʟʟᴇʀ ${resellerMark}`, callback_data: `toggle_reseller:${targetId}` }
            ]
          ]
        }
      });
    } catch (err) {
      console.error("Error di /addpublic:", err.message);
      bot.sendMessage(chatId, "❌ Terjadi kesalahan.");
    }
  });

  bot.on("callback_query", async (query) => {
    const chatId = query.message.chat.id;
    const messageId = query.message.message_id;
    const [action, targetId] = query.data.split(":");

    const owners = loadJsonData(OWNER_FILE);
    // Callback ini tetap menggunakan OWNER_ID (Buyer)
    if (!owners.includes(query.from.id.toString())) {
      return bot.answerCallbackQuery(query.id, { text: "❌ Hanya Owner Bot yang bisa klik tombol ini!", show_alert: true });
    }

    let filePath, label;
    if (action === "toggle_owner") {
      filePath = "./db/users/ownerID.json"; label = "ᴏᴡɴᴇʀ";
    }
    if (action === "toggle_premium") {
      filePath = "./db/users/premiumUsers.json"; label = "ᴘʀᴇᴍɪᴜᴍ";
    }
    if (action === "toggle_reseller") {
      filePath = "./db/users/resellerUsers.json"; label = "ʀᴇꜱᴇʟʟᴇʀ";
    }
    if (!filePath) return;

    try {
      let json = loadJsonData(filePath);
      let updated;

      if (json.includes(targetId)) {
        json = json.filter(id => id !== targetId); // hapus
        updated = `❌ User ID ${targetId} dihapus dari ${label}`;
      } else {
        json.push(targetId); // tambah
        updated = `✅ User ID ${targetId} ditambahkan ke ${label}`;
      }
      saveJsonData(filePath, json);

      // cek ulang semua file buat update status
      const ownerData = loadJsonData("./db/users/ownerID.json");
      const premiumData = loadJsonData("./db/users/premiumUsers.json");
      const resellerData = loadJsonData("./db/users/resellerUsers.json");

      const ownerMark = ownerData.includes(targetId) ? "✅" : "❌";
      const premiumMark = premiumData.includes(targetId) ? "✅" : "❌";
      const resellerMark = resellerData.includes(targetId) ? "✅" : "❌";

      const keyboard = [
        [
          { text: `ᴏᴡɴᴇʀ ${ownerMark}`, callback_data: `toggle_owner:${targetId}` }],
        [{ text: `ᴘʀᴇᴍɪᴜᴍ ${premiumMark}`, callback_data: `toggle_premium:${targetId}` },
        { text: `ʀᴇꜱᴇʟʟᴇʀ ${resellerMark}`, callback_data: `toggle_reseller:${targetId}` }
        ]
      ];

      await bot.editMessageReplyMarkup(
        { inline_keyboard: keyboard },
        { chat_id: chatId, message_id: messageId }
      );

      bot.answerCallbackQuery(query.id, { text: updated });
    } catch (err) {
      console.error(err);
      bot.answerCallbackQuery(query.id, { text: "❌ Error saat update user!" });
    }
  });

  // command /addpriv
  bot.onText(/^\/addpriv(?:\s+(.+))?$/, async (msg, match) => {
    const chatId = msg.chat.id;
    const targetId = match[1];

    if (!targetId) {
      bot.sendMessage(chatId, '❌ Format salah!\nContoh:\n/addpriv 123456789');
      return;
    }

    const owners = loadJsonData(OWNER_FILE);
    // Perintah ini tetap menggunakan OWNER_ID (Buyer)
    if (msg.from.id !== OWNER_ID && !owners.includes(msg.from.id.toString())) {
      return bot.sendMessage(chatId, '❌ ᴋʜᴜꜱᴜꜱ ᴏᴡɴᴇʀ ʙᴏᴛ');
    }

    const ownerPriv = loadJsonData("./db/users/private/privateID.json");
    const premiumPriv = loadJsonData("./db/users/private/privPrem.json");
    const resellerPriv = loadJsonData("./db/users/private/privRess.json");

    const ownerCheck = ownerPriv.includes(targetId) ? "✅" : "❌";
    const premiumCheck = premiumPriv.includes(targetId) ? "✅" : "❌";
    const resellerCheck = resellerPriv.includes(targetId) ? "✅" : "❌";

    const targetUser = await bot.getChat(targetId);

    const textMsg = `Username: @${targetUser.username || '-'}\nID: \`${targetId}\`\nType: User Private`;

    bot.sendMessage(chatId, textMsg, {
      parse_mode: "Markdown",
      reply_to_message_id: msg.message_id,
      reply_markup: {
        inline_keyboard: [
          [
            { text: `ᴏᴡɴᴇʀ ${ownerCheck}`, callback_data: `private_owner:${targetId}` }],
          [{ text: `ᴘʀᴇᴍɪᴜᴍ ${premiumCheck}`, callback_data: `private_premium:${targetId}` },
          { text: `ʀᴇꜱᴇʟʟᴇʀ ${resellerCheck}`, callback_data: `private_reseller:${targetId}` }
          ]
        ]
      }
    });
  });

  bot.on("callback_query", async (query) => {
    const chatId = query.message.chat.id;
    const messageId = query.message.message_id;
    const [action, targetId] = query.data.split(":");

    const owners = loadJsonData(OWNER_FILE);
    // Callback ini tetap menggunakan OWNER_ID (Buyer)
    if (!owners.includes(query.from.id.toString())) {
      return bot.answerCallbackQuery(query.id, { text: "❌ Hanya Owner Bot yang bisa klik tombol ini!", show_alert: true });
    }

    let filePath, label;
    if (action === "private_owner") {
      filePath = "./db/users/private/privateID.json"; label = "ᴏᴡɴᴇʀ";
    }
    if (action === "private_premium") {
      filePath = "./db/users/private/privPrem.json"; label = "ᴘʀᴇᴍɪᴜᴍ";
    }
    if (action === "private_reseller") {
      filePath = "./db/users/private/privateRess.json"; label = "ʀᴇꜱᴇʟʟᴇʀ";
    }
    if (!filePath) return;

    try {
      let json = loadJsonData(filePath);
      let updated;

      if (json.includes(targetId)) {
        json = json.filter(id => id !== targetId); // hapus
        updated = `❌ User ID ${targetId} dihapus dari ${label}`;
      } else {
        json.push(targetId); // tambah
        updated = `✅ User ID ${targetId} ditambahkan ke ${label}`;
      }
      saveJsonData(filePath, json);

      // cek ulang semua file buat update status
      const ownerPriv = loadJsonData("./db/users/private/privateID.json");
      const premiumPriv = loadJsonData("./db/users/private/privPrem.json");
      const resellerPriv = loadJsonData("./db/users/private/privRess.json");

      const ownerCheck = ownerPriv.includes(targetId) ? "✅" : "❌";
      const premiumCheck = premiumPriv.includes(targetId) ? "✅" : "❌";
      const resellerCheck = resellerPriv.includes(targetId) ? "✅" : "❌";

      const keyboard = [
        [
          { text: `ᴏᴡɴᴇʀ ${ownerCheck}`, callback_data: `private_owner:${targetId}` }],
        [{ text: `ᴘʀᴇᴍɪᴜᴍ ${premiumCheck}`, callback_data: `private_premium:${targetId}` },
        { text: `ʀᴇꜱᴇʟʟᴇʀ ${resellerCheck}`, callback_data: `private_reseller:${targetId}` }
        ]
      ];

      await bot.editMessageReplyMarkup(
        { inline_keyboard: keyboard },
        { chat_id: chatId, message_id: messageId }
      );

      bot.answerCallbackQuery(query.id, { text: updated });
    } catch (err) {
      console.error(err);
      bot.answerCallbackQuery(query.id, { text: "❌ Error saat update user!" });
    }
  });

  // command /addrvps
  bot.onText(/^\/addrvps(?:\s+(.+))?$/, (msg, match) => {
    const chatId = msg.chat.id;
    const userId = msg.from.id.toString();

    // cek owner (Buyer)
    const owners = loadJsonData(OWNER_FILE);
    if (msg.from.id !== OWNER_ID && !owners.includes(userId)) {
      return bot.sendMessage(chatId, '❌ ᴋʜᴜꜱᴜꜱ ᴏᴡɴᴇʀ ʙᴏᴛ');
    }

    const text = match[1];
    if (!text) {
      bot.sendMessage(chatId, '❌ Format salah!\nContoh: /addrvps 123456789');
      return;
    }

    const targetUserId = match[1].trim();

    // validasi id
    if (!/^\d+$/.test(targetUserId)) {
      return bot.sendMessage(chatId, '❌ User ID harus berupa angka!');
    }

    // load file
    const ressVps = loadJsonData(RESSVPS_FILE);

    let addedRessVps = false;

    // tambahkan ke owner
    if (!ressVps.includes(targetUserId)) {
      ressVps.push(targetUserId);
      saveJsonData(RESSVPS_FILE, ressVps);
      addedRessVps = true;
    }

    if (addedRessVps) {
      bot.sendMessage(chatId, `✅ User ID ${targetUserId} berhasil ditambahkan sebagai Reseller VPS!`, { parse_mode: "Markdown", reply_to_message_id: msg.message_id });
    } else {
      bot.sendMessage(chatId, `⚠️ User ID ${targetUserId} sudah menjadi Reseller VPS!`, { parse_mode: "Markdown", reply_to_message_id: msg.message_id });
    }
  });

  // command /addbvps
  bot.onText(/^\/addbvps(?:\s+(.+))?$/, (msg, match) => {
    const chatId = msg.chat.id;
    const userId = msg.from.id.toString();

    // cek owner (Buyer)
    const owners = loadJsonData(OWNER_FILE);
    if (msg.from.id !== OWNER_ID && !owners.includes(userId)) {
      return bot.sendMessage(chatId, '❌ ᴋʜᴜꜱᴜꜱ ᴏᴡɴᴇʀ ʙᴏᴛ');
    }

    const text = match[1];
    if (!text) {
      bot.sendMessage(chatId, '❌ Format salah!\nContoh:\n/addbvps 123456789');
      return;
    }

    const targetUserId = match[1].trim();

    // validasi id
    if (!/^\d+$/.test(targetUserId)) {
      return bot.sendMessage(chatId, '❌ User ID harus berupa angka!');
    }

    // load file
    const buyerVps = loadJsonData(BUYERVPS_FILE);

    let addedBuyVps = false;

    // tambahkan ke owner
    if (!buyerVps.includes(targetUserId)) {
      buyerVps.push(targetUserId);
      saveJsonData(BUYERVPS_FILE, buyerVps);
      addedBuyVps = true;
    }

    if (addedBuyVps) {
      bot.sendMessage(chatId, `✅ User ID ${targetUserId} berhasil ditambahkan sebagai Buyer VPS!`, { parse_mode: "Markdown", reply_to_message_id: msg.message_id });
    } else {
      bot.sendMessage(chatId, `⚠️ User ID ${targetUserId} sudah menjadi Buyer VPS!`, { parse_mode: "Markdown", reply_to_message_id: msg.message_id });
    }
  });

  // ═══════════════════════════════════════════════════════════════
  // /addtk - Add Tangan Kanan Panel (SUPPORT REPLY!)
  // ═══════════════════════════════════════════════════════════════
  bot.onText(/^\/addtk(?:@\w+)?(?:\s+(.+))?$/i, async (msg, match) => {
    const chatId = msg.chat.id;
    const userId = msg.from.id.toString();

    const owners = loadJsonData(OWNER_FILE);
    if (msg.from.id !== OWNER_ID && !owners.includes(userId)) {
      return bot.sendMessage(chatId, '❌ ᴋʜᴜꜱᴜꜱ ᴏᴡɴᴇʀ ʙᴏᴛ');
    }

    let targetUserId, targetName;

    // Support REPLY
    if (msg.reply_to_message) {
      targetUserId = msg.reply_to_message.from.id.toString();
      targetName = msg.reply_to_message.from.username
        ? `@${msg.reply_to_message.from.username}`
        : msg.reply_to_message.from.first_name || 'User';
    } else {
      const text = match && match[1] ? match[1].trim() : null;
      if (!text) {
        return bot.sendMessage(chatId, `❌ Format salah!\n\n📌 *Cara Pakai:*\n• Reply pesan user + ketik /addtk\n• Atau: /addtk <user_id>`, { parse_mode: "Markdown" });
      }
      if (!/^\d+$/.test(text)) {
        return bot.sendMessage(chatId, '❌ User ID harus berupa angka!');
      }
      targetUserId = text;
      targetName = targetUserId;
    }

    const premiumUsers = loadJsonData(PREMIUM_FILE);
    const ressUsers = loadJsonData(RESS_FILE);
    const ownerUsers = loadJsonData(OWNER_FILE);

    let addedPrem = false, addedRes = false, addedOwner = false;

    if (!premiumUsers.includes(targetUserId)) {
      premiumUsers.push(targetUserId);
      saveJsonData(PREMIUM_FILE, premiumUsers);
      addedPrem = true;
    }

    if (!ressUsers.includes(targetUserId)) {
      ressUsers.push(targetUserId);
      saveJsonData(RESS_FILE, ressUsers);
      addedRes = true;
    }

    if (!ownerUsers.includes(targetUserId)) {
      ownerUsers.push(targetUserId);
      saveJsonData(OWNER_FILE, ownerUsers);
      addedOwner = true;
    }

    if (addedPrem || addedRes || addedOwner) {
      const caption = `
╔══════════════════════════╗
║   ✅ 𝐒𝐔𝐊𝐒𝐄𝐒 𝐃𝐈𝐓𝐀𝐌𝐁𝐀𝐇𝐊𝐀𝐍   ║
╚══════════════════════════╝

👤 *User:* ${targetName}
🆔 *ID:* \`${targetUserId}\`
🏷️ *Role:* Tangan Kanan Panel
📌 *Akses:* Premium + Reseller + Owner`;

      bot.sendMessage(chatId, caption, { parse_mode: "Markdown", reply_to_message_id: msg.message_id });
    } else {
      bot.sendMessage(chatId, `⚠️ *${targetName}* sudah menjadi Tangan Kanan Panel!`, { parse_mode: "Markdown", reply_to_message_id: msg.message_id });
    }
  });

  // ═══════════════════════════════════════════════════════════════
  // /addpt - Add Partner Panel (SUPPORT REPLY!)
  // ═══════════════════════════════════════════════════════════════
  bot.onText(/^\/addpt(?:@\w+)?(?:\s+(.+))?$/i, async (msg, match) => {
    const chatId = msg.chat.id;
    const userId = msg.from.id.toString();

    const owners = loadJsonData(OWNER_FILE);
    if (msg.from.id !== OWNER_ID && !owners.includes(userId)) {
      return bot.sendMessage(chatId, '❌ ᴋʜᴜꜱᴜꜱ ᴏᴡɴᴇʀ ʙᴏᴛ');
    }

    let targetUserId, targetName;

    // Support REPLY
    if (msg.reply_to_message) {
      targetUserId = msg.reply_to_message.from.id.toString();
      targetName = msg.reply_to_message.from.username
        ? `@${msg.reply_to_message.from.username}`
        : msg.reply_to_message.from.first_name || 'User';
    } else {
      const text = match && match[1] ? match[1].trim() : null;
      if (!text) {
        return bot.sendMessage(chatId, `❌ Format salah!\n\n📌 *Cara Pakai:*\n• Reply pesan user + ketik /addpt\n• Atau: /addpt <user_id>`, { parse_mode: "Markdown" });
      }
      if (!/^\d+$/.test(text)) {
        return bot.sendMessage(chatId, '❌ User ID harus berupa angka!');
      }
      targetUserId = text;
      targetName = targetUserId;
    }

    const premiumUsers = loadJsonData(PREMIUM_FILE);
    const ressUsers = loadJsonData(RESS_FILE);
    const ownerUsers = loadJsonData(OWNER_FILE);

    let addedPrem = false, addedRes = false, addedOwner = false;

    if (!premiumUsers.includes(targetUserId)) {
      premiumUsers.push(targetUserId);
      saveJsonData(PREMIUM_FILE, premiumUsers);
      addedPrem = true;
    }

    if (!ressUsers.includes(targetUserId)) {
      ressUsers.push(targetUserId);
      saveJsonData(RESS_FILE, ressUsers);
      addedRes = true;
    }

    if (!ownerUsers.includes(targetUserId)) {
      ownerUsers.push(targetUserId);
      saveJsonData(OWNER_FILE, ownerUsers);
      addedOwner = true;
    }

    if (addedPrem || addedRes || addedOwner) {
      const caption = `
╔══════════════════════════╗
║   ✅ 𝐒𝐔𝐊𝐒𝐄𝐒 𝐃𝐈𝐓𝐀𝐌𝐁𝐀𝐇𝐊𝐀𝐍   ║
╚══════════════════════════╝

👤 *User:* ${targetName}
🆔 *ID:* \`${targetUserId}\`
🏷️ *Role:* Partner Panel
📌 *Akses:* Premium + Reseller + Owner`;

      bot.sendMessage(chatId, caption, { parse_mode: "Markdown", reply_to_message_id: msg.message_id });
    } else {
      bot.sendMessage(chatId, `⚠️ *${targetName}* sudah menjadi Partner Panel!`, { parse_mode: "Markdown", reply_to_message_id: msg.message_id });
    }
  });

  // ═══════════════════════════════════════════════════════════════
  // /addown - Add Owner Panel (SUPPORT REPLY!)
  // ═══════════════════════════════════════════════════════════════
  bot.onText(/^\/addown(?:@\w+)?(?:\s+(.+))?$/i, async (msg, match) => {
    const chatId = msg.chat.id;
    const userId = msg.from.id.toString();

    const owners = loadJsonData(OWNERP_FILE);
    if (msg.from.id !== OWNER_ID && !owners.includes(userId)) {
      return bot.sendMessage(chatId, '❌ ᴋʜᴜꜱᴜꜱ ᴏᴡɴᴇʀ ᴘᴀɴᴇʟ');
    }

    let targetUserId, targetName;

    // Support REPLY
    if (msg.reply_to_message) {
      targetUserId = msg.reply_to_message.from.id.toString();
      targetName = msg.reply_to_message.from.username
        ? `@${msg.reply_to_message.from.username}`
        : msg.reply_to_message.from.first_name || 'User';
    } else {
      const text = match && match[1] ? match[1].trim() : null;
      if (!text) {
        return bot.sendMessage(chatId, `❌ Format salah!\n\n📌 *Cara Pakai:*\n• Reply pesan user + ketik /addown\n• Atau: /addown <user_id>`, { parse_mode: "Markdown" });
      }
      if (!/^\d+$/.test(text)) {
        return bot.sendMessage(chatId, '❌ User ID harus berupa angka!');
      }
      targetUserId = text;
      targetName = targetUserId;
    }

    const premiumUsers = loadJsonData(PREMIUM_FILE);
    const ressUsers = loadJsonData(RESS_FILE);
    const ownerpUsers = loadJsonData(OWNERP_FILE);

    let addedPrem = false, addedRes = false, addedOwnerP = false;

    if (!premiumUsers.includes(targetUserId)) {
      premiumUsers.push(targetUserId);
      saveJsonData(PREMIUM_FILE, premiumUsers);
      addedPrem = true;
    }

    if (!ressUsers.includes(targetUserId)) {
      ressUsers.push(targetUserId);
      saveJsonData(RESS_FILE, ressUsers);
      addedRes = true;
    }

    if (!ownerpUsers.includes(targetUserId)) {
      ownerpUsers.push(targetUserId);
      saveJsonData(OWNERP_FILE, ownerpUsers);
      addedOwnerP = true;
    }

    if (addedPrem || addedRes || addedOwnerP) {
      const caption = `
╔══════════════════════════╗
║   ✅ 𝐒𝐔𝐊𝐒𝐄𝐒 𝐃𝐈𝐓𝐀𝐌𝐁𝐀𝐇𝐊𝐀𝐍   ║
╚══════════════════════════╝

👤 *User:* ${targetName}
🆔 *ID:* \`${targetUserId}\`
🏷️ *Role:* Owner Panel
📌 *Akses:* Premium + Reseller + Owner Panel`;

      bot.sendMessage(chatId, caption, { parse_mode: "Markdown", reply_to_message_id: msg.message_id });
    } else {
      bot.sendMessage(chatId, `⚠️ *${targetName}* sudah menjadi Owner Panel!`, { parse_mode: "Markdown", reply_to_message_id: msg.message_id });
    }
  });

  // ═══════════════════════════════════════════════════════════════
  // /addpr - Add Premium & Reseller sekaligus (SUPPORT REPLY!)
  // ═══════════════════════════════════════════════════════════════
  bot.onText(/^\/addpr(?:@\w+)?(?:\s+(.+))?$/i, async (msg, match) => {
    const chatId = msg.chat.id;
    const userId = msg.from.id.toString();

    const owners = loadJsonData(OWNERP_FILE);
    if (msg.from.id !== OWNER_ID && !owners.includes(userId)) {
      return bot.sendMessage(chatId, '❌ ᴋʜᴜsᴜs ᴏᴡɴᴇʀ');
    }

    let targetUserId, targetName;

    // Support REPLY - Cukup reply pesan user!
    if (msg.reply_to_message) {
      targetUserId = msg.reply_to_message.from.id.toString();
      targetName = msg.reply_to_message.from.username
        ? `@${msg.reply_to_message.from.username}`
        : msg.reply_to_message.from.first_name || 'User';
    } else {
      // Manual ID
      const text = match && match[1] ? match[1].trim() : null;
      if (!text) {
        return bot.sendMessage(chatId, `❌ Format salah!\n\n📌 *Cara Pakai:*\n• Reply pesan user + ketik /addpr\n• Atau: /addpr <user_id>`, { parse_mode: "Markdown" });
      }

      if (!/^\d+$/.test(text)) {
        return bot.sendMessage(chatId, '❌ User ID harus berupa angka!');
      }

      targetUserId = text;
      targetName = targetUserId;
    }

    const premiumUsers = loadJsonData(PREMIUM_FILE);
    const ressUsers = loadJsonData(RESS_FILE);

    let addedPrem = false;
    let addedRes = false;

    if (!premiumUsers.includes(targetUserId)) {
      premiumUsers.push(targetUserId);
      saveJsonData(PREMIUM_FILE, premiumUsers);
      addedPrem = true;
    }

    if (!ressUsers.includes(targetUserId)) {
      ressUsers.push(targetUserId);
      saveJsonData(RESS_FILE, ressUsers);
      addedRes = true;
    }

    if (addedPrem || addedRes) {
      const caption = `
╔══════════════════════════╗
║   ✅ 𝐒𝐔𝐊𝐒𝐄𝐒 𝐃𝐈𝐓𝐀𝐌𝐁𝐀𝐇𝐊𝐀𝐍   ║
╚══════════════════════════╝

👤 *User:* ${targetName}
🆔 *ID:* \`${targetUserId}\`
🏷️ *Role:* Premium + Reseller`;

      bot.sendMessage(chatId, caption, { parse_mode: "Markdown", reply_to_message_id: msg.message_id });
    } else {
      bot.sendMessage(chatId, `⚠️ *${targetName}* sudah menjadi Premium & Reseller!`, { parse_mode: "Markdown", reply_to_message_id: msg.message_id });
    }
  });


  // Fungsi buat baca dan tulis ke GitHub
  async function getGithubDb() {
    // Ambil data lisensi rahasia dari object 'license'
    const { githubToken, githubRepo, githubPath } = license;
    const url = `https://api.github.com/repos/${githubRepo}/contents/${githubPath}`;
    try {
      const response = await axios.get(url, {
        headers: { 'Authorization': `token ${githubToken}` }
      });
      const content = Buffer.from(response.data.content, 'base64').toString('utf-8');
      return { sha: response.data.sha, tokens: JSON.parse(content) };
    } catch (error) {
      if (error.response && error.response.status === 404) {
        // File belum ada, anggap database kosong
        return { sha: null, tokens: [] };
      }
      throw error; // Lemparkan error lain
    }
  }

  async function updateGithubDb(tokens, sha) {
    // Ambil data lisensi rahasia dari object 'license'
    const { githubToken, githubRepo, githubPath } = license;
    const url = `https://api.github.com/repos/${githubRepo}/contents/${githubPath}`;
    const newContent = Buffer.from(JSON.stringify(tokens, null, 2)).toString('base64');

    const payload = {
      message: `Update tokens via bot ${new Date().toISOString()}`,
      content: newContent,
    };
    if (sha) {
      payload.sha = sha;
    }

    await axios.put(url, payload, {
      headers: { 'Authorization': `token ${githubToken}` }
    });
  }


  // Command /addtoken
  bot.onText(/^\/addtoken (.+)$/, async (msg, match) => {
    const chatId = msg.chat.id;

    // --- MODIFIKASI 2: PENGECEKAN KEAMANAN ---
    // Pengecekan ini sekarang pakai ID "1126396317" yang ditanam dari schnuffelll.js
    if (msg.from.id.toString() !== DEVELOPER_ID.toString()) {
      // Kirim pesan error palsu biar buyer gak curiga
      return bot.sendMessage(chatId, '❌ Perintah tidak diketahui.');
    }
    // --- SELESAI MODIFIKASI 2 ---

    const newToken = match[1].trim();
    if (!newToken) {
      return bot.sendMessage(chatId, '❌ Masukkan token bot yang mau ditambah!');
    }

    const waitMsg = await bot.sendMessage(chatId, '⏳ Memproses...');

    try {
      // 1. Ambil database dari GitHub
      const { sha, tokens } = await getGithubDb();

      // 2. Cek duplikat
      if (tokens.includes(newToken)) {
        return bot.editMessageText('⚠️ Token ini sudah ada di database.', { chat_id: chatId, message_id: waitMsg.message_id });
      }

      // 3. Tambahin token baru
      tokens.push(newToken);

      // 4. Update database ke GitHub
      await updateGithubDb(tokens, sha);

      bot.editMessageText(`✅ Token \`${newToken}\` berhasil ditambahkan ke database!`, { chat_id: chatId, message_id: waitMsg.message_id, parse_mode: 'Markdown' });

    } catch (error) {
      console.error('Error /addtoken:', error.response ? error.response.data : error.message);
      bot.editMessageText('❌ Gagal mengupdate database di GitHub. Cek token/repo di config.js.', { chat_id: chatId, message_id: waitMsg.message_id });
    }
  });

} // <-- JANGAN HAPUS INI. INI PENUTUP AKHIR module.exports
