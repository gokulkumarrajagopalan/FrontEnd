/**
 * Security Utilities
 * Provides functions for safe DOM manipulation and input handling
 */

/**
 * Safe text content setter to prevent XSS attacks
 * Use instead of innerHTML for user-generated content
 * @param {HTMLElement} element - Target DOM element
 * @param {string} content - Content to set
 */
export function setTextContent(element, content) {
    if (!element) return;
    element.textContent = content;
}

/**
 * Safe HTML setter with template literals
 * Only use for static HTML structure, not user input
 * @param {HTMLElement} element - Target DOM element
 * @param {string} html - HTML content (must be static)
 */
export function setHTMLContent(element, html) {
    if (!element) return;
    // Only allow static HTML, not user-generated content
    element.innerHTML = html;
}

/**
 * Escape HTML special characters to prevent XSS
 * @param {string} text - Text to escape
 * @returns {string} Escaped text safe for HTML
 */
export function escapeHTML(text) {
    if (!text) return '';
    const div = document.createElement('div');
    div.textContent = text;
    return div.innerHTML;
}

/**
 * Safely create DOM element from HTML string (no user input allowed)
 * @param {string} html - Static HTML string
 * @returns {HTMLElement} Created element
 */
export function createElementFromHTML(html) {
    const div = document.createElement('div');
    div.innerHTML = html;
    return div.firstElementChild;
}

/**
 * Validate and sanitize user input
 * @param {string} input - User input to validate
 * @param {string} type - Type of input (email, url, text)
 * @returns {string} Sanitized input or empty string if invalid
 */
export function sanitizeInput(input, type = 'text') {
    if (!input || typeof input !== 'string') return '';

    let sanitized = input.trim();

    switch (type) {
        case 'email':
            // Basic email validation
            const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
            return emailRegex.test(sanitized) ? sanitized : '';

        case 'url':
            // Only allow https URLs
            try {
                const url = new URL(sanitized);
                return url.protocol === 'https:' ? sanitized : '';
            } catch {
                return '';
            }

        case 'text':
        default:
            // Remove potentially dangerous characters
            return sanitized
                .replace(/<[^>]*>/g, '')  // Remove HTML tags
                .replace(/[<>]/g, '');     // Remove angle brackets
    }
}

/**
 * Validate input against OWASP patterns
 * @param {string} input - Input to validate
 * @returns {boolean} True if input is safe
 */
export function isInputSafe(input) {
    if (!input || typeof input !== 'string') return true;

    // Check for common XSS patterns
    const xssPatterns = [
        /<script[^>]*>[\s\S]*?<\/script>/gi,           // Script tags
        /javascript:/gi,                                // JavaScript protocol
        /on\w+\s*=/gi,                                  // Event handlers
        /<iframe[^>]*>/gi,                              // iFrames
        /<object[^>]*>/gi,                              // Objects
        /<embed[^>]*>/gi,                               // Embeds
        /<img[^>]*on\w+/gi,                             // Image event handlers
        /eval\(/gi,                                     // eval() calls
        /expression\s*\(/gi,                            // CSS expressions
    ];

    return !xssPatterns.some(pattern => pattern.test(input));
}

/**
 * Create safe attribute value (for data attributes, etc)
 * @param {string} value - Attribute value
 * @returns {string} Safe attribute value
 */
export function safeAttribute(value) {
    if (!value) return '';
    return escapeHTML(String(value));
}

/**
 * Log security violation (for monitoring)
 * @param {string} type - Type of violation
 * @param {any} details - Violation details
 */
export function logSecurityViolation(type, details) {
    console.warn(`[SECURITY] ${type}:`, details);
    // In production, send to security logging service
}

export default {
    setTextContent,
    setHTMLContent,
    escapeHTML,
    createElementFromHTML,
    sanitizeInput,
    isInputSafe,
    safeAttribute,
    logSecurityViolation,
};
