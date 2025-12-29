/**
 * ═══════════════════════════════════════════════════════════════════════════════════════
 *  🌆 SCHNUFFELLL CYBERPUNK SURVIVAL RPG - COMBAT SYSTEM
 *  Combat, Skills, Damage Calculation
 *  Developer: @schnuffelll
 * ═══════════════════════════════════════════════════════════════════════════════════════
 */

const { SKILLS, MONSTERS, CLASSES, AUGMENTATIONS } = require('./data');

// ════════════════════════════════════════════════════════════════════════════════════════
// ⚔️ DAMAGE CALCULATION
// ════════════════════════════════════════════════════════════════════════════════════════

function calculateDamage(attacker, defender, options = {}) {
    const { isSkill = false, skillMultiplier = 1, isCritGuaranteed = false } = options;
    
    // Base damage calculation
    let baseDmg = attacker.atk * skillMultiplier;
    
    // Apply augmentation bonuses
    if (attacker.augments) {
        for (const augId of Object.values(attacker.augments)) {
            const aug = AUGMENTATIONS[augId];
            if (aug && aug.stats?.atk) {
                baseDmg += aug.stats.atk * 0.2; // 20% of aug ATK bonus
            }
        }
    }
    
    // Defense mitigation
    const defense = defender.def * 0.6;
    let damage = Math.max(1, Math.floor(baseDmg - defense + (Math.random() * 15)));
    
    // Critical hit calculation
    const critChance = (attacker.luck || 5) / 100;
    const isCrit = isCritGuaranteed || Math.random() < critChance;
    
    if (isCrit) {
        damage = Math.floor(damage * (1.5 + (attacker.luck / 200)));
    }
    
    // Armor penetration for high ATK
    if (attacker.atk > defender.def * 2) {
        damage = Math.floor(damage * 1.2);
    }
    
    // Random variance ±10%
    const variance = 0.9 + (Math.random() * 0.2);
    damage = Math.floor(damage * variance);
    
    return {
        damage: Math.max(1, damage),
        crit: isCrit,
        armorPen: attacker.atk > defender.def * 2
    };
}

// ════════════════════════════════════════════════════════════════════════════════════════
// 🎯 SKILL USAGE
// ════════════════════════════════════════════════════════════════════════════════════════

function useSkill(player, skillIndex, target) {
    const classSkills = SKILLS[player.class];
    if (!classSkills || !classSkills[skillIndex]) {
        return { success: false, message: 'Skill tidak ditemukan!' };
    }
    
    const skill = classSkills[skillIndex];
    
    // Check level requirement
    if (player.level < skill.level) {
        return { success: false, message: `Level belum cukup! Butuh level ${skill.level}` };
    }
    
    // Check MP
    if (player.mp < skill.mp) {
        return { success: false, message: `MP tidak cukup! Butuh ${skill.mp} MP, kamu punya ${player.mp} MP` };
    }
    
    // Consume MP
    player.mp -= skill.mp;
    
    let damage = 0;
    let effects = [];
    let healAmount = 0;
    
    // Handle different skill effects
    if (skill.multiplier > 0) {
        const damageResult = calculateDamage(player, target, {
            isSkill: true,
            skillMultiplier: skill.multiplier
        });
        damage = damageResult.damage;
        
        if (damageResult.crit) {
            effects.push('💥 CRITICAL!');
        }
    }
    
    // Special effects
    switch (skill.effect) {
        case 'heal':
            healAmount = skill.healAmount || Math.floor(player.maxHp * 0.3);
            player.hp = Math.min(player.maxHp, player.hp + healAmount);
            effects.push(`❤️ Healed ${healAmount} HP`);
            break;
            
        case 'stun':
            effects.push('⚡ Target STUNNED!');
            target.stunned = true;
            break;
            
        case 'buff':
            player.tempBuffs = player.tempBuffs || {};
            player.tempBuffs.atk = (player.tempBuffs.atk || 0) + 0.3;
            player.tempBuffs.turns = 3;
            effects.push('💪 ATK +30% untuk 3 turn!');
            break;
            
        case 'debuff':
            target.tempDebuffs = target.tempDebuffs || {};
            target.tempDebuffs.def = (target.tempDebuffs.def || 0) - 0.3;
            effects.push('🔻 Target DEF -30%!');
            break;
            
        case 'poison':
            target.poisoned = 3; // 3 turns of poison
            effects.push('☠️ Target POISONED!');
            break;
            
        case 'burn':
            target.burning = 3;
            effects.push('🔥 Target BURNING!');
            break;
            
        case 'bleed':
            target.bleeding = 3;
            effects.push('🩸 Target BLEEDING!');
            break;
            
        case 'electric':
            damage = Math.floor(damage * 1.2); // Extra damage
            effects.push('⚡ ELECTRIC damage!');
            break;
            
        case 'lifesteal':
            const stolen = Math.floor(damage * 0.3);
            player.hp = Math.min(player.maxHp, player.hp + stolen);
            effects.push(`🧛 Stole ${stolen} HP!`);
            break;
            
        case 'aoe':
            effects.push('💥 AOE DAMAGE!');
            break;
            
        case 'instakill':
            if (Math.random() < 0.15) {
                damage = target.hp;
                effects.push('💀 INSTANT KILL!');
            }
            break;
            
        case 'summon':
            player.summon = {
                name: skill.name.includes('Turret') ? '🔫 Turret' : 
                      skill.name.includes('Drone') ? '🤖 Drone' : '👤 Ally',
                atk: Math.floor(player.atk * 0.5),
                turns: 5
            };
            effects.push(`🎮 Summoned ${player.summon.name}!`);
            break;
            
        case 'dodge':
            player.dodgeNext = true;
            effects.push('🏃 Will dodge next attack!');
            break;
            
        case 'revive':
            if (player.hp <= 0) {
                player.hp = Math.floor(player.maxHp * 0.5);
                effects.push('💫 REVIVED with 50% HP!');
            }
            break;
    }
    
    return {
        success: true,
        skill,
        damage,
        healAmount,
        effects,
        player
    };
}

// ════════════════════════════════════════════════════════════════════════════════════════
// 🎲 BATTLE SIMULATION
// ════════════════════════════════════════════════════════════════════════════════════════

function simulateBattle(player, monsterId, playerStats) {
    const monsterTemplate = MONSTERS[monsterId];
    if (!monsterTemplate) {
        return { success: false, message: 'Monster tidak ditemukan!' };
    }
    
    const monster = { ...monsterTemplate, hp: monsterTemplate.hp };
    const battleLog = [];
    let turn = 0;
    const maxTurns = 30;
    
    // Apply temp buffs
    let effectivePlayerStats = { ...playerStats };
    if (player.tempBuffs) {
        if (player.tempBuffs.atk) {
            effectivePlayerStats.atk = Math.floor(effectivePlayerStats.atk * (1 + player.tempBuffs.atk));
        }
    }
    
    // Combat loop
    while (player.hp > 0 && monster.hp > 0 && turn < maxTurns) {
        turn++;
        
        // Check status effects on player
        if (player.poisoned > 0) {
            const poisonDmg = Math.floor(player.maxHp * 0.05);
            player.hp -= poisonDmg;
            battleLog.push(`☠️ Poison damage: -${poisonDmg} HP`);
            player.poisoned--;
        }
        
        // Player turn
        if (!player.stunned) {
            // Summon attacks first
            if (player.summon && player.summon.turns > 0) {
                const summonDmg = calculateDamage({ atk: player.summon.atk, luck: 10 }, monster);
                monster.hp -= summonDmg.damage;
                battleLog.push(`🤖 ${player.summon.name} attacks! Damage: ${summonDmg.damage}`);
                player.summon.turns--;
            }
            
            // Player attack
            const playerDmg = calculateDamage(effectivePlayerStats, monster);
            monster.hp -= playerDmg.damage;
            battleLog.push(`⚔️ You attack! ${playerDmg.crit ? '💥CRIT! ' : ''}Damage: ${playerDmg.damage}`);
        } else {
            battleLog.push('😵 You are stunned!');
            player.stunned = false;
        }
        
        if (monster.hp <= 0) break;
        
        // Monster status effects
        if (monster.stunned) {
            battleLog.push(`⚡ ${monster.name} is stunned!`);
            monster.stunned = false;
            continue;
        }
        
        if (monster.poisoned > 0) {
            const poisonDmg = Math.floor(monsterTemplate.hp * 0.03);
            monster.hp -= poisonDmg;
            battleLog.push(`☠️ ${monster.name} takes poison damage: -${poisonDmg}`);
            monster.poisoned--;
        }
        
        if (monster.burning > 0) {
            const burnDmg = Math.floor(monsterTemplate.hp * 0.04);
            monster.hp -= burnDmg;
            battleLog.push(`🔥 ${monster.name} burning: -${burnDmg}`);
            monster.burning--;
        }
        
        if (monster.bleeding > 0) {
            const bleedDmg = Math.floor(monsterTemplate.hp * 0.03);
            monster.hp -= bleedDmg;
            battleLog.push(`🩸 ${monster.name} bleeding: -${bleedDmg}`);
            monster.bleeding--;
        }
        
        if (monster.hp <= 0) break;
        
        // Monster attack
        if (player.dodgeNext) {
            battleLog.push(`🏃 You dodged the attack!`);
            player.dodgeNext = false;
        } else {
            const monsterDmg = calculateDamage(monster, effectivePlayerStats);
            player.hp -= monsterDmg.damage;
            battleLog.push(`👹 ${monster.name} attacks! Damage: ${monsterDmg.damage}`);
        }
        
        // Reduce buff turns
        if (player.tempBuffs && player.tempBuffs.turns > 0) {
            player.tempBuffs.turns--;
            if (player.tempBuffs.turns <= 0) {
                player.tempBuffs = null;
            }
        }
    }
    
    // Determine winner
    const victory = monster.hp <= 0;
    
    // Calculate rewards
    let rewards = {
        xp: 0,
        gold: 0,
        drops: []
    };
    
    if (victory) {
        rewards.xp = monsterTemplate.xp;
        rewards.gold = monsterTemplate.gold;
        
        // Drop calculation
        if (monsterTemplate.drops) {
            for (const drop of monsterTemplate.drops) {
                const dropChance = monsterTemplate.isBoss ? 0.5 : 0.2;
                if (Math.random() < dropChance) {
                    rewards.drops.push(drop);
                }
            }
        }
        
        // Bonus for low HP victory (risky win)
        if (player.hp <= player.maxHp * 0.2) {
            rewards.xp = Math.floor(rewards.xp * 1.5);
            rewards.gold = Math.floor(rewards.gold * 1.3);
        }
    }
    
    return {
        success: true,
        victory,
        battleLog: battleLog.slice(-8), // Last 8 entries
        monster,
        monsterTemplate,
        playerHpRemaining: player.hp,
        rewards,
        turns: turn
    };
}

// ════════════════════════════════════════════════════════════════════════════════════════
// 📊 COMBAT STATS DISPLAY
// ════════════════════════════════════════════════════════════════════════════════════════

function getCombatStats(player) {
    const classData = CLASSES[player.class];
    
    // Base stats
    let stats = {
        hp: player.hp,
        maxHp: player.maxHp,
        mp: player.mp,
        maxMp: player.maxMp,
        atk: player.atk,
        def: player.def,
        spd: player.spd,
        luck: player.luck
    };
    
    // Add augmentation bonuses
    if (player.augments) {
        for (const [slot, augId] of Object.entries(player.augments)) {
            const aug = AUGMENTATIONS[augId];
            if (aug && aug.stats) {
                for (const [stat, value] of Object.entries(aug.stats)) {
                    if (stats[stat] !== undefined) {
                        stats[stat] += value;
                    }
                }
            }
        }
    }
    
    // Add equipment bonuses (from main inventory system)
    if (player.equipped) {
        const { ITEMS } = require('./data');
        for (const [slot, itemId] of Object.entries(player.equipped)) {
            if (itemId) {
                const item = ITEMS[itemId];
                if (item && item.stats) {
                    for (const [stat, value] of Object.entries(item.stats)) {
                        if (stats[stat] !== undefined) {
                            stats[stat] += value;
                        }
                    }
                }
            }
        }
    }
    
    return stats;
}

// ════════════════════════════════════════════════════════════════════════════════════════
// 🎮 SKILL LIST DISPLAY
// ════════════════════════════════════════════════════════════════════════════════════════

function getSkillListText(player) {
    const classSkills = SKILLS[player.class];
    if (!classSkills) return 'No skills available.';
    
    const classData = CLASSES[player.class];
    
    let text = `
╔══════════════════════════════════╗
║  ${classData.emoji} <b>${classData.name} SKILLS</b>  ║
╚══════════════════════════════════╝

`;
    
    classSkills.forEach((skill, index) => {
        const unlocked = player.level >= skill.level;
        const statusEmoji = unlocked ? '🟢' : '🔒';
        
        text += `${statusEmoji} <b>${skill.name}</b>
   └ ${skill.desc}
   └ MP: ${skill.mp} | Damage: x${skill.multiplier} | Unlock: Lv.${skill.level}
   ${unlocked ? `└ <code>.skill ${index + 1}</code>` : `└ Unlock at level ${skill.level}`}

`;
    });
    
    return text;
}

// ════════════════════════════════════════════════════════════════════════════════════════
// EXPORTS
// ════════════════════════════════════════════════════════════════════════════════════════

module.exports = {
    calculateDamage,
    useSkill,
    simulateBattle,
    getCombatStats,
    getSkillListText
};

