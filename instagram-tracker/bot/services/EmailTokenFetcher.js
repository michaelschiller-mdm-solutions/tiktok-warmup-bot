const imaps = require('imap-simple');
const qp = require('quoted-printable');
const utf8 = require('utf8');
const Imap = require('imap');

const POLL_INTERVAL = 5000; // 5 seconds
const POLL_TIMEOUT = 60000; // 60 seconds
const INSTAGRAM_FROM_EMAIL = 'security@mail.instagram.com';

class EmailTokenFetcher {
    /**
     * Determines the IMAP server settings based on the email domain.
     * @param {string} email - The user's email address.
     * @returns {object} The IMAP host and port settings.
     * @throws {Error} If the email domain is not supported.
     * @private
     */
    _getImapSettings(email) {
        const domain = email.split('@')[1].toLowerCase();
        switch (domain) {
            case 'gmail.com':
                return { host: 'imap.gmail.com', port: 993, tls: true };
            case 'rambler.ru':
                return { host: 'imap.rambler.ru', port: 993, tls: true };
            case 'gmx.com':
            case 'gmx.net':
            case 'gmx.de':
            case 'gmx.at':
            case 'gmx.ch':
                return { host: 'imap.gmx.com', port: 993, tls: true };
            default:
                throw new Error(`Unsupported email domain: ${domain}. Supported domains: gmail.com, rambler.ru, gmx.com, gmx.net, gmx.de, gmx.at, gmx.ch`);
        }
    }

    /**
     * Checks for Instagram password reset emails for a specific username.
     * @param {string} email - The email address to check.
     * @param {string} password - The password for the email account.
     * @param {string} username - The Instagram username to check for in the reset email.
     * @returns {Promise<boolean>} True if a password reset email is found.
     */
    async checkForPasswordResetEmail(email, password, username) {
        const imapSettings = this._getImapSettings(email);
        const config = {
            ...imapSettings,
            user: email,
            password: password,
            authTimeout: 3000,
            tlsOptions: {
                rejectUnauthorized: false // Allow self-signed certificates
            }
        };

        let connection;
        try {
            connection = await imaps.connect({ imap: config });
            await connection.openBox('INBOX');

            const searchCriteria = [
                'UNSEEN',
                ['FROM', INSTAGRAM_FROM_EMAIL],
                ['SUBJECT', `${username}, we've made it easy to get back on Instagram`]
            ];
            const fetchOptions = {
                bodies: ['HEADER.FIELDS (SUBJECT DATE)', 'TEXT'],
                markSeen: true,
            };

            const messages = await connection.search(searchCriteria, fetchOptions);

            if (messages.length > 0) {
                console.log(`[EmailTokenFetcher] 🚨 Found password reset email for ${username}`);
                
                // Log the content for debugging
                for (const message of messages) {
                    const textPart = message.parts.find(part => part.which === 'TEXT');
                    if (textPart) {
                        const emailBody = textPart.body;
                        const decodedBody = utf8.decode(qp.decode(emailBody));
                        
                        // Check if it contains the expected password reset content
                        if (decodedBody.includes('Sorry to hear you\'re having trouble logging into Instagram') ||
                            decodedBody.includes('we got a message that you forgot your password')) {
                            console.log(`[EmailTokenFetcher] ✅ Confirmed password reset email for ${username}`);
                            return true;
                        }
                    }
                }
            }

            return false;

        } catch (error) {
            console.error(`[EmailTokenFetcher] ❌ Error checking for password reset email:`, error.message);
            return false;
        } finally {
            if (connection) {
                connection.end();
            }
        }
    }

    /**
     * Enhanced token fetching that also checks for password reset emails.
     * @param {string} email - The email address to check.
     * @param {string} password - The password for the email account.
     * @param {string} username - The Instagram username (for password reset detection).
     * @returns {Promise<{token: string|null, passwordResetDetected: boolean}>} The result object.
     * @throws {Error} If no token is found within the timeout period or if the email provider is unsupported.
     */
    async fetchLatestTokenWithResetDetection(email, password, username) {
        const imapSettings = this._getImapSettings(email);
        const config = {
            ...imapSettings,
            user: email,
            password: password,
            authTimeout: 3000,
            tlsOptions: {
                rejectUnauthorized: false // Allow self-signed certificates
            }
        };

        console.log(`[EmailTokenFetcher] Starting to poll inbox for ${config.user} on host ${config.host} (with reset detection)`);
        const startTime = Date.now();

        return new Promise((resolve, reject) => {
            const intervalId = setInterval(async () => {
                if (Date.now() - startTime > POLL_TIMEOUT) {
                    clearInterval(intervalId);
                    reject(new Error('Timeout: No verification email containing a token was found within 60 seconds.'));
                    return;
                }

                try {
                    // First check for password reset emails
                    const passwordResetDetected = await this.checkForPasswordResetEmail(email, password, username);
                    if (passwordResetDetected) {
                        clearInterval(intervalId);
                        console.log(`[EmailTokenFetcher] 🚨 Password reset email detected for ${username}`);
                        resolve({ token: null, passwordResetDetected: true });
                        return;
                    }

                    // Then check for verification token
                    const token = await this.checkForToken(config);
                    if (token) {
                        clearInterval(intervalId);
                        console.log(`[EmailTokenFetcher] ✅ Found token: ${token}`);
                        resolve({ token, passwordResetDetected: false });
                    } else {
                        console.log(`[EmailTokenFetcher] ⏳ No valid token or reset email found yet, still polling...`);
                    }
                } catch (error) {
                    // Don't reject immediately, log the error and let polling continue
                    console.error(`[EmailTokenFetcher] ⚠️ Error during polling check:`, error.message);
                }
            }, POLL_INTERVAL);
        });
    }

    /**
     * Polls an IMAP inbox for a new Instagram verification email and extracts the 6-digit token.
     * @param {string} email - The email address to check.
     * @param {string} password - The password for the email account.
     * @returns {Promise<string|null>} The 6-digit verification token, or null.
     * @throws {Error} If no token is found within the timeout period or if the email provider is unsupported.
     */
    async fetchLatestToken(email, password) {
        const imapSettings = this._getImapSettings(email);
        const config = {
            ...imapSettings,
            user: email,
            password: password,
            authTimeout: 3000,
            tlsOptions: {
                rejectUnauthorized: false // Allow self-signed certificates
            }
        };

        console.log(`[EmailTokenFetcher] Starting to poll inbox for ${config.user} on host ${config.host}`);
        const startTime = Date.now();

        return new Promise((resolve, reject) => {
            const intervalId = setInterval(async () => {
                if (Date.now() - startTime > POLL_TIMEOUT) {
                    clearInterval(intervalId);
                    reject(new Error('Timeout: No verification email containing a token was found within 60 seconds.'));
                    return;
                }

                try {
                    const token = await this.checkForToken(config);
                    if (token) {
                        clearInterval(intervalId);
                        console.log(`[EmailTokenFetcher] ✅ Found token: ${token}`);
                        resolve(token);
                    } else {
                        console.log(`[EmailTokenFetcher] ⏳ No valid token found in unread emails yet, still polling...`);
                    }
                } catch (error) {
                    // Don't reject immediately, log the error and let polling continue
                    console.error(`[EmailTokenFetcher] ⚠️ Error during polling check:`, error.message);
                }
            }, POLL_INTERVAL);
        });
    }

    /**
     * Performs a single check for the verification token in the most recent unread email
     * using a multi-strategy approach for robustness.
     * @private
     */
    async checkForToken(config) {
        let connection;
        try {
            connection = await imaps.connect({ imap: config });
            await connection.openBox('INBOX');

            const searchCriteria = [
                'UNSEEN',
                ['FROM', INSTAGRAM_FROM_EMAIL]
            ];
            const fetchOptions = {
                bodies: ['HEADER.FIELDS (SUBJECT DATE)', 'TEXT'],
                markSeen: true,
            };

            const messages = await connection.search(searchCriteria, fetchOptions);

            if (messages.length === 0) {
                return null;
            }

            // Sort messages by date, newest first
            const sortedMessages = messages.sort((a, b) => {
                const dateA = new Date(a.parts.find(p => p.which.includes('HEADER.FIELDS')).body.date[0]);
                const dateB = new Date(b.parts.find(p => p.which.includes('HEADER.FIELDS')).body.date[0]);
                return dateB - dateA;
            });

            console.log(`[EmailTokenFetcher] Found ${sortedMessages.length} unread emails. Checking for a token...`);

            // Find the first email in the sorted list that contains a token
            for (const message of sortedMessages) {
                const textPart = message.parts.find(part => part.which === 'TEXT');
                if (!textPart) continue;

                const emailBody = textPart.body;
                let decodedBody;
                try {
                    // Emails from Instagram are quoted-printable
                    decodedBody = utf8.decode(qp.decode(emailBody));
                } catch(e) {
                    console.warn('[EmailTokenFetcher] ⚠️ Warning: could not decode email body. Using raw body.', e.message);
                    decodedBody = emailBody;
                }
                
                let token = null;

                // Strategy 1: Highly specific HTML match from user feedback
                let tokenMatch = decodedBody.match(/<font size="6">(\d{6})<\/font>/);
                if (tokenMatch && tokenMatch[1]) {
                    token = tokenMatch[1].trim();
                    console.log(`[EmailTokenFetcher] ✅ Extracted token "${token}" using specific HTML pattern.`);
                }

                // Strategy 2: More general HTML tag pattern
                if (!token) {
                    tokenMatch = decodedBody.match(/>\s*?(\d{6})\s*?</);
                    if (tokenMatch && tokenMatch[1]) {
                        token = tokenMatch[1].trim();
                        console.log(`[EmailTokenFetcher] ✅ Extracted token "${token}" using general HTML pattern.`);
                    }
                }
                
                // Strategy 3: Fallback to original broad regex for plain text
                if (!token) {
                    tokenMatch = decodedBody.match(/\b\d{6}\b/);
                    if (tokenMatch && tokenMatch[0]) {
                        token = tokenMatch[0].trim();
                        console.log(`[EmailTokenFetcher] ✅ Extracted token "${token}" using fallback plaintext pattern.`);
                    }
                }

                if (token) {
                    console.log(`[EmailTokenFetcher] Found token ${token} in email with date ${new Date(message.parts.find(p => p.which.includes('HEADER.FIELDS')).body.date[0])}`);
                    return token;
                }
            }

            // If we checked all unread emails and none had a token
            return null;

        } finally {
            if (connection) {
                connection.end();
            }
        }
    }

    /**
     * Quick check for existing Instagram verification email with token.
     * This is used for pre-automation verification to skip setup if verification code already exists.
     * @param {string} email - The email address to check.
     * @param {string} password - The password for the email account.
     * @returns {Promise<{success: boolean, token?: string, error?: string}>} Result with token if found.
     */
    async checkForExistingVerificationToken(email, password) {
        const imapSettings = this._getImapSettings(email);
        const config = {
            ...imapSettings,
            user: email,
            password: password,
            authTimeout: 5000, // Shorter timeout for quick check
            tlsOptions: {
                rejectUnauthorized: false
            }
        };

        console.log(`[EmailTokenFetcher] 🔍 Quick verification check for ${email}`);

        return new Promise((resolve) => {
            const connection = new Imap(config);

            const cleanup = () => {
                try {
                    connection.end();
                } catch (e) {
                    // Ignore cleanup errors
                }
            };

            const timeout = setTimeout(() => {
                cleanup();
                console.log(`[EmailTokenFetcher] ⏰ Quick check timeout for ${email}`);
                resolve({ success: false, error: 'Connection timeout' });
            }, 10000); // 10 second timeout for quick check

            connection.once('ready', () => {
                console.log(`[EmailTokenFetcher] ✅ Connected to ${email} for quick verification check`);

                connection.openBox('INBOX', true, (err, box) => {
                    if (err) {
                        clearTimeout(timeout);
                        cleanup();
                        console.error(`[EmailTokenFetcher] ❌ Failed to open inbox for ${email}:`, err.message);
                        resolve({ success: false, error: 'Failed to open inbox' });
                        return;
                    }

                    // Search for recent Instagram emails (last 24 hours)
                    const yesterday = new Date();
                    yesterday.setDate(yesterday.getDate() - 1);
                    const searchCriteria = [
                        'UNSEEN',
                        ['FROM', 'instagram'],
                        ['SINCE', yesterday.toDateString()]
                    ];

                    connection.search(searchCriteria, (err, results) => {
                        if (err) {
                            clearTimeout(timeout);
                            cleanup();
                            console.error(`[EmailTokenFetcher] ❌ Search error for ${email}:`, err.message);
                            resolve({ success: false, error: 'Search failed' });
                            return;
                        }

                        if (!results || results.length === 0) {
                            clearTimeout(timeout);
                            cleanup();
                            console.log(`[EmailTokenFetcher] 📭 No recent Instagram emails found for ${email}`);
                            resolve({ success: true, token: null });
                            return;
                        }

                        console.log(`[EmailTokenFetcher] 📧 Found ${results.length} recent Instagram emails for ${email}`);

                        // Fetch the most recent email
                        const fetch = connection.fetch(results.slice(-1), { bodies: '' });
                        let emailBody = '';

                        fetch.on('message', (msg) => {
                            msg.on('body', (stream) => {
                                stream.on('data', (chunk) => {
                                    emailBody += chunk.toString('utf8');
                                });
                            });

                            msg.once('end', () => {
                                // Extract verification token from email body
                                const tokenMatch = emailBody.match(/\b\d{6}\b/);
                                
                                if (tokenMatch) {
                                    const token = tokenMatch[0];
                                    console.log(`[EmailTokenFetcher] ✅ Found existing verification token: ${token}`);
                                    clearTimeout(timeout);
                                    cleanup();
                                    resolve({ success: true, token });
                                } else {
                                    console.log(`[EmailTokenFetcher] ❌ No verification token found in recent email`);
                                    clearTimeout(timeout);
                                    cleanup();
                                    resolve({ success: true, token: null });
                                }
                            });
                        });

                        fetch.once('error', (err) => {
                            clearTimeout(timeout);
                            cleanup();
                            console.error(`[EmailTokenFetcher] ❌ Fetch error for ${email}:`, err.message);
                            resolve({ success: false, error: 'Failed to fetch email' });
                        });

                        fetch.once('end', () => {
                            if (!emailBody) {
                                clearTimeout(timeout);
                                cleanup();
                                console.log(`[EmailTokenFetcher] 📭 No email body found for ${email}`);
                                resolve({ success: true, token: null });
                            }
                        });
                    });
                });
            });

            connection.once('error', (err) => {
                clearTimeout(timeout);
                cleanup();
                console.error(`[EmailTokenFetcher] ❌ IMAP connection error for ${email}:`, err.message);
                resolve({ success: false, error: `Connection failed: ${err.message}` });
            });

            connection.connect();
        });
    }
}

module.exports = EmailTokenFetcher; 