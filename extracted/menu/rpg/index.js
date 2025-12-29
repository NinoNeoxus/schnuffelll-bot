/**
 * ═══════════════════════════════════════════════════════════════════════════════════════
 *  🌆 SCHNUFFELLL CYBERPUNK SURVIVAL RPG v3.0
 *  Theme: Neo-Jakarta 2077 - A Dystopian Indonesian Cyberpunk World
 *  Developer: @schnuffelll
 *  
 *  Features:
 *  - Cyberpunk Classes & Skills
 *  - Survival Mechanics (Hunger, Thirst, Stamina, Sanity, Humanity)
 *  - Cybernetic Augmentations
 *  - Futuristic Locations & Monsters
 *  - Housing System
 *  - Gacha System
 *  - Crafting System
 *  - Guild & PvP System
 *  - Achievement System
 * ═══════════════════════════════════════════════════════════════════════════════════════
 */

const fs = require('fs');
const path = require('path');

// Import modules
const {
    CLASSES, LOCATIONS, MONSTERS, AUGMENTATIONS, ITEMS,
    SKILLS, HOUSING, GACHA_POOLS, GACHA_ITEMS, ACHIEVEMENTS,
    QUESTS, RECIPES, TITLES, DAILY_REWARDS, RANDOM_EVENTS
} = require('./data');

const {
    getSurvivalStatus, getSurvivalEffects, getSurvivalBars,
    updateSurvivalOverTime, applyAdventureDrain, consumeForSurvival,
    restAtHome, reduceHumanity, restoreHumanity,
    triggerRandomSurvivalEvent, getSurvivalDisplayText, SURVIVAL
} = require('./survival');

const {
    calculateDamage, useSkill, simulateBattle,
    getCombatStats, getSkillListText
} = require('./combat');

// ═══════════════════════════════════════════════════════════════════════════════════════
// DATABASE PATHS
// ═══════════════════════════════════════════════════════════════════════════════════════
const RPG_DB = './db/rpg/players.json';
const INVENTORY_DB = './db/rpg/inventory.json';
const COOLDOWN_DB = './db/rpg/cooldowns.json';
const GUILD_DB = './db/rpg/guilds.json';

// ═══════════════════════════════════════════════════════════════════════════════════════
// DATABASE FUNCTIONS
// ═══════════════════════════════════════════════════════════════════════════════════════
function ensureDBFiles() {
    const dir = './db/rpg';
    if (!fs.existsSync(dir)) fs.mkdirSync(dir, { recursive: true });
    if (!fs.existsSync(RPG_DB)) fs.writeFileSync(RPG_DB, '{}');
    if (!fs.existsSync(INVENTORY_DB)) fs.writeFileSync(INVENTORY_DB, '{}');
    if (!fs.existsSync(COOLDOWN_DB)) fs.writeFileSync(COOLDOWN_DB, '{}');
    if (!fs.existsSync(GUILD_DB)) fs.writeFileSync(GUILD_DB, '{}');
}

function loadDB(file) {
    try {
        if (fs.existsSync(file)) return JSON.parse(fs.readFileSync(file, 'utf8'));
    } catch (e) { console.error('DB Load Error:', e); }
    return {};
}

function saveDB(file, data) {
    fs.writeFileSync(file, JSON.stringify(data, null, 2));
}

function getPlayer(userId) {
    const db = loadDB(RPG_DB);
    return db[userId] || null;
}

function savePlayer(userId, data) {
    const db = loadDB(RPG_DB);
    db[userId] = data;
    saveDB(RPG_DB, db);
}

function getInventory(userId) {
    const db = loadDB(INVENTORY_DB);
    return db[userId] || {};
}

function saveInventory(userId, inv) {
    const db = loadDB(INVENTORY_DB);
    db[userId] = inv;
    saveDB(INVENTORY_DB, db);
}

function getCooldown(userId, action) {
    const db = loadDB(COOLDOWN_DB);
    return db[`${userId}_${action}`] || 0;
}

function setCooldown(userId, action, seconds) {
    const db = loadDB(COOLDOWN_DB);
    db[`${userId}_${action}`] = Date.now() + (seconds * 1000);
    saveDB(COOLDOWN_DB, db);
}

function isOnCooldown(userId, action) {
    return Date.now() < getCooldown(userId, action);
}

function getRemainingCooldown(userId, action) {
    const cd = getCooldown(userId, action);
    const remaining = cd - Date.now();
    if (remaining <= 0) return null;
    const mins = Math.floor(remaining / 60000);
    const secs = Math.floor((remaining % 60000) / 1000);
    return mins > 0 ? `${mins}m ${secs}s` : `${secs}s`;
}

// ═══════════════════════════════════════════════════════════════════════════════════════
// GAME LOGIC FUNCTIONS
// ═══════════════════════════════════════════════════════════════════════════════════════

function createCharacter(userId, name, className) {
    const classData = CLASSES[className];
    if (!classData) return null;

    const player = {
        name: name,
        class: className,
        level: 1,
        xp: 0,
        xpNeeded: 100,
        gold: 500,
        diamonds: 0,
        hp: classData.hp,
        maxHp: classData.hp,
        mp: classData.mp,
        maxMp: classData.mp,
        atk: classData.atk,
        def: classData.def,
        spd: classData.spd,
        luck: classData.luck,
        equipped: { weapon: null, armor: null, accessory: null },
        augments: {},
        housing: 'street_corner',
        guild: null,
        title: 'newbie',
        survival: {
            hunger: SURVIVAL.max.hunger,
            thirst: SURVIVAL.max.thirst,
            stamina: SURVIVAL.max.stamina,
            sanity: SURVIVAL.max.sanity,
            humanity: SURVIVAL.max.humanity,
            lastUpdate: Date.now()
        },
        stats: {
            kills: 0, deaths: 0, bosses: 0, adventures: 0,
            hacks: 0, crafts: 0, goldEarned: 0, goldSpent: 0
        },
        questProgress: {},
        claimedQuests: [],
        claimedAchievements: [],
        titles: ['newbie'],
        locationsVisited: [],
        dailyStreak: 0,
        lastDaily: 0,
        lastGacha: 0,
        createdAt: Date.now()
    };

    savePlayer(userId, player);
    saveInventory(userId, {
        cheap_stimpack: 5,
        protein_bar: 3,
        purified_water: 3,
        rusty_knife: 1
    });
    return player;
}

function getXpForLevel(level) {
    return Math.floor(100 * Math.pow(1.3, level - 1));
}

function checkLevelUp(player) {
    let leveledUp = false;
    while (player.xp >= player.xpNeeded) {
        player.xp -= player.xpNeeded;
        player.level++;
        player.xpNeeded = getXpForLevel(player.level);

        // Stat increases based on class
        const classData = CLASSES[player.class];
        player.maxHp += Math.floor(classData.hp * 0.08);
        player.maxMp += Math.floor(classData.mp * 0.08);
        player.atk += Math.floor(classData.atk * 0.04);
        player.def += Math.floor(classData.def * 0.04);
        player.spd += 1;
        player.luck += 1;
        player.hp = player.maxHp;
        player.mp = player.maxMp;

        leveledUp = true;
    }
    return leveledUp;
}

function getTotalStats(player) {
    let stats = getCombatStats(player);

    // Apply survival effects
    const { effects } = getSurvivalEffects(player);
    stats.atk = Math.max(1, Math.floor(stats.atk * (1 + effects.atk / 100)));
    stats.def = Math.max(1, Math.floor(stats.def * (1 + effects.def / 100)));
    stats.spd = Math.max(1, Math.floor(stats.spd * (1 + effects.spd / 100)));
    stats.luck = Math.max(0, stats.luck + effects.luck);
    stats.mp = Math.max(0, stats.mp + effects.mp);

    return stats;
}

// ═══════════════════════════════════════════════════════════════════════════════════════
// GACHA SYSTEM
// ═══════════════════════════════════════════════════════════════════════════════════════

function pullGacha(player, poolName = 'standard') {
    const pool = GACHA_POOLS[poolName];
    if (!pool) return { success: false, message: 'Banner tidak ditemukan!' };

    // Check currency
    if (pool.currency === 'gold' && player.gold < pool.price) {
        return { success: false, message: `Gold tidak cukup! Butuh ${pool.price}` };
    }
    if (pool.currency === 'diamond' && player.diamonds < pool.price) {
        return { success: false, message: `Diamond tidak cukup! Butuh ${pool.price}` };
    }

    // Deduct currency
    if (pool.currency === 'gold') player.gold -= pool.price;
    else player.diamonds -= pool.price;

    // Roll rarity
    const roll = Math.random() * 100;
    let cumulative = 0;
    let rarity = 'common';

    for (const [r, chance] of Object.entries(pool.rates)) {
        cumulative += chance;
        if (roll <= cumulative) {
            rarity = r;
            break;
        }
    }

    // Get random item from rarity pool
    const itemPool = GACHA_ITEMS[rarity];
    const itemId = itemPool[Math.floor(Math.random() * itemPool.length)];
    const item = ITEMS[itemId] || AUGMENTATIONS[itemId];

    return {
        success: true,
        rarity,
        itemId,
        item,
        pool: poolName
    };
}

// ═══════════════════════════════════════════════════════════════════════════════════════
// MAIN MODULE EXPORT
// ═══════════════════════════════════════════════════════════════════════════════════════

module.exports = (bot) => {
    ensureDBFiles();

    // ═══════════════════════════════════════════════════════════════════════════════════
    // 📝 CHARACTER REGISTRATION
    // ═══════════════════════════════════════════════════════════════════════════════════

    bot.onText(/^\.daftar$/i, (msg) => {
        const chatId = msg.chat.id;
        const userId = msg.from.id;

        if (getPlayer(userId)) {
            return bot.sendMessage(chatId, '❌ Kamu sudah punya karakter! Ketik `.profile` untuk melihat.', { parse_mode: 'Markdown' });
        }

        const classEmojis = Object.entries(CLASSES).map(([id, c]) => `${c.emoji} <b>${c.name}</b>\n   └ ${c.desc}\n   └ <i>${c.story.substring(0, 80)}...</i>`).join('\n\n');

        const text = `
╔══════════════════════════════════════════════════════╗
║  🌆 <b>WELCOME TO NEO-JAKARTA 2077</b>  ║
╚══════════════════════════════════════════════════════╝

<i>The year is 2077. Mega-corporations rule the city.
The streets belong to the brave... or the desperate.</i>

Choose your path, survivor:

${classEmojis}

<b>📝 Cara Daftar:</b>
<code>.daftar [nama] [class]</code>

<b>Contoh:</b>
<code>.daftar V netrunner</code>

<b>Available Classes:</b>
netrunner, solo, techie, medtech, nomad, corpo, fixer, streetkid
`;
        bot.sendMessage(chatId, text, { parse_mode: 'HTML' });
    });

    bot.onText(/^\.daftar (.+) (netrunner|solo|techie|medtech|nomad|corpo|fixer|streetkid)$/i, (msg, match) => {
        const chatId = msg.chat.id;
        const userId = msg.from.id;
        const name = match[1].substring(0, 20);
        const className = match[2].toLowerCase();

        if (getPlayer(userId)) {
            return bot.sendMessage(chatId, '❌ Kamu sudah punya karakter!');
        }

        const player = createCharacter(userId, name, className);
        const classData = CLASSES[className];

        const text = `
╔══════════════════════════════════════════════════════╗
║  ${classData.emoji} <b>CHARACTER CREATED!</b> ${classData.emoji}  ║
╚══════════════════════════════════════════════════════╝

<i>"Welcome to Night City, ${name}. 
The city of dreams... and nightmares."</i>

┌─「 📊 <b>INITIAL STATS</b> 」
│ 🏷️ Name: <b>${name}</b>
│ ${classData.emoji} Class: ${classData.name}
│ 📈 Level: 1
│ ❤️ HP: ${player.hp}/${player.maxHp}
│ 💙 MP: ${player.mp}/${player.maxMp}
│ ⚔️ ATK: ${player.atk} | 🛡️ DEF: ${player.def}
│ 💨 SPD: ${player.spd} | 🍀 LUCK: ${player.luck}
│ 💰 €$: ${player.gold}
└───────────────────────

┌─「 🎁 <b>STARTER KIT</b> 」
│ 💉 Cheap Stimpack x5
│ 🍫 Protein Bar x3
│ 💧 Purified Water x3
│ 🔪 Rusty Knife x1
└───────────────────────

<b>📌 Essential Commands:</b>
• <code>.profile</code> - Check your stats
• <code>.survival</code> - Check survival status
• <code>.adventure</code> - Go on missions
• <code>.inventory</code> - Check your stash
• <code>.shop</code> - Visit the market
• <code>.rpghelp</code> - Full command list

<i>💀 Survival tip: Keep your Hunger, Thirst, and Sanity high!
Low stats = debuffs and HP drain.</i>
`;
        bot.sendMessage(chatId, text, { parse_mode: 'HTML' });
    });

    // ═══════════════════════════════════════════════════════════════════════════════════
    // 👤 PROFILE
    // ═══════════════════════════════════════════════════════════════════════════════════

    bot.onText(/^\.(profile|profil|stats|p)$/i, (msg) => {
        const chatId = msg.chat.id;
        const userId = msg.from.id;
        let player = getPlayer(userId);

        if (!player) {
            return bot.sendMessage(chatId, '❌ Belum punya karakter! Ketik `.daftar`', { parse_mode: 'Markdown' });
        }

        // Update survival over time
        player = updateSurvivalOverTime(player);
        savePlayer(userId, player);

        const classData = CLASSES[player.class];
        const totalStats = getTotalStats(player);
        const title = TITLES[player.title] || TITLES.newbie;
        const survivalBars = getSurvivalBars(player);

        const xpBar = '█'.repeat(Math.floor((player.xp / player.xpNeeded) * 10)) + '░'.repeat(10 - Math.floor((player.xp / player.xpNeeded) * 10));
        const hpBar = '❤️'.repeat(Math.max(0, Math.floor((player.hp / totalStats.maxHp) * 5))) + '🖤'.repeat(Math.max(0, 5 - Math.floor((player.hp / totalStats.maxHp) * 5)));

        const text = `
╔══════════════════════════════════════════════════════╗
║  🌆 <b>NEO-JAKARTA CITIZEN FILE</b>  ║
╚══════════════════════════════════════════════════════╝

┌─「 🏷️ <b>IDENTITY</b> 」
│ 📛 Name: <b>${player.name}</b>
│ ${classData.emoji} Class: ${classData.name}
│ 🎖️ Title: ${title.name}
│ 📈 Level: <b>${player.level}</b>
│ ✨ XP: ${player.xp}/${player.xpNeeded}
│ [${xpBar}]
└───────────────────────

┌─「 ❤️ <b>COMBAT STATUS</b> 」
│ ${hpBar}
│ ❤️ HP: ${player.hp}/${totalStats.maxHp}
│ 💙 MP: ${player.mp}/${totalStats.maxMp}
│ ⚔️ ATK: ${totalStats.atk} | 🛡️ DEF: ${totalStats.def}
│ 💨 SPD: ${totalStats.spd} | 🍀 LUCK: ${totalStats.luck}
└───────────────────────

┌─「 🌡️ <b>SURVIVAL</b> 」
│ 🍖 [${survivalBars.hunger.bar}] ${survivalBars.hunger.emoji}
│ 💧 [${survivalBars.thirst.bar}] ${survivalBars.thirst.emoji}
│ ⚡ [${survivalBars.stamina.bar}] ${survivalBars.stamina.emoji}
│ 🧠 [${survivalBars.sanity.bar}] ${survivalBars.sanity.emoji}
│ 🦾 [${survivalBars.humanity.bar}] ${survivalBars.humanity.emoji}
└───────────────────────

┌─「 💰 <b>WEALTH</b> 」
│ 💵 Eurodollars: €$${player.gold.toLocaleString()}
│ 💎 Diamonds: ${player.diamonds}
│ 🏠 Housing: ${HOUSING[player.housing]?.name || 'Street'}
└───────────────────────

┌─「 📊 <b>STATISTICS</b> 」
│ 🗺️ Adventures: ${player.stats.adventures}
│ 💀 Kills: ${player.stats.kills}
│ 👑 Boss Kills: ${player.stats.bosses}
│ ☠️ Deaths: ${player.stats.deaths}
└───────────────────────
`;
        bot.sendMessage(chatId, text, { parse_mode: 'HTML' });
    });

    // ═══════════════════════════════════════════════════════════════════════════════════
    // 🌡️ SURVIVAL STATUS
    // ═══════════════════════════════════════════════════════════════════════════════════

    bot.onText(/^\.(survival|survive|status)$/i, (msg) => {
        const chatId = msg.chat.id;
        const userId = msg.from.id;
        let player = getPlayer(userId);

        if (!player) return bot.sendMessage(chatId, '❌ Belum punya karakter!');

        player = updateSurvivalOverTime(player);
        savePlayer(userId, player);

        const survivalText = getSurvivalDisplayText(player);

        const text = `
╔══════════════════════════════════════════════════════╗
║  🌡️ <b>SURVIVAL MONITOR</b>  ║
╚══════════════════════════════════════════════════════╝

${survivalText}

<b>📌 Survival Tips:</b>
• 🍖 <code>.eat [item]</code> - Makan untuk hunger
• 💧 <code>.drink [item]</code> - Minum untuk thirst
• 💤 <code>.rest [jam]</code> - Istirahat di rumah
• 💊 <code>.use [item]</code> - Pakai item

<b>Item Commands:</b>
• <code>.eat protein_bar</code> - Makan protein bar
• <code>.drink purified_water</code> - Minum air
• <code>.use stimpack</code> - Pakai stimpack
`;
        bot.sendMessage(chatId, text, { parse_mode: 'HTML' });
    });

    // ═══════════════════════════════════════════════════════════════════════════════════
    // ⚔️ ADVENTURE
    // ═══════════════════════════════════════════════════════════════════════════════════

    bot.onText(/^\.(adventure|adv|petualangan)$/i, (msg) => {
        const chatId = msg.chat.id;
        const userId = msg.from.id;
        let player = getPlayer(userId);

        if (!player) return bot.sendMessage(chatId, '❌ Belum punya karakter!');

        player = updateSurvivalOverTime(player);
        savePlayer(userId, player);

        const remaining = getRemainingCooldown(userId, 'adventure');
        if (remaining) {
            return bot.sendMessage(chatId, `⏳ Cooldown! Tunggu <b>${remaining}</b>`, { parse_mode: 'HTML' });
        }

        const locationList = Object.entries(LOCATIONS).map(([id, loc]) => {
            const canEnter = player.level >= loc.minLv;
            const visited = player.locationsVisited?.includes(id) ? '✓' : '';
            return `${canEnter ? '🔓' : '🔒'} ${loc.emoji} <b>${loc.name}</b> ${visited}
   └ Min Level: ${loc.minLv} ${canEnter ? '✅' : '❌'}
   └ <i>${loc.desc.substring(0, 50)}...</i>`;
        }).join('\n\n');

        const text = `
╔══════════════════════════════════════════════════════╗
║  🗺️ <b>NEO-JAKARTA DISTRICTS</b>  ║
╚══════════════════════════════════════════════════════╝

<i>Choose your destination wisely, merc.
Some places... you don't come back from.</i>

${locationList}

<b>📝 Command:</b>
<code>.adv [lokasi]</code>

<b>Example:</b>
<code>.adv gang_alley</code>
<code>.adv corpo_district</code>
`;
        bot.sendMessage(chatId, text, { parse_mode: 'HTML' });
    });

    bot.onText(/^\.(adventure|adv) ([a-z_]+)$/i, async (msg, match) => {
        const chatId = msg.chat.id;
        const userId = msg.from.id;
        const locationId = match[2].toLowerCase();
        let player = getPlayer(userId);

        if (!player) return bot.sendMessage(chatId, '❌ Belum punya karakter!');

        const remaining = getRemainingCooldown(userId, 'adventure');
        if (remaining) return bot.sendMessage(chatId, `⏳ Tunggu <b>${remaining}</b>!`, { parse_mode: 'HTML' });

        player = updateSurvivalOverTime(player);

        // Check survival status
        const { warnings } = getSurvivalEffects(player);
        if (player.survival.stamina <= 10) {
            return bot.sendMessage(chatId, '😴 Stamina terlalu rendah! Istirahat dulu dengan `.rest`', { parse_mode: 'Markdown' });
        }

        if (player.hp <= 0) {
            return bot.sendMessage(chatId, '💀 HP habis! Pakai `.use stimpack` atau `.rest`', { parse_mode: 'Markdown' });
        }

        const location = LOCATIONS[locationId];
        if (!location) {
            return bot.sendMessage(chatId, '❌ Lokasi tidak ditemukan! Ketik `.adv` untuk list.');
        }

        if (player.level < location.minLv) {
            return bot.sendMessage(chatId, `❌ Level kurang! Butuh Lv.${location.minLv}, kamu Lv.${player.level}`);
        }

        // Set cooldown
        setCooldown(userId, 'adventure', 45);

        // Loading message
        const loadMsg = await bot.sendMessage(chatId, `⚡ Entering ${location.name}...`);
        await new Promise(r => setTimeout(r, 1500));

        // Apply survival drain
        player = applyAdventureDrain(player, locationId);

        // Random encounter
        const isBoss = Math.random() < 0.12;
        const monsterPool = isBoss ? [location.boss] : location.monsters;
        const monsterId = monsterPool[Math.floor(Math.random() * monsterPool.length)];

        // Get total stats with effects
        const totalStats = getTotalStats(player);

        // Battle!
        const battleResult = simulateBattle(player, monsterId, totalStats);

        if (!battleResult.success) {
            return bot.sendMessage(chatId, battleResult.message);
        }

        // Track location visit
        if (!player.locationsVisited) player.locationsVisited = [];
        if (!player.locationsVisited.includes(locationId)) {
            player.locationsVisited.push(locationId);
        }

        let resultText = '';

        if (battleResult.victory) {
            // Apply rewards
            player.xp += battleResult.rewards.xp;
            player.gold += battleResult.rewards.gold;
            player.stats.kills++;
            player.stats.adventures++;
            player.stats.goldEarned += battleResult.rewards.gold;
            if (battleResult.monsterTemplate.isBoss) player.stats.bosses++;

            // Add drops to inventory
            const inv = getInventory(userId);
            for (const drop of battleResult.rewards.drops) {
                inv[drop] = (inv[drop] || 0) + 1;
            }
            saveInventory(userId, inv);

            // Update quest progress
            player.questProgress = player.questProgress || {};
            player.questProgress.kills = (player.questProgress.kills || 0) + 1;
            player.questProgress.adventures = (player.questProgress.adventures || 0) + 1;
            if (battleResult.monsterTemplate.isBoss) {
                player.questProgress.bosses = (player.questProgress.bosses || 0) + 1;
            }

            // Check level up
            const leveledUp = checkLevelUp(player);
            player.hp = battleResult.playerHpRemaining;

            // Random event
            const randomEvent = triggerRandomSurvivalEvent(player);

            resultText = `
╔══════════════════════════════════════════════════════╗
║  🏆 <b>MISSION COMPLETE!</b>  ║
╚══════════════════════════════════════════════════════╝

${battleResult.monsterTemplate.isBoss ? '👑 <b>BOSS DEFEATED!</b>\n' : ''}
📍 Location: ${location.name}
👹 Target: ${battleResult.monsterTemplate.name}

<b>📜 Combat Log:</b>
${battleResult.battleLog.join('\n')}

┌─「 🎁 <b>REWARDS</b> 」
│ ✨ XP: +${battleResult.rewards.xp}
│ 💵 €$: +${battleResult.rewards.gold}
${battleResult.rewards.drops.length > 0 ? `│ 📦 Loot: ${battleResult.rewards.drops.map(d => ITEMS[d]?.name || d).join(', ')}` : ''}
└───────────────────────

❤️ HP: ${player.hp}/${totalStats.maxHp}
${leveledUp ? `\n🎉 <b>LEVEL UP!</b> Now Level ${player.level}!` : ''}
${randomEvent.triggered ? `\n⚠️ <b>${randomEvent.name}</b>: ${randomEvent.result}` : ''}
`;
        } else {
            // Defeat
            player.hp = 1;
            player.stats.deaths++;
            player.survival.sanity = Math.max(0, player.survival.sanity - 10);

            resultText = `
╔══════════════════════════════════════════════════════╗
║  💀 <b>FLATLINED!</b>  ║
╚══════════════════════════════════════════════════════╝

📍 Location: ${location.name}
👹 Enemy: ${battleResult.monsterTemplate.name}

<b>📜 Combat Log:</b>
${battleResult.battleLog.join('\n')}

☠️ <i>You got flatlined, choom.
Enemy HP remaining: ${battleResult.monster.hp}</i>

⚠️ Sanity -10 from trauma
❤️ HP: 1/${totalStats.maxHp}

<i>💡 Use <code>.rest</code> or <code>.use stimpack</code> to recover</i>
`;
        }

        savePlayer(userId, player);

        try {
            await bot.editMessageText(resultText, {
                chat_id: chatId,
                message_id: loadMsg.message_id,
                parse_mode: 'HTML'
            });
        } catch (e) {
            bot.sendMessage(chatId, resultText, { parse_mode: 'HTML' });
        }
    });

    // ═══════════════════════════════════════════════════════════════════════════════════
    // 🏰 DUNGEON (HARD MODE)
    // ═══════════════════════════════════════════════════════════════════════════════════

    bot.onText(/^\.(dungeon|dg)$/i, async (msg) => {
        const chatId = msg.chat.id;
        const userId = msg.from.id;
        let player = getPlayer(userId);

        if (!player) return bot.sendMessage(chatId, '❌ Belum punya karakter!');

        const remaining = getRemainingCooldown(userId, 'dungeon');
        if (remaining) return bot.sendMessage(chatId, `⏳ Dungeon Cooldown! Tunggu <b>${remaining}</b>`, { parse_mode: 'HTML' });

        player = updateSurvivalOverTime(player);

        if (player.level < 5) {
            return bot.sendMessage(chatId, '❌ Level terlalu rendah! Minimal Lv.5 untuk masuk Dungeon.');
        }

        if (player.survival.stamina <= 30) {
            return bot.sendMessage(chatId, '😴 Stamina butuh minimal 30! Istirahat dulu.', { parse_mode: 'Markdown' });
        }

        if (player.hp <= player.maxHp * 0.5) {
            return bot.sendMessage(chatId, '💀 HP harus diatas 50%! Bahaya cuy.', { parse_mode: 'Markdown' });
        }

        // Set cooldown (10 menit)
        setCooldown(userId, 'dungeon', 600);

        // Loading
        const loadMsg = await bot.sendMessage(chatId, `☠️ <b>ENTERING DARK DATA DUNGEON...</b>\nPrepare yourself!`, { parse_mode: 'HTML' });
        await new Promise(r => setTimeout(r, 2000));

        // Drain stamina
        player.survival.stamina -= 30;
        player.survival.hunger -= 15;
        player.survival.thirst -= 15;

        // Random boss from any location
        const allBosses = [];
        Object.values(LOCATIONS).forEach(loc => {
            if (loc.boss) allBosses.push(loc.boss);
        });
        const bossId = allBosses[Math.floor(Math.random() * allBosses.length)];
        const bossTemplate = MONSTERS[bossId];

        // BUFF BOSS FOR DUNGEON MODE
        const dungeonBoss = { ...bossTemplate };
        dungeonBoss.name = `[CORRUPTED] ${dungeonBoss.name}`;
        dungeonBoss.hp = Math.floor(dungeonBoss.hp * 2);
        dungeonBoss.atk = Math.floor(dungeonBoss.atk * 1.5);
        dungeonBoss.def = Math.floor(dungeonBoss.def * 1.5);
        dungeonBoss.xp = Math.floor(dungeonBoss.xp * 3);
        dungeonBoss.gold = Math.floor(dungeonBoss.gold * 3);

        // Battle
        const totalStats = getTotalStats(player);

        // Custom simple battle simulation for dungeon because we modified the monster manualy
        // We override the MONSTERS lookups in simulateBattle by passing the object directly? 
        // simulateBattle takes monsterID. We need to temporarilly modify MONSTERS or just handle result manually.
        // Easier: Just temporarily add a "dungeon_boss" to MONSTERS

        const tempId = `dungeon_${userId}_${Date.now()}`;
        MONSTERS[tempId] = dungeonBoss;

        const battleResult = simulateBattle(player, tempId, totalStats);

        // Cleanup temp monster
        delete MONSTERS[tempId];

        if (!battleResult.success) return bot.sendMessage(chatId, 'Error dungeon battle.');

        let resultText = '';

        if (battleResult.victory) {
            // Bonus rewards
            player.xp += battleResult.rewards.xp;
            player.gold += battleResult.rewards.gold;
            player.diamonds += 1; // Bonus diamond
            player.stats.bosses++;

            // Drop logic included in simulateBattle
            const inv = getInventory(userId);
            if (battleResult.rewards.drops) {
                for (const drop of battleResult.rewards.drops) {
                    inv[drop] = (inv[drop] || 0) + 1;
                }
            }
            saveInventory(userId, inv);

            // Level up check
            const leveledUp = checkLevelUp(player);
            player.hp = battleResult.playerHpRemaining;

            resultText = `
╔══════════════════════════════════════════════════════╗
║  🏰 <b>DUNGEON CLEARED!</b>  ║
╚══════════════════════════════════════════════════════╝

👺 <b>${dungeonBoss.name}</b> DEFEATED!

<b>📜 Combat Log:</b>
${battleResult.battleLog.join('\n')}

┌─「 💎 <b>LEGENDARY REWARDS</b> 」
│ ✨ XP: +${battleResult.rewards.xp}
│ 💵 €$: +${battleResult.rewards.gold}
│ 💎 Diamond: +1
${battleResult.rewards.drops.length > 0 ? `│ 📦 Loot: ${battleResult.rewards.drops.join(', ')}` : ''}
└───────────────────────

❤️ HP Left: ${player.hp}/${totalStats.maxHp}
${leveledUp ? `\n🎉 <b>LEVEL UP!</b> Now Level ${player.level}!` : ''}
`;
        } else {
            player.hp = 1;
            player.stats.deaths++;
            player.survival.sanity = Math.max(0, player.survival.sanity - 20); // More sanity loss
            resultText = `
╔══════════════════════════════════════════════════════╗
║  💀 <b>SLAUGHTERED IN DUNGEON!</b>  ║
╚══════════════════════════════════════════════════════╝

👺 Killer: ${dungeonBoss.name}

<b>📜 Combat Log:</b>
${battleResult.battleLog.join('\n')}

☠️ <i>Your data was corrupted...</i>
⚠️ Sanity -20 (Traumatized)
❤️ HP: 1/${totalStats.maxHp}
`;
        }

        savePlayer(userId, player);

        try {
            await bot.editMessageText(resultText, {
                chat_id: chatId,
                message_id: loadMsg.message_id,
                parse_mode: 'HTML'
            });
        } catch (e) {
            bot.sendMessage(chatId, resultText, { parse_mode: 'HTML' });
        }
    });

    // ═══════════════════════════════════════════════════════════════════════════════════
    // 🎒 INVENTORY
    // ═══════════════════════════════════════════════════════════════════════════════════

    bot.onText(/^\.(inventory|inv|tas|bag)$/i, (msg) => {
        const chatId = msg.chat.id;
        const userId = msg.from.id;
        const player = getPlayer(userId);

        if (!player) return bot.sendMessage(chatId, '❌ Belum punya karakter!');

        const inv = getInventory(userId);
        const items = Object.entries(inv).filter(([_, qty]) => qty > 0);

        // Group items by type
        const consumables = items.filter(([id]) => ITEMS[id]?.type === 'consumable');
        const weapons = items.filter(([id]) => ITEMS[id]?.type === 'weapon');
        const armors = items.filter(([id]) => ITEMS[id]?.type === 'armor');
        const materials = items.filter(([id]) => ITEMS[id]?.type === 'material');
        const others = items.filter(([id]) => !ITEMS[id]);

        const formatItems = (arr) => arr.length > 0
            ? arr.map(([id, qty]) => `${ITEMS[id]?.name || id} x${qty}`).join('\n')
            : '<i>Empty</i>';

        const equipped = [];
        if (player.equipped.weapon) equipped.push(`⚔️ ${ITEMS[player.equipped.weapon]?.name}`);
        if (player.equipped.armor) equipped.push(`🛡️ ${ITEMS[player.equipped.armor]?.name}`);
        if (player.equipped.accessory) equipped.push(`💍 ${ITEMS[player.equipped.accessory]?.name}`);

        const text = `
╔══════════════════════════════════════════════════════╗
║  🎒 <b>INVENTORY</b>  ║
╚══════════════════════════════════════════════════════╝

┌─「 ⚔️ <b>EQUIPPED</b> 」
${equipped.length > 0 ? equipped.join('\n') : '<i>Nothing equipped</i>'}
└───────────────────────

┌─「 💊 <b>CONSUMABLES</b> 」
${formatItems(consumables)}
└───────────────────────

┌─「 ⚔️ <b>WEAPONS</b> 」
${formatItems(weapons)}
└───────────────────────

┌─「 🛡️ <b>ARMOR</b> 」
${formatItems(armors)}
└───────────────────────

┌─「 🔩 <b>MATERIALS</b> 」
${formatItems(materials)}
└───────────────────────

<b>Commands:</b>
• <code>.use [item]</code> - Use consumable
• <code>.equip [item]</code> - Equip gear
• <code>.sell [item] [qty]</code> - Sell items
`;
        bot.sendMessage(chatId, text, { parse_mode: 'HTML' });
    });

    // ═══════════════════════════════════════════════════════════════════════════════════
    // 💊 USE ITEM
    // ═══════════════════════════════════════════════════════════════════════════════════

    bot.onText(/^\.(use|eat|drink|pakai) (.+)$/i, (msg, match) => {
        const chatId = msg.chat.id;
        const userId = msg.from.id;
        const itemName = match[2].toLowerCase().replace(/ /g, '_');
        let player = getPlayer(userId);

        if (!player) return bot.sendMessage(chatId, '❌ Belum punya karakter!');

        const inv = getInventory(userId);
        const itemId = Object.keys(ITEMS).find(id =>
            id.includes(itemName) || ITEMS[id].name.toLowerCase().includes(match[2].toLowerCase())
        );

        if (!itemId || !inv[itemId] || inv[itemId] <= 0) {
            return bot.sendMessage(chatId, '❌ Item tidak ditemukan di inventory!');
        }

        const item = ITEMS[itemId];
        if (item.type !== 'consumable') {
            return bot.sendMessage(chatId, '❌ Item ini tidak bisa dipakai! Gunakan `.equip` untuk equipment.');
        }

        // Apply effects
        const result = consumeForSurvival(player, itemId);

        if (result.success) {
            inv[itemId]--;
            if (inv[itemId] <= 0) delete inv[itemId];
            saveInventory(userId, inv);
            savePlayer(userId, player);
        }

        bot.sendMessage(chatId, `✅ ${result.message}`, { parse_mode: 'HTML' });
    });

    // ═══════════════════════════════════════════════════════════════════════════════════
    // ⚔️ EQUIP
    // ═══════════════════════════════════════════════════════════════════════════════════

    bot.onText(/^\.equip (.+)$/i, (msg, match) => {
        const chatId = msg.chat.id;
        const userId = msg.from.id;
        const itemName = match[1].toLowerCase();
        let player = getPlayer(userId);

        if (!player) return bot.sendMessage(chatId, '❌ Belum punya karakter!');

        const inv = getInventory(userId);
        const itemId = Object.keys(ITEMS).find(id =>
            (id.includes(itemName.replace(/ /g, '_')) || ITEMS[id].name.toLowerCase().includes(itemName)) && inv[id] > 0
        );

        if (!itemId) return bot.sendMessage(chatId, '❌ Item tidak ditemukan!');

        const item = ITEMS[itemId];
        if (!['weapon', 'armor', 'accessory'].includes(item.type)) {
            return bot.sendMessage(chatId, '❌ Item ini bukan equipment!');
        }

        // Unequip old
        const oldItem = player.equipped[item.type];
        if (oldItem) {
            inv[oldItem] = (inv[oldItem] || 0) + 1;
        }

        // Equip new
        player.equipped[item.type] = itemId;
        inv[itemId]--;
        if (inv[itemId] <= 0) delete inv[itemId];

        saveInventory(userId, inv);
        savePlayer(userId, player);

        const statsText = item.stats ? Object.entries(item.stats).map(([s, v]) => `${s.toUpperCase()}+${v}`).join(', ') : 'No bonus';

        bot.sendMessage(chatId, `✅ Equipped <b>${item.name}</b>!\n📊 Bonus: ${statsText}\n${oldItem ? `📤 Unequipped: ${ITEMS[oldItem].name}` : ''}`, { parse_mode: 'HTML' });
    });

    // ═══════════════════════════════════════════════════════════════════════════════════
    // 🏪 SHOP
    // ═══════════════════════════════════════════════════════════════════════════════════

    bot.onText(/^\.(shop|toko|market)$/i, (msg) => {
        const chatId = msg.chat.id;
        const userId = msg.from.id;
        const player = getPlayer(userId);

        if (!player) return bot.sendMessage(chatId, '❌ Belum punya karakter!');

        const consumables = Object.entries(ITEMS)
            .filter(([_, i]) => i.type === 'consumable' && i.price > 0)
            .slice(0, 8)
            .map(([id, i]) => `${i.name} - €$${i.price}`).join('\n');

        const weapons = Object.entries(ITEMS)
            .filter(([_, i]) => i.type === 'weapon' && i.price > 0)
            .slice(0, 6)
            .map(([id, i]) => `${i.name} - €$${i.price}`).join('\n');

        const armors = Object.entries(ITEMS)
            .filter(([_, i]) => i.type === 'armor' && i.price > 0)
            .slice(0, 5)
            .map(([id, i]) => `${i.name} - €$${i.price}`).join('\n');

        const text = `
╔══════════════════════════════════════════════════════╗
║  🏪 <b>BLACK MARKET</b>  ║
╚══════════════════════════════════════════════════════╝

<i>"What do you need, choom? I got everything."</i>

💵 Your €$: <b>${player.gold.toLocaleString()}</b>

┌─「 💊 <b>CONSUMABLES</b> 」
${consumables}
└───────────────────────

┌─「 ⚔️ <b>WEAPONS</b> 」
${weapons}
└───────────────────────

┌─「 🛡️ <b>ARMOR</b> 」
${armors}
└───────────────────────

<b>Commands:</b>
• <code>.buy [item]</code> - Buy item
• <code>.buy [item] [qty]</code> - Buy multiple
• <code>.sell [item] [qty]</code> - Sell items
`;
        bot.sendMessage(chatId, text, { parse_mode: 'HTML' });
    });

    // ═══════════════════════════════════════════════════════════════════════════════════
    // 💰 BUY
    // ═══════════════════════════════════════════════════════════════════════════════════

    bot.onText(/^\.buy (.+?)(?:\s+(\d+))?$/i, (msg, match) => {
        const chatId = msg.chat.id;
        const userId = msg.from.id;
        const itemName = match[1].toLowerCase();
        const qty = parseInt(match[2]) || 1;
        let player = getPlayer(userId);

        if (!player) return bot.sendMessage(chatId, '❌ Belum punya karakter!');

        const itemId = Object.keys(ITEMS).find(id =>
            id.includes(itemName.replace(/ /g, '_')) || ITEMS[id].name.toLowerCase().includes(itemName)
        );

        if (!itemId || !ITEMS[itemId].price) {
            return bot.sendMessage(chatId, '❌ Item tidak ditemukan di shop!');
        }

        const item = ITEMS[itemId];
        const totalPrice = item.price * qty;

        if (player.gold < totalPrice) {
            return bot.sendMessage(chatId, `❌ €$ tidak cukup! Butuh €$${totalPrice}, kamu punya €$${player.gold}`);
        }

        player.gold -= totalPrice;
        player.stats.goldSpent += totalPrice;

        const inv = getInventory(userId);
        inv[itemId] = (inv[itemId] || 0) + qty;

        savePlayer(userId, player);
        saveInventory(userId, inv);

        bot.sendMessage(chatId, `✅ Bought <b>${item.name}</b> x${qty}!\n💵 -€$${totalPrice}\n💰 Balance: €$${player.gold}`, { parse_mode: 'HTML' });
    });

    // ═══════════════════════════════════════════════════════════════════════════════════
    // 💵 SELL
    // ═══════════════════════════════════════════════════════════════════════════════════

    bot.onText(/^\.sell (.+?)(?:\s+(\d+))?$/i, (msg, match) => {
        const chatId = msg.chat.id;
        const userId = msg.from.id;
        const itemName = match[1].toLowerCase();
        const qty = parseInt(match[2]) || 1;
        let player = getPlayer(userId);

        if (!player) return bot.sendMessage(chatId, '❌ Belum punya karakter!');

        const inv = getInventory(userId);
        const itemId = Object.keys(ITEMS).find(id =>
            (id.includes(itemName.replace(/ /g, '_')) || ITEMS[id].name.toLowerCase().includes(itemName)) && inv[id] >= qty
        );

        if (!itemId) {
            return bot.sendMessage(chatId, '❌ Item tidak cukup!');
        }

        const item = ITEMS[itemId];
        const totalPrice = (item.sell || Math.floor(item.price * 0.4) || 10) * qty;

        inv[itemId] -= qty;
        if (inv[itemId] <= 0) delete inv[itemId];
        player.gold += totalPrice;
        player.stats.goldEarned += totalPrice;

        savePlayer(userId, player);
        saveInventory(userId, inv);

        bot.sendMessage(chatId, `✅ Sold <b>${item.name}</b> x${qty}!\n💵 +€$${totalPrice}\n💰 Balance: €$${player.gold}`, { parse_mode: 'HTML' });
    });

    // ═══════════════════════════════════════════════════════════════════════════════════
    // 💤 REST
    // ═══════════════════════════════════════════════════════════════════════════════════

    bot.onText(/^\.(rest|istirahat|tidur)(?:\s+(\d+))?$/i, (msg, match) => {
        const chatId = msg.chat.id;
        const userId = msg.from.id;
        const hours = Math.min(8, parseInt(match[2]) || 1);
        let player = getPlayer(userId);

        if (!player) return bot.sendMessage(chatId, '❌ Belum punya karakter!');

        const remaining = getRemainingCooldown(userId, 'rest');
        if (remaining) return bot.sendMessage(chatId, `⏳ Baru aja istirahat! Tunggu ${remaining}`, { parse_mode: 'HTML' });

        const result = restAtHome(player, hours);

        setCooldown(userId, 'rest', hours * 60); // Cooldown = jam rest * 60 detik
        savePlayer(userId, player);

        const survivalBars = getSurvivalBars(player);

        const text = `
🌙 <b>RESTING...</b>

${result.message}

<b>Current Status:</b>
⚡ Stamina: [${survivalBars.stamina.bar}]
🧠 Sanity: [${survivalBars.sanity.bar}]
❤️ HP: ${player.hp}/${player.maxHp}
`;
        bot.sendMessage(chatId, text, { parse_mode: 'HTML' });
    });

    // ═══════════════════════════════════════════════════════════════════════════════════
    // 🎁 DAILY
    // ═══════════════════════════════════════════════════════════════════════════════════

    bot.onText(/^\.(daily|harian)$/i, (msg) => {
        const chatId = msg.chat.id;
        const userId = msg.from.id;
        let player = getPlayer(userId);

        if (!player) return bot.sendMessage(chatId, '❌ Belum punya karakter!');

        const now = Date.now();
        const lastDaily = player.lastDaily || 0;
        const dayMs = 24 * 60 * 60 * 1000;

        if (now - lastDaily < dayMs) {
            const remaining = dayMs - (now - lastDaily);
            const hours = Math.floor(remaining / (60 * 60 * 1000));
            const mins = Math.floor((remaining % (60 * 60 * 1000)) / (60 * 1000));
            return bot.sendMessage(chatId, `⏳ Daily claimed! Come back in <b>${hours}h ${mins}m</b>`, { parse_mode: 'HTML' });
        }

        // Check streak
        if (now - lastDaily > dayMs * 2) {
            player.dailyStreak = 0;
        }
        player.dailyStreak++;
        if (player.dailyStreak > 7) player.dailyStreak = 1;

        const reward = DAILY_REWARDS[player.dailyStreak - 1];
        player.gold += reward.gold;
        player.lastDaily = now;

        const inv = getInventory(userId);
        reward.items.forEach(itemId => {
            inv[itemId] = (inv[itemId] || 0) + 1;
        });

        savePlayer(userId, player);
        saveInventory(userId, inv);

        const text = `
╔══════════════════════════════════════════════════════╗
║  🎁 <b>DAILY REWARD!</b>  ║
╚══════════════════════════════════════════════════════╝

🔥 Streak: <b>Day ${player.dailyStreak}/7</b>
${'⭐'.repeat(player.dailyStreak)}${'☆'.repeat(7 - player.dailyStreak)}

┌─「 🎁 <b>REWARDS</b> 」
│ 💵 €$: +${reward.gold}
│ 📦 Items: ${reward.items.map(id => ITEMS[id]?.name || id).join(', ')}
└───────────────────────

<i>💡 Login setiap hari untuk bonus lebih besar!</i>
`;
        bot.sendMessage(chatId, text, { parse_mode: 'HTML' });
    });

    // ═══════════════════════════════════════════════════════════════════════════════════
    // 🎰 GACHA
    // ═══════════════════════════════════════════════════════════════════════════════════

    bot.onText(/^\.(gacha|pull|lucky)$/i, (msg) => {
        const chatId = msg.chat.id;
        const userId = msg.from.id;
        const player = getPlayer(userId);

        if (!player) return bot.sendMessage(chatId, '❌ Belum punya karakter!');

        const pools = Object.entries(GACHA_POOLS).map(([id, pool]) => {
            const currency = pool.currency === 'gold' ? '€$' : '💎';
            return `${pool.name}
   └ Cost: ${currency}${pool.price}
   └ <code>.gacha ${id}</code>`;
        }).join('\n\n');

        const text = `
╔══════════════════════════════════════════════════════╗
║  🎰 <b>GACHA SYSTEM</b>  ║
╚══════════════════════════════════════════════════════╝

<i>"Feeling lucky, choom? Try your fate."</i>

💵 Your €$: ${player.gold.toLocaleString()}
💎 Diamonds: ${player.diamonds}

<b>Available Banners:</b>

${pools}

<b>Rarity Rates:</b>
⚪ Common | 🟢 Uncommon | 🔵 Rare
🟣 Epic | 🟡 Legendary | ⭐ Mythic
`;
        bot.sendMessage(chatId, text, { parse_mode: 'HTML' });
    });

    bot.onText(/^\.(gacha|pull) (standard|premium|weapon|cyber)$/i, async (msg, match) => {
        const chatId = msg.chat.id;
        const userId = msg.from.id;
        const poolName = match[2].toLowerCase();
        let player = getPlayer(userId);

        if (!player) return bot.sendMessage(chatId, '❌ Belum punya karakter!');

        const result = pullGacha(player, poolName);

        if (!result.success) {
            return bot.sendMessage(chatId, `❌ ${result.message}`);
        }

        // Add item to inventory
        const inv = getInventory(userId);
        inv[result.itemId] = (inv[result.itemId] || 0) + 1;

        savePlayer(userId, player);
        saveInventory(userId, inv);

        const rarityColors = {
            common: '⚪', uncommon: '🟢', rare: '🔵',
            epic: '🟣', legendary: '🟡', mythic: '⭐'
        };

        const rarityEmoji = rarityColors[result.rarity];
        const isRare = ['epic', 'legendary', 'mythic'].includes(result.rarity);

        const text = `
🎰 <b>GACHA PULL!</b>

${isRare ? '✨✨✨✨✨✨✨✨✨✨\n' : ''}
${rarityEmoji} <b>${result.rarity.toUpperCase()}</b> ${rarityEmoji}

You got: <b>${result.item?.name || result.itemId}</b>
${result.item?.desc ? `<i>${result.item.desc}</i>` : ''}
${isRare ? '\n✨✨✨✨✨✨✨✨✨✨' : ''}

${isRare ? '🎉 CONGRATULATIONS!' : ''}
`;
        bot.sendMessage(chatId, text, { parse_mode: 'HTML' });
    });

    // ═══════════════════════════════════════════════════════════════════════════════════
    // 🏆 LEADERBOARD
    // ═══════════════════════════════════════════════════════════════════════════════════

    bot.onText(/^\.(leaderboard|lb|top|ranking)$/i, (msg) => {
        const chatId = msg.chat.id;
        const db = loadDB(RPG_DB);

        const players = Object.entries(db)
            .map(([id, p]) => ({ id, ...p }))
            .sort((a, b) => b.level - a.level || b.xp - a.xp)
            .slice(0, 10);

        if (players.length === 0) {
            return bot.sendMessage(chatId, '📊 Belum ada pemain!');
        }

        const medals = ['🥇', '🥈', '🥉', '4️⃣', '5️⃣', '6️⃣', '7️⃣', '8️⃣', '9️⃣', '🔟'];

        const leaderboard = players.map((p, i) =>
            `${medals[i]} <b>${p.name}</b>
   └ Lv.${p.level} | ${CLASSES[p.class]?.emoji || '👤'} | 💀${p.stats.kills}`
        ).join('\n\n');

        const text = `
╔══════════════════════════════════════════════════════╗
║  🏆 <b>NEO-JAKARTA LEGENDS</b>  ║
╚══════════════════════════════════════════════════════╝

${leaderboard}

<i>📊 Ranked by Level & XP</i>
`;
        bot.sendMessage(chatId, text, { parse_mode: 'HTML' });
    });

    // ═══════════════════════════════════════════════════════════════════════════════════
    // 📚 HELP
    // ═══════════════════════════════════════════════════════════════════════════════════

    bot.onText(/^\.(rpghelp|rpgmenu|gamehelp|rpg)$/i, (msg) => {
        const text = `
╔══════════════════════════════════════════════════════╗
║  🌆 <b>CYBERPUNK SURVIVAL RPG</b>  ║
║  <i>Neo-Jakarta 2077</i>  ║
╚══════════════════════════════════════════════════════╝

┌─「 👤 <b>CHARACTER</b> 」
│ .daftar - Create character
│ .profile - View stats
│ .survival - Survival status
│ .skills - View skills
└───────────────────────

┌─「 ⚔️ <b>COMBAT</b> 」
│ .adventure - Go on mission
│ .adv [location] - Adventure
│ .skill [num] - Use skill
└───────────────────────

┌─「 🎒 <b>INVENTORY</b> 」
│ .inventory - Check items
│ .use [item] - Use item
│ .equip [item] - Equip gear
└───────────────────────

┌─「 🏪 <b>ECONOMY</b> 」
│ .shop - Black market
│ .buy [item] - Buy item
│ .sell [item] - Sell item
│ .gacha - Lucky draw
└───────────────────────

┌─「 🏠 <b>LIFESTYLE</b> 」
│ .rest [hours] - Rest at home
│ .housing - View housing
│ .daily - Daily reward
└───────────────────────

┌─「 📊 <b>SOCIAL</b> 」
│ .leaderboard - Top players
│ .quest - View quests
│ .achievement - Achievements
└───────────────────────

<i>💀 Survive. Fight. Rise.</i>
<i>© 2077 Schnuffelll Entertainment</i>
`;
        bot.sendMessage(msg.chat.id, text, { parse_mode: 'HTML' });
    });

    // ═══════════════════════════════════════════════════════════════════════════════════
    // ⚔️ SKILLS LIST
    // ═══════════════════════════════════════════════════════════════════════════════════

    bot.onText(/^\.(skills|skill|kemampuan)$/i, (msg) => {
        const chatId = msg.chat.id;
        const userId = msg.from.id;
        const player = getPlayer(userId);

        if (!player) return bot.sendMessage(chatId, '❌ Belum punya karakter!');

        const text = getSkillListText(player);
        bot.sendMessage(chatId, text, { parse_mode: 'HTML' });
    });

    // ═══════════════════════════════════════════════════════════════════════════════════
    // 🏠 HOUSING
    // ═══════════════════════════════════════════════════════════════════════════════════

    bot.onText(/^\.(housing|rumah|home)$/i, (msg) => {
        const chatId = msg.chat.id;
        const userId = msg.from.id;
        const player = getPlayer(userId);

        if (!player) return bot.sendMessage(chatId, '❌ Belum punya karakter!');

        const currentHome = HOUSING[player.housing] || HOUSING.street_corner;

        const housingList = Object.entries(HOUSING).map(([id, h]) => {
            const owned = player.housing === id;
            const canBuy = player.gold >= h.price && !owned;
            return `${owned ? '🏠' : canBuy ? '🔓' : '🔒'} <b>${h.name}</b>
   └ Price: €$${h.price.toLocaleString()}
   └ Storage: ${h.storage} slots
   └ ${owned ? '✅ OWNED' : `<code>.buyhouse ${id}</code>`}`;
        }).join('\n\n');

        const text = `
╔══════════════════════════════════════════════════════╗
║  🏠 <b>HOUSING MARKET</b>  ║
╚══════════════════════════════════════════════════════╝

<b>Current Home:</b> ${currentHome.name}
<i>${currentHome.desc}</i>

💵 Your €$: ${player.gold.toLocaleString()}

<b>Available Properties:</b>

${housingList}
`;
        bot.sendMessage(chatId, text, { parse_mode: 'HTML' });
    });

    bot.onText(/^\.buyhouse (.+)$/i, (msg, match) => {
        const chatId = msg.chat.id;
        const userId = msg.from.id;
        const houseId = match[1].toLowerCase();
        let player = getPlayer(userId);

        if (!player) return bot.sendMessage(chatId, '❌ Belum punya karakter!');

        const house = HOUSING[houseId];
        if (!house) return bot.sendMessage(chatId, '❌ Property tidak ditemukan!');

        if (player.housing === houseId) {
            return bot.sendMessage(chatId, '❌ Kamu sudah tinggal di sini!');
        }

        if (player.gold < house.price) {
            return bot.sendMessage(chatId, `❌ €$ tidak cukup! Butuh €$${house.price.toLocaleString()}`);
        }

        player.gold -= house.price;
        player.housing = houseId;
        savePlayer(userId, player);

        bot.sendMessage(chatId, `
🏠 <b>PROPERTY PURCHASED!</b>

You now live in: <b>${house.name}</b>
<i>${house.desc}</i>

💵 -€$${house.price.toLocaleString()}
💰 Balance: €$${player.gold.toLocaleString()}

<b>Benefits:</b>
• Storage: ${house.storage} slots
• HP Regen: +${house.passive.hpRegen || 0}/rest
• MP Regen: +${house.passive.mpRegen || 0}/rest
`, { parse_mode: 'HTML' });
    });

    // ═══════════════════════════════════════════════════════════════════════════════════
    // 📋 QUEST
    // ═══════════════════════════════════════════════════════════════════════════════════

    bot.onText(/^\.(quest|misi|quests)$/i, (msg) => {
        const chatId = msg.chat.id;
        const userId = msg.from.id;
        const player = getPlayer(userId);

        if (!player) return bot.sendMessage(chatId, '❌ Belum punya karakter!');

        const dailyQuests = QUESTS.daily.map(q => {
            const progress = player.questProgress?.[q.type] || 0;
            const completed = progress >= q.target;
            const claimed = player.claimedQuests?.includes(q.id);
            return `${claimed ? '✅' : completed ? '🟡' : '⬜'} <b>${q.name}</b>
   └ ${q.desc} (${Math.min(progress, q.target)}/${q.target})
   └ 💵 €$${q.reward.gold} | ✨ ${q.reward.xp} XP`;
        }).join('\n\n');

        const weeklyQuests = QUESTS.weekly.map(q => {
            const progress = player.questProgress?.[q.type] || 0;
            const completed = progress >= q.target;
            const claimed = player.claimedQuests?.includes(q.id);
            return `${claimed ? '✅' : completed ? '🟡' : '⬜'} <b>${q.name}</b>
   └ ${q.desc} (${Math.min(progress, q.target)}/${q.target})
   └ 💵 €$${q.reward.gold} | ✨ ${q.reward.xp} XP`;
        }).join('\n\n');

        const text = `
╔══════════════════════════════════════════════════════╗
║  📋 <b>FIXER JOBS</b>  ║
╚══════════════════════════════════════════════════════╝

┌─「 📅 <b>DAILY JOBS</b> 」
${dailyQuests}
└───────────────────────

┌─「 📆 <b>WEEKLY CONTRACTS</b> 」
${weeklyQuests}
└───────────────────────

<b>Command:</b>
<code>.claimquest [id]</code> - Claim reward
`;
        bot.sendMessage(chatId, text, { parse_mode: 'HTML' });
    });

    // ═══════════════════════════════════════════════════════════════════════════════════
    // 🏆 ACHIEVEMENT
    // ═══════════════════════════════════════════════════════════════════════════════════

    bot.onText(/^\.(achievement|achievements|prestasi|ach)$/i, (msg) => {
        const chatId = msg.chat.id;
        const userId = msg.from.id;
        const player = getPlayer(userId);

        if (!player) return bot.sendMessage(chatId, '❌ Belum punya karakter!');

        const achList = Object.entries(ACHIEVEMENTS).map(([id, ach]) => {
            const unlocked = ach.check(player);
            const claimed = player.claimedAchievements?.includes(id);
            return `${claimed ? '✅' : unlocked ? '🟡' : '🔒'} <b>${ach.name}</b>
   └ ${ach.desc}
   └ 💵 €$${ach.reward.gold || 0}${ach.reward.title ? ` | 🎖️ ${ach.reward.title}` : ''}`;
        }).join('\n\n');

        const text = `
╔══════════════════════════════════════════════════════╗
║  🏆 <b>ACHIEVEMENTS</b>  ║
╚══════════════════════════════════════════════════════╝

✅ Claimed | 🟡 Unlocked | 🔒 Locked

${achList}

<b>Command:</b>
<code>.claimach [nama]</code> - Claim reward
`;
        bot.sendMessage(chatId, text, { parse_mode: 'HTML' });
    });

    bot.onText(/^\.claimach (.+)$/i, (msg, match) => {
        const chatId = msg.chat.id;
        const userId = msg.from.id;
        const achName = match[1].toLowerCase();
        let player = getPlayer(userId);

        if (!player) return bot.sendMessage(chatId, '❌ Belum punya karakter!');

        const achId = Object.keys(ACHIEVEMENTS).find(id =>
            id.includes(achName) || ACHIEVEMENTS[id].name.toLowerCase().includes(achName)
        );

        if (!achId) return bot.sendMessage(chatId, '❌ Achievement tidak ditemukan!');

        const ach = ACHIEVEMENTS[achId];
        if (!ach.check(player)) {
            return bot.sendMessage(chatId, '❌ Achievement belum unlocked!');
        }

        if (player.claimedAchievements?.includes(achId)) {
            return bot.sendMessage(chatId, '❌ Achievement sudah diclaim!');
        }

        // Give rewards
        if (ach.reward.gold) player.gold += ach.reward.gold;
        if (ach.reward.xp) {
            player.xp += ach.reward.xp;
            checkLevelUp(player);
        }
        if (ach.reward.title) {
            if (!player.titles) player.titles = [];
            player.titles.push(ach.reward.title);
        }
        if (!player.claimedAchievements) player.claimedAchievements = [];
        player.claimedAchievements.push(achId);

        savePlayer(userId, player);

        bot.sendMessage(chatId, `
🏆 <b>ACHIEVEMENT CLAIMED!</b>

<b>${ach.name}</b>

┌─「 🎁 <b>REWARDS</b> 」
${ach.reward.gold ? `│ 💵 €$: +${ach.reward.gold}` : ''}
${ach.reward.xp ? `│ ✨ XP: +${ach.reward.xp}` : ''}
${ach.reward.title ? `│ 🎖️ Title: ${ach.reward.title}` : ''}
└───────────────────────
`, { parse_mode: 'HTML' });
    });

    console.log('🌆 Cyberpunk Survival RPG v3.0 loaded!');
};

