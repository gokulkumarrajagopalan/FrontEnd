const fs = require('fs');
const path = require('path');
const { execSync } = require('child_process');

// Resolve once to avoid repeating path math
const projectRoot = path.join(__dirname, '..', '..');
const venvPython = path.join(projectRoot, '.venv', 'Scripts', 'python.exe');

function findPython() {
    // 1. Try 'python' command first (simplest and most reliable if in PATH)
    try {
        execSync('python --version', { stdio: 'ignore' });
        console.log("python command is available in PATH");
        return 'python';
    } catch (e) {
        console.log("python command not found, checking alternatives...");
    }

    // 2. Try 'where python' to find actual path (and verify it runs)
    try {
        const result = execSync('where python', { encoding: 'utf8' });
        const lines = result.split('\n').map(l => l.trim()).filter(Boolean);
        for (const pythonPath of lines) {
            try {
                const stats = fs.statSync(pythonPath);
                if (stats.size > 0) {
                    // Ensure this executable actually works
                    execSync(`"${pythonPath}" --version`, { stdio: 'ignore' });
                    console.log(`Found Python via where: ${pythonPath}`);
                    return pythonPath;
                }
            } catch (e) {
                console.log(`Skipping unusable python from where: ${pythonPath}`);
            }
        }
    } catch (e) {
        console.log('Python not found via where command');
    }

    // 3. Fallback to common locations (prioritize local venv if present)
    const possiblePaths = [
        venvPython,
        path.join(process.env.LOCALAPPDATA || '', 'Microsoft', 'WindowsApps', 'python.exe'),
        'python3',
        'C:\\Python313\\python.exe',
        'C:\\Python312\\python.exe',
        'C:\\Python311\\python.exe',
        'C:\\Python310\\python.exe',
        path.join(process.env.LOCALAPPDATA || '', 'Programs', 'Python', 'Python313', 'python.exe'),
        path.join(process.env.LOCALAPPDATA || '', 'Programs', 'Python', 'Python312', 'python.exe'),
        path.join(process.env.LOCALAPPDATA || '', 'Programs', 'Python', 'Python311', 'python.exe')
    ];

    for (const p of possiblePaths) {
        try {
            if (fs.existsSync(p)) {
                // Double check it works
                try {
                    execSync(`"${p}" --version`, { stdio: 'ignore' });
                    console.log(`Found working Python at: ${p}`);
                    return p;
                } catch (e) {
                    console.log(`Skipping unusable fallback python: ${p}`);
                }
            }
        } catch (e) { }
    }

    console.warn('⚠️ No Python found, defaulting to "python"');
    return 'python';
}

module.exports = { findPython };
