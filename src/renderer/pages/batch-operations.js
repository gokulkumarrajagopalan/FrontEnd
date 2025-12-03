(function () {
    const getTemplate = () => `
    <div id="batchPageContainer" class="space-y-6">
        <div class="page-header">
            <h2>Batch Operations</h2>
            <p>Bulk import/export data via CSV.</p>
        </div>

        <div class="page-actions gap-4">
            <input type="file" id="batchFile" accept=".csv" class="w-auto px-4 py-2 border border-gray-200 rounded-lg bg-white">
            <button id="importBtn" class="btn btn-primary">Import</button>
            <button id="exportBtn" class="btn btn-secondary">Export Sample CSV</button>
        </div>

        <div class="card p-4 bg-gray-50 border border-gray-200 rounded-lg">
            <h4 class="text-xs font-bold text-gray-500 uppercase mb-2">Operation Log</h4>
            <pre id="batchLog" class="text-xs font-mono text-gray-600 max-h-64 overflow-auto whitespace-pre-wrap bg-white p-3 border border-gray-100 rounded">Waiting for input...</pre>
        </div>
    </div>
    `;

    function initializeBatchOperations() {
        const importBtn = document.getElementById('importBtn');
        const exportBtn = document.getElementById('exportBtn');

        if (importBtn) importBtn.addEventListener('click', handleImport);
        if (exportBtn) exportBtn.addEventListener('click', handleExport);
    }

    function handleImport() {
        const fileInput = document.getElementById('batchFile');
        const log = document.getElementById('batchLog');

        if (!fileInput || !fileInput.files || fileInput.files.length === 0) {
            if (window.notificationService) window.notificationService.warning('Choose a CSV to import');
            return;
        }

        const file = fileInput.files[0];
        const reader = new FileReader();

        reader.onload = function (e) {
            log.textContent = 'Imported file contents:\n' + e.target.result.slice(0, 500) + (e.target.result.length > 500 ? '...' : '');
            if (window.notificationService) window.notificationService.success('File loaded (preview)');

            // Here you would typically send the file content or the file itself to the backend
            // processBatch(e.target.result);
        };

        reader.onerror = function () {
            log.textContent = 'Error reading file';
            if (window.notificationService) window.notificationService.error('Error reading file');
        };

        reader.readAsText(file);
    }

    function handleExport() {
        const sample = 'id,name,amount\n1,Sample Item,100\n2,Example Service,200\n';
        const blob = new Blob([sample], { type: 'text/csv' });
        const url = URL.createObjectURL(blob);
        const a = document.createElement('a');
        a.href = url;
        a.download = 'sample-export.csv';
        document.body.appendChild(a);
        a.click();
        a.remove();
        URL.revokeObjectURL(url);

        if (window.notificationService) window.notificationService.success('Sample CSV exported');
    }

    window.initializeBatchOperations = function () {
        console.log('Initializing Batch Operations Page...');
        const content = document.getElementById('page-content');
        if (content) {
            content.innerHTML = getTemplate();
            initializeBatchOperations();
        }
    };
})();
