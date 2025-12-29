const axios = require("axios");
const fs = require("fs");
const fetch = require("node-fetch"); // <-- Pastikan fetch di-import
const {
    loadJsonData,
    saveJsonData,
    checkCooldown } = require('../lib/function');

const { getGroupType } = require('../lib/groupSettings');

// Path ke database setting panel yang baru
const PANEL_SETTINGS_FILE = "./db/panel_settings.json";

const PRIVATE_FILE = "./db/users/private/privateID.json";
const PRIVPREM_FILE = "./db/users/private/privPrem.json";
const PRIVRESS_FILE = "./db/users/private/privateRess.json";
const CADMIN_FILE = "./db/cadmin.json";

const settings = require("../config.js"); // Tetap butuh untuk dev, ownerId, dll.
const dev = settings.dev;
const OWNER_ID = settings.ownerId;
const ALLOWED_GROUP_ID = settings.exPGroupId;
const panel = settings.panel;


function isPrivatePanelGroup(chatId) {
    const type = getGroupType(chatId, { exGroupId: settings.exGroupId, exPGroupId: settings.exPGroupId });
    return type === 'private';
}


// Ambil setting yang TIDAK pindah (tetap di config.js)
const eggs = settings.eggs;
const locs = settings.loc;

// HAPUS const { domainPriv, pltaPriv, ... } dari sini

if (!fs.existsSync(PRIVATE_FILE)) {
    saveJsonData(PRIVATE_FILE, []);
}

if (!fs.existsSync(PRIVPREM_FILE)) {
    saveJsonData(PRIVPREM_FILE, []);
}

if (!fs.existsSync(PRIVRESS_FILE)) {
    saveJsonData(PRIVRESS_FILE, []);
}

if (!fs.existsSync(CADMIN_FILE)) {
    saveJsonData(CADMIN_FILE, []);
}

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
        // monitoring (Perintah ini sepertinya salah copy, seharusnya /srvcpu private)
bot.onText(/\/srvcpu/, async (msg) => {
  const chatId = msg.chat.id;
  
  // --- REFACTOR ---
  // Baca setting terbaru (ini pakai setting public, sesuai file asli kamu)
  const panelSettings = loadJsonData(PANEL_SETTINGS_FILE);
  const { domain, plta, pltc } = panelSettings;
  // --- SELESAI REFACTOR ---

  bot.sendMessage(chatId, "⏳");
  try {
    let page = 1;
    let totalPages = 1;
    let hasil = "📊 *Monitoring CPU Server*\n\n";

    do {
      const serversRes = await axios.get(`${domain}/api/application/servers?page=${page}`, {
        headers: { Authorization: `Bearer ${plta}`, Accept: "application/json" },
      });

      const servers = serversRes.data.data;
      totalPages = serversRes.data.meta.pagination.total_pages;

      for (const s of servers) {
        const name = s.attributes.name;
        const uuidShort = s.attributes.uuid.split("-")[0]; // uuidShort untuk client API

        try {
          const utilRes = await axios.get(
            `${domain}/api/client/servers/${uuidShort}/resources`,
            { headers: { Authorization: `Bearer ${pltc}`, Accept: "application/json" } }
          );

          const cpu = utilRes.data.attributes.resources.cpu_absolute;

          if (cpu >= 80) {
            hasil += `⚠️ *${name}* - CPU: ${cpu}%\n`;
          }
        } catch (err) {
          console.error(`Utilization error ${name}:`, err.message);
        }
      }

      page++;
    } while (page <= totalPages);

    if (hasil === "📊 *Monitoring CPU Server*\n\n") {
      hasil += "Status Server:\n✅ Semua server normal (CPU < 80%)";
    }

    bot.sendMessage(chatId, hasil, { parse_mode: "Markdown", reply_to_message_id: msg.message_id });
  } catch (error) {
    console.error(error.message);
    bot.sendMessage(chatId, "❌ Gagal mengambil data server!");
  }
});
    
    // createadmin
bot.onText(/\/cadmin(?:\s+(.+))?/, async (msg, match) => {
  notifyOwner('cadmin', msg);
  const chatId = msg.chat.id;
  const userId = msg.from.id;
  const text = match[1];
    
  if (!isPrivatePanelGroup(chatId)) {
    return bot.sendMessage(chatId, "ᴋʜᴜꜱᴜꜱ ᴅɪ ᴘᴀɴᴇʟ ᴘʀɪᴠᴀᴛᴇ", {
      reply_markup: {
        inline_keyboard: [
          [{ text: "ʙᴜʏ ᴘʀɪᴠᴀᴛᴇ", url: `https://t.me/${dev}` }],
        ],
      },
    });
    return;
  }
    
  if (!text) {
      return bot.sendMessage(chatId,
"❌ Format salah!\nContoh: /cadmin nama,id");
  }
    
  const privPrem = JSON.parse(fs.readFileSync(PRIVPREM_FILE));
  const isPrivPrem = privPrem.includes(String(msg.from.id));
    
  if (!isPrivPrem) {
    bot.sendMessage(chatId, "ᴋʜᴜsᴜs ᴘʀᴇᴍɪᴜᴍ ᴘʀɪᴠᴀᴛᴇ!", {
      reply_markup: {
        inline_keyboard: [
          [{ text: "ʙᴜʏ ᴘʀɪᴠᴀᴛᴇ", url: `https://t.me/${dev}` }],
        ],
      },
    });
    return;
  }
    
  const waktu = checkCooldown(msg.from.id);
    if (waktu > 0) return bot.sendMessage(chatId, `⏳ Tunggu ${waktu} detik sebelum bisa pakai command /cadmin lagi!`, { reply_to_message_id: msg.message_id });
  
  const commandParams = match[1].split(",");
if (commandParams.length < 2) {
  bot.sendMessage(
    chatId,
    "Format Salah! Penggunaan: /cadmin nama,idtele"
  );
  return;
}

  const panelName = commandParams[0].trim();
  const telegramId = commandParams[1].trim();

  const password = panelName + Math.random().toString(36).slice(2, 5);
    
  // --- REFACTOR ---
  const panelSettings = loadJsonData(PANEL_SETTINGS_FILE);
  const { domainPriv, pltaPriv } = panelSettings;
  // --- SELESAI REFACTOR ---
    
  try {
    const response = await fetch(`${domainPriv}/api/application/users`, {
      method: "POST",
      headers: {
        Accept: "application/json",
        "Content-Type": "application/json",
        Authorization: `Bearer ${pltaPriv}`,
      },
      body: JSON.stringify({
        email: `${panelName}@admin.${dev}`,
        username: panelName,
        first_name: panelName,
        last_name: "admin",
        language: "en",
        root_admin: true,
        password: password,
      }),
    });
    const data = await response.json();
    if (data.errors) {
      bot.sendMessage(chatId, JSON.stringify(data.errors[0], null, 2));
      return;
    }
    const user = data.attributes;
    const userInfo = `
TYPE: ADMIN PANEL PRIVATE
➟ ID: ${user.id}
➟ USERNAME: ${user.username}
➟ EMAIL: ${user.email}
➟ NAME: ${user.first_name} ${user.last_name}
➟ LANGUAGE: ${user.language}
➟ ADMIN: ${user.root_admin}
➟ CREATED AT: ${user.created_at}
    `;
    bot.sendMessage(chatId, userInfo);
     
    const caption = `🔐 Sukses Created Admin Panel!

👤 Username: <code>${user.username}</code>
🔑 Password: <code>${password}</code>
🌐 Login: ${domainPriv}

<blockquote>📌 Catatan :
Simpan informasi data ini dengan aman
dan jangan bagikan ke orang lain!
</blockquote>
`;

bot.sendPhoto(telegramId, panel, { caption, parse_mode: "HTML" });
      
let db = [];
if (fs.existsSync(CADMIN_FILE)) {
  db = JSON.parse(fs.readFileSync(CADMIN_FILE));
}

if (!db.includes(String(userId))) {
  db.push(String(userId));
  fs.writeFileSync(CADMIN_FILE, JSON.stringify(db, null, 2));
}
   
  } catch (error) {
    console.error(error);
    bot.sendMessage(
      chatId,
      "Terjadi kesalahan dalam pembuatan admin. Silakan coba lagi nanti."
    );
  }
});
    
bot.onText(/\/listcadmin/, (msg) => {
  const chatId = msg.chat.id;
    
  if (!isPrivatePanelGroup(chatId)) {
    return bot.sendMessage(chatId, "ᴋʜᴜꜱᴜꜱ ᴅɪ ᴘᴀɴᴇʟ ᴘʀɪᴠᴀᴛᴇ", {
      reply_markup: {
        inline_keyboard: [
          [{ text: "ʙᴜʏ ᴘʀɪᴠᴀᴛᴇ", url: `https://t.me/${dev}` }],
        ],
      },
    });
    return;
  }

  if (!fs.existsSync(CADMIN_FILE)) {
    return bot.sendMessage(chatId, "❌ Belum ada data cadmin tersimpan.");
  }

  const db = JSON.parse(fs.readFileSync(CADMIN_FILE));

  if (db.length === 0) {
    return bot.sendMessage(chatId, "❌ Tidak user yang tercatat.");
  }

  let text = "📋 <b>User yang pakai /cadmin:</b>\n\n";
  db.forEach((id, index) => {
    text += `${index + 1}. <code>${id}</code>\n`;
  });

  bot.sendMessage(chatId, text, { parse_mode: "HTML" });
});

    // createunli
bot.onText(/\/cunli(?:\s+(.+))?/, async (msg, match) => {
  notifyOwner('cunli', msg);
  const chatId = msg.chat.id;
  const text = match[1];
    
  if (!isPrivatePanelGroup(chatId)) {
    return bot.sendMessage(chatId, "ᴋʜᴜꜱᴜꜱ ᴅɪ ᴘᴀɴᴇʟ ᴘʀɪᴠᴀᴛᴇ", {
      reply_markup: {
        inline_keyboard: [
          [{ text: "ʙᴜʏ ᴘʀɪᴠᴀᴛᴇ", url: `https://t.me/${dev}` }],
        ],
      },
    });
    return;
  }
    
  if (!text) {
      return bot.sendMessage(chatId,
"❌ Format salah!\nContoh: /cunli nama,id");
  }

  const privRess = JSON.parse(fs.readFileSync(PRIVRESS_FILE));
  const isPrivRess = privRess.includes(String(msg.from.id));
    
  if (!isPrivRess) {
    bot.sendMessage(chatId, "ᴋʜᴜsᴜs ʀᴇsᴇʟʟᴇʀ ᴘʀɪᴠᴀᴛᴇ", {
      reply_markup: {
        inline_keyboard: [
          [{ text: "ʙᴜʏ ᴘʀɪᴠᴀᴛᴇ", url: `https://t.me/${dev}` }],
        ],
      },
    });
    return;
  }
    
  const waktu = checkCooldown(msg.from.id);
    if (waktu > 0) return bot.sendMessage(chatId, `⏳ Tunggu ${waktu} detik sebelum bisa pakai command /cunli lagi!`, { reply_to_message_id: msg.message_id });

  const t = text.split(",");
  if (t.length < 2) {
    bot.sendMessage(chatId, "⚠️ Format: /cunli namapanel,idtele");
    return;
  }

  const username = t[0].trim();
  const u = parseInt(t[1].trim());
  const name = username + "unli";
  // const egg = eggs; // <-- Sudah ada di atas
  // const loc = locs; // <-- Sudah ada di atas
  const memo = "0";
  const cpu = "0";
  const disk = "0";
  const email = `${username}@unli.${dev}`;
  const spc =
    'if [[ -d .git ]] && [[ {{AUTO_UPDATE}} == "1" ]]; then git pull; fi; if [[ ! -z ${NODE_PACKAGES} ]]; then /usr/local/bin/npm install ${NODE_PACKAGES}; fi; if [[ ! -z ${UNNODE_PACKAGES} ]]; then /usr/local/bin/npm uninstall ${UNNODE_PACKAGES}; fi; if [ -f /home/container/package.json ]; then /usr/local/bin/npm install; fi; /usr/local/bin/${CMD_RUN}';
    
  const password = username + Math.random().toString(36).slice(2, 5);
  
  // --- REFACTOR ---
  const panelSettings = loadJsonData(PANEL_SETTINGS_FILE);
  const { domainPriv, pltaPriv } = panelSettings;
  // --- SELESAI REFACTOR ---
  
  let user;
  let server;

  try {
    // CREATE USER
    const response = await fetch(`${domainPriv}/api/application/users`, {
      method: "POST",
      headers: {
        Accept: "application/json",
        "Content-Type": "application/json",
        Authorization: `Bearer ${pltaPriv}`,
      },
      body: JSON.stringify({
        email: email,
        username: username,
        first_name: username,
        last_name: username,
        language: "en",
        password: password,
      }),
    });

    const data = await response.json();
    if (data.errors) {
      if (
        data.errors[0].meta.rule === "unique" &&
        data.errors[0].meta.source_field === "email"
      ) {
        bot.sendMessage(chatId, "⚠️ Email & Username sudah ada di panel! Coba lagi.");
      } else {
        bot.sendMessage(chatId, `❌ Error: ${JSON.stringify(data.errors[0], null, 2)}`);
      }
      return;
    }
    user = data.attributes;

    // CREATE SERVER
    const response2 = await fetch(`${domainPriv}/api/application/servers`, {
      method: "POST",
      headers: {
        Accept: "application/json",
        "Content-Type": "application/json",
        Authorization: `Bearer ${pltaPriv}`,
      },
      body: JSON.stringify({
        name: name,
        description: "",
        user: user.id,
        egg: parseInt(egg),
        docker_image: "ghcr.io/parkervcp/yolks:nodejs_20",
        startup: spc,
        environment: {
          INST: "npm",
          USER_UPLOAD: "0",
          AUTO_UPDATE: "0",
          CMD_RUN: "npm start",
        },
        limits: {
          memory: memo,
          swap: 0,
          disk: disk,
          io: 500,
          cpu: cpu,
        },
        feature_limits: {
          databases: 5,
          backups: 5,
          allocations: 1,
        },
        deploy: {
          locations: [parseInt(locs)], // <-- pakai 'locs'
          dedicated_ip: false,
          port_range: [],
        },
      }),
    });

    const data2 = await response2.json();
    if (data2.errors) {
      bot.sendMessage(chatId, `❌ Error saat buat server: ${JSON.stringify(data2.errors[0], null, 2)}`);
      return;
    }
    server = data2.attributes;

  } catch (error) {
    bot.sendMessage(chatId, `❌ Error: ${error.message}`);
    return;
  }

  if (user && server) {
    bot.sendMessage(
      chatId,
      `Type: Unli Private
📡 ID: ${user.id}
👤 USERNAME: ${username}
⚙️ MEMORY: ${server.limits.memory === 0 ? "Unlimited" : server.limits.memory} MB
`
    );

    // kirim data panel ke user yang dituju
      
    bot.sendPhoto(u, panel, {
      caption: `🔐 *Sukses Created Panel Private!*

🌐 *Akun Panel*
▸ Username: ${user.username}
▸ Password: \`${password}\`

\`\`\`
┏━━━ RULES PANEL ━━⬣
│• No Share Panel
│• Sensor Domain
│• Garansi 15 hari
┗━━━━━━━━━━━━━━⬣
\`\`\`
`,
      parse_mode: "Markdown",
      reply_markup: {
        inline_keyboard: [
          [
          { text: "🌐 Domain", url: domainPriv },
          { text: "🔑 Salin Password", switch_inline_query_current_chat: password }
          ],
        ],
      },
    });

    bot.sendMessage(
      chatId,
      `✅ Berhasil kirim panel private ke @${msg.from.username}\n(ID: ${u})`, {
    parse_mode: "Markdown", reply_to_message_id: msg.message_id
  });
  } else {
    bot.sendMessage(chatId, `❌ Akun admin panel private tidak ada! Laporkan ke @${dev}.`);
  }
});
    
    // /pinfo
bot.onText(/\/pinfo/, (msg) => {
  const chatId = msg.chat.id;
    
  if (!isPrivatePanelGroup(chatId)) {
    return bot.sendMessage(chatId, "ᴋʜᴜꜱᴜꜱ ᴅɪ ᴘᴀɴᴇʟ ᴘʀɪᴠᴀᴛᴇ", {
      reply_to_message_id: msg.message_id,
      reply_markup: {
        inline_keyboard: [
          [{ text: "ʙᴜʏ ᴘʀɪᴠᴀᴛᴇ", url: `https://t.me/${dev}` }],
        ],
      },
    });
    return;
  }
    
  // ambil target
  const target = msg.reply_to_message ? msg.reply_to_message.from : msg.from;

  const username = target.username || "-";
  const userId = target.id.toString();

  let privUsers = [];
  let privPrem = [];
  let privRess = [];

  if (fs.existsSync(PRIVATE_FILE)) {
    privUsers = JSON.parse(fs.readFileSync(PRIVATE_FILE));
  }

  if (fs.existsSync(PRIVPREM_FILE)) {
    privPrem = JSON.parse(fs.readFileSync(PRIVPREM_FILE));
  }

  if (fs.existsSync(PRIVRESS_FILE)) {
    privRess = JSON.parse(fs.readFileSync(PRIVRESS_FILE));
  }

  const txtInfo = `
ID: <code>${userId}</code>
Username: @${username}
Status:
<blockquote>- Private Owner? ${privUsers.includes(userId) ? "✅" : "❌"}
- Premium Private? ${privPrem.includes(userId) ? "✅" : "❌"}
- Reseller Private? ${privRess.includes(userId) ? "✅" : "❌"}
</blockquote>
`;

  bot.sendMessage(chatId, txtInfo, {
    parse_mode: "HTML", reply_to_message_id: msg.message_id
  });
});

// === /addpremp ===
bot.onText(/^\/addpremp$/, (msg) => {
  const chatId = msg.chat.id;
  const userId = msg.from.id.toString();

  const privates = loadJsonData(PRIVATE_FILE)
  if (msg.from.id !== OWNER_ID && !privates.includes(userId)) {
    return bot.sendMessage(chatId, '❌ Khusus Owner Private yang dapat menambahkan ke Premium Private!')
  }

  if (!msg.reply_to_message) {
    return bot.sendMessage(chatId, '⚠️ Reply pesan user yang ingin ditambahkan!');
  }

  const targetUserId = msg.reply_to_message.from.id.toString();
  const privPrem = loadJsonData(PRIVPREM_FILE);

  if (privPrem.includes(targetUserId)) {
    return bot.sendMessage(chatId, '⚠️ ᴜꜱᴇʀ ꜱᴜᴅᴀʜ ᴍᴇɴᴊᴀᴅɪ ꜱᴇʙᴀɢᴀɪ ᴘʀᴇᴍɪᴜᴍ ᴘʀɪᴠᴀᴛᴇ!');
  }

  privPrem.push(targetUserId);
  const success = saveJsonData(PRIVPREM_FILE, privPrem);

  if (success) {
    bot.sendMessage(chatId, `✅ ᴜsᴇʀ ɪᴅ ${targetUserId} ʙᴇʀʜᴀꜱɪʟ ᴅɪᴛᴀᴍʙᴀʜᴋᴀɴ ꜱᴇʙᴀɢᴀɪ ᴜꜱᴇʀ ᴘʀᴇᴍɪᴜᴍ ᴘʀɪᴠᴀᴛᴇ!`, {
      parse_mode: "Markdown",
      reply_to_message_id: msg.message_id
    });
  } else {
    bot.sendMessage(chatId, '❌ Gagal menyimpan data User Private!');
  }
});

// === /addressp ===
bot.onText(/^\/addressp$/, (msg) => {
  const chatId = msg.chat.id;
  const userId = msg.from.id.toString();

  const privates = loadJsonData(PRIVATE_FILE)
  if (msg.from.id !== OWNER_ID && !privates.includes(userId)) {
    return bot.sendMessage(chatId, '❌ Khusus Owner Private yang dapat menambahkan ke Reseller Private!')
  }

  if (!msg.reply_to_message) {
    return bot.sendMessage(chatId, '⚠️ Reply pesan user yang ingin ditambahkan!');
  }

  const targetUserId = msg.reply_to_message.from.id.toString();
  const privRess = loadJsonData(PRIVRESS_FILE);

  if (privRess.includes(targetUserId)) {
    return bot.sendMessage(chatId, '⚠️ ᴜꜱᴇʀ ꜱᴜᴅᴀʜ ᴍᴇɴᴊᴀᴅɪ ꜱᴇʙᴀɢᴀɪ ʀᴇꜱᴇʟʟᴇʀ ᴘʀɪᴠᴀᴛᴇ!');
  }

  privRess.push(targetUserId);
  const success = saveJsonData(PRIVRESS_FILE, privRess);

  if (success) {
    bot.sendMessage(chatId, `✅ ᴜsᴇʀ ɪᴅ ${targetUserId} ʙᴇʀʜᴀꜱɪʟ ᴅɪᴛᴀᴍʙᴀʜᴋᴀɴ ꜱᴇʙᴀɢᴀɪ ᴜꜱᴇʀ ʀᴇꜱᴇʟʟᴇʀ ᴘʀɪᴠᴀᴛᴇ!`, {
      parse_mode: "Markdown",
      reply_to_message_id: msg.message_id
    });
  } else {
    bot.sendMessage(chatId, '❌ Gagal menyimpan data User Private!');
  }
});
    
    // srvofflist
bot.onText(/\/srvofflist/, async (msg) => {
  const chatId = msg.chat.id;
  
  if (!isPrivatePanelGroup(chatId)) {
    return bot.sendMessage(chatId, "ᴋʜᴜꜱᴜꜱ ᴅɪ ᴘᴀɴᴇʟ ᴘʀɪᴠᴀᴛᴇ", {
      reply_markup: {
        inline_keyboard: [
          [{ text: "ʙᴜʏ ᴘʀɪᴠᴀᴛᴇ", url: `https://t.me/${dev}` }],
        ],
      },
    });
    return;
  }

  try {
    const ownerUsers = JSON.parse(fs.readFileSync(PRIVATE_FILE));
    const isOwner = ownerUsers.includes(String(msg.from.id));
    if (!isOwner) {
      return bot.sendMessage(chatId, "❌ Khusus Owner!", {
        reply_markup: {
          inline_keyboard: [[{ text: "LAPORAN", url: `https://t.me/${dev}` }]],
        },
      });
    }
      
    bot.sendMessage(chatId, "⏳");

    // --- REFACTOR ---
    const panelSettings = loadJsonData(PANEL_SETTINGS_FILE);
    const { domainPriv, pltaPriv, pltcPriv } = panelSettings;
    // --- SELESAI REFACTOR ---

    let offlineServers = [];
    let page = 1;
    let totalPages = 1;

    // Ambil semua halaman server
    do {
      let f = await fetch(`${domainPriv}/api/application/servers?page=${page}`, {
        method: "GET",
        headers: {
          Accept: "application/json",
          "Content-Type": "application/json",
          Authorization: `Bearer ${pltaPriv}`,
        },
      });

      let res = await f.json();
      let servers = res.data;
      totalPages = res.meta.pagination.total_pages;

      for (let server of servers) {
        let s = server.attributes;
        try {
          let f3 = await fetch(
            `${domainPriv}/api/client/servers/${s.uuid.split("-")[0]}/resources`,
            {
              method: "GET",
              headers: {
                Accept: "application/json",
                "Content-Type": "application/json",
                Authorization: `Bearer ${pltcPriv}`,
              },
            }
          );

          let data = await f3.json();
          let status = data.attributes ? data.attributes.current_state : s.status;

          if (status === "offline") {
            offlineServers.push(
              `ID Server: ${s.id}\nNama: ${s.name}\nStatus: ${status}\n`
            );
          }
        } catch (err) {
          console.error(`Gagal ambil data server ${s.id}`, err);
        }
      }

      page++;
    } while (page <= totalPages);

    if (offlineServers.length === 0) {
      return bot.sendMessage(chatId, "✅ Semua server sedang online.");
    }

    // Gabung semua offline server ke string
    let messageText = `📋 Server Private Offline (${offlineServers.length}):\n\n${offlineServers.join("\n")}`;

    // Handle limit karakter Telegram (4096)
    while (messageText.length > 0) {
      let chunk = messageText.slice(0, 4000); 
      messageText = messageText.slice(4000);
      await bot.sendMessage(chatId, chunk);
    }

  } catch (error) {
    console.error(error);
    bot.sendMessage(chatId, "⚠️ Terjadi kesalahan saat memproses /srvofflist.");
  }
});
    
    // srvoffdel
bot.onText(/\/srvoffdel/, async (msg) => {
  const chatId = msg.chat.id;
  
  if (!isPrivatePanelGroup(chatId)) {
    return bot.sendMessage(chatId, "ᴋʜᴜꜱᴜꜱ ᴅɪ ᴘᴀɴᴇʟ ᴘʀɪᴠᴀᴛᴇ", {
      reply_markup: {
        inline_keyboard: [
          [{ text: "ʙᴜʏ ᴘʀɪᴠᴀᴛᴇ", url: `https://t.me/${dev}` }],
        ],
      },
    });
    return;
  }

  try {
    const ownerUsers = JSON.parse(fs.readFileSync(PRIVATE_FILE));
    const isOwner = ownerUsers.includes(String(msg.from.id));
    if (!isOwner) {
      return bot.sendMessage(chatId, "❌ Khusus Owner Private!", {
        reply_markup: {
          inline_keyboard: [[{ text: "PRIVATE JOIN", url: `https://t.me/${dev}` }]],
        },
      });
    }
      
    bot.sendMessage(chatId, "⏳");

    // --- REFACTOR ---
    const panelSettings = loadJsonData(PANEL_SETTINGS_FILE);
    const { domainPriv, pltaPriv, pltcPriv } = panelSettings;
    // --- SELESAI REFACTOR ---

    let page = 1;
    let totalPages = 1;
    let offlineServers = [];

    // Ambil semua server dari semua page
    do {
      let f = await fetch(`${domainPriv}/api/application/servers?page=${page}`, {
        method: "GET",
        headers: {
          Accept: "application/json",
          "Content-Type": "application/json",
          Authorization: `Bearer ${pltaPriv}`,
        },
      });

      let res = await f.json();
      let servers = res.data;
      totalPages = res.meta.pagination.total_pages;

      for (let server of servers) {
        let s = server.attributes;
        try {
          let f3 = await fetch(
            `${domainPriv}/api/client/servers/${s.uuid.split("-")[0]}/resources`,
            {
              method: "GET",
              headers: {
                Accept: "application/json",
                "Content-Type": "application/json",
                Authorization: `Bearer ${pltcPriv}`,
              },
            }
          );

          let data = await f3.json();
          let status = data.attributes ? data.attributes.current_state : s.status;

          if (status === "offline") {
            offlineServers.push({ id: s.id, name: s.name });
          }
        } catch (err) {
          console.error(`Gagal ambil data server ${s.id}`, err);
        }
      }

      page++;
    } while (page <= totalPages);

    if (offlineServers.length === 0) {
      return bot.sendMessage(chatId, "✅ Tidak ada server offline untuk dihapus.");
    }

    let success = [];
    let failed = [];

    for (let srv of offlineServers) {
      try {
        let del = await fetch(`${domainPriv}/api/application/servers/${srv.id}`, {
          method: "DELETE",
          headers: {
            Accept: "application/json",
            "Content-Type": "application/json",
            Authorization: `Bearer ${pltaPriv}`,
          },
        });

        if (del.status === 204) {
          success.push(`✅ ${srv.name} (ID: ${srv.id})`);
        } else {
          failed.push(`❌ ${srv.name} (ID: ${srv.id})`);
        }
      } catch (err) {
        console.error(`Gagal hapus server ${srv.id}`, err);
        failed.push(`❌ ${srv.name} (ID: ${srv.id})`);
      }
    }

    let report = `🗑️ Sukses menghapus Server Private yang Offline:\n\n` +
      `Berhasil dihapus: ${success.length}\n` +
      `Gagal dihapus: ${failed.length}\n\n`;

    if (success.length) {
      report += `✅ Berhasil:\n${success.join("\n")}\n\n`;
    }
    if (failed.length) {
      report += `❌ Gagal:\n${failed.join("\n")}`;
    }

    // Handle limit karakter telegram
    while (report.length > 0) {
      let chunk = report.slice(0, 4000);
      report = report.slice(4000);
      await bot.sendMessage(chatId, chunk);
    }

  } catch (error) {
    console.error(error);
    bot.sendMessage(chatId, "⚠️ Terjadi kesalahan saat memproses /delsrvoff.");
  }
});
    
    // totalsrv
bot.onText(/\/totalsrv/, async (msg) => {
  const chatId = msg.chat.id;
  if (!isPrivatePanelGroup(chatId)) {
    return bot.sendMessage(chatId, "ᴋʜᴜꜱᴜꜱ ᴅɪ ᴘᴀɴᴇʟ ᴘʀɪᴠᴀᴛᴇ", {
      reply_markup: {
        inline_keyboard: [
          [{ text: "ʙᴜʏ ᴘʀɪᴠᴀᴛᴇ", url: `https://t.me/${dev}` }],
        ],
      },
    });
    return;
  }

  bot.sendMessage(chatId, "⏳"); 
    
  // --- REFACTOR ---
  const panelSettings = loadJsonData(PANEL_SETTINGS_FILE);
  const { domainPriv, pltaPriv } = panelSettings;
  // --- SELESAI REFACTOR ---
    
  try {
    let page = 1;
    let totalPages = 1;
    let totalServers = 0;

    // Loop semua halaman server
    do {
      let f = await fetch(`${domainPriv}/api/application/servers?page=${page}`, {
        method: "GET",
        headers: {
          Accept: "application/json",
          "Content-Type": "application/json",
          Authorization: `Bearer ${pltaPriv}`,
        },
      });

      let res = await f.json();
      totalPages = res.meta.pagination.total_pages;

      if (res.data && res.data.length > 0) {
        totalServers += res.data.length;
      }

      page++;
    } while (page <= totalPages);

    return bot.sendMessage(
      chatId,
      `*📊 Total Server Private:* ${totalServers}`, {
    parse_mode: "Markdown", reply_to_message_id: msg.message_id }
    );

  } catch (error) {
    console.error(error);
    bot.sendMessage(chatId, "⚠️ Terjadi kesalahan saat memproses /totalsrv.");
  }
});
    
    // srvlist
bot.onText(/\/srvlist/, async (msg) => {
  const chatId = msg.chat.id;
  const userId = msg.from.id;
    
  if (!isPrivatePanelGroup(chatId)) {
    return bot.sendMessage(chatId, "ᴋʜᴜꜱᴜꜱ ᴅɪ ᴘᴀɴᴇʟ ᴘʀɪᴠᴀᴛᴇ", {
      reply_markup: {
        inline_keyboard: [
          [{ text: "ʙᴜʏ ᴘʀɪᴠᴀᴛᴇ", url: `https://t.me/${dev}` }],
        ],
      },
    });
    return;
  }

  const privUsers = JSON.parse(fs.readFileSync(PRIVATE_FILE));
  const isPrivate = privUsers.includes(String(msg.from.id));
    
  if (!isPrivate) {
    bot.sendMessage(chatId, "ᴋʜᴜsᴜs ᴜsᴇʀ ᴘʀɪᴠᴀᴛᴇ!", {
      reply_markup: {
        inline_keyboard: [
          [{ text: "ʙᴜʏ ᴘʀɪᴠᴀᴛᴇ", url: `https://t.me/${dev}` }],
        ],
      },
    });
    return;
  }
    
  bot.sendMessage(chatId, "⏳");
   
  // --- REFACTOR ---
  const panelSettings = loadJsonData(PANEL_SETTINGS_FILE);
  const { domainPriv, pltaPriv, pltcPriv } = panelSettings;
  // --- SELESAI REFACTOR ---
   
  let page = 1;
  try {
    let f = await fetch(`${domainPriv}/api/application/servers?page=${page}`, {
      
      method: "GET",
      headers: {
        Accept: "application/json",
        "Content-Type": "application/json",
        Authorization: `Bearer ${pltaPriv}`,
      },
    });
    let res = await f.json();
    let servers = res.data;
    let messageText = "📋 ᴅᴀғᴛᴀʀ sᴇʀᴠᴇʀ ᴘʀɪᴠᴀᴛᴇ:\n\n";
    for (let server of servers) {
      let s = server.attributes;

      let f3 = await fetch(
        `${domainPriv}/api/client/servers/${s.uuid.split("-")[0]}/resources`,
        {
          method: "GET",
          headers: {
            Accept: "application/json",
            "Content-Type": "application/json",
            Authorization: `Bearer ${pltcPriv}`,
          },
        }
      );
      let data = await f3.json();
      let status = data.attributes ? data.attributes.current_state : s.status;

      messageText += `ID Server: ${s.id}\n`;
      messageText += `Nama Server: ${s.name}\n`;
      messageText += `Status: ${status}\n\n`;
    }

    bot.sendMessage(chatId, messageText);
  } catch (error) {
    console.error(error);
    bot.sendMessage(chatId, "Terjadi kesalahan dalam memproses permintaan.");
  }});

bot.onText(/^\/srvdel (.+)$/, async (msg, match) => {
  notifyOwner('srvdel', msg);
  const chatId = msg.chat.id;
    
  if (!isPrivatePanelGroup(chatId)) {
    return bot.sendMessage(chatId, "ᴋʜᴜꜱᴜꜱ ᴅɪ ᴘᴀɴᴇʟ ᴘʀɪᴠᴀᴛᴇ", {
      reply_markup: {
        inline_keyboard: [
          [{ text: "ʙᴜʏ ᴘʀɪᴠᴀᴛᴇ", url: `https://t.me/${dev}` }],
        ],
      },
    });
    return;
  }
    
  const srv = match[1].trim();
    
  const privUsers = JSON.parse(fs.readFileSync(PRIVATE_FILE));
  const isPrivate = privUsers.includes(String(msg.from.id));
    
  if (!isPrivate) {
    bot.sendMessage(chatId, "ᴋʜᴜsᴜs ᴜsᴇʀ ᴘʀɪᴠᴀᴛᴇ!", {
      reply_markup: {
        inline_keyboard: [
          [{ text: "ʙᴜʏ ᴘʀɪᴠᴀᴛᴇ", url: `https://t.me/${dev}` }],
        ],
      },
    });
    return;
  }

  if (!srv) {
    bot.sendMessage(
      chatId,
      "Masukkan ID server yang ingin dihapus, contoh: /srvdel 1234"
    );
    return;
  }

  // --- REFACTOR ---
  const panelSettings = loadJsonData(PANEL_SETTINGS_FILE);
  const { domainPriv, pltaPriv } = panelSettings;
  // --- SELESAI REFACTOR ---

  try {
    let f = await fetch(domainPriv + "/api/application/servers/" + srv, {
      method: "DELETE",
      headers: {
        Accept: "application/json",
        "Content-Type": "application/json",
        Authorization: `Bearer ${pltaPriv}`,
      },
    });

    let res = f.ok ? { errors: null } : await f.json();

    if (res.errors) {
      bot.sendMessage(chatId, "❌ sᴇʀᴠᴇʀ ᴛɪᴅᴀᴋ ᴀᴅᴀ");
    } else {
      bot.sendMessage(chatId, `✅ ꜱᴜᴋꜱᴇꜱ ᴅᴇʟᴇᴛᴇ ꜱᴇʀᴠᴇʀ ${srv}`, { parse_mode: "MarkDown",
    reply_to_message_id: msg.message_id });
    }
  } catch (error) {
    console.error(error);
    bot.sendMessage(chatId, "Terjadi kesalahan saat menghapus server private.");
  }
});
    
    // 1gbp-10gbp
const specs = {
  "1gbp": { memo: 1024,  cpu: 30,  disk: 1024 },
  "2gbp": { memo: 2048,  cpu: 60,  disk: 2048 },
  "3gbp": { memo: 3072,  cpu: 90,  disk: 3072 },
  "4gbp": { memo: 4096,  cpu: 120, disk: 4096 },
  "5gbp": { memo: 5120,  cpu: 150, disk: 5120 },
  "6gbp": { memo: 6144,  cpu: 180, disk: 6144 },
  "7gbp": { memo: 7168,  cpu: 210, disk: 7168 },
  "8gbp": { memo: 8192,  cpu: 240, disk: 8192 },
  "9gbp": { memo: 9216,  cpu: 270, disk: 9216 },
  "10gbp":{ memo: 10240, cpu: 300, disk: 10240 }
};

bot.onText(/^\/(1gbp|2gbp|3gbp|4gbp|5gbp|6gbp|7gbp|8gbp|9gbp|10gbp) (.+)$/, async (msg, match) => {
  const chatId = msg.chat.id;
  const plan = match[1];
  const text = match[2];
  
  if (!isPrivatePanelGroup(chatId)) {
    return bot.sendMessage(chatId, "ᴋʜᴜꜱᴜꜱ ᴘᴀɴᴇʟ ᴘʀɪᴠᴀᴛᴇ", {
      reply_markup: {
        inline_keyboard: [
          [{ text: "ʙᴜʏ ᴘʀɪᴠᴀᴛᴇ", url: `https://t.me/${dev}` }],
        ],
      },
    });
    return;
  }
    
  if (!text) {
      return bot.sendMessage(chatId,
`❌ Format salah!\nContoh: /${plan} nama,id`);
  }
    
  const ressUsers = JSON.parse(fs.readFileSync(PRIVRESS_FILE));
  const isReseller = ressUsers.includes(String(msg.from.id));
    
  if (!isReseller) {
    bot.sendMessage(chatId, "❌ ᴋʜᴜꜱᴜꜱ ʀᴇꜱᴇʟʟᴇʀ!", {
      reply_markup: {
        inline_keyboard: [
          [{ text: "ʟᴀᴘᴏʀᴀɴ", url: `https://t.me/${dev}` }],
        ],
      },
    });
    return;
  }

  const [username,u] = text.split(",");
  if (!username || !u) return bot.sendMessage(chatId, `Usage: /${plan} namapanel,idtele`);

  const { memo,cpu,disk } = specs[plan];
  const name = username+plan;
  const email = `${username}@private.${dev}`;
  const password = username+Math.random().toString(36).slice(2,5);
  const spc = 'if [[ -d .git ]] && [[ {{AUTO_UPDATE}} == "1" ]]; then git pull; fi; if [[ ! -z ${NODE_PACKAGES} ]]; then /usr/local/bin/npm install ${NODE_PACKAGES}; fi; if [[ ! -z ${UNNODE_PACKAGES} ]]; then /usr/local/bin/npm uninstall ${UNNODE_PACKAGES}; fi; if [ -f /home/container/package.json ]; then /usr/local/bin/npm install; fi; /usr/local/bin/${CMD_RUN}';

  // --- REFACTOR ---
  const panelSettings = loadJsonData(PANEL_SETTINGS_FILE);
  const { domainPriv, pltaPriv } = panelSettings;
  // --- SELESAI REFACTOR ---

  let user,server;
  try {
    const res1 = await fetch(`${domainPriv}/api/application/users`, {
      method:"POST",
      headers:{ "Content-Type":"application/json", Authorization:`Bearer ${pltaPriv}` },
      body:JSON.stringify({ email, username, first_name:username, last_name:username, language:"en", password })
    });
    const data1 = await res1.json();
    if (data1.errors) return bot.sendMessage(chatId, `Error user: ${JSON.stringify(data1.errors[0])}`);
    user = data1.attributes;

    const res2 = await fetch(`${domainPriv}/api/application/servers`, {
      method:"POST",
      headers:{ "Content-Type":"application/json", Authorization:`Bearer ${pltaPriv}` },
      body:JSON.stringify({
        name, user:user.id, egg:parseInt(eggs),
        docker_image:"ghcr.io/parkervcp/yolks:nodejs_18", startup:spc,
        environment:{ INST:"npm",USER_UPLOAD:"0",AUTO_UPDATE:"0",CMD_RUN:"npm start" },
        limits:{ memory:memo,swap:0,disk,io:500,cpu },
        feature_limits:{ databases:5,backups:5,allocations:1 },
        deploy:{ locations:[parseInt(settings.loc)],dedicated_ip:false,port_range:[] }
      })
    });
    const data2 = await res2.json();
    server = data2.attributes;
  } catch(e) {
    return bot.sendMessage(chatId, `Error: ${e.message}`);
  }

  if (!user || !server) return bot.sendMessage(chatId,"Gagal membuat data panel.");

  bot.sendMessage(chatId, `- SUKSES KIRIM PANEL ${plan} -
NAMA: ${username}
EMAIL: ${email}
ID: ${user.id}
MEMORY: ${server.limits.memory} MB
DISK: ${server.limits.disk} MB
CPU: ${server.limits.cpu}%`);
    
  bot.sendMessage(
      chatId,
      `✅ Berhasil kirim Panel Private ${plan} ke @${msg.from.username}\n(ID: ${u})`, {
    parse_mode: "Markdown", reply_to_message_id: msg.message_id
  });

  function esc(text) {
  return String(text).replace(/([_*\[\]()~`>#+\-=|{}.!])/g, '\\$1');
}

const safeName = esc(username);
const safeEmail = esc(email);
const safeId = esc(user.id);
const safePlan = esc(plan);
const safeUser = esc(user.username);
const safePass = esc(password);
const safeDomain = esc(domainPriv); // <-- Diganti ke domainPriv

// copy
const copyUser = `\`${safeUser}\``;
const copyPass = `\`${safePass}\``;
    
// spoiler
const spoilerDomain = `||${safeDomain}||`;

bot.sendPhoto(u, panel, {
  caption: `🔐 *Sukses Created Panel Private\\!*
▸ Name: ${safeName}
▸ Email: ${safeEmail}
▸ ID: ${safeId}
▸ RAM: ${safePlan}

🌐 *Domain Panel*
▸ Username: ${copyUser}
▸ Password: ${copyPass}
▸ Login: ${spoilerDomain}

⚠️ *Rules Panel*
▸ Sensor domain
▸ No DDOS/Share Free
▸ Garansi 15 hari`,
  parse_mode: "MarkdownV2",
  reply_markup: {
    inline_keyboard: [
      [
        { text: "🌐 Domain", url: domainPriv }, // <-- Diganti ke domainPriv
        { text: "🔑 Salin Password", switch_inline_query_current_chat: password }
      ],
    ],
  },
});
});
}