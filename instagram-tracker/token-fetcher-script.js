// Token Fetcher Script for VPS
// This script fetches tokens for Instagram accounts and updates the HTML file

const fs = require('fs');
const path = require('path');

// Configuration
const ACCOUNTS_FILE = 'accounts-export.json';
const HTML_FILE = 'standalone-token-fetcher.html';
const OUTPUT_FILE = 'accounts-with-tokens.json';

// Simulated token fetching (replace with actual API calls)
async function fetchTokenForAccount(account) {
    console.log(`🔍 Fetching token for ${account.username} (${account.email})...`);
    
    // Simulate API delay
    await new Promise(resolve => setTimeout(resolve, 1000 + Math.random() * 2000));
    
    // Simulate token generation (replace with actual API call)
    const token = `ig_${account.username}_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;
    
    console.log(`✅ Token generated for ${account.username}`);
    return token;
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
                }
                
                // Save progress every 10 accounts
                if ((i + 1) % 10 === 0) {
                    saveProgress(updatedAccounts);
                    console.log(`💾 Progress saved (${i + 1}/${accountsNeedingTokens.length})`);
                }
                
            } catch (error) {
                console.error(`❌ Error fetching token for ${account.username}:`, error.message);
                // Continue with next account
            }
        }
        
        // Save final results
        saveProgress(updatedAccounts);
        
        console.log('\n🎉 Token fetching completed!');
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
    
    // Read the original HTML file
    const htmlContent = fs.readFileSync(HTML_FILE, 'utf8');
    
    // Create a simple HTML file with the updated data
    const updatedHTML = `<!DOCTYPE html>
<html lang="en">
<head>
    <meta charset="UTF-8">
    <meta name="viewport" content="width=device-width, initial-scale=1.0">
    <title>Instagram Accounts with Tokens</title>
    <style>
        body { font-family: Arial, sans-serif; margin: 20px; }
        table { border-collapse: collapse; width: 100%; }
        th, td { border: 1px solid #ddd; padding: 8px; text-align: left; }
        th { background-color: #f2f2f2; }
        .token { font-family: monospace; background: #f9f9f9; }
        .success { color: green; }
        .error { color: red; }
    </style>
</head>
<body>
    <h1>Instagram Accounts with Tokens</h1>
    <p>Generated on: ${new Date().toLocaleString()}</p>
    <p>Total accounts: ${accounts.length}</p>
    <p>Accounts with tokens: ${accounts.filter(acc => acc.token).length}</p>
    
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
                    <td class="token">${account.token ? '••••••••••••••••••••••••••••••••••••••••' : 'N/A'}</td>
                    <td>${account.token_fetched_at ? new Date(account.token_fetched_at).toLocaleString() : ''}</td>
                </tr>
            `).join('')}
        </tbody>
    </table>
    
    <script>
        // Add click to copy functionality
        document.querySelectorAll('.token').forEach(cell => {
            cell.style.cursor = 'pointer';
            cell.onclick = function() {
                const token = this.getAttribute('data-token');
                if (token) {
                    navigator.clipboard.writeText(token);
                    alert('Token copied to clipboard!');
                }
            };
        });
    </script>
</body>
</html>`;
    
    fs.writeFileSync('accounts-with-tokens.html', updatedHTML);
    console.log('📄 Updated HTML file generated: accounts-with-tokens.html');
}

// Command line interface
function showHelp() {
    console.log(`
🔧 Instagram Token Fetcher Script

Usage:
  node token-fetcher-script.js [command]

Commands:
  fetch          Fetch tokens for all accounts
  status         Show current status
  help           Show this help

Files needed:
  - ${ACCOUNTS_FILE} (exported accounts data)
  - ${HTML_FILE} (original HTML file)

Output files:
  - ${OUTPUT_FILE} (accounts with tokens)
  - accounts-with-tokens.html (viewable results)
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