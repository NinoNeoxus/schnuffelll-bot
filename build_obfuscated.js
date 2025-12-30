const fs = require('fs');
const path = require('path');
const readline = require('readline');
const JavaScriptObfuscator = require('javascript-obfuscator');
const archiver = require('archiver');

// =====================================================
// BUILD CONFIGURATION
// =====================================================
const BUILD_DIR = './build_dist';

// Files/Folders to EXCLUDE from obfuscation (Copy as is)
const EXCLUDES = [
    'node_modules',
    '.git',
    'db',
    'config.js', // User config must be readable
    'package.json',
    'package-lock.json',
    'version.json',
    'build_obfuscated.js',
    'setup_sell.sh',
    'setup_sell.bat',
    'latest.zip',
    'stress_test.js'
];

// Files to EXCLUDE from COPYING entirely
const IGNORE_FILES = [
    '.git',
    'node_modules',
    'build_dist',
    '.env'
];

// OBFUSCATION OPTIONS (High Performance & Security)
const OBF_OPTIONS = {
    compact: true,
    controlFlowFlattening: true,
    controlFlowFlatteningThreshold: 0.75,
    deadCodeInjection: true,
    deadCodeInjectionThreshold: 0.4,
    debugProtection: false,
    debugProtectionInterval: 0,
    disableConsoleOutput: true,
    identifierNamesGenerator: 'hexadecimal',
    log: false,
    numbersToExpressions: true,
    renameGlobals: false,
    selfDefending: true,
    simplify: true,
    splitStrings: true,
    splitStringsChunkLength: 10,
    stringArray: true,
    stringArrayEncoding: ['base64', 'rc4'],
    stringArrayThreshold: 0.75,
    target: 'node',
    unicodeEscapeSequence: false
};

// =====================================================
// HELPER FUNCTIONS
// =====================================================

function copyRecursiveSync(src, dest) {
    const exists = fs.existsSync(src);
    const stats = exists && fs.statSync(src);
    const isDirectory = exists && stats.isDirectory();

    if (IGNORE_FILES.some(ignore => src.includes(ignore))) return;

    if (isDirectory) {
        if (!fs.existsSync(dest)) fs.mkdirSync(dest);
        fs.readdirSync(src).forEach((childItemName) => {
            copyRecursiveSync(path.join(src, childItemName), path.join(dest, childItemName));
        });
    } else {
        fs.copyFileSync(src, dest);
    }
}

function generatePassword() {
    const chars = 'ABCDEFGHIJKLMNOPQRSTUVWXYZ0123456789';
    let result = '';
    for (let i = 0; i < 12; i++) {
        result += chars.charAt(Math.floor(Math.random() * chars.length));
    }
    return result;
}

// =====================================================
// MAIN BUILD PROCESS
// =====================================================

async function build() {
    const rl = readline.createInterface({
        input: process.stdin,
        output: process.stdout
    });

    const question = (q) => new Promise(resolve => rl.question(q, resolve));

    console.log('\n╭──────────────────────────────────────────╮');
    console.log('│   🔒 SCHNUFFELLL BOT - BUILD SYSTEM 🔒   │');
    console.log('╰──────────────────────────────────────────╯\n');

    console.log('Pilih TIER untuk build:\n');
    console.log('  [1] 💰 NO UPDATE (15rb) - Password STATIC (Ga ada kill-switch)');
    console.log('  [2] 🔄 FREE UPDATE (25rb) - Password DYNAMIC (Ada kill-switch)\n');

    const tierChoice = await question('Pilih (1/2): ');
    const isNoUpdateTier = tierChoice.trim() === '1';

    let staticPassword = null;
    let outputZip = '';

    if (isNoUpdateTier) {
        console.log('\n📛 MODE: NO UPDATE (Static Password)\n');

        const customPass = await question('Masukkan password custom (atau ENTER untuk auto-generate): ');
        staticPassword = customPass.trim() || generatePassword();

        console.log(`\n� Password untuk buyer: ${staticPassword}\n`);
        outputZip = `schnuffel-NOUPDATE-${Date.now()}.zip`;
    } else {
        console.log('\n🔄 MODE: FREE UPDATE (Dynamic Password)\n');
        console.log('Bot akan cek ke GitHub setiap 10 menit.');
        console.log('Gunakan /genpass di bot utama untuk ganti password.\n');
        outputZip = `schnuffel-FREEUPDATE-${Date.now()}.zip`;
    }

    // Add output zip to ignore
    IGNORE_FILES.push(outputZip);

    console.log('�🚀 STARTING BUILD PROCESS...\n');

    // 1. Cleanup
    if (fs.existsSync(BUILD_DIR)) {
        console.log('🧹 Cleaning previous build...');
        fs.rmSync(BUILD_DIR, { recursive: true, force: true });
    }
    fs.mkdirSync(BUILD_DIR);

    // 2. Copy Files
    console.log('📂 Copying source files...');
    const items = fs.readdirSync('./');
    items.forEach(item => {
        if (IGNORE_FILES.includes(item)) return;
        if (item.endsWith('.zip')) return; // Skip all zips
        copyRecursiveSync(path.join('./', item), path.join(BUILD_DIR, item));
    });

    // 3. Modify auth.js for Static Mode (if NO UPDATE tier)
    if (isNoUpdateTier && staticPassword) {
        console.log('🔐 Injecting static password into auth.js...');
        const authPath = path.join(BUILD_DIR, 'lib', 'auth.js');
        if (fs.existsSync(authPath)) {
            let authContent = fs.readFileSync(authPath, 'utf8');
            // Replace the STATIC_PASSWORD line
            authContent = authContent.replace(
                /const STATIC_PASSWORD = null;/,
                `const STATIC_PASSWORD = '${staticPassword}';`
            );
            fs.writeFileSync(authPath, authContent);
            console.log('   ✅ Static password injected!');
        }
    }

    // 4. Obfuscate JS Files
    console.log('🔒 Obfuscating JavaScript files...');

    function processDir(dir) {
        const files = fs.readdirSync(dir);
        files.forEach(file => {
            const fullPath = path.join(dir, file);
            const stat = fs.statSync(fullPath);

            if (stat.isDirectory()) {
                if (file !== 'db' && file !== 'node_modules') processDir(fullPath);
            } else if (file.endsWith('.js')) {
                if (EXCLUDES.includes(file)) return;

                const content = fs.readFileSync(fullPath, 'utf8');
                console.log(`   - Encrypting: ${file}`);

                try {
                    const obfuscated = JavaScriptObfuscator.obfuscate(content, OBF_OPTIONS).getObfuscatedCode();
                    fs.writeFileSync(fullPath, obfuscated);
                } catch (e) {
                    console.error(`   ❌ Failed to obfuscate ${file}: ${e.message}`);
                }
            }
        });
    }

    processDir(BUILD_DIR);

    // 5. Zip Result
    console.log('📦 Zipping output...');
    const output = fs.createWriteStream(outputZip);
    const archive = archiver('zip', { zlib: { level: 9 } });

    output.on('close', function () {
        console.log(`\n✅ SUCCESS! Encrypted bot is ready: ${outputZip}`);
        console.log(`📊 Size: ${(archive.pointer() / 1024).toFixed(2)} KB`);

        if (isNoUpdateTier) {
            console.log(`\n🔑 PASSWORD BUYER: ${staticPassword}`);
            console.log('⚠️  Simpan password ini! Tidak bisa di-recover.');
        } else {
            console.log('\n📝 Buyer akan diminta password saat start.');
            console.log('   Gunakan /genpass di bot utama untuk generate.');
        }

        console.log('\n🧹 Cleaning up temp files...');
        fs.rmSync(BUILD_DIR, { recursive: true, force: true });

        rl.close();
    });

    archive.on('error', function (err) {
        throw err;
    });

    archive.pipe(output);
    archive.directory(BUILD_DIR, false);
    await archive.finalize();
}

build().catch(console.error);
