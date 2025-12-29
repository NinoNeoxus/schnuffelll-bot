/**
 * ═══════════════════════════════════════════════════════════════════════════════════════
 *  🛒 SCHNUFFELLL BOT - RPG SHOP SYSTEM v8.0
 *  Item shop, inventory, trading system
 *  
 *  Commands:
 *  /shop            - Buka shop menu
 *  /buy <item>      - Beli item
 *  /sell <item>     - Jual item
 *  /inventory       - Cek inventory
 *  /use <item>      - Gunakan item
 *  /gift <user>     - Gift item ke user
 *  /trade           - Trade dengan user
 *  /items           - List semua items
 *  /craft           - Crafting system
 *  
 *  @author @schnuffelll
 *  @version 8.0
 * ═══════════════════════════════════════════════════════════════════════════════════════
 */

const fs = require('fs');
const { loadJsonData, saveJsonData } = require('../../lib/function');

module.exports = (bot) => {

    console.log('[SHOP] 🛒 RPG Shop System v8.0 loaded');

    const SHOP_FILE = './db/rpg/shop_items.json';
    const INVENTORY_FILE = './db/rpg/inventories.json';
    const PLAYER_FILE = './db/rpg/players.json';

    // Initialize RPG directory
    if (!fs.existsSync('./db/rpg')) {
        fs.mkdirSync('./db/rpg', { recursive: true });
    }

    // Shop Items Database
    const SHOP_ITEMS = {
        // === TOOLS ===
        'fishing_rod': { name: '🎣 Fishing Rod', price: 500, category: 'tool', effect: 'Unlock fishing', sellPrice: 250 },
        'golden_rod': { name: '✨ Golden Rod', price: 5000, category: 'tool', effect: '+50% rare fish', sellPrice: 2500 },
        'hunting_bow': { name: '🏹 Hunting Bow', price: 800, category: 'tool', effect: 'Unlock hunting', sellPrice: 400 },
        'axe': { name: '🪓 Axe', price: 600, category: 'tool', effect: 'Unlock woodcutting', sellPrice: 300 },
        'pickaxe': { name: '⛏️ Pickaxe', price: 700, category: 'tool', effect: 'Unlock mining', sellPrice: 350 },

        // === CONSUMABLES ===
        'health_potion': { name: '❤️ Health Potion', price: 100, category: 'consumable', effect: '+50 HP', sellPrice: 50 },
        'mana_potion': { name: '💙 Mana Potion', price: 100, category: 'consumable', effect: '+50 MP', sellPrice: 50 },
        'energy_drink': { name: '⚡ Energy Drink', price: 150, category: 'consumable', effect: '+30 Energy', sellPrice: 75 },
        'lucky_charm': { name: '🍀 Lucky Charm', price: 500, category: 'consumable', effect: '+25% luck (1h)', sellPrice: 250 },
        'exp_boost': { name: '📈 EXP Boost', price: 1000, category: 'consumable', effect: '2x EXP (1h)', sellPrice: 500 },

        // === EQUIPMENT ===
        'wooden_sword': { name: '🗡️ Wooden Sword', price: 300, category: 'equipment', effect: '+5 ATK', sellPrice: 150 },
        'iron_sword': { name: '⚔️ Iron Sword', price: 1000, category: 'equipment', effect: '+15 ATK', sellPrice: 500 },
        'leather_armor': { name: '🦺 Leather Armor', price: 500, category: 'equipment', effect: '+10 DEF', sellPrice: 250 },
        'iron_armor': { name: '🛡️ Iron Armor', price: 1500, category: 'equipment', effect: '+25 DEF', sellPrice: 750 },

        // === SPECIAL ===
        'mystery_box': { name: '📦 Mystery Box', price: 2000, category: 'special', effect: 'Random rare item', sellPrice: 1000 },
        'vip_pass': { name: '👑 VIP Pass', price: 10000, category: 'special', effect: 'VIP benefits (7d)', sellPrice: 5000 },
        'pet_egg': { name: '🥚 Pet Egg', price: 5000, category: 'special', effect: 'Random pet', sellPrice: 2500 },
        'treasure_map': { name: '🗺️ Treasure Map', price: 3000, category: 'special', effect: 'Unlock treasure hunt', sellPrice: 1500 }
    };

    // Helper: Get player data
    function getPlayer(userId) {
        const players = loadJsonData(PLAYER_FILE) || {};
        if (!players[userId]) {
            players[userId] = {
                gold: 1000,
                level: 1,
                exp: 0,
                hp: 100,
                maxHp: 100,
                mp: 50,
                maxMp: 50,
                attack: 10,
                defense: 5,
                luck: 0,
                energy: 100,
                maxEnergy: 100
            };
            saveJsonData(PLAYER_FILE, players);
        }
        return players[userId];
    }

    // Helper: Save player data
    function savePlayer(userId, data) {
        const players = loadJsonData(PLAYER_FILE) || {};
        players[userId] = data;
        saveJsonData(PLAYER_FILE, players);
    }

    // Helper: Get inventory
    function getInventory(userId) {
        const inventories = loadJsonData(INVENTORY_FILE) || {};
        if (!inventories[userId]) {
            inventories[userId] = {};
            saveJsonData(INVENTORY_FILE, inventories);
        }
        return inventories[userId];
    }

    // Helper: Save inventory
    function saveInventory(userId, data) {
        const inventories = loadJsonData(INVENTORY_FILE) || {};
        inventories[userId] = data;
        saveJsonData(INVENTORY_FILE, inventories);
    }

    // ═══════════════════════════════════════════════════════════════════════════════
    // /shop - Main shop menu
    // ═══════════════════════════════════════════════════════════════════════════════
    bot.onText(/^\/shop$/i, async (msg) => {
        const chatId = msg.chat.id;
        const userId = msg.from.id.toString();
        const player = getPlayer(userId);

        const text = `
🛒 <b>SCHNUFFELLL SHOP</b>
<code>━━━━━━━━━━━━━━━━━━━━━━</code>

💰 <b>Gold:</b> ${player.gold.toLocaleString()}

📦 <b>CATEGORIES</b>

🔧 <b>TOOLS</b> - Unlock new activities
🧪 <b>CONSUMABLES</b> - Potions & boosts  
⚔️ <b>EQUIPMENT</b> - Weapons & armor
✨ <b>SPECIAL</b> - Rare items

<i>Klik tombol untuk lihat category!</i>
`;

        bot.sendMessage(chatId, text, {
            parse_mode: 'HTML',
            reply_markup: {
                inline_keyboard: [
                    [
                        { text: '🔧 Tools', callback_data: 'shop_cat_tool' },
                        { text: '🧪 Consumables', callback_data: 'shop_cat_consumable' }
                    ],
                    [
                        { text: '⚔️ Equipment', callback_data: 'shop_cat_equipment' },
                        { text: '✨ Special', callback_data: 'shop_cat_special' }
                    ],
                    [
                        { text: '📦 My Inventory', callback_data: 'shop_inventory' }
                    ]
                ]
            }
        });
    });

    // ═══════════════════════════════════════════════════════════════════════════════
    // /buy <item_id> [quantity] - Beli item
    // ═══════════════════════════════════════════════════════════════════════════════
    bot.onText(/^\/buy\s+(\S+)(?:\s+(\d+))?$/i, async (msg, match) => {
        const chatId = msg.chat.id;
        const userId = msg.from.id.toString();
        const itemId = match[1].toLowerCase();
        const quantity = parseInt(match[2]) || 1;

        const item = SHOP_ITEMS[itemId];
        if (!item) {
            return bot.sendMessage(chatId, `❌ Item "${itemId}" tidak ditemukan!\n\nGunakan /shop untuk lihat items.`);
        }

        const player = getPlayer(userId);
        const totalPrice = item.price * quantity;

        if (player.gold < totalPrice) {
            return bot.sendMessage(chatId, `❌ Gold tidak cukup!\n\n💰 Kamu punya: ${player.gold.toLocaleString()}\n💵 Harga: ${totalPrice.toLocaleString()}`);
        }

        // Deduct gold
        player.gold -= totalPrice;
        savePlayer(userId, player);

        // Add to inventory
        const inventory = getInventory(userId);
        inventory[itemId] = (inventory[itemId] || 0) + quantity;
        saveInventory(userId, inventory);

        bot.sendMessage(chatId, `✅ <b>Pembelian Berhasil!</b>\n\n${item.name} x${quantity}\n💵 Total: ${totalPrice.toLocaleString()} gold\n💰 Sisa: ${player.gold.toLocaleString()} gold`, { parse_mode: 'HTML' });
    });

    // ═══════════════════════════════════════════════════════════════════════════════
    // /sell <item_id> [quantity] - Jual item
    // ═══════════════════════════════════════════════════════════════════════════════
    bot.onText(/^\/sell\s+(\S+)(?:\s+(\d+))?$/i, async (msg, match) => {
        const chatId = msg.chat.id;
        const userId = msg.from.id.toString();
        const itemId = match[1].toLowerCase();
        const quantity = parseInt(match[2]) || 1;

        const item = SHOP_ITEMS[itemId];
        if (!item) {
            return bot.sendMessage(chatId, `❌ Item "${itemId}" tidak ditemukan!`);
        }

        const inventory = getInventory(userId);
        if (!inventory[itemId] || inventory[itemId] < quantity) {
            return bot.sendMessage(chatId, `❌ Kamu tidak punya ${quantity}x ${item.name}!`);
        }

        // Remove from inventory
        inventory[itemId] -= quantity;
        if (inventory[itemId] <= 0) delete inventory[itemId];
        saveInventory(userId, inventory);

        // Add gold
        const player = getPlayer(userId);
        const totalPrice = item.sellPrice * quantity;
        player.gold += totalPrice;
        savePlayer(userId, player);

        bot.sendMessage(chatId, `✅ <b>Penjualan Berhasil!</b>\n\n${item.name} x${quantity}\n💵 Dapat: ${totalPrice.toLocaleString()} gold\n💰 Total: ${player.gold.toLocaleString()} gold`, { parse_mode: 'HTML' });
    });

    // ═══════════════════════════════════════════════════════════════════════════════
    // /inventory - Cek inventory
    // ═══════════════════════════════════════════════════════════════════════════════
    bot.onText(/^\/inventory$/i, async (msg) => {
        const chatId = msg.chat.id;
        const userId = msg.from.id.toString();
        const inventory = getInventory(userId);
        const player = getPlayer(userId);

        const items = Object.entries(inventory);
        if (items.length === 0) {
            return bot.sendMessage(chatId, `📦 <b>Inventory kosong!</b>\n\n💰 Gold: ${player.gold.toLocaleString()}\n\nGunakan /shop untuk beli items.`, { parse_mode: 'HTML' });
        }

        let text = `📦 <b>INVENTORY</b>\n<code>━━━━━━━━━━━━━━━━━━━━━━</code>\n\n💰 Gold: ${player.gold.toLocaleString()}\n\n`;

        items.forEach(([itemId, qty]) => {
            const item = SHOP_ITEMS[itemId];
            if (item) {
                text += `${item.name} x${qty}\n`;
            }
        });

        text += `\n<i>Gunakan /use &lt;item&gt; atau /sell &lt;item&gt;</i>`;

        bot.sendMessage(chatId, text, { parse_mode: 'HTML' });
    });

    // ═══════════════════════════════════════════════════════════════════════════════
    // /use <item_id> - Gunakan item
    // ═══════════════════════════════════════════════════════════════════════════════
    bot.onText(/^\/use\s+(\S+)$/i, async (msg, match) => {
        const chatId = msg.chat.id;
        const userId = msg.from.id.toString();
        const itemId = match[1].toLowerCase();

        const item = SHOP_ITEMS[itemId];
        if (!item) {
            return bot.sendMessage(chatId, `❌ Item "${itemId}" tidak ditemukan!`);
        }

        if (item.category !== 'consumable') {
            return bot.sendMessage(chatId, `❌ ${item.name} bukan consumable!`);
        }

        const inventory = getInventory(userId);
        if (!inventory[itemId] || inventory[itemId] < 1) {
            return bot.sendMessage(chatId, `❌ Kamu tidak punya ${item.name}!`);
        }

        // Use item
        inventory[itemId] -= 1;
        if (inventory[itemId] <= 0) delete inventory[itemId];
        saveInventory(userId, inventory);

        const player = getPlayer(userId);
        let effectText = '';

        // Apply effects
        switch (itemId) {
            case 'health_potion':
                player.hp = Math.min(player.hp + 50, player.maxHp);
                effectText = `❤️ HP +50 (${player.hp}/${player.maxHp})`;
                break;
            case 'mana_potion':
                player.mp = Math.min(player.mp + 50, player.maxMp);
                effectText = `💙 MP +50 (${player.mp}/${player.maxMp})`;
                break;
            case 'energy_drink':
                player.energy = Math.min(player.energy + 30, player.maxEnergy);
                effectText = `⚡ Energy +30 (${player.energy}/${player.maxEnergy})`;
                break;
            case 'lucky_charm':
                player.luck += 25;
                effectText = `🍀 Luck +25% (1 jam)`;
                break;
            case 'exp_boost':
                effectText = `📈 2x EXP aktif (1 jam)`;
                break;
        }

        savePlayer(userId, player);

        bot.sendMessage(chatId, `✅ <b>Item Used!</b>\n\n${item.name}\n📌 Effect: ${effectText}`, { parse_mode: 'HTML' });
    });

    // ═══════════════════════════════════════════════════════════════════════════════
    // /gift <user_id> <item_id> [quantity] - Gift item
    // ═══════════════════════════════════════════════════════════════════════════════
    bot.onText(/^\/gift\s+(\d+)\s+(\S+)(?:\s+(\d+))?$/i, async (msg, match) => {
        const chatId = msg.chat.id;
        const senderId = msg.from.id.toString();
        const receiverId = match[1];
        const itemId = match[2].toLowerCase();
        const quantity = parseInt(match[3]) || 1;

        if (senderId === receiverId) {
            return bot.sendMessage(chatId, '❌ Tidak bisa gift ke diri sendiri!');
        }

        const item = SHOP_ITEMS[itemId];
        if (!item) {
            return bot.sendMessage(chatId, `❌ Item "${itemId}" tidak ditemukan!`);
        }

        const senderInv = getInventory(senderId);
        if (!senderInv[itemId] || senderInv[itemId] < quantity) {
            return bot.sendMessage(chatId, `❌ Kamu tidak punya ${quantity}x ${item.name}!`);
        }

        // Transfer item
        senderInv[itemId] -= quantity;
        if (senderInv[itemId] <= 0) delete senderInv[itemId];
        saveInventory(senderId, senderInv);

        const receiverInv = getInventory(receiverId);
        receiverInv[itemId] = (receiverInv[itemId] || 0) + quantity;
        saveInventory(receiverId, receiverInv);

        bot.sendMessage(chatId, `🎁 <b>Gift Sent!</b>\n\n${item.name} x${quantity}\n➡️ To: ${receiverId}`, { parse_mode: 'HTML' });

        // Notify receiver
        try {
            bot.sendMessage(receiverId, `🎁 <b>Gift Received!</b>\n\n${item.name} x${quantity}\n⬅️ From: ${senderId}`, { parse_mode: 'HTML' });
        } catch (e) { }
    });

    // ═══════════════════════════════════════════════════════════════════════════════
    // /items - List semua items
    // ═══════════════════════════════════════════════════════════════════════════════
    bot.onText(/^\/items$/i, async (msg) => {
        const chatId = msg.chat.id;

        let text = `📜 <b>ALL SHOP ITEMS</b>\n<code>━━━━━━━━━━━━━━━━━━━━━━</code>\n\n`;

        const categories = { tool: '🔧 TOOLS', consumable: '🧪 CONSUMABLES', equipment: '⚔️ EQUIPMENT', special: '✨ SPECIAL' };

        Object.entries(categories).forEach(([cat, label]) => {
            text += `<b>${label}</b>\n`;
            Object.entries(SHOP_ITEMS).filter(([id, item]) => item.category === cat).forEach(([id, item]) => {
                text += `• <code>${id}</code> - ${item.name} (${item.price}g)\n`;
            });
            text += '\n';
        });

        text += `<i>Gunakan /buy &lt;item_id&gt; untuk beli</i>`;

        bot.sendMessage(chatId, text, { parse_mode: 'HTML' });
    });

    // ═══════════════════════════════════════════════════════════════════════════════
    // /daily - Daily reward
    // ═══════════════════════════════════════════════════════════════════════════════
    bot.onText(/^\/daily$/i, async (msg) => {
        const chatId = msg.chat.id;
        const userId = msg.from.id.toString();
        const players = loadJsonData(PLAYER_FILE) || {};
        const player = getPlayer(userId);

        const now = Date.now();
        const lastDaily = players[userId]?.lastDaily || 0;
        const cooldown = 24 * 60 * 60 * 1000; // 24 hours

        if (now - lastDaily < cooldown) {
            const remaining = cooldown - (now - lastDaily);
            const hours = Math.floor(remaining / 3600000);
            const minutes = Math.floor((remaining % 3600000) / 60000);
            return bot.sendMessage(chatId, `⏳ Daily reward ready in ${hours}h ${minutes}m`);
        }

        // Give daily reward
        const reward = 500 + Math.floor(Math.random() * 500);
        player.gold += reward;
        player.lastDaily = now;
        savePlayer(userId, player);

        bot.sendMessage(chatId, `🎁 <b>Daily Reward!</b>\n\n💰 +${reward} gold\n💵 Total: ${player.gold.toLocaleString()} gold`, { parse_mode: 'HTML' });
    });

    // ═══════════════════════════════════════════════════════════════════════════════
    // CALLBACK HANDLERS
    // ═══════════════════════════════════════════════════════════════════════════════
    bot.on('callback_query', async (query) => {
        const data = query.data;
        const chatId = query.message.chat.id;
        const userId = query.from.id.toString();

        if (!data.startsWith('shop_')) return;

        bot.answerCallbackQuery(query.id);

        if (data.startsWith('shop_cat_')) {
            const category = data.replace('shop_cat_', '');
            const items = Object.entries(SHOP_ITEMS).filter(([id, item]) => item.category === category);

            const categoryNames = { tool: '🔧 TOOLS', consumable: '🧪 CONSUMABLES', equipment: '⚔️ EQUIPMENT', special: '✨ SPECIAL' };

            let text = `${categoryNames[category]}\n<code>━━━━━━━━━━━━━━━━━━━━━━</code>\n\n`;

            items.forEach(([id, item]) => {
                text += `${item.name}\n`;
                text += `└ <code>${id}</code> | 💰${item.price}\n`;
                text += `  📌 ${item.effect}\n\n`;
            });

            text += `<i>/buy &lt;item_id&gt; untuk beli</i>`;

            bot.sendMessage(chatId, text, { parse_mode: 'HTML' });
        }

        if (data === 'shop_inventory') {
            const inventory = getInventory(userId);
            const player = getPlayer(userId);

            const items = Object.entries(inventory);
            let text = `📦 <b>INVENTORY</b>\n\n💰 Gold: ${player.gold.toLocaleString()}\n\n`;

            if (items.length === 0) {
                text += '<i>Inventory kosong</i>';
            } else {
                items.forEach(([itemId, qty]) => {
                    const item = SHOP_ITEMS[itemId];
                    if (item) text += `${item.name} x${qty}\n`;
                });
            }

            bot.sendMessage(chatId, text, { parse_mode: 'HTML' });
        }
    });

};
