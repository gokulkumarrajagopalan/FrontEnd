// Settings script
const API_BASE_URL = 'http://localhost:8080/api';

function initializeSettings() {
    loadSettings();
    setupEventListeners();
}

function loadSettings() {
    const settings = localStorage.getItem('appSettings');
    if (settings) {
        const data = JSON.parse(settings);
        document.getElementById('appName').value = data.appName || 'Tally Prime';
        document.getElementById('orgName').value = data.orgName || '';
        document.getElementById('fyStart').value = data.fyStart || '';
        document.getElementById('fyEnd').value = data.fyEnd || '';
        document.getElementById('apiUrl').value = data.apiUrl || 'http://localhost:8080/api';
        document.getElementById('currency').value = data.currency || '₹';
        document.getElementById('decimalPlaces').value = data.decimalPlaces || '2';
        document.getElementById('darkMode').checked = data.darkMode || false;
    }
}

function setupEventListeners() {
    // Application Settings Form
    document.querySelectorAll('.settings-form')[0].addEventListener('submit', (e) => {
        e.preventDefault();
        const settings = {
            appName: document.getElementById('appName').value,
            orgName: document.getElementById('orgName').value,
            fyStart: document.getElementById('fyStart').value,
            fyEnd: document.getElementById('fyEnd').value
        };
        localStorage.setItem('appSettings', JSON.stringify({ ...JSON.parse(localStorage.getItem('appSettings') || '{}'), ...settings }));
        showAlert('Settings saved successfully', 'success');
    });

    // Backend Connection
    document.getElementById('testConnectionBtn').addEventListener('click', async () => {
        const apiUrl = document.getElementById('apiUrl').value;
        const statusEl = document.getElementById('connectionStatus');
        
        try {
            const response = await fetch(`${apiUrl}/groups`);
            if (response.ok) {
                statusEl.className = 'success';
                statusEl.textContent = '✓ Connection successful!';
            } else {
                statusEl.className = 'error';
                statusEl.textContent = '✗ Connection failed: Server error';
            }
        } catch (error) {
            statusEl.className = 'error';
            statusEl.textContent = `✗ Connection failed: ${error.message}`;
        }
    });

    // Display Settings
    document.querySelectorAll('.settings-form')[2].addEventListener('submit', (e) => {
        e.preventDefault();
        const settings = {
            currency: document.getElementById('currency').value,
            decimalPlaces: document.getElementById('decimalPlaces').value,
            darkMode: document.getElementById('darkMode').checked
        };
        localStorage.setItem('appSettings', JSON.stringify({ ...JSON.parse(localStorage.getItem('appSettings') || '{}'), ...settings }));
        showAlert('Display settings saved', 'success');
        
        if (settings.darkMode) {
            document.body.classList.add('dark-mode');
        } else {
            document.body.classList.remove('dark-mode');
        }
    });

    // Data Management
    document.getElementById('exportBtn').addEventListener('click', async () => {
        try {
            const [groups, ledgers, vouchers, items] = await Promise.all([
                fetch(`${API_BASE_URL}/groups`).then(r => r.json()).catch(() => []),
                fetch(`${API_BASE_URL}/ledgers`).then(r => r.json()).catch(() => []),
                fetch(`${API_BASE_URL}/vouchers`).then(r => r.json()).catch(() => []),
                fetch(`${API_BASE_URL}/items`).then(r => r.json()).catch(() => [])
            ]);

            const data = { groups, ledgers, vouchers, items };
            const dataStr = JSON.stringify(data, null, 2);
            const blob = new Blob([dataStr], { type: 'application/json' });
            const url = window.URL.createObjectURL(blob);
            const link = document.createElement('a');
            link.href = url;
            link.download = `tally-backup-${new Date().toISOString().split('T')[0]}.json`;
            link.click();
            showAlert('Data exported successfully', 'success');
        } catch (error) {
            showAlert('Error exporting data: ' + error.message, 'error');
        }
    });

    document.getElementById('backupBtn').addEventListener('click', async () => {
        showAlert('Backup feature coming soon', 'info');
    });

    document.getElementById('resetBtn').addEventListener('click', () => {
        if (confirm('Are you sure? This will reset the application to its default state. This action cannot be undone.')) {
            localStorage.clear();
            showAlert('Application reset. Please refresh the page.', 'warning');
        }
    });
}

function showAlert(message, type = 'info') {
    const alertContainer = document.querySelector('.alert-container') || createAlertContainer();
    const alert = document.createElement('div');
    alert.className = `alert alert-${type}`;
    alert.textContent = message;
    alertContainer.appendChild(alert);

    setTimeout(() => {
        alert.remove();
    }, 3000);
}

function createAlertContainer() {
    const container = document.createElement('div');
    container.className = 'alert-container';
    document.body.appendChild(container);
    return container;
}

// Add CSS for alerts and dark mode
const style = document.createElement('style');
style.textContent = `
    .alert-container {
        position: fixed;
        top: 20px;
        right: 20px;
        z-index: 9999;
    }

    .alert {
        padding: 15px 20px;
        margin-bottom: 10px;
        border-radius: 8px;
        box-shadow: 0 4px 12px rgba(0, 0, 0, 0.15);
        animation: slideIn 0.3s ease-out;
    }

    .alert-success {
        background: #d4edda;
        color: #155724;
        border: 1px solid #c3e6cb;
    }

    .alert-error {
        background: #f8d7da;
        color: #721c24;
        border: 1px solid #f5c6cb;
    }

    .alert-info {
        background: #d1ecf1;
        color: #0c5460;
        border: 1px solid #bee5eb;
    }

    .alert-warning {
        background: #fff3cd;
        color: #856404;
        border: 1px solid #ffeaa7;
    }

    @keyframes slideIn {
        from {
            transform: translateX(400px);
            opacity: 0;
        }
        to {
            transform: translateX(0);
            opacity: 1;
        }
    }

    body.dark-mode {
        background: #1e1e1e;
        color: #e0e0e0;
    }

    body.dark-mode .settings-section {
        background: #2d2d2d;
        border-color: #404040;
        color: #e0e0e0;
    }

    body.dark-mode .settings-section h2 {
        color: #e0e0e0;
    }

    body.dark-mode .form-group label {
        color: #e0e0e0;
    }

    body.dark-mode input,
    body.dark-mode select {
        background: #3d3d3d;
        color: #e0e0e0;
        border-color: #404040;
    }
`;
document.head.appendChild(style);

initializeSettings();
