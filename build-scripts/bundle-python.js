#!/usr/bin/env node

/**
 * Python Bundle Script
 * Bundles sync_worker.py into a standalone executable using PyInstaller
 */

const fs = require('fs');
const path = require('path');
const { execSync } = require('child_process');

const PROJECT_ROOT = path.resolve(__dirname, '..');
// Fixed: Python source is in 'python' directory
const PYTHON_SOURCE = path.join(PROJECT_ROOT, 'python', 'sync_worker.py');
const BUNDLE_DIR = path.join(PROJECT_ROOT, 'resources', 'python');
const RESOURCES_BIN = path.join(PROJECT_ROOT, 'resources', 'bin');
const DIST_EXE = path.join(BUNDLE_DIR, 'dist', 'sync_worker.exe');
const DIST_UNIX = path.join(BUNDLE_DIR, 'dist', 'sync_worker');
const BIN_EXE = path.join(RESOURCES_BIN, 'sync_worker.exe');
const BIN_UNIX = path.join(RESOURCES_BIN, 'sync_worker');

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

// Step 0: If a bundled executable already exists, skip Python entirely
console.log('\n📦 Step 0: Checking for existing bundled worker...');
if (fs.existsSync(BIN_EXE) || fs.existsSync(BIN_UNIX)) {
    console.log(`✅ Found existing worker in resources/bin. Skipping Python bundling.`);
    process.exit(0);
}

// If dist output exists, copy it into resources/bin and exit
if (fs.existsSync(DIST_EXE) || fs.existsSync(DIST_UNIX)) {
    if (!fs.existsSync(RESOURCES_BIN)) {
        fs.mkdirSync(RESOURCES_BIN, { recursive: true });
    }
    const source = fs.existsSync(DIST_EXE) ? DIST_EXE : DIST_UNIX;
    const destination = path.join(RESOURCES_BIN, path.basename(source));
    fs.copyFileSync(source, destination);
    console.log(`✅ Copied existing worker to: ${destination}`);
    process.exit(0);
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

// Step 4: Check if source file exists
console.log('\n🔍 Step 4: Checking source file...');
if (!fs.existsSync(PYTHON_SOURCE)) {
    console.error(`❌ Source file not found: ${PYTHON_SOURCE}`);
    process.exit(1);
}
console.log(`✅ Source file found: ${PYTHON_SOURCE}`);

// Step 5: Run PyInstaller
console.log('\n⚙️  Step 5: Running PyInstaller...');
try {
    // Using python -m PyInstaller to be safe
    const command = `"${pythonCmd}" -m PyInstaller --onefile --distpath "${path.join(BUNDLE_DIR, 'dist')}" --workpath "${path.join(BUNDLE_DIR, 'build')}" --specpath "${BUNDLE_DIR}" --name "sync_worker" "${PYTHON_SOURCE}"`;

    console.log(`Executing: ${command}`);
    execSync(command, { stdio: 'inherit' });
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
