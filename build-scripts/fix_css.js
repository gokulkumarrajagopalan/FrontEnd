const fs = require('fs');
const path = require('path');

const filePath = path.join(__dirname, '..', 'src', 'renderer', 'styles', 'styles-tailwind.css');

try {
    const data = fs.readFileSync(filePath, 'utf8');
    const lines = data.split(/\r?\n/);

    const btnDangerStyles = [
        ".btn-danger {",
        "    background: linear-gradient(135deg, #ef4444 0%, #dc2626 100%);",
        "    color: white;",
        "    box-shadow: 0 4px 6px -1px rgba(239, 68, 68, 0.3), 0 2px 4px -1px rgba(239, 68, 68, 0.15);",
        "    border: 1px solid rgba(255, 255, 255, 0.1);",
        "}",
        "",
        ".btn-danger:hover {",
        "    background: linear-gradient(135deg, #dc2626 0%, #b91c1c 100%);",
        "    box-shadow: 0 10px 15px -3px rgba(239, 68, 68, 0.4), 0 4px 6px -2px rgba(239, 68, 68, 0.2);",
        "    transform: translateY(-1px);",
        "}"
    ];

    let newLines = [];
    // Keep lines before .btn-danger (0 to 88, line 89 is the 90th line)
    // In 0-indexed array, line 90 is index 89.
    newLines.push(...lines.slice(0, 89));

    // Add the new btn-danger styles
    newLines.push(...btnDangerStyles);

    // Process the indented block
    // Original file had .btn-danger { at index 89.
    // We want to process from index 90 onwards.
    // The last line (index lines.length - 1) is the closing brace '    }' which we want to remove/ignore.

    for (let i = 90; i < lines.length - 1; i++) {
        let line = lines[i];
        if (line.startsWith("    ")) {
            newLines.push(line.substring(4));
        } else {
            newLines.push(line);
        }
    }

    fs.writeFileSync(filePath, newLines.join('\n'));
    console.log("Fixed styles-tailwind.css");

} catch (err) {
    console.error(err);
}
