const axios = require("axios");
const crypto = require('crypto');
const fs = require("fs");
const path = require('path');
const { Client } = require("ssh2");
const { loadJsonData } = require("../lib/function");

const settings = require("../config.js");
const dev = settings.dev;
const OWNER_ID = settings.ownerId;
const ownerId = settings.ownerId;
const panel = settings.panel;
const ppNebula = "https://files.catbox.moe/sbqsli.jpg";

const OWNER_FILE = './db/users/adminID.json';
const SUBDO_FILE = './db/subdomain.json';
const PANEL_SETTINGS_FILE = './db/panel_settings.json';

function loadSubdomainConfig() {
  try {
    if (fs.existsSync(SUBDO_FILE)) {
      const raw = fs.readFileSync(SUBDO_FILE, 'utf-8');
      const parsed = JSON.parse(raw);
      if (parsed && typeof parsed === 'object') {
        global.subdomain = parsed;
        return;
      }
    }
  } catch (e) {
    console.error('Gagal membaca SUBDO_FILE:', e.message);
  }
}

function saveSubdomainConfig() {
  try {
    fs.writeFileSync(SUBDO_FILE, JSON.stringify(global.subdomain, null, 2));
  } catch (e) {
    console.error('Gagal menulis SUBDO_FILE:', e.message);
  }
}


global.subdomain = {
  "schnuffelll-node.qzz.io": {
    zone: "59c189ec8c067f57269c8e057f832c74",
    apitoken: "mZd-PC7t7PmAgjJQfFvukRStcoWDqjDvvLHAJzHF",
  },
  "pteroweb.my.id": {
    zone: "714e0f2e54a90875426f8a6819f782d0",
    apitoken: "vOn3NN5HJPut8laSwCjzY-gBO0cxeEdgSLH9WBEH",
  },
  "panelwebsite.biz.id": {
    zone: "2d6aab40136299392d66eed44a7b1122",
    apitoken: "CcavVSmQ6ZcGSrTnOos-oXnawq4yf86TUhmQW29S"
  },
  "privatserver.my.id": {
    zone: "699bb9eb65046a886399c91daacb1968",
    apitoken: "CcavVSmQ6ZcGSrTnOos-oXnawq4yf86TUhmQW29S"
  },
  "serverku.biz.id": {
    zone: "4e4feaba70b41ed78295d2dcc090dd3a",
    apitoken: "CcavVSmQ6ZcGSrTnOos-oXnawq4yf86TUhmQW29S"
  },
  "vipserver.web.id": {
    zone: "e305b750127749c9b80f41a9cf4a3a53",
    apitoken: "N-cpny6vwi620Tfq4vTF4KGjeJIXdUCax3dZArCqnT"
  },
};
loadSubdomainConfig();

const userStates = new Map();
let lastMessageContent = {};
const debugStates = {};

const swingsStates = {};
const subdoStates = {};
module.exports = (bot) => {
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

  // anti ddos
  bot.onText(/^\/antiddos(?:\s+(.+))?$/i, async (msg, match) => {
    const chatId = msg.chat.id;
    const userArg = (match[1] || "").trim().toLowerCase();

    if (!userArg || !["on", "off"].includes(userArg)) {
      return bot.sendMessage(chatId, "⚠ Format: /antiddos on atau /antiddos off");
    }

    const token = settings.cfApiToken;
    const zoneId = settings.cfZoneId;
    if (!token || !zoneId) {
      return bot.sendMessage(chatId, "❌ Konfigurasi Cloudflare belum lengkap (cfApiToken/cfZoneId).");
    }

    try {
      const url = `https://api.cloudflare.com/client/v4/zones/${zoneId}/settings/security_level`;
      const value = userArg === "on" ? "under_attack" : "essentially_off";

      const res = await axios.patch(url, {
        value
      }, {
        headers: {
          "Authorization": `Bearer ${token}`,
          "Content-Type": "application/json"
        },
        timeout: 15000
      });

      if (res.data && res.data.success) {
        const statusRes = await axios.get(url, {
          headers: {
            "Authorization": `Bearer ${token}`,
            "Content-Type": "application/json"
          },
          timeout: 10000
        });

        const current = statusRes.data && statusRes.data.result && statusRes.data.result.value
          ? statusRes.data.result.value
          : "unknown";

        const friendly = current === "under_attack" ? "✅ Under Attack, Mode? ON" : current === "essentially_off" ? "✅ Under Attack, Mode? OFF" : `ℹ️ Status: ${current}`;

        return bot.sendMessage(chatId, `Sukses, pengaturan diubah.\n${friendly}`);
      } else {
        const errMsg = res.data && res.data.errors && res.data.errors.length ? res.data.errors.map(e => e.message).join(",") : "Unknown error";
        return bot.sendMessage(chatId, `❌ Gagal mengubah setting Cloudflare\n${errMsg}`);
      }
    } catch (err) {
      return bot.sendMessage(chatId, `❌ Request error\n${err.response && err.response.data ? JSON.stringify(err.response.data) : err.message}`);
    }
  });

  // spek vps
  bot.onText(/^\/spekvps (.+)$/, async (msg, match) => {
    const chatId = msg.chat.id;
    const userInput = match[1].trim();

    const [host, password] = userInput.split(",");
    const username = "root";

    if (!host || !password) {
      return bot.sendMessage(chatId, "❌ Format salah!\nContoh: `/spekvps 1.2.3.4,password`", { parse_mode: "Markdown" });
    }

    bot.sendMessage(chatId, "🔌 Menghubungkan ke VPS...");

    const conn = new Client();
    conn
      .on("ready", () => {
        const commands = [
          "echo '=== CPU Info ===' && lscpu | grep 'Model name'",
          "echo '=== Core Count ===' && nproc",
          "echo '=== RAM ===' && free -m | awk 'NR==2{print $2\" MB Total, \"$3\" MB Used, \"$4\" MB Free\"}'",
          "echo '=== Disk ===' && df -h --total | grep total",
          "echo '=== OS ===' && lsb_release -a 2>/dev/null || cat /etc/os-release | grep PRETTY_NAME",
          "echo '=== Kernel ===' && uname -r",
          "echo '=== Uptime ===' && uptime -p"
        ];

        conn.exec(commands.join(" && echo '---' && "), (err, stream) => {
          if (err) return bot.sendMessage(chatId, "❌ Error eksekusi perintah: " + err.message);

          let output = "";
          stream.on("data", (data) => {
            output += data.toString();
          });

          stream.on("close", () => {
            bot.sendMessage(chatId, "📊 Spesifikasi VPS:\n\n```\n" + output + "\n```", { parse_mode: "Markdown", reply_to_message_id: msg.message_id });
            conn.end();
          });
        });
      })
      .on("error", (err) => {
        bot.sendMessage(chatId, "❌ Gagal koneksi: " + err.message);
      })
      .connect({
        host,
        port: 22,
        username,
        password,
      });
  });

  // cpuvps
  bot.onText(/\/cpuvps (.+)/, async (msg, match) => {
    const chatId = msg.chat.id;
    const args = match[1].split(",");

    if (args.length < 2) {
      return bot.sendMessage(chatId, "⚠️ Format salah!\nGunakan: `/cpuvps ip_vps,password`", { parse_mode: "Markdown" });
    }

    const ip = args[0].trim();
    const password = args[1].trim();

    bot.sendMessage(chatId, `🔄 Mengecek CPU VPS *${ip}*...`, { parse_mode: "Markdown" });

    const conn = new Client();

    conn
      .on("ready", () => {
        conn.exec("top -bn1 | grep 'Cpu(s)'", (err, stream) => {
          if (err) {
            bot.sendMessage(chatId, `❌ Gagal eksekusi command di ${ip}`);
            conn.end();
            return;
          }

          let data = "";
          stream
            .on("data", (chunk) => {
              data += chunk.toString();
            })
            .on("close", () => {
              conn.end();

              // Parsing CPU dari output top
              const matchCpu = data.match(/(\d+\.\d+)\s*id/); // ambil idle
              if (matchCpu) {
                const idle = parseFloat(matchCpu[1]);
                const used = (100 - idle).toFixed(2);
                bot.sendMessage(chatId, `📊 Total CPU VPS: *${used}%*`, {
                  parse_mode: "Markdown",
                  reply_to_message_id: msg.message_id
                });
              } else {
                bot.sendMessage(chatId, `⚠️ Gagal parsing data CPU dari VPS *${ip}*`);
              }
            });
        });
      })
      .on("error", (err) => {
        console.error(err);
        bot.sendMessage(chatId, `❌ Gagal koneksi ke VPS *${ip}*\nPesan: ${err.message}`, { parse_mode: "Markdown" });
      })
      .connect({
        host: ip,
        port: 22,
        username: "root",
        password: password,
      });
  });

  // createnode
  bot.onText(/^(\.|\#|\/)createnode(?:\s+(.+))?$/i, async (msg, match) => {
    const chatId = msg.chat.id;
    const fromId = String(msg.from.id);
    const paramText = match[2];
    const owners = loadJsonData(OWNER_FILE);

    if (!owners.includes(fromId)) {
      return bot.sendMessage(chatId, "❌ ᴋʜᴜꜱᴜꜱ ᴏᴡɴᴇʀ!");
    }

    // kalau langsung dikasih semua param
    if (paramText) {
      const parts = paramText.split(',').map(x => x.trim());
      if (parts.length < 4) {
        return bot.sendMessage(chatId, `❌ Format salah!\nContoh: /createnode ipvps,password,domainnode,ramvps`, { parse_mode: 'Markdown' });
      }
      return runCreateNode(chatId, msg, {
        ipvps: parts[0],
        passwd: parts[1],
        domainnode: parts[2],
        ramvps: parts[3]
      });
    }

    // mode interaktif
    userStates[chatId] = { step: 'ip', data: {}, type: 'createnode', userId: fromId };
    return bot.sendMessage(chatId, "📌 ᴍᴀꜱᴜᴋᴋᴀɴ ɪᴘ ᴠᴘꜱ:");
  });

  bot.on("message", async (msg) => {
    const chatId = msg.chat.id;
    const text = (msg.text || "").trim();
    if (!text || text.startsWith("/")) return;

    const state = userStates[chatId];
    if (!state || state.type !== "createnode") return;

    switch (state.step) {
      case "ip":
        state.data.ipvps = text;
        state.step = "pass";
        return bot.sendMessage(chatId, "🔑 ᴍᴀꜱᴜᴋᴋᴀɴ ᴘᴀꜱꜱᴡᴏʀᴅ ᴠᴘꜱ:");
      case "pass":
        state.data.passwd = text;
        state.step = "domain";
        return bot.sendMessage(chatId, "🛰 ᴍᴀꜱᴜᴋᴋᴀɴ ᴅᴏᴍᴀɪɴ ɴᴏᴅᴇ:");
      case "domain":
        state.data.domainnode = text;
        state.step = "ram";
        return bot.sendMessage(chatId, "💾 ᴍᴀꜱᴜᴋᴋᴀɴ ʀᴀᴍ ᴠᴘꜱ:\nContoh 16GB: 1600000");
      case "ram":
        state.data.ramvps = text;
        const d = state.data;
        state.step = "confirm";
        return bot.sendMessage(chatId,
          `📋 *Konfirmasi Data Node :*

🌐 IP VPS: ${d.ipvps}
🛰 Domain: ${d.domainnode}
💾 RAM: ${d.ramvps}

Ketik *yes* untuk lanjut atau *cancel* untuk batal.`,
          { parse_mode: "Markdown" }
        );
      case "confirm":
        if (/^yes$/i.test(text)) {
          const payload = { ...state.data };
          delete userStates[chatId];
          return runCreateNode(chatId, msg, payload);
        } else {
          delete userStates[chatId];
          return bot.sendMessage(chatId, "❌ Proses dibatalkan.");
        }
    }
  });



  // Membuat Node di panel Pterodactyl via Application API
  async function createPanelNode(domainnode, ramvps, chatId) {
    try {
      const panelSettings = loadJsonData(PANEL_SETTINGS_FILE) || {};
      const domain = panelSettings.domain;
      const plta = panelSettings.plta;

      if (!domain || !plta || domain === "-" || plta === "-") {
        // Panel belum dikonfigurasi, skip auto-create node
        return bot.sendMessage(
          chatId,
          "⚠️ Panel belum di-set di /seturl & /setplta, jadi bot tidak bisa auto-create node di panel. Node Wings di VPS tetap terinstall.",
          { parse_mode: "Markdown" }
        ).catch(() => { });
      }

      const fqdn = String(domainnode || "").trim();
      if (!fqdn) {
        return bot.sendMessage(
          chatId,
          "⚠️ Domain node kosong, skip auto-create node di panel.",
          { parse_mode: "Markdown" }
        ).catch(() => { });
      }

      const cleanRam = parseInt(String(ramvps || "").replace(/[^0-9]/g, ""), 10) || 0;
      const memory = cleanRam;
      const disk = cleanRam; // simple: samakan disk dengan ram input

      const name = fqdn.split(".")[0] || fqdn;
      const scheme = "https"; // default: gunakan https + behind_proxy untuk Cloudflare

      const payload = {
        name,
        description: "Node dibuat otomatis via bot Schnuffelll",
        location_id: 4,
        fqdn,
        scheme,
        behind_proxy: true,
        maintenance_mode: false,
        public: true,
        memory,
        memory_overallocate: 0,
        disk,
        disk_overallocate: 0,
        upload_size: 100,
        daemon_base: "/var/lib/pterodactyl/volumes",
        daemon_sftp: 2022,
        daemon_listen: 8080
      };

      const res = await axios.post(
        `${domain}/api/application/nodes`,
        payload,
        {
          headers: {
            "Content-Type": "application/json",
            Accept: "application/json",
            Authorization: `Bearer ${plta}`
          },
          timeout: 20000
        }
      );

      const data = res.data && res.data.attributes ? res.data.attributes : null;
      if (!data) {
        return bot.sendMessage(
          chatId,
          "⚠️ Respon panel tidak mengembalikan data node. Cek panel manual di menu Nodes.",
          { parse_mode: "Markdown" }
        ).catch(() => { });
      }

      let info = "✅ *Node di panel berhasil dibuat otomatis!*\n\n";
      info += `• ID: \`${data.id}\`\n`;
      info += `• Name: \`${data.name}\`\n`;
      info += `• FQDN: \`${data.fqdn}\``;

      return bot.sendMessage(chatId, info, { parse_mode: "Markdown" }).catch(() => { });
    } catch (error) {
      console.error("Gagal auto-create node di panel:", error.response?.data || error.message);
      return bot.sendMessage(
        chatId,
        "⚠️ Wings di VPS sudah terinstall, tapi auto-create node di panel gagal. Cek log bot / panel dan buat node manual di Admin » Nodes.",
        { parse_mode: "Markdown" }
      ).catch(() => { });
    }
  }

  // fungsi eksekusi SSH

  function runCreateNode(chatId, msg, { ipvps, passwd, domainnode, ramvps }) {
    const conn = new Client();
    const connSettings = { host: ipvps, port: 22, username: 'root', password: passwd };

    conn.on('ready', () => {
      bot.sendMessage(chatId, '📡 ᴍᴇᴍᴘʀᴏꜱᴇꜱ ᴄʀᴇᴀᴛᴇ ɴᴏᴅᴇ...\n⏳ Tunggu 5-15 menit hingga selesai.', { parse_mode: 'Markdown' });

      // Use shell instead of exec for interactive scripts
      conn.shell((err, stream) => {
        if (err) {
          bot.sendMessage(chatId, '❌ Terjadi kesalahan saat membuka shell.');
          return conn.end();
        }

        let outputBuffer = '';
        let inputsSent = false;
        let installComplete = false;

        stream.on('close', async () => {
          if (!installComplete) {
            installComplete = true;
            // Coba auto-create Node di panel pakai Application API
            await createPanelNode(domainnode, ramvps, chatId);

            // Notifikasi utama ke user
            bot.sendMessage(chatId, `
<b>✅ Sukses Create Node (Wings + Panel)!</b>
<blockquote expandable>⚠️ <b>Token Deployment</b>
1. Login panel Pterodactyl
2. Buka menu <b>Nodes</b> dan pilih node yang sesuai
3. Klik tab "Configuration"
4. Auto Generate Token, salin
5. Ketik /swings ipvps,pwvps,token
</blockquote>`, { parse_mode: 'HTML', reply_to_message_id: msg.message_id });
          }
          conn.end();
        });

        stream.on('data', (data) => {
          const out = data.toString();
          outputBuffer += out;
          console.log('STDOUT:', out);

          // Detect prompts and send appropriate inputs with delays
          if (!inputsSent) {
            inputsSent = true;
            // Start installer with delays between inputs
            stream.write('bash <(curl -s https://raw.githubusercontent.com/NinoNeoxus/Node/refs/heads/main/install.sh)\n');

            // Send inputs with proper delays
            setTimeout(() => stream.write('schnuffellllganteng\n'), 3000);
            setTimeout(() => stream.write('4\n'), 5000);
            setTimeout(() => stream.write('SG\n'), 7000);
            setTimeout(() => stream.write('@schnuffelllldev\n'), 9000);
            setTimeout(() => stream.write(`${domainnode}\n`), 11000);
            setTimeout(() => stream.write('NODE BY SCHNUFFELLLL\n'), 13000);
            setTimeout(() => stream.write(`${ramvps}\n`), 15000);
            setTimeout(() => stream.write(`${ramvps}\n`), 17000);
            setTimeout(() => stream.write('1\n'), 19000);

            // Close stream after sufficient time for installation
            setTimeout(() => {
              stream.write('exit\n');
            }, 5 * 60 * 1000); // Wait 5 minutes for installation
          }
        });

        stream.stderr.on('data', (data) => {
          console.log('STDERR:', data.toString());
        });
      });
    }).on('error', (err) => {
      console.log('Connection Error:', err);
      bot.sendMessage(chatId, '❌ Katasandi atau IP tidak valid!');
    }).connect(connSettings);
  }

  // refresh vps
  bot.onText(/^\/refreshvps (.+),(.+)$/, async (msg, match) => {
    const chatId = msg.chat.id;
    const ip = match[1];
    const password = match[2];

    const conn = new Client();
    bot.sendMessage(chatId, `🔄 Memproses clear cache VPS`, { reply_to_message_id: msg.message_id });

    conn.on('ready', () => {
      conn.exec(
        `cd /var/www/pterodactyl && php artisan config:clear && php artisan route:clear && php artisan view:clear && php artisan cache:clear && php artisan optimize`,
        (err, stream) => {
          if (err) {
            bot.sendMessage(chatId, `❌ Error eksekusi command: ${err.message}`);
            conn.end();
            return;
          }

          let output = '';
          stream.on('data', (data) => {
            output += data.toString();
          });

          stream.stderr.on('data', (data) => {
            output += data.toString();
          });

          stream.on('close', (code) => {
            bot.sendMessage(chatId, `✅ Refresh VPS selesai!`, { parse_mode: "Markdown", reply_to_message_id: msg.message_id });
            conn.end();
          });
        }
      );
    }).connect({
      host: ip,
      port: 22,
      username: 'root',
      password: password
    });

    conn.on('error', (err) => {
      bot.sendMessage(chatId, `❌ Gagal konek ke VPS: ${err.message}`);
    });
  });

  // runtime vps
  bot.onText(/^\/runtimevps(?:\s+(.+))?/, async (msg, match) => {
    const chatId = msg.chat.id;
    const input = match[1];

    if (!input) {
      return bot.sendMessage(chatId, "❌ Format salah!\nContoh: /runtimevps ipvps|pwvps");
    }

    if (!input.includes(",")) {
      return bot.sendMessage(chatId, "❌ Format salah!\nContoh:\n/runtimevps ipvps,password", {
        parse_mode: "Markdown"
      });
    }

    let [host, password] = input.split(",");
    host = host.trim();
    password = password.trim();

    try {
      const conn = new Client();

      conn
        .on("ready", () => {
          conn.exec("uptime -p", (err, stream) => {
            if (err) {
              bot.sendMessage(chatId, "❌ Gagal eksekusi command uptime.");
              return conn.end();
            }

            let output = "";
            stream
              .on("data", (data) => {
                output += data.toString();
              })
              .on("close", () => {
                bot.sendMessage(chatId, `✅ ʀᴜɴᴛɪᴍᴇ ᴠᴘꜱ ${host}\n\`\`\`${output.trim()}\`\`\``, {
                  parse_mode: "Markdown"
                });
                conn.end();
              });
          });
        })
        .on("error", (err) => {
          bot.sendMessage(chatId, `❌ Gagal konek VPS: ${err.message}`);
        })
        .connect({
          host,
          port: 22,
          username: "root",
          password
        });

    } catch (err) {
      bot.sendMessage(chatId, "❌ Terjadi kesalahan koneksi VPS.");
      console.error(err);
    }
  });

  // subdomain
  bot.onText(/^\/subdo(?:\s+(.+))?/, async (msg, match) => {
    notifyOwner('subdo', msg);
    const chatId = msg.chat.id;
    const owners = loadJsonData(OWNER_FILE);

    if (!owners.includes(msg.from.id.toString())) {
      return bot.sendMessage(chatId, "❌ ᴋʜᴜꜱᴜꜱ ᴏᴡɴᴇʀ!");
    }

    const text = match[1];
    if (!text) {
      return bot.sendMessage(chatId, "❌ Format salah!\nContoh: /subdo reqname,ipvps");
    }

    if (!text.includes(",")) return bot.sendMessage(chatId, "❌ Format salah!\nContoh: `/subdo reqname,ipvps`", { parse_mode: "Markdown" });

    const [host, ip] = text.split(",").map(i => i.trim());
    const dom = Object.keys(global.subdomain);

    if (dom.length === 0) return bot.sendMessage(chatId, "❌ Tidak ada domain yang tersedia saat ini.");

    const onlineDomains = Object.keys(global.subdomain);
    if (onlineDomains.length === 0) return bot.sendMessage(chatId, "❌ Tidak ada domain yang tersedia saat ini.");

    // Create a simpler selection menu
    const keyboard = onlineDomains.map((d, i) => ([{
      text: `🌐 ${d}`,
      callback_data: `select_domain_${i}_${host}_${ip}`
    }]));

    keyboard.push([{ text: "❌ Batalkan", callback_data: "closemenu" }]);

    bot.sendMessage(chatId, `🔹 *Pilih Domain Utama*\n\nSubdomain yang akan dibuat:\n• Panel: \`${host}.domain\`\n• Node: \`node-${host}.domain\`\n• IP: \`${ip}\`\n\n👇 *Klik domain di bawah ini:*`, {
      parse_mode: "Markdown",
      reply_markup: {
        inline_keyboard: keyboard
      }
    });
  });

  // handler select domain (REPLACES old create_domain logic)
  bot.on("callback_query", async (callbackQuery) => {
    const data = callbackQuery.data;
    const chatId = callbackQuery.message.chat.id;

    if (data.startsWith("select_domain_")) {
      const parts = data.split("_");
      const idx = parseInt(parts[2]);
      const host = parts[3];
      const ip = parts[4];

      const domains = Object.keys(global.subdomain);
      if (!domains[idx]) return bot.answerCallbackQuery(callbackQuery.id, { text: "Domain invalid!" });

      // Trigger creation
      const tldnya = domains[idx];
      bot.editMessageText(`⏳ Membuat subdomain di *${tldnya}*...\nHost: ${host}\nIP: ${ip}`, {
        chat_id: chatId,
        message_id: callbackQuery.message.message_id,
        parse_mode: "Markdown"
      });

      async function createSubDomain(host, ip) {
        try {
          const baseHost = host.replace(/[^a-z0-9.-]/gi, "");
          const cleanIp = ip.replace(/[^0-9.]/gi, "");

          const url = `https://api.cloudflare.com/client/v4/zones/${global.subdomain[tldnya].zone}/dns_records`;
          const headers = {
            "Authorization": `Bearer ${global.subdomain[tldnya].apitoken}`,
            "Content-Type": "application/json"
          };

          // subdomain panel
          const panelName = `${baseHost}.${tldnya}`;
          const resPanel = await axios.post(
            url,
            {
              type: "A",
              name: panelName,
              content: cleanIp,
              ttl: 1,
              proxied: false // Proxy OFF (Gray cloud) to prevent SSL/WS errors
            },
            { headers }
          );

          // subdomain node
          const nodeName = `node-${baseHost}.${tldnya}`;
          const resNode = await axios.post(
            url,
            {
              type: "A",
              name: nodeName,
              content: cleanIp,
              ttl: 1,
              proxied: false // Proxy OFF (Gray cloud) for Node connection
            },
            { headers }
          );

          const dataPanel = resPanel.data;
          const dataNode = resNode.data;

          if (dataPanel.success && dataNode.success) {
            return {
              success: true,
              panel: panelName,
              node: nodeName,
              ip: cleanIp
            };
          } else {
            return { success: false, error: "Gagal membuat subdomain (Cloudflare Refused)" };
          }
        } catch (e) {
          const errorMsg = e.response?.data?.errors?.[0]?.message || e.message || "Terjadi kesalahan";
          return { success: false, error: errorMsg };
        }
      }

      const result = await createSubDomain(host, ip);

      if (result.success) {
        bot.editMessageText(`✅ *Sukses Membuat Subdomain!*
              
🌐 *Domain Panel:* \`${result.panel}\`
🛰️ *Domain Node:* \`${result.node}\`
📌 *IP Address:* \`${result.ip}\`

_Note: Proxy Panel ON, Proxy Node OFF_`, {
          chat_id: chatId,
          message_id: callbackQuery.message.message_id,
          parse_mode: "Markdown"
        });
      } else {
        bot.editMessageText(`❌ Gagal: ${result.error}`, {
          chat_id: chatId,
          message_id: callbackQuery.message.message_id
        });
      }

    }
  });

  // handler subdomain
  bot.on("callback_query", async (callbackQuery) => {
    const msg = callbackQuery.message;
    const data = callbackQuery.data.split(" ");

    if (data[0] === "create_domain") {
      /*if (callbackQuery.from.id !== ownerId) {
          return bot.answerCallbackQuery(callbackQuery.id, { text: "❌ Owner only!", show_alert: true });
      }*/

      const domainIndex = Number(data[1]);
      const dom = Object.keys(global.subdomain);

      if (domainIndex < 0 || domainIndex >= dom.length) return bot.sendMessage(msg.chat.id, "Domain tidak ditemukan!");
      if (!data[2] || !data[2].includes(",")) return bot.sendMessage(msg.chat.id, "Hostname/IP tidak ditemukan!");

      const tldnya = dom[domainIndex];
      const [host, ip] = data[2].split(",").map(item => item.trim());

      async function createSubDomain(host, ip) {
        try {
          const baseHost = host.replace(/[^a-z0-9.-]/gi, "");
          const cleanIp = ip.replace(/[^0-9.]/gi, "");

          const url = `https://api.cloudflare.com/client/v4/zones/${global.subdomain[tldnya].zone}/dns_records`;
          const headers = {
            "Authorization": `Bearer ${global.subdomain[tldnya].apitoken}`,
            "Content-Type": "application/json"
          };

          // subdomain panel
          const panelName = `${baseHost}.${tldnya}`;
          const resPanel = await axios.post(
            url,
            {
              type: "A",
              name: panelName,
              content: cleanIp,
              ttl: 1,
              proxied: false
            },
            { headers }
          );

          // subdomain node
          const nodeName = `node-${baseHost}.${tldnya}`;
          const resNode = await axios.post(
            url,
            {
              type: "A",
              name: nodeName,
              content: cleanIp,
              ttl: 1,
              proxied: false
            },
            { headers }
          );

          const dataPanel = resPanel.data;
          const dataNode = resNode.data;

          if (dataPanel.success && dataNode.success) {
            return {
              success: true,
              panel: panelName,
              node: nodeName,
              ip: cleanIp
            };
          } else {
            return { success: false, error: "Gagal membuat subdomain panel/node" };
          }
        } catch (e) {
          const errorMsg = e.response?.data?.errors?.[0]?.message || e.message || "Terjadi kesalahan";
          return { success: false, error: errorMsg };
        }
      }

      const result = await createSubDomain(host.toLowerCase(), ip);

      if (result.success) {
        let teks = `
✅ *Sukses membuat Subdomain!*

🌐 *ᴅᴏᴍᴀɪɴ ᴘᴀɴᴇʟ:* \`${result.panel}\`
🛰️ *ᴅᴏᴍᴀɪɴ ɴᴏᴅᴇ:* \`${result.node}\`
📌 *ɪᴘ ᴠᴘs:* \`${result.ip}\`
`;
        await bot.sendMessage(msg.chat.id, teks, { parse_mode: "Markdown", reply_to_message_id: msg.message_id });
      } else {
        await bot.sendMessage(msg.chat.id, `❌ Gagal membuat subdomain:\n${result.error}`);
      }

      bot.answerCallbackQuery(callbackQuery.id);
    }
  });

  bot.onText(/^\/listsubdo$/, async (msg) => {
    const chatId = msg.chat.id;
    const owners = loadJsonData(OWNER_FILE);

    if (!owners.includes(msg.from.id.toString())) {
      return bot.sendMessage(chatId, "❌ ᴋʜᴜꜱᴜꜱ ᴏᴡɴᴇʀ!");
    }

    const dom = Object.keys(global.subdomain);
    if (dom.length === 0) {
      return bot.sendMessage(chatId, "❌ Tidak ada domain yang tersedia saat ini.");
    }

    let teks = `📜 *ᴅᴀꜰᴛᴀʀ ᴅᴏᴍᴀɪɴ ʏᴀɴɢ ᴛᴇʀꜱᴇᴅɪᴀ*\n\n`;
    dom.forEach((d, i) => {
      teks += `${i + 1}. \`${d}\`\n`;
    });

    bot.sendMessage(chatId, teks, { parse_mode: "Markdown", reply_to_message_id: msg.message_id });
  });

  // update subdomain slot: /upsubdo <nomor>
  bot.onText(/^\/upsubdo(?:\s+(\d+))?$/i, async (msg, match) => {
    const chatId = msg.chat.id;
    const owners = loadJsonData(OWNER_FILE);

    if (!owners.includes(msg.from.id.toString())) {
      return bot.sendMessage(chatId, "❌ ᴋʜᴜꜱᴜꜱ ᴏᴡɴᴇʀ!");
    }

    const dom = Object.keys(global.subdomain);
    if (dom.length === 0) {
      return bot.sendMessage(chatId, "❌ Belum ada domain yang tersimpan.");
    }

    let idx = match[1] ? parseInt(match[1], 10) - 1 : -1;
    if (isNaN(idx) || idx < 0 || idx >= dom.length) {
      let teks = "⚠️ Slot tidak valid.\n\nSlot yang tersedia:\n";
      dom.forEach((d, i) => {
        teks += `${i + 1}. \`${d}\`\n`;
      });
      teks += "\nGunakan: /upsubdo <nomor>";
      return bot.sendMessage(chatId, teks, { parse_mode: 'Markdown' });
    }

    const key = dom[idx];
    subdoStates[chatId] = {
      mode: 'update',
      step: 'domain',
      index: idx,
      oldKey: key,
      data: {}
    };

    let teks = `✏️ *Update Subdomain Slot ${idx + 1}*\nDomain saat ini: \`${key}\`\n\nKirim domain baru untuk slot ini (contoh: pteroweb.my.id):`;
    return bot.sendMessage(chatId, teks, { parse_mode: 'Markdown' });
  });

  // tambah slot subdomain baru: /addsubdo
  bot.onText(/^\/addsubdo$/i, async (msg) => {
    const chatId = msg.chat.id;
    const owners = loadJsonData(OWNER_FILE);

    if (!owners.includes(msg.from.id.toString())) {
      return bot.sendMessage(chatId, "❌ ᴋʜᴜꜱᴜꜱ ᴏᴡɴᴇʀ!");
    }

    const dom = Object.keys(global.subdomain);
    const nextIndex = dom.length + 1;

    subdoStates[chatId] = {
      mode: 'add',
      step: 'domain',
      index: nextIndex - 1,
      oldKey: null,
      data: {}
    };

    const teks = `➕ *Tambah Slot Subdomain Baru*\nIni akan menjadi slot nomor *${nextIndex}*.\n\nKirim domain untuk slot ini (contoh: panelbaru.my.id):`;
    return bot.sendMessage(chatId, teks, { parse_mode: 'Markdown' });
  });


  // install depend tema
  bot.onText(/^\/installdepend (.+)$/, async (msg, match) => {
    const chatId = msg.chat.id;
    const text = match[1];

    const owners = loadJsonData(OWNER_FILE);

    if (!owners.includes(msg.from.id.toString())) {
      return bot.sendMessage(chatId, "❌ ᴋʜᴜꜱᴜꜱ ᴏᴡɴᴇʀ!");
    }

    if (!text.includes(",")) {
      return bot.sendMessage(chatId, "⚠️ Format: /installdepend IpVps,PwVps");
    }

    const [ipvps, passwd] = text.split(",").map(item => item.trim());
    if (!ipvps || !passwd) {
      return bot.sendMessage(chatId, "⚠️ Format: /installdepend IpVps,PwVps");
    }

    const loadingMsg = await bot.sendMessage(chatId, "🔍 ᴍᴇɴɢᴜʟᴀꜱ ᴋᴏɴᴇᴋꜱɪ ᴠᴘꜱ...", { reply_to_message_id: msg.message_id });
    lastMessageContent[chatId] = "🔍 ᴍᴇɴɢᴜʟᴀꜱ ᴋᴏɴᴇᴋꜱɪ ᴠᴘꜱ...";

    const connSettings = {
      host: ipvps,
      port: 22,
      username: "root",
      password: passwd,
      readyTimeout: 15000
    };

    const command = `bash <(curl -s https://raw.githubusercontent.com/KiwamiXq1031/installer-premium/refs/heads/main/zero.sh)`;
    const conn = new Client();

    const progressStages = [
      "🔍 ᴍᴇɴɢᴜʟᴀꜱ ᴋᴏɴᴇᴋꜱɪ ᴠᴘꜱ...",
      "✅ ᴋᴏɴᴇᴋꜱɪ ʙᴇʀʜᴀꜱɪʟ",
      "📦 ᴍᴇɴɢɪɴꜱᴛᴀʟ ᴘᴀᴋᴇᴛ ᴅᴇᴘᴇɴᴅᴇɴꜱɪ...",
      "⚡ ᴍᴇᴍᴘʀᴏꜱᴇꜱ ꜱᴇʟᴇꜱᴀɪ..."
    ];

    let currentStage = 0;

    const updateProgress = async (newText) => {
      if (lastMessageContent[chatId] !== newText) {
        try {
          await bot.editMessageText(newText, {
            chat_id: chatId,
            reply_to_message_id: msg.message_id,
            message_id: loadingMsg.message_id
          });
          lastMessageContent[chatId] = newText;
        } catch (error) {
          if (!error.message.includes('message is not modified')) {
            console.error('Edit message error:', error.message);
          }
        }
      }
    };

    conn
      .on("ready", async () => {
        const newText = `✅ Koneksi Berhasil!
Silahkan tunggu 10-20 menit...

⏳ ᴍᴇᴍᴘʀᴏꜱᴇꜱ ɪɴꜱᴛᴀʟʟ ᴅᴇᴘᴇɴᴅ`;
        await updateProgress(newText);

        conn.exec(command, (err, stream) => {
          if (err) {
            updateProgress("❌ ɢᴀɢᴀʟ ᴍᴇɴɢᴇᴋꜱᴇᴋᴜꜱɪ ᴄᴏᴍᴍᴀɴᴅ!");
            return conn.end();
          }

          let progressUpdated = false;

          stream
            .on("close", async () => {
              try {
                await bot.deleteMessage(chatId, loadingMsg.message_id);
                delete lastMessageContent[chatId];
                await bot.sendMessage(chatId, `✅ ʙᴇʀʜᴀꜱɪʟ ɪɴꜱᴛᴀʟʟ ᴅᴇᴘᴇɴᴅ!`);
              } catch (error) {
                console.error('Delete message error:', error.message);
              }
              conn.end();
            })
            .on("data", (data) => {
              const output = data.toString();
              console.log("OUTPUT:", output);

              if (!progressUpdated && output.includes("Installing")) {
                updateProgress("📦 ᴍᴇɴɢɪɴꜱᴛᴀʟ ᴘᴀᴋᴇᴛ ᴅᴇᴘᴇɴᴅᴇɴꜱɪ...\n⏰ ᴛᴜɴɢɢᴜ ꜱᴇʙᴇɴᴛᴀʀ");
                progressUpdated = true;
              }

              // zero.sh updated its menu – option 13 installs plugin/theme dependencies
              stream.write("13\n");
              // previously this sent "A" to select all dependencies. Keep existing answer flow
              stream.write("A\n");
              stream.write("Y\n");
              stream.write("Y\n");
            })
            .stderr.on("data", (data) => {
              console.log("ERROR:", data.toString());
            });
        });
      })
      .on("error", async (err) => {
        console.error("SSH Error:", err.message);
        await updateProgress("❌ Kata sandi/IP tidak valid!");
      })
      .on("end", () => {
        console.log("SSH Connection closed");
      })
      .connect(connSettings);
  });

  // instal tema bg
  bot.onText(/^\/installtemabg (.+),(.+)$/, async (msg, match) => {
    const chatId = msg.chat.id;
    const ipvps = match[1];
    const pwvps = match[2];

    bot.sendMessage(chatId, "📸 Kirim link foto background:", { reply_to_message_id: msg.message_id });

    bot.once("message", async (reply) => {
      /*if (!reply.text.startsWith("http")) {
        return bot.sendMessage(chatId, "❌ Link tidak valid!");
      }*/

      const imageUrl = reply.text;

      const conn = new Client();
      conn.on("ready", () => {
        conn.shell((err, stream) => {
          if (err) {
            bot.sendMessage(chatId, "❌ Gagal membuka shell!");
            return conn.end();
          }

          stream.on("close", (code) => {
            conn.end();
            // Check exit code for background change
            if (code === 0 || code === undefined) {
              bot.sendMessage(chatId, "✅ Selesai ubah background!");
            } else {
              bot.sendMessage(chatId, `❌ Gagal ubah background. Script keluar dengan kode ${code}. Cek log di VPS.`);
            }
          }).on("data", (data) => {
            console.log("STDOUT: " + data.toString());
          }).stderr.on("data", (data) => {
            console.log("STDERR: " + data.toString());
          });

          // jalankan script
          stream.write("bash <(curl -s https://raw.githubusercontent.com/KiwamiXq1031/installer-premium/refs/heads/main/zero.sh)\n");

          // pilih opsi 9 (ubah background)
          setTimeout(() => {
            // zero.sh menu changed: option 9 modifies the background
            stream.write("9\n");
          }, 3000);

          // masukkan link foto
          setTimeout(() => {
            stream.write(imageUrl + "\n");
          }, 6000);

          setTimeout(() => {
            stream.write("y\n");
          }, 3000);
        });
      }).connect({
        host: ipvps,
        port: 22,
        username: "root",
        password: pwvps,
      });
    });
  });

  // uninstall tema bg
  bot.onText(/^\/uninstalltemabg (.+),(.+)$/, async (msg, match) => {
    const chatId = msg.chat.id;
    const ipvps = match[1];
    const pwvps = match[2];

    /*if (!reply.text.startsWith("http")) {
      return bot.sendMessage(chatId, "❌ Link tidak valid!");
    }*/

    const conn = new Client();
    conn.on("ready", () => {
      // Success/failure message will be sent after script finishes
      conn.shell((err, stream) => {
        if (err) {
          bot.sendMessage(chatId, "❌ Gagal membuka shell!");
          return conn.end();
        }

        stream.on("close", (code) => {
          conn.end();
          // Check exit code for uninstall background
          if (code === 0 || code === undefined) {
            bot.sendMessage(chatId, "✅ Selesai hapus background!");
          } else {
            bot.sendMessage(chatId, `❌ Gagal hapus background. Script keluar dengan kode ${code}. Cek log di VPS.`);
          }
        }).on("data", (data) => {
          console.log("STDOUT: " + data.toString());
        }).stderr.on("data", (data) => {
          console.log("STDERR: " + data.toString());
        });

        // jalankan script
        stream.write("bash <(curl -s https://raw.githubusercontent.com/KiwamiXq1031/installer-premium/refs/heads/main/zero.sh)\n");

        // pilih opsi 10 (hapus background)
        setTimeout(() => {
          // zero.sh menu changed: option 10 resets the background to default
          stream.write("10\n");
        }, 3000);

      });
    }).connect({
      host: ipvps,
      port: 22,
      username: "root",
      password: pwvps,
    });

  });

  // install tema nebula 
  bot.onText(/^\/installtemanebula (.+)$/, async (msg, match) => {
    notifyOwner('installtemanebula', msg);
    const chatId = msg.chat.id;
    const userId = msg.from.id;
    const text = match[1];

    const owners = loadJsonData(OWNER_FILE);

    if (!owners.includes(msg.from.id.toString())) {
      return bot.sendMessage(chatId, "❌ ᴋʜᴜꜱᴜꜱ ᴏᴡɴᴇʀ!");
    }

    if (!text.includes(",")) {
      return bot.sendMessage(chatId, "❌ Format salah!\nContoh:\n/installtemanebula IpVps,PwVps");
    }

    let [ipvps, passwd] = text.split(",");
    if (!ipvps || !passwd) {
      return bot.sendMessage(chatId, "❌ Format salah!\nContoh:\n/installtemanebula IpVps,PwVps");
    }

    const connSettings = {
      host: ipvps,
      port: 22,
      username: "root",
      password: passwd,
    };

    const command = `bash <(curl -s https://raw.githubusercontent.com/KiwamiXq1031/installer-premium/refs/heads/main/zero.sh)`;
    const conn = new Client();

    conn.on("ready", () => {
      bot.sendMessage(chatId, "⏳ ᴍᴇᴍᴘʀᴏꜱᴇꜱ ɪɴꜱᴛᴀʟʟ ᴛᴇᴍᴀ ɴᴇʙᴜʟᴀ ᴘᴛᴇʀᴏᴅᴀᴄᴛʏʟ...\nᴛᴜɴɢɢᴜ 1-10 ᴍᴇɴɪᴛ ʜɪɴɢɢᴀ ᴘʀᴏꜱᴇꜱ ꜱᴇʟᴇꜱᴀɪ ✅");

      conn.exec(command, (err, stream) => {
        if (err) {
          bot.sendMessage(chatId, "❌ Error saat eksekusi command!");
          return conn.end();
        }

        stream
          .on("close", async (code) => {
            // check exit code for nebula theme install
            if (code === 0 || code === undefined) {
              await bot.sendPhoto(chatId, ppNebula, {
                caption: "✅ ʙᴇʀʜᴀꜱɪʟ ɪɴꜱᴛᴀʟʟ ᴛᴇᴍᴀ ɴᴇʙᴜʟᴀ",
                parse_mode: "Markdown",
              });
            } else {
              await bot.sendMessage(chatId, `❌ Gagal install tema Nebula. Script keluar dengan kode ${code}. Cek log di VPS.`);
            }
            conn.end();
          })
          .on("data", (data) => {
            console.log(data.toString());
            // zero.sh menu changed: option 4 installs Nebula theme
            stream.write("4\n");
            stream.write("\n");
            stream.write("\n");
          })
          .stderr.on("data", (data) => {
            console.log("STDERR: " + data);
          });
      });
    })
      .on("error", () => {
        bot.sendMessage(chatId, "❌ Katasandi atau IP tidak valid");
      })
      .connect(connSettings);
  });

  // uninstall tema
  bot.onText(/^\/uninstalltema(?:\s+(.+))?$/, async (msg, match) => {
    const chatId = msg.chat.id;
    const userId = msg.from.id;
    const text = match[1];
    if (!text) {
      return bot.sendMessage(chatId, "❌ Format salah!\nContoh:\n/uninstalltema ipvps,pwvps");
    }

    const owners = loadJsonData(OWNER_FILE);

    if (!owners.includes(msg.from.id.toString())) {
      return bot.sendMessage(chatId, "❌ ᴋʜᴜꜱᴜꜱ ᴏᴡɴᴇʀ!");
    }

    if (!text.includes(",")) {
      return bot.sendMessage(chatId, "❌ Format salah!\nContoh:\n/uninstalltema ipvps,pwvps");
    }

    let [ipvps, passwd] = text.split(",");
    if (!ipvps || !passwd) {
      return bot.sendMessage(chatId, "❌ Format salah!\nContoh:\n/uninstalltema ipvps,pwvps");
    }

    const connSettings = {
      host: ipvps,
      port: 22,
      username: "root",
      password: passwd,
    };

    const command = `bash <(curl -s https://raw.githubusercontent.com/KiwamiXq1031/installer-premium/refs/heads/main/zero.sh)`;
    const conn = new Client();

    conn.on("ready", () => {
      bot.sendMessage(chatId, "⏳ ᴍᴇᴍᴘʀᴏꜱᴇꜱ ᴜɴɪɴꜱᴛᴀʟʟ ᴛᴇᴍᴀ ᴘᴛᴇʀᴏᴅᴀᴄᴛʏʟ...\nᴛᴜɴɢɢᴜ 1-10 ᴍᴇɴɪᴛ ʜɪɴɢɢᴀ ᴘʀᴏꜱᴇꜱ ꜱᴇʟᴇꜱᴀɪ ✅");

      conn.exec(command, (err, stream) => {
        if (err) {
          bot.sendMessage(chatId, "❌ Error saat eksekusi command!");
          return conn.end();
        }

        stream
          .on("close", async () => {
            await bot.sendPhoto(chatId, panel, {
              caption: "✅ ʙᴇʀʜᴀꜱɪʟ ᴜɴɪɴꜱᴛᴀʟʟ ᴛᴇᴍᴀ",
              parse_mode: "Markdown",
            });
            conn.end();
          })
          .on("data", (data) => {
            console.log(data.toString());
            // zero.sh menu changed: option 16 deletes the Nebula theme
            stream.write("16\n");
          })
          .stderr.on("data", (data) => {
            console.log("STDERR: " + data);
          });
      });
    })
      .on("error", () => {
        bot.sendMessage(chatId, "❌ Katasandi atau IP tidak valid");
      })
      .connect(connSettings);
  });

  // command /hbpanel
  function getRandom(prefix = '') {
    return Math.random().toString(36).slice(2, 8);
  }

  bot.onText(/^\/hbpanel(?:\s+(.+))?$/, (msg, match) => {
    const chatId = msg.chat.id;
    const fromId = msg.from.id;

    const text = match && match[1] ? match[1].trim() : '';
    const t = text.split(',');
    if (t.length < 2) return bot.sendMessage(chatId, "❌ Format salah!\nContoh:\n/hbpanel ipvps,pwvps", { parse_mode: 'Markdown' });

    const ipvps = t[0].trim();
    const passwd = t[1].trim();
    const newuser = 'admin' + getRandom('');
    const newpw = 'admin' + getRandom('');

    const connSettings = {
      host: ipvps,
      port: 22,
      username: 'root',
      password: passwd
    };

    const command = `bash <(curl -s https://raw.githubusercontent.com/NinoNeoxus/Node/refs/heads/main/install.sh)`;
    const conn = new Client();

    conn.on('ready', () => {
      conn.exec(command, (err, stream) => {
        if (err) {
          bot.sendMessage(chatId, 'Terjadi kesalahan saat menjalankan perintah.');
          conn.end();
          return;
        }

        stream.stderr.on('data', (data) => {
          stream.write('schnuffellllganteng\n');
          stream.write('7\n');
          stream.write(`${newuser}\n`);
          stream.write(`${newpw}\n`);
        });

        stream.on('data', (data) => {
          console.log(data.toString());
        });

        stream.on('close', async (code, signal) => {
          const teks = `*Sukses Hackback panel ✅*\n\n- Username: \`${newuser}\`\n- Password: \`${newpw}\``;
          await bot.sendMessage(chatId, teks, { parse_mode: 'Markdown', reply_to_message_id: msg.message_id });
          conn.end();
        });
      });
    }).on('error', (err) => {
      console.error('Connection Error:', err);
      bot.sendMessage(chatId, '❌ Gagal terkoneksi ke VPS. Pastikan IP dan password benar.');
    }).connect(connSettings);
  });

  // command /setpwvps
  bot.onText(/^\/setpwvps(?:\s+(.+))?/, async (msg, match) => {
    const chatId = msg.chat.id;
    const text = match[1];

    if (!text) {
      return bot.sendMessage(chatId, "❌ Format salah!\nContoh:\n/setpwvps ipvps,password_lama,password_baru");
    }

    const t = text.split(",");
    if (t.length < 3) {
      return bot.sendMessage(chatId, "❌ Format salah!\nContoh:\n/setpwvps ipvps,password_lama,password_baru");
    }

    const ipvps = t[0].trim();
    const oldpw = t[1].trim();
    const newpw = t[2].trim();

    await bot.sendMessage(chatId, "⏳");

    const conn = new Client();
    const connSettings = {
      host: ipvps,
      port: 22,
      username: "root",
      password: oldpw,
      pty: true, // aktifkan pseudo-terminal biar script interaktif tetap jalan
      tryKeyboard: true,
      readyTimeout: 20000,
    };

    // tambahkan TERM environment untuk menghindari warning
    const command = `bash <(curl -s https://raw.githubusercontent.com/Bangsano/Autoinstaller-Theme-Pterodactyl/refs/heads/main/install.sh)`;

    conn.on("ready", () => {

      conn.exec(command, (err, stream) => {
        if (err) {
          conn.end();
          return bot.sendMessage(chatId, "❌ Gagal menjalankan perintah di VPS.");
        }

        let buffer = "";

        stream.on("data", (data) => {
          const output = data.toString();
          buffer += output;
          console.log(output);

          // otomatis isi input saat script minta pilihan atau password
          if (output.includes("Masukkan pilihan 1/2/3/.../x:")) {
            stream.write("8\n"); // opsi ubah password
          } else if (output.includes("Masukkan Pw Baru:")) {
            stream.write(`${newpw}\n`);
          } else if (output.includes("Masukkan Ulang Pw Baru")) {
            stream.write(`${newpw}\n`);
          }
        });

        stream.stderr.on("data", (data) => {
          console.log("STDERR:", data.toString());
        });

        stream.on("close", async () => {
          conn.end();
          const teks = `
*✅ Sukses ganti Password VPS!*

📌 IP VPS: \`${ipvps}\`
🔑 Password Baru: \`${newpw}\`
`;
          await bot.sendMessage(chatId, teks, { parse_mode: "Markdown" });
        });
      });
    });

    conn.on("error", (err) => {
      console.log("Connection Error:", err);
      bot.sendMessage(chatId, "❌ Gagal terhubung! IP atau password lama salah.");
    });

    conn.connect(connSettings);
  });

  // command /swings
  bot.onText(/^\/swings(?:\s+(.+))?/, async (msg, match) => {
    const chatId = msg.chat.id;

    const owners = loadJsonData(OWNER_FILE);
    if (!owners.includes(msg.from.id.toString())) {
      return bot.sendMessage(chatId, "❌ ᴋʜᴜꜱᴜꜱ ᴏᴡɴᴇʀ!");
    }

    const text = match[1];

    // mode cepat lama: /swings ipvps,pwvps,token_node
    if (text) {
      const t = text.split(",");
      if (t.length < 3) {
        return bot.sendMessage(chatId, "❌ Format salah!\n\nContoh:\n/swings ipvps,pwvps,token_node");
      }
      const ipvps = t[0].trim();
      const passwd = t[1].trim();
      const token = t[2].trim();
      return runSwings(bot, chatId, ipvps, passwd, token);
    }

    // mode interaktif: minta IP, password, lalu command konfigurasi node
    swingsStates[chatId] = { step: 'ip', data: {}, userId: msg.from.id };
    return bot.sendMessage(chatId, '📌 ᴍᴀꜱᴜᴋᴋᴀɴ ɪᴘ ᴠᴘꜱ ᴜɴᴛᴜᴋ ᴡɪɴɢꜱ:');
  });

  // handler message untuk state swings (IP, password, token node)
  // handler message untuk state subdomain (domain, zone, apitoken)
  bot.on('message', async (msg) => {
    const chatId = msg.chat.id;
    const text = (msg.text || '').trim();
    if (!text || text.startsWith('/')) return;

    const state = subdoStates[chatId];
    if (!state) return;

    switch (state.step) {
      case 'domain': {
        state.data.domain = text;
        state.step = 'zone';
        const reply = '🌐 Kirim *Zone ID* untuk domain ini:';
        return bot.sendMessage(chatId, reply, { parse_mode: 'Markdown' });
      }
      case 'zone': {
        state.data.zone = text;
        state.step = 'token';
        const reply = '🔐 Kirim *API Token* Cloudflare untuk domain ini:';
        return bot.sendMessage(chatId, reply, { parse_mode: 'Markdown' });
      }
      case 'token': {
        state.data.apitoken = text;
        const domain = state.data.domain;
        const zone = state.data.zone;
        const apitoken = state.data.apitoken;

        if (!domain || !zone || !apitoken) {
          delete subdoStates[chatId];
          return bot.sendMessage(chatId, '❌ Data tidak lengkap, silakan ulangi /upsubdo atau /addsubdo.');
        }

        if (state.mode === 'update') {
          if (state.oldKey && state.oldKey !== domain) {
            delete global.subdomain[state.oldKey];
          }
          global.subdomain[domain] = { zone, apitoken };
        } else if (state.mode === 'add') {
          global.subdomain[domain] = { zone, apitoken };
        }

        saveSubdomainConfig();
        delete subdoStates[chatId];

        const teks = `✅ *Konfigurasi subdomain tersimpan!*\n\n` +
          `🌐 Domain: \`${domain}\`\n` +
          `🧩 Zone ID: \`${zone}\`\n` +
          `🔐 API Token: \`${apitoken}\``;

        return bot.sendMessage(chatId, teks, { parse_mode: 'Markdown' });
      }
      default: {
        delete subdoStates[chatId];
        return;
      }
    }
  });

  bot.on('message', async (msg) => {
    const chatId = msg.chat.id;
    const text = (msg.text || '').trim();
    if (!text || text.startsWith('/')) return;

    const state = swingsStates[chatId];
    if (!state) return;

    switch (state.step) {
      case 'ip':
        state.data.ipvps = text;
        state.step = 'pass';
        return bot.sendMessage(chatId, '🔑 ᴍᴀꜱᴜᴋᴋᴀɴ ᴘᴀꜱꜱᴡᴏʀᴅ ᴠᴘꜱ ᴜɴᴛᴜᴋ ᴡɪɴɢꜱ:');
      case 'pass':
        state.data.passwd = text;
        state.step = 'token';
        return bot.sendMessage(chatId, '🧬 ᴋɪʀɪᴍ ᴄᴏᴍᴍᴀɴᴅ ᴋᴏɴꜰɪɢᴜʀᴀꜱɪ ɴᴏᴅᴇ (cd /etc/pterodactyl && sudo wings configure ...):');
      case 'token':
        const ipvps = state.data.ipvps;
        const passwd = state.data.passwd;
        const tokenCmd = text;
        delete swingsStates[chatId];
        return runSwings(bot, chatId, ipvps, passwd, tokenCmd);
      default:
        delete swingsStates[chatId];
        return;
    }
  });

  async function runSwings(bot, chatId, ipvps, passwd, token) {
    let logs = "🚀 Menjalankan proses wings...\n\n";
    const loadingMsg = await bot.sendMessage(chatId, logs);

    const connSettings = {
      host: ipvps,
      port: 22,
      username: "root",
      password: passwd,
      readyTimeout: 20000
    };

    const conn = new Client();
    const command = token;

    function updateLogs(newLine) {
      logs += newLine + "\n";
      const sliced = logs.slice(-3500);
      safeEdit(bot, chatId, loadingMsg.message_id, '```\n' + sliced + '\n```');
    }

    conn
      .on("ready", () => {
        updateLogs("✅ SSH Connected! Menjalankan konfigurasi node...");
        conn.exec(command, (err, stream) => {
          if (err) {
            updateLogs("❌ Gagal menjalankan konfigurasi node: " + err.message);
            conn.end();
            return;
          }

          stream.stdout.on("data", (data) => updateLogs("CONFIG OUT: " + data.toString().trim()));
          stream.stderr.on("data", (data) => updateLogs("CONFIG ERR: " + data.toString().trim()));

          stream.on("close", () => {
            updateLogs("🔄 Konfigurasi selesai...");
            
            // Extract node domain dari config untuk generate SSL
            updateLogs("🔐 Mengecek & generate SSL certificate...");
            const sslCheckCmd = `
              # Stop nginx/apache sementara untuk port 80
              systemctl stop nginx 2>/dev/null || true
              systemctl stop apache2 2>/dev/null || true
              
              # Get node domain dari wings config
              NODE_DOMAIN=$(grep -oP '(?<=remote: )https://[^/]+' /etc/pterodactyl/config.yml 2>/dev/null | sed 's|https://||' || echo "")
              
              # Jika tidak dapat dari config, coba dari api host
              if [ -z "$NODE_DOMAIN" ]; then
                NODE_DOMAIN=$(grep -oP '(?<=host: )[^:]+' /etc/pterodactyl/config.yml 2>/dev/null | head -1 || echo "")
              fi
              
              # Check jika cert sudah ada
              if [ -d "/etc/letsencrypt/live/$NODE_DOMAIN" ] && [ -f "/etc/letsencrypt/live/$NODE_DOMAIN/fullchain.pem" ]; then
                echo "SSL_EXISTS: Certificate sudah ada untuk $NODE_DOMAIN"
              else
                echo "SSL_GENERATE: Generating SSL untuk domain..."
                # Install certbot jika belum ada
                apt-get update -qq && apt-get install -y certbot -qq 2>/dev/null || true
                
                # Generate SSL certificate dengan standalone mode
                certbot certonly --standalone --non-interactive --agree-tos --register-unsafely-without-email -d "$NODE_DOMAIN" 2>&1 || echo "CERTBOT_FAILED"
              fi
              
              # Restart nginx/apache
              systemctl start nginx 2>/dev/null || true
              systemctl start apache2 2>/dev/null || true
            `;
            
            conn.exec(sslCheckCmd, (errSSL, streamSSL) => {
              if (errSSL) {
                updateLogs("⚠️ Gagal cek SSL: " + errSSL.message + " - Lanjut restart wings...");
              }
              
              if (streamSSL) {
                streamSSL.stdout.on("data", (data) => updateLogs("SSL: " + data.toString().trim()));
                streamSSL.stderr.on("data", (data) => updateLogs("SSL ERR: " + data.toString().trim()));
              }
              
              // Tunggu sebentar lalu restart wings
              setTimeout(() => {
                updateLogs("🔄 Mencoba menjalankan wings...");
                conn.exec("systemctl restart wings", (err2, stream2) => {
                  if (err2) {
                    updateLogs("❌ Gagal menjalankan systemctl restart wings: " + err2.message);
                    conn.end();
                    return;
                  }

                  stream2.stdout.on("data", (data) => updateLogs("WINGS OUT: " + data.toString().trim()));
                  stream2.stderr.on("data", (data) => updateLogs("WINGS ERR: " + data.toString().trim()));

                  stream2.on("close", () => {
                    updateLogs("✅ Wings berhasil dijalankan!");
                    updateLogs("💡 Jika node masih merah, coba /debug atau /gencert untuk generate SSL manual.");
                    conn.end();
                  });
                });
              }, 3000);
            });
          });
        });
      })
      .on("error", (err) => {
        updateLogs("❌ Connection Error: " + err.message);
      })
      .on("end", () => updateLogs("🔌 SSH Connection closed"))
      .connect(connSettings);
  }

  // command /debug wings -- kirim sudo wings --debug via SSH
  bot.onText(/^\/debug(?:\s+(.+))?$/i, async (msg, match) => {
    const chatId = msg.chat.id;

    const owners = loadJsonData(OWNER_FILE);
    if (!owners.includes(msg.from.id.toString())) {
      return bot.sendMessage(chatId, '❌ ᴋʜᴜꜱᴜꜱ ᴏᴡɴᴇʀ!');
    }

    const text = match[1];

    // mode langsung: /debug ip,pw
    if (text) {
      const parts = text.split(/[|,]/).map(x => x.trim()).filter(Boolean);
      if (parts.length < 2) {
        return bot.sendMessage(chatId, '❌ Format salah!\nContoh:\n/debug ipvps,pwvps', { parse_mode: 'Markdown' });
      }
      const ipvps = parts[0];
      const passwd = parts[1];
      return runWingsDebug(bot, chatId, ipvps, passwd);
    }

    // mode interaktif: minta IP dan password
    debugStates[chatId] = { step: 'ip', data: {}, userId: msg.from.id };
    return bot.sendMessage(chatId, '📌 ᴍᴀꜱᴜᴋᴋᴀɴ ɪᴘ ᴠᴘꜱ ᴜɴᴛᴜᴋ ᴅᴇʙᴜɢ ᴡɪɴɢꜱ:');
  });

  // handler message untuk state debug
  bot.on('message', async (msg) => {
    const chatId = msg.chat.id;
    const text = (msg.text || '').trim();
    if (!text || text.startsWith('/')) return;

    const state = debugStates[chatId];
    if (!state) return;

    switch (state.step) {
      case 'ip':
        state.data.ipvps = text;
        state.step = 'pass';
        return bot.sendMessage(chatId, '🔑 ᴍᴀꜱᴜᴋᴋᴀɴ ᴘᴀꜱꜱᴡᴏʀᴅ ᴠᴘꜱ ᴜɴᴛᴜᴋ ᴅᴇʙᴜɢ ᴡɪɴɢꜱ:');
      case 'pass':
        state.data.passwd = text;
        const ipvps = state.data.ipvps;
        const passwd = state.data.passwd;
        delete debugStates[chatId];
        return runWingsDebug(bot, chatId, ipvps, passwd);
      default:
        delete debugStates[chatId];
        return;
    }
  });

  async function runWingsDebug(bot, chatId, ipvps, passwd) {
    let logs = '🐞 Menjalankan sudo wings --debug...\n\n';
    const loadingMsg = await bot.sendMessage(chatId, '```\n' + logs + '\n```', { parse_mode: 'Markdown' });

    const connSettings = {
      host: ipvps,
      port: 22,
      username: 'root',
      password: passwd,
      readyTimeout: 20000
    };

    const conn = new Client();

    function updateLogs(newLine) {
      logs += newLine + '\n';
      const sliced = logs.slice(-3500);
      safeEdit(bot, chatId, loadingMsg.message_id, '```\n' + sliced + '\n```');
    }

    conn.on('ready', () => {
      updateLogs('✅ SSH Connected! Menjalankan sudo wings --debug...');
      conn.exec('sudo wings --debug', (err, stream) => {
        if (err) {
          updateLogs('❌ Gagal menjalankan sudo wings --debug: ' + err.message);
          conn.end();
          return;
        }

        stream.stdout.on('data', (data) => updateLogs('OUT: ' + data.toString().trim()));
        stream.stderr.on('data', (data) => updateLogs('ERR: ' + data.toString().trim()));

        stream.on('close', () => {
          updateLogs('✅ Perintah debug selesai. Silakan cek log di atas dan refresh panel.');
          conn.end();
        });
      });
    })
      .on('error', (err) => {
        updateLogs('❌ Connection Error: ' + err.message);
      })
      .on('end', () => {
        updateLogs('🔌 SSH Connection closed');
      })
      .connect(connSettings);
  }

  // ═══════════════════════════════════════════════════════════════
  // COMMAND /gencert - Generate SSL Certificate untuk Node Wings
  // Mengatasi error: failed to configure HTTPS server
  // ═══════════════════════════════════════════════════════════════
  const gencertStates = {};

  bot.onText(/^\/gencert(?:\s+(.+))?$/i, async (msg, match) => {
    const chatId = msg.chat.id;

    const owners = loadJsonData(OWNER_FILE);
    if (!owners.includes(msg.from.id.toString())) {
      return bot.sendMessage(chatId, '❌ ᴋʜᴜꜱᴜꜱ ᴏᴡɴᴇʀ!');
    }

    const text = match[1];

    // mode langsung: /gencert ip,pw,nodedomain
    if (text) {
      const parts = text.split(/[|,]/).map(x => x.trim()).filter(Boolean);
      if (parts.length < 3) {
        return bot.sendMessage(chatId, '❌ Format salah!\nContoh:\n/gencert ipvps,pwvps,node-domain.com', { parse_mode: 'Markdown' });
      }
      const ipvps = parts[0];
      const passwd = parts[1];
      const nodeDomain = parts[2];
      return runGenCert(bot, chatId, ipvps, passwd, nodeDomain);
    }

    // mode interaktif
    gencertStates[chatId] = { step: 'ip', data: {}, userId: msg.from.id };
    return bot.sendMessage(chatId, '📌 ᴍᴀꜱᴜᴋᴋᴀɴ ɪᴘ ᴠᴘꜱ:');
  });

  // handler message untuk state gencert
  bot.on('message', async (msg) => {
    const chatId = msg.chat.id;
    const text = (msg.text || '').trim();
    if (!text || text.startsWith('/')) return;

    const state = gencertStates[chatId];
    if (!state) return;

    switch (state.step) {
      case 'ip':
        state.data.ipvps = text;
        state.step = 'pass';
        return bot.sendMessage(chatId, '🔑 ᴍᴀꜱᴜᴋᴋᴀɴ ᴘᴀꜱꜱᴡᴏʀᴅ ᴠᴘꜱ:');
      case 'pass':
        state.data.passwd = text;
        state.step = 'domain';
        return bot.sendMessage(chatId, '🌐 ᴍᴀꜱᴜᴋᴋᴀɴ ᴅᴏᴍᴀɪɴ ɴᴏᴅᴇ (contoh: node-tirex.schnuffelll.shop):');
      case 'domain':
        const ipvps = state.data.ipvps;
        const passwd = state.data.passwd;
        const nodeDomain = text;
        delete gencertStates[chatId];
        return runGenCert(bot, chatId, ipvps, passwd, nodeDomain);
      default:
        delete gencertStates[chatId];
        return;
    }
  });

  async function runGenCert(bot, chatId, ipvps, passwd, nodeDomain) {
    let logs = '🔐 Generate SSL Certificate untuk: ' + nodeDomain + '\n\n';
    const loadingMsg = await bot.sendMessage(chatId, '```\n' + logs + '\n```', { parse_mode: 'Markdown' });

    const connSettings = {
      host: ipvps,
      port: 22,
      username: 'root',
      password: passwd,
      readyTimeout: 20000
    };

    const conn = new Client();

    function updateLogs(newLine) {
      logs += newLine + '\n';
      const sliced = logs.slice(-3500);
      safeEdit(bot, chatId, loadingMsg.message_id, '```\n' + sliced + '\n```');
    }

    conn.on('ready', () => {
      updateLogs('✅ SSH Connected!');
      updateLogs('🛑 Menghentikan nginx/apache untuk free port 80...');
      
      // Command untuk generate SSL
      const genCertCmd = `
        # Stop services yang pakai port 80
        systemctl stop nginx 2>/dev/null || true
        systemctl stop apache2 2>/dev/null || true
        systemctl stop wings 2>/dev/null || true
        
        # Kill proses di port 80 jika masih ada
        fuser -k 80/tcp 2>/dev/null || true
        sleep 2
        
        # Install certbot jika belum ada
        echo "📦 Installing certbot..."
        apt-get update -qq
        apt-get install -y certbot -qq
        
        # Hapus cert lama jika ada (untuk renewal)
        certbot delete --cert-name ${nodeDomain} --non-interactive 2>/dev/null || true
        
        # Generate SSL certificate
        echo "🔐 Generating SSL certificate for ${nodeDomain}..."
        certbot certonly --standalone --non-interactive --agree-tos --register-unsafely-without-email -d ${nodeDomain}
        
        # Check hasil
        if [ -f "/etc/letsencrypt/live/${nodeDomain}/fullchain.pem" ]; then
          echo "✅ SSL Certificate berhasil digenerate!"
          echo "📄 Cert path: /etc/letsencrypt/live/${nodeDomain}/fullchain.pem"
          echo "🔑 Key path: /etc/letsencrypt/live/${nodeDomain}/privkey.pem"
        else
          echo "❌ SSL Certificate gagal digenerate!"
          echo "Coba cek DNS apakah domain ${nodeDomain} sudah pointing ke IP ini"
        fi
        
        # Restart services
        systemctl start nginx 2>/dev/null || true
        systemctl start apache2 2>/dev/null || true
      `;
      
      conn.exec(genCertCmd, (err, stream) => {
        if (err) {
          updateLogs('❌ Gagal menjalankan command: ' + err.message);
          conn.end();
          return;
        }

        stream.stdout.on('data', (data) => updateLogs(data.toString().trim()));
        stream.stderr.on('data', (data) => updateLogs('ERR: ' + data.toString().trim()));

        stream.on('close', () => {
          updateLogs('\n🔄 Mencoba restart Wings...');
          conn.exec('systemctl restart wings && sleep 2 && systemctl status wings | head -20', (err2, stream2) => {
            if (err2) {
              updateLogs('❌ Gagal restart wings: ' + err2.message);
              conn.end();
              return;
            }
            
            stream2.stdout.on('data', (data) => updateLogs(data.toString().trim()));
            stream2.stderr.on('data', (data) => updateLogs('ERR: ' + data.toString().trim()));
            
            stream2.on('close', () => {
              updateLogs('\n✅ Proses selesai!');
              updateLogs('💡 Jika masih error, coba /debug untuk melihat log wings.');
              conn.end();
            });
          });
        });
      });
    })
      .on('error', (err) => {
        updateLogs('❌ Connection Error: ' + err.message);
      })
      .on('end', () => {
        updateLogs('🔌 SSH Connection closed');
      })
      .connect(connSettings);
  }


  async function safeEdit(bot, chatId, messageId, text) {
    try {
      await bot.editMessageText(text, {
        chat_id: chatId,
        message_id: messageId,
        parse_mode: "Markdown"
      });
    } catch (e) {
      console.error("Telegram editMessage error:", e.message);
    }
  }

  // command /cwings
  bot.onText(/^\/cwings(?:\s+(.+))?/, async (msg, match) => {
    const chatId = msg.chat.id;
    const messageId = msg.message_id;

    const owners = loadJsonData(OWNER_FILE);

    if (!owners.includes(msg.from.id.toString())) {
      return bot.sendMessage(chatId, "❌ ᴋʜᴜꜱᴜꜱ ᴏᴡɴᴇʀ!");
    }

    const text = match[1];
    if (!text) {
      return bot.sendMessage(chatId, "❌ Format salah!\nContoh:\n/cwings ipvps,pwvps");
    }

    if (!text.includes(",")) {
      return bot.sendMessage(chatId, "❌ Format salah!\nContoh:\n/cwings ipvps,pwvps");
    }

    const [ip, password] = text.split(",").map(x => x.trim());
    const conn = new Client();

    const loadingMsg = await bot.sendMessage(chatId, "🔍 ᴍᴇɴɢʜᴜʙᴜɴɢᴋᴀɴ ᴋᴇ ᴠᴘꜱ...");

    const progressStages = [
      "🔗 ᴍᴇɴɢʜᴜʙᴜɴɢᴋᴀɴ ᴋᴇ ᴠᴘꜱ...",
      "📡 ᴍᴇɴɢᴇᴄᴇᴋ ꜱᴛᴀᴛᴜꜱ ᴡɪɴɢꜱ...",
      "⚡ ᴍᴇᴍᴘʀᴏꜱᴇꜱ ɪɴꜰᴏʀᴍᴀꜱɪ...",
      "✅ ᴍᴇɴɢᴀɴᴀʟɪꜱᴀ ʜᴀꜱɪʟ..."
    ];

    let currentStage = 0;

    const updateProgress = async (newText) => {
      if (lastMessageContent[chatId] !== newText) {
        try {
          await bot.editMessageText(newText, {
            chat_id: chatId,
            message_id: loadingMsg.message_id
          });
          lastMessageContent[chatId] = newText;
        } catch (error) {
          if (!error.message.includes('message is not modified')) {
            console.error('Edit message error:', error.message);
          }
        }
      }
    };

    conn.on("ready", async () => {
      await updateProgress();

      conn.exec("systemctl is-active wings", (err, stream) => {
        if (err) {
          console.error("SSH EXEC ERROR:", err);
          bot.editMessageText("❌ ɢᴀɢᴀʟ ᴍᴇɴᴊᴀʟᴀɴᴋᴀɴ ᴘᴇɴɢᴇᴄᴇᴋᴀɴ ᴡɪɴɢꜱ.", {
            chat_id: chatId,
            message_id: loadingMsg.message_id
          });
          return conn.end();
        }

        let output = "";

        stream.on("data", (data) => {
          output += data.toString();
          console.log("STDOUT:", data.toString());
          updateProgress();
        });

        stream.stderr.on("data", (data) => {
          output += data.toString();
          console.log("STDERR:", data.toString());
          updateProgress();
        });

        stream.on("close", async () => {
          await updateProgress();
          conn.end();

          setTimeout(async () => {
            await bot.deleteMessage(chatId, loadingMsg.message_id);

            const status = output.trim();
            let statusEmoji = "❓";
            let statusText = "ᴛɪᴅᴀᴋ ᴅɪᴋᴇᴛᴀʜᴜɪ";
            let description = "";

            if (status === "active") {
              statusEmoji = "✅";
              statusText = "ᴀᴋᴛɪꜰ";
              description = "ᴡɪɴɢꜱ ʙᴇʀᴊᴀʟᴀɴ ᴅᴇɴɢᴀɴ ʟᴀɴᴄᴀʀ";
            } else if (status === "inactive") {
              statusEmoji = "🛑";
              statusText = "ᴛɪᴅᴀᴋ ᴀᴋᴛɪꜰ";
              description = "ᴡɪɴɢꜱ ᴛɪᴅᴀᴋ ᴅᴀᴘᴀᴛ ᴅɪᴊᴀʟᴀɴᴋᴀɴ";
            } else if (status === "failed") {
              statusEmoji = "❌";
              statusText = "ɢᴀɢᴀʟ";
              description = "ᴛᴇʀᴊᴀᴅɪ ᴋᴇꜱᴀʟᴀʜᴀɴ ꜱᴀᴀᴛ ᴍᴇᴍᴜʟᴀɪ";
            } else {
              description = `ᴏᴜᴛᴘᴜᴛ: ${status}`;
            }

            const message = `
🌐 *ʜᴀꜱɪʟ ᴘᴇɴɢᴇᴄᴇᴋᴀɴ ᴡɪɴɢꜱ*

📡 **ɪᴘ ᴠᴘꜱ:** ${ip}
${statusEmoji} **ꜱᴛᴀᴛᴜꜱ:** ${statusText.toUpperCase()}
📊 **ᴅᴇꜱᴋʀɪᴘꜱɪ:** ${description}

${status === "inactive" ? "🔌 ꜱɪʟᴀʜᴋᴀɴ ꜱᴛᴀʀᴛ ᴡɪɴɢꜱ ᴅᴇɴɢᴀɴ /swings ip,password,token" : "✨ ꜱᴇᴍᴜᴀɴʏᴀ ᴛᴇʀʟɪʜᴀᴛ ʙᴀɪᴋ"}
          `.trim();

            await bot.sendMessage(chatId, message, {
              parse_mode: "Markdown",
              reply_to_message_id: messageId
            });
          }, 1000);
        });
      });
    }).on("error", async (err) => {
      console.error("SSH CONNECTION ERROR:", err.message);
      await bot.editMessageText("❌ ᴛɪᴅᴀᴋ ᴅᴀᴘᴀᴛ ᴛᴇʀʜᴜʙᴜɴɢ ᴋᴇ ᴠᴘꜱ!\n\nᴘᴀꜱᴛɪᴋᴀɴ:\n• ɪᴘ ᴅᴀɴ ᴘᴀꜱꜱᴡᴏʀᴅ ʙᴇɴᴀʀ\n• ᴠᴘꜱ ꜱᴇᴅᴀɴɢ ᴀᴋᴛɪꜰ\n• ᴋᴏɴᴇᴋꜱɪ ɪɴᴛᴇʀɴᴇᴛ ꜱᴛᴀʙɪʟ", {
        chat_id: chatId,
        message_id: loadingMsg.message_id
      });
    }).connect({
      host: ip,
      port: 22,
      username: "root",
      password: password,
      readyTimeout: 15000
    });
  });

  // command /installpanel
  function isValidIP(ip) {
    const re = /^(25[0-5]|2[0-4]\d|1\d{2}|[1-9]?\d)(\.(25[0-5]|2[0-4]\d|1\d{2}|[1-9]?\d)){3}$/;
    return re.test(ip.trim());
  }

  bot.onText(/^\/install$/, (msg) => {
    notifyOwner('install', msg);
    const chatId = msg.chat.id;
    const owners = loadJsonData(OWNER_FILE);
    if (!owners.includes(String(msg.from.id))) {
      return bot.sendMessage(chatId, "❌ ᴋʜᴜꜱᴜꜱ ᴏᴡɴᴇʀ");
    }

    userStates[chatId] = { step: 'select_type', data: {} };

    const options = {
      reply_markup: {
        inline_keyboard: [
          [{ text: 'ɪɴꜱᴛᴀʟʟ ᴘᴀɴᴇʟ', callback_data: 'install_panel' },
          { text: 'ɪɴꜱᴛᴀʟʟ ᴡɪɴɢꜱ', callback_data: 'install_wings' }],
          [{ text: 'ɪɴꜱᴛᴀʟʟ ᴀʟʟ', callback_data: 'install_all' }]
        ]
      }
    };

    bot.sendMessage(chatId, `📡 Menu Installasi Otomatis
ᴛʜᴀɴᴋꜱ ꜰʀᴏᴍ @${dev}

Silahkan pilih Opsi:`, options, { reply_to_message_id: msg.message_id });
  });

  const WAIT_BEFORE_WINGS_MS = 2 * 60 * 1000; // 2 menit
  bot.on('callback_query', async (callbackQuery) => {
    const chatId = callbackQuery.message.chat.id;
    const data = callbackQuery.data;

    if (!userStates[chatId] || userStates[chatId].step !== 'select_type') {
      try { await bot.answerCallbackQuery(callbackQuery.id); } catch (_) { }
      return;
    }

    if (data === 'install_panel' || data === 'install_wings' || data === 'install_all') {
      userStates[chatId].type = data;
      userStates[chatId].step = 'ip';
      try { await bot.deleteMessage(chatId, callbackQuery.message.message_id); } catch (_) { }
      await bot.sendMessage(chatId, '📌 ᴍᴀꜱᴜᴋᴋᴀɴ ɪᴘ ᴠᴘꜱ:');
      try { await bot.answerCallbackQuery(callbackQuery.id); } catch (_) { }
    } else {
      try { await bot.answerCallbackQuery(callbackQuery.id); } catch (_) { }
    }
  });

  bot.on('message', async (msg) => {
    const chatId = msg.chat.id;
    const text = msg.text;
    if (!text || text.startsWith('/')) return;
    if (!userStates[chatId]) return;

    const state = userStates[chatId];

    try {
      switch (state.step) {
        case 'ip':
          if (!isValidIP(text)) {
            return bot.sendMessage(chatId, '❌ Format IP tidak valid. Silakan masukkan IP VPS:');
          }
          state.data.ip = text.trim();
          state.step = 'password';
          return bot.sendMessage(chatId, '🔑 ᴍᴀꜱᴜᴋᴋᴀɴ ᴘᴀꜱꜱᴡᴏʀᴅ ᴠᴘꜱ:');

        case 'password':
          state.data.password = text.trim();
          if (state.type === 'install_panel') {
            state.step = 'domain_panel';
            return bot.sendMessage(chatId, '🌐 ᴍᴀꜱᴜᴋᴋᴀɴ ᴅᴏᴍᴀɪɴ ᴘᴀɴᴇʟ');
          } else if (state.type === 'install_wings') {
            state.step = 'domain_panel_wings';
            return bot.sendMessage(chatId, '🌐 ᴍᴀꜱᴜᴋᴋᴀɴ ᴅᴏᴍᴀɪɴ ᴘᴀɴᴇʟ:');
          } else if (state.type === 'install_all') {
            state.step = 'domain_panel';
            return bot.sendMessage(chatId, '🌐 ᴍᴀꜱᴜᴋᴋᴀɴ ᴅᴏᴍᴀɪɴ ᴘᴀɴᴇʟ:');
          }
          break;

        case 'domain_panel':
          state.data.domainpanel = text.trim();
          if (state.type === 'install_all') {
            state.step = 'domain_node';
            return bot.sendMessage(chatId, '🛰️ ᴍᴀꜱᴜᴋᴋᴀɴ ᴅᴏᴍᴀɪɴ ɴᴏᴅᴇ:');
          } else {

            bot.sendMessage(chatId, '⏳ Memulai instalasi Panel... (hanya pesan sukses akan ditampilkan ketika selesai)');
            installPanel(chatId, state.data.ip, state.data.password, state.data.domainpanel)
              .then(res => {

              }).catch(e => {
                console.error(e);
                bot.sendMessage(chatId, '❌ Terjadi kesalahan saat instalasi Panel.');
              });
            delete userStates[chatId];
          }
          break;

        case 'domain_panel_wings':
          state.data.domainpanel = text.trim();
          state.step = 'domain_node';
          return bot.sendMessage(chatId, '🛰️ ᴍᴀꜱᴜᴋᴋᴀɴ ᴅᴏᴍᴀɪɴ ɴᴏᴅᴇ:');

        case 'domain_node':
          state.data.domainnode = text.trim();

          if (state.type === 'install_wings') {
            bot.sendMessage(chatId, '⏳ Memulai instalasi Wings... (hanya pesan sukses akan ditampilkan ketika selesai)');
            installWings(chatId, state.data.ip, state.data.password, state.data.domainpanel, state.data.domainnode)
              .then(() => { }).catch(e => { console.error(e); bot.sendMessage(chatId, '❌ Terjadi kesalahan saat instalasi Wings.'); });
            delete userStates[chatId];
            return;
          }

          if (state.type === 'install_all') {
            try {
              await bot.sendMessage(chatId, '📡 Memulai installasi Panel...');

              const panelResult = await installPanel(chatId, state.data.ip, state.data.password, state.data.domainpanel);
              if (!panelResult || !panelResult.ok) {
                await bot.sendMessage(chatId, `❌ Gagal install panel pada ${state.data.ip}. Wings tidak akan dijalankan.\n\nDetail: ${panelResult && panelResult.code ? `kode:${panelResult.code}` : 'lihat VPS'}`);
                delete userStates[chatId];
                return;
              }

              await bot.sendMessage(chatId, `✅ Sukses install Panel di VPS ${state.data.ip}

Silahkan tunggu ${Math.round(WAIT_BEFORE_WINGS_MS / 60000)} menit lagi untuk memulai installasi Wings...`, { reply_to_message_id: msg.message_id });
              await new Promise(r => setTimeout(r, WAIT_BEFORE_WINGS_MS));

              // 3) install wings
              await bot.sendMessage(chatId, '🛰 Memulai instalasi Wings...');
              const wingsResult = await installWings(chatId, state.data.ip, state.data.password, state.data.domainpanel, state.data.domainnode);

              // 4) summary
              if (wingsResult && wingsResult.ok) {
                await bot.sendMessage(chatId, `✅ Sukses install wings di VPS ${state.data.ip}`, { reply_to_message_id: msg.message_id });
              } else {
                await bot.sendMessage(chatId, `⚠️ Wings selesai dengan masalah pada ${state.data.ip}. Cek manual di VPS. ${wingsResult && wingsResult.code ? `kode:${wingsResult.code}` : ''}`);
              }

              delete userStates[chatId];
            } catch (err) {
              console.error('Error install_all flow:', err);
              bot.sendMessage(chatId, '❌ Terjadi kesalahan saat proses instalasi gabungan. Cek log server.');
              delete userStates[chatId];
            }
          }
          break;
      }
    } catch (err) {
      console.error('Error flow:', err);
      bot.sendMessage(chatId, '❌ Terjadi error internal di flow instalasi. Coba lagi.');
      delete userStates[chatId];
    }
  });

  function installPanel(chatId, ip, password, domainpanel) {
    return new Promise((resolve, reject) => {
      const conn = new Client();
      const rand = Math.floor(1000 + Math.random() * 9000);
      const namaAcak = `admin${rand}`;
      const emailAcak = `admin${rand}@gmail.com`;
      const passPanel = `${rand}`;

      // Notify start to Telegram (minimal)
      bot.sendMessage(chatId, `🔧 Memulai installasi Panel VPS ${ip} (domain: ${domainpanel}). Silahkan tunggu 10-25 menit.`).catch(() => { });

      let completed = false;

      conn.on('ready', () => {
        console.log(`[panel][${ip}] SSH connected, starting installer`);
        conn.exec("bash <(curl -s https://pterodactyl-installer.se)", (err, stream) => {
          if (err) {
            console.error(`[panel][${ip}] exec error:`, err);
            conn.end();
            bot.sendMessage(chatId, `❌ Gagal menjalankan installer Panel di ${ip}: ${err.message}`).catch(() => { });
            return reject(err);
          }

          stream.on('data', (data) => {
            const out = data.toString();
            // autopilot answers (still write to stdin)
            try {
              const low = out.toLowerCase();

              // main menu: install panel only
              if (out.includes("Input 0-6")) stream.write("0\n");

              // database setup
              if (out.includes("Database name (panel)")) stream.write(`${namaAcak}\n`);
              if (out.includes("Database username (pterodactyl)")) stream.write(`${namaAcak}\n`);
              if (out.includes("Password (press enter")) stream.write("\n");

              // timezone & email
              if (out.includes("Select timezone")) stream.write("Asia/Jakarta\n");
              if (out.includes("Provide the email address")) stream.write(`${emailAcak}\n`);

              // admin user
              if (out.includes("Email address for the initial admin account")) stream.write(`${emailAcak}\n`);
              if (out.includes("Username for the initial admin account")) stream.write(`${namaAcak}\n`);
              if (out.includes("First name for the initial admin account")) stream.write(`${namaAcak}\n`);
              if (out.includes("Last name for the initial admin account")) stream.write(`${namaAcak}\n`);
              if (out.includes("Password for the initial admin account")) stream.write(`${passPanel}\n`);

              // domain / fqdn
              if (out.includes("Set the FQDN")) stream.write(`${domainpanel}\n`);

              // Let's Encrypt prompts (TOS)
              if (out.includes("You must agree") || out.includes("Do you agree")) stream.write("Y\n");

              // EFF email sharing (user requested all YES, so answer Y)
              if (low.includes("share your e-mail address with the eff") || low.includes("share your email address with the eff")) {
                stream.write("Y\n");
              }

              // generic "press enter to continue"
              if (low.includes("press enter to continue")) stream.write("\n");

              // generic yes/no prompts -> always YES as requested
              if (out.includes("(y/N)") || out.includes("(Y/n)") || out.includes("[Y/n]") || out.includes("[y/N]")) stream.write("y\n");

              // UFW / firewall related questions -> force enable
              if (low.includes("configure ufw") || low.includes("enable ufw") || low.includes("allow web traffic via ufw") || low.includes("configure firewall")) {
                stream.write("y\n");
              }

              // telemetry / anonymous data
              if (out.includes("Enable sending anonymous telemetry")) stream.write("yes\n");
            } catch (e) {
              // ignore write errors
            }

            // Log to console only
            process.stdout.write(`[panel:${ip}] ${out}`);
          }); stream.stderr.on('data', (data) => {
            const out = data.toString();
            process.stderr.write(`[panel:${ip}][ERR] ${out}`);
          });

          stream.on('close', (code) => {
            completed = true;
            conn.end();
            if (code === 0) {
              console.log(`[panel][${ip}] installer finished with code 0 (success)`);
              bot.sendMessage(chatId, `📦 *Sukses install Panel!*

*📌 IP VPS:* \`${ip}\`
*🔑 Password:* \`${password}\`
*🌐 Login:* https://${domainpanel}

*👤 Admin:* \`${namaAcak}\`
*🔐 Password:* \`${passPanel}\`
*✉ Email:* ${emailAcak}`, { parse_mode: "Markdown" }).catch(() => { });
              return resolve({ ok: true, ip, type: 'panel', domain: domainpanel, user: namaAcak, pass: passPanel });
            } else {
              console.error(`[panel][${ip}] installer finished with code ${code}`);
              bot.sendMessage(chatId, `❌ Installer Panel selesai dengan kode ${code} pada ${ip}. Cek manual di VPS.`).catch(() => { });
              return resolve({ ok: false, ip, type: 'panel', code });
            }
          });
        });
      }).on('error', (err) => {
        if (!completed) {
          console.error(`[panel][${ip}] SSH connection error:`, err);
          bot.sendMessage(chatId, `❌ Gagal koneksi SSH ke ${ip}: ${err.message}`).catch(() => { });
          return reject(err);
        }
      }).connect({
        host: ip,
        port: 22,
        username: 'root',
        password: password,
        readyTimeout: 20000
      });
    });
  }

  // ---------------------------------------------
  // OVERRIDE: Enhanced installPanel with OS check, YAML logs, HTTP check
  const __originalInstallPanel = installPanel;
  installPanel = function (chatId, ip, password, domainpanel) {
    return new Promise((resolve, reject) => {
      const conn = new Client();
      const rand = Math.floor(1000 + Math.random() * 9000);
      const namaAcak = `admin${rand}`;
      const emailAcak = `admin${rand}@gmail.com`;
      const passPanel = `${rand}`;

      // Buffers and helpers for YAML logging
      let osInfo = "Unknown";
      let installStatus = "initializing";
      let logBuffer = [];
      let yamlMsgId = null;
      let updateTimer = null;
      const formatYaml = () => {
        const safe = (str) => String(str || "").replace(/"/g, '\\"');
        const logsYaml =
          logBuffer.length > 0
            ? logBuffer.map((l) => `  - "${safe(l)}"`).join("\n")
            : "  - \"(no logs yet)\"";
        return `📡 Status instalasi panel\n\n\`\`\`yaml\nip: "${safe(ip)}"\ndomain: "${safe(domainpanel)}"\nos: "${safe(osInfo)}"\nstatus: "${safe(installStatus)}"\nlogs:\n${logsYaml}\n\`\`\``;
      };

      // send initial YAML message
      bot.sendMessage(chatId, formatYaml(), { parse_mode: "Markdown" }).then((sent) => {
        yamlMsgId = sent.message_id;
        updateTimer = setInterval(() => {
          if (yamlMsgId) {
            bot.editMessageText(formatYaml(), { chat_id: chatId, message_id: yamlMsgId, parse_mode: "Markdown" }).catch(() => { });
          }
        }, 3000);
      }).catch(() => { });

      let completed = false;

      conn.on('ready', () => {
        // detect OS before running installer
        conn.exec("grep '^PRETTY_NAME' /etc/os-release 2>/dev/null || cat /etc/os-release 2>/dev/null | grep '^PRETTY_NAME' || lsb_release -d 2>/dev/null", (err, streamOs) => {
          if (err) {
            logBuffer.push("Failed to detect OS");
            runInstaller();
            return;
          }
          let osData = "";
          streamOs.on('data', (d) => { osData += d.toString(); });
          streamOs.on('close', () => {
            let detected = osData.trim();
            const match = osData.match(/PRETTY_NAME=(?:\"?)(.+)(?:\"?)/i) || osData.match(/Description:\\s*(.+)/i);
            if (match) { detected = match[1].trim(); }
            osInfo = detected || osInfo;
            const low = osInfo.toLowerCase();
            const supported = (low.includes('debian') && (low.includes('11') || low.includes('12'))) || (low.includes('ubuntu') && (low.includes('20.04') || low.includes('22.04')));
            if (!supported) {
              installStatus = 'error';
              clearInterval(updateTimer);
              if (yamlMsgId) {
                bot.editMessageText(formatYaml(), { chat_id: chatId, message_id: yamlMsgId, parse_mode: 'Markdown' }).catch(() => { });
              }
              bot.sendMessage(chatId, `❌ OS VPS tidak didukung untuk autopilot installer.\nOS terdeteksi: ${osInfo}\nGunakan Debian 11/12 atau Ubuntu 20.04 / 22.04`).catch(() => { });
              conn.end();
              return resolve({ ok: false, ip, type: 'panel', code: 'unsupported' });
            }
            runInstaller();
          });
        });
      }).on('error', (err) => {
        if (!completed) {
          bot.sendMessage(chatId, `❌ Gagal koneksi SSH ke ${ip}: ${err.message}`).catch(() => { });
          clearInterval(updateTimer);
          return reject(err);
        }
      }).connect({ host: ip, port: 22, username: 'root', password: password, readyTimeout: 20000 });

      function runInstaller() {
        installStatus = 'installing';
        bot.sendMessage(chatId, `🔧 Memulai installasi Panel VPS ${ip} (domain: ${domainpanel}). Silahkan tunggu 10-25 menit.`).catch(() => { });
        conn.exec("while sudo fuser /var/lib/dpkg/lock-frontend >/dev/null 2>&1 || sudo fuser /var/lib/apt/lists/lock >/dev/null 2>&1 || sudo fuser /var/lib/dpkg/lock >/dev/null 2>&1; do echo Waiting for dpkg lock...; sleep 5; done; bash <(curl -s https://pterodactyl-installer.se)", (err, stream) => {
          if (err) {
            clearInterval(updateTimer);
            installStatus = 'error';
            bot.sendMessage(chatId, `❌ Gagal menjalankan installer Panel di ${ip}: ${err.message}`).catch(() => { });
            conn.end();
            return reject(err);
          }
          stream.on('data', (data) => {
            const out = data.toString();
            try {
              const low = out.toLowerCase();
              if (out.includes('Input 0-6')) stream.write('0\n');
              if (out.includes('Database name (panel)')) stream.write(`${namaAcak}\n`);
              if (out.includes('Database username (pterodactyl)')) stream.write(`${namaAcak}\n`);
              if (out.includes('Password (press enter')) stream.write('\n');
              if (out.includes('Select timezone')) stream.write('Asia/Jakarta\n');
              if (out.includes('Provide the email address')) stream.write(`${emailAcak}\n`);
              if (out.includes('Email address for the initial admin account')) stream.write(`${emailAcak}\n`);
              if (out.includes('Username for the initial admin account')) stream.write(`${namaAcak}\n`);
              if (out.includes('First name for the initial admin account')) stream.write(`${namaAcak}\n`);
              if (out.includes('Last name for the initial admin account')) stream.write(`${namaAcak}\n`);
              if (out.includes('Password for the initial admin account')) stream.write(`${passPanel}\n`);
              if (out.includes('Set the FQDN')) stream.write(`${domainpanel}\n`);
              if (out.includes('You must agree') || out.includes('Do you agree')) stream.write('Y\n');
              if (low.includes('share your e-mail address with the eff') || low.includes('share your email address with the eff')) stream.write('Y\n');
              if (low.includes('press enter to continue')) stream.write('\n');
              if (out.includes('(y/N)') || out.includes('(Y/n)') || out.includes('[Y/n]') || out.includes('[y/N]')) stream.write('y\n');
              if (low.includes('configure ufw') || low.includes('enable ufw') || low.includes('allow web traffic via ufw') || low.includes('configure firewall')) stream.write('y\n');
              if (out.includes('Enable sending anonymous telemetry')) stream.write('yes\n');
            } catch (e) { }
            const lines = out.split(/\r?\n/).filter((l) => l.trim().length > 0);
            lines.forEach((l) => { logBuffer.push(l); if (logBuffer.length > 10) logBuffer.shift(); });
          });
          stream.stderr.on('data', (data) => {
            const out = data.toString();
            const lines = out.split(/\r?\n/).filter((l) => l.trim().length > 0);
            lines.forEach((l) => { logBuffer.push(`ERR: ${l}`); if (logBuffer.length > 10) logBuffer.shift(); });
          });
          stream.on('close', (code) => {
            completed = true;
            conn.end();
            clearInterval(updateTimer);
            if (code === 0) {
              installStatus = 'success';
              axios.get(`https://${domainpanel}`, { timeout: 15000, validateStatus: () => true }).then((resp) => {
                const ok = resp && typeof resp.status !== 'undefined' && resp.status >= 200 && resp.status < 500;
                if (!ok) {
                  bot.sendMessage(chatId, `⚠️ Installer selesai dengan kode 0, tapi panel belum bisa diakses otomatis. Cek DNS, nginx, mariadb, dan log di VPS.`).catch(() => { });
                } else {
                  bot.sendMessage(chatId, `📦 *Sukses install Panel!*\n\n*📌 IP VPS:* \`${ip}\`\n*🔑 Password:* \`${password}\`\n*🌐 Login:* https://${domainpanel}\n\n*👤 Admin:* \`${namaAcak}\`\n*🔐 Password:* \`${passPanel}\`\n*✉ Email:* ${emailAcak}`, { parse_mode: 'Markdown' }).catch(() => { });
                }
                if (yamlMsgId) {
                  bot.editMessageText(formatYaml(), { chat_id: chatId, message_id: yamlMsgId, parse_mode: 'Markdown' }).catch(() => { });
                }
                return resolve({ ok: true, ip, type: 'panel', domain: domainpanel, user: namaAcak, pass: passPanel });
              }).catch(() => {
                if (yamlMsgId) {
                  bot.editMessageText(formatYaml(), { chat_id: chatId, message_id: yamlMsgId, parse_mode: 'Markdown' }).catch(() => { });
                }
                bot.sendMessage(chatId, `⚠️ Installer selesai dengan kode 0, tapi panel belum bisa diakses otomatis. Cek DNS, nginx, mariadb, dan log di VPS.`).catch(() => { });
                return resolve({ ok: true, ip, type: 'panel', domain: domainpanel, user: namaAcak, pass: passPanel });
              });
            } else {
              installStatus = 'error';
              bot.sendMessage(chatId, `❌ Installer Panel selesai dengan kode ${code} pada ${ip}. Cek manual di VPS.`).catch(() => { });
              if (yamlMsgId) {
                bot.editMessageText(formatYaml(), { chat_id: chatId, message_id: yamlMsgId, parse_mode: 'Markdown' }).catch(() => { });
              }
              return resolve({ ok: false, ip, type: 'panel', code });
            }
          });
        });
      }
    });
  };
  // ---------------------------------------------

  function installWings(chatId, ip, password, domainpanel, domainnode) {
    return new Promise((resolve, reject) => {
      const conn = new Client();
      const rand = Math.floor(1000 + Math.random() * 9000);
      const emailAcak = `admin${rand}@gmail.com`;
      const userDB = `dbuser${Math.floor(1000 + Math.random() * 9000)}`;
      const passDB = `${Math.floor(1000 + Math.random() * 9000)}`;

      bot.sendMessage(chatId, `🔧 Memulai instalasi Wings di ${ip} (node: ${domainnode}). Silahkan tunggu 5-15 menit.`).catch(() => { });

      let completed = false;

      conn.on('ready', () => {
        console.log(`[wings][${ip}] SSH connected, starting installer`);
        conn.exec("bash <(curl -s https://pterodactyl-installer.se)", (err, stream) => {
          if (err) {
            console.error(`[wings][${ip}] exec error:`, err);
            conn.end();
            bot.sendMessage(chatId, `❌ Gagal menjalankan installer Wings di ${ip}: ${err.message}`).catch(() => { });
            return reject(err);
          }

          stream.on('data', (data) => {
            const out = data.toString();
            try {
              const low = out.toLowerCase();

              // main menu: install wings
              if (out.includes("Input 0-6")) stream.write("1\n");

              // generic yes/no prompts -> always YES as requested
              if (out.includes("(y/N)") || out.includes("(Y/n)") || out.includes("[Y/n]") || out.includes("[y/N]")) stream.write("y\n");

              // panel / node / db info
              if (out.includes("Enter the panel address")) stream.write(`${domainpanel}\n`);
              if (out.includes("Database host username")) stream.write(`${userDB}\n`);
              if (out.includes("Database host password")) stream.write(`${passDB}\n`);
              if (out.includes("Set the FQDN to use for Let's Encrypt")) stream.write(`${domainnode}\n`);
              if (out.includes("Enter email address")) stream.write(`${emailAcak}\n`);

              // UFW / firewall related, force enable
              if (low.includes("configure ufw") || low.includes("enable ufw") || low.includes("allow web traffic via ufw") || low.includes("configure firewall")) {
                stream.write("y\n");
              }
            } catch (e) { }

            // Console log only
            process.stdout.write(`[wings:${ip}] ${out}`);
          });

          stream.stderr.on('data', (data) => {
            const out = data.toString();
            process.stderr.write(`[wings:${ip}][ERR] ${out}`);
          });

          stream.on('close', (code) => {
            completed = true;
            conn.end();
            if (code === 0) {
              console.log(`[wings][${ip}] installer finished with code 0 (success)`);
              bot.sendMessage(chatId, `📦 *Sukses install Wings!*

*🛰 Node:* \`${domainnode}\`
*🌐 Login:* https://${domainpanel}

*Silahkan lanjut Create Node!*`, { parse_mode: "Markdown" }).catch(() => { });
              return resolve({ ok: true, ip, type: 'wings', domainnode, email: emailAcak });
            } else {
              console.error(`[wings][${ip}] installer finished with code ${code}`);
              bot.sendMessage(chatId, `❌ Installer Wings selesai dengan kode ${code} pada ${ip}. Cek manual di VPS.`).catch(() => { });
              return resolve({ ok: false, ip, type: 'wings', code });
            }
          });
        });
      }).on('error', (err) => {
        if (!completed) {
          console.error(`[wings][${ip}] SSH connection error:`, err);
          bot.sendMessage(chatId, `❌ Gagal koneksi SSH ke ${ip}: ${err.message}`).catch(() => { });
          return reject(err);
        }
      }).connect({
        host: ip,
        port: 22,
        username: 'root',
        password: password,
        readyTimeout: 20000
      });
    });
  }

  bot.onText(/^\/uninstallpanel$/, async (msg) => {
    const chatId = msg.chat.id;
    const userId = msg.from.id.toString();

    const owners = loadJsonData(OWNER_FILE);
    if (!owners.includes(userId)) {
      return bot.sendMessage(chatId, "❌ ᴋʜᴜꜱᴜꜱ ᴏᴡɴᴇʀ!");
    }

    userStates[userId] = { step: "awaiting_ip", command: "uninstallpanel" };
    bot.sendMessage(chatId, "🌐 ᴍᴀꜱᴜᴋᴋᴀɴ ɪᴘ ᴠᴘꜱ:");
  });

  bot.on("message", async (msg) => {
    const chatId = msg.chat.id;
    const userId = msg.from.id.toString();
    const state = userStates[userId];

    if (!state) return;

    if (state.command === "uninstallpanel") {
      if (state.step === "awaiting_ip") {
        state.ip = msg.text.trim();
        state.step = "awaiting_password";
        return bot.sendMessage(chatId, "🔑 ᴍᴀꜱᴜᴋᴋᴀɴ ᴘᴀꜱꜱᴡᴏʀᴅ ᴠᴘꜱ:");
      }
      else if (state.step === "awaiting_password") {
        const ip = state.ip;
        const password = msg.text.trim();

        delete userStates[userId]; // reset state

        const conn = new Client();
        bot.sendMessage(chatId, `📡 Menghubungkan ke VPS *${ip}*...\n⏳ Uninstall panel, tunggu 10-20 menit.`, { parse_mode: "Markdown" });

        conn.on("ready", () => {
          conn.exec("bash <(curl -s https://pterodactyl-installer.se)", (err, stream) => {
            if (err) {
              conn.end();
              return bot.sendMessage(chatId, "❌ Gagal menjalankan uninstaller.");
            }

            stream.on("data", (data) => {
              const out = data.toString();
              console.log("UNINSTALL PANEL:", out);
              if (out.includes("Input 0-6")) stream.write("6\n");
              if (out.includes("Do you want to remove panel? (y/N)")) stream.write("y\n");
              if (out.includes("Do you want to remove Wings (daemon)? (y/N)")) stream.write("y\n");
              if (out.includes("Continue with uninstallation? (y/N)")) stream.write("y\n");
              if (out.includes("Choose the panel database (to skip don't input anything)")) stream.write("\n");
              if (out.includes("Choose the panel user (to skip don't input anything)")) stream.write("\n");
            })

            stream.on("close", (code) => {
              conn.end();
              if (code === 0) {
                bot.sendMessage(chatId, `✅ *Sukses Uninstall Panel!*\n\n📌 IP: \`${ip}\`\n🔑 Password: \`${password}\`\n\nUntuk install kembali, ketik /install`, { parse_mode: "Markdown" });
              } else {
                bot.sendMessage(chatId, `⚠️ Selesai dengan kode ${code}, cek manual VPS.`);
              }
            });
          });
        }).on("error", (err) => {
          bot.sendMessage(chatId, `❌ Gagal konek ke VPS:\n${err.message}`);
        }).connect({
          host: ip,
          port: 22,
          username: "root",
          password: password,
          readyTimeout: 20000
        });
      }
    }
  });

  bot.onText(/^\/usrpanel(?:\s+(.+))?/, async (msg, match) => {
    const chatId = msg.chat.id;
    const text = match[1];

    if (!text) {
      return bot.sendMessage(chatId, "❌ Format salah!\nContoh:\n/usrpanel ip,password");
    }

    if (!text.includes(",")) {
      return bot.sendMessage(chatId, "❌ Format salah!\nContoh:\n/usrpanel ipvps,password");
    }

    const [ip, password] = text.split(",");
    if (!ip || !password) {
      return bot.sendMessage(chatId, "❌ Format tidak valid.\nGunakan: /usrpanel ipvps|password");
    }

    const sshConfig = {
      host: ip,
      port: 22,
      username: "root",
      password: password.trim()
    };

    const conn = new Client();

    conn.on("ready", () => {
      conn.exec(
        'cd /var/www/pterodactyl && php artisan tinker --execute="print_r(Pterodactyl\\\\Models\\\\User::all([\'id\',\'username\',\'email\'])->toArray());"',
        (err, stream) => {
          if (err) {
            bot.sendMessage(chatId, "❌ Gagal eksekusi command.");
            return conn.end();
          }

          let output = "";
          stream.on("data", (data) => {
            output += data.toString();
          });

          stream.on("close", () => {
            conn.end();
            if (!output.trim()) {
              return bot.sendMessage(chatId, "❌ Tidak ada output dari server.");
            }

            if (output.length > 3500) {
              output = output.slice(0, 3500) + "\n... (dipotong)";
            }
            bot.sendMessage(chatId, "📋 Daftar User Panel\nOutput:\n```\n" + output + "\n```", {
              parse_mode: "Markdown"
            });
          });
        }
      );
    }).on("error", (err) => {
      bot.sendMessage(chatId, "❌ Gagal konek SSH: " + err.message);
    }).connect(sshConfig);
  });

  bot.onText(/^\/usrpasswd(?:\s+(.+))?/, async (msg, match) => {
    const chatId = msg.chat.id;
    const text = match[1];

    if (!text) {
      return bot.sendMessage(chatId, "❌ Format salah!\nContoh:\n/usrpasswd ip,password");
    }

    const parts = text.split(",");
    if (parts.length < 4) {
      return bot.sendMessage(
        chatId,
        "❌ Format salah!\nContoh: /usrpasswd ipvps|passwordroot|iduser|passwordbaru"
      );
    }

    const [ip, rootPass, userId, newPass] = parts;

    const sshConfig = {
      host: ip,
      port: 22,
      username: "root",
      password: rootPass.trim()
    };

    const conn = new Client();

    conn.on("ready", () => {
      const cmd = `cd /var/www/pterodactyl && php artisan tinker --execute="if(Pterodactyl\\Models\\User::find(${userId})){ Pterodactyl\\Models\\User::find(${userId})->update(['password' => bcrypt('${newPass}')]); echo 'Password user ID ${userId} berhasil diubah'; } else { echo 'User tidak ditemukan'; }"`;

      conn.exec(cmd, (err, stream) => {
        if (err) {
          bot.sendMessage(chatId, "❌ Gagal eksekusi command.");
          return conn.end();
        }

        let output = "";
        stream.on("data", (data) => {
          output += data.toString();
        });

        stream.on("close", () => {
          conn.end();
          if (!output.trim()) output = "❌ Tidak ada respon dari server.";
          bot.sendMessage(chatId, "🔑 Output:\n```\n" + output.trim() + "\n```", {
            parse_mode: "Markdown"
          });
        });
      });
    }).on("error", (err) => {
      bot.sendMessage(chatId, "❌ Gagal konek SSH: " + err.message);
    }).connect(sshConfig);
  });

  // /clearall user&server panel
  bot.onText(/^\/clearall (.+)$/, async (msg, match) => {
    const chatId = msg.chat.id;
    const userId = msg.from.id;

    const params = match[1].split('|');
    if (params.length !== 2) {
      return bot.sendMessage(chatId, '❌ Format salah! Gunakan: /clearall ipvps|pwvps');
    }

    const [ipvps, pwvps] = params;

    try {
      const processingMsg = await bot.sendMessage(chatId, '🔄 ᴍᴇᴍᴘʀᴏꜱᴇꜱ ᴄʟᴇᴀʀ ᴀʟʟ...');

      // koneksi SSH
      const conn = new Client();
      let sshOutput = '';

      conn.on('ready', () => {
        console.log('SSH Connection Ready');

        const cmd = `cd /var/www/pterodactyl && php artisan tinker --execute="DB::statement('SET FOREIGN_KEY_CHECKS=0;'); \\\\Pterodactyl\\\\Models\\\\User::truncate(); \\\\Pterodactyl\\\\Models\\\\Server::truncate(); DB::statement('SET FOREIGN_KEY_CHECKS=1;'); echo 'Clear all berhasil dilakukan!';"`;

        conn.exec(cmd, (err, stream) => {
          if (err) {
            bot.editMessageText(`❌ SSH Error: ${err.message}`, {
              chat_id: chatId,
              message_id: processingMsg.message_id
            });
            return conn.end();
          }

          stream.on('close', (code, signal) => {
            console.log('Stream closed');
            conn.end();

            bot.editMessageText(`✅ Sukses clear all User & Server!
ᴏᴜᴛᴘᴜᴛ:
\`\`\`
${sshOutput || 'Tidak ada output'}
\`\`\`
`, {
              chat_id: chatId,
              parse_mode: "Markdown",
              message_id: processingMsg.message_id
            });
          }).on('data', (data) => {
            sshOutput += data.toString();
          }).stderr.on('data', (data) => {
            sshOutput += data.toString();
          });
        });
      });

      conn.on('error', (err) => {
        console.error('SSH Connection Error:', err);
        bot.editMessageText(`❌ SSH Connection Error: ${err.message}`, {
          chat_id: chatId,
          message_id: processingMsg.message_id
        });
      });

      conn.on('end', () => {
        console.log('SSH Connection Ended');
      });

      // Connect to SSH
      conn.connect({
        host: ipvps,
        port: 22,
        username: 'root',
        password: pwvps
      });

    } catch (error) {
      console.error('Error:', error);
      bot.sendMessage(chatId, `❌ Terjadi error: ${error.message}`);
    }
  });

  bot.onText(/^\/clearstorage(?:\s+(.+))?$/, (msg, match) => {
    const chatId = msg.chat.id;
    const input = match && match[1] ? match[1].trim() : "";

    if (!input) {
      return bot.sendMessage(chatId,
        "❌ Format salah!\nContoh:\n/clearstorage ipvps,pwvps",
        { parse_mode: "Markdown" }
      );
    }

    const parts = input.split(",");
    if (parts.length < 2) {
      return bot.sendMessage(chatId,
        "❌ Format salah!\nContoh:\n/clearstorage ipvps,pwvps",
        { parse_mode: "Markdown" }
      );
    }

    const ipvps = parts[0].trim();
    const pwvps = parts[1].trim();

    const conn = new Client();
    let output = "";
    let stderr = "";

    conn.on("ready", () => {
      bot.sendMessage(chatId, `🚀 Membersihkan storage di VPS: ${ipvps}`);
      conn.exec(
        `docker stop $(docker ps -aq) >/dev/null 2>&1 || true && \
docker system prune -af --volumes && \
rm -rf /var/lib/docker/containers/*/*-json.log || true && \
df -h`,
        (err, stream) => {
          if (err) {
            bot.sendMessage(chatId, "❌ Error eksekusi perintah");
            conn.end();
            return;
          }

          stream.on("data", (data) => {
            output += data.toString();
          });

          stream.stderr.on("data", (data) => {
            stderr += data.toString();
          });

          stream.on("close", (code, signal) => {
            let combined = "";
            if (output) combined += output;
            if (stderr) combined += "\n\nSTDERR:\n" + stderr;

            const safeOutput = combined.length > 3900
              ? combined.slice(0, 3900) + "\n\n... (dipotong)"
              : combined || "Tidak ada output.";

            bot.sendMessage(
              chatId,
              `<b>✅ Storage dibersihkan di VPS ${ipvps}</b>\n\n📊 Sisa storage VPS:\n<pre>${safeOutput}</pre>\n\n<b>Exit code:</b> ${code},<b> Signal:</b> ${signal}`,
              { parse_mode: "HTML" }
            ).catch(() => { });
            conn.end();
          });
        }
      );
    });

    conn.on("error", (err) => {
      bot.sendMessage(chatId, `❌ Gagal terkoneksi ke VPS ${ipvps}\nError: ${err.message}`);
    });

    conn.on("end", () => {
      console.log(`SSH connection to ${ipvps} ended`);
    });

    conn.on("timeout", () => {
      bot.sendMessage(chatId, `❌ Koneksi ke VPS ${ipvps} timeout`);
      conn.end();
    });

    try {
      conn.connect({
        host: ipvps,
        port: 22,
        username: "root",
        password: pwvps,
        readyTimeout: 20000
      });
    } catch (e) {
      bot.sendMessage(chatId, `❌ Terjadi error saat mencoba koneksi: ${e.message}`);
    }
  });

  // =================================================================
  // FITUR REBUILD VPS - Reinstall OS dengan live log streaming
  // =================================================================
  const rebuildStates = {};

  bot.onText(/^\/rebuild(?:\s+(.+))?$/i, async (msg, match) => {
    const chatId = msg.chat.id;
    const userId = msg.from.id.toString();

    const owners = loadJsonData(OWNER_FILE);
    if (!owners.includes(userId)) {
      return bot.sendMessage(chatId, "❌ ᴋʜᴜꜱᴜꜱ ᴏᴡɴᴇʀ!");
    }

    const text = match[1];

    // Mode langsung: /rebuild ipvps,pwvps
    if (text) {
      const parts = text.split(/[|,]/).map(x => x.trim()).filter(Boolean);
      if (parts.length < 2) {
        return bot.sendMessage(chatId, "❌ Format salah!\nContoh:\n/rebuild ipvps,pwvps", { parse_mode: "Markdown" });
      }
      const [ipvps, pwvps] = parts;
      return runRebuildVPS(bot, chatId, msg, ipvps, pwvps);
    }

    // Mode interaktif
    rebuildStates[chatId] = { step: 'ip', data: {}, userId };
    return bot.sendMessage(chatId, "📌 ᴍᴀꜱᴜᴋᴋᴀɴ ɪᴘ ᴠᴘꜱ ᴜɴᴛᴜᴋ ʀᴇʙᴜɪʟᴅ:");
  });

  // Handler message untuk state rebuild
  bot.on('message', async (msg) => {
    const chatId = msg.chat.id;
    const text = (msg.text || '').trim();
    if (!text || text.startsWith('/')) return;

    const state = rebuildStates[chatId];
    if (!state) return;

    switch (state.step) {
      case 'ip':
        state.data.ipvps = text;
        state.step = 'pass';
        return bot.sendMessage(chatId, "🔑 ᴍᴀꜱᴜᴋᴋᴀɴ ᴘᴀꜱꜱᴡᴏʀᴅ ᴠᴘꜱ:");
      case 'pass':
        const ipvps = state.data.ipvps;
        const pwvps = text;
        delete rebuildStates[chatId];
        return runRebuildVPS(bot, chatId, msg, ipvps, pwvps);
      default:
        delete rebuildStates[chatId];
        return;
    }
  });

  /**
   * Menjalankan proses rebuild VPS dengan live log streaming
   * - Jalankan script reinstall
   * - VPS akan reboot
   * - Setelah reboot, reconnect dan stream log dari /reinstall.log
   */
  async function runRebuildVPS(bot, chatId, msg, ipvps, pwvps) {
    let logs = "🔄 **REBUILD VPS**\n\n";
    logs += `📌 IP: ${ipvps}\n`;
    logs += `⏳ Status: Menghubungkan...\n\n`;

    const loadingMsg = await bot.sendMessage(chatId, '```yaml\n' + formatRebuildLog(ipvps, 'connecting', []) + '\n```', {
      parse_mode: 'Markdown',
      reply_to_message_id: msg.message_id
    });

    let logBuffer = [];
    let currentStatus = 'connecting';

    function formatRebuildLog(ip, status, lines) {
      const safeLines = lines.slice(-15).map(l => `  - "${l.replace(/"/g, '\\"').slice(0, 100)}"`).join('\n') || '  - "(waiting...)"';
      return `ip: "${ip}"
os_target: "Ubuntu 22.04"
status: "${status}"
logs:
${safeLines}`;
    }

    function updateLog(newLine, newStatus) {
      if (newLine) {
        logBuffer.push(newLine);
        if (logBuffer.length > 20) logBuffer.shift();
      }
      if (newStatus) currentStatus = newStatus;

      const yamlContent = formatRebuildLog(ipvps, currentStatus, logBuffer);
      bot.editMessageText('```yaml\n' + yamlContent + '\n```', {
        chat_id: chatId,
        message_id: loadingMsg.message_id,
        parse_mode: 'Markdown'
      }).catch(() => { });
    }

    const conn = new Client();
    const connSettings = {
      host: ipvps,
      port: 22,
      username: 'root',
      password: pwvps,
      readyTimeout: 30000
    };

    const rebuildCmd = 'wget https://raw.githubusercontent.com/bin456789/reinstall/refs/heads/main/reinstall.sh -O reinstall.sh && chmod +x reinstall.sh && bash reinstall.sh ubuntu 22.04';

    conn.on('ready', () => {
      updateLog('SSH Connected!', 'downloading_script');

      conn.shell((err, stream) => {
        if (err) {
          updateLog('Error membuka shell: ' + err.message, 'error');
          return conn.end();
        }

        let scriptStarted = false;
        let rebootDetected = false;
        let passwordSent = 0; // Track how many times we sent password

        stream.on('data', (data) => {
          const out = data.toString();
          const lines = out.split(/\r?\n/).filter(l => l.trim().length > 0);
          lines.forEach(l => updateLog(l.slice(0, 100)));

          // Detect when reinstall is starting
          if (out.includes('Reinstalling') || out.includes('reinstall')) {
            updateLog('Proses reinstall dimulai...', 'reinstalling');
          }

          // Auto answer y/N prompts
          if (out.includes('[y/N]') || out.includes('(y/N)') || out.includes('[Y/n]')) {
            stream.write('y\n');
          }

          // FIXED: Detect password prompts and send password twice
          // First prompt: "Password:" 
          // Second prompt: "Retype password:"
          if (out.includes('Password:') && !out.includes('Retype')) {
            passwordSent++;
            updateLog(`Mengirim password (${passwordSent}/2)...`);
            setTimeout(() => {
              stream.write(pwvps + '\n');
            }, 500);
          }

          if (out.includes('Retype password:')) {
            passwordSent++;
            updateLog(`Konfirmasi password (${passwordSent}/2)...`);
            setTimeout(() => {
              stream.write(pwvps + '\n');
            }, 500);
          }

          // Detect when script asks for reboot
          // Script reinstall biasanya output: "Please type 'reboot'" atau "Run: reboot" atau "type reboot"
          if ((out.toLowerCase().includes('type reboot') || 
               out.toLowerCase().includes('run: reboot') || 
               out.toLowerCase().includes('please reboot') ||
               out.toLowerCase().includes('reboot to start') ||
               out.toLowerCase().includes('run `reboot`') ||
               out.toLowerCase().includes("run 'reboot'")) && !rebootDetected) {
            updateLog('Script minta reboot, mengirim command reboot...', 'sending_reboot');
            setTimeout(() => {
              stream.write('reboot\n');
            }, 1000);
          }

          // Detect reboot message
          if (out.includes('tail -fn+1 /reinstall.log') || out.includes('To view logs run')) {
            updateLog('VPS akan reboot, tunggu 2 menit...', 'rebooting');
            rebootDetected = true;

            // Kirim reboot dulu sebelum disconnect
            setTimeout(() => {
              stream.write('reboot\n');
              updateLog('Command reboot dikirim!', 'rebooting');
            }, 500);

            // Wait 2 minutes then try to reconnect and stream logs
            setTimeout(() => {
              conn.end();
              streamReinstallLog(bot, chatId, loadingMsg.message_id, ipvps, pwvps, logBuffer);
            }, 2 * 60 * 1000);
          }
        });

        stream.stderr.on('data', (data) => {
          const out = data.toString();
          const lines = out.split(/\r?\n/).filter(l => l.trim().length > 0);
          lines.forEach(l => updateLog('[ERR] ' + l.slice(0, 80)));
        });

        stream.on('close', () => {
          if (!rebootDetected) {
            updateLog('Stream closed', 'waiting_reboot');
          }
        });

        // Start the rebuild command
        setTimeout(() => {
          updateLog('Menjalankan script reinstall...', 'running_script');
          stream.write(rebuildCmd + '\n');
        }, 1000);
      });
    });

    conn.on('error', (err) => {
      updateLog('SSH Error: ' + err.message, 'error');
      bot.sendMessage(chatId, `❌ Gagal terkoneksi ke VPS ${ipvps}\nError: ${err.message}`);
    });

    conn.connect(connSettings);
  }

  /**
   * Reconnect ke VPS setelah reboot dan stream live log dari /reinstall.log
   */
  async function streamReinstallLog(bot, chatId, msgId, ipvps, pwvps, prevLogs) {
    let logBuffer = [...prevLogs, 'Mencoba reconnect setelah reboot...'];
    let currentStatus = 'reconnecting';
    let retryCount = 0;
    const maxRetries = 10;

    function formatRebuildLog(ip, status, lines) {
      const safeLines = lines.slice(-15).map(l => `  - "${l.replace(/"/g, '\\"').slice(0, 100)}"`).join('\n') || '  - "(waiting...)"';
      return `ip: "${ip}"
os_target: "Ubuntu 22.04"
status: "${status}"
logs:
${safeLines}`;
    }

    function updateLog(newLine, newStatus) {
      if (newLine) {
        logBuffer.push(newLine);
        if (logBuffer.length > 20) logBuffer.shift();
      }
      if (newStatus) currentStatus = newStatus;

      bot.editMessageText('```yaml\n' + formatRebuildLog(ipvps, currentStatus, logBuffer) + '\n```', {
        chat_id: chatId,
        message_id: msgId,
        parse_mode: 'Markdown'
      }).catch(() => { });
    }

    function tryConnect() {
      retryCount++;
      updateLog(`Retry ${retryCount}/${maxRetries}...`, 'reconnecting');

      const conn = new Client();
      conn.on('ready', () => {
        updateLog('Reconnected! Streaming log...', 'streaming_log');

        conn.exec('tail -fn+1 /reinstall.log', (err, stream) => {
          if (err) {
            updateLog('Error tail: ' + err.message, 'error');
            return conn.end();
          }

          let installDone = false;
          let tailTimeout;

          stream.on('data', (data) => {
            const lines = data.toString().split(/\r?\n/).filter(l => l.trim().length > 0);
            lines.forEach(l => {
              updateLog(l.slice(0, 100));

              // Detect completion
              if (l.includes('Installation complete') || l.includes('Rebooting') || l.includes('finished')) {
                installDone = true;
              }
            });

            // Reset timeout setiap ada data
            clearTimeout(tailTimeout);
            tailTimeout = setTimeout(() => {
              if (!installDone) {
                updateLog('Proses selesai (no more logs)', 'completed');
              }
              stream.close();
              conn.end();

              bot.sendMessage(chatId, `✅ **Rebuild VPS Selesai!**

📌 IP: \`${ipvps}\`
🖥️ OS Baru: Ubuntu 22.04
🔑 Password: \`${pwvps}\`

⚠️ Password VPS mungkin sudah diganti ke default. Cek email provider atau gunakan password lama.`,
                { parse_mode: 'Markdown' }
              );
            }, 60000); // 1 menit tanpa log = selesai
          });

          stream.stderr.on('data', (data) => {
            const lines = data.toString().split(/\r?\n/).filter(l => l.trim().length > 0);
            lines.forEach(l => updateLog('[ERR] ' + l.slice(0, 80)));
          });

          stream.on('close', () => {
            updateLog('Tail stream closed', installDone ? 'completed' : 'waiting');
          });
        });
      });

      conn.on('error', (err) => {
        if (retryCount < maxRetries) {
          updateLog('Reconnect failed, retrying in 30s...', 'waiting_reboot');
          setTimeout(tryConnect, 30000);
        } else {
          updateLog('Max retries reached', 'timeout');
          bot.sendMessage(chatId, `⚠️ VPS ${ipvps} masih dalam proses reinstall.

Kemungkinan:
1. VPS masih reboot/reinstall
2. Password sudah berubah
3. IP berubah

Coba login manual ke VPS dan jalankan:
\`tail -fn+1 /reinstall.log\``, { parse_mode: 'Markdown' });
        }
      });

      conn.connect({
        host: ipvps,
        port: 22,
        username: 'root',
        password: pwvps,
        readyTimeout: 30000
      });
    }

    // Start trying to connect
    tryConnect();
  }

}