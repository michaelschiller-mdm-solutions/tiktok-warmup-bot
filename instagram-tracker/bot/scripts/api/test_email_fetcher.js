const EmailTokenFetcher = require('../../services/EmailTokenFetcher');
const fs = require('fs');
const path = require('path');

/**
 * A simple CLI to test the EmailTokenFetcher service.
 * It takes IMAP credentials as command-line arguments and attempts to fetch a token.
 * 
 * USAGE:
 * node scripts/api/test_email_fetcher.js <host> <user> <password>
 * 
 * EXAMPLE (for Gmail, using an App Password):
 * node scripts/api/test_email_fetcher.js imap.gmail.com my.email@gmail.com my-app-password
 */
async function testEmailFetcher() {
    const [host, user, password] = process.argv.slice(2);

    if (!host || !user || !password) {
        console.error('❌ Error: Missing required arguments.');
        console.error('Usage: node scripts/api/test_email_fetcher.js <host> <user> <password>');
        process.exit(1);
    }

    console.log(`[TestRunner] Testing EmailTokenFetcher with user: ${user}`);
    console.log('[TestRunner] Please trigger a verification email from Instagram now.');
    console.log('[TestRunner] Polling for 60 seconds...');

    const emailConfig = {
        host,
        user,
        password,
        port: 993,
        tls: true
    };

    try {
        const fetcher = new EmailTokenFetcher();
        const token = await fetcher.fetchLatestToken(emailConfig);

        if (token) {
            console.log('\n========================================');
            console.log(`✅ SUCCESS! Found token: ${token}`);
            console.log('========================================');
            process.exit(0);
        } else {
            // This path should ideally not be hit because fetchLatestToken throws on timeout.
            throw new Error('Could not find a verification token in any recent email.');
        }
    } catch (error) {
        console.error('\n========================================');
        console.error(`❌ FAILURE: ${error.message}`);
        console.error('========================================');
        process.exit(1);
    }
}

testEmailFetcher(); 