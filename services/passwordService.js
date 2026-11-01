const bcrypt = require('bcrypt');
const crypto = require('crypto');

const SALT_ROUNDS = 10;

/**
 * Validates whether a password satisfies the minimum requirements (min 8 characters).
 * @param {string} password 
 * @returns {boolean}
 */
function validatePassword(password) {
    return typeof password === 'string' && password.length >= 8;
}

/**
 * Detailed password validation returning validity and error message if invalid.
 * @param {string} password 
 * @returns {{ valid: boolean, error?: string }}
 */
function validatePasswordDetails(password) {
    if (!password || typeof password !== 'string') {
        return { valid: false, error: 'Password must be a non-empty string' };
    }
    if (password.length < 8) {
        return { valid: false, error: 'Password must be at least 8 characters long' };
    }
    return { valid: true };
}

/**
 * Hashes a plaintext password using bcrypt with 10 salt rounds.
 * @param {string} password 
 * @param {number} [saltRounds=10] 
 * @returns {Promise<string>}
 */
async function hashPassword(password, saltRounds = SALT_ROUNDS) {
    if (!validatePassword(password)) {
        throw new Error('Password must be at least 8 characters long');
    }
    return await bcrypt.hash(password, saltRounds);
}

/**
 * Compares a plaintext password against a bcrypt hash.
 * @param {string} password 
 * @param {string} hash 
 * @returns {Promise<boolean>}
 */
async function comparePassword(password, hash) {
    if (!password || !hash) return false;
    return await bcrypt.compare(password, hash);
}

/**
 * Generates a cryptographically secure random 12-character password.
 * Contains uppercase, lowercase, numbers, and special symbols.
 * @param {number} [length=12] 
 * @returns {string}
 */
function generateRandomPassword(length = 12) {
    const minLength = Math.max(12, length);
    const upper = 'ABCDEFGHIJKLMNOPQRSTUVWXYZ';
    const lower = 'abcdefghijklmnopqrstuvwxyz';
    const numbers = '0123456789';
    const special = '!@#$%^&*()_+~`|}{[]:;?><,./-=';
    const all = upper + lower + numbers + special;

    const chars = [
        upper[crypto.randomInt(0, upper.length)],
        lower[crypto.randomInt(0, lower.length)],
        numbers[crypto.randomInt(0, numbers.length)],
        special[crypto.randomInt(0, special.length)]
    ];

    for (let i = chars.length; i < minLength; i++) {
        chars.push(all[crypto.randomInt(0, all.length)]);
    }

    // Fisher-Yates shuffle
    for (let i = chars.length - 1; i > 0; i--) {
        const j = crypto.randomInt(0, i + 1);
        [chars[i], chars[j]] = [chars[j], chars[i]];
    }

    return chars.join('');
}

module.exports = {
    validatePassword,
    validatePasswordDetails,
    hashPassword,
    comparePassword,
    generateRandomPassword,
    SALT_ROUNDS
};
