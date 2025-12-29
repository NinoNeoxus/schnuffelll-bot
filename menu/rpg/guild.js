/**
 * ═══════════════════════════════════════════════════════════════════════════════════════
 *  ⚔️ SCHNUFFELLL BOT - RPG GUILD SYSTEM v8.0
 *  Guild/clan system with battles
 *  
 *  Commands:
 *  /guild           - Guild menu
 *  /guildcreate     - Buat guild
 *  /guildjoin       - Join guild
 *  /guildleave      - Leave guild
 *  /guildinfo       - Info guild
 *  /guildmembers    - List members
 *  /guildbattle     - Guild battle
 *  /guildrank       - Guild ranking
 *  /guildchat       - Guild chat
 *  
 *  @author @schnuffelll
 *  @version 8.0
 * ═══════════════════════════════════════════════════════════════════════════════════════
 */

const fs = require('fs');
const { loadJsonData, saveJsonData } = require('../../lib/function');

module.exports = (bot) => {

    console.log('[GUILD] ⚔️ RPG Guild System v8.0 loaded');

    const GUILD_FILE = './db/rpg/guilds.json';
    const PLAYER_FILE = './db/rpg/players.json';

    // Initialize
    if (!fs.existsSync(GUILD_FILE)) {
        saveJsonData(GUILD_FILE, {});
    }

    // Helper functions
    function getGuilds() {
        return loadJsonData(GUILD_FILE) || {};
    }

    function saveGuilds(data) {
        saveJsonData(GUILD_FILE, data);
    }

    function getPlayerGuild(userId) {
        const guilds = getGuilds();
        for (const [guildId, guild] of Object.entries(guilds)) {
            if (guild.members.includes(userId)) {
                return { guildId, guild };
            }
        }
        return null;
    }

    function getPlayer(userId) {
        const players = loadJsonData(PLAYER_FILE) || {};
        return players[userId] || { gold: 1000, level: 1, exp: 0, attack: 10, defense: 5 };
    }

    // ═══════════════════════════════════════════════════════════════════════════════
    // /guild - Guild menu
    // ═══════════════════════════════════════════════════════════════════════════════
    bot.onText(/^\/guild$/i, async (msg) => {
        const chatId = msg.chat.id;
        const userId = msg.from.id.toString();
        const myGuild = getPlayerGuild(userId);

        if (!myGuild) {
            const text = `
⚔️ <b>GUILD CENTER</b>
<code>━━━━━━━━━━━━━━━━━━━━━━</code>

❌ Kamu belum punya guild!

<b>OPTIONS:</b>
• /guildcreate &lt;name&gt; - Buat guild (1000g)
• /guildlist - Lihat guild aktif
• /guildjoin &lt;id&gt; - Join guild
`;
            return bot.sendMessage(chatId, text, { parse_mode: 'HTML' });
        }

        const { guildId, guild } = myGuild;
        const isLeader = guild.leader === userId;

        const text = `
⚔️ <b>${guild.name}</b>
<code>━━━━━━━━━━━━━━━━━━━━━━</code>

<blockquote>
🆔 ID: <code>${guildId}</code>
👑 Leader: ${guild.leader}
👥 Members: ${guild.members.length}/${guild.maxMembers}
⚡ Power: ${guild.power || 0}
🏆 Wins: ${guild.wins || 0}
📅 Created: ${new Date(guild.createdAt).toLocaleDateString('id-ID')}
</blockquote>

${isLeader ? '👑 <i>Kamu adalah Guild Leader!</i>' : ''}
`;

        bot.sendMessage(chatId, text, {
            parse_mode: 'HTML',
            reply_markup: {
                inline_keyboard: [
                    [
                        { text: '👥 Members', callback_data: 'guild_members' },
                        { text: '📊 Stats', callback_data: 'guild_stats' }
                    ],
                    [
                        { text: '⚔️ Battle', callback_data: 'guild_battle' },
                        { text: '🏆 Ranking', callback_data: 'guild_rank' }
                    ],
                    isLeader ? [{ text: '⚙️ Settings', callback_data: 'guild_settings' }] : []
                ].filter(row => row.length > 0)
            }
        });
    });

    // ═══════════════════════════════════════════════════════════════════════════════
    // /guildcreate <name> - Buat guild
    // ═══════════════════════════════════════════════════════════════════════════════
    bot.onText(/^\/guildcreate\s+(.+)$/i, async (msg, match) => {
        const chatId = msg.chat.id;
        const userId = msg.from.id.toString();
        const guildName = match[1].trim();

        if (getPlayerGuild(userId)) {
            return bot.sendMessage(chatId, '❌ Kamu sudah punya guild! Leave dulu untuk buat guild baru.');
        }

        if (guildName.length < 3 || guildName.length > 20) {
            return bot.sendMessage(chatId, '❌ Nama guild harus 3-20 karakter!');
        }

        const players = loadJsonData(PLAYER_FILE) || {};
        const player = players[userId] || { gold: 1000 };

        if (player.gold < 1000) {
            return bot.sendMessage(chatId, `❌ Gold tidak cukup! Butuh 1000g (kamu punya ${player.gold}g)`);
        }

        // Deduct gold
        player.gold -= 1000;
        players[userId] = player;
        saveJsonData(PLAYER_FILE, players);

        // Create guild
        const guilds = getGuilds();
        const guildId = `G${Date.now().toString(36).toUpperCase()}`;

        guilds[guildId] = {
            name: guildName,
            leader: userId,
            members: [userId],
            maxMembers: 10,
            power: 0,
            wins: 0,
            losses: 0,
            description: '',
            createdAt: Date.now()
        };

        saveGuilds(guilds);

        bot.sendMessage(chatId, `⚔️ <b>Guild Created!</b>\n\n📛 Name: ${guildName}\n🆔 ID: <code>${guildId}</code>\n💰 Cost: 1000g\n\n✅ Kamu sekarang Guild Leader!`, { parse_mode: 'HTML' });
    });

    // ═══════════════════════════════════════════════════════════════════════════════
    // /guildjoin <id> - Join guild
    // ═══════════════════════════════════════════════════════════════════════════════
    bot.onText(/^\/guildjoin\s+(\S+)$/i, async (msg, match) => {
        const chatId = msg.chat.id;
        const userId = msg.from.id.toString();
        const guildId = match[1].toUpperCase();

        if (getPlayerGuild(userId)) {
            return bot.sendMessage(chatId, '❌ Kamu sudah punya guild! Leave dulu untuk join guild lain.');
        }

        const guilds = getGuilds();
        const guild = guilds[guildId];

        if (!guild) {
            return bot.sendMessage(chatId, `❌ Guild "${guildId}" tidak ditemukan!`);
        }

        if (guild.members.length >= guild.maxMembers) {
            return bot.sendMessage(chatId, '❌ Guild sudah penuh!');
        }

        guild.members.push(userId);
        saveGuilds(guilds);

        bot.sendMessage(chatId, `✅ <b>Joined Guild!</b>\n\n⚔️ ${guild.name}\n👥 Members: ${guild.members.length}/${guild.maxMembers}`, { parse_mode: 'HTML' });

        // Notify guild leader
        try {
            bot.sendMessage(guild.leader, `📢 New member joined ${guild.name}!\n\n👤 User: ${msg.from.first_name || userId}`);
        } catch (e) { }
    });

    // ═══════════════════════════════════════════════════════════════════════════════
    // /guildleave - Leave guild
    // ═══════════════════════════════════════════════════════════════════════════════
    bot.onText(/^\/guildleave$/i, async (msg) => {
        const chatId = msg.chat.id;
        const userId = msg.from.id.toString();
        const myGuild = getPlayerGuild(userId);

        if (!myGuild) {
            return bot.sendMessage(chatId, '❌ Kamu tidak punya guild!');
        }

        const { guildId, guild } = myGuild;
        const guilds = getGuilds();

        if (guild.leader === userId) {
            if (guild.members.length > 1) {
                return bot.sendMessage(chatId, '❌ Leader tidak bisa leave! Transfer leadership dulu atau kick semua member.');
            }
            // Delete guild if leader and alone
            delete guilds[guildId];
            saveGuilds(guilds);
            return bot.sendMessage(chatId, `✅ Guild "${guild.name}" telah dibubarkan!`);
        }

        // Remove member
        guild.members = guild.members.filter(m => m !== userId);
        saveGuilds(guilds);

        bot.sendMessage(chatId, `✅ Kamu telah keluar dari ${guild.name}`);
    });

    // ═══════════════════════════════════════════════════════════════════════════════
    // /guildlist - List all guilds
    // ═══════════════════════════════════════════════════════════════════════════════
    bot.onText(/^\/guildlist$/i, async (msg) => {
        const chatId = msg.chat.id;
        const guilds = getGuilds();

        const guildList = Object.entries(guilds).sort((a, b) => b[1].power - a[1].power);

        if (guildList.length === 0) {
            return bot.sendMessage(chatId, '📋 Belum ada guild.\n\nGunakan /guildcreate untuk buat guild!');
        }

        let text = `⚔️ <b>GUILD LIST</b>\n<code>━━━━━━━━━━━━━━━━━━━━━━</code>\n\n`;

        guildList.slice(0, 10).forEach(([id, g], i) => {
            const medal = ['🥇', '🥈', '🥉'][i] || `${i + 1}.`;
            text += `${medal} <b>${g.name}</b>\n`;
            text += `   🆔 <code>${id}</code> | 👥 ${g.members.length} | ⚡${g.power}\n\n`;
        });

        text += `\n<i>/guildjoin &lt;id&gt; untuk join</i>`;

        bot.sendMessage(chatId, text, { parse_mode: 'HTML' });
    });

    // ═══════════════════════════════════════════════════════════════════════════════
    // /guildmembers - List members
    // ═══════════════════════════════════════════════════════════════════════════════
    bot.onText(/^\/guildmembers$/i, async (msg) => {
        const chatId = msg.chat.id;
        const userId = msg.from.id.toString();
        const myGuild = getPlayerGuild(userId);

        if (!myGuild) {
            return bot.sendMessage(chatId, '❌ Kamu tidak punya guild!');
        }

        const { guild } = myGuild;
        const players = loadJsonData(PLAYER_FILE) || {};

        let text = `👥 <b>${guild.name} MEMBERS</b>\n<code>━━━━━━━━━━━━━━━━━━━━━━</code>\n\n`;

        guild.members.forEach((memberId, i) => {
            const player = players[memberId] || { level: 1 };
            const isLeader = memberId === guild.leader;
            const badge = isLeader ? '👑' : '⚔️';
            text += `${i + 1}. ${badge} ID: ${memberId}\n   📊 Lv.${player.level}\n`;
        });

        bot.sendMessage(chatId, text, { parse_mode: 'HTML' });
    });

    // ═══════════════════════════════════════════════════════════════════════════════
    // /guildbattle - Guild vs guild battle
    // ═══════════════════════════════════════════════════════════════════════════════
    bot.onText(/^\/guildbattle\s+(\S+)$/i, async (msg, match) => {
        const chatId = msg.chat.id;
        const userId = msg.from.id.toString();
        const targetGuildId = match[1].toUpperCase();

        const myGuild = getPlayerGuild(userId);
        if (!myGuild) {
            return bot.sendMessage(chatId, '❌ Kamu tidak punya guild!');
        }

        if (myGuild.guild.leader !== userId) {
            return bot.sendMessage(chatId, '❌ Hanya leader yang bisa memulai battle!');
        }

        const guilds = getGuilds();
        const targetGuild = guilds[targetGuildId];

        if (!targetGuild) {
            return bot.sendMessage(chatId, `❌ Guild "${targetGuildId}" tidak ditemukan!`);
        }

        if (targetGuildId === myGuild.guildId) {
            return bot.sendMessage(chatId, '❌ Tidak bisa battle dengan guild sendiri!');
        }

        // Calculate total power
        const players = loadJsonData(PLAYER_FILE) || {};

        let myPower = 0, enemyPower = 0;

        myGuild.guild.members.forEach(id => {
            const p = players[id] || { level: 1, attack: 10, defense: 5 };
            myPower += (p.level * 10) + p.attack + p.defense;
        });

        targetGuild.members.forEach(id => {
            const p = players[id] || { level: 1, attack: 10, defense: 5 };
            enemyPower += (p.level * 10) + p.attack + p.defense;
        });

        // Add randomness
        myPower += Math.floor(Math.random() * 50);
        enemyPower += Math.floor(Math.random() * 50);

        const won = myPower > enemyPower;

        // Update guilds
        if (won) {
            myGuild.guild.wins = (myGuild.guild.wins || 0) + 1;
            myGuild.guild.power = (myGuild.guild.power || 0) + 50;
            targetGuild.losses = (targetGuild.losses || 0) + 1;
        } else {
            myGuild.guild.losses = (myGuild.guild.losses || 0) + 1;
            targetGuild.wins = (targetGuild.wins || 0) + 1;
            targetGuild.power = (targetGuild.power || 0) + 50;
        }

        saveGuilds(guilds);

        const emoji = won ? '🎉' : '😢';
        const result = won ? 'MENANG!' : 'KALAH!';

        const text = `
⚔️ <b>GUILD BATTLE</b>
<code>━━━━━━━━━━━━━━━━━━━━━━</code>

🔵 ${myGuild.guild.name} (⚡${myPower})
⚔️ VS
🔴 ${targetGuild.name} (⚡${enemyPower})

${emoji} <b>HASIL: ${result}</b>

${won ? `💰 +50 Guild Power!` : `💔 Better luck next time!`}
`;

        bot.sendMessage(chatId, text, { parse_mode: 'HTML' });
    });

    // ═══════════════════════════════════════════════════════════════════════════════
    // /guildrank - Guild ranking
    // ═══════════════════════════════════════════════════════════════════════════════
    bot.onText(/^\/guildrank$/i, async (msg) => {
        const chatId = msg.chat.id;
        const guilds = getGuilds();

        const ranked = Object.entries(guilds)
            .sort((a, b) => (b[1].power || 0) - (a[1].power || 0));

        if (ranked.length === 0) {
            return bot.sendMessage(chatId, '📋 Belum ada guild.');
        }

        let text = `🏆 <b>GUILD RANKING</b>\n<code>━━━━━━━━━━━━━━━━━━━━━━</code>\n\n`;

        ranked.slice(0, 10).forEach(([id, g], i) => {
            const medal = ['🥇', '🥈', '🥉'][i] || `${i + 1}.`;
            text += `${medal} <b>${g.name}</b>\n`;
            text += `   ⚡ Power: ${g.power || 0} | 🏆 ${g.wins || 0}W/${g.losses || 0}L\n\n`;
        });

        bot.sendMessage(chatId, text, { parse_mode: 'HTML' });
    });

    // ═══════════════════════════════════════════════════════════════════════════════
    // CALLBACK HANDLERS
    // ═══════════════════════════════════════════════════════════════════════════════
    bot.on('callback_query', async (query) => {
        const data = query.data;
        const chatId = query.message.chat.id;
        const userId = query.from.id.toString();

        if (!data.startsWith('guild_')) return;

        bot.answerCallbackQuery(query.id);

        const myGuild = getPlayerGuild(userId);
        if (!myGuild && data !== 'guild_list') {
            return bot.sendMessage(chatId, '❌ Kamu tidak punya guild!');
        }

        const action = data.replace('guild_', '');

        if (action === 'members') {
            const { guild } = myGuild;
            let text = `👥 <b>${guild.name} MEMBERS</b> (${guild.members.length})\n\n`;
            guild.members.forEach((id, i) => {
                text += `${i + 1}. ${id === guild.leader ? '👑' : '⚔️'} ${id}\n`;
            });
            bot.sendMessage(chatId, text, { parse_mode: 'HTML' });
        }

        if (action === 'stats') {
            const { guild } = myGuild;
            const text = `📊 <b>${guild.name} STATS</b>\n\n⚡ Power: ${guild.power || 0}\n🏆 Wins: ${guild.wins || 0}\n💔 Losses: ${guild.losses || 0}\n👥 Members: ${guild.members.length}/${guild.maxMembers}`;
            bot.sendMessage(chatId, text, { parse_mode: 'HTML' });
        }

        if (action === 'battle') {
            bot.sendMessage(chatId, '⚔️ Gunakan /guildbattle <guild_id> untuk battle!\n\nLihat /guildlist untuk target.');
        }

        if (action === 'rank') {
            // Trigger /guildrank
            bot.sendMessage(chatId, 'Gunakan /guildrank untuk lihat ranking.');
        }
    });

};
