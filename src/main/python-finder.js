const fs = require('fs');
const path = require('path');
const { execFileSync } = require('child_process');

// Resolve once to avoid repeating path math
const projectRoot = path.join(__dirname, '..', '..');
const venvPython = path.join(projectRoot, '.venv', 'Scripts', 'python.exe');

// Validate that a path looks like a legitimate Python executable
function isValidPythonPath(p) {
    if (!p || typeof p !== 'string') return false;
    // Must end with python.exe or python3.exe (or no extension on unix)
    const basename = path.basename(p).toLowerCase();
    if (!basename.startsWith('python')) return false;
    // No shell metacharacters
    if (/[;&|`$]/.test(p)) return false;
    return true;
}

function findPython() {
    // 1. Try 'python' command first (simplest and most reliable if in PATH)
    try {
        execFileSync('python', ['--version'], { stdio: 'ignore' });
        console.log("python command is available in PATH");
        return 'python';
    } catch (e) {
        console.log("python command not found, checking alternatives...");
    }

    // 2. Try 'where python' to find actual path (and verify it runs)
    try {
        const result = execFileSync('where', ['python'], { encoding: 'utf8' });
        const lines = result.split('\n').map(l => l.trim()).filter(Boolean);
        for (const pythonPath of lines) {
            if (!isValidPythonPath(pythonPath)) {
                console.log(`Skipping invalid python path: ${pythonPath}`);
                continue;
            }
            try {
                const stats = fs.statSync(pythonPath);
                if (stats.size > 0) {
                    // Use execFileSync (safe, no shell injection)
                    execFileSync(pythonPath, ['--version'], { stdio: 'ignore' });
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
        if (!isValidPythonPath(p)) continue;
        try {
            if (fs.existsSync(p)) {
                execFileSync(p, ['--version'], { stdio: 'ignore' });
                console.log(`Found working Python at: ${p}`);
                return p;
            }
        } catch (e) { }
    }

    console.warn('No Python found, defaulting to "python"');
    return 'python';
}

module.exports = { findPython };
