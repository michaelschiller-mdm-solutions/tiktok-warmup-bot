/**
 * Manual Email Token Fetcher
 * 
 * This script fetches the latest Instagram verification token for a given email account.
 * It's designed to be called by the backend to support manual account setup processes.
 * 
 * USAGE:
 * node scripts/api/manual_token_fetcher.js <email> <email_password>
 * 
 * SUCCESS OUTPUT (stdout):
 * 123456
 * 
 * ERROR OUTPUT (stderr):
 * Timeout: No verification email containing a token was found within 60 seconds.
 */

const EmailTokenFetcher = require('../../services/EmailTokenFetcher');

async function manualFetchToken() {
    const args = process.argv.slice(2);

    if (args.length < 2) {
        console.error('❌ Usage: node scripts/api/manual_token_fetcher.js <email> <email_password>');
        process.exit(1);
    }

    const [email, email_password] = args;

    console.log(`[ManualTokenFetcher] 📧 Starting manual token fetch for: ${email}`);

    try {
        const emailFetcher = new EmailTokenFetcher();
        
        // We can use fetchLatestToken directly as we don't need password reset detection for manual flow.
        const token = await emailFetcher.fetchLatestToken(email, email_password);

        if (token) {
            console.log(`[ManualTokenFetcher] ✅ Token found: ${token}`);
            // The most important output: the token itself to stdout for the calling process.
            process.stdout.write(token);
            process.exit(0);
        } else {
            // This case should ideally not be hit due to the timeout in fetchLatestToken
            console.error('[ManualTokenFetcher] ❌ No token was found, but no error was thrown.');
            process.exit(1);
        }

    } catch (error) {
        console.error(`[ManualTokenFetcher] ❌ Error during token fetch for ${email}: ${error.message}`);
        process.exit(1);
    }
}

// Execute the script
if (require.main === module) {
    manualFetchToken();
}

module.exports = manualFetchToken; 