/**
 * Email Connectivity Test Script
 * 
 * This script tests email connectivity for the provided credentials and troubleshoots
 * any IMAP connection issues. It tests:
 * 1. Basic IMAP connection
 * 2. Inbox access
 * 3. Email search capabilities
 * 4. Instagram email detection
 * 
 * Usage:
 * node test_email_connectivity.js "email@domain.com" "password"
 */

const Imap = require('imap');
const imaps = require('imap-simple');

// Test credentials (can be overridden by command line args)
const DEFAULT_EMAIL = 'oilcxkwtvg@rambler.ru';
const DEFAULT_PASSWORD = '4247270JRzeza';

class EmailConnectivityTester {
    constructor() {
        this.results = {
            email: '',
            tests: [],
            overall: 'UNKNOWN'
        };
    }

    log(message, type = 'INFO') {
        const timestamp = new Date().toISOString();
        const icon = type === 'ERROR' ? '❌' : type === 'SUCCESS' ? '✅' : type === 'WARNING' ? '⚠️' : 'ℹ️';
        console.log(`[${timestamp}] ${icon} ${message}`);
    }

    addTestResult(testName, success, details = '', error = null) {
        this.results.tests.push({
            name: testName,
            success,
            details,
            error: error ? error.message : null,
            timestamp: new Date().toISOString()
        });
        
        if (success) {
            this.log(`${testName}: SUCCESS - ${details}`, 'SUCCESS');
        } else {
            this.log(`${testName}: FAILED - ${details}${error ? ` (${error.message})` : ''}`, 'ERROR');
        }
    }

    /**
     * Get IMAP settings for different email providers
     */
    getImapSettings(email) {
        const domain = email.split('@')[1].toLowerCase();
        
        const settings = {
            'gmail.com': { host: 'imap.gmail.com', port: 993, tls: true },
            'rambler.ru': { host: 'imap.rambler.ru', port: 993, tls: true },
            'gmx.com': { host: 'imap.gmx.com', port: 993, tls: true },
            'gmx.net': { host: 'imap.gmx.com', port: 993, tls: true },
            'gmx.de': { host: 'imap.gmx.com', port: 993, tls: true },
            'gmx.at': { host: 'imap.gmx.com', port: 993, tls: true },
            'gmx.ch': { host: 'imap.gmx.com', port: 993, tls: true },
            'outlook.com': { host: 'outlook.office365.com', port: 993, tls: true },
            'hotmail.com': { host: 'outlook.office365.com', port: 993, tls: true },
            'yahoo.com': { host: 'imap.mail.yahoo.com', port: 993, tls: true }
        };

        if (settings[domain]) {
            return settings[domain];
        } else {
            throw new Error(`Unsupported email domain: ${domain}. Supported: ${Object.keys(settings).join(', ')}`);
        }
    }

    /**
     * Test 1: Basic IMAP Configuration
     */
    async testImapConfiguration(email) {
        try {
            const settings = this.getImapSettings(email);
            this.addTestResult(
                'IMAP Configuration', 
                true, 
                `Domain: ${email.split('@')[1]}, Host: ${settings.host}, Port: ${settings.port}, TLS: ${settings.tls}`
            );
            return settings;
        } catch (error) {
            this.addTestResult('IMAP Configuration', false, 'Unsupported email domain', error);
            return null;
        }
    }

    /**
     * Test 2: Basic IMAP Connection (using raw Imap)
     */
    async testBasicConnection(email, password, imapSettings) {
        return new Promise((resolve) => {
            const config = {
                ...imapSettings,
                user: email,
                password: password,
                authTimeout: 10000,
                connTimeout: 15000,
                tlsOptions: {
                    rejectUnauthorized: false,
                    servername: imapSettings.host
                }
            };

            this.log(`Attempting connection to ${config.host}:${config.port} for ${email}`);

            const connection = new Imap(config);
            let connected = false;

            const cleanup = () => {
                try {
                    if (connection.state !== 'disconnected') {
                        connection.end();
                    }
                } catch (e) {
                    // Ignore cleanup errors
                }
            };

            const timeout = setTimeout(() => {
                cleanup();
                if (!connected) {
                    this.addTestResult('Basic IMAP Connection', false, 'Connection timeout (15 seconds)');
                    resolve(false);
                }
            }, 15000);

            connection.once('ready', () => {
                connected = true;
                clearTimeout(timeout);
                this.addTestResult('Basic IMAP Connection', true, 'Successfully connected and authenticated');
                cleanup();
                resolve(true);
            });

            connection.once('error', (err) => {
                clearTimeout(timeout);
                cleanup();
                if (!connected) {
                    this.addTestResult('Basic IMAP Connection', false, 'Connection or authentication failed', err);
                    resolve(false);
                }
            });

            connection.connect();
        });
    }

    /**
     * Test 3: Inbox Access and Basic Operations
     */
    async testInboxAccess(email, password, imapSettings) {
        try {
            const config = {
                ...imapSettings,
                user: email,
                password: password,
                authTimeout: 10000,
                tlsOptions: {
                    rejectUnauthorized: false,
                    servername: imapSettings.host
                }
            };

            this.log('Testing inbox access and basic operations...');
            const connection = await imaps.connect({ imap: config });

            // Test opening inbox
            const box = await connection.openBox('INBOX');
            const totalMessages = box.messages.total;
            const unreadMessages = box.messages.new;

            this.addTestResult(
                'Inbox Access', 
                true, 
                `Total messages: ${totalMessages}, Unread: ${unreadMessages}`
            );

            connection.end();
            return true;

        } catch (error) {
            this.addTestResult('Inbox Access', false, 'Failed to access inbox', error);
            return false;
        }
    }

    /**
     * Test 4: Search Functionality
     */
    async testSearchFunctionality(email, password, imapSettings) {
        try {
            const config = {
                ...imapSettings,
                user: email,
                password: password,
                authTimeout: 10000,
                tlsOptions: {
                    rejectUnauthorized: false,
                    servername: imapSettings.host
                }
            };

            this.log('Testing email search functionality...');
            const connection = await imaps.connect({ imap: config });
            await connection.openBox('INBOX');

            // Test basic search
            const allMessages = await connection.search(['ALL'], { bodies: 'HEADER.FIELDS (FROM SUBJECT DATE)' });
            
            // Test search for Instagram emails (multiple variations)
            const instagramSearches = [
                ['FROM', 'instagram.com'],
                ['FROM', 'instagram'],
                ['FROM', 'security@mail.instagram.com'],
                ['SUBJECT', 'instagram'],
                ['SUBJECT', 'verification']
            ];

            let instagramCount = 0;
            for (const searchCriteria of instagramSearches) {
                try {
                    const messages = await connection.search(searchCriteria, { bodies: 'HEADER.FIELDS (FROM SUBJECT DATE)' });
                    if (messages.length > 0) {
                        instagramCount += messages.length;
                        this.log(`Found ${messages.length} messages for search: ${searchCriteria.join(' ')}`);
                        
                        // Log details of first few messages
                        for (let i = 0; i < Math.min(3, messages.length); i++) {
                            const msg = messages[i];
                            const header = msg.parts.find(p => p.which.includes('HEADER.FIELDS'));
                            if (header && header.body) {
                                this.log(`  Message ${i+1}: From: ${header.body.from?.[0] || 'N/A'}, Subject: ${header.body.subject?.[0] || 'N/A'}`);
                            }
                        }
                    }
                } catch (searchErr) {
                    this.log(`Search failed for ${searchCriteria.join(' ')}: ${searchErr.message}`, 'WARNING');
                }
            }

            this.addTestResult(
                'Search Functionality', 
                true, 
                `Total messages: ${allMessages.length}, Instagram-related: ${instagramCount}`
            );

            connection.end();
            return true;

        } catch (error) {
            this.addTestResult('Search Functionality', false, 'Search operations failed', error);
            return false;
        }
    }

    /**
     * Test 5: Instagram Email Detection
     */
    async testInstagramEmailDetection(email, password, imapSettings) {
        try {
            const config = {
                ...imapSettings,
                user: email,
                password: password,
                authTimeout: 10000,
                tlsOptions: {
                    rejectUnauthorized: false,
                    servername: imapSettings.host
                }
            };

            this.log('Testing Instagram email detection...');
            const connection = await imaps.connect({ imap: config });
            await connection.openBox('INBOX');

            // Look for recent emails (last 7 days) from Instagram
            const lastWeek = new Date();
            lastWeek.setDate(lastWeek.getDate() - 7);

            const searchCriteria = [
                ['FROM', 'security@mail.instagram.com'],
                ['SINCE', lastWeek.toDateString()]
            ];

            const messages = await connection.search(searchCriteria, { 
                bodies: ['HEADER.FIELDS (FROM SUBJECT DATE)', 'TEXT'],
                markSeen: false 
            });

            if (messages.length > 0) {
                this.log(`Found ${messages.length} Instagram emails from last 7 days`);
                
                let verificationCount = 0;
                for (const message of messages) {
                    const textPart = message.parts.find(part => part.which === 'TEXT');
                    if (textPart) {
                        const emailBody = textPart.body;
                        
                        // Look for verification codes
                        const tokenMatch = emailBody.match(/\b\d{6}\b/);
                        if (tokenMatch) {
                            verificationCount++;
                            this.log(`  Found verification code in email: ${tokenMatch[0]}`);
                        }
                    }
                }

                this.addTestResult(
                    'Instagram Email Detection', 
                    true, 
                    `Found ${messages.length} Instagram emails, ${verificationCount} with verification codes`
                );
            } else {
                this.addTestResult(
                    'Instagram Email Detection', 
                    true, 
                    'No recent Instagram emails found (this is normal if no recent verification)'
                );
            }

            connection.end();
            return true;

        } catch (error) {
            this.addTestResult('Instagram Email Detection', false, 'Failed to detect Instagram emails', error);
            return false;
        }
    }

    /**
     * Run all tests
     */
    async runAllTests(email, password) {
        this.results.email = email;
        this.log(`Starting comprehensive email connectivity test for: ${email}`, 'INFO');
        this.log('='.repeat(80), 'INFO');

        // Test 1: IMAP Configuration
        const imapSettings = await this.testImapConfiguration(email);
        if (!imapSettings) {
            this.results.overall = 'FAILED';
            return this.results;
        }

        // Test 2: Basic Connection
        const basicConnectionOk = await this.testBasicConnection(email, password, imapSettings);
        if (!basicConnectionOk) {
            this.results.overall = 'FAILED';
            return this.results;
        }

        // Test 3: Inbox Access
        const inboxOk = await this.testInboxAccess(email, password, imapSettings);
        
        // Test 4: Search Functionality
        const searchOk = await this.testSearchFunctionality(email, password, imapSettings);
        
        // Test 5: Instagram Email Detection
        const instagramOk = await this.testInstagramEmailDetection(email, password, imapSettings);

        // Determine overall result
        const allPassed = basicConnectionOk && inboxOk && searchOk && instagramOk;
        const criticalPassed = basicConnectionOk && inboxOk; // Minimum for functionality

        this.results.overall = allPassed ? 'PASSED' : (criticalPassed ? 'PARTIAL' : 'FAILED');

        this.log('='.repeat(80), 'INFO');
        this.log(`Overall Result: ${this.results.overall}`, this.results.overall === 'PASSED' ? 'SUCCESS' : 'WARNING');

        return this.results;
    }

    /**
     * Generate summary report
     */
    generateReport() {
        console.log('\n' + '='.repeat(80));
        console.log('EMAIL CONNECTIVITY TEST REPORT');
        console.log('='.repeat(80));
        console.log(`Email: ${this.results.email}`);
        console.log(`Overall Status: ${this.results.overall}`);
        console.log(`Test Count: ${this.results.tests.length}`);
        console.log(`Passed: ${this.results.tests.filter(t => t.success).length}`);
        console.log(`Failed: ${this.results.tests.filter(t => !t.success).length}`);
        console.log('\nDetailed Results:');
        console.log('-'.repeat(80));

        this.results.tests.forEach((test, index) => {
            const status = test.success ? '✅ PASS' : '❌ FAIL';
            console.log(`${index + 1}. ${test.name}: ${status}`);
            console.log(`   Details: ${test.details}`);
            if (test.error) {
                console.log(`   Error: ${test.error}`);
            }
            console.log('');
        });

        console.log('Recommendations:');
        console.log('-'.repeat(80));
        
        if (this.results.overall === 'PASSED') {
            console.log('✅ Email connectivity is working perfectly!');
            console.log('✅ Pre-verification should work with this email.');
        } else if (this.results.overall === 'PARTIAL') {
            console.log('⚠️  Basic connectivity works but some features may be limited.');
            console.log('⚠️  Pre-verification should still work for basic functionality.');
        } else {
            console.log('❌ Email connectivity failed. Possible issues:');
            console.log('   - Wrong password');
            console.log('   - 2FA enabled (disable or use app password)');
            console.log('   - IMAP disabled in email settings');
            console.log('   - Firewall blocking IMAP connections');
            console.log('   - Email provider security restrictions');
        }
    }
}

// Main execution
async function main() {
    const args = process.argv.slice(2);
    const email = args[0] || DEFAULT_EMAIL;
    const password = args[1] || DEFAULT_PASSWORD;

    if (!email || !password) {
        console.error('❌ Usage: node test_email_connectivity.js "email@domain.com" "password"');
        console.error('❌ Or modify DEFAULT_EMAIL and DEFAULT_PASSWORD in the script');
        process.exit(1);
    }

    const tester = new EmailConnectivityTester();
    
    try {
        await tester.runAllTests(email, password);
        tester.generateReport();
        
        // Exit with appropriate code
        process.exit(tester.results.overall === 'FAILED' ? 1 : 0);
        
    } catch (error) {
        console.error('❌ Test execution failed:', error.message);
        process.exit(1);
    }
}

// Run if called directly
if (require.main === module) {
    main();
}

module.exports = EmailConnectivityTester; 