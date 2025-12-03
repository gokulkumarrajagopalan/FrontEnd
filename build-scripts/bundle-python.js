#!/usr/bin/env node

/**
 * Python Bundle Script
 * Bundles sync_worker.py into a standalone executable using PyInstaller
 */

const fs = require('fs');
const path = require('path');
const { execSync } = require('child_process');

const PROJECT_ROOT = path.resolve(__dirname, '..');
const PYTHON_SOURCE = path.join(PROJECT_ROOT, 'sync_worker.py');
const BUNDLE_DIR = path.join(PROJECT_ROOT, 'resources', 'python');
const SPEC_FILE = path.join(PROJECT_ROOT, 'build-scripts', 'sync_worker.spec');

console.log('🐍 Python Bundling Script');
console.log('='.repeat(50));

// Step 1: Check if Python is available
console.log('\n📋 Step 1: Checking Python installation...');
try {
    const pythonVersion = execSync('python --version', { encoding: 'utf-8' });
    console.log(`✅ Python found: ${pythonVersion.trim()}`);
} catch (e) {
    console.error('❌ Python not found. Please install Python 3.8+');
    process.exit(1);
}

// Step 2: Check if PyInstaller is installed
console.log('\n📦 Step 2: Checking PyInstaller...');
try {
    execSync('pyinstaller --version', { encoding: 'utf-8' });
    console.log('✅ PyInstaller found');
} catch (e) {
    console.log('⚠️  PyInstaller not found. Installing...');
    try {
        execSync('pip install pyinstaller', { stdio: 'inherit' });
        console.log('✅ PyInstaller installed');
    } catch (installError) {
        console.error('❌ Failed to install PyInstaller');
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
    const command = `pyinstaller --onefile --distpath "${path.join(BUNDLE_DIR, 'dist')}" --buildpath "${path.join(BUNDLE_DIR, 'build')}" --specpath "${BUNDLE_DIR}" "${PYTHON_SOURCE}"`;
    
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
