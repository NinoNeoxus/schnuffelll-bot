/**
 * ═══════════════════════════════════════════════════════════════════════════════════════
 *  🌆 SCHNUFFELLL CYBERPUNK SURVIVAL RPG - SURVIVAL MECHANICS
 *  Hunger, Thirst, Stamina, Sanity, Humanity Systems
 *  Developer: @schnuffelll
 * ═══════════════════════════════════════════════════════════════════════════════════════
 */

const { SURVIVAL, ITEMS, LOCATIONS } = require('./data');

// ════════════════════════════════════════════════════════════════════════════════════════
// 🌡️ SURVIVAL STATUS CHECKER
// ════════════════════════════════════════════════════════════════════════════════════════

function getSurvivalStatus(player) {
    const status = {
        hunger: player.survival?.hunger ?? SURVIVAL.max.hunger,
        thirst: player.survival?.thirst ?? SURVIVAL.max.thirst,
        stamina: player.survival?.stamina ?? SURVIVAL.max.stamina,
        sanity: player.survival?.sanity ?? SURVIVAL.max.sanity,
        humanity: player.survival?.humanity ?? SURVIVAL.max.humanity
    };
    
    return status;
}

function getSurvivalEffects(player) {
    const status = getSurvivalStatus(player);
    let effects = {
        atk: 0, def: 0, spd: 0, luck: 0, mp: 0, hpDrain: 0
    };
    let warnings = [];
    
    // HUNGER EFFECTS
    if (status.hunger <= 0) {
        effects.atk += SURVIVAL.effects.starving.atk;
        effects.def += SURVIVAL.effects.starving.def;
        effects.hpDrain += SURVIVAL.effects.starving.hpDrain;
        warnings.push('🍖 STARVING! -20% ATK, -10% DEF, HP drain');
    } else if (status.hunger <= 20) {
        effects.atk += Math.floor(SURVIVAL.effects.starving.atk / 2);
        warnings.push('🍖 Very Hungry! -10% ATK');
    } else if (status.hunger <= 40) {
        warnings.push('🍖 Getting hungry...');
    }
    
    // THIRST EFFECTS
    if (status.thirst <= 0) {
        effects.spd += SURVIVAL.effects.dehydrated.spd;
        effects.mp += SURVIVAL.effects.dehydrated.mp;
        effects.hpDrain += SURVIVAL.effects.dehydrated.hpDrain;
        warnings.push('💧 DEHYDRATED! -15% SPD, -20 MP, HP drain');
    } else if (status.thirst <= 20) {
        effects.spd += Math.floor(SURVIVAL.effects.dehydrated.spd / 2);
        warnings.push('💧 Very Thirsty! -8% SPD');
    } else if (status.thirst <= 40) {
        warnings.push('💧 Getting thirsty...');
    }
    
    // STAMINA EFFECTS
    if (status.stamina <= 0) {
        effects.atk += SURVIVAL.effects.exhausted.atk;
        effects.spd += SURVIVAL.effects.exhausted.spd;
        effects.luck += SURVIVAL.effects.exhausted.luck;
        warnings.push('😴 EXHAUSTED! -10% ATK, -20% SPD, -10 LUCK');
    } else if (status.stamina <= 20) {
        effects.spd += Math.floor(SURVIVAL.effects.exhausted.spd / 2);
        warnings.push('😴 Very Tired! -10% SPD');
    } else if (status.stamina <= 40) {
        warnings.push('😴 Getting tired...');
    }
    
    // SANITY EFFECTS
    if (status.sanity <= 0) {
        effects.def += SURVIVAL.effects.insane.def;
        effects.luck += SURVIVAL.effects.insane.luck;
        warnings.push('🧠 CYBERPSYCHOSIS! -20% DEF, -30 LUCK, unpredictable!');
    } else if (status.sanity <= 20) {
        effects.luck += Math.floor(SURVIVAL.effects.insane.luck / 2);
        warnings.push('🧠 Losing grip on reality! -15 LUCK');
    } else if (status.sanity <= 40) {
        warnings.push('🧠 Mental strain increasing...');
    }
    
    // HUMANITY EFFECTS (Cyberware overload)
    if (status.humanity <= 20) {
        warnings.push('🦾 HUMANITY CRITICAL! Risk of cyberpsychosis!');
    } else if (status.humanity <= 40) {
        warnings.push('🦾 Losing humanity to chrome...');
    }
    
    return { effects, warnings };
}

// ════════════════════════════════════════════════════════════════════════════════════════
// 📊 SURVIVAL BAR DISPLAY
// ════════════════════════════════════════════════════════════════════════════════════════

function getSurvivalBars(player) {
    const status = getSurvivalStatus(player);
    
    const createBar = (value, max, emojiFull, emptyEmoji) => {
        const filled = Math.max(0, Math.floor((value / max) * 10));
        return emojiFull.repeat(filled) + emptyEmoji.repeat(10 - filled);
    };
    
    const getStatusEmoji = (value) => {
        if (value >= 80) return '🟢';
        if (value >= 50) return '🟡';
        if (value >= 25) return '🟠';
        return '🔴';
    };
    
    return {
        hunger: {
            bar: createBar(status.hunger, SURVIVAL.max.hunger, '█', '░'),
            emoji: getStatusEmoji(status.hunger),
            value: status.hunger,
            max: SURVIVAL.max.hunger
        },
        thirst: {
            bar: createBar(status.thirst, SURVIVAL.max.thirst, '█', '░'),
            emoji: getStatusEmoji(status.thirst),
            value: status.thirst,
            max: SURVIVAL.max.thirst
        },
        stamina: {
            bar: createBar(status.stamina, SURVIVAL.max.stamina, '█', '░'),
            emoji: getStatusEmoji(status.stamina),
            value: status.stamina,
            max: SURVIVAL.max.stamina
        },
        sanity: {
            bar: createBar(status.sanity, SURVIVAL.max.sanity, '█', '░'),
            emoji: getStatusEmoji(status.sanity),
            value: status.sanity,
            max: SURVIVAL.max.sanity
        },
        humanity: {
            bar: createBar(status.humanity, SURVIVAL.max.humanity, '█', '░'),
            emoji: getStatusEmoji(status.humanity),
            value: status.humanity,
            max: SURVIVAL.max.humanity
        }
    };
}

// ════════════════════════════════════════════════════════════════════════════════════════
// ⏰ TIME-BASED SURVIVAL DRAIN
// ════════════════════════════════════════════════════════════════════════════════════════

function updateSurvivalOverTime(player) {
    const now = Date.now();
    const lastUpdate = player.survival?.lastUpdate || now;
    const hoursPassed = (now - lastUpdate) / (1000 * 60 * 60);
    
    if (hoursPassed < 0.1) return player; // At least 6 minutes between updates
    
    if (!player.survival) {
        player.survival = {
            hunger: SURVIVAL.max.hunger,
            thirst: SURVIVAL.max.thirst,
            stamina: SURVIVAL.max.stamina,
            sanity: SURVIVAL.max.sanity,
            humanity: SURVIVAL.max.humanity,
            lastUpdate: now
        };
    }
    
    // Drain survival stats based on time passed
    player.survival.hunger = Math.max(0, player.survival.hunger - (SURVIVAL.drain_per_hour.hunger * hoursPassed));
    player.survival.thirst = Math.max(0, player.survival.thirst - (SURVIVAL.drain_per_hour.thirst * hoursPassed));
    player.survival.stamina = Math.max(0, player.survival.stamina - (SURVIVAL.drain_per_hour.stamina * hoursPassed));
    player.survival.sanity = Math.max(0, player.survival.sanity - (SURVIVAL.drain_per_hour.sanity * hoursPassed));
    
    // Stamina partially regenerates when offline
    if (hoursPassed >= 1) {
        player.survival.stamina = Math.min(SURVIVAL.max.stamina, player.survival.stamina + (hoursPassed * 10));
    }
    
    player.survival.lastUpdate = now;
    
    // Apply HP drain from critical survival status
    const { effects } = getSurvivalEffects(player);
    if (effects.hpDrain > 0) {
        player.hp = Math.max(1, player.hp - Math.floor(effects.hpDrain * hoursPassed));
    }
    
    return player;
}

// ════════════════════════════════════════════════════════════════════════════════════════
// 🗺️ ADVENTURE SURVIVAL DRAIN
// ════════════════════════════════════════════════════════════════════════════════════════

function applyAdventureDrain(player, locationId) {
    const location = LOCATIONS[locationId];
    if (!location || !location.survivalDrain) return player;
    
    if (!player.survival) {
        player.survival = {
            hunger: SURVIVAL.max.hunger,
            thirst: SURVIVAL.max.thirst,
            stamina: SURVIVAL.max.stamina,
            sanity: SURVIVAL.max.sanity,
            humanity: SURVIVAL.max.humanity,
            lastUpdate: Date.now()
        };
    }
    
    const drain = location.survivalDrain;
    
    player.survival.hunger = Math.max(0, player.survival.hunger - (drain.hunger || 0));
    player.survival.thirst = Math.max(0, player.survival.thirst - (drain.thirst || 0));
    player.survival.stamina = Math.max(0, player.survival.stamina - (drain.stamina || 0));
    player.survival.sanity = Math.max(0, player.survival.sanity - (drain.sanity || 0));
    
    return player;
}

// ════════════════════════════════════════════════════════════════════════════════════════
// 🍖 CONSUME ITEM FOR SURVIVAL
// ════════════════════════════════════════════════════════════════════════════════════════

function consumeForSurvival(player, itemId) {
    const item = ITEMS[itemId];
    if (!item || item.type !== 'consumable') return { success: false, message: 'Item tidak bisa dikonsumsi!' };
    
    if (!player.survival) {
        player.survival = {
            hunger: SURVIVAL.max.hunger,
            thirst: SURVIVAL.max.thirst,
            stamina: SURVIVAL.max.stamina,
            sanity: SURVIVAL.max.sanity,
            humanity: SURVIVAL.max.humanity,
            lastUpdate: Date.now()
        };
    }
    
    const effects = [];
    
    if (item.effect.hunger) {
        const oldHunger = player.survival.hunger;
        player.survival.hunger = Math.min(SURVIVAL.max.hunger, player.survival.hunger + item.effect.hunger);
        effects.push(`🍖 Hunger +${player.survival.hunger - oldHunger}`);
    }
    
    if (item.effect.thirst) {
        const oldThirst = player.survival.thirst;
        player.survival.thirst = Math.min(SURVIVAL.max.thirst, player.survival.thirst + item.effect.thirst);
        effects.push(`💧 Thirst +${player.survival.thirst - oldThirst}`);
    }
    
    if (item.effect.stamina) {
        const oldStamina = player.survival.stamina;
        player.survival.stamina = Math.min(SURVIVAL.max.stamina, player.survival.stamina + item.effect.stamina);
        effects.push(`⚡ Stamina +${player.survival.stamina - oldStamina}`);
    }
    
    if (item.effect.sanity) {
        const oldSanity = player.survival.sanity;
        player.survival.sanity = Math.min(SURVIVAL.max.sanity, player.survival.sanity + item.effect.sanity);
        effects.push(`🧠 Sanity +${player.survival.sanity - oldSanity}`);
    }
    
    if (item.effect.hp) {
        const oldHp = player.hp;
        player.hp = Math.min(player.maxHp, player.hp + item.effect.hp);
        effects.push(`❤️ HP +${player.hp - oldHp}`);
    }
    
    if (item.effect.mp) {
        const oldMp = player.mp;
        player.mp = Math.min(player.maxMp, player.mp + item.effect.mp);
        effects.push(`💙 MP +${player.mp - oldMp}`);
    }
    
    return { 
        success: true, 
        message: `Menggunakan ${item.name}!\n\n${effects.join('\n')}`,
        effects 
    };
}

// ════════════════════════════════════════════════════════════════════════════════════════
// 💤 REST SYSTEM
// ════════════════════════════════════════════════════════════════════════════════════════

function restAtHome(player, hours = 1) {
    if (!player.housing || player.housing === 'street_corner') {
        // Minimal rest on street
        player.survival.stamina = Math.min(SURVIVAL.max.stamina, player.survival.stamina + (hours * 5));
        return {
            success: true,
            message: `Tidur di jalanan selama ${hours} jam...\n⚡ Stamina +${hours * 5}\n\n💡 Beli rumah untuk istirahat lebih baik!`
        };
    }
    
    const { HOUSING } = require('./data');
    const home = HOUSING[player.housing];
    
    // Better rest based on housing tier
    const staminaRecovery = hours * (10 + (home.tier * 5));
    const sanityRecovery = hours * (2 + (home.tier * 2));
    const hpRecovery = hours * (home.passive.hpRegen || 0);
    const mpRecovery = hours * (home.passive.mpRegen || 0);
    
    player.survival.stamina = Math.min(SURVIVAL.max.stamina, player.survival.stamina + staminaRecovery);
    player.survival.sanity = Math.min(SURVIVAL.max.sanity, player.survival.sanity + sanityRecovery);
    player.hp = Math.min(player.maxHp, player.hp + hpRecovery);
    player.mp = Math.min(player.maxMp, player.mp + mpRecovery);
    
    const effects = [
        `⚡ Stamina +${staminaRecovery}`,
        `🧠 Sanity +${sanityRecovery}`
    ];
    if (hpRecovery) effects.push(`❤️ HP +${hpRecovery}`);
    if (mpRecovery) effects.push(`💙 MP +${mpRecovery}`);
    
    return {
        success: true,
        message: `Istirahat di ${home.name} selama ${hours} jam...\n\n${effects.join('\n')}`
    };
}

// ════════════════════════════════════════════════════════════════════════════════════════
// 🦾 HUMANITY SYSTEM (Cyberware Effects)
// ════════════════════════════════════════════════════════════════════════════════════════

function reduceHumanity(player, amount) {
    if (!player.survival) {
        player.survival = {
            hunger: SURVIVAL.max.hunger,
            thirst: SURVIVAL.max.thirst,
            stamina: SURVIVAL.max.stamina,
            sanity: SURVIVAL.max.sanity,
            humanity: SURVIVAL.max.humanity,
            lastUpdate: Date.now()
        };
    }
    
    const oldHumanity = player.survival.humanity;
    player.survival.humanity = Math.max(0, player.survival.humanity - amount);
    
    let warning = '';
    
    if (player.survival.humanity <= 0 && oldHumanity > 0) {
        warning = '\n\n⚠️ CYBERPSYCHOSIS WARNING! ⚠️\nHumanity mencapai 0! Kamu kehilangan kontrol...';
        // Apply random negative effect
        player.survival.sanity = Math.max(0, player.survival.sanity - 30);
    } else if (player.survival.humanity <= 20 && oldHumanity > 20) {
        warning = '\n\n⚠️ Humanity sangat rendah! Risiko cyberpsychosis meningkat!';
    }
    
    return {
        success: true,
        oldHumanity,
        newHumanity: player.survival.humanity,
        warning
    };
}

function restoreHumanity(player, amount) {
    if (!player.survival) {
        player.survival = {
            humanity: SURVIVAL.max.humanity,
            lastUpdate: Date.now()
        };
    }
    
    const oldHumanity = player.survival.humanity;
    player.survival.humanity = Math.min(SURVIVAL.max.humanity, player.survival.humanity + amount);
    
    return {
        success: true,
        oldHumanity,
        newHumanity: player.survival.humanity,
        restored: player.survival.humanity - oldHumanity
    };
}

// ════════════════════════════════════════════════════════════════════════════════════════
// 🎲 RANDOM SURVIVAL EVENTS
// ════════════════════════════════════════════════════════════════════════════════════════

function triggerRandomSurvivalEvent(player) {
    const events = [
        {
            chance: 0.05,
            name: '🦟 Bug Bite',
            effect: () => {
                player.survival.sanity = Math.max(0, player.survival.sanity - 5);
                return 'Digigit serangga mutan! Sanity -5';
            }
        },
        {
            chance: 0.08,
            name: '🌧️ Acid Rain',
            effect: () => {
                player.hp = Math.max(1, player.hp - 15);
                player.survival.sanity = Math.max(0, player.survival.sanity - 5);
                return 'Kehujanan asam! HP -15, Sanity -5';
            }
        },
        {
            chance: 0.03,
            name: '💀 Food Poisoning',
            effect: () => {
                player.survival.hunger = Math.max(0, player.survival.hunger - 30);
                player.hp = Math.max(1, player.hp - 25);
                return 'Keracunan makanan! Hunger -30, HP -25';
            }
        },
        {
            chance: 0.10,
            name: '🌟 Lucky Find',
            effect: () => {
                const goldFound = Math.floor(Math.random() * 100) + 50;
                player.gold += goldFound;
                return `Menemukan creds tersembunyi! Gold +${goldFound}`;
            }
        },
        {
            chance: 0.05,
            name: '🍖 Free Meal',
            effect: () => {
                player.survival.hunger = Math.min(SURVIVAL.max.hunger, player.survival.hunger + 40);
                return 'Dapat makanan gratis dari vendor! Hunger +40';
            }
        },
        {
            chance: 0.02,
            name: '👁️ Nightmares',
            effect: () => {
                player.survival.sanity = Math.max(0, player.survival.sanity - 20);
                player.survival.stamina = Math.max(0, player.survival.stamina - 15);
                return 'Mimpi buruk tentang cyberspace! Sanity -20, Stamina -15';
            }
        }
    ];
    
    for (const event of events) {
        if (Math.random() < event.chance) {
            const result = event.effect();
            return {
                triggered: true,
                name: event.name,
                result
            };
        }
    }
    
    return { triggered: false };
}

// ════════════════════════════════════════════════════════════════════════════════════════
// 📊 SURVIVAL STATUS DISPLAY TEXT
// ════════════════════════════════════════════════════════════════════════════════════════

function getSurvivalDisplayText(player) {
    const bars = getSurvivalBars(player);
    const { warnings } = getSurvivalEffects(player);
    
    let text = `
┌─「 🌡️ <b>SURVIVAL STATUS</b> 」
│ 🍖 Hunger: [${bars.hunger.bar}] ${bars.hunger.emoji} ${Math.floor(bars.hunger.value)}%
│ 💧 Thirst: [${bars.thirst.bar}] ${bars.thirst.emoji} ${Math.floor(bars.thirst.value)}%
│ ⚡ Stamina: [${bars.stamina.bar}] ${bars.stamina.emoji} ${Math.floor(bars.stamina.value)}%
│ 🧠 Sanity: [${bars.sanity.bar}] ${bars.sanity.emoji} ${Math.floor(bars.sanity.value)}%
│ 🦾 Humanity: [${bars.humanity.bar}] ${bars.humanity.emoji} ${Math.floor(bars.humanity.value)}%
└───────────────────────`;
    
    if (warnings.length > 0) {
        text += `\n\n⚠️ <b>WARNINGS:</b>\n${warnings.join('\n')}`;
    }
    
    return text;
}

// ════════════════════════════════════════════════════════════════════════════════════════
// EXPORTS
// ════════════════════════════════════════════════════════════════════════════════════════

module.exports = {
    getSurvivalStatus,
    getSurvivalEffects,
    getSurvivalBars,
    updateSurvivalOverTime,
    applyAdventureDrain,
    consumeForSurvival,
    restAtHome,
    reduceHumanity,
    restoreHumanity,
    triggerRandomSurvivalEvent,
    getSurvivalDisplayText,
    SURVIVAL
};

