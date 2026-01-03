/**
 * Utility Service
 * Common utility functions for the application
 */

class Utils {
    /**
     * Format date to YYYY-MM-DD
     * @param {Date|string} date 
     * @returns {string}
     */
    static formatDate(date) {
        if (typeof date === 'string') {
            return date;
        }
        const d = new Date(date);
        const month = String(d.getMonth() + 1).padStart(2, '0');
        const day = String(d.getDate()).padStart(2, '0');
        return `${d.getFullYear()}-${month}-${day}`;
    }

    /**
     * Format date for display
     * @param {string} dateStr 
     * @returns {string}
     */
    static displayDate(dateStr) {
        const date = new Date(dateStr);
        return date.toLocaleDateString('en-IN', {
            year: 'numeric',
            month: 'short',
            day: 'numeric'
        });
    }

    /**
     * Format currency
     * @param {number} amount 
     * @param {string} currency 
     * @returns {string}
     */
    static formatCurrency(amount, currency = 'INR') {
        return new Intl.NumberFormat('en-IN', {
            style: 'currency',
            currency: currency,
            minimumFractionDigits: 2
        }).format(amount);
    }

    /**
     * Format number with commas
     * @param {number} num 
     * @param {number} decimals 
     * @returns {string}
     */
    static formatNumber(num, decimals = 2) {
        return parseFloat(num).toLocaleString('en-IN', {
            minimumFractionDigits: decimals,
            maximumFractionDigits: decimals
        });
    }

    /**
     * Show alert message
     * @param {string} message 
     * @param {string} type - 'success', 'error', 'warning', 'info'
     * @param {number} duration 
     */
    static showAlert(message, type = 'info', duration = 3000) {
        const alertContainer = document.getElementById('alertContainer');
        if (!alertContainer) return;

        const alert = document.createElement('div');
        alert.className = `alert alert-${type}`;
        alert.innerHTML = `
            <span>${message}</span>
            <button class="close-alert">&times;</button>
        `;

        alertContainer.appendChild(alert);

        alert.querySelector('.close-alert').addEventListener('click', () => {
            alert.remove();
        });

        setTimeout(() => {
            alert.remove();
        }, duration);
    }

    /**
     * Show loading spinner
     * @param {boolean} show 
     */
    static showLoading(show = true) {
        let loader = document.getElementById('loadingSpinner');
        if (!loader && show) {
            loader = document.createElement('div');
            loader.id = 'loadingSpinner';
            loader.className = 'loading-spinner';
            loader.innerHTML = '<div class="spinner"></div>';
            document.body.appendChild(loader);
        }
        if (loader) {
            loader.style.display = show ? 'flex' : 'none';
        }
    }

    /**
     * Show confirmation dialog
     * @param {string} message 
     * @param {function} onConfirm 
     * @param {function} onCancel 
     */
    /**
     * Show confirmation dialog
     * @param {string} message 
     * @param {function} onConfirm 
     * @param {function} onCancel 
     * @param {object} options - { type: 'danger'|'info', title: string, confirmText: string }
     */
    static showConfirm(message, onConfirm, onCancel, options = {}) {
        const { type = 'danger', title = 'Confirm Action', confirmText = 'Confirm' } = options;

        const modal = document.createElement('div');
        modal.className = 'modal active';

        const icon = type === 'danger'
            ? '<div class="w-12 h-12 rounded-full bg-red-100 flex items-center justify-center text-red-600 mb-4 mx-auto"><svg class="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-3L13.732 4c-.77-1.333-2.694-1.333-3.464 0L3.34 16c-.77 1.333.192 3 1.732 3z"></path></svg></div>'
            : '<div class="w-12 h-12 rounded-full bg-blue-100 flex items-center justify-center text-blue-600 mb-4 mx-auto"><svg class="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M13 16h-1v-4h-1m1-4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z"></path></svg></div>';

        modal.innerHTML = `
            <div class="modal-content p-6 text-center max-w-sm">
                ${icon}
                <h3 class="text-lg font-bold text-gray-900 mb-2">${title}</h3>
                <p class="text-gray-500 mb-6 text-sm">${message}</p>
                <div class="flex gap-3 justify-center">
                    <button class="btn btn-secondary btn-cancel w-full">Cancel</button>
                    <button class="btn ${type === 'danger' ? 'btn-danger' : 'btn-erp'} btn-confirm w-full">${confirmText}</button>
                </div>
            </div>
        `;

        document.body.appendChild(modal);

        // Animation
        const content = modal.querySelector('.modal-content');
        content.style.transform = 'scale(0.95)';
        content.style.opacity = '0';
        requestAnimationFrame(() => {
            content.style.transition = 'all 0.2s ease-out';
            content.style.transform = 'scale(1)';
            content.style.opacity = '1';
        });

        const cleanup = () => {
            content.style.transform = 'scale(0.95)';
            content.style.opacity = '0';
            setTimeout(() => modal.remove(), 200);
        };

        modal.querySelector('.btn-confirm').addEventListener('click', () => {
            onConfirm?.();
            cleanup();
        });

        const close = () => {
            onCancel?.();
            cleanup();
        };

        modal.querySelector('.btn-cancel').addEventListener('click', close);
        modal.addEventListener('click', (e) => {
            if (e.target === modal) close();
        });
    }

    /**
     * Show modal dialog
     * @param {string} title 
     * @param {string} content 
     * @param {object} buttons 
     */
    static showModal(title, content, buttons = {}) {
        const modal = document.createElement('div');
        modal.className = 'modal active';
        modal.innerHTML = `
            <div class="modal-content">
                <div class="modal-header">
                    <h3>${title}</h3>
                    <button class="close-modal">&times;</button>
                </div>
                <div class="modal-body">
                    ${content}
                </div>
                <div class="modal-footer">
                    ${Object.entries(buttons).map(([label, className]) =>
            `<button class="btn ${className}" data-action="${label.toLowerCase()}">${label}</button>`
        ).join('')}
                </div>
            </div>
        `;

        document.body.appendChild(modal);

        const close = () => modal.remove();
        modal.querySelector('.close-modal').addEventListener('click', close);

        return modal;
    }

    /**
     * Validate email
     * @param {string} email 
     * @returns {boolean}
     */
    static isValidEmail(email) {
        const re = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
        return re.test(email);
    }

    /**
     * Validate form
     * @param {object} formData 
     * @param {array} rules 
     * @returns {object}
     */
    static validateForm(formData, rules) {
        const errors = {};

        rules.forEach(rule => {
            const value = formData[rule.field];

            if (rule.required && (!value || value.toString().trim() === '')) {
                errors[rule.field] = rule.message || `${rule.field} is required`;
            } else if (rule.type === 'email' && value && !this.isValidEmail(value)) {
                errors[rule.field] = 'Invalid email format';
            } else if (rule.minLength && value && value.toString().length < rule.minLength) {
                errors[rule.field] = `Minimum ${rule.minLength} characters required`;
            } else if (rule.min && value && parseFloat(value) < rule.min) {
                errors[rule.field] = `Value must be at least ${rule.min}`;
            } else if (rule.max && value && parseFloat(value) > rule.max) {
                errors[rule.field] = `Value cannot exceed ${rule.max}`;
            }
        });

        return errors;
    }

    /**
     * Generate unique ID
     * @returns {string}
     */
    static generateId() {
        return `${Date.now()}-${Math.random().toString(36).substr(2, 9)}`;
    }

    /**
     * Deep clone object
     * @param {object} obj 
     * @returns {object}
     */
    static deepClone(obj) {
        return JSON.parse(JSON.stringify(obj));
    }

    /**
     * Export to CSV
     * @param {array} data 
     * @param {string} filename 
     */
    static exportToCSV(data, filename = 'export.csv') {
        if (data.length === 0) return;

        const headers = Object.keys(data[0]);
        const csv = [
            headers.join(','),
            ...data.map(row =>
                headers.map(header => {
                    const value = row[header];
                    const escaped = String(value).includes(',') ? `"${value}"` : value;
                    return escaped;
                }).join(',')
            )
        ].join('\n');

        const blob = new Blob([csv], { type: 'text/csv' });
        const url = window.URL.createObjectURL(blob);
        const a = document.createElement('a');
        a.href = url;
        a.download = filename;
        a.click();
    }

    /**
     * Get query parameter
     * @param {string} param 
     * @returns {string|null}
     */
    static getQueryParam(param) {
        const urlParams = new URLSearchParams(window.location.search);
        return urlParams.get(param);
    }

    /**
     * Debounce function
     * @param {function} func 
     * @param {number} wait 
     * @returns {function}
     */
    static debounce(func, wait) {
        let timeout;
        return function executedFunction(...args) {
            const later = () => {
                clearTimeout(timeout);
                func(...args);
            };
            clearTimeout(timeout);
            timeout = setTimeout(later, wait);
        };
    }

    /**
     * Throttle function
     * @param {function} func 
     * @param {number} limit 
     * @returns {function}
     */
    static throttle(func, limit) {
        let inThrottle;
        return function (...args) {
            if (!inThrottle) {
                func.apply(this, args);
                inThrottle = true;
                setTimeout(() => inThrottle = false, limit);
            }
        };
    }
}
