const axios = require("axios");
const fetch = require("node-fetch");
const fs = require("fs");
const {
    loadJsonData,
    saveJsonData,
    checkCooldown } = require('../lib/function');

const { getGroupType } = require('../lib/groupSettings');

// Path ke database setting panel yang baru
const PANEL_SETTINGS_FILE = './db/panel_settings.json';

// Ambil setting yang TIDAK pindah (tetap di config.js)
const settings = require("../config.js"); 
const OWNER_ID = settings.ownerId;
const ALLOWED_GROUP_ID = settings.groupId;
const {
    eggs,
    loc,
    dev,
    panel
} = settings;


function isPublicPanelGroup(chatId) {
    const type = getGroupType(chatId, { exGroupId: settings.exGroupId, exPGroupId: settings.exPGroupId });
    return type === 'public';
}


const CADP_FILE = "./db/cadp.json";

// file database
const OWNER_FILE = './db/users/adminID.json';

const OWNERP_FILE = './db/users/ownerID.json';
const PREMIUM_FILE = './db/users/premiumUsers.json';
const PREMV2_FILE = './db/users/version/premiumV2.json';
const PREMV3_FILE = './db/users/version/premiumV3.json';
const PREMV4_FILE = './db/users/version/premiumV4.json';
const PREMV5_FILE = './db/users/version/premiumV5.json';

const RESS_FILE = './db/users/resellerUsers.json';
const RESSV2_FILE = './db/users/version/resellerV2.json';
const RESSV3_FILE = './db/users/version/resellerV3.json';
const RESSV4_FILE = './db/users/version/resellerV4.json';
const RESSV5_FILE = './db/users/version/resellerV5.json';

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
    
    // info
bot.onText(/^\/info$/, async (msg, match) => {
  const chatId = msg.chat.id;
  if (!isPublicPanelGroup(chatId)) {
  const ownerUsers = JSON.parse(fs.readFileSync(OWNER_FILE));
  const isOwner = ownerUsers.includes(String(msg.from.id));

  if (!isOwner) {
    return bot.sendMessage(chatId, "ᴋʜᴜꜱᴜꜱ ᴅɪ ᴘᴀɴᴇʟ ᴘᴜʙʟɪᴄ", {
      reply_to_message_id: msg.message_id,
      reply_markup: {
        inline_keyboard: [[{ text: "ʙᴜʏ ᴘᴜʙʟɪᴄ", url: `https://t.me/${dev}` }]],
      },
    });
  }
}
  
  let targetUser = null; 

  if (msg.reply_to_message) {
    targetUser = msg.reply_to_message.from;
  }

  else {
    targetUser = msg.from;
  }

  const userId = targetUser.id.toString();
  const username = targetUser.username || "-";
  const firstName = targetUser.first_name || "User";

  let ownerUsers = [];
  let premiumUsers = [];
  let ressUsers = [];
  if (fs.existsSync(OWNERP_FILE)) ownerUsers = JSON.parse(fs.readFileSync(OWNERP_FILE));
  if (fs.existsSync(PREMIUM_FILE)) premiumUsers = JSON.parse(fs.readFileSync(PREMIUM_FILE));
  if (fs.existsSync(RESS_FILE)) ressUsers = JSON.parse(fs.readFileSync(RESS_FILE));

  let statusStart = `❌ ${firstName} belum start bot di private chat. dilarang create!`;

  try {
    // Coba kirim pesan ke user
    await bot.sendMessage(userId, "Start untuk cek bot!");
    statusStart = `✅ ${firstName} sudah start bot! silahkan create.`;

    // Jika berhasil, tambahkan ke users.json
    let users = [];
    const usersFile = "./db/users/users.json"; // Definisikan path di sini
    if (fs.existsSync(usersFile)) users = JSON.parse(fs.readFileSync(usersFile));
    if (!users.includes(userId)) {
      users.push(userId);
      fs.writeFileSync(usersFile, JSON.stringify(users, null, 2));
    }
  } catch (err) {
    // Biarkan statusStart tetap error
  }

  const txtInfo = `
ID: <code>${userId}</code>
Username: @${username}
Nama: ${firstName}
Status:
<blockquote>- Public Owner? ${ownerUsers.includes(userId) ? "✅" : "❌"}
- Public Premium? ${premiumUsers.includes(userId) ? "✅" : "❌"}
- Public Reseller? ${ressUsers.includes(userId) ? "✅" : "❌"}
</blockquote>
${statusStart}
`;

  bot.sendMessage(chatId, txtInfo, {
    parse_mode: "HTML",
    reply_to_message_id: msg.message_id
  });
});
    
    // scpu (Command ini sudah obsolete/tidak dipakai, tapi kita biarkan)
bot.onText(/\/scpu (.+)/, async (msg, match) => {
  const chatId = msg.chat.id;
  const input = match[1].split(",");

  if (input.length !== 3) {
    return bot.sendMessage(chatId, "❌ Format salah!\nContoh:\n`/scpu domain,ptla,ptlc`", { parse_mode: "Markdown" });
  }

  const [domain, plta, pltc] = input.map(x => x.trim());

  bot.sendMessage(chatId, "⏳ Sedang cek CPU server...");
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
        const uuidShort = s.attributes.uuid.split("-")[0];

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
    
    // monitoring
bot.onText(/\/servercpu/, async (msg) => {
  const chatId = msg.chat.id;
  if (!isPublicPanelGroup(chatId)) {
  const ownerUsers = JSON.parse(fs.readFileSync(OWNER_FILE));
  const isOwner = ownerUsers.includes(String(msg.from.id));

  if (!isOwner) {
    return bot.sendMessage(chatId, "ᴋʜᴜꜱᴜꜱ ᴅɪ ᴘᴀɴᴇʟ ᴘᴜʙʟɪᴄ", {
      reply_to_message_id: msg.message_id,
      reply_markup: {
        inline_keyboard: [[{ text: "ʙᴜʏ ᴘᴜʙʟɪᴄ", url: `https://t.me/${dev}` }]],
      },
    });
  }
}
  
  // --- REFACTOR ---
  // Baca setting terbaru dari DB
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
        const idServer = s.attributes.id; // ambil ID server
        const uuidShort = s.attributes.uuid.split("-")[0]; // uuidShort buat client API

        try {
          const utilRes = await axios.get(
            `${domain}/api/client/servers/${uuidShort}/resources`,
            { headers: { Authorization: `Bearer ${pltc}`, Accept: "application/json" } }
          );

          const cpu = utilRes.data.attributes.resources.cpu_absolute;

          if (cpu >= 80) {
            hasil += `⚠️ *${name}* (ID: \`${idServer}\`) - CPU: ${cpu}%\n`;
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

    // cadp
bot.onText(/^\/cadp(?:\s+(.+))?$/, async (msg, match) => {
  const chatId = msg.chat.id;
  const userId = msg.from.id;

  if (!isPublicPanelGroup(chatId)) {
  const ownerUsers = JSON.parse(fs.readFileSync(OWNER_FILE));
  const isOwner = ownerUsers.includes(String(msg.from.id));

  if (!isOwner) {
    return bot.sendMessage(chatId, "ᴋʜᴜꜱᴜꜱ ᴅɪ ᴘᴀɴᴇʟ ᴘᴜʙʟɪᴄ", {
      reply_to_message_id: msg.message_id,
      reply_markup: {
        inline_keyboard: [[{ text: "ʙᴜʏ ᴘᴜʙʟɪᴄ", url: `https://t.me/${dev}` }]],
      },
    });
  }
}

  let premiumUsers = [];
  try {
    premiumUsers = JSON.parse(fs.readFileSync(PREMIUM_FILE));
  } catch (e) {
    premiumUsers = [];
  }

  const isPremium = premiumUsers.includes(String(userId));
  if (!isPremium) {
    bot.sendMessage(chatId,"❌ ᴋʜᴜꜱᴜꜱ ᴘʀᴇᴍɪᴜᴍ!",{
      reply_markup:{
        inline_keyboard:[[{
          text:"ᴊᴏɪɴ ꜱᴇʀᴠᴇʀ",url:`https://t.me/${dev}`
        }]]
      }
    });
    return;
  }

  const waktu = checkCooldown(userId);
  if (waktu > 0) {
    return bot.sendMessage(chatId,`⏳ Tunggu ${waktu} detik sebelum bisa pakai command /cadp lagi!`,{ reply_to_message_id: msg.message_id });
  }

  // --- Handling aman params ---
  const rawParams = (match && match[1]) ? match[1].trim() : "";
  if (!rawParams) {
    return bot.sendMessage(chatId,"❌ Format Salah!\nPenggunaan: /cadp nama,idtele");
  }

  const commandParams = rawParams.split(",").map(x => x.trim()).filter(Boolean);
  if (commandParams.length < 2) {
    return bot.sendMessage(chatId,"❌ Format Salah!\nPenggunaan: /cadp nama,idtele");
  }

  const panelName = commandParams[0];
  const telegramId = commandParams[1];
  const password = panelName + Math.random().toString(36).slice(2,5);

  // --- REFACTOR ---
  // Baca setting terbaru dari DB
  const panelSettings = loadJsonData(PANEL_SETTINGS_FILE);
  const { domain, plta } = panelSettings;
  // --- SELESAI REFACTOR ---

  try {
    const response = await fetch(`${domain}/api/application/users`,{
      method:"POST",
      headers:{
        Accept:"application/json",
        "Content-Type":"application/json",
        Authorization:`Bearer ${plta}`,
      },
      body:JSON.stringify({
        email:`${panelName}@admin.schnuffellll`,
        username:panelName,
        first_name:panelName,
        last_name:"admin",
        language:"en",
        root_admin:true,
        password:password,
      }),
    });

    const data = await response.json();
    if (data.errors) {
      bot.sendMessage(chatId,JSON.stringify(data.errors[0],null,2));
      return;
    }

    const user = data.attributes;
    const userInfo = `
TYPE: ADMIN PANEL
➟ ID: ${user.id}
➟ USERNAME: ${user.username}
➟ EMAIL: ${user.email}
➟ NAME: ${user.first_name} ${user.last_name}
➟ LANGUAGE: ${user.language}
➟ ADMIN: ${user.root_admin}
➟ CREATED AT: ${user.created_at}
    `;
    bot.sendMessage(chatId,userInfo);

    const caption = `🔐 Sukses Created Admin Panel!

👤 Username: <code>${user.username}</code>
🔑 Password: <code>${password}</code>
🌐 Login: ${domain}

<blockquote>📌 Catatan :
Simpan informasi data ini dengan aman
dan jangan bagikan ke orang lain!
</blockquote>
`;

    await bot.sendPhoto(telegramId,panel,{ caption,parse_mode:"HTML" });

  } catch (error) {
    console.error(error);
    bot.sendMessage(chatId,"❌ Terjadi kesalahan dalam pembuatan admin. Silakan coba lagi nanti.");
  }
});

    // cadpv2
bot.onText(/\/cadpv2(?:\s+(.+))?/, async (msg, match) => {
  const chatId = msg.chat.id;
  const userId = msg.from.id;
  const text = match[1];
    
  if (msg.chat.type !== "group" && msg.chat.type !== "supergroup") {
  bot.sendMessage(msg.chat.id, "❌ ᴋʜᴜꜱᴜꜱ ɢʀᴜᴘ!");
  return;
  }
    
  const premV2Users = JSON.parse(fs.readFileSync(PREMV2_FILE));
  const isPremiumV2 = premV2Users.includes(String(msg.from.id));   
      if (!isPremiumV2) {
    bot.sendMessage(chatId, "❌ ᴋʜᴜꜱᴜꜱ ᴘʀᴇᴍɪᴜᴍ ᴠ2!", {
      reply_markup: {
        inline_keyboard: [
          [{ text: "ᴊᴏɪɴ ꜱᴇʀᴠᴇʀ", url: `https://t.me/${dev}` }],
        ],
      },
    });
    return;
  }
    
  const waktu = checkCooldown(msg.from.id);
    if (waktu > 0) return bot.sendMessage(chatId, `⏳ Tunggu ${waktu} detik sebelum bisa pakai command /cadpv2 lagi!`, { reply_to_message_id: msg.message_id });
  
  const commandParams = match[1].split(",");
if (commandParams.length < 2) {
  bot.sendMessage(
    chatId,
    "❌ Format Salah! Penggunaan: /cadpv2 nama,idtele"
  );
  return;
}

  const panelName = commandParams[0].trim();
  const telegramId = commandParams[1].trim();

  const password = panelName + Math.random().toString(36).slice(2, 5);
    
  // --- REFACTOR ---
  const panelSettings = loadJsonData(PANEL_SETTINGS_FILE);
  const { domainV2, pltaV2 } = panelSettings;
  // --- SELESAI REFACTOR ---
    
  try {
    const response = await fetch(`${domainV2}/api/application/users`, {
      method: "POST",
      headers: {
        Accept: "application/json",
        "Content-Type": "application/json",
        Authorization: `Bearer ${pltaV2}`,
      },
      body: JSON.stringify({
        email: `${panelName}@admin.schnuffellll`,
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
TYPE: ADMIN PANEL V2
➟ ID: ${user.id}
➟ USERNAME: ${user.username}
➟ EMAIL: ${user.email}
➟ NAME: ${user.first_name} ${user.last_name}
➟ LANGUAGE: ${user.language}
➟ ADMIN: ${user.root_admin}
➟ CREATED AT: ${user.created_at}
    `;
    bot.sendMessage(chatId, userInfo);
     
    const caption = `🔐 Sukses Created Admin Panel V2!

👤 Username: <code>${user.username}</code>
🔑 Password: <code>${password}</code>
🌐 Login: ${domainV2}

<blockquote>📌 Catatan :
Simpan informasi data ini dengan aman
dan jangan bagikan ke orang lain!
</blockquote>
`;

bot.sendPhoto(telegramId, panel, { caption, parse_mode: "HTML" });
   
  } catch (error) {
    console.error(error);
    bot.sendMessage(
      chatId,
      "Terjadi kesalahan dalam pembuatan admin. Silakan coba lagi nanti."
    );
  }
});
 
    // cadpv3
bot.onText(/\/cadpv3(?:\s+(.+))?/, async (msg, match) => {
  const chatId = msg.chat.id;
  const userId = msg.from.id;
  const text = match[1];
    
  if (msg.chat.type !== "group" && msg.chat.type !== "supergroup") {
  bot.sendMessage(msg.chat.id, "❌ ᴋʜᴜꜱᴜꜱ ɢʀᴜᴘ!");
  return;
}
    
  const premV3Users = JSON.parse(fs.readFileSync(PREMV3_FILE));
  const isPremiumV3 = premV3Users.includes(String(msg.from.id));   
      if (!isPremiumV3) {
    bot.sendMessage(chatId, "❌ ᴋʜᴜꜱᴜꜱ ᴘʀᴇᴍɪᴜᴍ ᴠ3!", {
      reply_markup: {
        inline_keyboard: [
          [{ text: "ᴊᴏɪɴ ꜱᴇʀᴠᴇʀ", url: `https://t.me/${dev}` }],
        ],
      },
    });
    return;
  }
  
  const commandParams = match[1].split(",");
if (commandParams.length < 2) {
  bot.sendMessage(
    chatId,
    "❌ Format Salah! Penggunaan: /cadpv3 nama,idtele"
  );
  return;
}
    
  const waktu = checkCooldown(msg.from.id);
    if (waktu > 0) return bot.sendMessage(chatId, `⏳ Tunggu ${waktu} detik sebelum bisa pakai command /cadpv3 lagi!`, { reply_to_message_id: msg.message_id });

  const panelName = commandParams[0].trim();
  const telegramId = commandParams[1].trim();

  const password = panelName + Math.random().toString(36).slice(2, 5);
    
  // --- REFACTOR ---
  const panelSettings = loadJsonData(PANEL_SETTINGS_FILE);
  const { domainV3, pltaV3 } = panelSettings;
  // --- SELESAI REFACTOR ---
    
  try {
    const response = await fetch(`${domainV3}/api/application/users`, {
      method: "POST",
      headers: {
        Accept: "application/json",
        "Content-Type": "application/json",
        Authorization: `Bearer ${pltaV3}`,
      },
      body: JSON.stringify({
        email: `${panelName}@admin.schnuffellll`,
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
TYPE: ADMIN PANEL V3
➟ ID: ${user.id}
➟ USERNAME: ${user.username}
➟ EMAIL: ${user.email}
➟ NAME: ${user.first_name} ${user.last_name}
➟ LANGUAGE: ${user.language}
➟ ADMIN: ${user.root_admin}
➟ CREATED AT: ${user.created_at}
    `;
    bot.sendMessage(chatId, userInfo);
     
    const caption = `🔐 Sukses Created Admin Panel V3!

👤 Username: <code>${user.username}</code>
🔑 Password: <code>${password}</code>
🌐 Login: ${domainV3}

<blockquote>📌 Catatan :
Simpan informasi data ini dengan aman
dan jangan bagikan ke orang lain!
</blockquote>
`;

bot.sendPhoto(telegramId, panel, { caption, parse_mode: "HTML" });
   
  } catch (error) {
    console.error(error);
    bot.sendMessage(
      chatId,
      "Terjadi kesalahan dalam pembuatan admin. Silakan coba lagi nanti."
    );
  }
});
    // cadpv4
bot.onText(/\/cadpv4(?:\s+(.+))?/, async (msg, match) => {
  const chatId = msg.chat.id;
  const userId = msg.from.id;
  const text = match[1];
    
  if (msg.chat.type !== "group" && msg.chat.type !== "supergroup") {
  bot.sendMessage(msg.chat.id, "❌ ᴋʜᴜꜱᴜꜱ ɢʀᴜᴘ!");
  return;
}
    
  const premV4Users = JSON.parse(fs.readFileSync(PREMV4_FILE));
  const isPremiumV4 = premV4Users.includes(String(msg.from.id));   
      if (!isPremiumV4) {
    bot.sendMessage(chatId, "❌ ᴋʜᴜꜱᴜꜱ ᴘʀᴇᴍɪᴜᴍ ᴠ4!", {
      reply_markup: {
        inline_keyboard: [
          [{ text: "ᴊᴏɪɴ ꜱᴇʀᴠᴇʀ", url: `https://t.me/${dev}` }],
        ],
      },
    });
    return;
  }
  
  const commandParams = match[1].split(",");
if (commandParams.length < 2) {
  bot.sendMessage(
    chatId,
    "❌ Format Salah! Penggunaan: /cadpv4 nama,idtele"
  );
  return;
}
    
  const waktu = checkCooldown(msg.from.id);
    if (waktu > 0) return bot.sendMessage(chatId, `⏳ Tunggu ${waktu} detik sebelum bisa pakai command /cadpv4 lagi!`, { reply_to_message_id: msg.message_id });

  const panelName = commandParams[0].trim();
  const telegramId = commandParams[1].trim();

  const password = panelName + Math.random().toString(36).slice(2, 5);
    
  // --- REFACTOR ---
  const panelSettings = loadJsonData(PANEL_SETTINGS_FILE);
  const { domainV4, pltaV4 } = panelSettings;
  // --- SELESAI REFACTOR ---
    
  try {
    const response = await fetch(`${domainV4}/api/application/users`, {
      method: "POST",
      headers: {
        Accept: "application/json",
        "Content-Type": "application/json",
        Authorization: `Bearer ${pltaV4}`,
      },
      body: JSON.stringify({
        email: `${panelName}@admin.schnuffellll`,
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
TYPE: ADMIN PANEL V4
➟ ID: ${user.id}
➟ USERNAME: ${user.username}
➟ EMAIL: ${user.email}
➟ NAME: ${user.first_name} ${user.last_name}
➟ LANGUAGE: ${user.language}
➟ ADMIN: ${user.root_admin}
➟ CREATED AT: ${user.created_at}
    `;
    bot.sendMessage(chatId, userInfo);
     
    const caption = `🔐 Sukses Created Admin Panel V4!

👤 Username: <code>${user.username}</code>
🔑 Password: <code>${password}</code>
🌐 Login: ${domainV4}

<blockquote>📌 Catatan :
Simpan informasi data ini dengan aman
dan jangan bagikan ke orang lain!
</blockquote>
`;

bot.sendPhoto(telegramId, panel, { caption, parse_mode: "HTML" });
   
  } catch (error) {
    console.error(error);
    bot.sendMessage(
      chatId,
      "Terjadi kesalahan dalam pembuatan admin. Silakan coba lagi nanti."
    );
  }
});
    
    // cadpv5
bot.onText(/\/cadpv5(?:\s+(.+))?/, async (msg, match) => {
  const chatId = msg.chat.id;
  const userId = msg.from.id;
  const text = match[1];
    
  if (msg.chat.type !== "group" && msg.chat.type !== "supergroup") {
  bot.sendMessage(msg.chat.id, "❌ ᴋʜᴜꜱᴜꜱ ɢʀᴜᴘ!");
  return;
}
    
  const premV5Users = JSON.parse(fs.readFileSync(PREMV5_FILE));
  const isPremiumV5 = premV5Users.includes(String(msg.from.id));   
      if (!isPremiumV5) {
    bot.sendMessage(chatId, "❌ ᴋʜᴜꜱᴜꜱ ᴘʀᴇᴍɪᴜᴍ ᴠ5!", {
      reply_markup: {
        inline_keyboard: [
          [{ text: "ᴊᴏɪɴ ꜱᴇʀᴠᴇʀ", url: `https://t.me/${dev}` }],
        ],
      },
    });
    return;
  }
    
  const waktu = checkCooldown(msg.from.id);
    if (waktu > 0) return bot.sendMessage(chatId, `⏳ Tunggu ${waktu} detik sebelum bisa pakai command /cadpv5 lagi!`, { reply_to_message_id: msg.message_id });
  
  const commandParams = match[1].split(",");
if (commandParams.length < 2) {
  bot.sendMessage(
    chatId,
    "❌ Format Salah! Penggunaan: /cadpv5 nama,idtele"
  );
  return;
}

  const panelName = commandParams[0].trim();
  const telegramId = commandParams[1].trim();

  const password = panelName + Math.random().toString(36).slice(2, 5);
    
  // --- REFACTOR ---
  const panelSettings = loadJsonData(PANEL_SETTINGS_FILE);
  const { domainV5, pltaV5 } = panelSettings;
  // --- SELESAI REFACTOR ---
    
  try {
    const response = await fetch(`${domainV5}/api/application/users`, {
      method: "POST",
      headers: {
        Accept: "application/json",
        "Content-Type": "application/json",
        Authorization: `Bearer ${pltaV5}`,
      },
      body: JSON.stringify({
        email: `${panelName}@admin.schnuffellll`,
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
TYPE: ADMIN PANEL V5
➟ ID: ${user.id}
➟ USERNAME: ${user.username}
➟ EMAIL: ${user.email}
➟ NAME: ${user.first_name} ${user.last_name}
➟ LANGUAGE: ${user.language}
➟ ADMIN: ${user.root_admin}
➟ CREATED AT: ${user.created_at}
    `;
    bot.sendMessage(chatId, userInfo);
     
    const caption = `🔐 Sukses Created Admin Panel V5!

👤 Username: <code>${user.username}</code>
🔑 Password: <code>${password}</code>
🌐 Login: ${domainV5}

<blockquote>📌 Catatan :
Simpan informasi data ini dengan aman
dan jangan bagikan ke orang lain!
</blockquote>
`;

bot.sendPhoto(telegramId, panel, { caption, parse_mode: "HTML" });
   
  } catch (error) {
    console.error(error);
    bot.sendMessage(
      chatId,
      "Terjadi kesalahan dalam pembuatan admin. Silakan coba lagi nanti."
    );
  }
});
    
bot.onText(/\/listcadp/, (msg) => {
  const chatId = msg.chat.id;

  if (!fs.existsSync(CADP_FILE)) {
    return bot.sendMessage(chatId, "❌ Tidak ada data user tersimpan.");
  }

  const db = JSON.parse(fs.readFileSync(CADP_FILE));

  if (db.length === 0) {
    return bot.sendMessage(chatId, "❌ Belum ada user yang tercatat.");
  }

  let text = "<b>📋 User yang /cadp:</b>\n\n";
  db.forEach((id, index) => {
    text += `${index + 1}. <code>${id}</code>\n`;
  });

  bot.sendMessage(chatId, text, { parse_mode: "HTML" });
});
    
    // unli ke whatsapp
bot.onText(/\/unliwa (.+)/, async (msg, match) => {
  const chatId = msg.chat.id;
  
  if ((msg.chat.type !== "group" && msg.chat.type !== "supergroup") && msg.from.id !== OWNER_ID) {
    return bot.sendMessage(chatId, "❌ ᴋʜᴜꜱᴜꜱ ɢʀᴜᴘ!");
  }
    
  const text = match[1];

  // Gunakan msg.from.id untuk menghitung cooldown per pengguna
  const isCooldown = checkCooldown(msg.from.id);
  if (isCooldown) return bot.sendMessage(chatId, isCooldown);

  const ressUsers = JSON.parse(fs.readFileSync(RESS_FILE));
  const isReseller = ressUsers.includes(String(msg.from.id));

  if (!isReseller) {
    return bot.sendMessage(chatId, "❌ Khusus Reseller!", {
      reply_markup: {
        inline_keyboard: [[{ text: `LAPORAN`, url: `https://t.me/${dev}` }]],
      },
    });
  }

  // NOTE: Fungsi ini menggunakan 'sock' yang di-import dari connect.js.
  // Karena connect.js di-comment out di schnuffelll.js, fitur ini akan error
  // jika WhatsApp bot tidak diaktifkan. Kita asumsikan ada 'sock' global/import.
  const { sessions } = require("../connect.js"); 
  const sock = sessions.get('default_bot_number') || [...sessions.values()][0];
  
  if (!sock) {
      return bot.sendMessage(chatId, "❌ Bot WhatsApp belum terhubung/aktif.");
  }

  const t = text.split(",");
  if (t.length < 2) {
    return bot.sendMessage(chatId, "⚠️ Format: /unli namapanel,nomorwa");
  }

  const username = t[0].trim();
  const waNumber = t[1].replace(/[^0-9]/g, ""); // nomor WA tujuan
  const jid = waNumber + "@s.whatsapp.net"; // jid WA
  const name = username + "unli";
  const memo = "0";
  const cpu = "0";
  const disk = "0";
  const email = `${username}@unli.schnuffellll`;
  const spc =
    'if [[ -d .git ]] && [[ {{AUTO_UPDATE}} == "1" ]]; then git pull; fi; if [[ ! -z ${NODE_PACKAGES} ]]; then /usr/local/bin/npm install ${NODE_PACKAGES}; fi; if [[ ! -z ${UNNODE_PACKAGES} ]]; then /usr/local/bin/npm uninstall ${UNNODE_PACKAGES}; fi; if [ -f /home/container/package.json ]; then /usr/local/bin/npm install; fi; /usr/local/bin/${CMD_RUN}';
  const password = username + Math.random().toString(36).slice(2, 5);
    
  // --- REFACTOR ---
  const panelSettings = loadJsonData(PANEL_SETTINGS_FILE);
  const { domain, plta } = panelSettings;
  // --- SELESAI REFACTOR ---

  let user;
  let server;

  try {
    // CREATE USER
    const response = await fetch(`${domain}/api/application/users`, {
      method: "POST",
      headers: {
        Accept: "application/json",
        "Content-Type": "application/json",
        Authorization: `Bearer ${plta}`,
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
      return bot.sendMessage(
        chatId,
        `❌ Error: ${JSON.stringify(data.errors[0], null, 2)}`
      );
    }
    user = data.attributes;

    // CREATE SERVER
    const response2 = await fetch(`${domain}/api/application/servers`, {
      method: "POST",
      headers: {
        Accept: "application/json",
        "Content-Type": "application/json",
        Authorization: `Bearer ${plta}`,
      },
      body: JSON.stringify({
        name: name,
        description: "",
        user: user.id,
        egg: parseInt(eggs),
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
          locations: [parseInt(loc)],
          dedicated_ip: false,
          port_range: [],
        },
      }),
    });

    const data2 = await response2.json();
    if (data2.errors) {
      return bot.sendMessage(
        chatId,
        `❌ Error saat buat server: ${JSON.stringify(data2.errors[0], null, 2)}`
      );
    }
    server = data2.attributes;
  } catch (error) {
    return bot.sendMessage(chatId, `❌ Error: ${error.message}`);
  }

  if (user && server) {
    // kirim ke WA
    await sock.sendMessage(jid, {
        image: { url: panel },
        caption: `*🔐 Sukses Created Panel!*
▸ Name: ${username}
▸ Email: ${email}
▸ ID: ${user.id}

*🌐 Domain Panel*
▸ Username: ${user.username}
▸ Password: ${password}
▸ Login: ${domain}

*⚠️ Rules Panel*
▸ Sensor domain
▸ Simpan data akun
▸ Garansi 15 hari`
    });

    // notif di Telegram
    bot.sendMessage(
      chatId,
      `✅ Sukses kirim panel ke Nomer WhatsApp: ${waNumber}`
    );
  } else {
    bot.sendMessage(
      chatId,
      `❌ Akun panel tidak ada! Laporkan ke @${dev}.`
    );
  }
});

    // unli (Public)
bot.onText(/^\/unli(?:\s+(.+))?$/, async (msg, match) => {
  const chatId = msg.chat.id;

  if (!isPublicPanelGroup(chatId)) {
  const ownerUsers = JSON.parse(fs.readFileSync(OWNER_FILE));
  const isOwner = ownerUsers.includes(String(msg.from.id));

  if (!isOwner) {
    return bot.sendMessage(chatId, "ᴋʜᴜꜱᴜꜱ ᴅɪ ᴘᴀɴᴇʟ ᴘᴜʙʟɪᴄ", {
      reply_to_message_id: msg.message_id,
      reply_markup: {
        inline_keyboard: [[{ text: "ʙᴜʏ ᴘᴜʙʟɪᴄ", url: `https://t.me/${dev}` }]],
      },
    });
  }
}

  const text = match[1];
  if (!text) return bot.sendMessage(chatId, "❌ Format salah!\nContoh: /unli nama,id");

  const ressUsers = JSON.parse(fs.readFileSync(RESS_FILE));
  if (!ressUsers.includes(String(msg.from.id))) {
    return bot.sendMessage(chatId, "❌ ᴋʜᴜꜱᴜꜱ ʀᴇꜱᴇʟʟᴇʀ!", {
      reply_markup: { inline_keyboard: [[{ text: "ʟᴀᴘᴏʀᴀɴ", url: `https://t.me/${dev}` }]] },
    });
  }

  const waktu = checkCooldown(msg.from.id);
  if (waktu > 0)
    return bot.sendMessage(chatId, `⏳ Tunggu ${waktu} detik sebelum bisa pakai command /unli lagi!`, { reply_to_message_id: msg.message_id });

  const t = text.split(",");
  if (t.length < 2) return bot.sendMessage(chatId, "⚠️ Format: /unli namapanel,idtele");

  const username = t[0].trim();
  const u = parseInt(t[1].trim());

  // ✅ Cek apakah user ID valid
  try {
    await bot.getChat(u);
  } catch (err) {
    if (err.response && err.response.statusCode === 400) {
      return bot.sendMessage(chatId, `❌ User dengan ID ${u} tidak ditemukan atau belum pernah start bot!`, {
        reply_to_message_id: msg.message_id
      });
    } else {
      return bot.sendMessage(chatId, `⚠️ Gagal memeriksa user ID ${u}: ${err.message}`, {
        reply_to_message_id: msg.message_id
      });
    }
  }

  await bot.sendMessage(chatId, "⏳");
  
  // --- REFACTOR ---
  const panelSettings = loadJsonData(PANEL_SETTINGS_FILE);
  const { domain, plta } = panelSettings;
  // --- SELESAI REFACTOR ---

  // Bungkus seluruh proses di try/catch besar biar kalau ada error langsung batal
  try {
    const name = username + "unli";
    const memo = "0";
    const cpu = "0";
    const disk = "0";
    const email = `${username}@unli.schnuffellll`;
    const password = username + Math.random().toString(36).slice(2, 5);
    const spc =
      'if [[ -d .git ]] && [[ {{AUTO_UPDATE}} == "1" ]]; then git pull; fi; if [[ ! -z ${NODE_PACKAGES} ]]; then /usr/local/bin/npm install ${NODE_PACKAGES}; fi; if [[ ! -z ${UNNODE_PACKAGES} ]]; then /usr/local/bin/npm uninstall ${UNNODE_PACKAGES}; fi; if [ -f /home/container/package.json ]; then /usr/local/bin/npm install; fi; /usr/local/bin/${CMD_RUN}';

    // CREATE USER
    const resUser = await fetch(`${domain}/api/application/users`, {
      method: "POST",
      headers: {
        Accept: "application/json",
        "Content-Type": "application/json",
        Authorization: `Bearer ${plta}`,
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

    const dataUser = await resUser.json();
    if (dataUser.errors) throw new Error(`Gagal buat user: ${dataUser.errors[0].detail || dataUser.errors[0].code}`);

    const user = dataUser.attributes;

    // CREATE SERVER
    const resServer = await fetch(`${domain}/api/application/servers`, {
      method: "POST",
      headers: {
        Accept: "application/json",
        "Content-Type": "application/json",
        Authorization: `Bearer ${plta}`,
      },
      body: JSON.stringify({
        name: name,
        user: user.id,
        egg: parseInt(eggs),
        docker_image: "ghcr.io/parkervcp/yolks:nodejs_20",
        startup: spc,
        environment: {
          INST: "npm",
          USER_UPLOAD: "0",
          AUTO_UPDATE: "0",
          CMD_RUN: "npm start",
        },
        limits: { memory: memo, swap: 0, disk: disk, io: 500, cpu: cpu },
        feature_limits: { databases: 5, backups: 5, allocations: 1 },
        deploy: { locations: [parseInt(loc)], dedicated_ip: false, port_range: [] },
      }),
    });

    const dataServer = await resServer.json();
    if (dataServer.errors) throw new Error(`Gagal buat server: ${dataServer.errors[0].detail || dataServer.errors[0].code}`);

    const server = dataServer.attributes;
      
    bot.sendMessage(
      chatId,
      `Type: Panel Unli
📡 ID: ${user.id}
👤 USERNAME: ${username}
⚙️ MEMORY: ${server.limits.memory === 0 ? "Unlimited" : server.limits.memory} MB
`
    );

    // Kirim ke user
    await bot.sendPhoto(u, panel, {
      caption: `🔐 *Sukses Created Panel!*
▸ Name: ${username}
▸ Email: ${email}
▸ ID: ${user.id}
▸ RAM: Unlimited

🌐 *Akun Panel*
▸ Username: \`${user.username}\`
▸ Password: \`${password}\`
▸ Login: ${domain}

⚠️ *Rules Panel*
▸ Sensor domain
▸ No DDOS/Share Free
▸ Garansi 15 hari`,
      parse_mode: "Markdown",
    });

    await bot.sendMessage(chatId, `✅ Berhasil kirim panel ke @${msg.from.username}\n(ID: ${u})`, {
      reply_to_message_id: msg.message_id,
    });

  } catch (err) {
    // Gagal di mana pun = gagalkan semua
    bot.sendMessage(chatId, `❌ Gagal membuat panel\n${err.message}`, {
      reply_to_message_id: msg.message_id,
    });
    return;
  }
});
// unli v2
bot.onText(/\/unliv2(?:\s+(.+))?/, async (msg, match) => {
  const chatId = msg.chat.id;
  const text = match[1];
    
  if (msg.chat.type !== "group" && msg.chat.type !== "supergroup") {
  bot.sendMessage(msg.chat.id, "❌ ᴋʜᴜꜱᴜꜱ ɢʀᴜᴘ!");
  return;
  }

  const waktu = checkCooldown(msg.from.id);
    if (waktu > 0) return bot.sendMessage(chatId, `⏳ Tunggu ${waktu} detik sebelum bisa pakai command /unliv2 lagi!`, { reply_to_message_id: msg.message_id });
    
  const ressV2Users = JSON.parse(fs.readFileSync(RESSV2_FILE));
  const isResellerV2 = ressV2Users.includes(String(msg.from.id));   
      if (!isResellerV2) {
    bot.sendMessage(chatId, "❌ ᴋʜᴜꜱᴜꜱ ʀᴇꜱᴇʟʟᴇʀ ᴠ2!", {
      reply_markup: {
        inline_keyboard: [
          [{ text: "ᴊᴏɪɴ ꜱᴇʀᴠᴇʀ", url: `https://t.me/${dev}` }],
        ],
      },
    });
    return;
  }

  const t = text.split(",");
  if (t.length < 2) {
    bot.sendMessage(chatId, "⚠️ Format: /unliv2 namapanel,idtele");
    return;
  }

  const username = t[0].trim();
  const u = parseInt(t[1].trim());
  const name = username + "unli";
  // const egg = eggs; // <-- Sudah ada di atas
  // const loc = settings.loc; // <-- Sudah ada di atas
  const memo = "0";
  const cpu = "0";
  const disk = "0";
  const email = `${username}@unli.schnuffellll`;
  const spc =
    'if [[ -d .git ]] && [[ {{AUTO_UPDATE}} == "1" ]]; then git pull; fi; if [[ ! -z ${NODE_PACKAGES} ]]; then /usr/local/bin/npm install ${NODE_PACKAGES}; fi; if [[ ! -z ${UNNODE_PACKAGES} ]]; then /usr/local/bin/npm uninstall ${UNNODE_PACKAGES}; fi; if [ -f /home/container/package.json ]; then /usr/local/bin/npm install; fi; /usr/local/bin/${CMD_RUN}';
  const password = username + Math.random().toString(36).slice(2, 5);
    
  // --- REFACTOR ---
  const panelSettings = loadJsonData(PANEL_SETTINGS_FILE);
  const { domainV2, pltaV2 } = panelSettings;
  // --- SELESAI REFACTOR ---

  let user;
  let server;

  try {
    // CREATE USER
    const response = await fetch(`${domainV2}/api/application/users`, {
      method: "POST",
      headers: {
        Accept: "application/json",
        "Content-Type": "application/json",
        Authorization: `Bearer ${pltaV2}`,
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
    const response2 = await fetch(`${domainV2}/api/application/servers`, {
      method: "POST",
      headers: {
        Accept: "application/json",
        "Content-Type": "application/json",
        Authorization: `Bearer ${pltaV2}`,
      },
      body: JSON.stringify({
        name: name,
        description: "",
        user: user.id,
        egg: parseInt(eggs),
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
          locations: [parseInt(loc)],
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
      `Type: Panel Unli V2
📡 ID: ${user.id}
👤 USERNAME: ${username}
⚙️ MEMORY: ${server.limits.memory === 0 ? "Unlimited" : server.limits.memory} MB
`
    );

function esc(text) {
  return String(text).replace(/([_*\[\]()~`>#+\-=|{}.!])/g, '\\$1');
}

const safeName = esc(username);
const safeEmail = esc(email);
const safeId = esc(user.id);
const safeUser = esc(user.username);
const safePass = esc(password);
const safeDomain = esc(domainV2);

// copy
const copyUser = `\`${safeUser}\``;
const copyPass = `\`${safePass}\``;
    
// spoiler
const spoilerDomain = `||${safeDomain}||`;

bot.sendPhoto(u, panel, {
  caption: `🔐 *Sukses Created Panel V2\\!*
▸ Name: ${safeName}
▸ Email: ${safeEmail}
▸ ID: ${safeId}
▸ RAM: Unlimited

🌐 *Akun Panel V2*
▸ Username: ${copyUser}
▸ Password: ${copyPass}
▸ Login: ${spoilerDomain}

⚠️ *Rules Panel*
▸ Sensor domain
▸ Simpan data akun
▸ Garansi 15 hari`,
  parse_mode: "MarkdownV2",
  reply_markup: {
    inline_keyboard: [
      [
        { text: "🌐 Domain", url: domainV2 },
        { text: "🔑 Salin Password", switch_inline_query_current_chat: password }
      ],
    ],
  },
});

    bot.sendMessage(
      chatId,
      `✅ Berhasil kirim panel V2 ke @${msg.from.username}\n(ID: ${u})`
    );
  } else {
    bot.sendMessage(chatId, `❌ Akun panel tidak ada! Laporkan ke @${dev}.`);
  }
});
    
  // unli v3
bot.onText(/\/unliv3(?:\s+(.+))?/, async (msg, match) => {
  const chatId = msg.chat.id;
  const text = match[1];
    
  if (msg.chat.type !== "group" && msg.chat.type !== "supergroup") {
  bot.sendMessage(msg.chat.id, "❌ ᴋʜᴜꜱᴜꜱ ɢʀᴜᴘ!");
  return;
  }

  const waktu = checkCooldown(msg.from.id);
    if (waktu > 0) return bot.sendMessage(chatId, `⏳ Tunggu ${waktu} detik sebelum bisa pakai command /unliv3 lagi!`, { reply_to_message_id: msg.message_id });
    
  const ressV3Users = JSON.parse(fs.readFileSync(RESSV3_FILE));
  const isResellerV3 = ressV3Users.includes(String(msg.from.id));   
      if (!isResellerV3) {
    bot.sendMessage(chatId, "❌ ᴋʜᴜꜱᴜꜱ ʀᴇꜱᴇʟʟᴇʀ ᴠ3!", {
      reply_markup: {
        inline_keyboard: [
          [{ text: "ᴊᴏɪɴ ꜱᴇʀᴠᴇʀ", url: `https://t.me/${dev}` }],
        ],
      },
    });
    return;
  }

  const t = text.split(",");
  if (t.length < 2) {
    bot.sendMessage(chatId, "⚠️ Format: /unliv3 namapanel,idtele");
    return;
  }

  const username = t[0].trim();
  const u = parseInt(t[1].trim());
  const name = username + "unli";
  // const egg = eggs; // <-- Sudah ada di atas
  // const loc = settings.loc; // <-- Sudah ada di atas
  const memo = "0";
  const cpu = "0";
  const disk = "0";
  const email = `${username}@unli.schnuffellll`;
  const spc =
    'if [[ -d .git ]] && [[ {{AUTO_UPDATE}} == "1" ]]; then git pull; fi; if [[ ! -z ${NODE_PACKAGES} ]]; then /usr/local/bin/npm install ${NODE_PACKAGES}; fi; if [[ ! -z ${UNNODE_PACKAGES} ]]; then /usr/local/bin/npm uninstall ${UNNODE_PACKAGES}; fi; if [ -f /home/container/package.json ]; then /usr/local/bin/npm install; fi; /usr/local/bin/${CMD_RUN}';
  const password = username + Math.random().toString(36).slice(2, 5);
    
  // --- REFACTOR ---
  const panelSettings = loadJsonData(PANEL_SETTINGS_FILE);
  const { domainV3, pltaV3 } = panelSettings;
  // --- SELESAI REFACTOR ---

  let user;
  let server;

  try {
    // CREATE USER
    const response = await fetch(`${domainV3}/api/application/users`, {
      method: "POST",
      headers: {
        Accept: "application/json",
        "Content-Type": "application/json",
        Authorization: `Bearer ${pltaV3}`,
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
    const response2 = await fetch(`${domainV3}/api/application/servers`, {
      method: "POST",
      headers: {
        Accept: "application/json",
        "Content-Type": "application/json",
        Authorization: `Bearer ${pltaV3}`,
      },
      body: JSON.stringify({
        name: name,
        description: "",
        user: user.id,
        egg: parseInt(eggs),
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
          locations: [parseInt(loc)],
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
      `Type: Panel Unli V3
📡 ID: ${user.id}
👤 USERNAME: ${username}
⚙️ MEMORY: ${server.limits.memory === 0 ? "Unlimited" : server.limits.memory} MB
`
    );

function esc(text) {
  return String(text).replace(/([_*\[\]()~`>#+\-=|{}.!])/g, '\\$1');
}

const safeName = esc(username);
const safeEmail = esc(email);
const safeId = esc(user.id);
const safeUser = esc(user.username);
const safePass = esc(password);
const safeDomain = esc(domainV3);

// copy
const copyUser = `\`${safeUser}\``;
const copyPass = `\`${safePass}\``;
    
// spoiler
const spoilerDomain = `||${safeDomain}||`;

bot.sendPhoto(u, panel, {
  caption: `🔐 *Sukses Created Panel V3\\!*
▸ Name: ${safeName}
▸ Email: ${safeEmail}
▸ ID: ${safeId}
▸ RAM: Unlimited

🌐 *Akun Panel V3*
▸ Username: ${copyUser}
▸ Password: ${copyPass}
▸ Login: ${spoilerDomain}

⚠️ *Rules Panel*
▸ Sensor domain
▸ Simpan data akun
▸ Garansi 15 hari`,
  parse_mode: "MarkdownV2",
  reply_markup: {
    inline_keyboard: [
      [
        { text: "🌐 Domain", url: domainV3 },
        { text: "🔑 Salin Password", switch_inline_query_current_chat: password }
      ],
    ],
  },
});

    bot.sendMessage(
      chatId,
      `✅ Berhasil kirim panel V3 ke @${msg.from.username}\n(ID: ${u})`
    );
  } else {
    bot.sendMessage(chatId, `❌ Akun panel tidak ada! Laporkan ke @${dev}.`);
  }
});
   
  // unli v4
bot.onText(/\/unliv4(?:\s+(.+))?/, async (msg, match) => {
  const chatId = msg.chat.id;
  const text = match[1];
    
  if (msg.chat.type !== "group" && msg.chat.type !== "supergroup") {
  bot.sendMessage(msg.chat.id, "❌ ᴋʜᴜꜱᴜꜱ ɢʀᴜᴘ!");
  return;
  }

  const waktu = checkCooldown(msg.from.id);
    if (waktu > 0) return bot.sendMessage(chatId, `⏳ Tunggu ${waktu} detik sebelum bisa pakai command /unliv4 lagi!`, { reply_to_message_id: msg.message_id });
    
  const ressV4Users = JSON.parse(fs.readFileSync(RESSV4_FILE));
  const isResellerV4 = ressV4Users.includes(String(msg.from.id));   
      if (!isResellerV4) {
    bot.sendMessage(chatId, "❌ ᴋʜᴜꜱᴜꜱ ʀᴇꜱᴇʟʟᴇʀ ᴠ4!", {
      reply_markup: {
        inline_keyboard: [
          [{ text: "ᴊᴏɪɴ ꜱᴇʀᴠᴇʀ", url: `https://t.me/${dev}` }],
        ],
      },
    });
    return;
  }

  const t = text.split(",");
  if (t.length < 2) {
    bot.sendMessage(chatId, "⚠️ Format: /unliv4 namapanel,idtele");
    return;
  }

  const username = t[0].trim();
  const u = parseInt(t[1].trim());
  const name = username + "unli";
  // const egg = eggs; // <-- Sudah ada di atas
  // const loc = settings.loc; // <-- Sudah ada di atas
  const memo = "0";
  const cpu = "0";
  const disk = "0";
  const email = `${username}@unli.schnuffellll`;
  const spc =
    'if [[ -d .git ]] && [[ {{AUTO_UPDATE}} == "1" ]]; then git pull; fi; if [[ ! -z ${NODE_PACKAGES} ]]; then /usr/local/bin/npm install ${NODE_PACKAGES}; fi; if [[ ! -z ${UNNODE_PACKAGES} ]]; then /usr/local/bin/npm uninstall ${UNNODE_PACKAGES}; fi; if [ -f /home/container/package.json ]; then /usr/local/bin/npm install; fi; /usr/local/bin/${CMD_RUN}';
  const password = username + Math.random().toString(36).slice(2, 5);
    
  // --- REFACTOR ---
  const panelSettings = loadJsonData(PANEL_SETTINGS_FILE);
  const { domainV4, pltaV4 } = panelSettings;
  // --- SELESAI REFACTOR ---

  let user;
  let server;

  try {
    // CREATE USER
    const response = await fetch(`${domainV4}/api/application/users`, {
      method: "POST",
      headers: {
        Accept: "application/json",
        "Content-Type": "application/json",
        Authorization: `Bearer ${pltaV4}`,
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
    const response2 = await fetch(`${domainV4}/api/application/servers`, {
      method: "POST",
      headers: {
        Accept: "application/json",
        "Content-Type": "application/json",
        Authorization: `Bearer ${pltaV4}`,
      },
      body: JSON.stringify({
        name: name,
        description: "",
        user: user.id,
        egg: parseInt(eggs),
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
          locations: [parseInt(loc)],
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
      `Type: Panel Unli V4
📡 ID: ${user.id}
👤 USERNAME: ${username}
⚙️ MEMORY: ${server.limits.memory === 0 ? "Unlimited" : server.limits.memory} MB
`
    );

function esc(text) {
  return String(text).replace(/([_*\[\]()~`>#+\-=|{}.!])/g, '\\$1');
}

const safeName = esc(username);
const safeEmail = esc(email);
const safeId = esc(user.id);
const safeUser = esc(user.username);
const safePass = esc(password);
const safeDomain = esc(domainV4);

// copy
const copyUser = `\`${safeUser}\``;
const copyPass = `\`${safePass}\``;
    
// spoiler
const spoilerDomain = `||${safeDomain}||`;

bot.sendPhoto(u, panel, {
  caption: `🔐 *Sukses Created Panel V4\\!*
▸ Name: ${safeName}
▸ Email: ${safeEmail}
▸ ID: ${safeId}
▸ RAM: Unlimited

🌐 *Akun Panel V4*
▸ Username: ${copyUser}
▸ Password: ${copyPass}
▸ Login: ${spoilerDomain}

⚠️ *Rules Panel*
▸ Sensor domain
▸ Simpan data akun
▸ Garansi 15 hari`,
  parse_mode: "MarkdownV2",
  reply_markup: {
    inline_keyboard: [
      [
        { text: "🌐 Domain", url: domainV4 },
        { text: "🔑 Salin Password", switch_inline_query_current_chat: password }
      ],
    ],
  },
});

    bot.sendMessage(
      chatId,
      `✅ Berhasil kirim panel V4 ke @${msg.from.username}\n(ID: ${u})`
    );
  } else {
    bot.sendMessage(chatId, `❌ Akun panel tidak ada! Laporkan ke @${dev}.`);
  }
});
    
  // unli v5 (INI SUDAH DIKOREKSI DARI DUPLIKASI KODE YANG KEMARIN)
bot.onText(/\/unliv5(?:\s+(.+))?/, async (msg, match) => {
  const chatId = msg.chat.id;
  const text = match[1];
    
  if (msg.chat.type !== "group" && msg.chat.type !== "supergroup") {
  bot.sendMessage(msg.chat.id, "❌ ᴋʜᴜꜱᴜꜱ ɢʀᴜᴘ!");
  return;
  }

  const waktu = checkCooldown(msg.from.id);
    if (waktu > 0) return bot.sendMessage(chatId, `⏳ Tunggu ${waktu} detik sebelum bisa pakai command /unliv5 lagi!`, { reply_to_message_id: msg.message_id });
    
  const ressV5Users = JSON.parse(fs.readFileSync(RESSV5_FILE));
  const isResellerV5 = ressV5Users.includes(String(msg.from.id));   
      if (!isResellerV5) {
    bot.sendMessage(chatId, "❌ ᴋʜᴜꜱᴜꜱ ʀᴇꜱᴇʟʟᴇʀ ᴠ5!", {
      reply_markup: {
        inline_keyboard: [
          [{ text: "ᴊᴏɪɴ ꜱᴇʀᴠᴇʀ", url: `https://t.me/${dev}` }],
        ],
      },
    });
    return;
  }

  const t = text.split(",");
  if (t.length < 2) {
    bot.sendMessage(chatId, "⚠️ Format: /unliv5 namapanel,idtele");
    return;
  }

  const username = t[0].trim();
  const u = parseInt(t[1].trim());
  const name = username + "unli";
  const memo = "0";
  const cpu = "0";
  const disk = "0";
  const email = `${username}@unli.schnuffellll`;
  const spc =
    'if [[ -d .git ]] && [[ {{AUTO_UPDATE}} == "1" ]]; then git pull; fi; if [[ ! -z ${NODE_PACKAGES} ]]; then /usr/local/bin/npm install ${NODE_PACKAGES}; fi; if [[ ! -z ${UNNODE_PACKAGES} ]]; then /usr/local/bin/npm uninstall ${UNNODE_PACKAGES}; fi; if [ -f /home/container/package.json ]; then /usr/local/bin/npm install; fi; /usr/local/bin/${CMD_RUN}';
  const password = username + Math.random().toString(36).slice(2, 5);
    
  // --- REFACTOR ---
  const panelSettings = loadJsonData(PANEL_SETTINGS_FILE);
  const { domainV5, pltaV5 } = panelSettings;
  // --- SELESAI REFACTOR ---

  let user;
  let server;

  try {
    // CREATE USER
    const response = await fetch(`${domainV5}/api/application/users`, {
      method: "POST",
      headers: {
        Accept: "application/json",
        "Content-Type": "application/json",
        Authorization: `Bearer ${pltaV5}`,
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
    const response2 = await fetch(`${domainV5}/api/application/servers`, {
      method: "POST",
      headers: {
        Accept: "application/json",
        "Content-Type": "application/json",
        Authorization: `Bearer ${pltaV5}`,
      },
      body: JSON.stringify({
        name: name,
        description: "",
        user: user.id,
        egg: parseInt(eggs),
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
          locations: [parseInt(loc)],
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
      `Type: Panel Unli V5
📡 ID: ${user.id}
👤 USERNAME: ${username}
⚙️ MEMORY: ${server.limits.memory === 0 ? "Unlimited" : server.limits.memory} MB
`
    );

function esc(text) {
  return String(text).replace(/([_*\[\]()~`>#+\-=|{}.!])/g, '\\$1');
}

const safeName = esc(username);
const safeEmail = esc(email);
const safeId = esc(user.id);
const safeUser = esc(user.username);
const safePass = esc(password);
const safeDomain = esc(domainV5);

// copy
const copyUser = `\`${safeUser}\``;
const copyPass = `\`${safePass}\``;
    
// spoiler
const spoilerDomain = `||${safeDomain}||`;

bot.sendPhoto(u, panel, {
  caption: `🔐 *Sukses Created Panel V5\\!*
▸ Name: ${safeName}
▸ Email: ${safeEmail}
▸ ID: ${safeId}
▸ RAM: Unlimited

🌐 *Akun Panel V5*
▸ Username: ${copyUser}
▸ Password: ${copyPass}
▸ Login: ${spoilerDomain}

⚠️ *Rules Panel*
▸ Sensor domain
▸ Simpan data akun
▸ Garansi 15 hari`,
  parse_mode: "MarkdownV2",
  reply_markup: {
    inline_keyboard: [
      [
        { text: "🌐 Domain", url: domainV5 },
        { text: "🔑 Salin Password", switch_inline_query_current_chat: password }
      ],
    ],
  },
});

    bot.sendMessage(
      chatId,
      `✅ Berhasil kirim panel V5 ke @${msg.from.username}\n(ID: ${u})`
    );
  } else {
    bot.sendMessage(chatId, `❌ Akun panel tidak ada! Laporkan ke @${dev}.`);
  }
});
    
// specs ram (Ini adalah object, bukan command)
const specs = {
  "1gbv2": { memo: 1024,  cpu: 30,  disk: 1024 },
  "2gbv2": { memo: 2048,  cpu: 60,  disk: 2048 },
  "3gbv2": { memo: 3072,  cpu: 90,  disk: 3072 },
  "4gbv2": { memo: 4096,  cpu: 120, disk: 4096 },
  "5gbv2": { memo: 5120,  cpu: 150, disk: 5120 },
  "6gbv2": { memo: 6144,  cpu: 180, disk: 6144 },
  "7gbv2": { memo: 7168,  cpu: 210, disk: 7168 },
  "8gbv2": { memo: 8192,  cpu: 240, disk: 8192 },
  "9gbv2": { memo: 9216,  cpu: 270, disk: 9216 },
  "10gbv2":{ memo: 10240, cpu: 300, disk: 10240 },

  "1gbv3": { memo: 1024,  cpu: 30,  disk: 1024 },
  "2gbv3": { memo: 2048,  cpu: 60,  disk: 2048 },
  "3gbv3": { memo: 3072,  cpu: 90,  disk: 3072 },
  "4gbv3": { memo: 4096,  cpu: 120, disk: 4096 },
  "5gbv3": { memo: 5120,  cpu: 150, disk: 5120 },
  "6gbv3": { memo: 6144,  cpu: 180, disk: 6144 },
  "7gbv3": { memo: 7168,  cpu: 210, disk: 7168 },
  "8gbv3": { memo: 8192,  cpu: 240, disk: 8192 },
  "9gbv3": { memo: 9216,  cpu: 270, disk: 9216 },
  "10gbv3":{ memo: 10240, cpu: 300, disk: 10240 },

  "1gbv4": { memo: 1024,  cpu: 30,  disk: 1024 },
  "2gbv4": { memo: 2048,  cpu: 60,  disk: 2048 },
  "3gbv4": { memo: 3072,  cpu: 90,  disk: 3072 },
  "4gbv4": { memo: 4096,  cpu: 120, disk: 4096 },
  "5gbv4": { memo: 5120,  cpu: 150, disk: 5120 },
  "6gbv4": { memo: 6144,  cpu: 180, disk: 6144 },
  "7gbv4": { memo: 7168,  cpu: 210, disk: 7168 },
  "8gbv4": { memo: 8192,  cpu: 240, disk: 8192 },
  "9gbv4": { memo: 9216,  cpu: 270, disk: 9216 },
  "10gbv4":{ memo: 10240, cpu: 300, disk: 10240 },

  "1gbv5": { memo: 1024,  cpu: 30,  disk: 1024 },
  "2gbv5": { memo: 2048,  cpu: 60,  disk: 2048 },
  "3gbv5": { memo: 3072,  cpu: 90,  disk: 3072 },
  "4gbv5": { memo: 4096,  cpu: 120, disk: 4096 },
  "5gbv5": { memo: 5120,  cpu: 150, disk: 5120 },
  "6gbv5": { memo: 6144,  cpu: 180, disk: 6144 },
  "7gbv5": { memo: 7168,  cpu: 210, disk: 7168 },
  "8gbv5": { memo: 8192,  cpu: 240, disk: 8192 },
  "9gbv5": { memo: 9216,  cpu: 270, disk: 9216 },
  "10gbv5":{ memo: 10240, cpu: 300, disk: 10240 }
};

    // 1gb-10gb (Public)
bot.onText(/^\/(1gb|2gb|3gb|4gb|5gb|6gb|7gb|8gb|9gb|10gb)(?:\s+(.+))?$/, async (msg, match) => {
  const chatId = msg.chat.id;
  const plan = match[1];
  const text = match[2];

  if (!isPublicPanelGroup(chatId)) {
  const ownerUsers = JSON.parse(fs.readFileSync(OWNER_FILE));
  const isOwner = ownerUsers.includes(String(msg.from.id));

  if (!isOwner) {
    return bot.sendMessage(chatId, "ᴋʜᴜꜱᴜꜱ ᴅɪ ᴘᴀɴᴇʟ ᴘᴜʙʟɪᴄ", {
      reply_to_message_id: msg.message_id,
      reply_markup: {
        inline_keyboard: [[{ text: "ʙᴜʏ ᴘᴜʙʟɪᴄ", url: `https://t.me/${dev}` }]],
      },
    });
  }
}

  const ressUsers = JSON.parse(fs.readFileSync(RESS_FILE));
  const isReseller = ressUsers.includes(String(msg.from.id));
  if (!isReseller) {
    return bot.sendMessage(chatId, "❌ ᴋʜᴜꜱᴜꜱ ʀᴇꜱᴇʟʟᴇʀ!", {
      reply_markup: {
        inline_keyboard: [[{ text: "ʟᴀᴘᴏʀᴀɴ", url: `https://t.me/${dev}` }]],
      },
    });
  }

  const waktu = checkCooldown(msg.from.id);
  if (waktu > 0)
    return bot.sendMessage(
      chatId,
      `⏳ Tunggu ${waktu} detik sebelum bisa pakai command /${plan} lagi!`,
      { reply_to_message_id: msg.message_id }
    );

  if (!text) return bot.sendMessage(chatId, `Usage: /${plan} namapanel,idtele`);

  const [username, u] = text.split(",");
  if (!username || !u)
    return bot.sendMessage(chatId, `Usage: /${plan} namapanel,idtele`);

  const specs = {
    "1gb": { memo: 1024, cpu: 60, disk: 2000 },
    "2gb": { memo: 2048, cpu: 80, disk: 3000 },
    "3gb": { memo: 3072, cpu: 100, disk: 4000 },
    "4gb": { memo: 4096, cpu: 120, disk: 5000 },
    "5gb": { memo: 5120, cpu: 140, disk: 6000 },
    "6gb": { memo: 6144, cpu: 160, disk: 7000 },
    "7gb": { memo: 7168, cpu: 180, disk: 8000 },
    "8gb": { memo: 8192, cpu: 200, disk: 9000 },
    "9gb": { memo: 9216, cpu: 220, disk: 10000 },
    "10gb": { memo: 10240, cpu: 240, disk: 11000 },
  }[plan];

  const { memo, cpu, disk } = specs;
  const name = username + plan;
  const email = `${username}@buyer.schnuffellll`;
  const password = username + Math.random().toString(36).slice(2, 5);
  const spc =
    'if [[ -d .git ]] && [[ {{AUTO_UPDATE}} == "1" ]]; then git pull; fi; if [[ ! -z ${NODE_PACKAGES} ]]; then /usr/local/bin/npm install ${NODE_PACKAGES}; fi; if [[ ! -z ${UNNODE_PACKAGES} ]]; then /usr/local/bin/npm uninstall ${UNNODE_PACKAGES}; fi; if [ -f /home/container/package.json ]; then /usr/local/bin/npm install; fi; /usr/local/bin/${CMD_RUN}';

  // --- REFACTOR ---
  const panelSettings = loadJsonData(PANEL_SETTINGS_FILE);
  const { domain, plta } = panelSettings;
  // --- SELESAI REFACTOR ---

  let user, server;
  try {
    // 🧩 Pastikan selalu akses API dengan /api/
    const res1 = await fetch(`${domain}/api/application/users`, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        Authorization: `Bearer ${plta}`,
      },
      body: JSON.stringify({
        email,
        username,
        first_name: username,
        last_name: username,
        language: "en",
        password,
      }),
    });

    // 🧠 Tambah validasi jika bukan JSON (biasanya karena HTML error page)
    const textRes1 = await res1.text();
    if (!textRes1.startsWith("{")) {
      return bot.sendMessage(
        chatId,
        `⚠️ Terjadi kesalahan:\nRespon bukan JSON dari ${domain}:\n${textRes1.slice(
          0,
          300
        )}...`
      );
    }

    const data1 = JSON.parse(textRes1);
    if (data1.errors)
      return bot.sendMessage(chatId, `Error user: ${JSON.stringify(data1.errors[0])}`);
    user = data1.attributes;

    const res2 = await fetch(`${domain}/api/application/servers`, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        Authorization: `Bearer ${plta}`,
      },
      body: JSON.stringify({
        name,
        user: user.id,
        egg: parseInt(eggs),
        docker_image: "ghcr.io/parkervcp/yolks:nodejs_18",
        startup: spc,
        environment: {
          INST: "npm",
          USER_UPLOAD: "0",
          AUTO_UPDATE: "0",
          CMD_RUN: "npm start",
        },
        limits: { memory: memo, swap: 0, disk, io: 500, cpu },
        feature_limits: { databases: 5, backups: 5, allocations: 1 },
        deploy: {
          locations: [parseInt(settings.loc)],
          dedicated_ip: false,
          port_range: [],
        },
      }),
    });

    const textRes2 = await res2.text();
    if (!textRes2.startsWith("{")) {
      return bot.sendMessage(
        chatId,
        `⚠️ Terjadi kesalahan:\nRespon bukan JSON dari ${domain}:\n${textRes2.slice(
          0,
          300
        )}...`
      );
    }

    const data2 = JSON.parse(textRes2);
    if (data2.errors)
      return bot.sendMessage(chatId, `Error server: ${JSON.stringify(data2.errors[0])}`);
    server = data2.attributes;
  } catch (e) {
    return bot.sendMessage(chatId, `Error: ${e.message}`);
  }

  if (!user || !server)
    return bot.sendMessage(chatId, "⚠️ Gagal membuat data panel.");

  bot.sendMessage(
    chatId,
    `*- BERIKUT DATA PANEL ${plan} -*\n` +
      `NAMA: ${username}\n` +
      `EMAIL: ${email}\n` +
      `ID: ${user.id}\n` +
      `MEMORY: ${server.limits.memory} MB\n` +
      `DISK: ${server.limits.disk} MB\n` +
      `CPU: ${server.limits.cpu}%`,
    { parse_mode: "Markdown", reply_to_message_id: msg.message_id }
  );

  bot.sendPhoto(u, panel, {
    caption:
      `*🔐 Sukses Created Panel ${plan}!*\n` +
      `▸ Name: ${username}\n` +
      `▸ Email: ${email}\n` +
      `▸ ID: ${user.id}\n` +
      `▸ RAM: ${plan}\n\n` +
      `*🌐 Akun Panel*\n` +
      `▸ Username: \`${user.username}\`\n` +
      `▸ Password: \`${password}\`\n\n` +
      `*⚠️ Rules Panel*\n` +
      `▸ Sensor domain\n` +
      `▸ Simpan data akun\n` +
      `▸ Garansi 15 hari`,
    parse_mode: "Markdown",
    reply_markup: {
      inline_keyboard: [
        [
          { text: "🌐 Domain", url: domain },
          { text: "🔑 Salin Password", switch_inline_query_current_chat: password },
        ],
      ],
    },
  });
});
    
    // 1gb-10gb v2-v5
bot.onText(/\/(\d+gbv[2-5])(?:\s+(.+))?/, async (msg, match) => {
  const chatId = msg.chat.id;
  const plan = match[1];
  const text = match[2];

  if (msg.chat.type !== "group" && msg.chat.type !== "supergroup") {
    bot.sendMessage(msg.chat.id, "❌ ᴋʜᴜꜱᴜꜱ ɢʀᴜᴘ!");
    return;
  }
    
  const waktu = checkCooldown(msg.from.id);
    if (waktu > 0) return bot.sendMessage(chatId, `⏳ Tunggu ${waktu} detik sebelum bisa pakai command /${plan} lagi!`, { reply_to_message_id: msg.message_id });

  const verMatch = plan.match(/v([2-5])$/i);
  const version = verMatch ? verMatch[1] : "2"; // Default ke v2 jika tidak ada

  // --- REFACTOR ---
  const panelSettings = loadJsonData(PANEL_SETTINGS_FILE);
  // --- SELESAI REFACTOR ---

  const domainMap = {
    "2": panelSettings.domainV2,
    "3": panelSettings.domainV3,
    "4": panelSettings.domainV4,
    "5": panelSettings.domainV5
  };
  const pltaMap = {
    "2": panelSettings.pltaV2,
    "3": panelSettings.pltaV3,
    "4": panelSettings.pltaV4,
    "5": panelSettings.pltaV5
  };
  // Menggunakan object specs yang sudah ada di atas
  const specsUsed = specs; // Mengacu ke object specs yang baru saja didefinisikan

  const ressFileMap = {
    "2": RESSV2_FILE,
    "3": RESSV3_FILE,
    "4": RESSV4_FILE,
    "5": RESSV5_FILE
  };

  const domain = domainMap[version];
  const plta = pltaMap[version];
  const RESS_FILE = ressFileMap[version];

  if (!domain || !plta || domain === '-' || plta === '-') {
    return bot.sendMessage(chatId, `❌ ᴀᴋᴜɴ ᴀᴅᴘ V${version} ᴍᴀꜱɪʜ ᴋᴏꜱᴏɴɢ! Silakan atur di /seturlv${version} dan /setpltav${version}`);
  }

  const ressUsers = JSON.parse(fs.readFileSync(RESS_FILE));
  const isReseller = ressUsers.includes(String(msg.from.id));

  if (!isReseller) {
    bot.sendMessage(chatId, `❌ ᴋʜᴜꜱᴜꜱ ʀᴇꜱᴇʟʟᴇʀ ᴠ${version}!`, {
      reply_markup: {
        inline_keyboard: [
          [{ text: "ᴊᴏɪɴ ꜱᴇʀᴠᴇʀ", url: `https://t.me/${dev}` }],
        ],
      },
    });
    return;
  }

  const [username,u] = (text||"").split(",");
  if (!username || !u) return bot.sendMessage(chatId, `⚠️ Usage: /${plan} namapanel,idtele`);

  // Mengambil spesifikasi yang benar
  const specKey = plan.toLowerCase(); 
  const { memo,cpu,disk } = specsUsed[specKey] || {};

  if (typeof memo === "undefined") return bot.sendMessage(chatId, `⚠️ Spesifikasi untuk ${plan} V${version} tidak ditemukan di specs.`);

  const name = username+plan;
  const email = `${username}@buyer.schnuffellll`;
  const password = username+Math.random().toString(36).slice(2,5);
  const spc = 'if [[ -d .git ]] && [[ {{AUTO_UPDATE}} == "1" ]]; then git pull; fi; if [[ ! -z ${NODE_PACKAGES} ]]; then /usr/local/bin/npm install ${NODE_PACKAGES}; fi; if [[ ! -z ${UNNODE_PACKAGES} ]]; then /usr/local/bin/npm uninstall ${UNNODE_PACKAGES}; fi; if [ -f /home/container/package.json ]; then /usr/local/bin/npm install; fi; /usr/local/bin/${CMD_RUN}';

  let user,server;
  try {
    const res1 = await fetch(`${domain}/api/application/users`, {
      method:"POST",
      headers:{ "Content-Type":"application/json", Authorization:`Bearer ${plta}` },
      body:JSON.stringify({ email, username, first_name:username, last_name:username, language:"en", password })
    });
    const data1 = await res1.json();
    if (data1.errors) return bot.sendMessage(chatId, `Error user: ${JSON.stringify(data1.errors[0])}`);
    user = data1.attributes;

    const res2 = await fetch(`${domain}/api/application/servers`, {
      method:"POST",
      headers:{ "Content-Type":"application/json", Authorization:`Bearer ${plta}` },
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
    if (data2.errors) return bot.sendMessage(chatId, `Error server: ${JSON.stringify(data2.errors[0])}`);
    server = data2.attributes;
  } catch(e) {
    return bot.sendMessage(chatId, `Error: ${e.message}`);
  }

  if (!user || !server) return bot.sendMessage(chatId,"Gagal membuat data panel.");

  bot.sendMessage(chatId, `*- BERIKUT DATA PANEL ${plan} -*
NAMA: ${username}
EMAIL: ${email}
ID: ${user.id}
MEMORY: ${server.limits.memory} MB
DISK: ${server.limits.disk} MB
CPU: ${server.limits.cpu}%`, { parse_mode: "Markdown", reply_to_message_id: msg.message_id });

  bot.sendPhoto(u, panel, {
    caption: `*🔐 Sukses Created Panel ${plan} V${version}!*
▸ Name: ${username}
▸ Email: ${email}
▸ ID: ${user.id}
▸ RAM: ${plan}

*🌐 Akun Panel V${version}*
▸ Username: \`${user.username}\`
▸ Password: \`${password}\`

*⚠️ Rules Panel*
▸ Sensor domain
▸ Simpan data akun
▸ Garansi 15 hari
`,
    parse_mode: "Markdown",
    reply_markup: {
      inline_keyboard: [
        [
          { text: "🌐 Domain", url: domain },
          { text: "🔑 Salin Password", switch_inline_query_current_chat: password }
        ],
      ],
    },
  });
});
// delsrv
bot.onText(/\/delsrv (.+)/, async (msg, match) => {
  notifyOwner('delsrv', msg);
  const chatId = msg.chat.id;
    
  if (!isPublicPanelGroup(chatId)) {
  const ownerUsers = JSON.parse(fs.readFileSync(OWNER_FILE));
  const isOwner = ownerUsers.includes(String(msg.from.id));

  if (!isOwner) {
    return bot.sendMessage(chatId, "ᴋʜᴜꜱᴜꜱ ᴅɪ ᴘᴀɴᴇʟ ᴘᴜʙʟɪᴄ", {
      reply_to_message_id: msg.message_id,
      reply_markup: {
        inline_keyboard: [[{ text: "ʙᴜʏ ᴘᴜʙʟɪᴄ", url: `https://t.me/${dev}` }]],
      },
    });
  }
}
    
  const srv = match[1].trim();
    
  const ownerUsers = JSON.parse(fs.readFileSync(OWNER_FILE));
  const isOwner = ownerUsers.includes(String(msg.from.id));
  if (!isOwner) {
    bot.sendMessage(chatId, "❌ ᴋʜᴜsᴜs ᴏᴡɴᴇʀ", {
      reply_markup: {
        inline_keyboard: [
          [{ text: "ʟᴀᴘᴏʀᴀɴ", url: `https://t.me/${dev}`}],
        ],
      },
    });
    return;
  }

  if (!srv) {
    bot.sendMessage(
      chatId,
      "Masukkan ID server yang ingin dihapus, contoh: /delsrv 1234"
    );
    return;
  }

  // --- REFACTOR ---
  const panelSettings = loadJsonData(PANEL_SETTINGS_FILE);
  const { domain, plta } = panelSettings;
  // --- SELESAI REFACTOR ---

  try {
    let f = await fetch(domain + "/api/application/servers/" + srv, {
      method: "DELETE",
      headers: {
        Accept: "application/json",
        "Content-Type": "application/json",
        Authorization: `Bearer ${plta}`,
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
    bot.sendMessage(chatId, "Terjadi kesalahan saat menghapus server.");
  }
});

// deladmin
bot.onText(/^\/deladmin(?:\s+(.+))?/, async (msg, match) => {
  notifyOwner('deladmin', msg);
  const chatId = msg.chat.id;
  const userId = match[1];

  if (!isPublicPanelGroup(chatId)) {
  const ownerUsers = JSON.parse(fs.readFileSync(OWNER_FILE));
  const isOwner = ownerUsers.includes(String(msg.from.id));

  if (!isOwner) {
    return bot.sendMessage(chatId, "ᴋʜᴜꜱᴜꜱ ᴅɪ ᴘᴀɴᴇʟ ᴘᴜʙʟɪᴄ", {
      reply_to_message_id: msg.message_id,
      reply_markup: {
        inline_keyboard: [[{ text: "ʙᴜʏ ᴘᴜʙʟɪᴄ", url: `https://t.me/${dev}` }]],
      },
    });
  }
}

  const ownerUsers = JSON.parse(fs.readFileSync(OWNER_FILE));
  const isOwner = ownerUsers.includes(String(msg.from.id));
  if (!isOwner) {
    return bot.sendMessage(chatId, "❌ ᴋʜᴜsᴜs ᴏᴡɴᴇʀ", {
      reply_markup: {
        inline_keyboard: [
          [{ text: "ʟᴀᴘᴏʀᴀɴ", url: `https://t.me/${dev}`}],
        ],
      },
    });
  }

  if (!userId) {
    return bot.sendMessage(
      chatId,
      "❌ Format salah!\nContoh: /deladmin ID",
      { parse_mode: "Markdown" }
    );
  }

  // --- REFACTOR ---
  const panelSettings = loadJsonData(PANEL_SETTINGS_FILE);
  const { domain, plta } = panelSettings;
  // --- SELESAI REFACTOR ---

  try {
    let f = await fetch(domain + "/api/application/users/" + userId, {
      method: "DELETE",
      headers: {
        Accept: "application/json",
        "Content-Type": "application/json",
        Authorization: `Bearer ${plta}`,
      },
    });

    let res = f.ok ? { errors: null } : await f.json();

    if (res.errors) {
      bot.sendMessage(chatId, "❌ ᴜsᴇʀ ᴛɪᴅᴀᴋ ᴀᴅᴀ");
    } else {
      bot.sendMessage(chatId, `✅ ꜱᴜᴋꜱᴇꜱ ᴅᴇʟᴇᴛᴇ ᴀᴅᴍɪɴ ${userId}`, {
        parse_mode: "Markdown",
        reply_to_message_id: msg.message_id,
      });
    }
  } catch (error) {
    console.error(error);
    bot.sendMessage(chatId, "Terjadi kesalahan saat menghapus admin.");
  }
});

// listsrvoff
bot.onText(/\/listsrvoff/, async (msg) => {
  const chatId = msg.chat.id;
    
  if (!isPublicPanelGroup(chatId)) {
  const ownerUsers = JSON.parse(fs.readFileSync(OWNER_FILE));
  const isOwner = ownerUsers.includes(String(msg.from.id));

  if (!isOwner) {
    return bot.sendMessage(chatId, "ᴋʜᴜꜱᴜꜱ ᴅɪ ᴘᴀɴᴇʟ ᴘᴜʙʟɪᴄ", {
      reply_to_message_id: msg.message_id,
      reply_markup: {
        inline_keyboard: [[{ text: "ʙᴜʏ ᴘᴜʙʟɪᴄ", url: `https://t.me/${dev}` }]],
      },
    });
  }
}

  // --- REFACTOR ---
  const panelSettings = loadJsonData(PANEL_SETTINGS_FILE);
  const { domain, plta, pltc } = panelSettings;
  // --- SELESAI REFACTOR ---

  try {
    const ownerUsers = JSON.parse(fs.readFileSync(OWNER_FILE));
    const isOwner = ownerUsers.includes(String(msg.from.id));
    if (!isOwner) {
      return bot.sendMessage(chatId, "❌ ᴋʜᴜsᴜs ᴏᴡɴᴇʀ", {
        reply_markup: {
          inline_keyboard: [[{ text: "ʟᴀᴘᴏʀᴀɴ", url: `https://t.me/${dev}`}]],
        },
      });
    }

    let offlineServers = [];
    let page = 1;
    let totalPages = 1;

    // Ambil semua halaman server
    do {
      let f = await fetch(`${domain}/api/application/servers?page=${page}`, {
        method: "GET",
        headers: {
          Accept: "application/json",
          "Content-Type": "application/json",
          Authorization: `Bearer ${plta}`,
        },
      });

      let res = await f.json();
      let servers = res.data;
      totalPages = res.meta.pagination.total_pages;

      for (let server of servers) {
        let s = server.attributes;
        try {
          let f3 = await fetch(
            `${domain}/api/client/servers/${s.uuid.split("-")[0]}/resources`,
            {
              method: "GET",
              headers: {
                Accept: "application/json",
                "Content-Type": "application/json",
                Authorization: `Bearer ${pltc}`,
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
      return bot.sendMessage(chatId, "✅ Semua server dalam keadaan online.");
    }

    // Gabung semua offline server ke string
    let messageText = `📋 ᴅᴀғᴛᴀʀ sᴇʀᴠᴇʀ ᴏғғʟɪɴᴇ (${offlineServers.length}):\n\n${offlineServers.join("\n")}`;

    // Handle limit karakter Telegram (4096)
    while (messageText.length > 0) {
      let chunk = messageText.slice(0, 4000); 
      messageText = messageText.slice(4000);
      await bot.sendMessage(chatId, chunk);
    }

  } catch (error) {
    console.error(error);
    bot.sendMessage(chatId, "⚠️ Terjadi kesalahan saat memproses /listsrvoff.");
  }
});

// delallusr offline (Admin tanpa server)
// Fitur ini menghapus semua user admin yang tidak memiliki server
// Berguna untuk membersihkan user yang sudah tidak aktif
bot.onText(/\/delusroff(?:\s+(\d+))?/, async (msg, match) => {
  notifyOwner("delusroff", msg);
  const chatId = msg.chat.id;
  const exceptId = match[1]; // ID pengecualian (opsional)

  // Cek permission - harus owner atau di grup public
  if (!isPublicPanelGroup(chatId)) {
    const ownerUsers = JSON.parse(fs.readFileSync(OWNER_FILE));
    const isOwner = ownerUsers.includes(String(msg.from.id));

    if (!isOwner) {
      return bot.sendMessage(chatId, "ᴋʜᴜꜱᴜꜱ ᴅɪ ᴘᴀɴᴇʟ ᴘᴜʙʟɪᴄ", {
        reply_to_message_id: msg.message_id,
        reply_markup: {
          inline_keyboard: [[{ text: "ʙᴜʏ ᴘᴜʙʟɪᴄ", url: `https://t.me/${dev}` }]],
        },
      });
    }
  }

  const waitMsg = await bot.sendMessage(chatId, "⏳ Sedang memproses...", { reply_to_message_id: msg.message_id });
  
  // Baca setting panel (gunakan panel utama, bukan V2)
  const panelSettings = loadJsonData(PANEL_SETTINGS_FILE);
  const { domain, plta } = panelSettings;
  
  // Validasi setting panel
  if (!domain || domain === '-' || !plta || plta === '-') {
    return bot.editMessageText("❌ Setting panel belum dikonfigurasi!\nGunakan /seturl dan /setplta dulu.", {
      chat_id: chatId,
      message_id: waitMsg.message_id
    });
  }

  try {
    const ownerUsers = JSON.parse(fs.readFileSync(OWNER_FILE));
    if (!ownerUsers.includes(String(msg.from.id))) {
      return bot.editMessageText("❌ ᴋʜᴜsᴜs ᴏᴡɴᴇʀ", {
        chat_id: chatId,
        message_id: waitMsg.message_id,
        reply_markup: {
          inline_keyboard: [[{ text: "ʟᴀᴘᴏʀᴀɴ", url: `https://t.me/${dev}` }]],
        },
      });
    }

    let page = 1;
    let totalPages = 1;
    let usersToDelete = [];

    // Loop semua halaman user
    do {
      const f = await fetch(`${domain}/api/application/users?page=${page}&per_page=50`, {
        method: "GET",
        headers: {
          Accept: "application/json",
          "Content-Type": "application/json",
          Authorization: `Bearer ${plta}`,
        },
      });

      // Handle response error
      if (!f.ok) {
        const errText = await f.text();
        console.error("API Error:", errText);
        throw new Error(`API returned ${f.status}`);
      }

      const res = await f.json();
      if (!res.data) break;

      const users = res.data;
      totalPages = res.meta?.pagination?.total_pages || 1;

      for (let u of users) {
        const user = u.attributes;

        // Skip kalau ID dikecualikan
        if (exceptId && String(user.id) === exceptId) continue;

        // Cek user yang merupakan admin
        if (user.root_admin) {
          try {
            // Cek apakah user punya server
            const f2 = await fetch(`${domain}/api/application/users/${user.id}?include=servers`, {
              method: "GET",
              headers: {
                Accept: "application/json",
                "Content-Type": "application/json",
                Authorization: `Bearer ${plta}`,
              },
            });

            if (!f2.ok) continue;

            const detail = await f2.json();
            const servers = detail.attributes?.relationships?.servers?.data || [];

            // Jika tidak punya server, tambahkan ke list hapus
            if (servers.length === 0) {
              usersToDelete.push({ id: user.id, username: user.username });
            }
          } catch (err) {
            console.error(`Gagal cek server user ${user.id}`, err.message);
          }
        }
      }

      page++;
    } while (page <= totalPages);

    if (usersToDelete.length === 0) {
      return bot.editMessageText("✅ Tidak ada user admin tanpa server untuk dihapus.", {
        chat_id: chatId,
        message_id: waitMsg.message_id
      });
    }

    // Update progress
    await bot.editMessageText(`⏳ Menghapus ${usersToDelete.length} user...`, {
      chat_id: chatId,
      message_id: waitMsg.message_id
    });

    let success = [];
    let failed = [];

    for (let usr of usersToDelete) {
      try {
        const del = await fetch(`${domain}/api/application/users/${usr.id}`, {
          method: "DELETE",
          headers: {
            Accept: "application/json",
            "Content-Type": "application/json",
            Authorization: `Bearer ${plta}`,
          },
        });

        if (del.status === 204 || del.ok) {
          success.push(`✅ ${usr.username} (ID: ${usr.id})`);
        } else {
          failed.push(`❌ ${usr.username} (ID: ${usr.id})`);
        }
      } catch (err) {
        console.error(`Gagal hapus user ${usr.id}`, err.message);
        failed.push(`❌ ${usr.username} (ID: ${usr.id})`);
      }
    }

    let report = `🗑️ *Hasil Hapus User Offline (Admin tanpa Server)*\n\n` +
      `✅ Berhasil: ${success.length}\n` +
      `❌ Gagal: ${failed.length}\n\n`;

    if (success.length) report += `*Berhasil Dihapus:*\n${success.slice(0, 20).join("\n")}${success.length > 20 ? `\n... dan ${success.length - 20} lainnya` : ''}\n\n`;
    if (failed.length) report += `*Gagal Dihapus:*\n${failed.slice(0, 10).join("\n")}${failed.length > 10 ? `\n... dan ${failed.length - 10} lainnya` : ''}`;

    // Kirim report (handle limit karakter)
    await bot.deleteMessage(chatId, waitMsg.message_id);
    
    while (report.length > 0) {
      const chunk = report.slice(0, 4000);
      report = report.slice(4000);
      await bot.sendMessage(chatId, chunk, { parse_mode: "Markdown", reply_to_message_id: msg.message_id });
    }

  } catch (error) {
    console.error("Error /delusroff:", error.message);
    bot.editMessageText(`⚠️ Terjadi kesalahan: ${error.message}`, {
      chat_id: chatId,
      message_id: waitMsg.message_id
    });
  }
});

// delallsrv offline
bot.onText(/\/delsrvoff/, async (msg) => {
  notifyOwner('delsrvoff', msg);
  const chatId = msg.chat.id;

  if (!isPublicPanelGroup(chatId)) {
  const ownerUsers = JSON.parse(fs.readFileSync(OWNER_FILE));
  const isOwner = ownerUsers.includes(String(msg.from.id));

  if (!isOwner) {
    return bot.sendMessage(chatId, "ᴋʜᴜꜱᴜꜱ ᴅɪ ᴘᴀɴᴇʟ ᴘᴜʙʟɪᴄ", {
      reply_to_message_id: msg.message_id,
      reply_markup: {
        inline_keyboard: [[{ text: "ʙᴜʏ ᴘᴜʙʟɪᴄ", url: `https://t.me/${dev}` }]],
      },
    });
  }
}
    
  bot.sendMessage(chatId, "⏳");

  // --- REFACTOR ---
  const panelSettings = loadJsonData(PANEL_SETTINGS_FILE);
  const { domain, plta, pltc } = panelSettings;
  // --- SELESAI REFACTOR ---

  try {
    const ownerUsers = JSON.parse(fs.readFileSync(OWNER_FILE));
    const isOwner = ownerUsers.includes(String(msg.from.id));
    if (!isOwner) {
      return bot.sendMessage(chatId, "❌ ᴋʜᴜsᴜs ᴏᴡɴᴇʀ", {
        reply_markup: {
          inline_keyboard: [[{ text: "ʟᴀᴘᴏʀᴀɴ", url: `https://t.me/${dev}` }]],
        },
      });
    }

    let page = 1;
    let totalPages = 1;
    let offlineServers = [];

    // Ambil semua server dari semua page
    do {
      let f = await fetch(`${domain}/api/application/servers?page=${page}`, {
        method: "GET",
        headers: {
          Accept: "application/json",
          "Content-Type": "application/json",
          Authorization: `Bearer ${plta}`,
        },
      });

      let res = await f.json();
      let servers = res.data;
      totalPages = res.meta.pagination.total_pages;

      for (let server of servers) {
        let s = server.attributes;
        try {
          let f3 = await fetch(
            `${domain}/api/client/servers/${s.uuid.split("-")[0]}/resources`,
            {
              method: "GET",
              headers: {
                Accept: "application/json",
                "Content-Type": "application/json",
                Authorization: `Bearer ${pltc}`,
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
        let del = await fetch(`${domain}/api/application/servers/${srv.id}`, {
          method: "DELETE",
          headers: {
            Accept: "application/json",
            "Content-Type": "application/json",
            Authorization: `Bearer ${plta}`,
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

    let report = `🗑️ Sukses menghapus Server yang Offline:\n\n` +
      `ʙᴇʀʜᴀsɪʟ ᴅɪʜᴀᴘᴜs: ${success.length}\n` +
      `ɢᴀɢᴀʟ ᴅɪʜᴀᴘᴜs: ${failed.length}\n\n`;

    if (success.length) {
      report += `✅ ʙᴇʀʜᴀsɪʟ:\n${success.join("\n")}\n\n`;
    }
    if (failed.length) {
      report += `❌ ɢᴀɢᴀʟ:\n${failed.join("\n")}`;
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
    
// total server
bot.onText(/\/totalserver/, async (msg) => {
  const chatId = msg.chat.id;

  if (!isPublicPanelGroup(chatId)) {
  const ownerUsers = JSON.parse(fs.readFileSync(OWNER_FILE));
  const isOwner = ownerUsers.includes(String(msg.from.id));

  if (!isOwner) {
    return bot.sendMessage(chatId, "ᴋʜᴜꜱᴜꜱ ᴅɪ ᴘᴀɴᴇʟ ᴘᴜʙʟɪᴄ", {
      reply_to_message_id: msg.message_id,
      reply_markup: {
        inline_keyboard: [[{ text: "ʙᴜʏ ᴘᴜʙʟɪᴄ", url: `https://t.me/${dev}` }]],
      },
    });
  }
}

  // --- REFACTOR ---
  const panelSettings = loadJsonData(PANEL_SETTINGS_FILE);
  const { domain, plta } = panelSettings;
  // --- SELESAI REFACTOR ---

  try {

    let page = 1;
    let totalPages = 1;
    let totalServers = 0;

    // Loop semua halaman server
    do {
      let f = await fetch(`${domain}/api/application/servers?page=${page}`, {
        method: "GET",
        headers: {
          Accept: "application/json",
          "Content-Type": "application/json",
          Authorization: `Bearer ${plta}`,
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
      `📊 Total server: *${totalServers}*`,
      { parse_mode: "Markdown",
    reply_to_message_id: msg.message_id }
    );

  } catch (error) {
    console.error(error);
    bot.sendMessage(chatId, "⚠️ Terjadi kesalahan saat memproses /totalserver.");
  }
});

// listadmin
const adminPages = new Map();

bot.onText(/\/listadmin/, async (msg) => {
  const chatId = msg.chat.id;

  if (!isPublicPanelGroup(chatId)) {
  const ownerUsers = JSON.parse(fs.readFileSync(OWNER_FILE));
  const isOwner = ownerUsers.includes(String(msg.from.id));

  if (!isOwner) {
    return bot.sendMessage(chatId, "ᴋʜᴜꜱᴜꜱ ᴅɪ ᴘᴀɴᴇʟ ᴘᴜʙʟɪᴄ", {
      reply_to_message_id: msg.message_id,
      reply_markup: {
        inline_keyboard: [[{ text: "ʙᴜʏ ᴘᴜʙʟɪᴄ", url: `https://t.me/${dev}` }]],
      },
    });
  }
}

  // --- REFACTOR ---
  const panelSettings = loadJsonData(PANEL_SETTINGS_FILE);
  const { domain, plta } = panelSettings;
  // --- SELESAI REFACTOR ---

  const wait = await bot.sendMessage(chatId, "⏳");

  try {
    let page = 1;
    let admins = [];
    let totalPages = 1;

    // ambil semua admin
    do {
      const res = await fetch(`${domain}/api/application/users?page=${page}`, {
        headers: {
          Accept: "application/json",
          Authorization: `Bearer ${plta}`,
        },
      });
      const json = await res.json();
      if (!json.data) break;

      totalPages = json.meta.pagination.total_pages;
      const users = json.data;
      for (let user of users) {
        const u = user.attributes;
        if (u.root_admin) {
          admins.push({
            id: u.id,
            username: u.username,
            email: u.email,
            status: u.attributes?.user?.server_limit === null ? "Inactive" : "Active",
          });
        }
      }
      page++;
    } while (page <= totalPages);

    if (admins.length === 0) {
      return bot.editMessageText("⚠️ Tidak ada admin ditemukan.", {
        chat_id: chatId,
        message_id: wait.message_id,
      });
    }

    // ambil total server (inti)
    let totalServer = 0;
    try {
      const r = await fetch(`${domain}/api/application/servers`, {
        headers: { Authorization: `Bearer ${plta}` },
      });
      const j = await r.json();
      totalServer = j.meta.pagination.total;
    } catch {
      totalServer = "Unknown";
    }

    const pageSize = 10;
    const totalPage = Math.ceil(admins.length / pageSize);
    adminPages.set(chatId, { admins, totalPage, totalServer });

    const getPageText = (p) => {
      const { admins, totalPage, totalServer } = adminPages.get(chatId);
      const start = (p - 1) * pageSize;
      const end = Math.min(start + pageSize, admins.length);
      let text = `📊 Total Admin: ${admins.length}\n🖥️ Total Server: ${totalServer}\n\n`;

      for (let i = start; i < end; i++) {
        const a = admins[i];
        text += `ID: ${a.id}\nUsername: ${a.username}\nEmail: ${a.email}\nStatus: ${a.status}\n\n`;
      }
      return text.trim();
    };

    const text = getPageText(1);
    await bot.editMessageText(text, {
      chat_id: chatId,
      message_id: wait.message_id,
      reply_markup: {
        inline_keyboard: [[
          { text: "(1/" + totalPage + ")", callback_data: "none" },
          { text: "➡️", callback_data: "adm_next_1" }
        ]],
      },
    });
  } catch (err) {
    console.error(err);
    bot.editMessageText("⚠️ Terjadi kesalahan saat memuat daftar admin.", {
      chat_id: chatId,
      message_id: wait.message_id,
    });
  }
});

bot.on("callback_query", async (q) => {
  const chatId = q.message.chat.id;
  const data = q.data;

  if (!data.startsWith("adm_")) return;

  try {
    const saved = adminPages.get(chatId);
    if (!saved) return;

    let currentPage = parseInt(data.split("_")[2]);
    let newPage = data.includes("next") ? currentPage + 1 : currentPage - 1;
    if (newPage < 1 || newPage > saved.totalPage) return;

    const getPageText = (p) => {
      const { admins, totalPage, totalServer } = saved;
      const pageSize = 10;
      const start = (p - 1) * pageSize;
      const end = Math.min(start + pageSize, admins.length);
      let text = `📊 Total Admin: ${admins.length}\n🖥️ Total Server: ${totalServer}\n\n`;

      for (let i = start; i < end; i++) {
        const a = admins[i];
        text += `ID: ${a.id}\nUsername: ${a.username}\nEmail: ${a.email}\nStatus: ${a.status}\n\n`;
      }
      return text.trim();
    };

    const newText = getPageText(newPage);
    const { totalPage } = saved;
    const pageInfo = { text: `(${newPage}/${totalPage})`, callback_data: "none" };
    const keyboard = [];

    if (newPage > 1 && newPage < totalPage) {
      keyboard.push(
        { text: "⬅️", callback_data: `adm_prev_${newPage}` },
        pageInfo,
        { text: "➡️", callback_data: `adm_next_${newPage}` }
      );
    } else if (newPage > 1) {
      keyboard.push(
        { text: "⬅️", callback_data: `adm_prev_${newPage}` },
        pageInfo
      );
    } else if (newPage < totalPage) {
      keyboard.push(
        pageInfo,
        { text: "➡️", callback_data: `adm_next_${newPage}` }
      );
    } else {
      keyboard.push(pageInfo);
    }

    await bot.editMessageText(newText, {
      chat_id: chatId,
      message_id: q.message.message_id,
      reply_markup: { inline_keyboard: [keyboard] },
    });

    await bot.answerCallbackQuery(q.id);
  } catch (err) {
    console.error("Callback error:", err.message);
  }
});
    
// listsrv
const serverPages = new Map();

bot.onText(/^\/listsrv$/, async (msg) => {
  const chatId = msg.chat.id;

  if (!isPublicPanelGroup(chatId)) {
  const ownerUsers = JSON.parse(fs.readFileSync(OWNER_FILE));
  const isOwner = ownerUsers.includes(String(msg.from.id));

  if (!isOwner) {
    return bot.sendMessage(chatId, "ᴋʜᴜꜱᴜꜱ ᴅɪ ᴘᴀɴᴇʟ ᴘᴜʙʟɪᴄ", {
      reply_to_message_id: msg.message_id,
      reply_markup: {
        inline_keyboard: [[{ text: "ʙᴜʏ ᴘᴜʙʟɪᴄ", url: `https://t.me/${dev}` }]],
      },
    });
  }
}

  // --- REFACTOR ---
  const panelSettings = loadJsonData(PANEL_SETTINGS_FILE);
  const { domain, plta, pltc } = panelSettings;
  // --- SELESAI REFACTOR ---

  const wait = await bot.sendMessage(chatId, "⏳");
  try {
    let page = 1;
    let servers = [];
    let totalPages = 1;

    do {
      const res = await fetch(`${domain}/api/application/servers?page=${page}`, {
        headers: {
          Accept: "application/json",
          Authorization: `Bearer ${plta}`,
        },
      });
      const json = await res.json();
      if (!json.data) break;

      servers = servers.concat(json.data);
      totalPages = json.meta.pagination.total_pages;
      page++;
    } while (page <= totalPages);

    if (servers.length === 0) {
      return bot.editMessageText("⚠️ Tidak ada server ditemukan.", {
        chat_id: chatId,
        message_id: wait.message_id,
      });
    }

    const pageSize = 10;
    const total = servers.length;
    const totalPage = Math.ceil(total / pageSize);
    serverPages.set(chatId, { servers, totalPage });

    const getPageText = async (p) => {
      let start = (p - 1) * pageSize;
      let end = Math.min(start + pageSize, total);
      let text = `📋 ᴅᴀғᴛᴀʀ sᴇʀᴠᴇʀ :\n\n`;

      for (let i = start; i < end; i++) {
        const s = servers[i].attributes;
        try {
          const r = await fetch(`${domain}/api/client/servers/${s.uuid.split("-")[0]}/resources`, {
            headers: {
              Accept: "application/json",
              Authorization: `Bearer ${pltc}`,
            },
          });
          const d = await r.json();
          const status = d.attributes ? d.attributes.current_state : "unknown";
          text += `ID: ${s.id}\nNama: ${s.name}\nStatus: ${status}\n\n`;
        } catch {
          text += `ID: ${s.id}\nNama: ${s.name}\nStatus: unknown\n\n`;
        }
      }

      return text.trim();
    };

    const text = await getPageText(1);
    await bot.editMessageText(text, {
      chat_id: chatId,
      message_id: wait.message_id,
      reply_markup: {
        inline_keyboard: [[
          { text: "(1/" + totalPage + ")", callback_data: "none" },
          { text: "➡️", callback_data: "srv_next_1" }
        ]],
      },
    });
  } catch (err) {
    console.error(err);
    bot.editMessageText("❌ Gagal mengambil data server.", {
      chat_id: chatId,
      message_id: wait.message_id,
    });
  }
});

bot.on("callback_query", async (q) => {
  const chatId = q.message.chat.id;
  const data = q.data;

  if (!data.startsWith("srv_")) return;

  try {
    const saved = serverPages.get(chatId);
    if (!saved) return;

    let currentPage = parseInt(data.split("_")[2]);
    let newPage = data.includes("next") ? currentPage + 1 : currentPage - 1;
    if (newPage < 1 || newPage > saved.totalPage) return;

    // --- REFACTOR ---
    // Kita perlu pltc di sini, jadi kita baca lagi
    const panelSettings = loadJsonData(PANEL_SETTINGS_FILE);
    const { domain, pltc } = panelSettings; 
    // --- SELESAI REFACTOR ---

    const getPageText = async (p) => {
      const { servers, totalPage } = saved;
      const pageSize = 10;
      let start = (p - 1) * pageSize;
      let end = Math.min(start + pageSize, servers.length);
      let text = `📋 ᴅᴀғᴛᴀʀ sᴇʀᴠᴇʀ :\n\n`;

      for (let i = start; i < end; i++) {
        const s = servers[i].attributes;
        // Kita tambahkan try-catch di sini untuk status, karena ini file lama
        let status = "unknown";
        try {
          const r = await fetch(`${domain}/api/client/servers/${s.uuid.split("-")[0]}/resources`, {
            headers: {
              Accept: "application/json",
              Authorization: `Bearer ${pltc}`,
            },
          });
          const d = await r.json();
          status = d.attributes ? d.attributes.current_state : "unknown";
        } catch {}
        
        text += `ID: ${s.id}\nNama: ${s.name}\nStatus: ${status}\n\n`;
      }

      return text.trim();
    };

    const newText = await getPageText(newPage);
    const { totalPage } = saved;
    const pageInfo = { text: `(${newPage}/${totalPage})`, callback_data: "none" };
    const keyboard = [];

    if (newPage > 1 && newPage < totalPage) {
      keyboard.push(
        { text: "⬅️", callback_data: `srv_prev_${newPage}` },
        pageInfo,
        { text: "➡️", callback_data: `srv_next_${newPage}` }
      );
    } else if (newPage > 1) {
      keyboard.push(
        { text: "⬅️", callback_data: `srv_prev_${newPage}` },
        pageInfo
      );
    } else if (newPage < totalPage) {
      keyboard.push(
        pageInfo,
        { text: "➡️", callback_data: `srv_next_${newPage}` }
      );
    } else {
      keyboard.push(pageInfo);
    }

    await bot.editMessageText(newText, {
      chat_id: chatId,
      message_id: q.message.message_id,
      reply_markup: { inline_keyboard: [keyboard] },
    });

    await bot.answerCallbackQuery(q.id);
  } catch (err) {
    console.error("Callback error:", err.message);
  }
});
    
} // <-- JANGAN HAPUS INI. INI PENUTUP AKHIR module.exports = (bot) => { ... }
