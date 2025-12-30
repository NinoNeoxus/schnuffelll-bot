const fs = require('fs');
const path = require('path');
const { execSync } = require('child_process');
const JavaScriptObfuscator = require('javascript-obfuscator');
const archiver = require('archiver');

// CONFIGURATION
const BUILD_DIR = './build_dist';
const OUTPUT_ZIP = 'schnuffles-bot-v9.3-ENCRYPTED.zip';

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
    'latest.zip'
];

// Files to EXCLUDE from COPYING entirely
const IGNORE_FILES = [
    '.git',
    'node_modules',
    'build_dist',
    OUTPUT_ZIP,
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

// HELPER: Copy Recursive
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

// MAIN BUILD PROCESS
async function build() {
    console.log('🚀 STARTING BUILD PROCESS...');

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
        copyRecursiveSync(path.join('./', item), path.join(BUILD_DIR, item));
    });

    // 3. Obfuscate JS Files
    console.log('🔒 Obfuscating JavaScript files...');

    function processDir(dir) {
        const files = fs.readdirSync(dir);
        files.forEach(file => {
            const fullPath = path.join(dir, file);
            const stat = fs.statSync(fullPath);

            if (stat.isDirectory()) {
                if (file !== 'db' && file !== 'node_modules') processDir(fullPath);
            } else if (file.endsWith('.js')) {
                // Check excludes
                if (EXCLUDES.includes(file)) return;

                // Read -> Obfuscate -> Write
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

    // 4. Zip Result
    console.log('📦 Zipping output...');
    const output = fs.createWriteStream(OUTPUT_ZIP);
    const archive = archiver('zip', { zlib: { level: 9 } });

    output.on('close', function () {
        console.log(`✅ SUCCESS! Encrypted bot is ready: ${OUTPUT_ZIP} (${archive.pointer()} bytes)`);
        console.log('🧹 Cleaning up temp files...');
        fs.rmSync(BUILD_DIR, { recursive: true, force: true });
    });

    archive.on('error', function (err) {
        throw err;
    });

    archive.pipe(output);
    archive.directory(BUILD_DIR, false);
    await archive.finalize();
}

build().catch(console.error);
