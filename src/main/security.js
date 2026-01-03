const path = require('path');

/**
 * Security utilities for Electron app
 */

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
  return token.substring(0, 10) + '...';
}

// Validate settings object
function validateSettings(settings) {
  if (!settings || typeof settings !== 'object') {
    throw new Error('Invalid settings object');
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
  validateScriptPath,
  maskToken,
  validateSettings
};
