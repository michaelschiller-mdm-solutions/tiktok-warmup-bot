// Real Token Fetcher Script
// This script fetches tokens using the actual API endpoint

const fs = require('fs');
const https = require('https');
const http = require('http');

// Configuration
const ACCOUNTS_FILE = 'accounts-export.json';
const OUTPUT_FILE = 'accounts-with-tokens.json';
const API_BASE_URL = 'http://localhost:3090'; // Change this to your API URL
const API_ENDPOINT = '/api/automation/fetch-manual-token';

// Real API call function
async function fetchTokenFromAPI(email, password) {
    return new Promise((resolve, reject) => {
        const postData = JSON.stringify({
            email: email,
            email_password: password
        });

        const url = new URL(API_ENDPOINT, API_BASE_URL);
        const options = {
            hostname: url.hostname,
            port: url.port || (url.protocol === 'https:' ? 443 : 80),
            path: url.pathname,
            method: 'POST',
            headers: {
                'Content-Type': 'application/json',
                'Content-Length': Buffer.byteLength(postData)
            }
        };

        const req = (url.protocol === 'https:' ? https : http).request(options, (res) => {
            let data = '';
            
            res.on('data', (chunk) => {
                data += chunk;
            });
            
            res.on('end', () => {
                try {
                    const response = JSON.parse(data);
                    
                    if (res.statusCode === 200 && response.success) {
                        resolve(response.token);
                    } else {
                        reject(new Error(response.message || `HTTP ${res.statusCode}`));
                    }
                } catch (error) {
                    reject(new Error(`Invalid JSON response: ${error.message}`));
                }
            });
        });

        req.on('error', (error) => {
            reject(new Error(`Request failed: ${error.message}`));
        });

        req.write(postData);
        req.end();
    });
}

async function fetchTokenForAccount(account) {
    console.log(`🔍 Fetching token for ${account.username} (${account.email})...`);
    
    if (!account.email || !account.password) {
        throw new Error('Email and password required');
    }

    try {
        const token = await fetchTokenFromAPI(account.email, account.password);
        console.log(`✅ Token fetched for ${account.username}`);
        return token;
    } catch (error) {
        console.error(`❌ Failed to fetch token for ${account.username}: ${error.message}`);
        throw error;
    }
}

async function fetchAllTokens() {
    try {
        // Load accounts
        console.log('📂 Loading accounts from JSON file...');
        const accountsData = JSON.parse(fs.readFileSync(ACCOUNTS_FILE, 'utf8'));
        const accounts = Array.isArray(accountsData) ? accountsData : accountsData.accounts || [];
        
        console.log(`📊 Found ${accounts.length} accounts to process`);
        
        // Filter accounts that need tokens
        const accountsNeedingTokens = accounts.filter(acc => 
            acc.email && acc.password && !acc.token
        );
        
        console.log(`🎯 ${accountsNeedingTokens.length} accounts need tokens`);
        
        if (accountsNeedingTokens.length === 0) {
            console.log('✅ All accounts already have tokens!');
            return;
        }
        
        // Fetch tokens for each account
        const updatedAccounts = [...accounts];
        let successCount = 0;
        let errorCount = 0;
        
        for (let i = 0; i < accountsNeedingTokens.length; i++) {
            const account = accountsNeedingTokens[i];
            console.log(`\n[${i + 1}/${accountsNeedingTokens.length}] Processing ${account.username}...`);
            
            try {
                const token = await fetchTokenForAccount(account);
                
                // Update account with token
                const accountIndex = updatedAccounts.findIndex(acc => acc.id === account.id);
                if (accountIndex !== -1) {
                    updatedAccounts[accountIndex].token = token;
                    updatedAccounts[accountIndex].token_fetched_at = new Date().toISOString();
                    successCount++;
                }
                
                // Save progress every 5 accounts
                if ((i + 1) % 5 === 0) {
                    saveProgress(updatedAccounts);
                    console.log(`💾 Progress saved (${i + 1}/${accountsNeedingTokens.length})`);
                }
                
                // Add delay between requests to avoid rate limiting
                await new Promise(resolve => setTimeout(resolve, 2000));
                
            } catch (error) {
                console.error(`❌ Error fetching token for ${account.username}:`, error.message);
                errorCount++;
                
                // Add longer delay on error
                await new Promise(resolve => setTimeout(resolve, 5000));
            }
        }
        
        // Save final results
        saveProgress(updatedAccounts);
        
        console.log('\n🎉 Token fetching completed!');
        console.log(`✅ Successful: ${successCount}`);
        console.log(`❌ Failed: ${errorCount}`);
        console.log(`📁 Results saved to: ${OUTPUT_FILE}`);
        
        // Generate updated HTML
        generateUpdatedHTML(updatedAccounts);
        
    } catch (error) {
        console.error('❌ Error:', error.message);
        process.exit(1);
    }
}

function saveProgress(accounts) {
    const output = {
        exported_at: new Date().toISOString(),
        total_accounts: accounts.length,
        accounts_with_tokens: accounts.filter(acc => acc.token).length,
        accounts: accounts
    };
    
    fs.writeFileSync(OUTPUT_FILE, JSON.stringify(output, null, 2));
}

function generateUpdatedHTML(accounts) {
    console.log('📝 Generating updated HTML file...');
    
    const updatedHTML = `<!DOCTYPE html>
<html lang="en">
<head>
    <meta charset="UTF-8">
    <meta name="viewport" content="width=device-width, initial-scale=1.0">
    <title>Instagram Accounts with Tokens</title>
    <style>
        body { font-family: Arial, sans-serif; margin: 20px; background: #f5f5f5; }
        .container { max-width: 1200px; margin: 0 auto; background: white; padding: 20px; border-radius: 8px; box-shadow: 0 2px 10px rgba(0,0,0,0.1); }
        table { border-collapse: collapse; width: 100%; margin-top: 20px; }
        th, td { border: 1px solid #ddd; padding: 12px 8px; text-align: left; }
        th { background-color: #f8f9fa; font-weight: 600; }
        tr:hover { background-color: #f8f9fa; }
        .token { font-family: monospace; background: #f9f9f9; cursor: pointer; }
        .token:hover { background: #e9ecef; }
        .success { color: green; }
        .error { color: red; }
        .stats { display: flex; gap: 20px; margin-bottom: 20px; }
        .stat { background: #f8f9fa; padding: 10px; border-radius: 4px; }
        .btn { padding: 8px 16px; border: none; border-radius: 4px; cursor: pointer; background: #007bff; color: white; }
        .btn:hover { background: #0056b3; }
    </style>
</head>
<body>
    <div class="container">
        <h1>Instagram Accounts with Tokens</h1>
        <p>Generated on: ${new Date().toLocaleString()}</p>
        
        <div class="stats">
            <div class="stat">
                <strong>Total accounts:</strong> ${accounts.length}
            </div>
            <div class="stat">
                <strong>With tokens:</strong> ${accounts.filter(acc => acc.token).length}
            </div>
            <div class="stat">
                <strong>Without tokens:</strong> ${accounts.filter(acc => !acc.token).length}
            </div>
        </div>
        
        <button class="btn" onclick="exportData()">Export JSON</button>
        <button class="btn" onclick="showAllTokens()">Show All Tokens</button>
        
        <table>
            <thead>
                <tr>
                    <th>ID</th>
                    <th>Username</th>
                    <th>Email</th>
                    <th>Status</th>
                    <th>Token</th>
                    <th>Token Fetched</th>
                </tr>
            </thead>
            <tbody>
                ${accounts.map(account => `
                    <tr>
                        <td>${account.id || ''}</td>
                        <td>${account.username || ''}</td>
                        <td>${account.email || ''}</td>
                        <td>${account.status || ''}</td>
                        <td class="token" data-token="${account.token || ''}" onclick="copyToken(this)">
                            ${account.token ? '••••••••••••••••••••••••••••••••••••••••' : 'N/A'}
                        </td>
                        <td>${account.token_fetched_at ? new Date(account.token_fetched_at).toLocaleString() : ''}</td>
                    </tr>
                `).join('')}
            </tbody>
        </table>
    </div>
    
    <script>
        function copyToken(element) {
            const token = element.getAttribute('data-token');
            if (token) {
                navigator.clipboard.writeText(token).then(() => {
                    alert('Token copied to clipboard!');
                }).catch(() => {
                    // Fallback for older browsers
                    const textArea = document.createElement('textarea');
                    textArea.value = token;
                    document.body.appendChild(textArea);
                    textArea.select();
                    document.execCommand('copy');
                    document.body.removeChild(textArea);
                    alert('Token copied to clipboard!');
                });
            }
        }
        
        function exportData() {
            const data = ${JSON.stringify(accounts)};
            const dataStr = JSON.stringify(data, null, 2);
            const dataBlob = new Blob([dataStr], { type: 'application/json' });
            const link = document.createElement('a');
            link.href = URL.createObjectURL(dataBlob);
            link.download = 'accounts-with-tokens.json';
            link.click();
        }
        
        function showAllTokens() {
            const tokens = ${JSON.stringify(accounts.filter(acc => acc.token).map(acc => ({
                username: acc.username,
                token: acc.token
            })))};
            
            const tokenText = tokens.map(t => `${t.username}: ${t.token}`).join('\\n');
            const textArea = document.createElement('textarea');
            textArea.value = tokenText;
            textArea.style.width = '100%';
            textArea.style.height = '300px';
            textArea.style.fontFamily = 'monospace';
            
            const modal = document.createElement('div');
            modal.style.position = 'fixed';
            modal.style.top = '0';
            modal.style.left = '0';
            modal.style.width = '100%';
            modal.style.height = '100%';
            modal.style.background = 'rgba(0,0,0,0.5)';
            modal.style.zIndex = '1000';
            modal.onclick = () => document.body.removeChild(modal);
            
            const content = document.createElement('div');
            content.style.position = 'absolute';
            content.style.top = '50%';
            content.style.left = '50%';
            content.style.transform = 'translate(-50%, -50%)';
            content.style.background = 'white';
            content.style.padding = '20px';
            content.style.borderRadius = '8px';
            content.style.maxWidth = '600px';
            content.style.width = '90%';
            content.onclick = e => e.stopPropagation();
            
            content.innerHTML = '<h3>All Tokens</h3><p>Click outside to close</p>';
            content.appendChild(textArea);
            
            modal.appendChild(content);
            document.body.appendChild(modal);
        }
    </script>
</body>
</html>`;
    
    fs.writeFileSync('accounts-with-tokens.html', updatedHTML);
    console.log('📄 Updated HTML file generated: accounts-with-tokens.html');
}

// Command line interface
function showHelp() {
    console.log(`
🔧 Real Instagram Token Fetcher Script

Usage:
  node real-token-fetcher.js [command]

Commands:
  fetch          Fetch tokens for all accounts using real API
  status         Show current status
  help           Show this help

Configuration:
  Edit API_BASE_URL in the script to point to your API server
  Current API URL: ${API_BASE_URL}

Files needed:
  - ${ACCOUNTS_FILE} (exported accounts data)

Output files:
  - ${OUTPUT_FILE} (accounts with tokens)
  - accounts-with-tokens.html (viewable results)

Note: This script requires your API server to be running!
`);
}

function showStatus() {
    try {
        if (fs.existsSync(ACCOUNTS_FILE)) {
            const data = JSON.parse(fs.readFileSync(ACCOUNTS_FILE, 'utf8'));
            const accounts = Array.isArray(data) ? data : data.accounts || [];
            console.log(`📊 Status:`);
            console.log(`   Total accounts: ${accounts.length}`);
            console.log(`   With tokens: ${accounts.filter(acc => acc.token).length}`);
            console.log(`   Without tokens: ${accounts.filter(acc => !acc.token).length}`);
        } else {
            console.log(`❌ ${ACCOUNTS_FILE} not found`);
        }
    } catch (error) {
        console.error('❌ Error reading status:', error.message);
    }
}

// Main execution
const command = process.argv[2] || 'help';

switch (command) {
    case 'fetch':
        fetchAllTokens();
        break;
    case 'status':
        showStatus();
        break;
    case 'help':
    default:
        showHelp();
        break;
} 