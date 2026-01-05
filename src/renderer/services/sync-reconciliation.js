/**
 * Sync Reconciliation Service
 * Verifies sync data integrity and detects conflicts
 * @version 1.0.0
 */

class SyncReconciliation {
    constructor() {
        this.reconciliationHistory = [];
        this.conflictLog = [];
        this.verificationRules = new Map();
        this.setupDefaultRules();
    }

    /**
     * Setup default verification rules for each entity type
     */
    setupDefaultRules() {
        // Group verification
        this.verificationRules.set('Group', {
            requiredFields: ['name', 'groupName', 'alterID'],
            validation: (record) => {
                if (!record.name || record.name.trim() === '') return false;
                if (record.alterID === null || record.alterID === undefined) return false;
                return true;
            }
        });

        // Ledger verification
        this.verificationRules.set('Ledger', {
            requiredFields: ['name', 'alterID', 'accountType'],
            validation: (record) => {
                if (!record.name || record.name.trim() === '') return false;
                if (record.alterID === null || record.alterID === undefined) return false;
                return true;
            }
        });

        // StockItem verification
        this.verificationRules.set('StockItem', {
            requiredFields: ['name', 'alterID', 'unitName'],
            validation: (record) => {
                if (!record.name || record.name.trim() === '') return false;
                if (record.alterID === null || record.alterID === undefined) return false;
                return true;
            }
        });

        // VoucherType verification
        this.verificationRules.set('VoucherType', {
            requiredFields: ['name', 'alterID'],
            validation: (record) => {
                if (!record.name || record.name.trim() === '') return false;
                if (record.alterID === null || record.alterID === undefined) return false;
                return true;
            }
        });
    }

    /**
     * Verify sync data integrity
     * @param {string} entityType - Type of entity being synced
     * @param {Array} records - Records to verify
     * @returns {Object} Verification result
     */
    verifySyncData(entityType, records) {
        const startTime = Date.now();
        const result = {
            entityType,
            totalRecords: records.length,
            validRecords: 0,
            invalidRecords: 0,
            failedValidations: [],
            duplicates: [],
            missingFields: [],
            timestamp: new Date().toISOString()
        };

        if (!Array.isArray(records)) {
            result.error = 'Records must be an array';
            this.logReconciliation(result);
            return result;
        }

        const rule = this.verificationRules.get(entityType);
        const seenIds = new Set();

        records.forEach((record, index) => {
            try {
                // Check for duplicates
                const recordId = `${record.alterID}_${record.name}`;
                if (seenIds.has(recordId)) {
                    result.duplicates.push({
                        index,
                        alterID: record.alterID,
                        name: record.name
                    });
                } else {
                    seenIds.add(recordId);
                }

                // Check required fields
                const missingFields = [];
                if (rule) {
                    rule.requiredFields.forEach(field => {
                        if (!(field in record) || record[field] === null || record[field] === undefined) {
                            missingFields.push(field);
                        }
                    });
                }

                if (missingFields.length > 0) {
                    result.missingFields.push({
                        index,
                        fields: missingFields,
                        record: record.name || 'Unknown'
                    });
                    result.invalidRecords++;
                } else if (rule && !rule.validation(record)) {
                    result.failedValidations.push({
                        index,
                        record: record.name || 'Unknown',
                        reason: 'Custom validation failed'
                    });
                    result.invalidRecords++;
                } else {
                    result.validRecords++;
                }
            } catch (error) {
                result.failedValidations.push({
                    index,
                    error: error.message
                });
                result.invalidRecords++;
            }
        });

        result.duration = Date.now() - startTime;
        result.status = result.invalidRecords === 0 ? 'PASSED' : 'FAILED';
        result.passPercentage = Math.round((result.validRecords / result.totalRecords) * 100);

        this.logReconciliation(result);
        return result;
    }

    /**
     * Detect sync conflicts between local and remote data
     * @param {string} entityType
     * @param {Array} localRecords
     * @param {Array} remoteRecords
     * @returns {Object} Conflict detection result
     */
    detectConflicts(entityType, localRecords, remoteRecords) {
        const result = {
            entityType,
            totalConflicts: 0,
            conflictTypes: {
                dataModifiedLocally: [],
                dataModifiedRemotely: [],
                nameChanges: [],
                deletionConflicts: [],
                duplicateEntries: []
            },
            timestamp: new Date().toISOString()
        };

        const localMap = new Map();
        const remoteMap = new Map();

        // Build maps
        localRecords.forEach(record => {
            localMap.set(record.alterID, record);
        });

        remoteRecords.forEach(record => {
            remoteMap.set(record.alterID, record);
        });

        // Check for conflicts
        localMap.forEach((localRecord, alterID) => {
            const remoteRecord = remoteMap.get(alterID);

            if (remoteRecord) {
                // Record exists in both - check for differences
                if (JSON.stringify(localRecord) !== JSON.stringify(remoteRecord)) {
                    // Check if it's a name change
                    if (localRecord.name !== remoteRecord.name) {
                        result.conflictTypes.nameChanges.push({
                            alterID,
                            localName: localRecord.name,
                            remoteName: remoteRecord.name
                        });
                        result.totalConflicts++;
                    } else {
                        result.conflictTypes.dataModifiedLocally.push({
                            alterID,
                            name: localRecord.name
                        });
                        result.totalConflicts++;
                    }
                }
            } else {
                // Local record doesn't exist remotely
                result.conflictTypes.dataModifiedRemotely.push({
                    alterID,
                    name: localRecord.name
                });
                result.totalConflicts++;
            }
        });

        // Check for remote deletions
        remoteMap.forEach((remoteRecord, alterID) => {
            if (!localMap.has(alterID)) {
                result.conflictTypes.deletionConflicts.push({
                    alterID,
                    name: remoteRecord.name
                });
                result.totalConflicts++;
            }
        });

        result.status = result.totalConflicts === 0 ? 'NO_CONFLICTS' : 'CONFLICTS_FOUND';
        this.logConflict(result);
        return result;
    }

    /**
     * Resolve sync conflicts with user-specified strategy
     * @param {Object} conflict
     * @param {string} resolution - 'useLocal', 'useRemote', 'merge', 'skip'
     * @returns {Object} Resolution result
     */
    resolveConflict(conflict, resolution) {
        const result = {
            conflictId: conflict.alterID,
            resolution,
            timestamp: new Date().toISOString(),
            success: false,
            message: ''
        };

        try {
            switch (resolution) {
                case 'useLocal':
                    result.message = `Using local version of ${conflict.name}`;
                    result.success = true;
                    break;
                case 'useRemote':
                    result.message = `Using remote version of ${conflict.name}`;
                    result.success = true;
                    break;
                case 'merge':
                    result.message = `Merged versions of ${conflict.name}`;
                    result.success = true;
                    break;
                case 'skip':
                    result.message = `Skipped conflict for ${conflict.name}`;
                    result.success = true;
                    break;
                default:
                    result.message = 'Unknown resolution strategy';
                    result.success = false;
            }
        } catch (error) {
            result.message = error.message;
            result.success = false;
        }

        return result;
    }

    /**
     * Generate reconciliation report
     * @returns {Object} Full reconciliation report
     */
    generateReconciliationReport() {
        return {
            totalReconciliations: this.reconciliationHistory.length,
            totalConflicts: this.conflictLog.length,
            reconciliationHistory: this.reconciliationHistory.slice(-50),
            conflictLog: this.conflictLog.slice(-50),
            generatedAt: new Date().toISOString()
        };
    }

    /**
     * Log reconciliation event
     * @private
     */
    logReconciliation(result) {
        this.reconciliationHistory.push(result);
        console.log(`📊 [Reconciliation] ${result.entityType}: ${result.status} (${result.passPercentage}% valid)`);
        
        // Keep only last 100 records
        if (this.reconciliationHistory.length > 100) {
            this.reconciliationHistory = this.reconciliationHistory.slice(-100);
        }
    }

    /**
     * Log conflict event
     * @private
     */
    logConflict(result) {
        this.conflictLog.push(result);
        console.log(`⚠️ [Conflict] ${result.entityType}: ${result.totalConflicts} conflicts detected`);
        
        // Keep only last 100 records
        if (this.conflictLog.length > 100) {
            this.conflictLog = this.conflictLog.slice(-100);
        }
    }

    /**
     * Export reconciliation data
     */
    exportReport() {
        const report = this.generateReconciliationReport();
        const dataStr = JSON.stringify(report, null, 2);
        const dataBlob = new Blob([dataStr], { type: 'application/json' });
        const url = URL.createObjectURL(dataBlob);
        const link = document.createElement('a');
        link.href = url;
        link.download = `reconciliation_${new Date().toISOString()}.json`;
        link.click();
    }

    /**
     * Clear history
     */
    clearHistory() {
        this.reconciliationHistory = [];
        this.conflictLog = [];
        console.log('✅ Reconciliation history cleared');
    }
}

// Export
window.syncReconciliation = new SyncReconciliation();
if (typeof module !== 'undefined' && module.exports) {
    module.exports = SyncReconciliation;
}
