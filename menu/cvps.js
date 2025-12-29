/**
 * ═══════════════════════════════════════════════════════════════════════════════════════
 *  📡 SCHNUFFELLL BOT - CREATE VPS & DO MANAGEMENT
 *  
 *  Features:
 *  - Dynamic Token Management (/listdo, /adddo, /deldo)
 *  - Create VPS from multiple accounts
 *  - List VPS instances
 *  - Detail VPS info
 *  - Delete VPS
 * ═══════════════════════════════════════════════════════════════════════════════════════
 */

const fs = require('fs');
const fetch = require('node-fetch');
const { loadJsonData, saveJsonData } = require('../lib/function');
const settings = require('../config.js');

module.exports = (bot) => {

  const OWNER_ID = settings.ownerId;
  const RESSVPS_FILE = './db/ressvps.json';
  const DO_TOKENS_FILE = './db/do_tokens.json';

  // Helper: Load DO tokens
  function loadDoTokens() {
    try {
      if (fs.existsSync(DO_TOKENS_FILE)) {
        return JSON.parse(fs.readFileSync(DO_TOKENS_FILE, 'utf8'));
      }
    } catch (e) {
      console.error('Error loading DO tokens:', e);
    }
    return [];
  }

  // Helper: Save DO tokens
  function saveDoTokens(tokens) {
    try {
      fs.writeFileSync(DO_TOKENS_FILE, JSON.stringify(tokens, null, 2));
      return true;
    } catch (e) {
      console.error('Error saving DO tokens:', e);
      return false;
    }
  }

  // Helper: DO API Headers
  const getHeaders = (token) => ({
    "Content-Type": "application/json",
    "Authorization": `Bearer ${token}`
  });

  // Helper: Create Droplet with enhanced logging
  async function createVPSDroplet(apiKey, name, specId, imageId, regionId, password) {
    const spec = vpsSpecs[specId];
    const img = vpsImages[imageId];
    const reg = vpsRegions[regionId];

    // Validate inputs
    if (!spec) throw new Error(`Invalid spec ID: ${specId}. Available: ${Object.keys(vpsSpecs).join(', ')}`);
    if (!img) throw new Error(`Invalid image ID: ${imageId}. Available: ${Object.keys(vpsImages).join(', ')}`);
    if (!reg) throw new Error(`Invalid region ID: ${regionId}. Available: ${Object.keys(vpsRegions).join(', ')}`);

    const body = {
      name: name,
      region: reg.slug,
      size: spec.slug,
      image: img.slug,
      user_data: `#!/bin/bash\necho "root:${password}" | chpasswd\nsed -i 's/PermitRootLogin.*/PermitRootLogin yes/' /etc/ssh/sshd_config\nsed -i 's/PasswordAuthentication.*/PasswordAuthentication yes/' /etc/ssh/sshd_config\nsystemctl restart sshd`,
      tags: ["schnuffelll-bot"]
    };

    // Log request for debugging
    console.log(`[CREATEVPS] Creating droplet:`);
    console.log(`  - Name: ${name}`);
    console.log(`  - Spec: ${spec.name} (${spec.slug})`);
    console.log(`  - Image: ${img.name} (${img.slug})`);
    console.log(`  - Region: ${reg.name} (${reg.slug})`);

    const response = await fetch("https://api.digitalocean.com/v2/droplets", {
      method: "POST",
      headers: getHeaders(apiKey),
      body: JSON.stringify(body)
    });

    const data = await response.json();

    // Enhanced error handling
    if (!response.ok) {
      console.error(`[CREATEVPS] Error response:`, JSON.stringify(data, null, 2));

      // Check for specific errors
      if (data.id === 'service_unavailable') {
        throw new Error(`Region ${reg.slug} tidak tersedia untuk spec ${spec.slug}. Coba region lain.`);
      }
      if (data.id === 'bad_request' && data.message?.includes('size')) {
        throw new Error(`Spec ${spec.slug} tidak valid atau tidak tersedia di region ${reg.slug}.`);
      }

      throw new Error(data.message || `Failed to create droplet (${response.status})`);
    }

    console.log(`[CREATEVPS] Droplet created! ID: ${data.droplet.id}`);
    return data.droplet.id;
  }

  // Helper: Get Droplet Info
  async function getDropletInfo(apiKey, dropletId) {
    const response = await fetch(`https://api.digitalocean.com/v2/droplets/${dropletId}`, {
      headers: getHeaders(apiKey)
    });
    const data = await response.json();
    if (!response.ok) return null;
    return data.droplet;
  }

  // Helper: List Droplets
  async function getListVps(apiKey) {
    const response = await fetch("https://api.digitalocean.com/v2/droplets?per_page=100", {
      headers: getHeaders(apiKey)
    });
    const data = await response.json();
    if (!response.ok) throw new Error(data.message || "Failed to fetch list");
    return data.droplets || [];
  }

  // Helper: Delete Droplet
  async function deleteVPS(apiKey, dropletId) {
    const response = await fetch(`https://api.digitalocean.com/v2/droplets/${dropletId}`, {
      method: "DELETE",
      headers: getHeaders(apiKey)
    });
    if (!response.ok && response.status !== 204) {
      const data = await response.json();
      throw new Error(data.message || "Failed to delete");
    }
    return true;
  }

  // Helper: Save VPS Info to DB
  function addVPS(id, data) {
    const file = './db/vps_data.json';
    let vpsData = {};
    if (fs.existsSync(file)) vpsData = JSON.parse(fs.readFileSync(file));
    vpsData[id] = { ...data, createdAt: new Date().toISOString() };
    fs.writeFileSync(file, JSON.stringify(vpsData, null, 2));
  }

  // DATA SPEK VPS - Extended with more options
  const vpsSpecs = {
    // Basic Droplets
    "1": { name: "1GB / 1 CPU ($6)", slug: "s-1vcpu-1gb", icon: "🥉" },
    "2": { name: "2GB / 1 CPU ($12)", slug: "s-1vcpu-2gb", icon: "🥈" },
    "3": { name: "2GB / 2 CPU ($18)", slug: "s-2vcpu-2gb", icon: "🥇" },
    "4": { name: "4GB / 2 CPU ($24)", slug: "s-2vcpu-4gb", icon: "💎" },
    "5": { name: "8GB / 4 CPU ($48)", slug: "s-4vcpu-8gb", icon: "🚀" },
    // 16GB Options
    "6": { name: "16GB / 8 CPU Basic ($96)", slug: "s-8vcpu-16gb", icon: "🔥" },
    "7": { name: "16GB / 4 CPU Regular ($96)", slug: "g-4vcpu-16gb", icon: "⚡" },
    "8": { name: "16GB / 2 CPU Memory-Opt ($84)", slug: "m-2vcpu-16gb", icon: "🧠" },
    // 32GB Options
    "9": { name: "32GB / 8 CPU Basic ($192)", slug: "s-8vcpu-32gb", icon: "🌋" },
    "10": { name: "32GB / 4 CPU Memory-Opt ($168)", slug: "m-4vcpu-32gb", icon: "🧠" },
    "11": { name: "32GB / 8 CPU Regular ($192)", slug: "g-8vcpu-32gb", icon: "💫" },
    // Premium Options
    "12": { name: "64GB / 16 CPU Regular ($384)", slug: "g-16vcpu-64gb", icon: "🌟" },
    "13": { name: "48GB / 12 CPU CPU-Opt ($504)", slug: "c-12-intel-48gb", icon: "🔥" },
    // Dedicated CPU
    "14": { name: "16GB / 4 CPU Dedicated ($120)", slug: "c-4", icon: "💪" },
    "15": { name: "32GB / 8 CPU Dedicated ($240)", slug: "c-8", icon: "💪" }
  };

  const vpsImages = {
    "1": { name: "Debian 10", slug: "debian-10-x64", icon: "🍥" },
    "2": { name: "Debian 11", slug: "debian-11-x64", icon: "🍥" },
    "3": { name: "Debian 12", slug: "debian-12-x64", icon: "🍥" },
    "4": { name: "Ubuntu 20.04", slug: "ubuntu-20-04-x64", icon: "🟠" },
    "5": { name: "Ubuntu 22.04", slug: "ubuntu-22-04-x64", icon: "🟠" },
    "6": { name: "Ubuntu 24.04", slug: "ubuntu-24-04-x64", icon: "🟠" }
  };

  const vpsRegions = {
    "1": { name: "Singapore", slug: "sgp1", flag: "🇸🇬" },
    "2": { name: "New York 1", slug: "nyc1", flag: "🇺🇸" },
    "3": { name: "New York 3", slug: "nyc3", flag: "🇺🇸" },
    "4": { name: "London", slug: "lon1", flag: "🇬🇧" },
    "5": { name: "Amsterdam", slug: "ams3", flag: "🇳🇱" },
    "6": { name: "Frankfurt", slug: "fra1", flag: "🇩🇪" },
    "7": { name: "Bangalore", slug: "blr1", flag: "🇮🇳" },
    "8": { name: "Sydney", slug: "syd1", flag: "🇦🇺" }
  };

  // ═══════════════════════════════════════════════════════════════════════════════
  // HANDLERS
  // ═══════════════════════════════════════════════════════════════════════════════

  // /createvps
  bot.onText(/^\/createvps$/, async msg => {
    const ressVps = loadJsonData(RESSVPS_FILE);
    if (msg.from.id !== OWNER_ID && !ressVps.includes(msg.from.id)) {
      return bot.sendMessage(msg.chat.id, '❌ ᴋʜᴜꜱᴜꜱ ʀᴇꜱᴇʟʟᴇʀ ᴠᴘꜱ');
    }

    const tokens = loadDoTokens();
    if (tokens.length === 0) {
      return bot.sendMessage(msg.chat.id, "⚠️ Belum ada token DigitalOcean yang diatur. Hubungi owner untuk menambahkan token via `/adddo`.");
    }

    const keyboard = tokens.map((t, i) => ([{
      text: `🌐 ${t.name || 'Account ' + (i + 1)}`,
      callback_data: `createvps_${i}`
    }]));

    bot.sendMessage(msg.chat.id, `📡 *Menu Create VPS*
ᴛʜᴀɴᴋꜱ ꜰʀᴏᴍ @${settings.dev}

Pilih Akun DigitalOcean:`, {
      parse_mode: "Markdown",
      reply_to_message_id: msg.message_id,
      reply_markup: { inline_keyboard: keyboard }
    });
  });

  // Callback Query Handler
  bot.on("callback_query", async cb => {
    const chatId = cb.message.chat.id;
    const data = cb.data;

    // === MAIN MENU HANDLERS ===

    if (data === "cvpsmenu") {
      const ressVps = loadJsonData(RESSVPS_FILE);
      if (chatId !== parseInt(OWNER_ID) && !ressVps.includes(chatId)) {
        return bot.answerCallbackQuery(cb.id, { text: "❌ Khusus Reseller VPS!", show_alert: true });
      }

      const tokens = loadDoTokens();
      if (tokens.length === 0) {
        return bot.answerCallbackQuery(cb.id, { text: "⚠️ Token DO kosong!", show_alert: true });
      }

      const keyboard = tokens.map((t, i) => ([{
        text: `🌐 ${t.name || 'Account ' + (i + 1)}`,
        callback_data: `createvps_${i}`
      }]));
      keyboard.push([{ text: "🔙 Kembali", callback_data: "installmenu" }]);

      bot.editMessageText(`📡 *Menu Create VPS*
ᴛʜᴀɴᴋꜱ ꜰʀᴏᴍ @${settings.dev}

Pilih Akun DigitalOcean:`, {
        chat_id: chatId,
        message_id: cb.message.message_id,
        parse_mode: "Markdown",
        reply_markup: { inline_keyboard: keyboard }
      });
      return bot.answerCallbackQuery(cb.id);
    }

    if (data === "listvpsmenu") {
      const ressVps = loadJsonData(RESSVPS_FILE);
      if (chatId !== parseInt(OWNER_ID) && !ressVps.includes(chatId)) {
        return bot.answerCallbackQuery(cb.id, { text: "❌ Khusus Reseller VPS!", show_alert: true });
      }

      const tokens = loadDoTokens();
      if (tokens.length === 0) {
        return bot.answerCallbackQuery(cb.id, { text: "⚠️ Token DO kosong!", show_alert: true });
      }

      const keyboard = tokens.map((t, i) => ([{
        text: `🌐 ${t.name || 'Account ' + (i + 1)}`,
        callback_data: `listdo_${i}`
      }]));
      keyboard.push([{ text: "🔙 Kembali", callback_data: "installmenu" }]);

      bot.editMessageText(`📋 *Menu List VPS*
ᴛʜᴀɴᴋꜱ ꜰʀᴏᴍ @${settings.dev}

Pilih Akun DigitalOcean:`, {
        chat_id: chatId,
        message_id: cb.message.message_id,
        parse_mode: "Markdown",
        reply_markup: { inline_keyboard: keyboard }
      });
      return bot.answerCallbackQuery(cb.id);
    }

    // === TOKEN SELECTION & VPS FLOW ===
    const tokens = loadDoTokens();

    if (data.startsWith("createvps_")) {
      const accIndex = parseInt(data.split("_")[1]);
      if (!tokens[accIndex]) return bot.answerCallbackQuery(cb.id, { text: "Token invalid" });

      const keyboard = Object.entries(vpsSpecs).map(([id, spec]) => ([{
        text: `${spec.icon} ${spec.name}`,
        callback_data: `spec_${accIndex}_${id}`
      }]));

      bot.editMessageText(`📡 *Create VPS*\n🌐 Akun: *${tokens[accIndex].name || 'Acc ' + (accIndex + 1)}*\n\nPilih spesifikasi:`, {
        chat_id: chatId,
        message_id: cb.message.message_id,
        parse_mode: "Markdown",
        reply_markup: { inline_keyboard: keyboard }
      });
    }

    if (data.startsWith("spec_")) {
      const [_, accIndex, specId] = data.split("_");
      const spec = vpsSpecs[specId];
      const keyboard = Object.entries(vpsImages).map(([id, img]) => ([{
        text: `${img.icon} ${img.name}`,
        callback_data: `image_${accIndex}_${specId}_${id}`
      }]));

      bot.editMessageText(`📦 Spec: *${spec.name}*\nPilih OS Image:`, {
        chat_id: chatId,
        message_id: cb.message.message_id,
        parse_mode: "Markdown",
        reply_markup: { inline_keyboard: keyboard }
      });
    }

    if (data.startsWith("image_")) {
      const [_, accIndex, specId, imageId] = data.split("_");
      const spec = vpsSpecs[specId];
      const img = vpsImages[imageId];
      const keyboard = Object.entries(vpsRegions).map(([id, reg]) => ([{
        text: `${reg.flag} ${reg.name}`,
        callback_data: `region_${accIndex}_${specId}_${imageId}_${id}`
      }]));

      bot.editMessageText(`📦 Spec: *${spec.name}*\n💿 OS: *${img.name}*\nPilih Region:`, {
        chat_id: chatId,
        message_id: cb.message.message_id,
        parse_mode: "Markdown",
        reply_markup: { inline_keyboard: keyboard }
      });
    }

    if (data.startsWith("region_")) {
      const parts = data.split("_");
      const accIndex = parseInt(parts[1]);
      const specId = parts[2];
      const imageId = parts[3];
      const regionId = parts[4];

      const spec = vpsSpecs[specId];
      const img = vpsImages[imageId];
      const reg = vpsRegions[regionId];

      if (!tokens[accIndex]) return bot.answerCallbackQuery(cb.id, { text: "Token invalid" });
      const apiKey = tokens[accIndex].token;

      bot.editMessageText(`🚀 *Deploying...*\n📦 ${spec.name}\n⏳ Tunggu IP muncul...`, {
        chat_id: chatId,
        message_id: cb.message.message_id,
        parse_mode: "Markdown"
      });

      try {
        const hostname = `${settings.hostname}-${Math.floor(Math.random() * 1000)}`;
        const password = Math.random().toString(36).slice(-10) + "1!";

        const dropletId = await createVPSDroplet(apiKey, hostname, specId, imageId, regionId, password);

        // Polling IP
        let ipAddress = null;
        for (let i = 0; i < 20; i++) {
          await new Promise(r => setTimeout(r, 3000));
          const drop = await getDropletInfo(apiKey, dropletId);
          ipAddress = drop?.networks?.v4?.find(n => n.type === "public")?.ip_address;
          if (ipAddress) break;
        }

        if (!ipAddress) throw new Error("Timeout waiting for IP");

        addVPS(dropletId, {
          hostname,
          dropletId,
          ip: ipAddress,
          spec: spec.name,
          os: img.name,
          region: `${reg.flag} ${reg.name}`,
          password,
          owner: chatId,
          accountIndex: accIndex
        });

        bot.sendMessage(chatId, `✅ <b>VPS CREATED!</b>\n\nIP: <code>${ipAddress}</code>\nPass: <code>${password}</code>\nLogin: <code>ssh root@${ipAddress}</code>`, { parse_mode: "HTML" });
      } catch (e) {
        bot.sendMessage(chatId, `❌ Gagal: ${e.message}`);
      }
    }

    // === LIST VPS ===
    if (data.startsWith("listdo_")) {
      const accIndex = parseInt(data.split("_")[1]);
      if (!tokens[accIndex]) return bot.answerCallbackQuery(cb.id, { text: "Token invalid" });

      try {
        bot.editMessageText("🔍 Fetching list...", { chat_id: chatId, message_id: cb.message.message_id });
        const droplets = await getListVps(tokens[accIndex].token);

        if (droplets.length === 0) return bot.editMessageText("📭 Kosong.", { chat_id: chatId, message_id: cb.message.message_id });

        const keyboard = droplets.map(d => {
          const ip = d.networks?.v4?.find(n => n.type === "public")?.ip_address || "No IP";
          return [{ text: `🖥️ ${d.name} | ${ip}`, callback_data: `vpsinfo_${accIndex}_${d.id}` }];
        });
        keyboard.push([{ text: "🔙 Kembali", callback_data: "listvpsmenu" }]);

        bot.editMessageText(`📊 List VPS - ${tokens[accIndex].name}`, {
          chat_id: chatId,
          message_id: cb.message.message_id,
          reply_markup: { inline_keyboard: keyboard }
        });
      } catch (e) {
        bot.sendMessage(chatId, `❌ Error: ${e.message}`);
      }
    }

    // === VPS INFO & DELETE ===
    if (data.startsWith("vpsinfo_")) {
      const [_, accIndex, id] = data.split("_");
      const keyboard = [
        [{ text: "🗑️ HAPUS VPS", callback_data: `confirmdel_${accIndex}_${id}` }],
        [{ text: "🔙 Kembali", callback_data: `listdo_${accIndex}` }]
      ];
      bot.editMessageText(`🖥️ VPS Info\nID: ${id}\n\nPilih aksi:`, {
        chat_id: chatId,
        message_id: cb.message.message_id,
        reply_markup: { inline_keyboard: keyboard }
      });
    }

    if (data.startsWith("confirmdel_")) {
      const [_, accIndex, id] = data.split("_");
      bot.editMessageText(`⚠️ <b>Yakin hapus VPS ${id}?</b>\nData tidak bisa kembali!`, {
        chat_id: chatId, message_id: cb.message.message_id, parse_mode: "HTML",
        reply_markup: {
          inline_keyboard: [
            [{ text: "✅ YA, HAPUS", callback_data: `dodel_${accIndex}_${id}` }],
            [{ text: "❌ BATAL", callback_data: `vpsinfo_${accIndex}_${id}` }]
          ]
        }
      });
    }

    if (data.startsWith("dodel_")) {
      const [_, accIndex, id] = data.split("_");
      if (!tokens[accIndex]) return;
      try {
        await deleteVPS(tokens[accIndex].token, id);
        bot.sendMessage(chatId, `✅ VPS ${id} dihapus.`);
      } catch (e) {
        bot.sendMessage(chatId, `❌ Gagal: ${e.message}`);
      }
    }

    // === ADDED: HANDLE LIST DO TOKENS BUTTON ===
    if (data === "listdo_menu_click") {
      bot.answerCallbackQuery(cb.id);
      const tokens = loadDoTokens();
      if (tokens.length === 0) return bot.sendMessage(chatId, "📭 Belum ada token.");
      let text = "📋 <b>DO Tokens:</b>\n\n";
      tokens.forEach((t, i) => {
        text += `${i + 1}. <b>${t.name}</b>\n<code>${t.token.slice(0, 10)}...</code>\n`;
      });
      bot.sendMessage(chatId, text, { parse_mode: "HTML" });
    }
  });

  // /listdo
  bot.onText(/^\/listdo$/i, async (msg) => {
    if (msg.from.id !== OWNER_ID) return;
    const tokens = loadDoTokens();
    if (tokens.length === 0) return bot.sendMessage(msg.chat.id, "📭 Belum ada token.");
    let text = "📋 <b>DO Tokens:</b>\n\n";
    tokens.forEach((t, i) => {
      text += `${i + 1}. <b>${t.name}</b>\n<code>${t.token.slice(0, 10)}...</code>\n`;
    });
    bot.sendMessage(msg.chat.id, text, { parse_mode: "HTML" });
  });

  // /adddo name|token
  bot.onText(/^\/adddo (.+)/i, (msg, match) => {
    if (msg.from.id !== OWNER_ID) return;
    const [name, token] = match[1].split("|");
    if (!name || !token) return bot.sendMessage(msg.chat.id, "Format: /adddo name|token");

    const tokens = loadDoTokens();
    tokens.push({ name: name.trim(), token: token.trim(), active: true });
    saveDoTokens(tokens);
    bot.sendMessage(msg.chat.id, `✅ Token ${name} saved.`);
  });

  // /deldo index
  bot.onText(/^\/deldo (\d+)/i, (msg, match) => {
    if (msg.from.id !== OWNER_ID) return;
    const index = parseInt(match[1]) - 1;
    const tokens = loadDoTokens();
    if (!tokens[index]) return bot.sendMessage(msg.chat.id, "❌ Invalid index.");
    const del = tokens.splice(index, 1);
    saveDoTokens(tokens);
    bot.sendMessage(msg.chat.id, `✅ Token ${del[0].name} deleted.`);
  });

};
