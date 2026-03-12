#!/usr/bin/env node

/**
 * Python Bundle Script
 * Bundles sync_worker.py into a standalone executable using PyInstaller.
 *
 * Usage:
 *   node build-scripts/bundle-python.js          # skip if exe is up-to-date
 *   node build-scripts/bundle-python.js --force   # always rebuild
 */

const fs = require('fs');
const path = require('path');
const { execSync } = require('child_process');

const FORCE_REBUILD = process.argv.includes('--force');

const PROJECT_ROOT = path.resolve(__dirname, '..');
const PYTHON_DIR = path.join(PROJECT_ROOT, 'python');
const PYTHON_SOURCE = path.join(PYTHON_DIR, 'sync_worker.py');
const SPEC_FILE = path.join(PYTHON_DIR, 'sync_worker.spec');
const BUNDLE_DIR = path.join(PROJECT_ROOT, 'resources', 'python');
const RESOURCES_BIN = path.join(PROJECT_ROOT, 'resources', 'bin');
const DIST_EXE = path.join(BUNDLE_DIR, 'dist', 'sync_worker.exe');
const DIST_UNIX = path.join(BUNDLE_DIR, 'dist', 'sync_worker');
const BIN_EXE = path.join(RESOURCES_BIN, 'sync_worker.exe');
const BIN_UNIX = path.join(RESOURCES_BIN, 'sync_worker');

/**
 * Returns true when all Python source files are older than the existing exe.
 * Avoids unnecessary re-bundling when code hasn't changed.
 */
function isExeUpToDate(exePath) {
    if (!fs.existsSync(exePath)) return false;
    const exeMtime = fs.statSync(exePath).mtimeMs;

    const pyFiles = fs.readdirSync(PYTHON_DIR)
        .filter(f => f.endsWith('.py') || f.endsWith('.spec'))
        .map(f => path.join(PYTHON_DIR, f));

    for (const pyFile of pyFiles) {
        if (fs.statSync(pyFile).mtimeMs > exeMtime) {
            console.log(`  ↳ Modified source detected: ${path.basename(pyFile)}`);
            return false;
        }
    }
    return true;
}

function resolvePython() {
    const candidates = [];

    // 1) Active virtualenv (if any)
    if (process.env.VIRTUAL_ENV) {
        candidates.push(path.join(process.env.VIRTUAL_ENV, 'Scripts', 'python.exe'));
    }

    // 2) Local project venv
    candidates.push(path.join(PROJECT_ROOT, '.venv', 'Scripts', 'python.exe'));

    // 3) System PATH
    candidates.push('python');

    for (const c of candidates) {
        try {
            if (c === 'python') {
                execSync('python --version', { stdio: 'ignore' });
                return 'python';
            }
            if (fs.existsSync(c)) {
                execSync(`"${c}" --version`, { stdio: 'ignore' });
                return c;
            }
        } catch (_) {
            // try next candidate
        }
    }

    return null;
}

console.log('🐍 Python Bundling Script');
console.log('='.repeat(50));
if (FORCE_REBUILD) console.log('⚡ --force flag set: will always rebuild');

// Step 0: Check if an up-to-date exe already exists
console.log('\n📦 Step 0: Checking for existing bundled worker...');
const existingExe = fs.existsSync(BIN_EXE) ? BIN_EXE : (fs.existsSync(BIN_UNIX) ? BIN_UNIX : null);

if (!FORCE_REBUILD && existingExe && isExeUpToDate(existingExe)) {
    console.log(`✅ Bundled worker is up-to-date: ${existingExe}`);
    console.log('   Use --force to rebuild anyway.');
    process.exit(0);
} else if (existingExe && !FORCE_REBUILD) {
    console.log(`🔄 Python sources changed — rebuilding exe...`);
} else if (!existingExe) {
    console.log('🆕 No bundled worker found — building for the first time...');
}

// Step 1: Check if Python is available
console.log('\n📋 Step 1: Checking Python installation...');
const pythonCmd = resolvePython();
try {
    if (!pythonCmd) throw new Error('Python not found');
    const pythonVersion = execSync(`"${pythonCmd}" --version`, { encoding: 'utf-8' });
    console.log(`✅ Python found: ${pythonVersion.trim()}`);
} catch (e) {
    console.error('❌ Python not found. Please create/activate the project venv or install Python 3.8+');
    process.exit(1);
}

// Step 2: Check if PyInstaller is installed
console.log('\n📦 Step 2: Checking PyInstaller...');
let pyInstallerFound = false;
try {
    // Try python -m first (more reliable on Windows)
    execSync(`"${pythonCmd}" -m PyInstaller --version`, { encoding: 'utf-8' });
    console.log('✅ PyInstaller found (via python module)');
    pyInstallerFound = true;
} catch (e1) {
    try {
        // Fallback to global command
        execSync('pyinstaller --version', { encoding: 'utf-8' });
        console.log('✅ PyInstaller found (via system command)');
        pyInstallerFound = true;
    } catch (e2) {
        pyInstallerFound = false;
    }
}

if (!pyInstallerFound) {
    console.log('⚠️  PyInstaller not found. Installing...');
    try {
        execSync(`"${pythonCmd}" -m pip install pyinstaller`, { stdio: 'inherit' });
        console.log('✅ PyInstaller installed');
    } catch (installError) {
        console.error('❌ Failed to install PyInstaller:', installError.message);
        process.exit(1);
    }
}

// Step 3: Create bundle directory
console.log('\n📁 Step 3: Creating bundle directory...');
if (!fs.existsSync(BUNDLE_DIR)) {
    fs.mkdirSync(BUNDLE_DIR, { recursive: true });
    console.log(`✅ Created: ${BUNDLE_DIR}`);
} else {
    console.log(`✅ Directory exists: ${BUNDLE_DIR}`);
}

// Step 4: Check if source and spec files exist
console.log('\n🔍 Step 4: Checking source files...');
if (!fs.existsSync(PYTHON_SOURCE)) {
    console.error(`❌ Source file not found: ${PYTHON_SOURCE}`);
    process.exit(1);
}
console.log(`✅ Source file found: ${PYTHON_SOURCE}`);

if (!fs.existsSync(SPEC_FILE)) {
    console.error(`❌ Spec file not found: ${SPEC_FILE}`);
    process.exit(1);
}
console.log(`✅ Spec file found: ${SPEC_FILE}`);

// Step 5: Run PyInstaller using the spec file
console.log('\n⚙️  Step 5: Running PyInstaller (using spec file)...');
try {
    // Build using the spec file for reproducible, fully-configured builds.
    // --distpath and --workpath are relative to the spec file location.
    const command = [
        `"${pythonCmd}" -m PyInstaller`,
        `--distpath "${path.join(BUNDLE_DIR, 'dist')}"`,
        `--workpath "${path.join(BUNDLE_DIR, 'build')}"`,
        `--noconfirm`,
        `"${SPEC_FILE}"`
    ].join(' ');

    console.log(`Executing: ${command}`);
    execSync(command, { stdio: 'inherit', cwd: PYTHON_DIR });
    console.log('✅ PyInstaller completed successfully');
} catch (e) {
    console.error('❌ PyInstaller failed');
    process.exit(1);
}

// Step 6: Verify output
console.log('\n✔️  Step 6: Verifying output...');
const outputExe = path.join(BUNDLE_DIR, 'dist', 'sync_worker.exe');
const outputUnix = path.join(BUNDLE_DIR, 'dist', 'sync_worker');

if (fs.existsSync(outputExe)) {
    const stats = fs.statSync(outputExe);
    console.log(`✅ Executable created: ${outputExe}`);
    console.log(`   Size: ${(stats.size / 1024 / 1024).toFixed(2)} MB`);
} else if (fs.existsSync(outputUnix)) {
    const stats = fs.statSync(outputUnix);
    console.log(`✅ Executable created: ${outputUnix}`);
    console.log(`   Size: ${(stats.size / 1024 / 1024).toFixed(2)} MB`);
} else {
    console.error('❌ No executable found in output directory');
    console.log(`   Checked: ${outputExe} or ${outputUnix}`);
    process.exit(1);
}

// Step 7: Copy to resources for distribution
console.log('\n📦 Step 7: Preparing for distribution...');
const resourcesDest = path.join(PROJECT_ROOT, 'resources', 'bin');
if (!fs.existsSync(resourcesDest)) {
    fs.mkdirSync(resourcesDest, { recursive: true });
}

try {
    const source = fs.existsSync(outputExe) ? outputExe : outputUnix;
    const filename = path.basename(source);
    const destination = path.join(resourcesDest, filename);

    // Copy file
    fs.copyFileSync(source, destination);
    console.log(`✅ Copied to: ${destination}`);
} catch (e) {
    console.error('❌ Failed to copy executable');
    console.error(e.message);
    process.exit(1);
}

console.log('\n' + '='.repeat(50));
console.log('✨ Python bundling completed successfully!');
console.log('The executable is ready for distribution.');
