const path = require('path');

/**
 * Security utilities for Electron app
 */

// Allowed entity types for sync operations
const VALID_ENTITY_TYPES = [
  'Group', 'Ledger', 'Item', 'VoucherType', 'Currency',
  'CostCategory', 'CostCenter', 'Godown', 'Unit',
  'StockGroup', 'StockCategory', 'StockItem', 'TaxUnit',
  'Voucher'
];

// Validate port number
function validatePort(port) {
  const portNum = parseInt(port, 10);
  if (isNaN(portNum) || portNum < 1 || portNum > 65535) {
    throw new Error('Invalid port: must be between 1 and 65535');
  }
  return portNum;
}

// Validate sync interval
function validateInterval(interval) {
  const intervalNum = parseInt(interval, 10);
  if (isNaN(intervalNum) || intervalNum < 0) {
    throw new Error('Invalid interval: must be a positive number');
  }
  return intervalNum;
}

// Validate hostname (only alphanumeric, dots, hyphens)
function validateHost(host) {
  if (!host || typeof host !== 'string') {
    throw new Error('Invalid host: must be a non-empty string');
  }
  if (!/^[a-zA-Z0-9.\-]+$/.test(host)) {
    throw new Error('Invalid host: contains disallowed characters');
  }
  if (host.length > 253) {
    throw new Error('Invalid host: too long');
  }
  return host;
}

// Validate company ID
function validateCompanyId(companyId) {
  const id = parseInt(companyId, 10);
  if (isNaN(id) || id < 1 || id > 999999999) {
    throw new Error('Invalid companyId: must be a positive integer');
  }
  return id;
}

// Validate entity type against whitelist
function validateEntityType(entityType) {
  if (!VALID_ENTITY_TYPES.includes(entityType)) {
    throw new Error(`Invalid entityType: '${entityType}' not in allowed list`);
  }
  return entityType;
}

// Validate backend URL 
function validateBackendUrl(url) {
  if (!url || typeof url !== 'string') {
    throw new Error('Invalid backend URL');
  }
  try {
    const parsed = new URL(url);
    if (!['http:', 'https:'].includes(parsed.protocol)) {
      throw new Error('Backend URL must use HTTP or HTTPS protocol');
    }
    return url;
  } catch (e) {
    throw new Error('Invalid backend URL format');
  }
}

// Validate date string (DD-Mon-YYYY format)
function validateDateString(dateStr) {
  if (!dateStr || typeof dateStr !== 'string') {
    throw new Error('Invalid date string');
  }
  if (!/^\d{2}-[A-Za-z]{3}-\d{4}$/.test(dateStr)) {
    throw new Error('Invalid date format: expected DD-Mon-YYYY');
  }
  return dateStr;
}

// Validate sync parameters (common across all handlers)
function validateSyncParams(params) {
  const validated = {};
  
  if (params.companyId !== undefined) {
    validated.companyId = validateCompanyId(params.companyId);
  }
  if (params.tallyHost !== undefined) {
    validated.tallyHost = validateHost(params.tallyHost);
  }
  if (params.tallyPort !== undefined) {
    validated.tallyPort = validatePort(params.tallyPort);
  }
  if (params.backendUrl !== undefined && params.backendUrl) {
    validated.backendUrl = validateBackendUrl(params.backendUrl);
  }
  if (params.entityType !== undefined) {
    validated.entityType = validateEntityType(params.entityType);
  }
  if (params.fromDate !== undefined && params.fromDate) {
    validated.fromDate = validateDateString(params.fromDate);
  }
  if (params.toDate !== undefined && params.toDate) {
    validated.toDate = validateDateString(params.toDate);
  }
  if (params.maxAlterID !== undefined) {
    const id = parseInt(params.maxAlterID, 10);
    if (isNaN(id) || id < 0) {
      throw new Error('Invalid maxAlterID');
    }
    validated.maxAlterID = id;
  }
  
  return validated;
}

// Validate and sanitize script path
function validateScriptPath(scriptName, baseDir) {
  // Only allow alphanumeric, underscore, and .py extension
  if (!/^[a-zA-Z0-9_]+\.py$/.test(scriptName)) {
    throw new Error('Invalid script name');
  }

  const fullPath = path.join(baseDir, scriptName);
  const resolvedPath = path.resolve(fullPath);
  const resolvedBase = path.resolve(baseDir);

  // Ensure path is within base directory (prevent directory traversal)
  if (!resolvedPath.startsWith(resolvedBase)) {
    throw new Error('Invalid script path');
  }

  return resolvedPath;
}

// Mask sensitive data in logs
function maskToken(token) {
  if (!token || token.length < 10) return '***';
  return token.substring(0, 4) + '****' + token.substring(token.length - 4);
}

// Validate settings object
function validateSettings(settings) {
  if (!settings || typeof settings !== 'object') {
    throw new Error('Invalid settings object');
  }

  if (settings.tallyHost !== undefined && typeof settings.tallyHost !== 'string') {
    throw new Error('Invalid tallyHost: must be a string');
  }

  if (settings.tallyHost !== undefined) {
    validateHost(settings.tallyHost);
  }

  if (settings.tallyPort !== undefined) {
    validatePort(settings.tallyPort);
  }

  if (settings.syncInterval !== undefined) {
    validateInterval(settings.syncInterval);
  }

  return true;
}

module.exports = {
  validatePort,
  validateInterval,
  validateHost,
  validateCompanyId,
  validateEntityType,
  validateBackendUrl,
  validateDateString,
  validateSyncParams,
  validateScriptPath,
  maskToken,
  validateSettings,
  VALID_ENTITY_TYPES
};
