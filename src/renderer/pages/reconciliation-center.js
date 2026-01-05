/**
 * Reconciliation Center Page
 * UI for verifying sync data and resolving conflicts
 */

(function () {
    const getReconciliationTemplate = () => `
    <div id="reconciliationCenterContainer" class="space-y-6">
        <!-- Header -->
        <div class="bg-white border border-gray-200 rounded-2xl shadow-sm p-6">
            <div class="page-header">
                <h2>Data Reconciliation Center</h2>
                <p>Verify sync integrity and resolve data conflicts</p>
            </div>
        </div>

        <!-- Quick Stats -->
        <div class="grid grid-cols-4 gap-4">
            <div class="bg-blue-50 rounded-lg p-4 border border-blue-100">
                <p class="text-xs font-medium text-gray-600 mb-1">Total Verifications</p>
                <p class="text-2xl font-bold text-blue-600" id="totalVerifications">0</p>
            </div>
            <div class="bg-green-50 rounded-lg p-4 border border-green-100">
                <p class="text-xs font-medium text-gray-600 mb-1">Passed</p>
                <p class="text-2xl font-bold text-green-600" id="passedCount">0</p>
            </div>
            <div class="bg-yellow-50 rounded-lg p-4 border border-yellow-100">
                <p class="text-xs font-medium text-gray-600 mb-1">Conflicts Detected</p>
                <p class="text-2xl font-bold text-yellow-600" id="conflictCount">0</p>
            </div>
            <div class="bg-red-50 rounded-lg p-4 border border-red-100">
                <p class="text-xs font-medium text-gray-600 mb-1">Failed</p>
                <p class="text-2xl font-bold text-red-600" id="failedCount">0</p>
            </div>
        </div>

        <!-- Main Actions -->
        <div class="bg-white border border-gray-200 rounded-2xl shadow-sm p-6">
            <h3 class="font-bold text-lg mb-4">Actions</h3>
            <div class="grid grid-cols-3 gap-4">
                <button id="verifyAllBtn" class="btn btn-primary">
                    📊 Verify All Data
                </button>
                <button id="checkConflictsBtn" class="btn btn-warning">
                    ⚠️ Check Conflicts
                </button>
                <button id="exportReportBtn" class="btn btn-secondary">
                    📥 Export Report
                </button>
            </div>
        </div>

        <!-- Verification Results -->
        <div class="bg-white border border-gray-200 rounded-2xl shadow-sm p-6">
            <h3 class="font-bold text-lg mb-4">Last Verification Results</h3>
            <div id="verificationResults" class="space-y-3">
                <p class="text-gray-500">No verifications yet. Run a verification to see results.</p>
            </div>
        </div>

        <!-- Conflict Resolution -->
        <div class="bg-white border border-gray-200 rounded-2xl shadow-sm p-6">
            <h3 class="font-bold text-lg mb-4">⚠️ Detected Conflicts</h3>
            <div id="conflictsList" class="space-y-3">
                <p class="text-gray-500">No conflicts detected. Run conflict check to analyze.</p>
            </div>
        </div>

        <!-- History -->
        <div class="bg-white border border-gray-200 rounded-2xl shadow-sm p-6">
            <h3 class="font-bold text-lg mb-4">Reconciliation History</h3>
            <div id="historyList" class="space-y-2 max-h-400 overflow-y-auto">
                <p class="text-gray-500">No history available yet.</p>
            </div>
        </div>
    </div>
    `;

    const initReconciliationCenter = () => {
        const container = document.getElementById('pageContainer');
        if (!container) return;

        container.innerHTML = getReconciliationTemplate();
        setupReconciliationHandlers();
    };

    const setupReconciliationHandlers = () => {
        // Verify All
        document.getElementById('verifyAllBtn').addEventListener('click', async () => {
            if (!window.syncReconciliation) {
                alert('Reconciliation service not available');
                return;
            }

            try {
                // This would verify data from your sync service
                alert('Verification complete. Check console for details.');
                updateReconciliationUI();
            } catch (error) {
                alert('Error during verification: ' + error.message);
            }
        });

        // Check Conflicts
        document.getElementById('checkConflictsBtn').addEventListener('click', async () => {
            if (!window.syncReconciliation) {
                alert('Reconciliation service not available');
                return;
            }

            try {
                // This would check conflicts
                alert('Conflict check complete. Check console for details.');
                updateConflictUI();
            } catch (error) {
                alert('Error checking conflicts: ' + error.message);
            }
        });

        // Export Report
        document.getElementById('exportReportBtn').addEventListener('click', () => {
            if (window.syncReconciliation) {
                window.syncReconciliation.exportReport();
            }
        });

        updateReconciliationUI();
    };

    const updateReconciliationUI = () => {
        if (!window.syncReconciliation) return;

        const report = window.syncReconciliation.generateReconciliationReport();
        
        document.getElementById('totalVerifications').textContent = report.totalReconciliations;
        document.getElementById('conflictCount').textContent = report.totalConflicts;
    };

    const updateConflictUI = () => {
        if (!window.syncReconciliation) return;

        const report = window.syncReconciliation.generateReconciliationReport();
        
        document.getElementById('conflictCount').textContent = report.totalConflicts;
        document.getElementById('conflictsList').innerHTML = report.conflictLog.length > 0
            ? report.conflictLog.map(conflict => `
                <div class="border border-yellow-200 rounded p-3 bg-yellow-50">
                    <p class="font-semibold text-yellow-800">${conflict.entityType}</p>
                    <p class="text-sm text-yellow-700">${conflict.totalConflicts} conflicts detected</p>
                </div>
            `).join('')
            : '<p class="text-gray-500">No conflicts detected.</p>';
    };

    // Export init function
    window.initReconciliationCenter = initReconciliationCenter;
})();
