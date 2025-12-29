/**
 * ═══════════════════════════════════════════════════════════════════════════════════════
 *  🎣 SCHNUFFELLL RPG - FISHING & HUNTING SYSTEM v7.1
 *  Theme: Neo-Jakarta 2077 - Relax & Survival Activities
 *  Developer: @schnuffelll
 *  
 *  Features:
 *  - Complete Fishing System with 100+ fish types
 *  - Hunting System with 50+ animals
 *  - Time Travel to different eras
 *  - Relaxing Activities
 *  - Legendary & Mythical catches
 * ═══════════════════════════════════════════════════════════════════════════════════════
 */

// ════════════════════════════════════════════════════════════════════════════════════════
// 🎣 FISHING SYSTEM - Complete Fishing Experience
// ════════════════════════════════════════════════════════════════════════════════════════

const FISHING_RODS = {
    // === BASIC RODS ===
    bamboo_rod: {
        name: '🎋 Joran Bambu',
        tier: 1,
        price: 100,
        durability: 50,
        luck: 0,
        power: 5,
        desc: 'Joran sederhana dari bambu. Pemula friendly.',
        unlockLevel: 1
    },
    wooden_rod: {
        name: '🪵 Joran Kayu',
        tier: 1,
        price: 300,
        durability: 80,
        luck: 5,
        power: 10,
        desc: 'Joran kayu berkualitas. Lebih tahan lama.',
        unlockLevel: 3
    },
    fiber_rod: {
        name: '🧵 Joran Fiber',
        tier: 2,
        price: 800,
        durability: 120,
        luck: 10,
        power: 20,
        desc: 'Joran modern dari fiberglass.',
        unlockLevel: 8
    },
    carbon_rod: {
        name: '⚫ Joran Carbon',
        tier: 2,
        price: 2000,
        durability: 200,
        luck: 15,
        power: 35,
        desc: 'Joran ringan dan kuat dari carbon.',
        unlockLevel: 15
    },
    titanium_rod: {
        name: '🔩 Joran Titanium',
        tier: 3,
        price: 5000,
        durability: 350,
        luck: 25,
        power: 50,
        desc: 'Joran high-tech titanium alloy.',
        unlockLevel: 25
    },
    cyber_rod: {
        name: '🤖 Cyber Rod',
        tier: 3,
        price: 15000,
        durability: 500,
        luck: 40,
        power: 80,
        desc: 'Joran dengan AI targeting system.',
        unlockLevel: 40
    },
    quantum_rod: {
        name: '⚛️ Quantum Rod',
        tier: 4,
        price: 50000,
        durability: 1000,
        luck: 60,
        power: 120,
        desc: 'Joran yang bisa memancing di dimensi lain.',
        unlockLevel: 60
    },
    legendary_rod: {
        name: '🌟 Legendary Neptune',
        tier: 5,
        price: 200000,
        durability: 9999,
        luck: 100,
        power: 200,
        desc: 'Pusaka dewa laut. Bisa memancing ikan mitos.',
        unlockLevel: 80
    }
};

const BAITS = {
    // === COMMON BAITS ===
    worm: { name: '🪱 Cacing', price: 10, attract: ['common'], bonus: 0 },
    bread: { name: '🍞 Roti', price: 15, attract: ['common', 'uncommon'], bonus: 5 },
    shrimp: { name: '🦐 Udang', price: 30, attract: ['uncommon', 'rare'], bonus: 10 },
    small_fish: { name: '🐟 Ikan Kecil', price: 50, attract: ['rare', 'epic'], bonus: 15 },
    squid: { name: '🦑 Cumi', price: 100, attract: ['epic', 'legendary'], bonus: 25 },
    cyber_bait: { name: '💎 Cyber Bait', price: 500, attract: ['legendary', 'mythical'], bonus: 50 },
    quantum_bait: { name: '⚛️ Quantum Bait', price: 2000, attract: ['mythical', 'divine'], bonus: 100 }
};

const FISH = {
    // === COMMON FISH (50% catch rate) ===
    ikan_mas: { name: '🐟 Ikan Mas', rarity: 'common', price: 20, xp: 5, weight: { min: 0.5, max: 3 } },
    ikan_nila: { name: '🐟 Ikan Nila', rarity: 'common', price: 25, xp: 5, weight: { min: 0.3, max: 2 } },
    ikan_lele: { name: '🐟 Ikan Lele', rarity: 'common', price: 30, xp: 8, weight: { min: 0.5, max: 5 } },
    ikan_gurame: { name: '🐟 Ikan Gurame', rarity: 'common', price: 35, xp: 10, weight: { min: 1, max: 4 } },
    ikan_patin: { name: '🐟 Ikan Patin', rarity: 'common', price: 40, xp: 12, weight: { min: 1, max: 6 } },
    ikan_bawal: { name: '🐟 Ikan Bawal', rarity: 'common', price: 45, xp: 15, weight: { min: 0.5, max: 3 } },
    ikan_bandeng: { name: '🐟 Ikan Bandeng', rarity: 'common', price: 50, xp: 15, weight: { min: 0.8, max: 4 } },
    ikan_mujair: { name: '🐟 Ikan Mujair', rarity: 'common', price: 22, xp: 5, weight: { min: 0.2, max: 1.5 } },

    // === UNCOMMON FISH (30% catch rate) ===
    ikan_kerapu: { name: '🐠 Ikan Kerapu', rarity: 'uncommon', price: 100, xp: 30, weight: { min: 2, max: 15 } },
    ikan_kakap: { name: '🐠 Ikan Kakap', rarity: 'uncommon', price: 120, xp: 35, weight: { min: 3, max: 20 } },
    ikan_tuna: { name: '🐠 Ikan Tuna', rarity: 'uncommon', price: 150, xp: 40, weight: { min: 5, max: 50 } },
    ikan_tongkol: { name: '🐠 Ikan Tongkol', rarity: 'uncommon', price: 80, xp: 25, weight: { min: 2, max: 10 } },
    ikan_tenggiri: { name: '🐠 Ikan Tenggiri', rarity: 'uncommon', price: 130, xp: 35, weight: { min: 3, max: 25 } },
    ikan_cakalang: { name: '🐠 Ikan Cakalang', rarity: 'uncommon', price: 90, xp: 28, weight: { min: 2, max: 12 } },
    ikan_baronang: { name: '🐠 Ikan Baronang', rarity: 'uncommon', price: 110, xp: 32, weight: { min: 1, max: 8 } },
    udang_galah: { name: '🦐 Udang Galah', rarity: 'uncommon', price: 200, xp: 45, weight: { min: 0.1, max: 0.5 } },

    // === RARE FISH (15% catch rate) ===
    ikan_marlin: { name: '🐬 Marlin Biru', rarity: 'rare', price: 500, xp: 100, weight: { min: 50, max: 200 } },
    ikan_sailfish: { name: '🐬 Sailfish', rarity: 'rare', price: 450, xp: 90, weight: { min: 30, max: 100 } },
    ikan_arwana: { name: '🐲 Arwana Emas', rarity: 'rare', price: 800, xp: 150, weight: { min: 2, max: 8 } },
    ikan_hiu_kecil: { name: '🦈 Baby Shark', rarity: 'rare', price: 600, xp: 120, weight: { min: 10, max: 50 } },
    pari_manta: { name: '🦋 Pari Manta', rarity: 'rare', price: 700, xp: 130, weight: { min: 20, max: 100 } },
    ikan_napoleon: { name: '🐠 Napoleon Wrasse', rarity: 'rare', price: 900, xp: 160, weight: { min: 5, max: 30 } },
    lobster: { name: '🦞 Lobster Raja', rarity: 'rare', price: 1000, xp: 180, weight: { min: 1, max: 5 } },
    kepiting_raja: { name: '🦀 Kepiting Raja', rarity: 'rare', price: 850, xp: 140, weight: { min: 2, max: 8 } },

    // === EPIC FISH (4% catch rate) ===
    hiu_putih: { name: '🦈 Great White Shark', rarity: 'epic', price: 3000, xp: 500, weight: { min: 500, max: 2000 } },
    paus_biru: { name: '🐋 Blue Whale', rarity: 'epic', price: 5000, xp: 800, weight: { min: 50000, max: 150000 } },
    giant_squid: { name: '🦑 Giant Squid', rarity: 'epic', price: 4000, xp: 600, weight: { min: 100, max: 500 } },
    mola_mola: { name: '🐡 Mola Mola', rarity: 'epic', price: 3500, xp: 550, weight: { min: 200, max: 1000 } },
    coelacanth: { name: '🐟 Coelacanth', rarity: 'epic', price: 8000, xp: 1000, weight: { min: 30, max: 100 } },
    oarfish: { name: '🐍 Oarfish', rarity: 'epic', price: 6000, xp: 750, weight: { min: 50, max: 200 } },
    ikan_naga: { name: '🐲 Sea Dragon', rarity: 'epic', price: 7000, xp: 900, weight: { min: 10, max: 50 } },
    electric_eel: { name: '⚡ Electric Eel', rarity: 'epic', price: 4500, xp: 650, weight: { min: 5, max: 25 } },

    // === LEGENDARY FISH (0.9% catch rate) ===
    golden_koi: { name: '✨ Golden Koi', rarity: 'legendary', price: 25000, xp: 3000, weight: { min: 5, max: 15 }, special: 'Membawa keberuntungan +10% luck' },
    diamond_fish: { name: '💎 Diamond Fish', rarity: 'legendary', price: 50000, xp: 5000, weight: { min: 1, max: 5 }, special: 'Tubuh terbuat dari kristal murni' },
    phoenix_fish: { name: '🔥 Phoenix Fish', rarity: 'legendary', price: 40000, xp: 4500, weight: { min: 3, max: 10 }, special: 'Menyala dalam gelap' },
    ice_dragon_fish: { name: '❄️ Ice Dragon Fish', rarity: 'legendary', price: 45000, xp: 4800, weight: { min: 10, max: 30 }, special: 'Membekukan air sekitar' },
    thunder_whale: { name: '⚡ Thunder Whale', rarity: 'legendary', price: 60000, xp: 6000, weight: { min: 10000, max: 50000 }, special: 'Bisa memanggil badai' },
    void_shark: { name: '🌑 Void Shark', rarity: 'legendary', price: 55000, xp: 5500, weight: { min: 500, max: 2000 }, special: 'Dari dimensi kegelapan' },
    rainbow_serpent: { name: '🌈 Rainbow Serpent', rarity: 'legendary', price: 70000, xp: 7000, weight: { min: 100, max: 500 }, special: 'Tubuh berubah warna' },

    // === MYTHICAL FISH (0.09% catch rate) ===
    leviathan: { name: '🐉 Leviathan', rarity: 'mythical', price: 500000, xp: 50000, weight: { min: 100000, max: 1000000 }, special: 'Monster laut legendaris dari kitab kuno' },
    kraken: { name: '🦑 Kraken', rarity: 'mythical', price: 450000, xp: 45000, weight: { min: 50000, max: 500000 }, special: 'Penguasa lautan dalam' },
    megalodon: { name: '🦈 Megalodon', rarity: 'mythical', price: 400000, xp: 40000, weight: { min: 30000, max: 100000 }, special: 'Hiu purba yang bangkit' },
    poseidon_trident_fish: { name: '🔱 Poseidon Fish', rarity: 'mythical', price: 600000, xp: 60000, weight: { min: 50, max: 200 }, special: 'Ikan suci pelayan Poseidon' },

    // === DIVINE FISH (0.01% catch rate) ===
    god_of_sea: { name: '👑 God of Sea', rarity: 'divine', price: 5000000, xp: 500000, weight: { min: 1, max: 10 }, special: 'Dewa laut yang menjelma jadi ikan. Sekali seumur hidup.' },
    primordial_whale: { name: '🌌 Primordial Whale', rarity: 'divine', price: 10000000, xp: 1000000, weight: { min: 9999999, max: 9999999 }, special: 'Makhluk pertama di lautan semesta' }
};

const FISHING_LOCATIONS = {
    urban_river: {
        name: '🌆 Sungai Kota',
        minLevel: 1,
        fish: ['ikan_mas', 'ikan_nila', 'ikan_lele', 'ikan_mujair'],
        weather: ['cerah', 'mendung'],
        desc: 'Sungai di pinggiran Night City. Banyak ikan biasa.',
        unlockCost: 0,
        era: 'future'
    },
    cyber_pond: {
        name: '🏭 Kolam Cyber',
        minLevel: 5,
        fish: ['ikan_gurame', 'ikan_patin', 'ikan_bawal', 'ikan_kerapu'],
        weather: ['cerah', 'hujan'],
        desc: 'Kolam di belakang pabrik. Air agak kotor tapi ikan besar.',
        unlockCost: 500,
        era: 'future'
    },
    neon_beach: {
        name: '🏖️ Pantai Neon',
        minLevel: 10,
        fish: ['ikan_kakap', 'ikan_tuna', 'ikan_tenggiri', 'udang_galah', 'ikan_sailfish'],
        weather: ['cerah', 'berangin'],
        desc: 'Pantai dengan lampu neon. Tempat hangout populer.',
        unlockCost: 2000,
        era: 'future'
    },
    deep_ocean: {
        name: '🌊 Lautan Dalam',
        minLevel: 20,
        fish: ['ikan_marlin', 'hiu_kecil', 'pari_manta', 'giant_squid', 'oarfish'],
        weather: ['badai', 'malam'],
        desc: 'Lautan dalam yang gelap. Butuh perahu khusus.',
        unlockCost: 10000,
        era: 'future'
    },
    quantum_sea: {
        name: '⚛️ Lautan Quantum',
        minLevel: 40,
        fish: ['golden_koi', 'diamond_fish', 'phoenix_fish', 'void_shark'],
        weather: ['anomali'],
        desc: 'Lautan di dimensi paralel. Reality bending.',
        unlockCost: 50000,
        era: 'quantum'
    },
    primordial_ocean: {
        name: '🌌 Lautan Primordial',
        minLevel: 60,
        fish: ['leviathan', 'kraken', 'megalodon', 'poseidon_trident_fish', 'god_of_sea'],
        weather: ['cosmic'],
        desc: 'Lautan pertama di alam semesta. Tempat dewa tinggal.',
        unlockCost: 200000,
        era: 'primordial'
    },

    // === TIME TRAVEL LOCATIONS (Present Era) ===
    danau_toba: {
        name: '🏝️ Danau Toba',
        minLevel: 5,
        fish: ['ikan_mas', 'ikan_nila', 'ikan_mujair', 'ikan_batak'],
        weather: ['cerah', 'berkabut'],
        desc: 'Danau vulkanik terbesar di Indonesia. Era sekarang.',
        unlockCost: 1000,
        era: 'present'
    },
    sungai_mahakam: {
        name: '🌴 Sungai Mahakam',
        minLevel: 15,
        fish: ['ikan_arwana', 'ikan_patin', 'ikan_gabus', 'pesut_mahakam'],
        weather: ['hujan', 'cerah'],
        desc: 'Sungai di Kalimantan. Habitat arwana langka.',
        unlockCost: 5000,
        era: 'present'
    },
    raja_ampat: {
        name: '🐠 Raja Ampat',
        minLevel: 30,
        fish: ['ikan_napoleon', 'pari_manta', 'lobster', 'kepiting_raja', 'mola_mola'],
        weather: ['cerah', 'jernih'],
        desc: 'Surga bawah laut Indonesia. Biodiversity terbaik.',
        unlockCost: 25000,
        era: 'present'
    },

    // === RELAXING SPOTS ===
    warung_pinggir_kali: {
        name: '☕ Warung Pinggir Kali',
        minLevel: 1,
        fish: ['ikan_mas', 'ikan_nila'],
        weather: ['cerah'],
        desc: 'Mancing santai sambil ngopi. Vibes tenang.',
        unlockCost: 0,
        era: 'present',
        bonus: { relaxation: 20, social: 10 }
    }
};

// ════════════════════════════════════════════════════════════════════════════════════════
// 🦌 HUNTING SYSTEM - Complete Hunting Experience
// ════════════════════════════════════════════════════════════════════════════════════════

const HUNTING_WEAPONS = {
    slingshot: { name: '🎯 Ketapel', tier: 1, price: 50, damage: 5, accuracy: 60, ammo: 'stone' },
    bow: { name: '🏹 Busur', tier: 1, price: 200, damage: 15, accuracy: 70, ammo: 'arrow' },
    crossbow: { name: '🎯 Crossbow', tier: 2, price: 800, damage: 30, accuracy: 80, ammo: 'bolt' },
    rifle: { name: '🔫 Rifle', tier: 2, price: 2000, damage: 50, accuracy: 85, ammo: 'bullet' },
    sniper: { name: '🎯 Sniper', tier: 3, price: 5000, damage: 100, accuracy: 95, ammo: 'sniper_round' },
    laser_gun: { name: '⚡ Laser Gun', tier: 3, price: 15000, damage: 150, accuracy: 99, ammo: 'energy_cell' },
    plasma_cannon: { name: '💥 Plasma Cannon', tier: 4, price: 50000, damage: 300, accuracy: 90, ammo: 'plasma_core' }
};

const ANIMALS = {
    // === SMALL GAME ===
    kelinci: { name: '🐰 Kelinci', hp: 20, xp: 10, meat: 1, hide: 1, price: 50, difficulty: 'easy' },
    tupai: { name: '🐿️ Tupai', hp: 15, xp: 8, meat: 1, hide: 0, price: 30, difficulty: 'easy' },
    ayam_hutan: { name: '🐓 Ayam Hutan', hp: 25, xp: 15, meat: 2, hide: 0, price: 60, difficulty: 'easy' },
    burung: { name: '🐦 Burung', hp: 10, xp: 5, meat: 1, hide: 0, price: 20, difficulty: 'easy' },

    // === MEDIUM GAME ===
    rusa: { name: '🦌 Rusa', hp: 80, xp: 50, meat: 5, hide: 3, price: 200, difficulty: 'medium' },
    babi_hutan: { name: '🐗 Babi Hutan', hp: 100, xp: 60, meat: 6, hide: 2, price: 250, difficulty: 'medium' },
    kambing_liar: { name: '🐐 Kambing Liar', hp: 70, xp: 40, meat: 4, hide: 2, price: 180, difficulty: 'medium' },
    kancil: { name: '🦌 Kancil', hp: 30, xp: 25, meat: 2, hide: 1, price: 100, difficulty: 'medium' },

    // === LARGE GAME ===
    harimau: { name: '🐅 Harimau Sumatera', hp: 300, xp: 200, meat: 8, hide: 10, price: 1000, difficulty: 'hard' },
    gajah: { name: '🐘 Gajah', hp: 500, xp: 300, meat: 20, hide: 15, price: 2000, difficulty: 'hard' },
    badak: { name: '🦏 Badak Jawa', hp: 400, xp: 250, meat: 15, hide: 12, price: 1500, difficulty: 'hard' },
    beruang: { name: '🐻 Beruang Madu', hp: 350, xp: 220, meat: 10, hide: 8, price: 1200, difficulty: 'hard' },

    // === CYBER ANIMALS (Future Era) ===
    cyber_wolf: { name: '🐺 Cyber Wolf', hp: 200, xp: 150, meat: 0, parts: 5, price: 800, difficulty: 'medium' },
    mech_bear: { name: '🤖 Mech Bear', hp: 600, xp: 400, meat: 0, parts: 15, price: 3000, difficulty: 'hard' },
    drone_hawk: { name: '🦅 Drone Hawk', hp: 150, xp: 100, meat: 0, parts: 3, price: 500, difficulty: 'medium' },
    mutant_boar: { name: '☢️ Mutant Boar', hp: 400, xp: 300, meat: 10, mutagen: 5, price: 2000, difficulty: 'hard' },

    // === LEGENDARY CREATURES ===
    golden_deer: { name: '✨ Golden Deer', hp: 500, xp: 1000, meat: 10, golden_hide: 1, price: 10000, difficulty: 'legendary', special: 'Rusa emas mitologi. Super langka.' },
    phoenix: { name: '🔥 Phoenix', hp: 800, xp: 2000, meat: 0, feather: 5, price: 25000, difficulty: 'legendary', special: 'Burung api legendaris.' },
    unicorn: { name: '🦄 Unicorn', hp: 600, xp: 1500, meat: 5, horn: 1, price: 20000, difficulty: 'legendary', special: 'Kuda bertanduk mistis.' },
    dragon: { name: '🐲 Dragon', hp: 2000, xp: 5000, meat: 50, scale: 20, price: 100000, difficulty: 'mythical', special: 'Naga raksasa. Boss hunt.' }
};

const HUNTING_LOCATIONS = {
    hutan_pinggir_kota: {
        name: '🌲 Hutan Pinggir Kota',
        minLevel: 1,
        animals: ['kelinci', 'tupai', 'ayam_hutan', 'burung'],
        desc: 'Hutan kecil di pinggiran. Cocok untuk pemula.',
        era: 'present'
    },
    hutan_belantara: {
        name: '🌳 Hutan Belantara',
        minLevel: 15,
        animals: ['rusa', 'babi_hutan', 'kambing_liar', 'kancil'],
        desc: 'Hutan dalam Kalimantan. Game medium-large.',
        era: 'present'
    },
    kawasan_lindung: {
        name: '🏞️ Kawasan Lindung',
        minLevel: 30,
        animals: ['harimau', 'gajah', 'badak', 'beruang'],
        desc: 'Area konservasi. Untuk hunter berpengalaman.',
        era: 'present'
    },
    cyber_wasteland: {
        name: '☢️ Cyber Wasteland',
        minLevel: 25,
        animals: ['cyber_wolf', 'mech_bear', 'drone_hawk', 'mutant_boar'],
        desc: 'Bekas zona perang. Habitat hewan cyber.',
        era: 'future'
    },
    mythical_realm: {
        name: '✨ Mythical Realm',
        minLevel: 50,
        animals: ['golden_deer', 'phoenix', 'unicorn', 'dragon'],
        desc: 'Dimensi tempat tinggal makhluk legendaris.',
        era: 'mythical'
    }
};

// ════════════════════════════════════════════════════════════════════════════════════════
// ⏰ TIME TRAVEL SYSTEM - Journey Through Eras
// ════════════════════════════════════════════════════════════════════════════════════════

const TIME_ERAS = {
    past_prehistoric: {
        name: '🦕 Era Prasejarah',
        year: '-65000000',
        desc: 'Zaman dinosaurus. Danger extreme!',
        unlockLevel: 70,
        cost: 100000,
        features: ['mammoth hunting', 'dinosaur fishing'],
        special_creatures: ['tyrannosaurus', 'megalodon', 'mammoth', 'pterodactyl']
    },
    past_ancient: {
        name: '🏛️ Era Kuno',
        year: '-3000',
        desc: 'Zaman kerajaan kuno Nusantara.',
        unlockLevel: 40,
        cost: 30000,
        features: ['ancient fishing', 'traditional hunting'],
        special_creatures: ['golden_koi', 'sacred_deer']
    },
    present: {
        name: '🌍 Era Sekarang',
        year: '2024',
        desc: 'Indonesia modern. Santai dan damai.',
        unlockLevel: 1,
        cost: 0,
        features: ['normal fishing', 'normal hunting', 'relaxing'],
        special_creatures: ['arwana', 'komodo']
    },
    future_2077: {
        name: '🌆 Neo-Jakarta 2077',
        year: '2077',
        desc: 'Cyberpunk future. High tech survival.',
        unlockLevel: 1,
        cost: 0,
        features: ['cyber fishing', 'mech hunting', 'hacking'],
        special_creatures: ['cyber_whale', 'mech_dragon']
    },
    future_3000: {
        name: '🚀 Era Antariksa',
        year: '3000',
        desc: 'Umat manusia sudah menjelajah galaksi.',
        unlockLevel: 80,
        cost: 200000,
        features: ['space fishing', 'alien hunting'],
        special_creatures: ['cosmic_whale', 'void_leviathan']
    }
};

// ════════════════════════════════════════════════════════════════════════════════════════
// 🌴 RELAXING ACTIVITIES - Chill & Social
// ════════════════════════════════════════════════════════════════════════════════════════

const RELAXING_ACTIVITIES = {
    // === SOLO ACTIVITIES ===
    ngopi: {
        name: '☕ Ngopi',
        duration: 1,
        cost: 20,
        effects: { stamina: 10, sanity: 15, happiness: 20 },
        desc: 'Minum kopi santai. Refresh pikiran.',
        locations: ['warung', 'cafe', 'rumah']
    },
    tidur: {
        name: '😴 Tidur',
        duration: 4,
        cost: 0,
        effects: { hp: 50, stamina: 100, sanity: 30 },
        desc: 'Tidur nyenyak. Full recovery.',
        locations: ['rumah', 'hotel', 'camp']
    },
    meditasi: {
        name: '🧘 Meditasi',
        duration: 2,
        cost: 0,
        effects: { mp: 30, sanity: 50, focus: 20 },
        desc: 'Clear your mind. Inner peace.',
        locations: ['rumah', 'taman', 'temple']
    },
    baca_buku: {
        name: '📚 Baca Buku',
        duration: 2,
        cost: 50,
        effects: { xp: 20, sanity: 25, knowledge: 10 },
        desc: 'Menambah wawasan.',
        locations: ['rumah', 'library', 'cafe']
    },
    main_game: {
        name: '🎮 Main Game',
        duration: 3,
        cost: 0,
        effects: { happiness: 40, sanity: -5, stamina: -10 },
        desc: 'Gaming session. Fun tapi capek.',
        locations: ['rumah', 'warnet', 'arcade']
    },
    nonton_film: {
        name: '🎬 Nonton Film',
        duration: 2,
        cost: 100,
        effects: { happiness: 30, sanity: 20 },
        desc: 'Movie marathon.',
        locations: ['rumah', 'bioskop']
    },
    dengar_musik: {
        name: '🎵 Dengar Musik',
        duration: 1,
        cost: 0,
        effects: { happiness: 25, sanity: 15, stamina: 5 },
        desc: 'Playlist favorit.',
        locations: ['anywhere']
    },

    // === SOCIAL ACTIVITIES ===
    nongkrong: {
        name: '👥 Nongkrong',
        duration: 3,
        cost: 50,
        effects: { happiness: 35, social: 30, sanity: 20 },
        desc: 'Hangout sama temen.',
        locations: ['warung', 'mall', 'taman'],
        requiresFriend: true
    },
    makan_bareng: {
        name: '🍽️ Makan Bareng',
        duration: 2,
        cost: 100,
        effects: { hunger: 100, happiness: 30, social: 25 },
        desc: 'Makan enak sama temen.',
        locations: ['restoran', 'rumah_makan', 'street_food'],
        requiresFriend: true
    },
    karaoke: {
        name: '🎤 Karaoke',
        duration: 3,
        cost: 200,
        effects: { happiness: 50, social: 40, stamina: -15 },
        desc: 'Nyanyi bareng sampe suara habis.',
        locations: ['karaoke_box'],
        requiresFriend: true
    },
    piknik: {
        name: '🧺 Piknik',
        duration: 4,
        cost: 150,
        effects: { happiness: 45, sanity: 35, social: 35, stamina: -20 },
        desc: 'Piknik di taman atau pantai.',
        locations: ['taman', 'pantai', 'gunung'],
        requiresFriend: true
    },

    // === SPECIAL ACTIVITIES ===
    spa: {
        name: '💆 Spa & Massage',
        duration: 2,
        cost: 500,
        effects: { hp: 30, stamina: 50, sanity: 40, stress: -50 },
        desc: 'Relaksasi total. Premium treatment.',
        locations: ['spa']
    },
    yoga: {
        name: '🧘‍♀️ Yoga',
        duration: 2,
        cost: 100,
        effects: { hp: 10, stamina: 30, sanity: 40, flexibility: 5 },
        desc: 'Stretch and breathe.',
        locations: ['gym', 'taman', 'rumah']
    },
    surfing: {
        name: '🏄 Surfing',
        duration: 3,
        cost: 200,
        effects: { happiness: 50, stamina: -30, adrenaline: 20 },
        desc: 'Riding the waves.',
        locations: ['pantai']
    },
    camping: {
        name: '⛺ Camping',
        duration: 8,
        cost: 300,
        effects: { sanity: 60, survival_xp: 50, happiness: 40 },
        desc: 'Tidur di alam. Refresh total.',
        locations: ['gunung', 'hutan']
    }
};

// ════════════════════════════════════════════════════════════════════════════════════════
// 🏆 FISHING & HUNTING ACHIEVEMENTS
// ════════════════════════════════════════════════════════════════════════════════════════

const ACTIVITY_ACHIEVEMENTS = {
    // Fishing
    first_catch: { name: '🎣 First Catch', desc: 'Tangkap ikan pertama', reward: { gold: 100, xp: 50 } },
    fish_10: { name: '🐟 Apprentice Angler', desc: 'Tangkap 10 ikan', reward: { gold: 500, xp: 200 } },
    fish_100: { name: '🐠 Master Angler', desc: 'Tangkap 100 ikan', reward: { gold: 5000, xp: 2000 } },
    fish_1000: { name: '🐋 Legendary Angler', desc: 'Tangkap 1000 ikan', reward: { gold: 50000, xp: 20000 } },
    catch_legendary: { name: '✨ Legendary Catch', desc: 'Tangkap ikan legendary', reward: { gold: 10000, xp: 5000 } },
    catch_mythical: { name: '🐉 Mythical Catch', desc: 'Tangkap ikan mythical', reward: { gold: 100000, xp: 50000 } },
    catch_divine: { name: '👑 Divine Catch', desc: 'Tangkap God of Sea', reward: { gold: 1000000, xp: 500000, title: 'Sea God Chosen' } },

    // Hunting
    first_hunt: { name: '🎯 First Hunt', desc: 'Berburu hewan pertama', reward: { gold: 100, xp: 50 } },
    hunt_10: { name: '🏹 Apprentice Hunter', desc: 'Berburu 10 hewan', reward: { gold: 500, xp: 200 } },
    hunt_100: { name: '🦌 Master Hunter', desc: 'Berburu 100 hewan', reward: { gold: 5000, xp: 2000 } },
    hunt_dragon: { name: '🐲 Dragon Slayer', desc: 'Kalahkan Dragon', reward: { gold: 200000, xp: 100000, title: 'Dragon Slayer' } },

    // Time Travel
    visit_all_eras: { name: '⏰ Time Master', desc: 'Kunjungi semua era', reward: { gold: 50000, xp: 25000 } },
    prehistoric_survivor: { name: '🦕 Prehistoric Survivor', desc: 'Survive 24 jam di era prasejarah', reward: { gold: 30000, xp: 15000 } }
};

// ════════════════════════════════════════════════════════════════════════════════════════
// EXPORTS
// ════════════════════════════════════════════════════════════════════════════════════════

module.exports = {
    FISHING_RODS,
    BAITS,
    FISH,
    FISHING_LOCATIONS,
    HUNTING_WEAPONS,
    ANIMALS,
    HUNTING_LOCATIONS,
    TIME_ERAS,
    RELAXING_ACTIVITIES,
    ACTIVITY_ACHIEVEMENTS
};
