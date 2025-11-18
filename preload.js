/**
 * Preload Script for Electron
 * Provides secure bridge between renderer and main process
 */

const { contextBridge, ipcRenderer } = require('electron');

// Expose safe APIs to renderer process
contextBridge.exposeInMainWorld('electronAPI', {
    // Send message to main process
    send: (channel, data) => {
        ipcRenderer.send(channel, data);
    },

    // Listen for messages from main process
    on: (channel, func) => {
        ipcRenderer.on(channel, (event, ...args) => func(...args));
    },

    // Send message and get response
    invoke: (channel, data) => {
        return ipcRenderer.invoke(channel, data);
    },

    // Remove listener
    removeListener: (channel) => {
        ipcRenderer.removeAllListeners(channel);
    },

    // Platform info
    platform: process.platform,
    nodeVersion: process.versions.node,
    chromeVersion: process.versions.chrome,
    electronVersion: process.versions.electron
});

// Enable dev tools in development
if (process.env.NODE_ENV === 'development') {
    // Can add dev tools here if needed
}
