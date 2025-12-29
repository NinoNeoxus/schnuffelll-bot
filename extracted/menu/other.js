const axios = require("axios");
const { createHash, randomUUID } = require("crypto");
const fs = require("fs");
const fetch = require("node-fetch");
const FormData = require('form-data');
const os = require("os");
const path = require("path");

const settings = require("../config.js")
const { checkCooldown } = require('../lib/function');

// sebelum verifikasi ch, bot nya masukin ke channel tele tujuannya dulu

module.exports = (bot) => {

  // command /info - Bot & User Status
  bot.onText(/^\/info$/i, async (msg) => {
    const chatId = msg.chat.id;
    const userId = msg.from.id;
    const user = msg.from;

    const uptime = process.uptime();
    const hrs = Math.floor(uptime / 3600);
    const mins = Math.floor((uptime % 3600) / 60);

    const text = `
🤖 <b>BOT INFORMATION</b>
• <b>Bot Name:</b> ${settings.botName || 'Schnuffelll Bot'}
• <b>Version:</b> 8.0
• <b>Uptime:</b> ${hrs}h ${mins}m
• <b>Library:</b> node-telegram-bot-api

👤 <b>USER INFO</b>
• <b>Name:</b> ${user.first_name}
• <b>ID:</b> <code>${userId}</code>
• <b>Username:</b> @${user.username || '-'}
`;
    bot.sendMessage(chatId, text, { parse_mode: 'HTML' });
  });

  // cek status join channel
  const isMember = async (userId) => {
    try {
      const member = await bot.getChatMember(`${settings.chUsn}`, userId);
      return ['creator', 'administrator', 'member'].includes(member.status);
    } catch {
      return false;
    }
  };

  // kirim tombol verifikasi
  const sendJoinChannel = async (chatId) => {
    const opts = {
      reply_markup: {
        inline_keyboard: [
          [{ text: "✅ Sudah Join", callback_data: "verify_join_channel" }
          ]
        ]
      }
    };
    await bot.sendMessage(chatId, `❌ Kamu belum join channel\n${settings.chUsn}`, opts);
  };

  // callback tombol verifikasi
  bot.on('callback_query', async (callbackQuery) => {
    const msg = callbackQuery.message;
    const userId = callbackQuery.from.id;
    const chatId = msg.chat.id;

    if (callbackQuery.data === "verify_join_channel") {
      try {
        const joined = await isMember(userId);

        if (joined) {
          await bot.sendMessage(chatId, `✅ Kamu sudah join ${settings.chUsn}, silahkan gunakan command.`, { parse_mode: "Markdown", reply_to_message_id: msg.message_id });
        } else {
          await bot.sendMessage(chatId, `❌ Kamu belum join channel ${settings.chUsn}, silakan join dulu.`, { parse_mode: "Markdown" });
        }

        await bot.answerCallbackQuery(callbackQuery.id);
      } catch (err) {
        await bot.sendMessage(chatId, `❌ Gagal mengecek status join, coba lagi nanti.`);
        await bot.answerCallbackQuery(callbackQuery.id);
      }
    }
  });

  // command qc
  bot.onText(/^\/qc(?:\s+(.+))?$/, async (msg, match) => {
    const chatId = msg.chat.id;
    const text = match[1]
    const joined = await isMember(msg.from.id);

    if (!joined) {
      await sendJoinChannel(chatId);
      return;
    }

    if (!text) {
      return bot.sendMessage(chatId, "⚠️ Contoh: /qc teksnya");
    }

    const waktu = checkCooldown(msg.from.id);
    if (waktu > 0) return bot.sendMessage(chatId, `⏳ Tunggu ${waktu} detik sebelum bisa pakai command /qc lagi!`, { reply_to_message_id: msg.message_id });

    bot.sendMessage(chatId, '⏳', {
      reply_to_message_id: msg.message_id
    });

    let ppuser;
    try {
      const photos = await bot.getUserProfilePhotos(msg.from.id, { limit: 1 });
      if (photos.total_count > 0) {
        ppuser = await bot.getFileLink(photos.photos[0][0].file_id);
      } else {
        ppuser = "https://telegra.ph/file/a059a6a734ed202c879d3.jpg";
      }
    } catch (err) {
      ppuser = "https://telegra.ph/file/a059a6a734ed202c879d3.jpg";
    }

    const json = {
      type: "quote",
      format: "png",
      backgroundColor: "#000000",
      width: 812,
      height: 968,
      scale: 2,
      messages: [
        {
          entities: [],
          avatar: true,
          from: {
            id: 1,
            name: msg.from.first_name || "User",
            photo: { url: ppuser },
          },
          text: text,
          replyMessage: {},
        },
      ],
    };

    try {
      const res = await axios.post("https://bot.lyo.su/quote/generate", json, {
        headers: { "Content-Type": "application/json" },
      });

      const buffer = Buffer.from(res.data.result.image, "base64");
      const tempPath = path.join(__dirname, "qc_" + msg.from.id + ".webp");

      fs.writeFileSync(tempPath, buffer);

      await bot.sendSticker(chatId, tempPath, {
        reply_to_message_id: msg.message_id,
      });

      fs.unlinkSync(tempPath);
    } catch (err) {
      console.error(err);
      bot.sendMessage(chatId, "❌ Gagal membuat QC, coba lagi.");
    }
  });

  // command pin
  bot.onText(/^\/pin(?:\s+(.+))?$/, async (msg, match) => {
    const chatId = msg.chat.id;
    const query = match[1];

    if (!query) {
      return bot.sendMessage(chatId, "❌ Format salah!\nContoh:\n`/pin anime`", {
        parse_mode: "Markdown",
        reply_to_message_id: msg.message_id
      });
    }

    const url = `https://api.nekolabs.my.id/discovery/pinterest/search?q=${encodeURIComponent(query)}`;
    let wait;

    try {
      await bot.sendChatAction(chatId, "upload_photo");
      wait = await bot.sendMessage(chatId, "🔎", {
        reply_to_message_id: msg.message_id
      });

      const res = await fetch(url);
      if (!res.ok) throw new Error(`HTTP ${res.status}`);

      const data = await res.json();
      if (!data.success || !Array.isArray(data.result) || data.result.length === 0)
        throw new Error("Tidak ditemukan hasil.");

      const results = data.result.slice(0, 5);
      const index = 0;
      const item = results[index];

      const caption = item.caption || "(tidak ada deskripsi)";
      const author = item.author?.fullname || "Anonim";
      const followers = item.author?.followers ?? 0;
      const pinUrl = item.url || "https://www.pinterest.com";

      const inlineKeyboard = {
        inline_keyboard: [
          [
            { text: "⬅️", callback_data: `pin_prev|${chatId}|${index}` },
            { text: `${index + 1}/${results.length}`, callback_data: "noop" },
            { text: "➡️", callback_data: `pin_next|${chatId}|${index}` }
          ]
        ]
      };

      const sent = await bot.sendPhoto(chatId, item.imageUrl, {
        parse_mode: "Markdown",
        reply_markup: inlineKeyboard,
        reply_to_message_id: msg.message_id
      });

      await bot.deleteMessage(chatId, wait.message_id);

      // Simpan data hasil pencarian ke memori sementara
      global.pinData = global.pinData || {};
      global.pinData[sent.message_id] = { results, index };

    } catch (err) {
      console.error("❌ Error Pinterest:", err.message);
      const errMsg =
        err.message.includes("Tidak ditemukan")
          ? "❌ Tidak ada hasil ditemukan untuk pencarian itu."
          : err.message.includes("fetch")
            ? "🌐 Tidak bisa terhubung ke server Pinterest."
            : "⚠️ Terjadi kesalahan, coba lagi nanti.";

      if (wait) {
        try {
          await bot.editMessageText(errMsg, {
            chat_id: chatId,
            message_id: wait.message_id
          });
        } catch {
          await bot.sendMessage(chatId, errMsg, {
            reply_to_message_id: msg.message_id
          });
        }
      } else {
        await bot.sendMessage(chatId, errMsg, {
          reply_to_message_id: msg.message_id
        });
      }
    }
  });

  // Handler tombol navigasi
  bot.on("callback_query", async (q) => {
    try {
      if (!q.data.startsWith("pin_")) return;

      const [action, chatId, idxStr] = q.data.split("|");
      const messageId = q.message.message_id;

      const data = global.pinData?.[messageId];
      if (!data) return bot.answerCallbackQuery(q.id, { text: "⚠️ Data sudah kadaluarsa." });

      let index = parseInt(idxStr);
      if (action === "pin_next") index = (index + 1) % data.results.length;
      if (action === "pin_prev") index = (index - 1 + data.results.length) % data.results.length;

      const item = data.results[index];
      const caption = item.caption || "(tidak ada deskripsi)";
      const author = item.author?.fullname || "Anonim";
      const followers = item.author?.followers ?? 0;
      const pinUrl = item.url || "https://www.pinterest.com";

      const inlineKeyboard = {
        inline_keyboard: [
          [
            { text: "⬅️", callback_data: `pin_prev|${chatId}|${index}` },
            { text: `${index + 1}/${data.results.length}`, callback_data: "noop" },
            { text: "➡️", callback_data: `pin_next|${chatId}|${index}` }
          ]
        ]
      };

      await bot.editMessageMedia(
        {
          type: "photo",
          media: item.imageUrl,
          parse_mode: "Markdown"
        },
        {
          chat_id: chatId,
          message_id: messageId,
          reply_markup: inlineKeyboard
        }
      );

      data.index = index;
      bot.answerCallbackQuery(q.id);
    } catch (err) {
      console.error("❌ Callback Error:", err.message);
      bot.answerCallbackQuery(q.id, { text: "⚠️ Gagal memuat gambar." });
    }
  });

  // command spotify
  bot.onText(/^\/spotify (.+)/, async (msg, match) => {
    const chatId = msg.chat.id;
    const query = match[1];

    let wait;
    try {
      // Pesan tunggu
      wait = await bot.sendMessage(chatId, "⏳", {
        reply_to_message_id: msg.message_id
      });

      // Fetch dari API
      const apiUrl = `https://api.nekolabs.my.id/downloader/spotify/play/v1?q=${encodeURIComponent(query)}`;
      const res = await fetch(apiUrl);
      const data = await res.json();

      if (!data.success || !data.result?.downloadUrl) {
        return bot.editMessageText("❌ Lagu tidak ditemukan atau link tidak valid!", {
          chat_id: chatId,
          message_id: wait.message_id
        });
      }

      const info = data.result.metadata;
      const audioUrl = data.result.downloadUrl;

      if (!audioUrl.startsWith("http")) {
        return bot.editMessageText("⚠️ URL audio tidak valid, coba judul lain!", {
          chat_id: chatId,
          message_id: wait.message_id
        });
      }

      // Buat folder download kalau belum ada
      const downloadDir = path.join(process.cwd(), "downloads");
      if (!fs.existsSync(downloadDir)) fs.mkdirSync(downloadDir);

      // Nama file
      const fileName = `${info.title.replace(/[\/\\:*?"<>|]/g, "_")}.mp3`;
      const filePath = path.join(downloadDir, fileName);

      // Download audio dan simpan ke file lokal
      const fileRes = await fetch(audioUrl);
      if (!fileRes.ok) throw new Error("Gagal mengunduh audio");
      const buffer = Buffer.from(await fileRes.arrayBuffer());
      fs.writeFileSync(filePath, buffer);

      // Kirim ke user
      await bot.sendAudio(chatId, fs.createReadStream(filePath), {
        title: info.title,
        performer: info.artist,
        thumb: info.cover,
        caption: `🎵 *${info.title}* - ${info.artist}\n🕒 ${info.duration}\n🔗 [Spotify Link](${info.url})`,
        parse_mode: "Markdown",
        reply_to_message_id: msg.message_id
      });

      // Hapus file setelah dikirim
      fs.unlinkSync(filePath);

      await bot.deleteMessage(chatId, wait.message_id);
    } catch (err) {
      console.error("Error Spotify:", err);
      const errMsg = err.message.includes("fetch")
        ? "🌐 Gagal terhubung ke server Spotify."
        : "⚠️ Terjadi kesalahan saat memutar lagu.";

      if (wait) {
        await bot.editMessageText(errMsg, {
          chat_id: chatId,
          message_id: wait.message_id
        });
      } else {
        await bot.sendMessage(chatId, errMsg, {
          reply_to_message_id: msg.message_id
        });
      }
    }
  });

  // command ai
  const aiSessions = new Set();

  bot.onText(/^\/ai$/, async (msg) => {
    const chatId = msg.chat.id;

    try {
      if (aiSessions.has(chatId)) {
        return bot.sendMessage(chatId, "Mode AI sudah aktif!\nKetik /stopai untuk keluar.");
      }

      aiSessions.add(chatId);
      await bot.sendMessage(chatId, "🧠 Mode AI aktif.\nKetik /stopai untuk keluar.");
    } catch (err) {
      console.error("❌ Error saat mengaktifkan mode AI:", err);
      bot.sendMessage(chatId, "⚠️ Terjadi kesalahan saat mengaktifkan mode AI.");
    }
  });

  bot.onText(/^\/stopai$/, async (msg) => {
    const chatId = msg.chat.id;

    try {
      if (!aiSessions.has(chatId)) {
        return bot.sendMessage(chatId, "Mode AI belum aktif.");
      }

      aiSessions.delete(chatId);
      await bot.sendMessage(chatId, "Mode AI dimatikan.");
    } catch (err) {
      console.error("❌ Error saat menonaktifkan mode AI:", err);
      bot.sendMessage(chatId, "⚠️ Gagal mematikan mode AI.");
    }
  });

  bot.on("message", async (msg) => {
    const chatId = msg.chat.id;
    const text = msg.text;

    if (!text || text.startsWith("/")) return;
    if (!aiSessions.has(chatId)) return;

    const url = `https://api.nekolabs.my.id/ai/gpt/4o?text=${encodeURIComponent(text)}&systemPrompt=asistant`;
    let wait;

    try {
      wait = await bot.sendMessage(chatId, "💬", {
        reply_to_message_id: msg.message_id
      });

      const res = await fetch(url, { timeout: 15000 });
      if (!res.ok) throw new Error(`HTTP ${res.status}`);

      const data = await res.json();
      if (!data || !data.result) throw new Error("Respon API tidak valid.");

      await bot.editMessageText(data.result, {
        chat_id: chatId,
        message_id: wait.message_id
      });
    } catch (err) {
      console.error("❌ Error AI:", err);

      const errorMsg =
        err.name === "AbortError"
          ? "⏰ Waktu permintaan habis, coba lagi nanti."
          : err.message.includes("fetch")
            ? "🌐 Tidak bisa terhubung ke server."
            : "⚠️ Terjadi kesalahan saat memproses pesanmu.";

      if (wait) {
        try {
          await bot.editMessageText(errorMsg, {
            chat_id: chatId,
            message_id: wait.message_id
          });
        } catch {
          await bot.sendMessage(chatId, errorMsg);
        }
      } else {
        await bot.sendMessage(chatId, errorMsg);
      }
    }
  });

  // command stalkig  
  bot.onText(/^\/stalkig(?:\s+(.+))?/, async (msg, match) => {
    const chatId = msg.chat.id;
    const username = match[1];

    if (!username) {
      return bot.sendMessage(chatId, "⚠️ Masukkan username IG!\nContoh: /stalkig google");
    }

    const waktu = checkCooldown(msg.from.id);
    if (waktu > 0) return bot.sendMessage(chatId, `⏳ Tunggu ${waktu} detik sebelum bisa pakai command /stalkig lagi!`, { reply_to_message_id: msg.message_id });

    bot.sendMessage(chatId, '⏳', {
      reply_to_message_id: msg.message_id
    });

    try {
      const apiUrl = `https://api.siputzx.my.id/api/stalk/instagram?username=${encodeURIComponent(username)}`;
      const res = await fetch(apiUrl);
      const json = await res.json();

      if (!json.status) {
        return bot.sendMessage(chatId, "❌ User tidak ditemukan!");
      }

      const data = json.data;

      let caption = `✦ Instagram Stalker ✦

⤷ ɴᴀᴍᴀ: ${data.full_name || "Kosong"}
⤷ ᴜꜱᴇʀɴᴀᴍᴇ: ${data.username}
⤷ ʙɪᴏ: ${data.biography || "Kosong"}
⤷ ʟɪɴᴋ: ${data.external_url || "Kosong"}
⤷ ᴠᴇʀɪꜰɪᴇᴅ: ${data.is_verified ? "Yes" : "No"}
⤷ ᴘʀɪᴠᴀᴛᴇ: ${data.is_private ? "Yes" : "No"}
⤷ ꜰᴏʟʟᴏᴡᴇʀꜱ: ${data.followers_count}
⤷ ꜰᴏʟʟᴏᴡɪɴɢ: ${data.following_count}
⤷ ᴘᴏꜱᴛꜱ: ${data.posts_count}

✦ ᴘᴏꜱᴛɪɴɢᴀɴ ᴛᴇʀʙᴀʀᴜ ✦
${data.posts.length ? data.posts[0].caption : "-"}
`;

      bot.sendPhoto(chatId, data.profile_pic_url_hd || data.profile_pic_url, {
        caption,
        parse_mode: "Markdown"
      });
    } catch (err) {
      console.error(err);
      bot.sendMessage(chatId, "❌ Gagal mengambil data user IG.");
    }
  });

  // command /stalkroblox
  bot.onText(/^\/stalkroblox (.+)/, async (msg, match) => {
    const chatId = msg.chat.id;
    const username = match[1];

    bot.sendMessage(chatId, '⏳', {
      reply_to_message_id: msg.message_id
    });

    try {
      const res = await axios.get(`https://api.siputzx.my.id/api/stalk/roblox?user=${encodeURIComponent(username)}`);
      const data = res.data;

      if (!data.status) {
        return bot.sendMessage(chatId, `❌ User *${username}* tidak ditemukan`, { parse_mode: "Markdown" });
      }

      const info = data.data;
      const basic = info.basic;
      const avatar = info.avatar?.fullBody?.data?.[0]?.imageUrl;
      const followers = info.social?.followers?.count || 0;
      const following = info.social?.following?.count || 0;
      const friends = info.social?.friends?.count || 0;
      const groups = info.groups?.list?.data?.length || 0;

      let caption = `
╭───❖ *Roblox Stalker*
│ 👤 *Username:* ${basic.name}
│ 🏷️ *Display:* ${basic.displayName}
│ 🆔 *UserId:* ${basic.id}
│ 📅 *Created:* ${basic.created.split("T")[0]}
│ ✅ *Verified:* ${basic.hasVerifiedBadge ? "Yes" : "No"}
│ 🤝 *Friends:* ${friends}
│ 👥 *Followers:* ${followers}
│ 👣 *Following:* ${following}
│ 👪 *Groups:* ${groups}
╰─────────────❖
    `;

      if (info.achievements?.robloxBadges?.length) {
        caption += `\n🏅 *Achievement:*\n`;
        info.achievements.robloxBadges.slice(0, 5).forEach(b => {
          caption += `- ${b.name}\n`;
        });
        if (info.achievements.robloxBadges.length > 5) caption += `+${info.achievements.robloxBadges.length - 5} more...\n`;
      }

      if (avatar) {
        await bot.sendPhoto(chatId, avatar, {
          caption,
          parse_mode: "Markdown"
        });
      } else {
        await bot.sendMessage(chatId, caption, { parse_mode: "Markdown" });
      }

    } catch (e) {
      console.error(e);
      bot.sendMessage(chatId, "❌ Gagal ambil data Roblox user!");
    }
  });

  // command /stalktiktok
  bot.onText(/^\/stalktiktok(?:\s+(.+))?/, async (msg, match) => {
    const chatId = msg.chat.id;
    const username = match[1];

    if (!username) {
      return bot.sendMessage(chatId, "⚠️ Masukkan username TikTok.\nContoh: `/stalktiktok mrbeast`", { parse_mode: "Markdown" });
    }

    const waktu = checkCooldown(msg.from.id);
    if (waktu > 0) return bot.sendMessage(chatId, `⏳ Tunggu ${waktu} detik sebelum bisa pakai command /stalktiktok lagi!`, { reply_to_message_id: msg.message_id });

    bot.sendMessage(chatId, '⏳', {
      reply_to_message_id: msg.message_id
    });

    try {
      const res = await axios.get(`https://api.siputzx.my.id/api/stalk/tiktok?username=${encodeURIComponent(username)}`);
      const data = res.data;

      if (!data.status || !data.data) {
        return bot.sendMessage(chatId, "❌ User TikTok tidak ditemukan.");
      }

      const user = data.data.user;
      const stats = data.data.stats;

      const caption = `
⟢ TikTok Stalk Result
──────────────────────
✦ ID: ${user.id}
✦ Username: ${user.uniqueId}
✦ Nickname: ${user.nickname}
✦ Verified: ${user.verified ? "✅ Yes" : "❌ No"}
✦ Bio: ${user.signature || "-"}
✦ Link: ${user.bioLink?.link || "-"}

⟢ Stats
──────────────────────
✦ Followers: ${stats.followerCount.toLocaleString()}
✦ Following: ${stats.followingCount.toLocaleString()}
✦ Likes: ${stats.heartCount.toLocaleString()}
✦ Videos: ${stats.videoCount.toLocaleString()}
    `.trim();

      bot.sendPhoto(chatId, user.avatarLarger, {
        caption,
        parse_mode: "Markdown"
      });

    } catch (e) {
      console.error(e);
      bot.sendMessage(chatId, "❌ Gagal mengambil data TikTok.");
    }
  });

  // command /stalkyt
  bot.onText(/\/stalkyt (.+)/, async (msg, match) => {
    const chatId = msg.chat.id;
    const username = match[1];

    const waktu = checkCooldown(msg.from.id);
    if (waktu > 0) return bot.sendMessage(chatId, `⏳ Tunggu ${waktu} detik sebelum bisa pakai command /stalkyt lagi!`, { reply_to_message_id: msg.message_id });

    bot.sendMessage(chatId, '⏳', {
      reply_to_message_id: msg.message_id
    });

    try {
      const res = await axios.get(`https://api.siputzx.my.id/api/stalk/youtube?username=${encodeURIComponent(username)}`);
      const json = res.data;

      if (!json.status) {
        return bot.sendMessage(chatId, "⚠️ Channel tidak ditemukan.");
      }

      const ch = json.data.channel;
      const videos = json.data.latest_videos;

      let caption = `✦ YouTube Stalker ✦\n\n` +
        `⤷ ᴜꜱᴇʀɴᴀᴍᴇ: ${ch.username}\n` +
        `⤷ ꜱᴜʙꜱᴄʀɪʙᴇʀꜱ: ${ch.subscriberCount}\n` +
        `⤷ ᴠɪᴅᴇᴏꜱ: ${ch.videoCount}\n` +
        `⤷ ʟɪɴᴋ: ${ch.channelUrl}\n` +
        `⤷ ᴅᴇꜱᴄ: ${ch.description || "Kosong"}\n\n`;

      if (videos.length) {
        caption += `✦ ᴠɪᴅᴇᴏ ᴛᴇʀʙᴀʀᴜ ✦\n` +
          `⤷ ᴊᴜᴅᴜʟ: ${videos[0].title}\n` +
          `⤷ ᴅᴜʀᴀꜱɪ: ${videos[0].duration}\n` +
          `⤷ ᴘᴜʙʟɪꜱʜᴇᴅ: ${videos[0].publishedTime}\n` +
          `⤷ ᴠɪᴇᴡꜱ: ${videos[0].viewCount}\n` +
          `⤷ ʟɪɴᴋ: ${videos[0].videoUrl}`;
      }

      bot.sendPhoto(chatId, ch.avatarUrl, {
        caption,
        parse_mode: "Markdown"
      });

    } catch (e) {
      console.error(e);
      bot.sendMessage(chatId, "❌ Gagal mengambil data YouTube.");
    }
  });

  // command /stalkgithub
  bot.onText(/\/stalkgithub (.+)/, async (msg, match) => {
    const chatId = msg.chat.id;
    const username = match[1];

    if (!username) return bot.sendMessage(chatId, "❌ Format salah! Contoh:\n/stalkgithub iLyxxDev");

    const waktu = checkCooldown(msg.from.id);
    if (waktu > 0) return bot.sendMessage(chatId, `⏳ Tunggu ${waktu} detik sebelum bisa pakai command /stalkgithub lagi!`, { reply_to_message_id: msg.message_id });

    try {
      const res = await fetch(`https://api.lolhuman.xyz/api/github/${encodeURIComponent(username)}?apikey=94db7e4d24b65d1ebc7b2017`);
      const data = await res.json();

      if (!data.status || !data.result) {
        return bot.sendMessage(chatId, `❌ API error: ${data.message || "Gagal mengambil info GitHub"}`);
      }

      const info = data.result;

      let reply = `- 👤 GitHub Stalk -\n` +
        `📝 Name: ${info.name || "-"}\n` +
        `💻 Username: ${username}\n` +
        `🔗 URL: ${info.url}\n` +
        `📌 Type: ${info.type}\n` +
        `👥 Followers: ${info.followers}\n` +
        `👤 Following: ${info.following}\n` +
        `📂 Public Repos: ${info.public_repos}\n` +
        `📄 Public Gists: ${info.public_gists}\n` +
        `🏢 Company: ${info.company || "-"}\n` +
        `📍 Location: ${info.location || "-"}\n` +
        `✉️ Email: ${info.email || "-"}\n` +
        `📝 Bio: ${info.bio || "-"}`;

      bot.sendPhoto(chatId, info.avatar, { caption: reply });

    } catch (err) {
      console.log("Error /stalkgithub:", err.message);
      bot.sendMessage(chatId, "❌ Terjadi kesalahan saat memproses request.");
    }
  });

  // command /xnxx
  bot.onText(/^\/xnxx(?:\s+(.+))?/, async (msg, match) => {
    const chatId = msg.chat.id;
    const input = match[1];

    if (!input) {
      return bot.sendMessage(
        chatId,
        "⚠️ Format salah!\nGunakan:\n`/xnxx title|url_gambar`",
        { parse_mode: "Markdown" }
      );
    }

    const waktu = checkCooldown(msg.from.id);
    if (waktu > 0) return bot.sendMessage(chatId, `⏳ Tunggu ${waktu} detik sebelum bisa pakai command /xnxx lagi!`, { reply_to_message_id: msg.message_id });

    bot.sendMessage(chatId, '⏳', {
      reply_to_message_id: msg.message_id
    });

    const [title, image] = input.split("|").map(v => v.trim());

    if (!title || !image) {
      return bot.sendMessage(
        chatId,
        "⚠️ Harap isi title dan url gambar!\nContoh:\n`/xnxx Lari ada wibu|https://files.catbox.moe/zhsks3.jpg`",
        { parse_mode: "Markdown" }
      );
    }

    try {
      const apiUrl = `https://api.siputzx.my.id/api/canvas/xnxx?title=${encodeURIComponent(title)}&image=${encodeURIComponent(image)}`;

      const response = await axios.get(apiUrl, { responseType: "arraybuffer" });

      await bot.sendPhoto(chatId, Buffer.from(response.data), {
        caption: `😂`,
        parse_mode: "Markdown"
      });

    } catch (err) {
      console.error(err);
      bot.sendMessage(chatId, "❌ Gagal generate gambar, coba lagi!");
    }
  });

  // command /brat
  bot.onText(/^\/brat(?: (.+))?/, async (msg, match) => {
    const chatId = msg.chat.id;

    const joined = await isMember(msg.from.id);

    if (!joined) {
      await sendJoinChannel(chatId);
      return;
    }

    const argsRaw = match[1];

    if (!argsRaw) {
      return bot.sendMessage(chatId, '⚠️ Format: /brat <teks>');
    }

    const waktu = checkCooldown(msg.from.id);
    if (waktu > 0) return bot.sendMessage(chatId, `⏳ Tunggu ${waktu} detik sebelum bisa pakai command /brat lagi!`, { reply_to_message_id: msg.message_id });

    try {
      const args = argsRaw.split(' ');

      const textParts = [];
      let isAnimated = false;
      let delay = 500;

      for (let arg of args) {
        if (arg === '--gif') isAnimated = true;
        else if (arg.startsWith('--delay=')) {
          const val = parseInt(arg.split('=')[1]);
          if (!isNaN(val)) delay = val;
        } else {
          textParts.push(arg);
        }
      }

      const text = textParts.join(' ');
      if (!text) {
        return bot.sendMessage(chatId, 'Teks tidak boleh kosong!');
      }

      if (isAnimated && (delay < 100 || delay > 1500)) {
        return bot.sendMessage(chatId, 'Delay harus antara 100–1500 ms.');
      }

      await bot.sendMessage(chatId, '⏳ ᴍᴇᴍʙᴜᴀᴛ sᴛɪᴄᴋᴇʀ ʙʀᴀᴛ...');

      const apiUrl = `https://api.siputzx.my.id/api/m/brat?text=${encodeURIComponent(text)}&isAnimated=${isAnimated}&delay=${delay}`;
      const response = await axios.get(apiUrl, {
        responseType: 'arraybuffer',
      });

      const buffer = Buffer.from(response.data);

      await bot.sendSticker(chatId, buffer);
    } catch (error) {
      console.error('❌ Error brat:', error.message);
      bot.sendMessage(chatId, 'Gagal membuat stiker brat. Coba lagi nanti ya!');
    }
  });

  // command /tourl
  bot.onText(/\/tourl/, async (msg) => {
    const chatId = msg.chat.id;

    const joined = await isMember(msg.from.id);

    if (!joined) {
      await sendJoinChannel(chatId);
      return;
    }

    const waktu = checkCooldown(msg.from.id);
    if (waktu > 0) return bot.sendMessage(chatId, `⏳ Tunggu ${waktu} detik sebelum bisa pakai command /tourl lagi!`, { reply_to_message_id: msg.message_id });

    const repliedMsg = msg.reply_to_message;

    if (!repliedMsg || (!repliedMsg.document && !repliedMsg.photo && !repliedMsg.video)) {
      return bot.sendMessage(chatId, "⚠️ Reply foto/video dengan command /tourl");
    }

    let fileId, fileName;

    if (repliedMsg.document) {
      fileId = repliedMsg.document.file_id;
      fileName = repliedMsg.document.file_name || `file_${Date.now()}`;
    } else if (repliedMsg.photo) {
      const photos = repliedMsg.photo;
      fileId = photos[photos.length - 1].file_id; // resolusi tertinggi
      fileName = `photo_${Date.now()}.jpg`;
    } else if (repliedMsg.video) {
      fileId = repliedMsg.video.file_id;
      fileName = `video_${Date.now()}.mp4`;
    }

    try {
      const processingMsg = await bot.sendMessage(chatId, `⏳ ᴍᴇɴɢᴜᴘʟᴏᴀᴅ ᴋᴇ ᴄᴀᴛʙᴏx...`, { parse_mode: "Markdown", reply_to_message_id: msg.message_id });

      const file = await bot.getFile(fileId);
      const fileLink = `https://api.telegram.org/file/bot${settings.token}/${file.file_path}`;

      const fileResponse = await axios.get(fileLink, { responseType: 'arraybuffer' });
      const buffer = Buffer.from(fileResponse.data);

      // Upload ke Catbox
      const form = new FormData();
      form.append('reqtype', 'fileupload');
      form.append('fileToUpload', buffer, {
        filename: fileName,
        contentType: fileResponse.headers['content-type'],
      });

      const { data: catboxUrl } = await axios.post('https://catbox.moe/user/api.php', form, {
        headers: form.getHeaders()
      });

      // Validasi URL
      if (!catboxUrl.startsWith('https://')) {
        throw new Error('Catbox tidak mengembalikan URL yang valid');
      }

      await bot.editMessageText(`*✅ Sukses Upload Image!*\n\n📎 URL: \`${catboxUrl}\``, {
        chat_id: chatId,
        parse_mode: "Markdown",
        message_id: processingMsg.message_id
      });

    } catch (error) {
      console.error("Upload error:", error?.response?.data || error.message);
      bot.sendMessage(chatId, "❌ Gagal mengupload file ke Catbox");
    }
  });

  bot.onText(/\/iqc(.+)?/, async (msg, match) => {
    const chatId = msg.chat.id;
    const joined = await isMember(msg.from.id);

    if (!joined) {
      await sendJoinChannel(chatId);
      return;
    }

    const waktu = checkCooldown(msg.from.id);
    if (waktu > 0) return bot.sendMessage(chatId, `⏳ Tunggu ${waktu} detik sebelum bisa pakai command /iqc lagi!`, { reply_to_message_id: msg.message_id });

    const text = match[1] ? match[1].trim() : '';

    if (!text) {
      return bot.sendMessage(chatId, '❌ Format Salah: /iqc jam|batre|carrier|pesan\nContoh: /iqc 18:00|40|Indosat|hai hai', {
        reply_to_message_id: msg.message_id
      });
    }

    const parts = text.split('|');
    if (parts.length < 4) {
      return bot.sendMessage(chatId, '❌ Format salah! Gunakan:\n/iqc jam|batre|carrier|pesan\nContoh:\n/iqc 18:00|40|Indosat|hai hai', {
        reply_to_message_id: msg.message_id
      });
    }

    const time = parts[0].trim();
    const battery = parts[1].trim();
    const carrier = parts[2].trim();
    const messageParts = parts.slice(3);
    const messageText = messageParts.join('|').trim();

    if (!time || !battery || !carrier || !messageText) {
      return bot.sendMessage(chatId, '⚠️ Format salah! Pastikan semua field terisi:\n/iqc jam|batre|carrier|pesan', {
        reply_to_message_id: msg.message_id
      });
    }

    const waitingMsg = await bot.sendMessage(chatId, '⏳', {
      reply_to_message_id: msg.message_id
    });

    try {
      const encodedTime = encodeURIComponent(time);
      const encodedCarrier = encodeURIComponent(carrier);
      const encodedMessage = encodeURIComponent(messageText);

      const url = `https://brat.siputzx.my.id/iphone-quoted?time=${encodedTime}&batteryPercentage=${battery}&carrierName=${encodedCarrier}&messageText=${encodedMessage}&emojiStyle=apple`;

      const response = await fetch(url);

      if (!response.ok) {
        throw new Error(`API returned status ${response.status}`);
      }

      const arrayBuffer = await response.arrayBuffer();
      const buffer = Buffer.from(arrayBuffer);

      await bot.sendPhoto(chatId, buffer, {
        caption: `✅ *ꜱᴜᴋꜱᴇꜱ ʙᴀɴɢ*`,
        parse_mode: 'Markdown',
        reply_to_message_id: msg.message_id
      });

      await bot.deleteMessage(chatId, waitingMsg.message_id);

    } catch (error) {
      console.error('Error:', error);

      await bot.deleteMessage(chatId, waitingMsg.message_id);

      await bot.sendMessage(chatId, '❌ Terjadi kesalahan, Coba lagi!', {
        reply_to_message_id: msg.message_id
      });
    }
  });

  bot.onText(/\/ytmp3 (.+)/, async (msg, match) => {
    const chatId = msg.chat.id;
    const url = match[1];
    const apiKey = "lQTMsiHV";

    const waktu = checkCooldown(msg.from.id);
    if (waktu > 0) return bot.sendMessage(chatId, `⏳ Tunggu ${waktu} detik sebelum bisa pakai command /ytmp3 lagi!`, { reply_to_message_id: msg.message_id });

    await bot.sendMessage(chatId, "⏳");

    try {
      const res = await axios.get(
        `https://api.botcahx.eu.org/api/dowloader/yt?url=${encodeURIComponent(url)}&apikey=${apiKey}`
      );
      const data = res.data;

      if (!data.status || !data.result || !data.result.mp3) {
        return bot.sendMessage(chatId, "❌ Gagal mendapatkan MP3. Coba lagi.");
      }

      const { title, thumb, mp3, source } = data.result;

      await bot.sendPhoto(chatId, thumb, {
        caption: `🎵 *${title}*\n🔗 [YouTube](${source})`,
        parse_mode: "Markdown"
      });

      const filePath = path.join(__dirname, `${data.result.id}.mp3`);
      const writer = fs.createWriteStream(filePath);
      const response = await axios({
        url: mp3,
        method: "GET",
        responseType: "stream"
      });
      response.data.pipe(writer);

      writer.on("finish", async () => {

        await bot.sendAudio(chatId, filePath, {
          title: title || "YouTube Audio",
          performer: "Schnuffellll Asisten"
        });

        fs.unlinkSync(filePath);
      });

      writer.on("error", () => {
        bot.sendMessage(chatId, "❌ Gagal download MP3.");
      });

    } catch (e) {
      console.error(e.response?.data || e.message);
      bot.sendMessage(chatId, "❌ Terjadi kesalahan saat memproses permintaan.");
    }
  });

  bot.onText(/\/ytmp4 (.+)/, async (msg, match) => {
    const chatId = msg.chat.id;
    const url = match[1];
    const apiKey = "lQTMsiHV";

    const waktu = checkCooldown(msg.from.id);
    if (waktu > 0) return bot.sendMessage(chatId, `⏳ Tunggu ${waktu} detik sebelum bisa pakai command /ytmp4 lagi!`, { reply_to_message_id: msg.message_id });

    await bot.sendMessage(chatId, "⏳");

    try {
      const res = await axios.get(
        `https://api.botcahx.eu.org/api/dowloader/yt?url=${encodeURIComponent(url)}&apikey=${apiKey}`
      );
      const data = res.data;

      if (!data.status || !data.result || !data.result.mp4) {
        return bot.sendMessage(chatId, "❌ Gagal mendapatkan MP4. Coba lagi.");
      }

      const { title, thumb, mp4, source, id } = data.result;

      const filePath = path.join(__dirname, `${id}.mp4`);
      const writer = fs.createWriteStream(filePath);
      const response = await axios({
        url: mp4,
        method: "GET",
        responseType: "stream"
      });
      response.data.pipe(writer);

      writer.on("finish", async () => {

        await bot.sendVideo(chatId, filePath, {
          caption: title || "YouTube Video"
        });

        fs.unlinkSync(filePath);
      });

      writer.on("error", () => {
        bot.sendMessage(chatId, "❌ Gagal download MP4.");
      });

    } catch (e) {
      console.error(e.response?.data || e.message);
      bot.sendMessage(chatId, "❌ Terjadi kesalahan saat memproses permintaan.");
    }
  });

  bot.onText(/\/lacakip (.+)/, async (msg, match) => {
    const chatId = msg.chat.id;
    const ip = match[1];

    if (!ip) return bot.sendMessage(chatId, "❌ Format salah! Contoh:\n/ip 123.456.78.9");

    const waktu = checkCooldown(msg.from.id);
    if (waktu > 0) return bot.sendMessage(chatId, `⏳ Tunggu ${waktu} detik sebelum bisa pakai command /lacakip lagi!`, { reply_to_message_id: msg.message_id });

    try {
      const res = await fetch(`https://api.lolhuman.xyz/api/ipaddress/${encodeURIComponent(ip)}?apikey=94db7e4d24b65d1ebc7b2017`);
      const data = await res.json();

      if (!data.status || !data.result) {
        return bot.sendMessage(chatId, `❌ API error: ${data.message || "Gagal mengambil info IP"}`);
      }

      const info = data.result;

      let reply = `🌐 Informasi IP: ${info.query}\n` +
        `🏳️ Negara: ${info.country} (${info.countryCode})\n` +
        `🏙️ Kota: ${info.city}\n` +
        `📍 Region: ${info.regionName} (${info.region})\n` +
        `🕒 Timezone: ${info.timezone}\n` +
        `📡 ISP: ${info.isp}\n` +
        `🌐 AS: ${info.as}\n` +
        `📌 Latitude: ${info.lat}, Longitude: ${info.lon}\n` +
        `🏷️ Zip: ${info.zip || "-"}`;

      bot.sendMessage(chatId, reply);

    } catch (err) {
      console.log("Error /ip:", err.message);
      bot.sendMessage(chatId, "❌ Terjadi kesalahan saat memproses request.");
    }
  });

  bot.onText(/\/jodoh (.+)/, async (msg, match) => {
    const chatId = msg.chat.id;
    const text = match[1];

    const [nama1, nama2] = text.split("|").map(n => n.trim());
    if (!nama1 || !nama2) return bot.sendMessage(chatId, "❌ Format salah! Contoh:\n/jodoh nabila|schnuffellll");

    const waktu = checkCooldown(msg.from.id);
    if (waktu > 0) return bot.sendMessage(chatId, `⏳ Tunggu ${waktu} detik sebelum bisa pakai command /jodoh lagi!`, { reply_to_message_id: msg.message_id });

    try {
      const res = await fetch(`https://api.lolhuman.xyz/api/jodoh/${encodeURIComponent(nama1)}/${encodeURIComponent(nama2)}?apikey=94db7e4d24b65d1ebc7b2017`);
      const data = await res.json();

      if (!data.status || !data.result) {
        return bot.sendMessage(chatId, `❌ API error: ${data.message || "Gagal mengambil hasil jodoh"}`);
      }

      const { image, positif, negatif, deskripsi } = data.result;

      let reply = `🎀 Kecocokan ${nama1} ❤️ ${nama2}\n\n` +
        `✨ Positif: ${positif}\n` +
        `⚠️ Negatif: ${negatif}\n\n` +
        `📝 ${deskripsi}`;

      bot.sendPhoto(chatId, image, { caption: reply });

    } catch (err) {
      console.log("Error /jodoh:", err.message);
      bot.sendMessage(chatId, "❌ Terjadi kesalahan saat memproses request.");
    }
  });

  bot.onText(/\/artinama (.+)/, async (msg, match) => {
    const chatId = msg.chat.id;
    const nama = match[1];

    if (!nama) return bot.sendMessage(chatId, "❌ Format salah! Contoh:\n/artinama schnuffellll");

    const waktu = checkCooldown(msg.from.id);
    if (waktu > 0) return bot.sendMessage(chatId, `⏳ Tunggu ${waktu} detik sebelum bisa pakai command /artinama lagi!`, { reply_to_message_id: msg.message_id });

    try {
      const res = await fetch(`https://api.lolhuman.xyz/api/artinama?apikey=94db7e4d24b65d1ebc7b2017&nama=${encodeURIComponent(nama)}`);
      const data = await res.json();

      if (!data.status || !data.result) {
        return bot.sendMessage(chatId, `❌ API error: ${data.message || "Gagal mengambil arti nama"}`);
      }

      bot.sendMessage(chatId, `👤 *Nama: ${nama}*\n\n✨ ${data.result}`, { parse_mode: "Markdown" });

    } catch (err) {
      console.log("Error /artinama:", err.message);
      bot.sendMessage(chatId, "❌ Terjadi kesalahan saat memproses request.");
    }
  });

  bot.onText(/\/shortlink (.+)/, async (msg, match) => {
    const chatId = msg.chat.id;
    const url = match[1];

    if (!url) return bot.sendMessage(chatId, "❌ Format salah! Contoh:\n/shortlink https://google.com");

    const waktu = checkCooldown(msg.from.id);
    if (waktu > 0) return bot.sendMessage(chatId, `⏳ Tunggu ${waktu} detik sebelum bisa pakai command /shortlink lagi!`, { reply_to_message_id: msg.message_id });

    try {
      const res = await fetch(`https://api.lolhuman.xyz/api/shortlink?apikey=94db7e4d24b65d1ebc7b2017&url=${encodeURIComponent(url)}`);
      const data = await res.json();

      if (data.status === false) {
        return bot.sendMessage(chatId, "❌ Gagal mempersingkat link, coba lagi nanti.");
      }

      bot.sendMessage(chatId, `🔗 ꜱʜᴏʀᴛ ʟɪɴᴋ:\n${data.result}`);
    } catch (err) {
      console.log(err);
      bot.sendMessage(chatId, "❌ Terjadi kesalahan saat memproses request.");
    }
  });

  // ═══════════════════════════════════════════════════════════════════════
  // 🎵 TIKTOK DOWNLOADER - MP3 & MP4 dengan pilihan kualitas
  // Fitur: Deteksi otomatis link TikTok, pilih format dan kualitas
  // ═══════════════════════════════════════════════════════════════════════

  // Storage untuk menyimpan data TikTok sementara
  global.tiktokData = global.tiktokData || {};

  // Command /tiktok - Download TikTok video/audio
  bot.onText(/^\/tiktok(?:\s+(.+))?$/, async (msg, match) => {
    const chatId = msg.chat.id;
    const url = match[1];

    if (!url) {
      return bot.sendMessage(chatId, `
╔══════════════════════════════════╗
║  🎵 <b>TIKTOK DOWNLOADER</b>  ║
╚══════════════════════════════════╝

<b>📝 Cara Penggunaan:</b>
<code>/tiktok [link_tiktok]</code>

<b>📌 Contoh:</b>
<code>/tiktok https://vt.tiktok.com/xxx</code>

<b>✨ Fitur:</b>
• Download Video MP4 (No Watermark)
• Download Audio MP3
• Pilihan kualitas video
• Info lengkap video

<i>💡 Atau kirim link TikTok langsung!</i>
`, { parse_mode: "HTML", reply_to_message_id: msg.message_id });
    }

    // Validasi URL TikTok
    if (!url.includes('tiktok.com') && !url.includes('vt.tiktok')) {
      return bot.sendMessage(chatId, "❌ URL tidak valid! Harap masukkan link TikTok yang benar.", { reply_to_message_id: msg.message_id });
    }

    const waktu = checkCooldown(msg.from.id);
    if (waktu > 0) return bot.sendMessage(chatId, `⏳ Tunggu ${waktu} detik sebelum download lagi!`, { reply_to_message_id: msg.message_id });

    const waitMsg = await bot.sendMessage(chatId, "⏳ Mengambil info video TikTok...", { reply_to_message_id: msg.message_id });

    try {
      // Fetch TikTok data dari API
      const apiUrl = `https://api.siputzx.my.id/api/d/tiktok?url=${encodeURIComponent(url)}`;
      const res = await fetch(apiUrl);
      const data = await res.json();

      if (!data.status || !data.data) {
        return bot.editMessageText("❌ Gagal mengambil data TikTok. Pastikan link valid!", {
          chat_id: chatId,
          message_id: waitMsg.message_id
        });
      }

      const info = data.data;
      const uniqueId = Date.now().toString();

      // Simpan data untuk callback
      global.tiktokData[uniqueId] = {
        video: info.play || info.hdplay,
        videoHD: info.hdplay,
        videoSD: info.play,
        audio: info.music,
        cover: info.cover,
        title: info.title || "TikTok Video",
        author: info.author?.nickname || "Unknown",
        duration: info.duration || 0,
        stats: {
          plays: info.play_count || 0,
          likes: info.digg_count || 0,
          comments: info.comment_count || 0,
          shares: info.share_count || 0
        },
        chatId: chatId,
        messageId: waitMsg.message_id
      };

      const caption = `
🎵 <b>TIKTOK DOWNLOADER</b>

📝 <b>Judul:</b> ${(info.title || "No Title").substring(0, 100)}...
👤 <b>Author:</b> @${info.author?.unique_id || "unknown"}
⏱️ <b>Durasi:</b> ${info.duration || 0}s

📊 <b>Stats:</b>
├ ▶️ ${(info.play_count || 0).toLocaleString()} plays
├ ❤️ ${(info.digg_count || 0).toLocaleString()} likes
├ 💬 ${(info.comment_count || 0).toLocaleString()} comments
└ 🔗 ${(info.share_count || 0).toLocaleString()} shares

<b>Pilih format download:</b>
`;

      const keyboard = {
        inline_keyboard: [
          [
            { text: "📹 Video HD", callback_data: `tt_vhd_${uniqueId}` },
            { text: "📹 Video SD", callback_data: `tt_vsd_${uniqueId}` }
          ],
          [
            { text: "🎵 Audio MP3", callback_data: `tt_audio_${uniqueId}` }
          ],
          [
            { text: "❌ Batal", callback_data: `tt_cancel_${uniqueId}` }
          ]
        ]
      };

      // Kirim thumbnail dengan pilihan
      if (info.cover) {
        await bot.deleteMessage(chatId, waitMsg.message_id);
        await bot.sendPhoto(chatId, info.cover, {
          caption: caption,
          parse_mode: "HTML",
          reply_markup: keyboard,
          reply_to_message_id: msg.message_id
        });
      } else {
        await bot.editMessageText(caption, {
          chat_id: chatId,
          message_id: waitMsg.message_id,
          parse_mode: "HTML",
          reply_markup: keyboard
        });
      }

      // Auto cleanup setelah 5 menit
      setTimeout(() => {
        delete global.tiktokData[uniqueId];
      }, 300000);

    } catch (err) {
      console.error("TikTok Error:", err);
      bot.editMessageText("❌ Gagal memproses TikTok. Coba lagi nanti!", {
        chat_id: chatId,
        message_id: waitMsg.message_id
      });
    }
  });

  // Callback handler untuk TikTok
  bot.on("callback_query", async (q) => {
    const data = q.data;
    const chatId = q.message.chat.id;
    const messageId = q.message.message_id;

    if (!data.startsWith("tt_")) return;

    const [prefix, action, uniqueId] = data.split("_");
    const ttData = global.tiktokData[uniqueId];

    if (!ttData) {
      return bot.answerCallbackQuery(q.id, { text: "⚠️ Data kadaluarsa, kirim link lagi!", show_alert: true });
    }

    try {
      if (action === "cancel") {
        delete global.tiktokData[uniqueId];
        await bot.deleteMessage(chatId, messageId);
        await bot.answerCallbackQuery(q.id, { text: "❌ Dibatalkan" });
        return;
      }

      await bot.answerCallbackQuery(q.id, { text: "⏳ Sedang mendownload..." });

      const downloadDir = path.join(process.cwd(), "downloads");
      if (!fs.existsSync(downloadDir)) fs.mkdirSync(downloadDir);

      if (action === "vhd" || action === "vsd") {
        // Download Video
        const videoUrl = action === "vhd" ? (ttData.videoHD || ttData.video) : (ttData.videoSD || ttData.video);

        if (!videoUrl) {
          return bot.sendMessage(chatId, "❌ Video tidak tersedia!");
        }

        await bot.editMessageCaption(`⏳ Mengunduh video ${action === "vhd" ? "HD" : "SD"}...`, {
          chat_id: chatId,
          message_id: messageId
        });

        const filePath = path.join(downloadDir, `tiktok_${uniqueId}.mp4`);
        const response = await axios({
          url: videoUrl,
          method: "GET",
          responseType: "stream",
          timeout: 60000
        });

        const writer = fs.createWriteStream(filePath);
        response.data.pipe(writer);

        writer.on("finish", async () => {
          await bot.sendVideo(chatId, filePath, {
            caption: `📹 <b>${ttData.title.substring(0, 50)}</b>\n👤 @${ttData.author}\n\n<i>Downloaded by @schnuffelll bot</i>`,
            parse_mode: "HTML",
            supports_streaming: true
          });
          fs.unlinkSync(filePath);
          delete global.tiktokData[uniqueId];
          try { await bot.deleteMessage(chatId, messageId); } catch { }
        });

        writer.on("error", (err) => {
          console.error("Write error:", err);
          bot.sendMessage(chatId, "❌ Gagal menyimpan video!");
        });

      } else if (action === "audio") {
        // Download Audio
        if (!ttData.audio) {
          return bot.sendMessage(chatId, "❌ Audio tidak tersedia!");
        }

        await bot.editMessageCaption(`⏳ Mengunduh audio MP3...`, {
          chat_id: chatId,
          message_id: messageId
        });

        const filePath = path.join(downloadDir, `tiktok_${uniqueId}.mp3`);
        const response = await axios({
          url: ttData.audio,
          method: "GET",
          responseType: "stream",
          timeout: 60000
        });

        const writer = fs.createWriteStream(filePath);
        response.data.pipe(writer);

        writer.on("finish", async () => {
          await bot.sendAudio(chatId, filePath, {
            title: ttData.title.substring(0, 50),
            performer: ttData.author,
            caption: `🎵 <b>${ttData.title.substring(0, 50)}</b>\n👤 @${ttData.author}\n\n<i>Downloaded by @schnuffelll bot</i>`,
            parse_mode: "HTML"
          });
          fs.unlinkSync(filePath);
          delete global.tiktokData[uniqueId];
          try { await bot.deleteMessage(chatId, messageId); } catch { }
        });

        writer.on("error", (err) => {
          console.error("Write error:", err);
          bot.sendMessage(chatId, "❌ Gagal menyimpan audio!");
        });
      }

    } catch (err) {
      console.error("TikTok callback error:", err);
      bot.sendMessage(chatId, "❌ Gagal mendownload. Coba lagi!");
    }
  });

  // Auto detect TikTok link
  bot.on("message", async (msg) => {
    if (!msg.text || msg.text.startsWith("/")) return;

    const chatId = msg.chat.id;
    const text = msg.text;

    // Deteksi link TikTok
    const tiktokRegex = /(https?:\/\/)?(www\.|vm\.|vt\.)?tiktok\.com\/@?[\w.-]+\/video\/\d+|https?:\/\/(vm|vt)\.tiktok\.com\/[\w]+/i;
    const match = text.match(tiktokRegex);

    if (match) {
      // Trigger command tiktok
      const fakeMsg = { ...msg, text: `/tiktok ${match[0]}` };
      bot.emit('text', fakeMsg);
    }
  });

  // ═══════════════════════════════════════════════════════════════════════
  // 📥 DOWNLOAD MENU - Menampilkan semua fitur download
  // ═══════════════════════════════════════════════════════════════════════

  bot.onText(/^\/download$/i, (msg) => {
    const chatId = msg.chat.id;

    const text = `
╔══════════════════════════════════════╗
║  📥 <b>DOWNLOAD MENU</b>  ║
╚══════════════════════════════════════╝

<b>🎵 MUSIK & AUDIO</b>
├ <code>/spotify [judul]</code> - Download musik Spotify
├ <code>/ytmp3 [link]</code> - Download YouTube ke MP3
└ <code>/tiktok [link]</code> - Download audio TikTok

<b>📹 VIDEO</b>
├ <code>/ytmp4 [link]</code> - Download YouTube ke MP4
├ <code>/tiktok [link]</code> - Download video TikTok
└ <i>(Support HD & SD quality)</i>

<b>🖼️ GAMBAR</b>
├ <code>/pin [query]</code> - Cari gambar Pinterest
└ <code>/tourl</code> - Upload file ke URL (reply)

<b>💡 TIPS:</b>
• Kirim link TikTok langsung untuk auto-detect
• Untuk TikTok bisa pilih format (Video/Audio)
• YouTube support video sampai 1080p

<i>© 2025 Schnuffelll Bot</i>
`;

    bot.sendMessage(chatId, text, {
      parse_mode: "HTML",
      reply_to_message_id: msg.message_id,
      reply_markup: {
        inline_keyboard: [
          [
            { text: "🎵 Spotify", switch_inline_query_current_chat: "/spotify " },
            { text: "📹 YouTube", switch_inline_query_current_chat: "/ytmp4 " }
          ],
          [
            { text: "🎬 TikTok", switch_inline_query_current_chat: "/tiktok " },
            { text: "🖼️ Pinterest", switch_inline_query_current_chat: "/pin " }
          ]
        ]
      }
    });
  });

}